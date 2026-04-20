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
    recipe_toggle_public,
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

from .nutrition_views import (
    ingredient_nutrition_list,
    ingredient_nutrition_detail,
    ingredient_nutrition_create,
    ingredient_nutrition_update,
    ingredient_nutrition_delete,
    recipe_nutrition,
)

from .health_views import (
    nutrition_log_list,
    nutrition_log_detail,
    nutrition_daily_summary,
    nutrition_monthly_summary,
)

from .fitness_views import (
    fitness_log_list,
    fitness_log_detail,
    fitness_daily,
    fitness_monthly_summary,
    setup_fitbit,
    sync_fitbit_steps,
)

from .activity_views import (
    activity_log_list,
    activity_log_detail,
    activity_daily_summary,
)

from .upload_views import upload_recipe_image

from .food_views import (
    food_item_list,
    food_item_create,
    food_item_detail,
    food_pantry_list,
    food_pantry_add,
    food_pantry_detail,
    food_pantry_consume,
)

from .fridge_views import (
    fridge_list,
    fridge_item_detail,
    cook_recipe,
    consume_from_fridge,
)