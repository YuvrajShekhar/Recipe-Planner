from .auth_views import (
    api_root,
    register_user,
    login_user,
    logout_user,
    user_profile,
)

from .ingredient_views import (
    ingredient_list,
    ingredient_detail,
    ingredient_create,
    ingredient_categories,
)

from .recipe_views import (
    recipe_list,
    recipe_detail,
    recipe_create,
    recipe_update,
    recipe_delete,
    recipe_by_user,
    my_recipes,
)

from .matching_views import (
    match_recipes_by_ingredients,
    match_recipes_from_pantry,
    find_recipes_by_available_ingredients,
    find_recipes_missing_few_ingredients,
)

from .pantry_views import (
    pantry_list,
    pantry_add,
    pantry_add_multiple,
    pantry_detail,
    pantry_update,
    pantry_remove,
    pantry_clear,
    pantry_check_ingredient,
    pantry_ingredient_ids,
)

from .favorite_views import (
    favorite_list,
    favorite_add,
    favorite_toggle,
    favorite_remove,
    favorite_remove_by_recipe,
    favorite_check,
    favorite_recipe_ids,
    favorite_clear,
    favorite_detail,
    favorites_with_pantry_match,
)