from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Recipe, RecipeIngredient
from ..serializers import (
    RecipeListSerializer,
    RecipeDetailSerializer,
    RecipeCreateSerializer
)


# ==================== RECIPE APIs ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def recipe_list(request):
    """
    List all recipes with optional filters
    
    GET /api/recipes/
    GET /api/recipes/?search=curry
    GET /api/recipes/?difficulty=easy
    GET /api/recipes/?max_time=30
    GET /api/recipes/?ordering=prep_time
    """
    recipes = Recipe.objects.all()
    
    # Search by title or description
    search = request.query_params.get('search', None)
    if search:
        recipes = recipes.filter(title__icontains=search) | recipes.filter(description__icontains=search)
    
    # Filter by difficulty
    difficulty = request.query_params.get('difficulty', None)
    if difficulty:
        recipes = recipes.filter(difficulty=difficulty)

    # Filter by preference
    preference = request.query_params.get('preference', None)
    if preference:
        recipes = recipes.filter(preference=preference)
    
    # Filter by max total time (prep + cook)
    max_time = request.query_params.get('max_time', None)
    if max_time:
        try:
            max_time = int(max_time)
            recipes = [r for r in recipes if r.total_time <= max_time]
            # Convert back to queryset-like list for serializer
            recipe_ids = [r.id for r in recipes]
            recipes = Recipe.objects.filter(id__in=recipe_ids)
        except ValueError:
            pass
    
    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    valid_orderings = ['created_at', '-created_at', 'title', '-title', 'prep_time', '-prep_time', 'cook_time', '-cook_time']
    if ordering in valid_orderings:
        recipes = recipes.order_by(ordering)
    
    serializer = RecipeListSerializer(recipes, many=True)
    
    return Response({
        'count': len(serializer.data),
        'recipes': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def recipe_detail(request, pk):
    """
    Get full details of a single recipe
    
    GET /api/recipes/1/
    """
    try:
        recipe = Recipe.objects.get(pk=pk)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = RecipeDetailSerializer(recipe, context={'request': request})
    
    return Response({
        'recipe': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recipe_create(request):
    """
    Create a new recipe
    
    POST /api/recipes/create/
    {
        "title": "Pasta Carbonara",
        "description": "Classic Italian pasta dish",
        "instructions": "1. Boil pasta...\n2. Fry bacon...",
        "prep_time": 10,
        "cook_time": 20,
        "servings": 4,
        "difficulty": "medium",
        "image_url": "https://example.com/image.jpg",
        "ingredients": [
            {"ingredient_id": 1, "quantity": 200, "unit": "grams"},
            {"ingredient_id": 2, "quantity": 2, "unit": "pieces"}
        ]
    }
    """
    serializer = RecipeCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        recipe = serializer.save(created_by=request.user)
        
        # Return full recipe details
        detail_serializer = RecipeDetailSerializer(recipe, context={'request': request})
        
        return Response({
            'message': 'Recipe created successfully',
            'recipe': detail_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'message': 'Failed to create recipe',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def recipe_update(request, pk):
    """
    Update an existing recipe (only by creator)
    
    PUT /api/recipes/1/update/
    {
        "title": "Updated Recipe Title",
        "prep_time": 15,
        "ingredients": [
            {"ingredient_id": 1, "quantity": 300, "unit": "grams"}
        ]
    }
    """
    try:
        recipe = Recipe.objects.get(pk=pk)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is the creator
    if recipe.created_by != request.user:
        return Response({
            'message': 'You do not have permission to update this recipe'
        }, status=status.HTTP_403_FORBIDDEN)
    
    partial = request.method == 'PATCH'
    serializer = RecipeCreateSerializer(recipe, data=request.data, partial=partial)
    
    if serializer.is_valid():
        recipe = serializer.save()
        
        # Return updated recipe details
        detail_serializer = RecipeDetailSerializer(recipe, context={'request': request})
        
        return Response({
            'message': 'Recipe updated successfully',
            'recipe': detail_serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'message': 'Failed to update recipe',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def recipe_delete(request, pk):
    """
    Delete a recipe (only by creator)
    
    DELETE /api/recipes/1/delete/
    """
    try:
        recipe = Recipe.objects.get(pk=pk)
    except Recipe.DoesNotExist:
        return Response({
            'message': 'Recipe not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is the creator
    if recipe.created_by != request.user:
        return Response({
            'message': 'You do not have permission to delete this recipe'
        }, status=status.HTTP_403_FORBIDDEN)
    
    recipe_title = recipe.title
    recipe.delete()
    
    return Response({
        'message': f'Recipe "{recipe_title}" deleted successfully'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def recipe_by_user(request, user_id):
    """
    Get all recipes created by a specific user
    
    GET /api/recipes/user/1/
    """
    recipes = Recipe.objects.filter(created_by_id=user_id)
    
    if not recipes.exists():
        return Response({
            'message': 'No recipes found for this user',
            'count': 0,
            'recipes': []
        }, status=status.HTTP_200_OK)
    
    serializer = RecipeListSerializer(recipes, many=True)
    
    return Response({
        'count': recipes.count(),
        'recipes': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_recipes(request):
    """
    Get all recipes created by the logged-in user
    
    GET /api/recipes/my-recipes/
    """
    recipes = Recipe.objects.filter(created_by=request.user)
    serializer = RecipeListSerializer(recipes, many=True)
    
    return Response({
        'count': recipes.count(),
        'recipes': serializer.data
    }, status=status.HTTP_200_OK)