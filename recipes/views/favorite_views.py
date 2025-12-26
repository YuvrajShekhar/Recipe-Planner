from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import Favorite, Recipe
from ..serializers import FavoriteSerializer, RecipeListSerializer


# ==================== FAVORITE APIs ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorite_list(request):
    """
    Get all favorite recipes for the logged-in user
    
    GET /api/favorites/
    
    Optional query parameters:
    - difficulty: Filter by recipe difficulty
    - ordering: Order results (saved_at, -saved_at, title, -title)
    """
    favorites = Favorite.objects.filter(user=request.user)
    
    # Filter by difficulty
    difficulty = request.query_params.get('difficulty', None)
    if difficulty:
        favorites = favorites.filter(recipe__difficulty=difficulty)
    
    # Ordering
    ordering = request.query_params.get('ordering', '-saved_at')
    valid_orderings = ['saved_at', '-saved_at', 'recipe__title', '-recipe__title']
    if ordering in valid_orderings:
        favorites = favorites.order_by(ordering)
    
    serializer = FavoriteSerializer(favorites, many=True)
    
    # Get summary stats
    difficulty_summary = {}
    for fav in favorites:
        diff = fav.recipe.difficulty
        if diff not in difficulty_summary:
            difficulty_summary[diff] = 0
        difficulty_summary[diff] += 1
    
    return Response({
        'message': 'Favorites retrieved successfully',
        'count': favorites.count(),
        'difficulty_summary': difficulty_summary,
        'favorites': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def favorite_add(request):
    """
    Add a recipe to favorites
    
    POST /api/favorites/add/
    {
        "recipe_id": 1
    }
    """
    recipe_id = request.data.get('recipe_id')
    
    if not recipe_id:
        return Response({
            'message': 'Please provide recipe_id',
            'example': {'recipe_id': 1}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if recipe exists
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if already favorited
    existing_favorite = Favorite.objects.filter(user=request.user, recipe=recipe).first()
    
    if existing_favorite:
        return Response({
            'message': f'"{recipe.title}" is already in your favorites',
            'favorite': FavoriteSerializer(existing_favorite).data
        }, status=status.HTTP_200_OK)
    
    # Create new favorite
    favorite = Favorite.objects.create(
        user=request.user,
        recipe=recipe
    )
    
    serializer = FavoriteSerializer(favorite)
    
    return Response({
        'message': f'"{recipe.title}" added to favorites',
        'favorite': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def favorite_toggle(request):
    """
    Toggle favorite status of a recipe (add if not favorited, remove if favorited)
    
    POST /api/favorites/toggle/
    {
        "recipe_id": 1
    }
    """
    recipe_id = request.data.get('recipe_id')
    
    if not recipe_id:
        return Response({
            'message': 'Please provide recipe_id',
            'example': {'recipe_id': 1}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if recipe exists
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if already favorited
    existing_favorite = Favorite.objects.filter(user=request.user, recipe=recipe).first()
    
    if existing_favorite:
        # Remove from favorites
        existing_favorite.delete()
        return Response({
            'message': f'"{recipe.title}" removed from favorites',
            'is_favorited': False,
            'recipe_id': recipe.id,
            'recipe_title': recipe.title
        }, status=status.HTTP_200_OK)
    else:
        # Add to favorites
        favorite = Favorite.objects.create(
            user=request.user,
            recipe=recipe
        )
        return Response({
            'message': f'"{recipe.title}" added to favorites',
            'is_favorited': True,
            'recipe_id': recipe.id,
            'recipe_title': recipe.title,
            'favorite': FavoriteSerializer(favorite).data
        }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def favorite_remove(request, pk):
    """
    Remove a recipe from favorites by favorite ID
    
    DELETE /api/favorites/1/remove/
    """
    try:
        favorite = Favorite.objects.get(pk=pk, user=request.user)
    except Favorite.DoesNotExist:
        return Response({
            'message': 'Favorite not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    recipe_title = favorite.recipe.title
    favorite.delete()
    
    return Response({
        'message': f'"{recipe_title}" removed from favorites'
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def favorite_remove_by_recipe(request, recipe_id):
    """
    Remove a recipe from favorites by recipe ID
    
    DELETE /api/favorites/recipe/1/remove/
    """
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    favorite = Favorite.objects.filter(user=request.user, recipe=recipe).first()
    
    if not favorite:
        return Response({
            'message': f'"{recipe.title}" is not in your favorites'
        }, status=status.HTTP_404_NOT_FOUND)
    
    favorite.delete()
    
    return Response({
        'message': f'"{recipe.title}" removed from favorites'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorite_check(request, recipe_id):
    """
    Check if a specific recipe is in user's favorites
    
    GET /api/favorites/check/1/
    """
    try:
        recipe = Recipe.objects.get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    favorite = Favorite.objects.filter(user=request.user, recipe=recipe).first()
    
    if favorite:
        return Response({
            'is_favorited': True,
            'recipe': {
                'id': recipe.id,
                'title': recipe.title,
                'difficulty': recipe.difficulty
            },
            'favorited_at': favorite.saved_at
        }, status=status.HTTP_200_OK)
    
    return Response({
        'is_favorited': False,
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'difficulty': recipe.difficulty
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorite_recipe_ids(request):
    """
    Get just the recipe IDs from user's favorites.
    Useful for quickly checking favorite status of multiple recipes.
    
    GET /api/favorites/recipe-ids/
    """
    favorites = Favorite.objects.filter(user=request.user)
    recipe_ids = list(favorites.values_list('recipe_id', flat=True))
    
    return Response({
        'count': len(recipe_ids),
        'recipe_ids': recipe_ids
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def favorite_clear(request):
    """
    Clear all favorites for the user
    
    DELETE /api/favorites/clear/
    """
    favorites = Favorite.objects.filter(user=request.user)
    count = favorites.count()
    
    if count == 0:
        return Response({
            'message': 'You have no favorites to clear',
            'deleted_count': 0
        }, status=status.HTTP_200_OK)
    
    favorites.delete()
    
    return Response({
        'message': 'All favorites cleared successfully',
        'deleted_count': count
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorite_detail(request, pk):
    """
    Get details of a single favorite entry
    
    GET /api/favorites/1/
    """
    try:
        favorite = Favorite.objects.get(pk=pk, user=request.user)
    except Favorite.DoesNotExist:
        return Response({
            'message': 'Favorite not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = FavoriteSerializer(favorite)
    
    return Response({
        'favorite': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorites_with_pantry_match(request):
    """
    Get favorites with pantry match information.
    Shows which favorited recipes you can make with your current pantry.
    
    GET /api/favorites/with-pantry-match/
    """
    from ..models import Pantry, RecipeIngredient, Ingredient
    
    favorites = Favorite.objects.filter(user=request.user)
    
    if not favorites.exists():
        return Response({
            'message': 'You have no favorites yet',
            'count': 0,
            'favorites': []
        }, status=status.HTTP_200_OK)
    
    # Get user's pantry ingredient IDs
    pantry_ingredient_ids = set(
        Pantry.objects.filter(user=request.user).values_list('ingredient_id', flat=True)
    )
    
    favorites_with_match = []
    
    for favorite in favorites:
        recipe = favorite.recipe
        
        # Get recipe ingredients
        recipe_ingredients = RecipeIngredient.objects.filter(recipe=recipe)
        required_ingredient_ids = set(
            recipe_ingredients.values_list('ingredient_id', flat=True)
        )
        
        if required_ingredient_ids:
            matched_ids = pantry_ingredient_ids.intersection(required_ingredient_ids)
            missing_ids = required_ingredient_ids - pantry_ingredient_ids
            match_percentage = (len(matched_ids) / len(required_ingredient_ids)) * 100
        else:
            matched_ids = set()
            missing_ids = set()
            match_percentage = 0
        
        # Get ingredient details
        matched_ingredients = list(
            Ingredient.objects.filter(id__in=matched_ids).values('id', 'name', 'category')
        )
        missing_ingredients = list(
            Ingredient.objects.filter(id__in=missing_ids).values('id', 'name', 'category')
        )
        
        favorites_with_match.append({
            'favorite_id': favorite.id,
            'saved_at': favorite.saved_at,
            'recipe': {
                'id': recipe.id,
                'title': recipe.title,
                'description': recipe.description,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'difficulty': recipe.difficulty,
                'image_url': recipe.image_url,
            },
            'pantry_match': {
                'match_percentage': round(match_percentage, 1),
                'matched_count': len(matched_ids),
                'missing_count': len(missing_ids),
                'total_ingredients': len(required_ingredient_ids),
                'matched_ingredients': matched_ingredients,
                'missing_ingredients': missing_ingredients,
                'can_make_now': len(missing_ids) == 0
            }
        })
    
    # Sort by match percentage (highest first)
    favorites_with_match.sort(key=lambda x: x['pantry_match']['match_percentage'], reverse=True)
    
    # Summary stats
    can_make_now = sum(1 for f in favorites_with_match if f['pantry_match']['can_make_now'])
    almost_ready = sum(1 for f in favorites_with_match if 0 < f['pantry_match']['missing_count'] <= 2)
    
    return Response({
        'message': 'Favorites with pantry match retrieved successfully',
        'count': len(favorites_with_match),
        'summary': {
            'can_make_now': can_make_now,
            'almost_ready': almost_ready,
            'pantry_items_count': len(pantry_ingredient_ids)
        },
        'favorites': favorites_with_match
    }, status=status.HTTP_200_OK)