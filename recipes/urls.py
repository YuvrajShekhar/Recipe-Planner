from django.urls import path
from . import views

urlpatterns = [
    # API Root
    path('', views.api_root, name='api-root'),
    
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/profile/', views.user_profile, name='profile'),
    
    # Ingredient endpoints
    path('ingredients/', views.ingredient_list, name='ingredient-list'),
    path('ingredients/categories/', views.ingredient_categories, name='ingredient-categories'),
    path('ingredients/create/', views.ingredient_create, name='ingredient-create'),
    path('ingredients/<int:pk>/', views.ingredient_detail, name='ingredient-detail'),
    
    # Recipe endpoints
    path('recipes/', views.recipe_list, name='recipe-list'),
    path('recipes/create/', views.recipe_create, name='recipe-create'),
    path('recipes/my-recipes/', views.my_recipes, name='my-recipes'),
    path('recipes/user/<int:user_id>/', views.recipe_by_user, name='recipe-by-user'),
    path('recipes/<int:pk>/', views.recipe_detail, name='recipe-detail'),
    path('recipes/<int:pk>/update/', views.recipe_update, name='recipe-update'),
    path('recipes/<int:pk>/delete/', views.recipe_delete, name='recipe-delete'),
    
    # Ingredient Matching endpoints (Core Feature)
    path('recipes/match/', views.match_recipes_by_ingredients, name='match-recipes'),
    path('recipes/match/pantry/', views.match_recipes_from_pantry, name='match-from-pantry'),
    path('recipes/match/complete/', views.find_recipes_by_available_ingredients, name='match-complete'),
    path('recipes/match/almost/', views.find_recipes_missing_few_ingredients, name='match-almost'),
    
    # Pantry endpoints
    path('pantry/', views.pantry_list, name='pantry-list'),
    path('pantry/add/', views.pantry_add, name='pantry-add'),
    path('pantry/add-multiple/', views.pantry_add_multiple, name='pantry-add-multiple'),
    path('pantry/clear/', views.pantry_clear, name='pantry-clear'),
    path('pantry/ingredient-ids/', views.pantry_ingredient_ids, name='pantry-ingredient-ids'),
    path('pantry/check/<int:ingredient_id>/', views.pantry_check_ingredient, name='pantry-check'),
    path('pantry/<int:pk>/', views.pantry_detail, name='pantry-detail'),
    path('pantry/<int:pk>/update/', views.pantry_update, name='pantry-update'),
    path('pantry/<int:pk>/remove/', views.pantry_remove, name='pantry-remove'),
    
    # Favorites endpoints
    path('favorites/', views.favorite_list, name='favorite-list'),
    path('favorites/add/', views.favorite_add, name='favorite-add'),
    path('favorites/toggle/', views.favorite_toggle, name='favorite-toggle'),
    path('favorites/clear/', views.favorite_clear, name='favorite-clear'),
    path('favorites/recipe-ids/', views.favorite_recipe_ids, name='favorite-recipe-ids'),
    path('favorites/with-pantry-match/', views.favorites_with_pantry_match, name='favorites-with-pantry'),
    path('favorites/check/<int:recipe_id>/', views.favorite_check, name='favorite-check'),
    path('favorites/recipe/<int:recipe_id>/remove/', views.favorite_remove_by_recipe, name='favorite-remove-by-recipe'),
    path('favorites/<int:pk>/', views.favorite_detail, name='favorite-detail'),
    path('favorites/<int:pk>/remove/', views.favorite_remove, name='favorite-remove'),
]