import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchingAPI, pantryAPI } from '../services/api';
import { IngredientSelector } from '../components/ingredients';
import { MatchResultCard } from '../components/recipes';
import { Loading, Alert, PageHeader, EmptyState } from '../components/common';
import { useDocumentTitle } from '../hooks';

const IngredientMatch = () => {
    useDocumentTitle('Find Recipes by Ingredients');
    const { isAuthenticated } = useAuth();

    // Selected ingredients state
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    
    // Results state
    const [matchResults, setMatchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    // Filter options
    const [minMatch, setMinMatch] = useState(0);
    const [difficulty, setDifficulty] = useState('');
    const [maxMissing, setMaxMissing] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState('select'); // 'select' or 'pantry'
    
    // Pantry loading
    const [pantryLoading, setPantryLoading] = useState(false);
    const [pantryIngredients, setPantryIngredients] = useState([]);

    // Load pantry ingredients when switching to pantry tab
    useEffect(() => {
        if (activeTab === 'pantry' && isAuthenticated) {
            loadPantryIngredients();
        }
    }, [activeTab, isAuthenticated]);

    const loadPantryIngredients = async () => {
        try {
            setPantryLoading(true);
            const response = await pantryAPI.getAll();
            const pantryItems = response.data.pantry_items || [];
            setPantryIngredients(pantryItems.map(item => item.ingredient));
        } catch (err) {
            console.error('Error loading pantry:', err);
            setError('Failed to load pantry ingredients');
        } finally {
            setPantryLoading(false);
        }
    };

    const handleFindRecipes = async () => {
        const ingredientsToUse = activeTab === 'pantry' ? pantryIngredients : selectedIngredients;
        
        if (ingredientsToUse.length === 0) {
            setError('Please select at least one ingredient');
            return;
        }

        setLoading(true);
        setError('');
        setHasSearched(true);

        try {
            const ingredientIds = ingredientsToUse.map(ing => ing.id);
            
            const params = {};
            if (minMatch > 0) params.min_match = minMatch;
            if (difficulty) params.difficulty = difficulty;

            let response;
            
            if (maxMissing) {
                // Use "almost" endpoint for recipes missing few ingredients
                response = await matchingAPI.findAlmost(ingredientIds, parseInt(maxMissing), params);
                setMatchResults(response.data.matched_recipes || []);
            } else {
                // Use regular matching endpoint
                response = await matchingAPI.matchByIngredients(ingredientIds, params);
                setMatchResults(response.data.matched_recipes || []);
            }

        } catch (err) {
            console.error('Error finding recipes:', err);
            setError('Failed to find matching recipes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleMatchFromPantry = async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError('');
        setHasSearched(true);

        try {
            const params = {};
            if (minMatch > 0) params.min_match = minMatch;
            if (difficulty) params.difficulty = difficulty;

            const response = await matchingAPI.matchFromPantry(params);
            setMatchResults(response.data.matched_recipes || []);

        } catch (err) {
            console.error('Error matching from pantry:', err);
            setError('Failed to find matching recipes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFavoriteToggle = (recipeId, isFavorited) => {
        setMatchResults(prev => 
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
    };

    const clearResults = () => {
        setMatchResults([]);
        setHasSearched(false);
    };

    const getResultsSummary = () => {
        if (matchResults.length === 0) return null;
        
        const perfectMatches = matchResults.filter(r => r.match_percentage === 100).length;
        const highMatches = matchResults.filter(r => r.match_percentage >= 80 && r.match_percentage < 100).length;
        const mediumMatches = matchResults.filter(r => r.match_percentage >= 50 && r.match_percentage < 80).length;
        
        return { perfectMatches, highMatches, mediumMatches };
    };

    const summary = getResultsSummary();

    return (
        <div className="ingredient-match-page">
            <div className="container">
                <PageHeader 
                    title="Find Recipes by Ingredients" 
                    subtitle="Select the ingredients you have and discover what you can cook"
                />

                {/* Tab Selection */}
                <div className="match-tabs">
                    <button 
                        className={`match-tab ${activeTab === 'select' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('select'); clearResults(); }}
                    >
                        🥕 Select Ingredients
                    </button>
                    {isAuthenticated ? (
                        <button 
                            className={`match-tab ${activeTab === 'pantry' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('pantry'); clearResults(); }}
                        >
                            📦 Use My Pantry
                        </button>
                    ) : (
                        <Link to="/login" className="match-tab disabled">
                            🔒 Login to Use Pantry
                        </Link>
                    )}
                </div>

                <div className="match-content">
                    {/* Left Panel - Ingredient Selection */}
                    <div className="match-sidebar">
                        {activeTab === 'select' ? (
                            <IngredientSelector
                                selectedIngredients={selectedIngredients}
                                onSelectionChange={setSelectedIngredients}
                            />
                        ) : (
                            <div className="pantry-preview">
                                <h3>Your Pantry Ingredients</h3>
                                {pantryLoading ? (
                                    <Loading message="Loading pantry..." />
                                ) : pantryIngredients.length > 0 ? (
                                    <>
                                        <p className="pantry-count">
                                            You have <strong>{pantryIngredients.length}</strong> ingredients in your pantry
                                        </p>
                                        <div className="pantry-tags">
                                            {pantryIngredients.map(ing => (
                                                <span key={ing.id} className="ingredient-tag selected">
                                                    {ing.name}
                                                </span>
                                            ))}
                                        </div>
                                        <Link to="/pantry" className="btn btn-outline btn-small mt-20">
                                            Manage Pantry
                                        </Link>
                                    </>
                                ) : (
                                    <EmptyState
                                        icon="📦"
                                        title="Your pantry is empty"
                                        message="Add ingredients to your pantry to find matching recipes"
                                        actionText="Go to Pantry"
                                        actionLink="/pantry"
                                    />
                                )}
                            </div>
                        )}

                        {/* Filter Options */}
                        <div className="match-filters">
                            <h4>Filter Options</h4>
                            
                            <div className="filter-group">
                                <label>Minimum Match %</label>
                                <select 
                                    value={minMatch} 
                                    onChange={(e) => setMinMatch(parseInt(e.target.value))}
                                    className="filter-select"
                                >
                                    <option value="0">Any match</option>
                                    <option value="25">At least 25%</option>
                                    <option value="50">At least 50%</option>
                                    <option value="75">At least 75%</option>
                                    <option value="100">100% (all ingredients)</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Difficulty</label>
                                <select 
                                    value={difficulty} 
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="">Any difficulty</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Max Missing Ingredients</label>
                                <select 
                                    value={maxMissing} 
                                    onChange={(e) => setMaxMissing(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="">No limit</option>
                                    <option value="1">Missing at most 1</option>
                                    <option value="2">Missing at most 2</option>
                                    <option value="3">Missing at most 3</option>
                                    <option value="5">Missing at most 5</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Button */}
                        <div className="match-action">
                            <button
                                className="btn btn-primary btn-large btn-block"
                                onClick={activeTab === 'pantry' ? handleMatchFromPantry : handleFindRecipes}
                                disabled={loading || (activeTab === 'select' && selectedIngredients.length === 0) || (activeTab === 'pantry' && pantryIngredients.length === 0)}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Finding Recipes...
                                    </>
                                ) : (
                                    <>
                                        🔍 Find Matching Recipes
                                    </>
                                )}
                            </button>
                            
                            {activeTab === 'select' && selectedIngredients.length > 0 && (
                                <p className="selection-info">
                                    Searching with {selectedIngredients.length} ingredient{selectedIngredients.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Results */}
                    <div className="match-results">
                        {error && (
                            <Alert type="error" message={error} onClose={() => setError('')} />
                        )}

                        {!hasSearched ? (
                            <div className="results-placeholder">
                                <div className="placeholder-icon">🍳</div>
                                <h3>Ready to Find Recipes?</h3>
                                <p>
                                    {activeTab === 'select' 
                                        ? 'Select ingredients from the list and click "Find Matching Recipes"'
                                        : 'Click "Find Matching Recipes" to see what you can make with your pantry ingredients'
                                    }
                                </p>
                            </div>
                        ) : loading ? (
                            <Loading message="Finding matching recipes..." />
                        ) : matchResults.length > 0 ? (
                            <>
                                {/* Results Summary */}
                                <div className="results-summary">
                                    <h3>
                                        Found {matchResults.length} Recipe{matchResults.length !== 1 ? 's' : ''}
                                    </h3>
                                    {summary && (
                                        <div className="summary-badges">
                                            {summary.perfectMatches > 0 && (
                                                <span className="summary-badge perfect">
                                                    ✨ {summary.perfectMatches} perfect match{summary.perfectMatches !== 1 ? 'es' : ''}
                                                </span>
                                            )}
                                            {summary.highMatches > 0 && (
                                                <span className="summary-badge high">
                                                    🎯 {summary.highMatches} high match{summary.highMatches !== 1 ? 'es' : ''}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Results Grid */}
                                <div className="match-results-grid">
                                    {matchResults.map(recipe => (
                                        <MatchResultCard
                                            key={recipe.id}
                                            recipe={recipe}
                                            onFavoriteToggle={handleFavoriteToggle}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyState
                                icon="🔍"
                                title="No matching recipes found"
                                message="Try selecting different ingredients or adjusting the filters"
                                actionText="Clear Filters"
                                onAction={() => {
                                    setMinMatch(0);
                                    setDifficulty('');
                                    setMaxMissing('');
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IngredientMatch;