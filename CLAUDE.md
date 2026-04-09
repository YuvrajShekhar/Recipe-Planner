# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Smart Recipe & Meal Planning Platform - a full-stack web application that helps users discover recipes based on ingredients they already have at home. The core innovation is **ingredient-based recipe matching** with compatibility percentages, helping reduce food waste and simplify meal planning.

## Technology Stack

- **Backend**: Django 4.2 with Django REST Framework
- **Frontend**: React 19 with React Router
- **Database**: PostgreSQL
- **Authentication**: Token-based (Django Rest Framework TokenAuthentication)
- **Deployment**: Railway (configured with Gunicorn, WhiteNoise)

## Development Commands

### Backend (Django)

```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt

# Database
python3 manage.py migrate
python3 manage.py makemigrations

# Run development server
python3 manage.py runserver

# Django admin
python3 manage.py createsuperuser

# Static files (for production)
python3 manage.py collectstatic --no-input
```

### Frontend (React)

```bash
cd frontend

# Setup
npm install

# Development
npm start          # Starts dev server on port 3000
npm test           # Run tests
npm run build      # Production build
```

### Deployment

The Procfile defines two processes:
- `web`: Runs Gunicorn WSGI server
- `release`: Runs migrations and collects static files before deployment

## Architecture

### Backend Structure

The Django backend uses a **monolithic app structure** with a single `recipes` app containing all models:

```
recipes/
├── models.py              # All models (Ingredient, Recipe, RecipeIngredient, Pantry, Favorite, IngredientNutrition)
├── serializers.py         # DRF serializers
├── authentication.py      # Custom auth classes
├── views/                 # Organized by feature
│   ├── auth_views.py      # User registration, login, profile
│   ├── ingredient_views.py
│   ├── recipe_views.py    # CRUD for recipes
│   ├── matching_views.py  # Core matching algorithm
│   ├── pantry_views.py    # User's ingredient inventory
│   ├── favorite_views.py  # Saved recipes
│   └── nutrition_views.py # Nutritional information
└── urls.py                # All API endpoints (see below)
```

### Key Models & Relationships

- **User** (Django built-in) - Authentication
- **Ingredient** - Master ingredient list with categories
- **Recipe** - Recipe details with creator relationship
- **RecipeIngredient** - Junction table: Recipe ↔ Ingredient (with quantities)
- **Pantry** - User's available ingredients: User ↔ Ingredient
- **Favorite** - User's saved recipes: User ↔ Recipe
- **IngredientNutrition** - Nutritional data per ingredient (per 100g or per unit)

### Frontend Structure

React SPA with component-based architecture:

```
frontend/src/
├── App.js                 # Main routing
├── pages/                 # Page components
│   ├── Home.js            # Dashboard
│   ├── Login.js
│   ├── Register.js
│   ├── Recipes.js         # Recipe browser
│   ├── RecipeDetail.js
│   ├── RecipeEdit.js
│   ├── IngredientMatch.js # Core matching UI
│   ├── Pantry.js          # Pantry management
│   ├── Favorites.js
│   └── Profile.js
├── components/            # Organized by feature
│   ├── auth/
│   ├── recipes/
│   ├── ingredients/
│   ├── pantry/
│   ├── favorites/
│   ├── layout/
│   └── common/
├── services/
│   └── api.js             # Axios instance & all API calls
├── context/               # React Context for state
└── styles/
```

## Core Matching Algorithm

The **ingredient matching engine** is in `recipes/views/matching_views.py`. Key endpoints:

