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