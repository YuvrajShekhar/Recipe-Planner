import os
import uuid
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_SIZE_MB = 5


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def upload_recipe_image(request):
    """
    POST /api/upload/image/
    Accepts a single image file (jpg/png, max 5 MB).
    Returns { url: '/media/recipe_images/<filename>' }
    """
    file = request.FILES.get('image')
    if not file:
        return Response({'error': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return Response(
            {'error': 'Only JPG and PNG images are allowed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if file.size > MAX_SIZE_MB * 1024 * 1024:
        return Response(
            {'error': f'Image must be under {MAX_SIZE_MB} MB.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save to MEDIA_ROOT/recipe_images/ with a unique filename
    save_dir = os.path.join(settings.MEDIA_ROOT, 'recipe_images')
    os.makedirs(save_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(save_dir, filename)

    with open(filepath, 'wb') as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    url = f"{settings.MEDIA_URL}recipe_images/{filename}"
    return Response({'url': url}, status=status.HTTP_201_CREATED)
