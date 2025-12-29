import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipeAPI, favoritesAPI, pantryAPI } from '../services/api';
import { Loading, Alert, ConfirmModal } from '../components/common';

const RecipeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [pantryIngredients, setPantryIngredients] = useState([]);
    const [pantryLoading, setPantryLoading] = useState(false);

    useEffect(() => {
        loadRecipe();
        if (isAuthenticated) {
            loadPantryIngredients();
        }
    }, [id, isAuthenticated]);

    const loadRecipe = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await recipeAPI.getById(id);
            setRecipe(response.data.recipe);
            setIsFavorited(response.data.recipe.is_favorited || false);

        } catch (err) {
            console.error('Error loading recipe:', err);
            if (err.response?.status === 404) {
                setError('Recipe not found');
            } else {
                setError('Failed to load recipe. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPantryIngredients = async () => {
        try {
            setPantryLoading(true);
            const response = await pantryAPI.getIngredientIds();
            setPantryIngredients(response.data.ingredient_ids || []);
        } catch (err) {
            console.error('Error loading pantry:', err);
        } finally {
            setPantryLoading(false);
        }
    };

    const handleFavoriteToggle = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: { pathname: `/recipes/${id}` } } });
            return;
        }

        setFavoriteLoading(true);
        try {
            const response = await favoritesAPI.toggle(recipe.id);
            setIsFavorited(response.data.is_favorited);
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await recipeAPI.delete(recipe.id);
            navigate('/recipes', { state: { message: 'Recipe deleted successfully' } });
        } catch (err) {
            console.error('Error deleting recipe:', err);
            setError('Failed to delete recipe');
        } finally {
            setDeleteLoading(false);
            setShowDeleteModal(false);
        }
    };

    const addToPantry = async (ingredientId) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        try {
            await pantryAPI.add(ingredientId);
            setPantryIngredients([...pantryIngredients, ingredientId]);
        } catch (err) {
            console.error('Error adding to pantry:', err);
        }
    };

    const getDefaultImage = (title) => {
        const lowerTitle = title?.toLowerCase() || '';
        
        if (lowerTitle.includes('chicken')) {
            return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop';
        }
        if (lowerTitle.includes('rice')) {
            return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&h=500&fit=crop';
        }
        if (lowerTitle.includes('curry')) {
            return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&h=500&fit=crop';
        }
        if (lowerTitle.includes('tomato')) {
            return 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&h=500&fit=crop';
        }
        
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop';
    };

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'difficulty-easy';
            case 'medium': return 'difficulty-medium';
            case 'hard': return 'difficulty-hard';
            default: return '';
        }
    };

    const isInPantry = (ingredientId) => {
        return pantryIngredients.includes(ingredientId);
    };

    const calculateMatchPercentage = () => {
        if (!recipe?.recipe_ingredients || recipe.recipe_ingredients.length === 0) return 0;
        const matched = recipe.recipe_ingredients.filter(ri => isInPantry(ri.ingredient.id)).length;
        return Math.round((matched / recipe.recipe_ingredients.length) * 100);
    };

    const isOwner = isAuthenticated && user && recipe?.created_by?.id === user.id;

    if (loading) {
        return (
            <div className="container">
                <Loading message="Loading recipe..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <Alert type="error" message={error} />
                <div className="text-center mt-20">
                    <Link to="/recipes" className="btn btn-primary">
                        ← Back to Recipes
                    </Link>
                </div>
            </div>
        );
    }

    if (!recipe) return null;

    const matchPercentage = calculateMatchPercentage();

    return (
        <div className="recipe-detail-page">
            <div className="container">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/recipes">Recipes</Link>
                    <span>/</span>
                    <span>{recipe.title}</span>
                </nav>

                {/* Recipe Header */}
                <div className="recipe-detail-header">
                    <div className="recipe-detail-image">
                        <img 
                            src={recipe.image_url || getDefaultImage(recipe.title)} 
                            alt={recipe.title}
                            onError={(e) => {
                                e.target.src = getDefaultImage(recipe.title);
                            }}
                        />
                        
                        {/* Favorite Button */}
                        <button
                            className={`favorite-btn-large ${isFavorited ? 'active' : ''}`}
                            onClick={handleFavoriteToggle}
                            disabled={favoriteLoading}
                        >
                            {favoriteLoading ? '...' : (isFavorited ? '❤️ Saved' : '🤍 Save')}
                        </button>
                    </div>

                    <div className="recipe-detail-info">
                        <div className="recipe-detail-title-row">
                            <h1>{recipe.title}</h1>
                            {isOwner && (
                                <div className="owner-actions">
                                    <Link 
                                        to={`/recipes/${recipe.id}/edit`} 
                                        className="btn btn-small btn-outline"
                                    >
                                        ✏️ Edit
                                    </Link>
                                    <button 
                                        className="btn btn-small btn-danger"
                                        onClick={() => setShowDeleteModal(true)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        <p className="recipe-detail-description">{recipe.description}</p>

                        {/* Recipe Meta */}
                        <div className="recipe-detail-meta">
                            <div className="meta-item">
                                <span className="meta-icon">🕐</span>
                                <div className="meta-content">
                                    <span className="meta-value">{recipe.prep_time} min</span>
                                    <span className="meta-label">Prep Time</span>
                                </div>
                            </div>

                            <div className="meta-item">
                                <span className="meta-icon">🍳</span>
                                <div className="meta-content">
                                    <span className="meta-value">{recipe.cook_time} min</span>
                                    <span className="meta-label">Cook Time</span>
                                </div>
                            </div>

                            <div className="meta-item">
                                <span className="meta-icon">⏱️</span>
                                <div className="meta-content">
                                    <span className="meta-value">{recipe.total_time} min</span>
                                    <span className="meta-label">Total Time</span>
                                </div>
                            </div>

                            <div className="meta-item">
                                <span className="meta-icon">👥</span>
                                <div className="meta-content">
                                    <span className="meta-value">{recipe.servings}</span>
                                    <span className="meta-label">Servings</span>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Badge */}
                        <div className="recipe-detail-badges">
                            <span className={`difficulty-badge ${getDifficultyClass(recipe.difficulty)}`}>
                                {recipe.difficulty?.charAt(0).toUpperCase() + recipe.difficulty?.slice(1)}
                            </span>

                            {isAuthenticated && !pantryLoading && (
                                <span className={`match-badge ${
                                    matchPercentage >= 80 ? 'match-high' : 
                                    matchPercentage >= 50 ? 'match-medium' : 'match-low'
                                }`}>
                                    {matchPercentage}% pantry match
                                </span>
                            )}
                        </div>

                        {/* Author */}
                        <div className="recipe-author">
                            <span className="author-label">Recipe by</span>
                            <span className="author-name">{recipe.created_by?.username || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                {/* Recipe Content */}
                <div className="recipe-detail-content">
                    {/* Ingredients Section */}
                    <div className="recipe-section ingredients-section">
                        <h2>🥗 Ingredients</h2>
                        <p className="section-subtitle">
                            {recipe.recipe_ingredients?.length || 0} ingredients needed
                            {isAuthenticated && !pantryLoading && (
                                <span className="pantry-status">
                                    • You have {recipe.recipe_ingredients?.filter(ri => isInPantry(ri.ingredient.id)).length || 0} in your pantry
                                </span>
                            )}
                        </p>

                        <ul className="ingredients-list">
                            {recipe.recipe_ingredients?.map((ri, index) => (
                                <li key={index} className={`ingredient-item ${isInPantry(ri.ingredient.id) ? 'in-pantry' : ''}`}>
                                    <div className="ingredient-info">
                                        <span className="ingredient-status">
                                            {isInPantry(ri.ingredient.id) ? '✓' : '○'}
                                        </span>
                                        <span className="ingredient-quantity">
                                            {ri.quantity} {ri.unit}
                                        </span>
                                        <span className="ingredient-name">
                                            {ri.ingredient.name}
                                        </span>
                                    </div>
                                    
                                    {isAuthenticated && !isInPantry(ri.ingredient.id) && (
                                        <button
                                            className="btn btn-small btn-outline add-to-pantry-btn"
                                            onClick={() => addToPantry(ri.ingredient.id)}
                                        >
                                            + Pantry
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>

                        {isAuthenticated && (
                            <div className="ingredients-actions">
                                <Link to="/pantry" className="btn btn-secondary">
                                    Manage My Pantry
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Instructions Section */}
                    <div className="recipe-section instructions-section">
                        <h2>📝 Instructions</h2>
                        <div className="instructions-list">
                            {recipe.instructions?.split('\n').filter(line => line.trim()).map((instruction, index) => (
                                <div key={index} className="instruction-item">
                                    <span className="instruction-number">{index + 1}</span>
                                    <p className="instruction-text">
                                        {instruction.replace(/^\d+\.\s*/, '')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Related Actions */}
                <div className="recipe-detail-actions">
                    <Link to="/recipes" className="btn btn-outline">
                        ← Back to Recipes
                    </Link>
                    <Link to="/match" className="btn btn-primary">
                        Find More Recipes
                    </Link>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Recipe"
                message={`Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`}
                confirmText={deleteLoading ? "Deleting..." : "Delete"}
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                danger
            />
        </div>
    );
};

export default RecipeDetail;