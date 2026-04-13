import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recipeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RecipeCard, CreateRecipeModal } from '../components/recipes';
import { Loading, Alert, PageHeader, EmptyState } from '../components/common';
import { useDocumentTitle } from '../hooks';

const Recipes = () => {
    useDocumentTitle('Browse Recipes');
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Tab: 'browse' | 'mine'
    const [tab, setTab] = useState('browse');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Browse tab state
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // My Recipes tab state
    const [myRecipes, setMyRecipes] = useState([]);
    const [myLoading, setMyLoading] = useState(false);
    const [myError, setMyError] = useState('');

    // Filters
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
    const [preference, setPreference] = useState(searchParams.get('preference') || '');
    const [maxTime, setMaxTime] = useState(searchParams.get('max_time') || '');
    const [ordering, setOrdering] = useState(searchParams.get('ordering') || '-created_at');

    const [totalCount, setTotalCount] = useState(0);

    // ── Loaders ──────────────────────────────────────────────────────────────

    const loadRecipes = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (searchQuery.trim()) params.search = searchQuery.trim();
            if (difficulty) params.difficulty = difficulty;
            if (preference) params.preference = preference;
            if (maxTime) params.max_time = maxTime;
            if (ordering) params.ordering = ordering;

            const response = await recipeAPI.getAll(params);
            setRecipes(response.data.recipes || []);
            setTotalCount(response.data.count || 0);
        } catch {
            setError('Failed to load recipes. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, difficulty, preference, maxTime, ordering]);

    const loadMyRecipes = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setMyLoading(true);
            setMyError('');
            const res = await recipeAPI.getMyRecipes();
            setMyRecipes(res.data.recipes || []);
        } catch {
            setMyError('Failed to load your recipes.');
        } finally {
            setMyLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => { loadRecipes(); }, [loadRecipes]);
    useEffect(() => { if (tab === 'mine') loadMyRecipes(); }, [tab, loadMyRecipes]);

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (difficulty) params.set('difficulty', difficulty);
        if (preference) params.set('preference', preference);
        if (maxTime) params.set('max_time', maxTime);
        if (ordering !== '-created_at') params.set('ordering', ordering);
        setSearchParams(params, { replace: true });
    }, [searchQuery, difficulty, preference, maxTime, ordering, setSearchParams]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSearch = (e) => { e.preventDefault(); loadRecipes(); };

    const handleClearFilters = () => {
        setSearchQuery('');
        setDifficulty('');
        setPreference('');
        setMaxTime('');
        setOrdering('-created_at');
    };

    const handleFavoriteToggle = (recipeId, isFavorited) => {
        setRecipes(prev =>
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
    };

    const handleMyFavoriteToggle = (recipeId, isFavorited) => {
        setMyRecipes(prev =>
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
    };

    const handleRecipeCreated = (recipe) => {
        setShowCreateModal(false);
        setMyRecipes(prev => [recipe, ...prev]);
        setTab('mine');
    };

    const handleDeleteMyRecipe = async (recipeId) => {
        if (!window.confirm('Delete this recipe?')) return;
        try {
            await recipeAPI.delete(recipeId);
            setMyRecipes(prev => prev.filter(r => r.id !== recipeId));
            // Also remove from browse list if it was public
            setRecipes(prev => prev.filter(r => r.id !== recipeId));
        } catch {
            setMyError('Failed to delete recipe.');
        }
    };

    const hasActiveFilters = searchQuery || difficulty || preference || maxTime || ordering !== '-created_at';

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="recipes-page">
            <div className="container">
                {/* Tab header */}
                <div className="recipes-tabs-header">
                    <div className="recipes-tabs">
                        <button
                            className={`recipes-tab ${tab === 'browse' ? 'active' : ''}`}
                            onClick={() => setTab('browse')}
                        >
                            All Recipes
                        </button>
                        {isAuthenticated && (
                            <button
                                className={`recipes-tab ${tab === 'mine' ? 'active' : ''}`}
                                onClick={() => setTab('mine')}
                            >
                                My Recipes
                            </button>
                        )}
                    </div>
                    {isAuthenticated && (
                        <button className="btn btn-primary btn-create-recipe"
                            onClick={() => setShowCreateModal(true)}>
                            + Create Recipe
                        </button>
                    )}
                </div>

                {/* ── Browse Tab ── */}
                {tab === 'browse' && (
                    <>
                        <PageHeader
                            title="All Recipes"
                            subtitle={`${totalCount} delicious recipes to explore`}
                        />

                        {/* Filters */}
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
                                        <button type="button" className="clear-search"
                                            onClick={() => setSearchQuery('')}>✕</button>
                                    )}
                                </div>
                                <button type="submit" className="btn btn-primary">Search</button>
                            </form>

                            <div className="filters-row">
                                <div className="filter-group">
                                    <label htmlFor="difficulty">Difficulty</label>
                                    <select id="difficulty" value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        className="filter-select">
                                        <option value="">All Levels</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="preference">Preference</label>
                                    <select id="preference" value={preference}
                                        onChange={(e) => setPreference(e.target.value)}
                                        className="filter-select">
                                        <option value="">All</option>
                                        <option value="veg">Veg</option>
                                        <option value="nonveg">Non Veg</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="maxTime">Max Total Time</label>
                                    <select id="maxTime" value={maxTime}
                                        onChange={(e) => setMaxTime(e.target.value)}
                                        className="filter-select">
                                        <option value="">Any Time</option>
                                        <option value="15">Under 15 min</option>
                                        <option value="30">Under 30 min</option>
                                        <option value="45">Under 45 min</option>
                                        <option value="60">Under 1 hour</option>
                                        <option value="90">Under 1.5 hours</option>
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <label htmlFor="ordering">Sort By</label>
                                    <select id="ordering" value={ordering}
                                        onChange={(e) => setOrdering(e.target.value)}
                                        className="filter-select">
                                        <option value="-created_at">Newest First</option>
                                        <option value="created_at">Oldest First</option>
                                        <option value="title">Title (A-Z)</option>
                                        <option value="-title">Title (Z-A)</option>
                                        <option value="prep_time">Prep Time ↑</option>
                                        <option value="-prep_time">Prep Time ↓</option>
                                        <option value="cook_time">Cook Time ↑</option>
                                        <option value="-cook_time">Cook Time ↓</option>
                                    </select>
                                </div>
                                {hasActiveFilters && (
                                    <button className="btn btn-outline btn-small clear-filters"
                                        onClick={handleClearFilters}>
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

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
                                {preference && (
                                    <span className="filter-tag">
                                        Preference: {preference === 'veg' ? 'Veg' : 'Non Veg'}
                                        <button onClick={() => setPreference('')}>✕</button>
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

                        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                        {loading ? (
                            <Loading message="Loading recipes..." />
                        ) : recipes.length > 0 ? (
                            <>
                                <div className="results-info">
                                    <p>Showing {recipes.length} of {totalCount} recipes</p>
                                </div>
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
                                        : "No public recipes yet."
                                }
                                actionText={hasActiveFilters ? "Clear Filters" : null}
                                onAction={hasActiveFilters ? handleClearFilters : null}
                            />
                        )}
                    </>
                )}

                {/* ── My Recipes Tab ── */}
                {tab === 'mine' && isAuthenticated && (
                    <>
                        <PageHeader
                            title="My Recipes"
                            subtitle="Recipes you've created — private unless shared publicly"
                        />

                        {myError && <Alert type="error" message={myError} onClose={() => setMyError('')} />}

                        {myLoading ? (
                            <Loading message="Loading your recipes..." />
                        ) : myRecipes.length > 0 ? (
                            <div className="recipes-grid grid grid-3">
                                {myRecipes.map(recipe => (
                                    <div key={recipe.id} className="my-recipe-wrapper">
                                        <div className="my-recipe-badges">
                                            <span className={`visibility-badge ${recipe.is_public ? 'public' : 'private'}`}>
                                                {recipe.is_public ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                        <RecipeCard
                                            recipe={recipe}
                                            onFavoriteToggle={handleMyFavoriteToggle}
                                        />
                                        <div className="my-recipe-actions">
                                            <button className="btn btn-outline btn-small"
                                                onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                                                Edit
                                            </button>
                                            <button className="btn btn-danger btn-small"
                                                onClick={() => handleDeleteMyRecipe(recipe.id)}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon="📝"
                                title="No recipes yet"
                                message="Create your first recipe using the button above."
                                actionText="Create Recipe"
                                onAction={() => setShowCreateModal(true)}
                            />
                        )}
                    </>
                )}
            </div>

            {showCreateModal && (
                <CreateRecipeModal
                    onCreated={handleRecipeCreated}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
};

export default Recipes;
