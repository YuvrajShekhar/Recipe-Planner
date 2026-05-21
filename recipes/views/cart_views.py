from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import ShoppingCartItem
from ..serializers import ShoppingCartItemSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def cart_item_list(request):
    if request.method == 'GET':
        items = ShoppingCartItem.objects.filter(user=request.user)
        return Response({'items': ShoppingCartItemSerializer(items, many=True).data})

    name = request.data.get('name', '').strip()
    if not name:
        return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)

    item = ShoppingCartItem.objects.create(
        user=request.user,
        name=name,
        note=request.data.get('note', '').strip(),
    )
    return Response(ShoppingCartItemSerializer(item).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def cart_item_detail(request, pk):
    try:
        item = ShoppingCartItem.objects.get(pk=pk, user=request.user)
    except ShoppingCartItem.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH — allow toggling is_checked or updating name/note
    for field in ('name', 'note', 'is_checked'):
        if field in request.data:
            setattr(item, field, request.data[field])
    item.save()
    return Response(ShoppingCartItemSerializer(item).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cart_clear_checked(request):
    deleted, _ = ShoppingCartItem.objects.filter(user=request.user, is_checked=True).delete()
    return Response({'deleted': deleted})
