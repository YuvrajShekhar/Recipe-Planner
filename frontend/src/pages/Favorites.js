import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { favoritesAPI } from '../services/api';
import { FavoriteCard } from '../components/favorites';
import { Loading, Alert, PageHeader, EmptyState, ConfirmModal } from '../components/common';
import { useDocumentTitle } from '../hooks';

const Favorites = () => {
    useDocumentTitle('My Favorites');
    const { user } = useAuth();

    // Favorites state
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Pantry match data
    const [pantryMatchData, setPantryMatchData] = useState({});
    const [loadingPantryMatch, setLoadingPantryMatch] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [sortBy, setSortBy] = useState('saved_at');
    const [showCanMakeOnly, setShowCanMakeOnly] = useState(false);

    // Modal state
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);

    // View mode
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    useEffect(() => {
        loadFavorites();
        loadPantryMatch();
    }, []);

    const loadFavorites = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await favoritesAPI.getAll();
            setFavorites(response.data.favorites || []);
        } catch (err) {
            console.error('Error loading favorites:', err);
            setError('Failed to load favorites. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadPantryMatch = async () => {
        try {
            setLoadingPantryMatch(true);
            const response = await favoritesAPI.withPantryMatch();
            
            // Create a map of recipe_id to pantry match data
            const matchMap = {};
            (response.data.favorites || []).forEach(fav => {
                if (fav.pantry_match) {
                    matchMap[fav.recipe?.id] = fav.pantry_match;
                }
            });
            setPantryMatchData(matchMap);
        } catch (err) {
            console.error('Error loading pantry match:', err);
        } finally {
            setLoadingPantryMatch(false);
        }
    };

    // Get difficulty counts
    const difficultyCounts = useMemo(() => {
        const counts = { easy: 0, medium: 0, hard: 0 };
        favorites.forEach(fav => {
            const diff = fav.recipe?.difficulty;
            if (diff && counts.hasOwnProperty(diff)) {
                counts[diff]++;
            }
        });
        return counts;
    }, [favorites]);

    // Get "can make now" count
    const canMakeCount = useMemo(() => {
        return Object.values(pantryMatchData).filter(m => m.can_make_now).length;
    }, [pantryMatchData]);

    // Filter and sort favorites
    const filteredFavorites = useMemo(() => {
        let result = [...favorites];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(fav => 
                fav.recipe?.title?.toLowerCase().includes(query) ||
                fav.recipe?.description?.toLowerCase().includes(query)
            );
        }

        // Difficulty filter
        if (selectedDifficulty !== 'all') {
            result = result.filter(fav => fav.recipe?.difficulty === selectedDifficulty);
        }

        // Can make filter
        if (showCanMakeOnly) {
            result = result.filter(fav => 
                pantryMatchData[fav.recipe?.id]?.can_make_now
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return (a.recipe?.title || '').localeCompare(b.recipe?.title || '');
                case 'difficulty':
                    const diffOrder = { easy: 1, medium: 2, hard: 3 };
                    return (diffOrder[a.recipe?.difficulty] || 0) - (diffOrder[b.recipe?.difficulty] || 0);
                case 'time':
                    const timeA = (a.recipe?.prep_time || 0) + (a.recipe?.cook_time || 0);
                    const timeB = (b.recipe?.prep_time || 0) + (b.recipe?.cook_time || 0);
                    return timeA - timeB;
                case 'match':
                    const matchA = pantryMatchData[a.recipe?.id]?.match_percentage || 0;
                    const matchB = pantryMatchData[b.recipe?.id]?.match_percentage || 0;
                    return matchB - matchA;
                case 'saved_at':
                default:
                    return new Date(b.saved_at) - new Date(a.saved_at);
            }
        });

        return result;
    }, [favorites, searchQuery, selectedDifficulty, showCanMakeOnly, sortBy, pantryMatchData]);

    const handleRemoveFavorite = async (favoriteId) => {
        try {
            await favoritesAPI.remove(favoriteId);
            setFavorites(favorites.filter(fav => fav.id !== favoriteId));
            setSuccess('Recipe removed from favorites');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Error removing favorite:', err);
            setError('Failed to remove favorite');
            throw err;
        }
    };

    const handleClearFavorites = async () => {
        setClearLoading(true);
        try {
            await favoritesAPI.clear();
            setFavorites([]);
            setPantryMatchData({});
            setSuccess('All favorites cleared');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error clearing favorites:', err);
            setError('Failed to clear favorites');
        } finally {
            setClearLoading(false);
            setShowClearModal(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedDifficulty('all');
        setShowCanMakeOnly(false);
        setSortBy('saved_at');
    };

    const hasActiveFilters = searchQuery || selectedDifficulty !== 'all' || showCanMakeOnly;

    return (
        <div className="favorites-page">
            <div className="container">
                <PageHeader 
                    title="My Favorites" 
                    subtitle={`${favorites.length} saved recipe${favorites.length !== 1 ? 's' : ''}`}
                >
                    {favorites.length > 0 && (
                        <div className="header-actions">
                            <div className="view-toggle">
                                <button 
                                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid view"
                                >
                                    ▦
                                </button>
                                <button 
                                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    title="List view"
                                >
                                    ☰
                                </button>
                            </div>
                        </div>
                    )}
                </PageHeader>

                {/* Alerts */}
                {error && (
                    <Alert type="error" message={error} onClose={() => setError('')} />
                )}
                {success && (
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                )}

                {loading ? (
                    <Loading message="Loading your favorites..." />
                ) : favorites.length === 0 ? (
                    <EmptyState
                        icon="❤️"
                        title="No favorites yet"
                        message="Start exploring recipes and save your favorites for quick access"
                        actionText="Browse Recipes"
                        actionLink="/recipes"
                    />
                ) : (
                    <>
                        {/* Stats Cards */}
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
                                onClick={() => setShowCanMakeOnly(!showCanMakeOnly)}
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
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                                {searchQuery && (
                                    <button 
                                        className="clear-search"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <div className="filter-group">
                                <select
                                    value={selectedDifficulty}
                                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Difficulties</option>
                                    <option value="easy">Easy ({difficultyCounts.easy})</option>
                                    <option value="medium">Medium ({difficultyCounts.medium})</option>
                                    <option value="hard">Hard ({difficultyCounts.hard})</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="saved_at">Recently Saved</option>
                                    <option value="title">Title (A-Z)</option>
                                    <option value="difficulty">Difficulty</option>
                                    <option value="time">Cooking Time</option>
                                    <option value="match">Pantry Match</option>
                                </select>
                            </div>

                            <button
                                className={`filter-btn-toggle ${showCanMakeOnly ? 'active' : ''}`}
                                onClick={() => setShowCanMakeOnly(!showCanMakeOnly)}
                            >
                                ✨ Can Make Now
                            </button>

                            {hasActiveFilters && (
                                <button 
                                    className="btn btn-outline btn-small"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </button>
                            )}

                            {favorites.length > 0 && (
                                <button 
                                    className="btn btn-outline btn-small btn-danger-outline"
                                    onClick={() => setShowClearModal(true)}
                                >
                                    🗑️ Clear All
                                </button>
                            )}
                        </div>

                        {/* Results Info */}
                        <div className="results-info">
                            <p>
                                Showing {filteredFavorites.length} of {favorites.length} favorites
                                {showCanMakeOnly && ' (can make now)'}
                            </p>
                        </div>

                        {/* Favorites Grid/List */}
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
                                <button 
                                    className="btn btn-outline btn-small"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="favorites-actions">
                            <Link to="/match" className="action-card">
                                <span className="action-icon">🔍</span>
                                <div className="action-info">
                                    <h4>Find More Recipes</h4>
                                    <p>Discover recipes based on your ingredients</p>
                                </div>
                                <span className="action-arrow">→</span>
                            </Link>
                            <Link to="/pantry" className="action-card">
                                <span className="action-icon">📦</span>
                                <div className="action-info">
                                    <h4>Update Pantry</h4>
                                    <p>Keep your pantry up to date for better matches</p>
                                </div>
                                <span className="action-arrow">→</span>
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* Clear Confirmation Modal */}
            <ConfirmModal
                isOpen={showClearModal}
                title="Clear All Favorites"
                message={`Are you sure you want to remove all ${favorites.length} favorites? This action cannot be undone.`}
                confirmText={clearLoading ? "Clearing..." : "Clear All"}
                cancelText="Cancel"
                onConfirm={handleClearFavorites}
                onCancel={() => setShowClearModal(false)}
                danger
            />
        </div>
    );
};

export default Favorites;