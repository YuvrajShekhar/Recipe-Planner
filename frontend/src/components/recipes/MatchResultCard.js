import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { favoritesAPI } from '../../services/api';

const MatchResultCard = ({ recipe, onFavoriteToggle }) => {
    const { isAuthenticated } = useAuth();
    const [isFavorited, setIsFavorited] = useState(recipe.is_favorited || false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [showIngredients, setShowIngredients] = useState(false);

    const handleFavoriteClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) return;

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

    const getMatchClass = (percentage) => {
        if (percentage >= 80) return 'match-high';
        if (percentage >= 50) return 'match-medium';
        return 'match-low';
    };

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'difficulty-easy';
            case 'medium': return 'difficulty-medium';
            case 'hard': return 'difficulty-hard';
            default: return '';
        }
    };

    const getDefaultImage = (title) => {
        const lowerTitle = title?.toLowerCase() || '';
        if (lowerTitle.includes('chicken')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=250&fit=crop';
        if (lowerTitle.includes('rice')) return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=250&fit=crop';
        if (lowerTitle.includes('curry')) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop';
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop';
    };

    const matchPercentage = Math.round(recipe.match_percentage || 0);
    const matchedCount = recipe.matched_ingredients?.length || 0;
    const missingCount = recipe.missing_ingredients?.length || 0;
    const totalCount = matchedCount + missingCount;

    return (
        <div className="match-result-card">
            <Link to={`/recipes/${recipe.id}`} className="card-link">
                <div className="match-card-image">
                    <img 
                        src={recipe.image_url || getDefaultImage(recipe.title)} 
                        alt={recipe.title}
                        onError={(e) => {
                            e.target.src = getDefaultImage(recipe.title);
                        }}
                    />
                    
                    {/* Match Percentage Badge */}
                    <div className={`match-percentage-badge ${getMatchClass(matchPercentage)}`}>
                        <span className="percentage">{matchPercentage}%</span>
                        <span className="label">match</span>
                    </div>

                    {/* Favorite Button */}
                    {isAuthenticated && (
                        <button
                            className={`favorite-btn ${isFavorited ? 'active' : ''}`}
                            onClick={handleFavoriteClick}
                            disabled={favoriteLoading}
                        >
                            {favoriteLoading ? '...' : (isFavorited ? '❤️' : '🤍')}
                        </button>
                    )}
                </div>

                <div className="match-card-body">
                    <h3 className="match-card-title">{recipe.title}</h3>
                    
                    <p className="match-card-description">
                        {recipe.description?.length > 100 
                            ? `${recipe.description.substring(0, 100)}...` 
                            : recipe.description
                        }
                    </p>

                    {/* Recipe Meta */}
                    <div className="match-card-meta">
                        <span>🕐 {recipe.total_time || (recipe.prep_time + recipe.cook_time)} min</span>
                        <span>👥 {recipe.servings} servings</span>
                        <span className={`difficulty-badge ${getDifficultyClass(recipe.difficulty)}`}>
                            {recipe.difficulty?.charAt(0).toUpperCase() + recipe.difficulty?.slice(1)}
                        </span>
                    </div>

                    {/* Ingredient Match Summary */}
                    <div className="ingredient-match-summary">
                        <div className="match-bar">
                            <div 
                                className="match-bar-fill"
                                style={{ width: `${matchPercentage}%` }}
                            ></div>
                        </div>
                        <div className="match-stats">
                            <span className="have">✓ {matchedCount} have</span>
                            <span className="need">✗ {missingCount} need</span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Expandable Ingredients Section */}
            <div className="match-card-footer">
                <button 
                    className="toggle-ingredients-btn"
                    onClick={() => setShowIngredients(!showIngredients)}
                >
                    {showIngredients ? '▲ Hide Ingredients' : '▼ Show Ingredients'}
                </button>

                {showIngredients && (
                    <div className="ingredients-breakdown">
                        {matchedCount > 0 && (
                            <div className="ingredients-group have">
                                <h5>✓ You Have ({matchedCount})</h5>
                                <div className="ingredient-tags">
                                    {recipe.matched_ingredients?.map(ing => (
                                        <span key={ing.id} className="ing-tag have">
                                            {ing.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {missingCount > 0 && (
                            <div className="ingredients-group need">
                                <h5>✗ You Need ({missingCount})</h5>
                                <div className="ingredient-tags">
                                    {recipe.missing_ingredients?.map(ing => (
                                        <span key={ing.id} className="ing-tag need">
                                            {ing.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchResultCard;