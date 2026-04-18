from decimal import Decimal
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import FoodItem, FoodPantry, DailyNutritionLog
from ..serializers import FoodItemSerializer, FoodPantrySerializer


# ── Food Items ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def food_item_list(request):
    """
    GET /api/foods/
    Returns all food items created by this user plus any with a barcode
    (globally shared scanned items).
    """
    items = FoodItem.objects.filter(created_by=request.user)

    search = request.query_params.get('search', '').strip()
    if search:
        items = items.filter(name__icontains=search)

    serializer = FoodItemSerializer(items, many=True)
    return Response({'food_items': serializer.data, 'count': items.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def food_item_create(request):
    """
    POST /api/foods/create/
    Body: { name, brand?, barcode?, category?, serving_description?,
            calories, protein, carbs, fat, fiber, thumbnail_url?,
            quantity? }          ← quantity goes into FoodPantry

    If a barcode is provided and already exists for this user, returns the
    existing item. Otherwise creates a new FoodItem.
    Optionally adds it straight to the user's food pantry if `quantity` is given.
    """
    barcode  = request.data.get('barcode', '').strip()
    quantity = request.data.get('quantity')

    # Re-use existing item for the same barcode (per user)
    if barcode:
        existing = FoodItem.objects.filter(barcode=barcode, created_by=request.user).first()
        if existing:
            if quantity:
                _upsert_pantry(request.user, existing, quantity)
            return Response({
                'food_item': FoodItemSerializer(existing).data,
                'created': False,
            }, status=status.HTTP_200_OK)

    data = {
        'name':                request.data.get('name', '').strip(),
        'brand':               request.data.get('brand', '').strip(),
        'barcode':             barcode,
        'category':            request.data.get('category', 'other'),
        'serving_description': request.data.get('serving_description', '1 serving'),
        'calories':            round(float(request.data.get('calories', 0) or 0), 2),
        'protein':             round(float(request.data.get('protein',  0) or 0), 2),
        'carbs':               round(float(request.data.get('carbs',    0) or 0), 2),
        'fat':                 round(float(request.data.get('fat',      0) or 0), 2),
        'fiber':               round(float(request.data.get('fiber',    0) or 0), 2),
        'thumbnail_url':       request.data.get('thumbnail_url', ''),
    }

    if not data['name']:
        return Response({'error': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = FoodItemSerializer(data=data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    food_item = serializer.save(created_by=request.user)

    if quantity:
        _upsert_pantry(request.user, food_item, quantity)

    return Response({'food_item': FoodItemSerializer(food_item).data, 'created': True},
                    status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def food_item_detail(request, pk):
    """GET / PUT / DELETE a single food item owned by the user."""
    try:
        item = FoodItem.objects.get(pk=pk, created_by=request.user)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Food item not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        item.delete()
        return Response({'message': 'Food item deleted.'}, status=status.HTTP_204_NO_CONTENT)

    if request.method == 'PUT':
        serializer = FoodItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'food_item': serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({'food_item': FoodItemSerializer(item).data})


# ── Food Pantry ───────────────────────────────────────────────────────────────

def _upsert_pantry(user, food_item, quantity):
    """Add to or update quantity in user's food pantry."""
    qty = Decimal(str(quantity))
    pantry, created = FoodPantry.objects.get_or_create(
        user=user, food_item=food_item,
        defaults={'quantity': qty},
    )
    if not created:
        pantry.quantity += qty
        pantry.save(update_fields=['quantity', 'updated_at'])
    return pantry


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def food_pantry_list(request):
    """GET /api/food-pantry/ — list user's food pantry items."""
    pantry = FoodPantry.objects.filter(user=request.user).select_related('food_item')
    serializer = FoodPantrySerializer(pantry, many=True)
    return Response({'pantry': serializer.data, 'count': pantry.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def food_pantry_add(request):
    """
    POST /api/food-pantry/add/
    Body: { food_item_id, quantity }
    Upserts (adds to existing quantity if entry exists).
    """
    food_item_id = request.data.get('food_item_id')
    quantity     = request.data.get('quantity')

    if not food_item_id or quantity is None:
        return Response({'error': 'food_item_id and quantity are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        food_item = FoodItem.objects.get(pk=food_item_id, created_by=request.user)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Food item not found.'}, status=status.HTTP_404_NOT_FOUND)

    pantry = _upsert_pantry(request.user, food_item, quantity)
    return Response({'pantry_item': FoodPantrySerializer(pantry).data},
                    status=status.HTTP_200_OK)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def food_pantry_detail(request, pk):
    """
    PUT  /api/food-pantry/<pk>/  — set absolute quantity
    DELETE /api/food-pantry/<pk>/ — remove from pantry
    """
    try:
        pantry = FoodPantry.objects.select_related('food_item').get(pk=pk, user=request.user)
    except FoodPantry.DoesNotExist:
        return Response({'error': 'Pantry item not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        pantry.delete()
        return Response({'message': 'Removed from food pantry.'}, status=status.HTTP_204_NO_CONTENT)

    quantity = request.data.get('quantity')
    if quantity is None:
        return Response({'error': 'quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

    pantry.quantity = Decimal(str(quantity))
    pantry.save(update_fields=['quantity', 'updated_at'])
    return Response({'pantry_item': FoodPantrySerializer(pantry).data})


# ── Log from Food Items → Health ──────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def food_pantry_consume(request):
    """
    POST /api/food-pantry/consume/
    Body: { food_item_id, servings_consumed, date, notes? }

    Creates a DailyNutritionLog entry.
    Deducts from food pantry when stock exists — deducts all available if consuming
    more than in stock, never errors on over-stock or missing stock.
    """
    food_item_id      = request.data.get('food_item_id')
    servings_consumed = request.data.get('servings_consumed')
    date              = request.data.get('date')
    notes             = request.data.get('notes', '')

    if not all([food_item_id, servings_consumed, date]):
        return Response({'error': 'food_item_id, servings_consumed, and date are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        servings_consumed = Decimal(str(servings_consumed))
        if servings_consumed <= 0:
            raise ValueError
    except (ValueError, Exception):
        return Response({'error': 'servings_consumed must be a positive number.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        fi = FoodItem.objects.get(pk=food_item_id, created_by=request.user)
    except FoodItem.DoesNotExist:
        return Response({'error': 'Food item not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Log the entry regardless of stock
    log = DailyNutritionLog.objects.create(
        user=request.user,
        date=date,
        dish_name=f"{fi.name}" + (f" ({fi.brand})" if fi.brand else ''),
        calories=round(fi.calories * servings_consumed, 2),
        protein= round(fi.protein  * servings_consumed, 2),
        carbs=   round(fi.carbs    * servings_consumed, 2),
        fat=     round(fi.fat      * servings_consumed, 2),
        fiber=   round(fi.fiber    * servings_consumed, 2),
        notes=notes,
    )

    # Deduct from stock — take all available if consuming more than in stock
    pantry = FoodPantry.objects.filter(user=request.user, food_item=fi).first()
    remaining = Decimal('0')
    if pantry:
        deduct = min(pantry.quantity, servings_consumed)
        remaining = pantry.quantity - deduct
        if remaining <= 0:
            pantry.delete()
        else:
            pantry.quantity = remaining
            pantry.save(update_fields=['quantity', 'updated_at'])

    return Response({
        'message': f'Logged {servings_consumed} serving(s) of {fi.name}.',
        'log_id': log.id,
        'remaining': float(remaining),
    }, status=status.HTTP_201_CREATED)
