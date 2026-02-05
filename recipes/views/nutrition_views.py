from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Recipe, IngredientNutrition
from ..serializers import IngredientNutritionSerializer, RecipeNutritionSerializer


# ==================== INGREDIENT NUTRITION APIs ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def ingredient_nutrition_list(request):
    """List all ingredient nutrition data"""
    nutrition_data = IngredientNutrition.objects.all()
    serializer = IngredientNutritionSerializer(nutrition_data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def ingredient_nutrition_detail(request, ingredient_id):
    """Get nutrition data for a specific ingredient"""
    try:
        nutrition = IngredientNutrition.objects.get(ingredient_id=ingredient_id)
        serializer = IngredientNutritionSerializer(nutrition)
        return Response(serializer.data)
    except IngredientNutrition.DoesNotExist:
        return Response(
            {'error': 'Nutrition data not found for this ingredient'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ingredient_nutrition_create(request):
    """Add nutrition data for an ingredient"""
    serializer = IngredientNutritionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def ingredient_nutrition_update(request, ingredient_id):
    """Update nutrition data for an ingredient"""
    try:
        nutrition = IngredientNutrition.objects.get(ingredient_id=ingredient_id)
    except IngredientNutrition.DoesNotExist:
        return Response(
            {'error': 'Nutrition data not found for this ingredient'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = IngredientNutritionSerializer(nutrition, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def ingredient_nutrition_delete(request, ingredient_id):
    """Delete nutrition data for an ingredient"""
    try:
        nutrition = IngredientNutrition.objects.get(ingredient_id=ingredient_id)
        nutrition.delete()
        return Response(
            {'message': 'Nutrition data deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    except IngredientNutrition.DoesNotExist:
        return Response(
            {'error': 'Nutrition data not found for this ingredient'},
            status=status.HTTP_404_NOT_FOUND
        )


# ==================== RECIPE NUTRITION API ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def recipe_nutrition(request, recipe_id):
    """
    Calculate and return nutrition information for a recipe.
    """
    try:
        recipe = Recipe.objects.get(id=recipe_id)
    except Recipe.DoesNotExist:
        return Response(
            {'error': 'Recipe not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Initialize totals
    total_calories = Decimal('0')
    total_protein = Decimal('0')
    total_carbs = Decimal('0')
    total_fat = Decimal('0')
    total_fiber = Decimal('0')
    ingredients_without_nutrition = []
    
    # Get all recipe ingredients
    recipe_ingredients = recipe.recipe_ingredients.all()
    
    for ri in recipe_ingredients:
        try:
            nutrition = ri.ingredient.nutrition
        except IngredientNutrition.DoesNotExist:
            ingredients_without_nutrition.append(ri.ingredient.name)
            continue
        
        # Calculate nutrition based on unit type
        if nutrition.unit_type == 'per_unit':
            # For items measured per piece (eggs, bananas)
            multiplier = Decimal(str(ri.quantity))
            total_calories += (nutrition.calories_per_unit or Decimal('0')) * multiplier
            total_protein += (nutrition.protein_per_unit or Decimal('0')) * multiplier
            total_carbs += (nutrition.carbs_per_unit or Decimal('0')) * multiplier
            total_fat += (nutrition.fat_per_unit or Decimal('0')) * multiplier
            total_fiber += (nutrition.fiber_per_unit or Decimal('0')) * multiplier
        else:
            # For items measured per 100g
            grams = _convert_to_grams(ri, nutrition)
            if grams:
                multiplier = grams / Decimal('100')
                total_calories += (nutrition.calories_per_100g or Decimal('0')) * multiplier
                total_protein += (nutrition.protein_per_100g or Decimal('0')) * multiplier
                total_carbs += (nutrition.carbs_per_100g or Decimal('0')) * multiplier
                total_fat += (nutrition.fat_per_100g or Decimal('0')) * multiplier
                total_fiber += (nutrition.fiber_per_100g or Decimal('0')) * multiplier
            else:
                ingredients_without_nutrition.append(
                    f"{ri.ingredient.name} (unable to convert {ri.unit} to grams)"
                )
    
    # Calculate per serving
    servings = recipe.servings or 1
    calories_per_serving = total_calories / servings
    protein_per_serving = total_protein / servings
    carbs_per_serving = total_carbs / servings
    fat_per_serving = total_fat / servings
    fiber_per_serving = total_fiber / servings
    
    # Calculate macro percentages (by calories)
    total_macro_calories = (total_protein * 4) + (total_carbs * 4) + (total_fat * 9)
    if total_macro_calories > 0:
        protein_percentage = (total_protein * 4 / total_macro_calories) * 100
        carbs_percentage = (total_carbs * 4 / total_macro_calories) * 100
        fat_percentage = (total_fat * 9 / total_macro_calories) * 100
    else:
        protein_percentage = carbs_percentage = fat_percentage = Decimal('0')
    
    nutrition_data = {
        'total_calories': round(total_calories, 2),
        'total_protein': round(total_protein, 2),
        'total_carbs': round(total_carbs, 2),
        'total_fat': round(total_fat, 2),
        'total_fiber': round(total_fiber, 2),
        'calories_per_serving': round(calories_per_serving, 2),
        'protein_per_serving': round(protein_per_serving, 2),
        'carbs_per_serving': round(carbs_per_serving, 2),
        'fat_per_serving': round(fat_per_serving, 2),
        'fiber_per_serving': round(fiber_per_serving, 2),
        'servings': servings,
        'protein_percentage': round(protein_percentage, 1),
        'carbs_percentage': round(carbs_percentage, 1),
        'fat_percentage': round(fat_percentage, 1),
        'ingredients_without_nutrition': ingredients_without_nutrition,
    }
    
    serializer = RecipeNutritionSerializer(nutrition_data)
    return Response(serializer.data)


def _convert_to_grams(recipe_ingredient, nutrition):
    """Convert various units to grams for calculation"""
    quantity = Decimal(str(recipe_ingredient.quantity))
    unit = recipe_ingredient.unit.lower().strip()
    
    # Direct gram measurements
    if unit in ['g', 'gram', 'grams']:
        return quantity
    if unit in ['kg', 'kilogram', 'kilograms']:
        return quantity * 1000
    
    # Piece/unit conversions (for tomato, onion, etc.)
    if unit in ['piece', 'pieces', 'pcs', 'pc', 'whole', 'unit', 'units']:
        if nutrition.gram_equivalent_per_piece:
            return quantity * nutrition.gram_equivalent_per_piece
    
    # Volume conversions using ingredient-specific data
    if unit in ['cup', 'cups']:
        if nutrition.gram_equivalent_per_cup:
            return quantity * nutrition.gram_equivalent_per_cup
    if unit in ['tbsp', 'tablespoon', 'tablespoons']:
        if nutrition.gram_equivalent_per_tbsp:
            return quantity * nutrition.gram_equivalent_per_tbsp
    if unit in ['tsp', 'teaspoon', 'teaspoons']:
        if nutrition.gram_equivalent_per_tsp:
            return quantity * nutrition.gram_equivalent_per_tsp
    
    # For ml, assume water density (1ml = 1g) as rough approximation
    if unit in ['ml', 'milliliter', 'milliliters']:
        return quantity
    if unit in ['l', 'liter', 'liters']:
        return quantity * 1000
    
    # Unable to convert
    return None