from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import FridgeItem, Recipe, Pantry, IngredientNutrition, DailyNutritionLog
from ..serializers import FridgeItemSerializer


# ── Helpers ─────────────────────────────────────────────────────────────────

def _calculate_per_serving_nutrition(recipe):
    """
    Return a dict with per-serving nutrition for a recipe.
    Uses same logic as recipe_nutrition view. Returns zeros when data is missing.
    """
    total_calories = Decimal('0')
    total_protein  = Decimal('0')
    total_carbs    = Decimal('0')
    total_fat      = Decimal('0')
    total_fiber    = Decimal('0')

    for ri in recipe.recipe_ingredients.select_related('ingredient__nutrition'):
        try:
            nutrition = ri.ingredient.nutrition
        except IngredientNutrition.DoesNotExist:
            continue

        if nutrition.unit_type == 'per_unit':
            m = Decimal(str(ri.quantity))
            total_calories += (nutrition.calories_per_unit or Decimal('0')) * m
            total_protein  += (nutrition.protein_per_unit  or Decimal('0')) * m
            total_carbs    += (nutrition.carbs_per_unit    or Decimal('0')) * m
            total_fat      += (nutrition.fat_per_unit      or Decimal('0')) * m
            total_fiber    += (nutrition.fiber_per_unit    or Decimal('0')) * m
        else:
            grams = _to_grams(ri, nutrition)
            if grams:
                m = grams / Decimal('100')
                total_calories += (nutrition.calories_per_100g or Decimal('0')) * m
                total_protein  += (nutrition.protein_per_100g  or Decimal('0')) * m
                total_carbs    += (nutrition.carbs_per_100g    or Decimal('0')) * m
                total_fat      += (nutrition.fat_per_100g      or Decimal('0')) * m
                total_fiber    += (nutrition.fiber_per_100g    or Decimal('0')) * m

    servings = Decimal(str(recipe.servings or 1))
    return {
        'calories': total_calories / servings,
        'protein':  total_protein  / servings,
        'carbs':    total_carbs    / servings,
        'fat':      total_fat      / servings,
        'fiber':    total_fiber    / servings,
    }


def _to_grams(recipe_ingredient, nutrition):
    """Minimal unit → grams converter (mirrors nutrition_views._convert_to_grams)."""
    qty  = Decimal(str(recipe_ingredient.quantity))
    unit = recipe_ingredient.unit.lower().strip()

    if unit in ('g', 'gram', 'grams'):
        return qty
    if unit in ('kg', 'kilogram', 'kilograms'):
        return qty * 1000
    if unit in ('piece', 'pieces', 'pcs', 'pc', 'whole', 'unit', 'units'):
        if nutrition.gram_equivalent_per_piece:
            return qty * nutrition.gram_equivalent_per_piece
    if unit in ('cup', 'cups'):
        if nutrition.gram_equivalent_per_cup:
            return qty * nutrition.gram_equivalent_per_cup
    if unit in ('tbsp', 'tablespoon', 'tablespoons'):
        if nutrition.gram_equivalent_per_tbsp:
            return qty * nutrition.gram_equivalent_per_tbsp
    if unit in ('tsp', 'teaspoon', 'teaspoons'):
        if nutrition.gram_equivalent_per_tsp:
            return qty * nutrition.gram_equivalent_per_tsp
    if unit in ('ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'):
        return qty  # 1 ml ≈ 1 g for most liquids
    if unit in ('l', 'liter', 'liters', 'litre', 'litres'):
        return qty * 1000
    return None


