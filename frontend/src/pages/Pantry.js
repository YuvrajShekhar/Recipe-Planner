import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pantryAPI } from '../services/api';
import { PantryItem, AddToPantryModal } from '../components/pantry';
import { Loading, Alert, PageHeader, EmptyState, ConfirmModal } from '../components/common';
import { useDocumentTitle } from '../hooks';

const Pantry = () => {
    useDocumentTitle('My Pantry');
    const { isAuthenticated } = useAuth();
    // Pantry state
    const [pantryItems, setPantryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);

    useEffect(() => {
        loadPantry();
    }, []);

    const loadPantry = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await pantryAPI.getAll();
            setPantryItems(response.data.pantry_items || []);
        } catch (err) {
            console.error('Error loading pantry:', err);
            setError('Failed to load pantry. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get unique categories from pantry items
    const categories = useMemo(() => {
        const cats = new Set(pantryItems.map(item => item.ingredient?.category));
        return Array.from(cats).filter(Boolean).sort();
    }, [pantryItems]);

    // Filter pantry items
    const filteredItems = useMemo(() => {
        return pantryItems.filter(item => {
            const matchesSearch = item.ingredient?.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' ||
                item.ingredient?.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [pantryItems, searchQuery, selectedCategory]);

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups = {};
        filteredItems.forEach(item => {
            const category = item.ingredient?.category || 'other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
        });
        return groups;
    }, [filteredItems]);

    // Get category summary
    const categorySummary = useMemo(() => {
        const summary = {};
        pantryItems.forEach(item => {
            const category = item.ingredient?.category || 'other';
            summary[category] = (summary[category] || 0) + 1;
        });
        return summary;
    }, [pantryItems]);

    const handleAddIngredients = async (ingredients) => {
        try {
            const formattedIngredients = ingredients.map(ing => ({
                ingredient_id: ing.ingredient_id,
                quantity: ing.quantity
            }));

            await pantryAPI.addMultiple(formattedIngredients);
            setSuccess(`Added ${ingredients.length} ingredient${ingredients.length !== 1 ? 's' : ''} to pantry`);
            loadPantry();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error adding ingredients:', err);
            setError('Failed to add ingredients. Please try again.');
        }
    };

    const handleUpdateItem = async (itemId, quantity) => {
        try {
            await pantryAPI.update(itemId, quantity);
            setPantryItems(pantryItems.map(item =>
                item.id === itemId ? { ...item, quantity } : item
            ));
            setSuccess('Quantity updated');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Error updating item:', err);
            setError('Failed to update item');
            throw err;
        }
    };

    const handleRemoveItem = async (itemId) => {
        try {
            await pantryAPI.remove(itemId);
            setPantryItems(pantryItems.filter(item => item.id !== itemId));
            setSuccess('Item removed from pantry');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Error removing item:', err);
            setError('Failed to remove item');
            throw err;
        }
    };

    const handleClearPantry = async () => {
        setClearLoading(true);
        try {
            await pantryAPI.clear();
            setPantryItems([]);
            setSuccess('Pantry cleared successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error clearing pantry:', err);
            setError('Failed to clear pantry');
        } finally {
            setClearLoading(false);
            setShowClearModal(false);
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'meat': '🥩',
            'vegetable': '🥬',
            'fruit': '🍎',
            'dairy': '🧀',
            'grain': '🌾',
            'spice': '🧂',
            'condiment': '🫙',
            'seafood': '🦐',
            'other': '📦'
        };
        return icons[category] || '📦';
    };

    const getCategoryLabel = (category) => {
        if (!category || typeof category !== 'string') return 'Other';
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    const existingIngredientIds = pantryItems.map(item => item.ingredient?.id);

    return (
        <div className="pantry-page">
            <div className="container">
                <PageHeader
                    title="My Pantry"
                    subtitle={`${pantryItems.length} ingredient${pantryItems.length !== 1 ? 's' : ''} in your pantry`}
                >
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Add Ingredients
                    </button>
                </PageHeader>

                {/* Alerts */}
                {error && (
                    <Alert type="error" message={error} onClose={() => setError('')} />
                )}
                {success && (
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                )}

                {loading ? (
                    <Loading message="Loading your pantry..." />
                ) : pantryItems.length === 0 ? (
                    <EmptyState
                        icon="📦"
                        title="Your pantry is empty"
                        message="Start adding ingredients to track what you have at home and find matching recipes"
                        actionText="Add Your First Ingredient"
                        onAction={() => setShowAddModal(true)}
                    />
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="pantry-stats">
                            <div className="stat-card">
                                <div className="stat-icon">📦</div>
                                <div className="stat-info">
                                    <span className="stat-value">{pantryItems.length}</span>
                                    <span className="stat-label">Total Items</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📂</div>
                                <div className="stat-info">
                                    <span className="stat-value">{categories.length}</span>
                                    <span className="stat-label">Categories</span>
                                </div>
                            </div>
                            <div className="stat-card clickable" onClick={() => window.location.href = '/match'}>
                                <div className="stat-icon">🔍</div>
                                <div className="stat-info">
                                    <span className="stat-value">Find</span>
                                    <span className="stat-label">Matching Recipes</span>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="pantry-filters">
                            <div className="search-box">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search pantry items..."
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

                            <div className="filter-buttons">
                                <button
                                    className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory('all')}
                                >
                                    All ({pantryItems.length})
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {getCategoryLabel(cat)} ({categorySummary[cat] || 0})
                                    </button>
                                ))}
                            </div>

                            {pantryItems.length > 0 && (
                                <button
                                    className="btn btn-outline btn-small btn-danger-outline"
                                    onClick={() => setShowClearModal(true)}
                                >
                                    🗑️ Clear All
                                </button>
                            )}
                        </div>

                        {/* Pantry Items */}
                        <div className="pantry-content">
                            {filteredItems.length === 0 ? (
                                <div className="no-results-box">
                                    <p>No items match your search.</p>
                                    <button
                                        className="btn btn-outline btn-small"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('all');
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            ) : selectedCategory === 'all' ? (
                                // Grouped view
                                Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category} className="pantry-group">
                                        <div className="group-header">
                                            <h3>
                                                {getCategoryLabel(category)}
                                                <span className="group-count">{items.length}</span>
                                            </h3>
                                        </div>
                                        <div className="pantry-items-list">
                                            {items.map(item => (
                                                <PantryItem
                                                    key={item.id}
                                                    item={item}
                                                    onUpdate={handleUpdateItem}
                                                    onRemove={handleRemoveItem}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Single category view
                                <div className="pantry-items-list">
                                    {filteredItems.map(item => (
                                        <PantryItem
                                            key={item.id}
                                            item={item}
                                            onUpdate={handleUpdateItem}
                                            onRemove={handleRemoveItem}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="pantry-actions">
                            <Link to="/match" className="action-card">
                                <span className="action-icon">🔍</span>
                                <div className="action-info">
                                    <h4>Find Recipes</h4>
                                    <p>See what you can cook with your pantry ingredients</p>
                                </div>
                                <span className="action-arrow">→</span>
                            </Link>
                            <Link to="/recipes" className="action-card">
                                <span className="action-icon">📖</span>
                                <div className="action-info">
                                    <h4>Browse Recipes</h4>
                                    <p>Explore our full recipe collection</p>
                                </div>
                                <span className="action-arrow">→</span>
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* Add Ingredients Modal */}
            <AddToPantryModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddIngredients}
                existingIngredientIds={existingIngredientIds}
            />

            {/* Clear Confirmation Modal */}
            <ConfirmModal
                isOpen={showClearModal}
                title="Clear Pantry"
                message={`Are you sure you want to remove all ${pantryItems.length} items from your pantry? This action cannot be undone.`}
                confirmText={clearLoading ? "Clearing..." : "Clear All"}
                cancelText="Cancel"
                onConfirm={handleClearPantry}
                onCancel={() => setShowClearModal(false)}
                danger
            />
        </div>
    );
};

export default Pantry;