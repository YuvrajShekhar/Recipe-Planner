import axios from 'axios';

// Create axios instance with base configuration
// Uses environment variable for flexibility between local and production
const API = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://recipe-planner-production.up.railway.app/api',
    timeout: 10000,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token to every request if available
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
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

// ==================== HEALTH / DAILY NUTRITION LOG APIs ====================

export const healthAPI = {
    // Get logs (optionally filtered by date, month, year)
    getLogs: (params) => API.get('/health/logs/', { params }),

    // Create a new nutrition log entry
    createLog: (data) => API.post('/health/logs/', data),

    // Get a specific log entry
    getLog: (id) => API.get(`/health/logs/${id}/`),

    // Update a log entry
    updateLog: (id, data) => API.put(`/health/logs/${id}/`, data),

    // Delete a log entry
    deleteLog: (id) => API.delete(`/health/logs/${id}/`),

    // Get daily summary (aggregated totals for a specific date)
    getDailySummary: (date) => API.get('/health/daily-summary/', { params: { date } }),

    // Get monthly summary (all days in a month)
    getMonthlySummary: (month, year) => API.get('/health/monthly-summary/', { params: { month, year } }),
};

// ==================== FITNESS APIs ====================

export const fitnessAPI = {
    // Save steps for a date (upsert — creates or updates)
    saveLog: (data) => API.post('/fitness/logs/', data),

    // Get the step log for a specific date (returns { steps: 0 } if no entry)
    getDaily: (date) => API.get('/fitness/daily/', { params: { date } }),

    // Get all step logs for a month
    getMonthlySummary: (month, year) => API.get('/fitness/monthly-summary/', { params: { month, year } }),

    // Delete a specific log entry
    deleteLog: (id) => API.delete(`/fitness/logs/${id}/`),

    // Fitbit: store OAuth tokens
    setupFitbit: (data) => API.post('/fitness/fitbit/setup/', data),

    // Fitbit: sync steps for a date from Fitbit (or return stored value)
    syncSteps: (date) => API.get('/fitness/sync/', { params: { date } }),
};

// ==================== FOOD ITEMS APIs ====================

export const foodAPI = {
    // List all food items created by the user
    getAll: (params) => API.get('/foods/', { params }),

    // Create a food item (manual or from barcode scan); optional quantity adds to pantry
    create: (data) => API.post('/foods/create/', data),

    // Update or delete a food item
    update: (id, data) => API.put(`/foods/${id}/`, data),
    delete: (id) => API.delete(`/foods/${id}/`),
};

export const foodPantryAPI = {
    // List user's food pantry
    getAll: () => API.get('/food-pantry/'),

    // Add a quantity of a food item to pantry (upserts)
    add: (foodItemId, quantity) =>
        API.post('/food-pantry/add/', { food_item_id: foodItemId, quantity }),

    // Set absolute quantity or remove from pantry
    update: (id, quantity) => API.put(`/food-pantry/${id}/`, { quantity }),
    remove: (id) => API.delete(`/food-pantry/${id}/`),

    // Log consumption from food pantry → health diary
    consume: (data) => API.post('/food-pantry/consume/', data),
};

// ==================== FRIDGE APIs ====================

export const fridgeAPI = {
    // List all fridge items
    getAll: () => API.get('/fridge/'),

    // Cook a recipe: deduct pantry ingredients and add to fridge
    // data: { recipe_id, portions, force }
    cook: (data) => API.post('/fridge/cook/', data),

    // Delete (throw away) a fridge item
    delete: (id) => API.delete(`/fridge/${id}/`),

    // Consume portions from a fridge item and log to health diary
    // data: { fridge_item_id, portions_consumed, date, notes }
    consume: (data) => API.post('/fridge/consume/', data),
};

// ==================== ACTIVITY (GYM / EXERCISE) APIs ====================

export const activityAPI = {
    // List activities for a date
    getByDate: (date) => API.get('/fitness/activities/', { params: { date } }),

    // Log a new activity (backend calculates calories)
    create: (data) => API.post('/fitness/activities/', data),

    // Delete an activity entry
    delete: (id) => API.delete(`/fitness/activities/${id}/`),

    // Daily summary: total calories burned + list of activities
    getDailySummary: (date) => API.get('/fitness/activities/daily/', { params: { date } }),
};

export default API;