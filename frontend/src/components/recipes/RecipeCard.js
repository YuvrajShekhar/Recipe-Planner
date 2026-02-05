import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { favoritesAPI } from '../../services/api';

const RecipeCard = ({ recipe, onFavoriteToggle, showMatchPercentage = false }) => {
    const { isAuthenticated } = useAuth();
    const [isFavorited, setIsFavorited] = useState(recipe.is_favorited || false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const getDefaultImage = (title) => {
        const lowerTitle = title?.toLowerCase() || '';

        if (lowerTitle.includes('chicken')) {
            return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('rice')) {
            return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('pasta') || lowerTitle.includes('spaghetti')) {
            return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('salad')) {
            return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('soup')) {
            return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('curry')) {
            return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('tomato')) {
            return 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400&h=300&fit=crop';
        }
        if (lowerTitle.includes('garlic') || lowerTitle.includes('lemon')) {
            return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&h=300&fit=crop';
        }

        // Default food image
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
    };

    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            return;
        }

        setFavoriteLoading(true);
        try {
            const response = await favoritesAPI.toggle(recipe.id);
            setIsFavorited(response.data.is_favorited);
            if (onFavoriteToggle) {
                onFavoriteToggle(recipe.id, response.data.is_favorited);
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'difficulty-easy';
            case 'medium': return 'difficulty-medium';
            case 'hard': return 'difficulty-hard';
            default: return '';
        }
    };

    const getPreferenceClass = (preference) => {
        switch (preference) {
            case 'veg': return 'preference-veg';
            case 'nonveg': return 'preference-nonveg';
            default: return '';
        }
    };

    const getMatchClass = (percentage) => {
        if (percentage >= 80) return 'match-high';
        if (percentage >= 50) return 'match-medium';
        return 'match-low';
    };

    const defaultImage = getDefaultImage(recipe.title);

    return (
        <Link to={`/recipes/${recipe.id}`} className="recipe-card card">
            <div className="recipe-card-image">
                <img
                    src={recipe.image_url || defaultImage}
                    alt={recipe.title}
                    onError={(e) => {
                        e.target.src = defaultImage;
                    }}
                />

                {isAuthenticated && (
                    <button
                        className={`favorite-btn ${isFavorited ? 'active' : ''}`}
                        onClick={handleFavoriteClick}
                        disabled={favoriteLoading}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        {favoriteLoading ? '...' : (isFavorited ? '❤️' : '🤍')}
                    </button>
                )}

                {showMatchPercentage && recipe.match_percentage !== undefined && (
                    <div className={`match-badge ${getMatchClass(recipe.match_percentage)}`}>
                        {Math.round(recipe.match_percentage)}% match
                    </div>
                )}
            </div>

            <div className="card-body">
                <h3 className="recipe-card-title">{recipe.title}</h3>

                <p className="recipe-card-description">
                    {recipe.description?.length > 80
                        ? `${recipe.description.substring(0, 80)}...`
                        : recipe.description || 'A delicious recipe to try!'
                    }
                </p>

                <div className="recipe-meta">
                    <span title="Prep time">🕐 {recipe.prep_time} min prep</span>
                    <span title="Cook time">🍳 {recipe.cook_time} min cook</span>
                </div>

                <div className="recipe-card-footer">
                    <span className={`difficulty-badge ${getDifficultyClass(recipe.difficulty)}`}>
                        {recipe.difficulty?.charAt(0).toUpperCase() + recipe.difficulty?.slice(1)}
                    </span>
                    <span className="servings">
                        👥 {recipe.servings} servings
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default RecipeCard;