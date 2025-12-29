import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { recipeAPI } from '../services/api';
import { RecipeCard } from '../components/recipes';
import { Loading, Alert, PageHeader, EmptyState } from '../components/common';

const Recipes = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filters
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
    const [maxTime, setMaxTime] = useState(searchParams.get('max_time') || '');
    const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-created_at');
    
    // Pagination
    const [totalCount, setTotalCount] = useState(0);

    const loadRecipes = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const params = {};
            if (searchQuery.trim()) params.search = searchQuery.trim();
            if (difficulty) params.difficulty = difficulty;
            if (maxTime) params.max_time = maxTime;
            if (ordering) params.ordering = ordering;

            const response = await recipeAPI.getAll(params);
            setRecipes(response.data.recipes || []);
            setTotalCount(response.data.count || 0);

        } catch (err) {
            console.error('Error loading recipes:', err);
            setError('Failed to load recipes. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, difficulty, maxTime, ordering]);

    useEffect(() => {
        loadRecipes();
    }, [loadRecipes]);

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (difficulty) params.set('difficulty', difficulty);
        if (maxTime) params.set('max_time', maxTime);
        if (ordering !== '-created_at') params.set('ordering', ordering);
        
        setSearchParams(params, { replace: true });
    }, [searchQuery, difficulty, maxTime, ordering, setSearchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        loadRecipes();
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDifficulty('');
        setMaxTime('');
        setOrdering('-created_at');
    };

    const handleFavoriteToggle = (recipeId, isFavorited) => {
        setRecipes(prev => 
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
    };

    const hasActiveFilters = searchQuery || difficulty || maxTime || ordering !== '-created_at';

    return (
        <div className="recipes-page">
            <div className="container">
                <PageHeader 
                    title="All Recipes" 
                    subtitle={`${totalCount} delicious recipes to explore`}
                />

                {/* Search and Filters */}
                <div className="filters-section">
                    <form className="search-form" onSubmit={handleSearch}>
                        <div className="search-input-group">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search recipes by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button 
                                    type="button" 
                                    className="clear-search"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary">
                            Search
                        </button>
                    </form>

                    <div className="filters-row">
                        <div className="filter-group">
                            <label htmlFor="difficulty">Difficulty</label>
                            <select
                                id="difficulty"
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Levels</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="maxTime">Max Total Time</label>
                            <select
                                id="maxTime"
                                value={maxTime}
                                onChange={(e) => setMaxTime(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Any Time</option>
                                <option value="15">Under 15 minutes</option>
                                <option value="30">Under 30 minutes</option>
                                <option value="45">Under 45 minutes</option>
                                <option value="60">Under 1 hour</option>
                                <option value="90">Under 1.5 hours</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="ordering">Sort By</label>
                            <select
                                id="ordering"
                                value={ordering}
                                onChange={(e) => setOrdering(e.target.value)}
                                className="filter-select"
                            >
                                <option value="-created_at">Newest First</option>
                                <option value="created_at">Oldest First</option>
                                <option value="title">Title (A-Z)</option>
                                <option value="-title">Title (Z-A)</option>
                                <option value="prep_time">Prep Time (Low to High)</option>
                                <option value="-prep_time">Prep Time (High to Low)</option>
                                <option value="cook_time">Cook Time (Low to High)</option>
                                <option value="-cook_time">Cook Time (High to Low)</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button 
                                className="btn btn-outline btn-small clear-filters"
                                onClick={handleClearFilters}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="active-filters">
                        <span className="active-filters-label">Active filters:</span>
                        {searchQuery && (
                            <span className="filter-tag">
                                Search: "{searchQuery}"
                                <button onClick={() => setSearchQuery('')}>✕</button>
                            </span>
                        )}
                        {difficulty && (
                            <span className="filter-tag">
                                Difficulty: {difficulty}
                                <button onClick={() => setDifficulty('')}>✕</button>
                            </span>
                        )}
                        {maxTime && (
                            <span className="filter-tag">
                                Max time: {maxTime} min
                                <button onClick={() => setMaxTime('')}>✕</button>
                            </span>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                {/* Loading State */}
                {loading ? (
                    <Loading message="Loading recipes..." />
                ) : recipes.length > 0 ? (
                    <>
                        {/* Results Info */}
                        <div className="results-info">
                            <p>Showing {recipes.length} of {totalCount} recipes</p>
                        </div>

                        {/* Recipes Grid */}
                        <div className="recipes-grid grid grid-3">
                            {recipes.map(recipe => (
                                <RecipeCard 
                                    key={recipe.id} 
                                    recipe={recipe}
                                    onFavoriteToggle={handleFavoriteToggle}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon="🍳"
                        title="No recipes found"
                        message={
                            hasActiveFilters 
                                ? "Try adjusting your filters or search query"
                                : "No recipes available yet. Check back later!"
                        }
                        actionText={hasActiveFilters ? "Clear Filters" : null}
                        onAction={hasActiveFilters ? handleClearFilters : null}
                    />
                )}
            </div>
        </div>
    );
};

export default Recipes;