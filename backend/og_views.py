from html import escape
from django.http import HttpResponse, Http404
from django.conf import settings
from recipes.models import Recipe


def recipe_og_redirect(request, recipe_id):
    try:
        recipe = Recipe.objects.select_related('created_by').get(pk=recipe_id, is_public=True)
    except Recipe.DoesNotExist:
        raise Http404

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    recipe_url = f"{frontend_url}/recipes/{recipe_id}"

    image_url = (recipe.image_url or recipe.thumbnail_url or '').strip()
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

    og_image_tag = f'<meta property="og:image" content="{escape(image_url)}">' if image_url else ''
    tw_image_tag = f'<meta name="twitter:image" content="{escape(image_url)}">' if image_url else ''

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
