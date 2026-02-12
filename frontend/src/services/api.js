import axios from 'axios';

// Create axios instance with base configuration
const API = axios.create({
    baseURL: 'https://recipe-planner-production.up.railway.app/api',
    timeout: 10000,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// ==================== AUTH APIs ====================

export const authAPI = {
    register: (userData) => API.post('/auth/register/', userData),
    login: (credentials) => API.post('/auth/login/', credentials),
    logout: () => API.post('/auth/logout/'),
    getProfile: () => API.get('/auth/profile/'),
    updateProfile: (data) => API.put('/auth/profile/', data),
};

// ==================== INGREDIENT APIs ====================

export const ingredientAPI = {
    getAll: (params) => API.get('/ingredients/', { params }),
    getById: (id) => API.get(`/ingredients/${id}/`),
    getCategories: () => API.get('/ingredients/categories/'),
    create: (data) => API.post('/ingredients/create/', data),
    search: (query) => API.get('/ingredients/', { params: { search: query } }),
};

// ==================== RECIPE APIs ====================

export const recipeAPI = {
    getAll: (params = {}) => {
        // Convert limit to the API format if needed
        const apiParams = { ...params };
        return API.get('/recipes/', { params: apiParams });
    },
    getById: (id) => API.get(`/recipes/${id}/`),
    create: (data) => API.post('/recipes/create/', data),
    update: (id, data) => API.put(`/recipes/${id}/update/`, data),
    delete: (id) => API.delete(`/recipes/${id}/delete/`),
    getMyRecipes: () => API.get('/recipes/my-recipes/'),
    getByUser: (userId) => API.get(`/recipes/user/${userId}/`),
    search: (query) => API.get('/recipes/', { params: { search: query } }),
};

// ==================== MATCHING APIs ====================

export const matchingAPI = {
    matchByIngredients: (ingredientIds, params) =>
        API.post('/recipes/match/', { ingredient_ids: ingredientIds }, { params }),
    matchFromPantry: (params) => API.get('/recipes/match/pantry/', { params }),
    findComplete: (ingredientIds, params) =>
        API.post('/recipes/match/complete/', { ingredient_ids: ingredientIds }, { params }),
    findAlmost: (ingredientIds, maxMissing, params) =>
        API.post('/recipes/match/almost/', { ingredient_ids: ingredientIds, max_missing: maxMissing }, { params }),
};

// ==================== PANTRY APIs ====================

export const pantryAPI = {
    getAll: (params) => API.get('/pantry/', { params }),
    add: (ingredientId, quantity) =>
        API.post('/pantry/add/', { ingredient_id: ingredientId, quantity }),
    addMultiple: (ingredients) =>
        API.post('/pantry/add-multiple/', { ingredients }),
    getById: (id) => API.get(`/pantry/${id}/`),
    update: (id, quantity) => API.put(`/pantry/${id}/update/`, { quantity }),
    remove: (id) => API.delete(`/pantry/${id}/remove/`),
    clear: () => API.delete('/pantry/clear/'),
    check: (ingredientId) => API.get(`/pantry/check/${ingredientId}/`),
    getIngredientIds: () => API.get('/pantry/ingredient-ids/'),
};

// ==================== FAVORITES APIs ====================

export const favoritesAPI = {
    getAll: (params) => API.get('/favorites/', { params }),
    add: (recipeId) => API.post('/favorites/add/', { recipe_id: recipeId }),
    toggle: (recipeId) => API.post('/favorites/toggle/', { recipe_id: recipeId }),
    remove: (id) => API.delete(`/favorites/${id}/remove/`),
    removeByRecipe: (recipeId) => API.delete(`/favorites/recipe/${recipeId}/remove/`),
    check: (recipeId) => API.get(`/favorites/check/${recipeId}/`),
    getRecipeIds: () => API.get('/favorites/recipe-ids/'),
    withPantryMatch: () => API.get('/favorites/with-pantry-match/'),
    clear: () => API.delete('/favorites/clear/'),
};

// ==================== NUTRITION APIs ====================

export const nutritionAPI = {
    getAll: () => API.get('/nutrition/'),
    getByIngredient: (ingredientId) => API.get(`/nutrition/ingredient/${ingredientId}/`),
    create: (data) => API.post('/nutrition/create/', data),
    update: (ingredientId, data) => API.put(`/nutrition/ingredient/${ingredientId}/update/`, data),
    delete: (ingredientId) => API.delete(`/nutrition/ingredient/${ingredientId}/delete/`),
    getRecipeNutrition: (recipeId) => API.get(`/recipes/${recipeId}/nutrition/`),
};

export default API;