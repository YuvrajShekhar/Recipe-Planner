import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FavoriteCard = ({ favorite, onRemove, pantryMatch }) => {
    const [removing, setRemoving] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const recipe = favorite.recipe;

    const handleRemove = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        setRemoving(true);
        try {
            await onRemove(favorite.id);
        } catch (err) {
            console.error('Error removing favorite:', err);
            setRemoving(false);
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

    const getMatchClass = (percentage) => {
        if (percentage >= 80) return 'match-high';
        if (percentage >= 50) return 'match-medium';
        return 'match-low';
    };

    const getDefaultImage = (title) => {
        const lowerTitle = title?.toLowerCase() || '';
        if (lowerTitle.includes('chicken')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=250&fit=crop';
        if (lowerTitle.includes('rice')) return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=250&fit=crop';
        if (lowerTitle.includes('curry')) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=250&fit=crop';
        if (lowerTitle.includes('tomato')) return 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400&h=250&fit=crop';
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={`favorite-card ${removing ? 'removing' : ''}`}>
            <Link to={`/recipes/${recipe.id}`} className="favorite-card-link">
                <div className="favorite-card-image">
                    <img 
                        src={recipe.image_url || getDefaultImage(recipe.title)} 
                        alt={recipe.title}
                        onError={(e) => {
                            e.target.src = getDefaultImage(recipe.title);
                        }}
                    />
                    
                    {/* Remove Button */}
                    <button
                        className="remove-favorite-btn"
                        onClick={handleRemove}
                        disabled={removing}
                        title="Remove from favorites"
                    >
                        {removing ? '...' : '❤️'}
                    </button>

                    {/* Pantry Match Badge */}
                    {pantryMatch && (
                        <div className={`pantry-match-badge ${getMatchClass(pantryMatch.match_percentage)}`}>
                            {Math.round(pantryMatch.match_percentage)}% pantry match
                        </div>
                    )}
                </div>

                <div className="favorite-card-body">
                    <h3 className="favorite-card-title">{recipe.title}</h3>
                    
                    <p className="favorite-card-description">
                        {recipe.description?.length > 80 
                            ? `${recipe.description.substring(0, 80)}...` 
                            : recipe.description
                        }
                    </p>

                    <div className="favorite-card-meta">
                        <span>🕐 {recipe.total_time || (recipe.prep_time + recipe.cook_time)} min</span>
                        <span>👥 {recipe.servings}</span>
                        <span className={`difficulty-badge ${getDifficultyClass(recipe.difficulty)}`}>
                            {recipe.difficulty?.charAt(0).toUpperCase() + recipe.difficulty?.slice(1)}
                        </span>
                    </div>

                    {/* Pantry Match Details */}
                    {pantryMatch && (
                        <div className="favorite-pantry-info">
                            <div className="pantry-bar">
                                <div 
                                    className="pantry-bar-fill"
                                    style={{ width: `${pantryMatch.match_percentage}%` }}
                                ></div>
                            </div>
                            <div className="pantry-stats">
                                <span className="have">✓ {pantryMatch.matched_count} have</span>
                                <span className="need">✗ {pantryMatch.missing_count} need</span>
                            </div>
                        </div>
                    )}

                    <div className="favorite-card-footer">
                        <span className="saved-date">
                            Saved {formatDate(favorite.saved_at)}
                        </span>
                        {pantryMatch?.can_make_now && (
                            <span className="can-make-badge">✨ Can make now!</span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Expandable Missing Ingredients */}
            {pantryMatch && pantryMatch.missing_count > 0 && (
                <div className="favorite-card-expand">
                    <button 
                        className="expand-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowDetails(!showDetails);
                        }}
                    >
                        {showDetails ? '▲ Hide shopping list' : `▼ Show ${pantryMatch.missing_count} missing ingredients`}
                    </button>
                    
                    {showDetails && (
                        <div className="missing-ingredients">
                            <h5>Shopping List:</h5>
                            <div className="missing-tags">
                                {pantryMatch.missing_ingredients?.map(ing => (
                                    <span key={ing.id} className="missing-tag">
                                        {ing.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FavoriteCard;