# ── Views ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fridge_list(request):
    """GET /api/fridge/ — list all fridge items for the current user."""
    items = FridgeItem.objects.filter(user=request.user).select_related('recipe')
    serializer = FridgeItemSerializer(items, many=True, context={'request': request})
    return Response({'fridge_items': serializer.data, 'count': items.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cook_recipe(request):
    """
    POST /api/fridge/cook/
    Body: { recipe_id, portions, force (bool, default false) }

    1. Scale recipe ingredients to the requested portions.
    2. Check pantry for each ingredient.
    3. If all available (or force=true): deduct from pantry, add to fridge.
    4. If missing and force=false: return 400 with missing list.
    """
    recipe_id = request.data.get('recipe_id')
    portions  = request.data.get('portions')
    force     = request.data.get('force', False)

    if not recipe_id or not portions:
        return Response({'error': 'recipe_id and portions are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        portions = Decimal(str(portions))
        if portions <= 0:
            raise ValueError
    except (ValueError, Exception):
        return Response({'error': 'portions must be a positive number.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        recipe = Recipe.objects.prefetch_related('recipe_ingredients__ingredient').get(pk=recipe_id)
    except Recipe.DoesNotExist:
        return Response({'error': 'Recipe not found.'}, status=status.HTTP_404_NOT_FOUND)

    recipe_servings = Decimal(str(recipe.servings or 1))
    scale = portions / recipe_servings  # scale factor relative to recipe's default servings

    # Build pantry map: ingredient_id → Pantry item
    pantry_map = {
        p.ingredient_id: p
        for p in Pantry.objects.filter(user=request.user)
    }

    missing = []
    sufficient = True

    for ri in recipe.recipe_ingredients.all():
        needed = ri.quantity * scale
        pantry_item = pantry_map.get(ri.ingredient_id)

        if pantry_item is None or pantry_item.quantity is None:
            missing.append({
                'ingredient': ri.ingredient.name,
                'needed': float(round(needed, 2)),
                'unit': ri.unit,
                'available': 0,
            })
            sufficient = False
        elif pantry_item.quantity < needed:
            missing.append({
                'ingredient': ri.ingredient.name,
                'needed': float(round(needed, 2)),
                'unit': ri.unit,
                'available': float(pantry_item.quantity),
            })
            sufficient = False

    if not sufficient and not force:
        return Response({
            'error': 'Not enough ingredients in pantry.',
            'missing': missing,
        }, status=status.HTTP_400_BAD_REQUEST)

    # Deduct ingredients from pantry (deduct what's available when forcing)
    for ri in recipe.recipe_ingredients.all():
        needed = ri.quantity * scale
        pantry_item = pantry_map.get(ri.ingredient_id)
        if pantry_item is None or pantry_item.quantity is None:
            continue  # nothing to deduct
        deduct = min(pantry_item.quantity, needed)
        new_qty = pantry_item.quantity - deduct
        if new_qty <= 0:
            pantry_item.delete()
        else:
            pantry_item.quantity = new_qty
            pantry_item.save(update_fields=['quantity'])

    # Add to fridge
    fridge_item = FridgeItem.objects.create(
        user=request.user,
        recipe=recipe,
        portions=portions,
    )

    serializer = FridgeItemSerializer(fridge_item, context={'request': request})
    return Response({
        'message': f'{recipe.title} cooked! {portions} portion(s) added to your fridge.',
        'fridge_item': serializer.data,
        'missing_used_partially': missing if force and missing else [],
    }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def fridge_item_detail(request, pk):
    """
    GET  /api/fridge/<pk>/ — retrieve a single fridge item
    DELETE /api/fridge/<pk>/ — delete (throw away) a fridge item
    """
    try:
        item = FridgeItem.objects.select_related('recipe').get(pk=pk, user=request.user)
    except FridgeItem.DoesNotExist:
        return Response({'error': 'Fridge item not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        item.delete()
        return Response({'message': 'Fridge item deleted.'}, status=status.HTTP_204_NO_CONTENT)

    serializer = FridgeItemSerializer(item, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def consume_from_fridge(request):
    """
    POST /api/fridge/consume/
    Body: { fridge_item_id, portions_consumed, date, notes (optional) }

    Logs a DailyNutritionLog entry for the consumed portions and
    reduces the fridge item's remaining portions (deletes if 0).
    """
    fridge_item_id    = request.data.get('fridge_item_id')
    portions_consumed = request.data.get('portions_consumed')
    date              = request.data.get('date')
    notes             = request.data.get('notes', '')

    if not fridge_item_id or not portions_consumed or not date:
        return Response(
            {'error': 'fridge_item_id, portions_consumed, and date are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        portions_consumed = Decimal(str(portions_consumed))
        if portions_consumed <= 0:
            raise ValueError
    except (ValueError, Exception):
        return Response({'error': 'portions_consumed must be a positive number.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        fridge_item = FridgeItem.objects.select_related('recipe').get(
            pk=fridge_item_id, user=request.user
        )
    except FridgeItem.DoesNotExist:
        return Response({'error': 'Fridge item not found.'}, status=status.HTTP_404_NOT_FOUND)

    if portions_consumed > fridge_item.portions:
        return Response(
            {'error': f'Only {fridge_item.portions} portion(s) available in fridge.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Calculate nutrition for the consumed portions
    per_serving = _calculate_per_serving_nutrition(fridge_item.recipe)
    log = DailyNutritionLog.objects.create(
        user=request.user,
        date=date,
        dish_name=f"{fridge_item.recipe.title} (from fridge)",
        calories=round(per_serving['calories'] * portions_consumed, 2),
        protein=round(per_serving['protein']  * portions_consumed, 2),
        carbs=round(per_serving['carbs']      * portions_consumed, 2),
        fat=round(per_serving['fat']          * portions_consumed, 2),
        fiber=round(per_serving['fiber']      * portions_consumed, 2),
        notes=notes,
    )

    # Deduct from fridge
    remaining = fridge_item.portions - portions_consumed
    if remaining <= 0:
        fridge_item.delete()
        remaining = Decimal('0')
    else:
        fridge_item.portions = remaining
        fridge_item.save(update_fields=['portions'])

    return Response({
        'message': f'Logged {portions_consumed} portion(s) of {fridge_item.recipe.title}.',
        'log_id': log.id,
        'remaining_portions': float(remaining),
    }, status=status.HTTP_201_CREATED)
