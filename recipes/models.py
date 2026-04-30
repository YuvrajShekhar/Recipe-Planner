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
    image_url = models.TextField(blank=True, null=True)
    thumbnail_url = models.TextField(blank=True, null=True,
        help_text="Small compressed version used in recipe card lists.")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    preference = models.CharField(max_length=10, choices=PREFERENCE_CHOICES, default='veg')
    is_public = models.BooleanField(
        default=False,
        help_text="If true, all users can see this recipe; otherwise only the creator."
    )

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
    quantity              = models.DecimalField(max_digits=9, decimal_places=3, blank=True, null=True)
    unit                  = models.CharField(max_length=30, blank=True, default='',
                                             help_text="Unit for this pantry entry (overrides ingredient default)")
    low_stock_threshold   = models.DecimalField(max_digits=9, decimal_places=3, blank=True, null=True,
                                                help_text="Alert when quantity drops below this value")
    low_stock_unit        = models.CharField(max_length=30, blank=True, default='',
                                             help_text="Unit for the low-stock threshold")
    added_at              = models.DateTimeField(auto_now_add=True)
    
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


class DailyNutritionLog(models.Model):
    """Tracks daily food intake for nutrition monitoring"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nutrition_logs')
    date = models.DateField(help_text="Date of consumption")
    dish_name = models.CharField(max_length=200, help_text="Name of the dish/food consumed")

    # Nutritional information
    calories = models.DecimalField(max_digits=7, decimal_places=2, help_text="Total calories")
    protein = models.DecimalField(max_digits=6, decimal_places=2, help_text="Protein in grams")
    carbs = models.DecimalField(max_digits=6, decimal_places=2, help_text="Carbohydrates in grams")
    fat = models.DecimalField(max_digits=6, decimal_places=2, help_text="Fat in grams")
    fiber = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text="Fiber in grams")

    # Metadata
    notes = models.TextField(blank=True, help_text="Optional notes about the meal")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Daily Nutrition Log"
        verbose_name_plural = "Daily Nutrition Logs"
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.dish_name} on {self.date}"


class FitnessLog(models.Model):
    """Tracks daily fitness activity — one entry per user per day"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fitness_logs')
    date = models.DateField(help_text="Date of the fitness activity")
    steps = models.PositiveIntegerField(default=0, help_text="Number of steps walked")
    weight_kg = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Body weight recorded on this day (kg)"
    )
    notes = models.TextField(blank=True, help_text="Optional notes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Fitness Log"
        verbose_name_plural = "Fitness Logs"
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
        unique_together = [['user', 'date']]

    def __str__(self):
        return f"{self.user.username} - {self.steps} steps on {self.date}"


class FoodItem(models.Model):
    """Standalone food items (apples, protein bars, etc.) with per-serving nutrition."""

    CATEGORY_CHOICES = [
        ('fruit',     'Fruit'),
        ('vegetable', 'Vegetable'),
        ('dairy',     'Dairy'),
        ('meat',      'Meat'),
        ('grain',     'Grain'),
        ('snack',     'Snack'),
        ('beverage',  'Beverage'),
        ('packaged',  'Packaged Food'),
        ('other',     'Other'),
    ]

    name               = models.CharField(max_length=200)
    brand              = models.CharField(max_length=200, blank=True)
    barcode            = models.CharField(max_length=100, blank=True, db_index=True)
    category           = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    serving_description = models.CharField(
        max_length=100, default='1 serving',
        help_text='e.g. "1 piece", "100g", "1 bar"'
    )
    # Per-serving nutrition
    calories = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    protein  = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs    = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fat      = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber    = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    thumbnail_url = models.TextField(blank=True)
    created_by    = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='food_items',
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.brand})" if self.brand else self.name


class FoodPantry(models.Model):
    """How many of each food item a user currently has."""

    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='food_pantry')
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='pantry_entries')
    quantity  = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text='Number of units/servings currently owned'
    )
    added_at   = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'food_item']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username}'s {self.food_item.name} ×{self.quantity}"


class FridgeItem(models.Model):
    """Stores cooked dishes in the user's virtual fridge"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fridge_items')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='fridge_items')
    portions = models.DecimalField(
        max_digits=6, decimal_places=2,
        help_text="Number of portions/servings currently stored"
    )
    cooked_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-cooked_at']

    def __str__(self):
        return f"{self.user.username}'s {self.recipe.title} ({self.portions} portions)"


class FitbitCredentials(models.Model):
    """Stores Fitbit OAuth 2.0 tokens per user"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='fitbit_credentials')
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Fitbit credentials"


class UserProfile(models.Model):
    """Stores body metrics for a user — used for calorie burn calculations"""

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.PositiveIntegerField(null=True, blank=True, help_text="Age in years")
    height_cm = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        help_text="Height in centimetres"
    )
    weight_kg = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Weight in kilograms"
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

    def bmr(self):
        """Harris-Benedict BMR in kcal/day. Returns None if any field is missing."""
        if not all([self.weight_kg, self.height_cm, self.age, self.gender]):
            return None
        w = float(self.weight_kg)
        h = float(self.height_cm)
        a = float(self.age)
        if self.gender == 'male':
            return 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a)
        return 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a)


# MET values (Compendium of Physical Activities)
MET_VALUES = {
    'bouldering':               7.5,
    'weight_training_moderate': 3.5,
    'weight_training_vigorous': 6.0,
    'cardio_moderate':          7.0,
    'cardio_vigorous':          10.0,
    'circuit_training':         8.0,
}


class ActivityLog(models.Model):
    """Logs a single exercise session for a user"""

    ACTIVITY_CHOICES = [
        ('bouldering',               'Bouldering / Rock Climbing'),
        ('weight_training_moderate', 'Gym – Weight Training (moderate)'),
        ('weight_training_vigorous', 'Gym – Weight Training (vigorous)'),
        ('cardio_moderate',          'Cardio (moderate)'),
        ('cardio_vigorous',          'Cardio (vigorous)'),
        ('circuit_training',         'Circuit Training'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    date = models.DateField(help_text="Date of the activity")
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_CHOICES)
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    calories_burned = models.DecimalField(
        max_digits=7, decimal_places=1,
        help_text="Calories burned — calculated via Harris-Benedict + MET"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['user', 'date'])]

    def __str__(self):
        return f"{self.user.username} — {self.get_activity_type_display()} on {self.date}"