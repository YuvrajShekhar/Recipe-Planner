# Smart Recipe & Meal Planning Platform

A web application that helps users discover recipes based on ingredients they already have at home. The platform calculates compatibility percentages to show how well your available ingredients match each recipe, making meal planning effortless and reducing food waste.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Development Methodology](#development-methodology)
- [Technical Debt](#technical-debt)
- [License](#license)

## Overview

### Problem Statement

Many home cooks face a common challenge: standing in front of a well-stocked pantry but having no idea what to make for dinner. Traditional recipe apps require users to search by dish name or cuisine, but what if you could search by what you already have?

### Solution

The Smart Recipe & Meal Planning Platform flips the traditional recipe search on its head. Instead of finding a recipe and then buying ingredients, users input what they have available, and the system finds recipes that match. Each recipe displays a compatibility percentage showing how many required ingredients the user already owns.

### Target Audience

- Home cooks looking to reduce food waste
- Budget-conscious individuals wanting to cook with what they have
- Meal planners seeking efficient grocery management
- Anyone who asks "What can I make with these ingredients?"

## Features

### Core Functionality

- **Ingredient-Based Recipe Matching**: Search for recipes based on ingredients you have, with multiple matching modes:
  - Standard matching with compatibility percentages
  - Strict matching (only recipes you can make completely)
  - Flexible matching with substitution suggestions

- **Pantry Management**: Track ingredients you have at home with quantities and expiration awareness

- **Recipe Management**: Browse, search, and filter recipes by various criteria including cuisine, dietary restrictions, and preparation time

- **Favorites System**: Save your favorite recipes for quick access

- **User Authentication**: Secure registration and login with JWT token-based authentication

### Additional Features

- Recipe filtering by dietary preferences
- Detailed recipe views with ingredient lists and instructions
- Ingredient categorization for easier pantry organization
- Responsive web interface

## Technology Stack

### Backend
- **Framework**: Django 4.x with Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful architecture with 39 endpoints

### Frontend
- **Framework**: React 18
- **Styling**: CSS3 with custom styling
- **State Management**: React Context API
- **HTTP Client**: Axios

### Development & Deployment
- **Version Control**: Git & GitHub
- **API Testing**: Postman
- **Containerization**: Docker & Docker Compose
- **Cloud Hosting**: 

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐     │
│  │   Auth    │  │  Recipe   │  │  Pantry   │  │ Dashboard │     │
│  │  Pages    │  │  Browser  │  │  Manager  │  │   View    │     │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Django REST Framework)              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐     │
│  │   Auth    │  │  Recipe   │  │  Pantry   │  │ Matching  │     │
│  │  Module   │  │  Module   │  │  Module   │  │  Engine   │     │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                        │
│  ┌────────┐ ┌────────────┐ ┌────────┐ ┌──────────────────┐      │
│  │ Users  │ │ Ingredients│ │Recipes │ │RecipeIngredients │      │
│  └────────┘ └────────────┘ └────────┘ └──────────────────┘      │
│  ┌────────┐ ┌────────────┐                                      │
│  │Pantry  │ │ Favorites  │                                      │
│  └────────┘ └────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

| Model | Description |
|-------|-------------|
| User | User accounts with authentication credentials |
| Ingredient | Master list of all ingredients with categories |
| Recipe | Recipe details including name, instructions, cuisine, prep time |
| RecipeIngredient | Junction table linking recipes to their required ingredients with quantities |
| Pantry | User's available ingredients with quantities |
| Favorite | User's saved favorite recipes |

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/YuvrajShekhar/Recipe-Planner.git
cd smart-recipe-platform
```

2. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip3 install -r requirements.txt
```

4. Configure the database in `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'recipe_platform',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

5. Run migrations:
```bash
python3 manage.py migrate
```

6. Load sample data (optional):
```bash
python3 manage.py loaddata sample_data.json
```

7. Start the development server:
```bash
python3 manage.py runserver
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure the API endpoint in `.env`:
```
REACT_APP_API_URL=http://localhost:8000/api
```

4. Start the development server:
```bash
npm start
```

### Docker Setup

For containerized deployment:

```bash
docker-compose up --build
```

## API Documentation

The backend provides 39 RESTful API endpoints organized into six feature areas:

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/logout/` | User logout |
| GET | `/api/auth/profile/` | Get user profile |

### Ingredient Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ingredients/` | List all ingredients |
| GET | `/api/ingredients/{id}/` | Get ingredient details |
| GET | `/api/ingredients/categories/` | List ingredient categories |
| GET | `/api/ingredients/search/` | Search ingredients |

### Recipe Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes/` | List all recipes |
| GET | `/api/recipes/{id}/` | Get recipe details |
| GET | `/api/recipes/search/` | Search recipes |
| GET | `/api/recipes/filter/` | Filter recipes by criteria |

### Matching Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matching/find/` | Find matching recipes |
| POST | `/api/matching/strict/` | Strict ingredient matching |
| POST | `/api/matching/flexible/` | Flexible matching with suggestions |

### Pantry Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pantry/` | Get user's pantry |
| POST | `/api/pantry/add/` | Add ingredient to pantry |
| PUT | `/api/pantry/update/{id}/` | Update pantry item |
| DELETE | `/api/pantry/remove/{id}/` | Remove from pantry |

### Favorites Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites/` | Get user's favorites |
| POST | `/api/favorites/add/` | Add to favorites |
| DELETE | `/api/favorites/remove/{id}/` | Remove from favorites |

## Project Structure

```
smart-recipe-platform/
├── backend/
│   ├── recipe_platform/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── api/
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── ingredient.py
│   │   │   ├── recipe.py
│   │   │   ├── pantry.py
│   │   │   └── favorite.py
│   │   ├── views/
│   │   │   ├── __init__.py
│   │   │   ├── auth_views.py
│   │   │   ├── ingredient_views.py
│   │   │   ├── recipe_views.py
│   │   │   ├── matching_views.py
│   │   │   ├── pantry_views.py
│   │   │   └── favorite_views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── styles/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── docker-compose.yml
├── Dockerfile
├── README.md
└── docs/
    ├── requirements.pdf
    ├── architecture.pdf
    └── api-testing.pdf
```

## Usage

### Getting Started

1. **Register an account** or log in with existing credentials
2. **Add ingredients** to your pantry that you have available
3. **Search for recipes** based on your pantry items
4. **View compatibility scores** to see which recipes you can make
5. **Save favorites** for quick access later

### Recipe Matching Example

When you have eggs, flour, milk, and butter in your pantry:

- **Pancakes** (95% match) - Missing: baking powder
- **Crepes** (100% match) - All ingredients available!
- **Cake** (60% match) - Missing: sugar, vanilla, baking powder

## Development Methodology

This project follows an **Agile-inspired incremental development** approach:

- **Phase 1 (Conception)**: Requirements gathering, system design, architecture planning
- **Phase 2 (Development)**: Iterative implementation with continuous testing
- **Phase 3 (Finalization)**: Polish, documentation, and deployment

Key practices:
- Incremental feature development to minimize complex debugging
- Comprehensive API testing with Postman before frontend integration
- Modular code architecture for maintainability
- Regular refactoring to manage technical complexity

## Technical Debt

The following items are documented as technical debt for future iterations:

1. **Advanced Search Optimization**: Implement database indexing for large-scale ingredient searches
2. **Caching Layer**: Add Redis caching for frequently accessed recipes
3. **Image Upload**: Recipe and ingredient image upload functionality
4. **Meal Planning Calendar**: Weekly meal planning with shopping list generation
5. **Nutritional Information**: Integration with nutrition APIs for calorie/macro tracking
6. **Social Features**: Recipe sharing and community ratings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is developed as part of the Software Engineering course (DLMCSPSE01) at IU International University of Applied Sciences.

## Contact

For questions or feedback regarding this project, please open an issue on GitHub.

---

**Note**: This project is under active development. Features and documentation may be updated as the project progresses through its development phases.
