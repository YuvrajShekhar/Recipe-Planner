from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import Pantry, Ingredient
from ..serializers import PantrySerializer, IngredientSerializer


# ==================== PANTRY APIs ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_list(request):
    """
    Get all ingredients in the user's pantry
    
    GET /api/pantry/
    
    Optional query parameters:
    - category: Filter by ingredient category
    """
    pantry_items = Pantry.objects.filter(user=request.user)
    
    # Filter by category if provided
    category = request.query_params.get('category', None)
    if category:
        pantry_items = pantry_items.filter(ingredient__category=category)
    
    serializer = PantrySerializer(pantry_items, many=True)
    
    # Get summary by category
    category_summary = {}
    for item in pantry_items:
        cat = item.ingredient.category
        if cat not in category_summary:
            category_summary[cat] = 0
        category_summary[cat] += 1
    
    return Response({
        'message': 'Pantry retrieved successfully',
        'count': pantry_items.count(),
        'category_summary': category_summary,
        'pantry_items': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pantry_add(request):
    """
    Add an ingredient to the user's pantry
    
    POST /api/pantry/add/
    {
        "ingredient_id": 1,
        "quantity": 500
    }
    
    Note: quantity is optional
    """
    ingredient_id = request.data.get('ingredient_id')
    quantity = request.data.get('quantity', None)
    
    if not ingredient_id:
        return Response({
            'message': 'Please provide ingredient_id',
            'example': {'ingredient_id': 1, 'quantity': 500}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if ingredient exists
    try:
        ingredient = Ingredient.objects.get(pk=ingredient_id)
    except Ingredient.DoesNotExist:
        return Response({
            'message': 'Ingredient not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if already in pantry
    existing_item = Pantry.objects.filter(user=request.user, ingredient=ingredient).first()
    
    if existing_item:
        # Update quantity if item exists
        if quantity is not None:
            existing_item.quantity = quantity
            existing_item.save()
            serializer = PantrySerializer(existing_item)
            return Response({
                'message': f'{ingredient.name} quantity updated in pantry',
                'pantry_item': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': f'{ingredient.name} is already in your pantry',
                'pantry_item': PantrySerializer(existing_item).data
            }, status=status.HTTP_200_OK)
    
    # Create new pantry item
    pantry_item = Pantry.objects.create(
        user=request.user,
        ingredient=ingredient,
        quantity=quantity
    )
    
    serializer = PantrySerializer(pantry_item)
    
    return Response({
        'message': f'{ingredient.name} added to pantry',
        'pantry_item': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pantry_add_multiple(request):
    """
    Add multiple ingredients to the user's pantry at once
    
    POST /api/pantry/add-multiple/
    {
        "ingredients": [
            {"ingredient_id": 1, "quantity": 500},
            {"ingredient_id": 2, "quantity": 3},
            {"ingredient_id": 3}
        ]
    }
    """
    ingredients_data = request.data.get('ingredients', [])
    
    if not ingredients_data:
        return Response({
            'message': 'Please provide ingredients list',
            'example': {
                'ingredients': [
                    {'ingredient_id': 1, 'quantity': 500},
                    {'ingredient_id': 2, 'quantity': 3}
                ]
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    added = []
    updated = []
    errors = []
    
    for item_data in ingredients_data:
        ingredient_id = item_data.get('ingredient_id')
        quantity = item_data.get('quantity', None)
        
        if not ingredient_id:
            errors.append({'error': 'Missing ingredient_id', 'data': item_data})
            continue
        
        try:
            ingredient = Ingredient.objects.get(pk=ingredient_id)
        except Ingredient.DoesNotExist:
            errors.append({'error': f'Ingredient {ingredient_id} not found', 'data': item_data})
            continue
        
        # Check if already in pantry
        existing_item = Pantry.objects.filter(user=request.user, ingredient=ingredient).first()
        
        if existing_item:
            if quantity is not None:
                existing_item.quantity = quantity
                existing_item.save()
            updated.append({
                'id': existing_item.id,
                'ingredient': ingredient.name,
                'quantity': existing_item.quantity
            })
        else:
            pantry_item = Pantry.objects.create(
                user=request.user,
                ingredient=ingredient,
                quantity=quantity
            )
            added.append({
                'id': pantry_item.id,
                'ingredient': ingredient.name,
                'quantity': pantry_item.quantity
            })
    
    return Response({
        'message': 'Bulk pantry update completed',
        'added_count': len(added),
        'updated_count': len(updated),
        'error_count': len(errors),
        'added': added,
        'updated': updated,
        'errors': errors
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_detail(request, pk):
    """
    Get a single pantry item by ID
    
    GET /api/pantry/1/
    """
    try:
        pantry_item = Pantry.objects.get(pk=pk, user=request.user)
    except Pantry.DoesNotExist:
        return Response({
            'message': 'Pantry item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = PantrySerializer(pantry_item)
    
    return Response({
        'pantry_item': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def pantry_update(request, pk):
    """
    Update quantity of a pantry item
    
    PUT /api/pantry/1/update/
    {
        "quantity": 250
    }
    """
    try:
        pantry_item = Pantry.objects.get(pk=pk, user=request.user)
    except Pantry.DoesNotExist:
        return Response({
            'message': 'Pantry item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    quantity = request.data.get('quantity')
    
    if quantity is not None:
        pantry_item.quantity = quantity
        pantry_item.save()
    
    serializer = PantrySerializer(pantry_item)
    
    return Response({
        'message': 'Pantry item updated successfully',
        'pantry_item': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def pantry_remove(request, pk):
    """
    Remove an ingredient from the user's pantry
    
    DELETE /api/pantry/1/remove/
    """
    try:
        pantry_item = Pantry.objects.get(pk=pk, user=request.user)
    except Pantry.DoesNotExist:
        return Response({
            'message': 'Pantry item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    ingredient_name = pantry_item.ingredient.name
    pantry_item.delete()
    
    return Response({
        'message': f'{ingredient_name} removed from pantry'
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def pantry_clear(request):
    """
    Clear all ingredients from the user's pantry
    
    DELETE /api/pantry/clear/
    """
    pantry_items = Pantry.objects.filter(user=request.user)
    count = pantry_items.count()
    
    if count == 0:
        return Response({
            'message': 'Your pantry is already empty',
            'deleted_count': 0
        }, status=status.HTTP_200_OK)
    
    pantry_items.delete()
    
    return Response({
        'message': 'Pantry cleared successfully',
        'deleted_count': count
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_check_ingredient(request, ingredient_id):
    """
    Check if a specific ingredient is in the user's pantry
    
    GET /api/pantry/check/1/
    """
    try:
        ingredient = Ingredient.objects.get(pk=ingredient_id)
    except Ingredient.DoesNotExist:
        return Response({
            'message': 'Ingredient not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    pantry_item = Pantry.objects.filter(user=request.user, ingredient=ingredient).first()
    
    if pantry_item:
        return Response({
            'in_pantry': True,
            'ingredient': IngredientSerializer(ingredient).data,
            'quantity': pantry_item.quantity,
            'added_at': pantry_item.added_at
        }, status=status.HTTP_200_OK)
    
    return Response({
        'in_pantry': False,
        'ingredient': IngredientSerializer(ingredient).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_ingredient_ids(request):
    """
    Get just the ingredient IDs from user's pantry.
    Useful for quick matching operations.
    
    GET /api/pantry/ingredient-ids/
    """
    pantry_items = Pantry.objects.filter(user=request.user)
    ingredient_ids = list(pantry_items.values_list('ingredient_id', flat=True))
    
    return Response({
        'count': len(ingredient_ids),
        'ingredient_ids': ingredient_ids
    }, status=status.HTTP_200_OK)