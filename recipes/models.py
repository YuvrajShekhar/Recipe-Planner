from django.db import models
from django.contrib.auth.models import User


class Ingredient(models.Model):
    """Stores all available ingredients"""
    
    CATEGORY_CHOICES = [
        ('vegetable', 'Vegetable'),
        ('fruit', 'Fruit'),
        ('meat', 'Meat'),
        ('seafood', 'Seafood'),
        ('dairy', 'Dairy'),
        ('grain', 'Grain'),
        ('spice', 'Spice'),
        ('condiment', 'Condiment'),
        ('other', 'Other'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    unit = models.CharField(max_length=30, help_text="Default unit (e.g., grams, pieces)")
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Recipe(models.Model):
    """Stores recipe information"""
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    PREFERENCE_CHOICES = [
        ('veg', 'Veg'),
        ('nonveg', 'Nonveg'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    instructions = models.TextField(help_text="Step-by-step cooking instructions")
    prep_time = models.PositiveIntegerField(help_text="Preparation time in minutes")
    cook_time = models.PositiveIntegerField(help_text="Cooking time in minutes")
    servings = models.PositiveIntegerField(default=4)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    # image_url = models.URLField(blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    preference = models.CharField(max_length=10, choices=PREFERENCE_CHOICES, default='veg')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def total_time(self):
        return self.prep_time + self.cook_time


class RecipeIngredient(models.Model):
    """Links ingredients to recipes with quantities"""
    
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    quantity = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.CharField(max_length=30, help_text="e.g., cups, tbsp, grams")
    
    class Meta:
        unique_together = ['recipe', 'ingredient']
    
    def __str__(self):
        return f"{self.quantity} {self.unit} {self.ingredient.name} for {self.recipe.title}"


class Pantry(models.Model):
    """Stores ingredients that a user has available"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pantry_items')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='pantry_entries')
    quantity = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Pantry items'
        unique_together = ['user', 'ingredient']
    
    def __str__(self):
        return f"{self.user.username}'s {self.ingredient.name}"


class Favorite(models.Model):
    """Stores user's favorite/saved recipes"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='favorited_by')
    saved_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'recipe']
        ordering = ['-saved_at']
    
    def __str__(self):
        return f"{self.user.username} saved {self.recipe.title}"
    
class IngredientNutrition(models.Model):
    """Stores nutritional information for ingredients"""
    
    UNIT_TYPE_CHOICES = [
        ('per_100g', 'Per 100 grams'),
        ('per_unit', 'Per unit/piece'),
    ]
    
    ingredient = models.OneToOneField(
        Ingredient, 
        on_delete=models.CASCADE, 
        related_name='nutrition'
    )
    
    # For gram-based items (per 100g)
    calories_per_100g = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
        help_text="Calories per 100 grams"
    )
    protein_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Protein in grams per 100g"
    )
    carbs_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Carbohydrates in grams per 100g"
    )
    fat_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Fat in grams per 100g"
    )
    fiber_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Fiber in grams per 100g"
    )
    
    # For unit-based items (eggs, bananas, etc.)
    calories_per_unit = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
        help_text="Calories per single unit/piece"
    )
    protein_per_unit = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Protein in grams per unit"
    )
    carbs_per_unit = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Carbohydrates in grams per unit"
    )
    fat_per_unit = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Fat in grams per unit"
    )
    fiber_per_unit = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Fiber in grams per unit"
    )
    
    # Which measurement type to use for this ingredient
    unit_type = models.CharField(
        max_length=10, 
        choices=UNIT_TYPE_CHOICES, 
        default='per_100g'
    )
    
    # For converting volume units (cups, tbsp) to grams
    gram_equivalent_per_cup = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="How many grams in 1 cup of this ingredient"
    )
    gram_equivalent_per_tbsp = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="How many grams in 1 tablespoon"
    )
    gram_equivalent_per_tsp = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="How many grams in 1 teaspoon"
    )
    
    class Meta:
        verbose_name_plural = "Ingredient Nutrition"
    
    def __str__(self):
        return f"Nutrition for {self.ingredient.name}"
    
    def calculate_calories_from_macros(self, protein, carbs, fat):
        """Calculate calories using 4-4-9 rule"""
        return (protein * 4) + (carbs * 4) + (fat * 9)
    
    gram_equivalent_per_piece = models.DecimalField(
    max_digits=6, decimal_places=2, null=True, blank=True,
    help_text="How many grams in 1 piece/unit of this ingredient (e.g., 1 tomato = 150g)"
)