1. **POST /api/recipes/match/** - Match recipes by ingredient IDs with compatibility %
2. **POST /api/recipes/match/pantry/** - Match using user's pantry automatically
3. **POST /api/recipes/match/complete/** - Strict matching (100% match only)
4. **POST /api/recipes/match/almost/** - Recipes missing only 1-2 ingredients

The matching algorithm:
- Queries all recipes and their required ingredients
- Calculates match percentage: `(available_ingredients / total_required) * 100`
- Returns sorted results with missing ingredient details
- Supports filtering by difficulty, dietary preference, and minimum match threshold

## API Structure

All API endpoints are prefixed with `/api/` and defined in [recipes/urls.py](recipes/urls.py). The API follows RESTful conventions:

### Endpoint Categories

- **Auth**: `/api/auth/` - register, login, logout, profile
- **Ingredients**: `/api/ingredients/` - list, detail, create, categories
- **Recipes**: `/api/recipes/` - CRUD, filtering, user recipes
- **Matching**: `/api/recipes/match/` - ingredient-based search (core feature)
- **Pantry**: `/api/pantry/` - user's ingredient inventory
- **Favorites**: `/api/favorites/` - saved recipes
- **Nutrition**: `/api/nutrition/` - ingredient nutritional data

### Authentication

- Frontend stores auth token in `localStorage` as `authToken`
- Token sent in header: `Authorization: Token <token>`
- Axios interceptor in `frontend/src/services/api.js` automatically attaches token
- Most endpoints require authentication except recipe browsing and matching

## Database Configuration

Settings support both local development and Railway production:

- **Local**: PostgreSQL database `recipe_planner_db` (credentials in settings.py)
- **Production**: Uses `DATABASE_URL` environment variable via `dj-database-url`
- Migrations tracked in `recipes/migrations/`

## Environment Variables

Backend expects:
- `DATABASE_URL` - PostgreSQL connection string (Railway)
- `SECRET_KEY` - Django secret key
- `DEBUG` - Set to 'True' or 'False'
- `ALLOWED_HOSTS` - Comma-separated domains
- `FRONTEND_URL` - Frontend URL for CORS
- `RAILWAY_PUBLIC_DOMAIN` - Auto-added to ALLOWED_HOSTS

Frontend expects (`.env` or build-time):
- `REACT_APP_API_URL` - Backend API URL

## Important Architectural Notes

1. **Single Django App**: All models, views, and serializers are in the `recipes` app despite handling multiple domains (auth, pantry, favorites). This was a conscious design choice for simplicity.

2. **View Organization**: Views are split by feature into separate files under `recipes/views/` but all imported and exposed through `recipes/views/__init__.py`.

3. **Token Auth**: Uses DRF TokenAuthentication, not JWT despite README mentioning JWT. Token created on login, stored in localStorage.

4. **CORS Configuration**: Extensive CORS setup in settings.py to support Railway deployment with cross-origin requests between frontend and backend.

5. **Static Files**: Uses WhiteNoise middleware for serving static files in production without needing a separate static file server.

6. **Dietary Preferences**: Recipes have a `preference` field (veg/nonveg) for filtering, not full-featured dietary restrictions.

## Testing the Matching Algorithm

To test the core matching feature:

1. Register a user or login
2. Add ingredients to pantry (POST `/api/pantry/add/`)
3. Call matching endpoint (POST `/api/recipes/match/pantry/`)
4. Response includes recipes sorted by compatibility percentage

Example matching response structure:
```json
{
  "matches": [
    {
      "recipe": { /* recipe details */ },
      "match_percentage": 85,
      "matched_ingredients": 8,
      "total_ingredients": 10,
      "missing_ingredients": ["salt", "pepper"]
    }
  ]
}
```

## Common Gotchas

1. **Virtual Environment**: Django commands require activating venv first
2. **PostgreSQL Required**: Project uses PostgreSQL-specific features, SQLite won't work
3. **Migration Files**: Already tracked in git under `recipes/migrations/`
4. **API Base URL**: Frontend hardcoded to Railway production URL in `api.js` - change for local dev
5. **Port Configuration**: Backend defaults to 8000, frontend to 3000
6. **Static Files**: Remember to run `collectstatic` before Railway deployment (handled by release command in Procfile)
