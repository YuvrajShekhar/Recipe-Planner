from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count
from ..models import Recipe, RecipeIngredient, Ingredient, Pantry
from ..serializers import IngredientSerializer


# ==================== INGREDIENT MATCHING APIs ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def match_recipes_by_ingredients(request):
    """
    Find recipes that match provided ingredients and calculate match percentage.
    
    POST /api/recipes/match/
    {
        "ingredient_ids": [1, 2, 3, 5, 7]
    }
    
    Optional query parameters:
    - min_match: Minimum match percentage (default: 0)
    - limit: Maximum number of results (default: 20)
    - difficulty: Filter by difficulty (easy/medium/hard)
    """
    # Get ingredient IDs from request body
    ingredient_ids = request.data.get('ingredient_ids', [])
    
    if not ingredient_ids:
        return Response({
            'message': 'Please provide ingredient_ids in the request body',
            'example': {'ingredient_ids': [1, 2, 3]}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate that ingredient IDs are integers
    try:
        ingredient_ids = [int(id) for id in ingredient_ids]
    except (ValueError, TypeError):
        return Response({
            'message': 'ingredient_ids must be a list of integers'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify ingredients exist
    valid_ingredients = Ingredient.objects.filter(id__in=ingredient_ids)
    valid_ingredient_ids = set(valid_ingredients.values_list('id', flat=True))
    
    if not valid_ingredient_ids:
        return Response({
            'message': 'No valid ingredients found with the provided IDs'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get optional parameters
    min_match = request.query_params.get('min_match', 0)
    limit = request.query_params.get('limit', 20)
    difficulty = request.query_params.get('difficulty', None)
    
    try:
        min_match = float(min_match)
        limit = int(limit)
    except ValueError:
        min_match = 0
        limit = 20
    
    # Get all recipes
    recipes = Recipe.objects.all()
    
    # Filter by difficulty if provided
    if difficulty:
        recipes = recipes.filter(difficulty=difficulty)
    
    # Calculate match percentage for each recipe
    matched_recipes = []
    
    for recipe in recipes:
        # Get all ingredients required for this recipe
        recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe)
        required_ingredient_ids = set(
            recipe_ingredients.values_list('ingredient_id', flat=True)
        )
        
        if not required_ingredient_ids:
            continue
        
        # Calculate matched and missing ingredients
        matched_ingredient_ids = valid_ingredient_ids.intersection(required_ingredient_ids)
        missing_ingredient_ids = required_ingredient_ids - valid_ingredient_ids
        
        # Calculate match percentage
        match_percentage = (len(matched_ingredient_ids) / len(required_ingredient_ids)) * 100
        
        # Only include if meets minimum match threshold
        if match_percentage >= min_match:
            # Get ingredient details for matched and missing
            matched_ingredients = list(
                Ingredient.objects.filter(id__in=matched_ingredient_ids).values('id', 'name', 'category')
            )
            missing_ingredients = list(
                Ingredient.objects.filter(id__in=missing_ingredient_ids).values('id', 'name', 'category')
            )
            
            matched_recipes.append({
                'id': recipe.id,
                'title': recipe.title,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'difficulty': recipe.difficulty,
                'image_url': recipe.image_url,
                'created_by': {
                    'id': recipe.created_by.id,
                    'username': recipe.created_by.username,
                },
                'match_percentage': round(match_percentage, 1),
                'matched_ingredients': matched_ingredients,
                'matched_count': len(matched_ingredients),
                'missing_ingredients': missing_ingredients,
                'missing_count': len(missing_ingredients),
                'total_ingredients': len(required_ingredient_ids),
            })
    
    # Sort by match percentage (highest first)
    matched_recipes.sort(key=lambda x: x['match_percentage'], reverse=True)
    
    # Apply limit
    matched_recipes = matched_recipes[:limit]
    
    # Get the ingredients that were used for matching
    input_ingredients = IngredientSerializer(valid_ingredients, many=True).data
    
    return Response({
        'message': 'Recipe matching completed',
        'input_ingredients': input_ingredients,
        'input_count': len(valid_ingredient_ids),
        'results_count': len(matched_recipes),
        'filters_applied': {
            'min_match': min_match,
            'limit': limit,
            'difficulty': difficulty,
        },
        'matched_recipes': matched_recipes
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def match_recipes_from_pantry(request):
    """
    Find recipes that match ingredients in the user's pantry.
    
    GET /api/recipes/match/pantry/
    
    Optional query parameters:
    - min_match: Minimum match percentage (default: 0)
    - limit: Maximum number of results (default: 20)
    - difficulty: Filter by difficulty (easy/medium/hard)
    """
    # Get user's pantry ingredients
    pantry_items = Pantry.objects.filter(user=request.user)
    
    if not pantry_items.exists():
        return Response({
            'message': 'Your pantry is empty. Add some ingredients first!',
            'pantry_count': 0,
            'matched_recipes': []
        }, status=status.HTTP_200_OK)
    
    # Get ingredient IDs from pantry
    pantry_ingredient_ids = set(
        pantry_items.values_list('ingredient_id', flat=True)
    )
    
    # Get optional parameters
    min_match = request.query_params.get('min_match', 0)
    limit = request.query_params.get('limit', 20)
    difficulty = request.query_params.get('difficulty', None)
    
    try:
        min_match = float(min_match)
        limit = int(limit)
    except ValueError:
        min_match = 0
        limit = 20
    
    # Get all recipes
    recipes = Recipe.objects.all()
    
    # Filter by difficulty if provided
    if difficulty:
        recipes = recipes.filter(difficulty=difficulty)
    
    # Calculate match percentage for each recipe
    matched_recipes = []
    
    for recipe in recipes:
        # Get all ingredients required for this recipe
        recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe)
        required_ingredient_ids = set(
            recipe_ingredients.values_list('ingredient_id', flat=True)
        )
        
        if not required_ingredient_ids:
            continue
        
        # Calculate matched and missing ingredients
        matched_ingredient_ids = pantry_ingredient_ids.intersection(required_ingredient_ids)
        missing_ingredient_ids = required_ingredient_ids - pantry_ingredient_ids
        
        # Calculate match percentage
        match_percentage = (len(matched_ingredient_ids) / len(required_ingredient_ids)) * 100
        
        # Only include if meets minimum match threshold
        if match_percentage >= min_match:
            # Get ingredient details for matched and missing
            matched_ingredients = list(
                Ingredient.objects.filter(id__in=matched_ingredient_ids).values('id', 'name', 'category')
            )
            missing_ingredients = list(
                Ingredient.objects.filter(id__in=missing_ingredient_ids).values('id', 'name', 'category')
            )
            
            matched_recipes.append({
                'id': recipe.id,
                'title': recipe.title,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'difficulty': recipe.difficulty,
                'image_url': recipe.image_url,
                'created_by': {
                    'id': recipe.created_by.id,
                    'username': recipe.created_by.username,
                },
                'match_percentage': round(match_percentage, 1),
                'matched_ingredients': matched_ingredients,
                'matched_count': len(matched_ingredients),
                'missing_ingredients': missing_ingredients,
                'missing_count': len(missing_ingredients),
                'total_ingredients': len(required_ingredient_ids),
            })
    
    # Sort by match percentage (highest first)
    matched_recipes.sort(key=lambda x: x['match_percentage'], reverse=True)
    
    # Apply limit
    matched_recipes = matched_recipes[:limit]
    
    # Get pantry ingredients details
    pantry_ingredients = IngredientSerializer(
        Ingredient.objects.filter(id__in=pantry_ingredient_ids), 
        many=True
    ).data
    
    return Response({
        'message': 'Recipe matching from pantry completed',
        'pantry_ingredients': pantry_ingredients,
        'pantry_count': len(pantry_ingredient_ids),
        'results_count': len(matched_recipes),
        'filters_applied': {
            'min_match': min_match,
            'limit': limit,
            'difficulty': difficulty,
        },
        'matched_recipes': matched_recipes
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def find_recipes_by_available_ingredients(request):
    """
    Find recipes where ALL ingredients are available (100% match).
    Great for "What can I make right now?" feature.
    
    POST /api/recipes/match/complete/
    {
        "ingredient_ids": [1, 2, 3, 5, 7, 9, 10]
    }
    
    Optional query parameters:
    - difficulty: Filter by difficulty (easy/medium/hard)
    - max_time: Maximum total cooking time in minutes
    """
    # Get ingredient IDs from request body
    ingredient_ids = request.data.get('ingredient_ids', [])
    
    if not ingredient_ids:
        return Response({
            'message': 'Please provide ingredient_ids in the request body',
            'example': {'ingredient_ids': [1, 2, 3]}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate that ingredient IDs are integers
    try:
        ingredient_ids = [int(id) for id in ingredient_ids]
    except (ValueError, TypeError):
        return Response({
            'message': 'ingredient_ids must be a list of integers'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify ingredients exist
    valid_ingredients = Ingredient.objects.filter(id__in=ingredient_ids)
    valid_ingredient_ids = set(valid_ingredients.values_list('id', flat=True))
    
    if not valid_ingredient_ids:
        return Response({
            'message': 'No valid ingredients found with the provided IDs'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get optional parameters
    difficulty = request.query_params.get('difficulty', None)
    max_time = request.query_params.get('max_time', None)
    
    # Get all recipes
    recipes = Recipe.objects.all()
    
    # Filter by difficulty if provided
    if difficulty:
        recipes = recipes.filter(difficulty=difficulty)
    
    # Find recipes where user has ALL ingredients
    complete_match_recipes = []
    
    for recipe in recipes:
        # Filter by max_time if provided
        if max_time:
            try:
                if recipe.total_time > int(max_time):
                    continue
            except ValueError:
                pass
        
        # Get all ingredients required for this recipe
        recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe)
        required_ingredient_ids = set(
            recipe_ingredients.values_list('ingredient_id', flat=True)
        )
        
        if not required_ingredient_ids:
            continue
        
        # Check if user has ALL ingredients
        if required_ingredient_ids.issubset(valid_ingredient_ids):
            # Get ingredient details with quantities
            recipe_ingredient_details = []
            for ri in recipe_ingredients:
                recipe_ingredient_details.append({
                    'id': ri.ingredient.id,
                    'name': ri.ingredient.name,
                    'quantity': float(ri.quantity),
                    'unit': ri.unit,
                })
            
            complete_match_recipes.append({
                'id': recipe.id,
                'title': recipe.title,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'difficulty': recipe.difficulty,
                'image_url': recipe.image_url,
                'created_by': {
                    'id': recipe.created_by.id,
                    'username': recipe.created_by.username,
                },
                'ingredients': recipe_ingredient_details,
                'ingredient_count': len(required_ingredient_ids),
            })
    
    # Sort by total time (quickest first)
    complete_match_recipes.sort(key=lambda x: x['total_time'])
    
    # Get the ingredients that were used for matching
    input_ingredients = IngredientSerializer(valid_ingredients, many=True).data
    
    return Response({
        'message': 'Complete match search completed',
        'description': 'These recipes can be made with your available ingredients',
        'input_ingredients': input_ingredients,
        'input_count': len(valid_ingredient_ids),
        'results_count': len(complete_match_recipes),
        'filters_applied': {
            'difficulty': difficulty,
            'max_time': max_time,
        },
        'recipes': complete_match_recipes
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def find_recipes_missing_few_ingredients(request):
    """
    Find recipes where user is missing only a few ingredients.
    Great for "Almost there" feature - suggest recipes with minimal shopping.
    
    POST /api/recipes/match/almost/
    {
        "ingredient_ids": [1, 2, 3, 5, 7],
        "max_missing": 2
    }
    
    Optional query parameters:
    - difficulty: Filter by difficulty (easy/medium/hard)
    """
    # Get ingredient IDs from request body
    ingredient_ids = request.data.get('ingredient_ids', [])
    max_missing = request.data.get('max_missing', 2)
    
    if not ingredient_ids:
        return Response({
            'message': 'Please provide ingredient_ids in the request body',
            'example': {'ingredient_ids': [1, 2, 3], 'max_missing': 2}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate inputs
    try:
        ingredient_ids = [int(id) for id in ingredient_ids]
        max_missing = int(max_missing)
    except (ValueError, TypeError):
        return Response({
            'message': 'ingredient_ids must be a list of integers, max_missing must be an integer'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify ingredients exist
    valid_ingredients = Ingredient.objects.filter(id__in=ingredient_ids)
    valid_ingredient_ids = set(valid_ingredients.values_list('id', flat=True))
    
    if not valid_ingredient_ids:
        return Response({
            'message': 'No valid ingredients found with the provided IDs'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get optional parameters
    difficulty = request.query_params.get('difficulty', None)
    
    # Get all recipes
    recipes = Recipe.objects.all()
    
    # Filter by difficulty if provided
    if difficulty:
        recipes = recipes.filter(difficulty=difficulty)
    
    # Find recipes where user is missing only a few ingredients
    almost_match_recipes = []
    
    for recipe in recipes:
        # Get all ingredients required for this recipe
        recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe)
        required_ingredient_ids = set(
            recipe_ingredients.values_list('ingredient_id', flat=True)
        )
        
        if not required_ingredient_ids:
            continue
        
        # Calculate missing ingredients
        missing_ingredient_ids = required_ingredient_ids - valid_ingredient_ids
        matched_ingredient_ids = valid_ingredient_ids.intersection(required_ingredient_ids)
        
        # Only include if missing count is within threshold and at least 1 ingredient matched
        if len(missing_ingredient_ids) <= max_missing and len(matched_ingredient_ids) > 0:
            # Skip 100% matches (those are for complete match endpoint)
            if len(missing_ingredient_ids) == 0:
                continue
            
            # Get ingredient details
            matched_ingredients = list(
                Ingredient.objects.filter(id__in=matched_ingredient_ids).values('id', 'name', 'category')
            )
            missing_ingredients = list(
                Ingredient.objects.filter(id__in=missing_ingredient_ids).values('id', 'name', 'category')
            )
            
            match_percentage = (len(matched_ingredient_ids) / len(required_ingredient_ids)) * 100
            
            almost_match_recipes.append({
                'id': recipe.id,
                'title': recipe.title,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'difficulty': recipe.difficulty,
                'image_url': recipe.image_url,
                'created_by': {
                    'id': recipe.created_by.id,
                    'username': recipe.created_by.username,
                },
                'match_percentage': round(match_percentage, 1),
                'matched_ingredients': matched_ingredients,
                'matched_count': len(matched_ingredients),
                'missing_ingredients': missing_ingredients,
                'missing_count': len(missing_ingredients),
                'total_ingredients': len(required_ingredient_ids),
                'shopping_list': missing_ingredients,  # Convenience alias
            })
    
    # Sort by missing count (fewest missing first), then by match percentage
    almost_match_recipes.sort(key=lambda x: (x['missing_count'], -x['match_percentage']))
    
    # Get the ingredients that were used for matching
    input_ingredients = IngredientSerializer(valid_ingredients, many=True).data
    
    return Response({
        'message': 'Almost-match search completed',
        'description': f'These recipes are missing at most {max_missing} ingredient(s)',
        'input_ingredients': input_ingredients,
        'input_count': len(valid_ingredient_ids),
        'max_missing_allowed': max_missing,
        'results_count': len(almost_match_recipes),
        'filters_applied': {
            'difficulty': difficulty,
        },
        'recipes': almost_match_recipes
    }, status=status.HTTP_200_OK)