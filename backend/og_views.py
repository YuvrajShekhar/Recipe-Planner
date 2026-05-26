import base64 as b64_module
from html import escape
from django.http import HttpResponse, Http404
from django.shortcuts import redirect
from django.conf import settings
from recipes.models import Recipe


def recipe_image(request, recipe_id):
    """Serve a recipe's image as actual image bytes so og:image works with WhatsApp."""
    try:
        recipe = Recipe.objects.only('image_url', 'thumbnail_url').get(
            pk=recipe_id, is_public=True
        )
    except Recipe.DoesNotExist:
        raise Http404

    image_data = (recipe.image_url or recipe.thumbnail_url or '').strip()
    if not image_data:
        raise Http404

    if image_data.startswith('data:image/'):
        # Stored as base64 data URL — decode and serve as image bytes
        try:
            header, b64_data = image_data.split(',', 1)
            mime = header.split(';')[0].split(':')[1]  # e.g. image/jpeg
            image_bytes = b64_module.b64decode(b64_data)
        except Exception:
            raise Http404
        response = HttpResponse(image_bytes, content_type=mime)
        response['Cache-Control'] = 'public, max-age=86400'
        return response

    # Already a real HTTP URL — redirect to it
    return redirect(image_data)


def recipe_og_redirect(request, recipe_id):
    try:
        recipe = Recipe.objects.select_related('created_by').get(pk=recipe_id, is_public=True)
    except Recipe.DoesNotExist:
        raise Http404

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    recipe_url = f"{frontend_url}/recipes/{recipe_id}"

    has_image = bool((recipe.image_url or recipe.thumbnail_url or '').strip())
    image_endpoint = request.build_absolute_uri(f'/og/recipe-image/{recipe_id}/') if has_image else ''

    title = escape(recipe.title or 'Recipe')
    author = escape(recipe.created_by.username if recipe.created_by else '')
    parts = []
    if author:
        parts.append(f"By {author}")
    if recipe.total_time:
        parts.append(f"{recipe.total_time} min")
    if recipe.servings:
        parts.append(f"Serves {recipe.servings}")
    description = escape(' • '.join(parts)) if parts else escape(recipe.title or '')

    og_image_tag = f'<meta property="og:image" content="{escape(image_endpoint)}">' if image_endpoint else ''
    tw_image_tag = f'<meta name="twitter:image" content="{escape(image_endpoint)}">' if image_endpoint else ''

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{escape(recipe_url)}">
  <meta property="og:site_name" content="FreshPlate">
  {og_image_tag}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  {tw_image_tag}
  <meta http-equiv="refresh" content="0; url={escape(recipe_url)}">
  <title>{title} - FreshPlate</title>
</head>
<body>
  <script>window.location.replace("{escape(recipe_url)}")</script>
  <p>Redirecting to <a href="{escape(recipe_url)}">{title}</a>...</p>
</body>
</html>"""

    return HttpResponse(html, content_type='text/html; charset=utf-8')
