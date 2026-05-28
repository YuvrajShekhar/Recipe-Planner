from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import F, Q
from ..models import Pantry, Ingredient, Recipe
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
    unit     = request.data.get('unit', '').strip()

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
        # Update quantity (and unit) if item exists
        if quantity is not None:
            existing_item.quantity = quantity
        if unit:
            existing_item.unit = unit
        if quantity is not None or unit:
            existing_item.save()
        serializer = PantrySerializer(existing_item)
        return Response({
            'message': f'{ingredient.name} updated in pantry',
            'pantry_item': serializer.data
        }, status=status.HTTP_200_OK)

    # Create new pantry item
    pantry_item = Pantry.objects.create(
        user=request.user,
        ingredient=ingredient,
        quantity=quantity,
        unit=unit,
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
        quantity      = item_data.get('quantity', None)
        unit          = item_data.get('unit', '').strip()

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
            if unit:
                existing_item.unit = unit
            if quantity is not None or unit:
                existing_item.save()
            updated.append({
                'id': existing_item.id,
                'ingredient': ingredient.name,
                'quantity': existing_item.quantity,
                'unit': existing_item.unit,
            })
        else:
            pantry_item = Pantry.objects.create(
                user=request.user,
                ingredient=ingredient,
                quantity=quantity,
                unit=unit,
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
    
    quantity            = request.data.get('quantity')
    unit                = request.data.get('unit', None)
    low_stock_threshold = request.data.get('low_stock_threshold', None)
    low_stock_unit      = request.data.get('low_stock_unit', None)

    if quantity is not None:
        pantry_item.quantity = quantity
    if unit is not None:
        pantry_item.unit = unit.strip()
    if low_stock_threshold is not None:
        pantry_item.low_stock_threshold = low_stock_threshold if low_stock_threshold != '' else None
    if low_stock_unit is not None:
        pantry_item.low_stock_unit = low_stock_unit.strip()
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_low_stock(request):
    """
    Return pantry items that are below their low-stock alert threshold.

    GET /api/pantry/low-stock/
    """
    items = Pantry.objects.filter(
        user=request.user,
        low_stock_threshold__isnull=False,
    ).filter(
        Q(quantity__isnull=True) | Q(quantity__lt=F('low_stock_threshold'))
    ).select_related('ingredient')

    serializer = PantrySerializer(items, many=True)
    return Response({
        'count': items.count(),
        'pantry_items': serializer.data,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pantry_check_recipe(request):
    """
    Check how much of a recipe's ingredients the user already has in their pantry.

    GET /api/pantry/check-recipe/?recipe_id=<id>&servings=<n>

    Returns each ingredient with: required quantity (scaled), available, missing.
    """
    recipe_id = request.query_params.get('recipe_id')
    servings_raw = request.query_params.get('servings', None)

    if not recipe_id:
        return Response({'error': 'recipe_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        recipe = Recipe.objects.prefetch_related(
            'recipe_ingredients__ingredient'
        ).get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({'error': 'Recipe not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        desired_servings = float(servings_raw) if servings_raw else float(recipe.servings or 1)
        if desired_servings <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'servings must be a positive number'}, status=status.HTTP_400_BAD_REQUEST)

    recipe_servings = float(recipe.servings or 1)
    scale = desired_servings / recipe_servings

    # Build pantry lookup: ingredient_id → quantity
    pantry_items = Pantry.objects.filter(user=request.user).select_related('ingredient')
    pantry_map = {p.ingredient_id: float(p.quantity or 0) for p in pantry_items}

    ingredients = []
    missing_count = 0

    for ri in recipe.recipe_ingredients.all():
        required = round(float(ri.quantity or 0) * scale, 3)
        available = pantry_map.get(ri.ingredient_id, 0)
        missing = round(max(0.0, required - available), 3)
        sufficient = missing == 0

        if not sufficient:
            missing_count += 1

        # Format numbers: drop trailing zeros
        def fmt(n):
            s = f'{n:.3f}'.rstrip('0').rstrip('.')
            return s if s else '0'

        ingredients.append({
            'ingredient_id': ri.ingredient_id,
            'name': ri.ingredient.name,
            'unit': ri.unit or ri.ingredient.unit or '',
            'required': fmt(required),
            'available': fmt(available),
            'missing': fmt(missing),
            'sufficient': sufficient,
            'in_pantry': ri.ingredient_id in pantry_map,
        })

    # Sort: missing items first, then sufficient
    ingredients.sort(key=lambda x: (x['sufficient'], x['name']))

    return Response({
        'recipe': {
            'id': recipe.id,
            'title': recipe.title,
            'servings': recipe.servings,
        },
        'desired_servings': desired_servings,
        'ingredients': ingredients,
        'total_ingredients': len(ingredients),
        'missing_count': missing_count,
        'all_sufficient': missing_count == 0,
    })
