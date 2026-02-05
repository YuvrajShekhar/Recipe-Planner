# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Recipe & Meal Planning Platform - A Django + React application that helps users discover recipes based on ingredients they already have. The core feature is ingredient-based recipe matching with compatibility percentage calculations.

**Key Concept**: Instead of searching for recipes then buying ingredients, users input what they have available and the system finds matching recipes with compatibility scores (e.g., "Pancakes - 95% match, missing: baking powder").

## Development Commands

### Backend (Django)

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Run development server (default port 8000)
python3 manage.py runserver

# Database operations
python3 manage.py migrate
python3 manage.py makemigrations

# Create superuser for Django admin
python3 manage.py createsuperuser

# Open Django shell for debugging
python3 manage.py shell

# Run tests (if implemented)
python3 manage.py test
```

### Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Run development server (default port 3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Database

PostgreSQL database configured in [backend/settings.py](backend/settings.py):
- Database: `recipe_planner_db`
- User: `recipe_user`
- Host: `localhost:5432`

## Architecture Overview

### Backend Structure

**Django App**: Single app called `recipes` containing all models and views.

**Models** ([recipes/models.py](recipes/models.py)):
- `Ingredient` - Master ingredient list with categories (vegetable, fruit, meat, dairy, etc.)
- `Recipe` - Recipe details including title, instructions, prep_time, cook_time, difficulty
- `RecipeIngredient` - Junction table linking recipes to ingredients with quantities
- `Pantry` - User's available ingredients
- `Favorite` - User's saved recipes
- `IngredientNutrition` - Nutritional information per ingredient (calories, protein, carbs, fat, fiber)

**Views** organized in [recipes/views/](recipes/views/) by feature:
- `auth_views.py` - User registration, login, logout, profile
- `ingredient_views.py` - Ingredient CRUD and categories
- `recipe_views.py` - Recipe CRUD operations
- `matching_views.py` - **Core matching algorithm** (see below)
- `pantry_views.py` - User pantry management
- `favorite_views.py` - Favorites with pantry match calculations
- `nutrition_views.py` - Ingredient and recipe nutrition calculations

**Authentication**: Session-based auth with `CsrfExemptSessionAuthentication`. Uses Django's built-in User model with session cookies (not JWT despite README mentioning it).

**API**: 39+ REST endpoints mapped in [recipes/urls.py](recipes/urls.py). All endpoints prefixed with `/api/`.

### Frontend Structure

**React 19** with React Router v7 for navigation.

**Key Directories**:
- `src/components/` - Organized by feature (auth, recipes, pantry, favorites, ingredients, layout, common)
- `src/pages/` - Page components (Home, Login, Register, Recipes, RecipeDetail, IngredientMatch, Pantry, Favorites, Profile)
- `src/services/` - API client ([api.js](frontend/src/services/api.js))
- `src/context/` - React Context for auth state ([AuthContext.js](frontend/src/context/AuthContext.js))
- `src/hooks/` - Custom React hooks
- `src/styles/` - CSS files

**API Client** ([frontend/src/services/api.js](frontend/src/services/api.js)):
- Axios instance configured with `withCredentials: true` for session cookies
- Base URL: `http://81.169.171.133:8000/api`
- Organized exports: `authAPI`, `ingredientAPI`, `recipeAPI`, `matchingAPI`, `pantryAPI`, `favoritesAPI`, `nutritionAPI`

**Authentication Flow**:
- `AuthContext` provides global auth state and methods
- `ProtectedRoute` component wraps routes requiring authentication
- Session cookie maintained via `withCredentials` in axios

### Recipe Matching Algorithm

Located in [recipes/views/matching_views.py](recipes/views/matching_views.py).

**Core Endpoints**:
1. `POST /api/recipes/match/` - Match by ingredient IDs with percentage calculation
2. `GET /api/recipes/match/pantry/` - Match using authenticated user's pantry
3. `POST /api/recipes/match/complete/` - Only recipes with 100% match
4. `POST /api/recipes/match/almost/` - Recipes missing only N ingredients (configurable `max_missing`)

**Algorithm Logic** (match_recipes_by_ingredients):
1. Validates provided ingredient IDs
2. For each recipe, fetches all required ingredients
3. Calculates: `match_percentage = (matched_ingredients / required_ingredients) * 100`
4. Returns matched recipes sorted by percentage (highest first)
5. Includes lists of matched and missing ingredients per recipe

**Response Format**:
```json
{
  "count": 10,
  "results": [
    {
      "recipe": { "id": 1, "title": "Pancakes", ... },
      "match_percentage": 95.0,
      "matched_count": 19,
      "required_count": 20,
      "missing_count": 1,
      "matched_ingredients": [{"id": 1, "name": "flour", ...}],
      "missing_ingredients": [{"id": 15, "name": "baking powder", ...}]
    }
  ]
}
```

**Query Parameters**: `min_match` (default 0), `limit` (default 20), `difficulty` (easy/medium/hard)

### Nutrition Feature

Recent addition to calculate nutritional information:
- Per-ingredient nutrition stored in `IngredientNutrition` model
- Supports both per-100g and per-unit measurements
- Volume-to-gram conversions (cups, tbsp, tsp)
- Recipe-level nutrition calculated by summing ingredient nutrition
- Endpoint: `GET /api/recipes/{id}/nutrition/` returns total calories, protein, carbs, fat, fiber

## Important Technical Notes

### CORS Configuration

Frontend and backend run on different ports. CORS configured in [backend/settings.py](backend/settings.py):
- Allowed origins: `localhost:3000`, `127.0.0.1:3000`, `81.169.171.133:3000`
- `CORS_ALLOW_CREDENTIALS = True` (required for session cookies)

### Session vs JWT

Despite README mentioning JWT, the actual implementation uses Django sessions with `CsrfExemptSessionAuthentication` (see [recipes/authentication.py](recipes/authentication.py)). Session cookies are httpOnly with 24-hour expiration.

### Database Migrations

Migration files in [recipes/migrations/](recipes/migrations/) including:
- `0002_ingredientnutrition.py` - Added nutrition model
- `0003_ingredientnutrition_gram_equivalent_per_piece.py` - Unit conversion support
- `0004_alter_recipe_image_url.py` - Changed image_url field type

When modifying models, always run:
```bash
python3 manage.py makemigrations
python3 manage.py migrate
```

### Static Files & Images

Recipe images stored as URLs in `Recipe.image_url` (CharField, not URLField despite name).
Frontend images in [frontend/public/images/](frontend/public/images/).

## Development Patterns

### Adding New Endpoints

1. Create/update view function in appropriate `recipes/views/*_views.py` file
2. Add URL pattern to [recipes/urls.py](recipes/urls.py)
3. Update corresponding API function in [frontend/src/services/api.js](frontend/src/services/api.js)
4. Use the API in components via imported functions

### Testing Pantry/Matching Features

Must be authenticated to use pantry features. Matching can work with or without auth:
- Without auth: Send ingredient IDs in request body
- With auth: Use `/api/recipes/match/pantry/` to auto-match against user's pantry

### Serializers

All serializers in single file: [recipes/serializers.py](recipes/serializers.py). Mix of regular and nested serializers (e.g., `RecipeDetailSerializer` includes nested ingredient details).

## Known Technical Debt

From README [README.md](README.md):
- No database indexing for ingredient searches
- No caching layer (Redis would help)
- Image upload not implemented (only URLs)
- Meal planning calendar feature planned
- Social features (sharing, ratings) not implemented
