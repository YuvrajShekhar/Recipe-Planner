from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Ingredient
from ..serializers import IngredientSerializer


# ==================== INGREDIENT APIs ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def ingredient_list(request):
    """
    List all ingredients with optional search and category filter
    
    GET /api/ingredients/
    GET /api/ingredients/?search=chicken
    GET /api/ingredients/?category=meat
    GET /api/ingredients/?search=tom&category=vegetable
    """
    ingredients = Ingredient.objects.all()
    
    # Search by name
    search = request.query_params.get('search', None)
    if search:
        ingredients = ingredients.filter(name__icontains=search)
    
    # Filter by category
    category = request.query_params.get('category', None)
    if category:
        ingredients = ingredients.filter(category=category)
    
    serializer = IngredientSerializer(ingredients, many=True)
    
    return Response({
        'count': ingredients.count(),
        'ingredients': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def ingredient_detail(request, pk):
    """
    Get a single ingredient by ID
    
    GET /api/ingredients/1/
    """
    try:
        ingredient = Ingredient.objects.get(pk=pk)
    except Ingredient.DoesNotExist:
        return Response({
            'message': 'Ingredient not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = IngredientSerializer(ingredient)
    
    return Response({
        'ingredient': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ingredient_create(request):
    """
    Create a new ingredient (authenticated users only)
    
    POST /api/ingredients/create/
    {
        "name": "Paprika",
        "category": "spice",
        "unit": "teaspoons"
    }
    """
    serializer = IngredientSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Ingredient created successfully',
            'ingredient': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'message': 'Failed to create ingredient',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def ingredient_categories(request):
    """
    Get all available ingredient categories
    
    GET /api/ingredients/categories/
    """
    categories = [
        {'value': 'vegetable', 'label': 'Vegetable'},
        {'value': 'fruit', 'label': 'Fruit'},
        {'value': 'meat', 'label': 'Meat'},
        {'value': 'seafood', 'label': 'Seafood'},
        {'value': 'dairy', 'label': 'Dairy'},
        {'value': 'grain', 'label': 'Grain'},
        {'value': 'spice', 'label': 'Spice'},
        {'value': 'condiment', 'label': 'Condiment'},
        {'value': 'other', 'label': 'Other'},
    ]
    
    return Response({
        'categories': categories
    }, status=status.HTTP_200_OK)