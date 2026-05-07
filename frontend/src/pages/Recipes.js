import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { recipeAPI, favoritesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RecipeCard, CreateRecipeModal } from '../components/recipes';
import { FavoriteCard } from '../components/favorites';
import { Loading, Alert, PageHeader, EmptyState, ConfirmModal } from '../components/common';
import { useDocumentTitle } from '../hooks';

const Recipes = () => {
    useDocumentTitle('Browse Recipes');
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Tab: 'browse' | 'mine' | 'favorites'
    const [tab, setTab] = useState('browse');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // ── Browse tab state ─────────────────────────────────────────────────────
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── My Recipes tab state ─────────────────────────────────────────────────
    const [myRecipes, setMyRecipes] = useState([]);
    const [myLoading, setMyLoading] = useState(false);
    const [myError, setMyError] = useState('');

    // ── Favorites tab state ──────────────────────────────────────────────────
    const [favorites, setFavorites] = useState([]);
    const [favLoading, setFavLoading] = useState(false);
    const [favError, setFavError] = useState('');
    const [favSuccess, setFavSuccess] = useState('');
    const [pantryMatchData, setPantryMatchData] = useState({});
    const [loadingPantryMatch, setLoadingPantryMatch] = useState(false);
    const [favSearch, setFavSearch] = useState('');
    const [favDifficulty, setFavDifficulty] = useState('all');
    const [favSortBy, setFavSortBy] = useState('saved_at');
    const [showCanMakeOnly, setShowCanMakeOnly] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

    // ── Browse filters ───────────────────────────────────────────────────────
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

    const loadFavorites = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setFavLoading(true);
            setFavError('');
            const res = await favoritesAPI.getAll();
            setFavorites(res.data.favorites || []);
        } catch {
            setFavError('Failed to load favorites.');
        } finally {
            setFavLoading(false);
        }
    }, [isAuthenticated]);

    const loadPantryMatch = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setLoadingPantryMatch(true);
            const res = await favoritesAPI.withPantryMatch();
            const matchMap = {};
            (res.data.favorites || []).forEach(fav => {
                if (fav.pantry_match) matchMap[fav.recipe?.id] = fav.pantry_match;
            });
            setPantryMatchData(matchMap);
        } catch {
            // non-critical, silently ignore
        } finally {
            setLoadingPantryMatch(false);
        }
    }, [isAuthenticated]);

    useEffect(() => { loadRecipes(); }, [loadRecipes]);
    useEffect(() => { if (tab === 'mine') loadMyRecipes(); }, [tab, loadMyRecipes]);
    useEffect(() => {
        if (tab === 'favorites') {
            loadFavorites();
            loadPantryMatch();
        }
    }, [tab, loadFavorites, loadPantryMatch]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (difficulty) params.set('difficulty', difficulty);
        if (preference) params.set('preference', preference);
        if (maxTime) params.set('max_time', maxTime);
        if (ordering !== '-created_at') params.set('ordering', ordering);
        setSearchParams(params, { replace: true });
    }, [searchQuery, difficulty, preference, maxTime, ordering, setSearchParams]);

    // ── Favorites computed ───────────────────────────────────────────────────

    const difficultyCounts = useMemo(() => {
        const counts = { easy: 0, medium: 0, hard: 0 };
        favorites.forEach(fav => {
            const d = fav.recipe?.difficulty;
            if (d && d in counts) counts[d]++;
        });
        return counts;
    }, [favorites]);

    const canMakeCount = useMemo(() =>
        Object.values(pantryMatchData).filter(m => m.can_make_now).length,
    [pantryMatchData]);

    const filteredFavorites = useMemo(() => {
        let result = [...favorites];
        if (favSearch) {
            const q = favSearch.toLowerCase();
            result = result.filter(f =>
                f.recipe?.title?.toLowerCase().includes(q) ||
                f.recipe?.description?.toLowerCase().includes(q)
            );
        }
        if (favDifficulty !== 'all') {
            result = result.filter(f => f.recipe?.difficulty === favDifficulty);
        }
        if (showCanMakeOnly) {
            result = result.filter(f => pantryMatchData[f.recipe?.id]?.can_make_now);
        }
        result.sort((a, b) => {
            if (favSortBy === 'title')
                return (a.recipe?.title || '').localeCompare(b.recipe?.title || '');
            if (favSortBy === 'difficulty') {
                const o = { easy: 1, medium: 2, hard: 3 };
                return (o[a.recipe?.difficulty] || 0) - (o[b.recipe?.difficulty] || 0);
            }
            if (favSortBy === 'time') {
                const ta = (a.recipe?.prep_time || 0) + (a.recipe?.cook_time || 0);
                const tb = (b.recipe?.prep_time || 0) + (b.recipe?.cook_time || 0);
                return ta - tb;
            }
            if (favSortBy === 'match') {
                const ma = pantryMatchData[a.recipe?.id]?.match_percentage || 0;
                const mb = pantryMatchData[b.recipe?.id]?.match_percentage || 0;
                return mb - ma;
            }
            return new Date(b.saved_at) - new Date(a.saved_at);
        });
        return result;
    }, [favorites, favSearch, favDifficulty, showCanMakeOnly, favSortBy, pantryMatchData]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSearch = (e) => { e.preventDefault(); loadRecipes(); };

    const handleClearFilters = () => {
        setSearchQuery(''); setDifficulty(''); setPreference('');
        setMaxTime(''); setOrdering('-created_at');
    };

    const handleFavoriteToggle = (recipeId, isFavorited) => {
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r));
    };

    const handleMyFavoriteToggle = (recipeId, isFavorited) => {
        setMyRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r));
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
            setRecipes(prev => prev.filter(r => r.id !== recipeId));
        } catch {
            setMyError('Failed to delete recipe.');
        }
    };

    const handleRemoveFavorite = async (favoriteId) => {
        try {
            await favoritesAPI.remove(favoriteId);
            setFavorites(prev => prev.filter(f => f.id !== favoriteId));
            setFavSuccess('Removed from favorites');
            setTimeout(() => setFavSuccess(''), 2000);
        } catch {
            setFavError('Failed to remove favorite.');
        }
    };

    const handleClearFavorites = async () => {
        setClearLoading(true);
        try {
            await favoritesAPI.clear();
            setFavorites([]);
            setPantryMatchData({});
            setFavSuccess('All favorites cleared');
            setTimeout(() => setFavSuccess(''), 3000);
        } catch {
            setFavError('Failed to clear favorites.');
        } finally {
            setClearLoading(false);
            setShowClearModal(false);
        }
    };

    const hasActiveFilters = searchQuery || difficulty || preference || maxTime || ordering !== '-created_at';
    const hasFavFilters = favSearch || favDifficulty !== 'all' || showCanMakeOnly;

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
                        {isAuthenticated && (
                            <button
                                className={`recipes-tab ${tab === 'favorites' ? 'active' : ''}`}
                                onClick={() => setTab('favorites')}
                            >
                                Favorites
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
                                message={hasActiveFilters
                                    ? "Try adjusting your filters or search query"
                                    : "No public recipes yet."}
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

                {/* ── Favorites Tab ── */}
                {tab === 'favorites' && isAuthenticated && (
                    <>
                        <PageHeader
                            title="My Favorites"
                            subtitle={`${favorites.length} saved recipe${favorites.length !== 1 ? 's' : ''}`}
                        >
                            {favorites.length > 0 && (
                                <div className="view-toggle">
                                    <button
                                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')} title="Grid view">▦</button>
                                    <button
                                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')} title="List view">☰</button>
                                </div>
                            )}
                        </PageHeader>

                        {favError && <Alert type="error" message={favError} onClose={() => setFavError('')} />}
                        {favSuccess && <Alert type="success" message={favSuccess} onClose={() => setFavSuccess('')} />}

                        {favLoading ? (
                            <Loading message="Loading your favorites..." />
                        ) : favorites.length === 0 ? (
                            <EmptyState
                                icon="❤️"
                                title="No favorites yet"
                                message="Browse recipes and tap the heart to save your favorites here."
                                actionText="Browse Recipes"
                                onAction={() => setTab('browse')}
                            />
                        ) : (
                            <>
                                {/* Stats */}
                                <div className="favorites-stats">
                                    <div className="stat-card">
                                        <div className="stat-icon">❤️</div>
                                        <div className="stat-info">
                                            <span className="stat-value">{favorites.length}</span>
                                            <span className="stat-label">Total Saved</span>
                                        </div>
                                    </div>
                                    <div
                                        className={`stat-card clickable ${showCanMakeOnly ? 'active' : ''}`}
                                        onClick={() => setShowCanMakeOnly(v => !v)}
                                    >
                                        <div className="stat-icon">✨</div>
                                        <div className="stat-info">
                                            <span className="stat-value">{canMakeCount}</span>
                                            <span className="stat-label">Can Make Now</span>
                                        </div>
                                        {loadingPantryMatch && <span className="loading-dot">...</span>}
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📊</div>
                                        <div className="stat-info">
                                            <span className="stat-value mini-stats">
                                                <span className="difficulty-easy">{difficultyCounts.easy} easy</span>
                                                <span className="difficulty-medium">{difficultyCounts.medium} med</span>
                                                <span className="difficulty-hard">{difficultyCounts.hard} hard</span>
                                            </span>
                                            <span className="stat-label">By Difficulty</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="favorites-filters">
                                    <div className="search-box">
                                        <span className="search-icon">🔍</span>
                                        <input
                                            type="text"
                                            placeholder="Search favorites..."
                                            value={favSearch}
                                            onChange={(e) => setFavSearch(e.target.value)}
                                            className="search-input"
                                        />
                                        {favSearch && (
                                            <button className="clear-search" onClick={() => setFavSearch('')}>×</button>
                                        )}
                                    </div>
                                    <div className="filter-group">
                                        <select value={favDifficulty}
                                            onChange={(e) => setFavDifficulty(e.target.value)}
                                            className="filter-select">
                                            <option value="all">All Difficulties</option>
                                            <option value="easy">Easy ({difficultyCounts.easy})</option>
                                            <option value="medium">Medium ({difficultyCounts.medium})</option>
                                            <option value="hard">Hard ({difficultyCounts.hard})</option>
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <select value={favSortBy}
                                            onChange={(e) => setFavSortBy(e.target.value)}
                                            className="filter-select">
                                            <option value="saved_at">Recently Saved</option>
                                            <option value="title">Title (A-Z)</option>
                                            <option value="difficulty">Difficulty</option>
                                            <option value="time">Cooking Time</option>
                                            <option value="match">Pantry Match</option>
                                        </select>
                                    </div>
                                    <button
                                        className={`filter-btn-toggle ${showCanMakeOnly ? 'active' : ''}`}
                                        onClick={() => setShowCanMakeOnly(v => !v)}
                                    >
                                        ✨ Can Make Now
                                    </button>
                                    {hasFavFilters && (
                                        <button className="btn btn-outline btn-small"
                                            onClick={() => { setFavSearch(''); setFavDifficulty('all'); setShowCanMakeOnly(false); }}>
                                            Clear Filters
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-outline btn-small btn-danger-outline"
                                        onClick={() => setShowClearModal(true)}
                                    >
                                        🗑️ Clear All
                                    </button>
                                </div>

                                <div className="results-info">
                                    <p>Showing {filteredFavorites.length} of {favorites.length} favorites</p>
                                </div>

                                {filteredFavorites.length > 0 ? (
                                    <div className={`favorites-grid ${viewMode}`}>
                                        {filteredFavorites.map(favorite => (
                                            <FavoriteCard
                                                key={favorite.id}
                                                favorite={favorite}
                                                onRemove={handleRemoveFavorite}
                                                pantryMatch={pantryMatchData[favorite.recipe?.id]}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="no-results-box">
                                        <p>No favorites match your filters.</p>
                                        <button className="btn btn-outline btn-small"
                                            onClick={() => { setFavSearch(''); setFavDifficulty('all'); setShowCanMakeOnly(false); }}>
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </>
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

            <ConfirmModal
                isOpen={showClearModal}
                title="Clear All Favorites"
                message={`Are you sure you want to remove all ${favorites.length} favorites? This cannot be undone.`}
                confirmText={clearLoading ? 'Clearing...' : 'Clear All'}
                cancelText="Cancel"
                onConfirm={handleClearFavorites}
                onCancel={() => setShowClearModal(false)}
                danger
            />
        </div>
    );
};

export default Recipes;
