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
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    instructions = models.TextField(help_text="Step-by-step cooking instructions")
    prep_time = models.PositiveIntegerField(help_text="Preparation time in minutes")
    cook_time = models.PositiveIntegerField(help_text="Cooking time in minutes")
    servings = models.PositiveIntegerField(default=4)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    image_url = models.URLField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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