from django.contrib import admin
from .models import Ingredient, Recipe, RecipeIngredient, Pantry, Favorite, IngredientNutrition 


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit')
    list_filter = ('category',)
    search_fields = ('name',)
    ordering = ('name',)
    search_fields = ['name']


class RecipeIngredientInline(admin.TabularInline):
    """Allows adding ingredients directly on the Recipe page"""
    model = RecipeIngredient
    extra = 3  # Shows 3 empty rows by default
    autocomplete_fields = ['ingredient']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'difficulty', 'preference', 'prep_time', 'cook_time', 'created_at')
    list_filter = ('difficulty', 'preference', 'created_at')
    search_fields = ('title', 'description')
    ordering = ('-created_at',)
    inlines = [RecipeIngredientInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'description', 'image_url', 'preference')
        }),
        ('Cooking Details', {
            'fields': ('instructions', 'prep_time', 'cook_time', 'servings', 'difficulty')
        }),
        ('Metadata', {
            'fields': ('created_by',)
        }),
    )


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'ingredient', 'quantity', 'unit')
    list_filter = ('recipe', 'ingredient')
    search_fields = ('recipe__title', 'ingredient__name')


@admin.register(Pantry)
class PantryAdmin(admin.ModelAdmin):
    list_display = ('user', 'ingredient', 'quantity', 'added_at')
    list_filter = ('user', 'ingredient__category')
    search_fields = ('user__username', 'ingredient__name')
    ordering = ('-added_at',)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'saved_at')
    list_filter = ('user', 'saved_at')
    search_fields = ('user__username', 'recipe__title')
    ordering = ('-saved_at',)

@admin.register(IngredientNutrition)
class IngredientNutritionAdmin(admin.ModelAdmin):
    list_display = ['ingredient', 'unit_type', 'calories_per_100g', 'calories_per_unit', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g']
    list_filter = ['unit_type']
    search_fields = ['ingredient__name']
    autocomplete_fields = ['ingredient']

    