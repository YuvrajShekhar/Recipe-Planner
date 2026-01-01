import React, { useState, useEffect, useMemo } from 'react';
import { ingredientAPI } from '../../services/api';

const AddToPantryModal = ({ isOpen, onClose, onAdd, existingIngredientIds = [] }) => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    
    // Selected ingredients to add
    const [selectedIngredients, setSelectedIngredients] = useState([]);
    const [addingLoading, setAddingLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadIngredients();
            loadCategories();
            setSelectedIngredients([]);
            setSearchQuery('');
            setSelectedCategory('all');
        }
    }, [isOpen]);

    const loadIngredients = async () => {
        try {
            setLoading(true);
            const response = await ingredientAPI.getAll();
            setIngredients(response.data.ingredients || []);
        } catch (err) {
            console.error('Error loading ingredients:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await ingredientAPI.getCategories();
            const rawCategories = response.data.categories || [];
            const processedCategories = rawCategories.map(cat => {
                if (Array.isArray(cat)) {
                    return cat[0];
                }
                return cat;
            });
            setCategories(processedCategories);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const availableIngredients = useMemo(() => {
        return ingredients.filter(ing => !existingIngredientIds.includes(ing.id));
    }, [ingredients, existingIngredientIds]);

    const filteredIngredients = useMemo(() => {
        return availableIngredients.filter(ing => {
            const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || ing.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [availableIngredients, searchQuery, selectedCategory]);

    const isSelected = (ingredientId) => {
        return selectedIngredients.some(item => item.ingredient_id === ingredientId);
    };

    const toggleIngredient = (ingredient) => {
        if (isSelected(ingredient.id)) {
            setSelectedIngredients(selectedIngredients.filter(item => item.ingredient_id !== ingredient.id));
        } else {
            setSelectedIngredients([
                ...selectedIngredients, 
                { ingredient_id: ingredient.id, name: ingredient.name, quantity: null }
            ]);
        }
    };

    const updateQuantity = (ingredientId, quantity) => {
        setSelectedIngredients(selectedIngredients.map(item => 
            item.ingredient_id === ingredientId 
                ? { ...item, quantity: quantity ? parseFloat(quantity) : null }
                : item
        ));
    };

    const handleAdd = async () => {
        if (selectedIngredients.length === 0) return;
        
        setAddingLoading(true);
        try {
            await onAdd(selectedIngredients);
            onClose();
        } catch (err) {
            console.error('Error adding ingredients:', err);
        } finally {
            setAddingLoading(false);
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add Ingredients to Pantry</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Search and Filter */}
                    <div className="modal-controls">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search ingredients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {getCategoryLabel(cat)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected Items Preview */}
                    {selectedIngredients.length > 0 && (
                        <div className="selected-preview">
                            <h4>Selected ({selectedIngredients.length})</h4>
                            <div className="selected-items">
                                {selectedIngredients.map(item => (
                                    <div key={item.ingredient_id} className="selected-item">
                                        <span className="item-name">{item.name}</span>
                                        <input
                                            type="number"
                                            placeholder="Qty (optional)"
                                            value={item.quantity || ''}
                                            onChange={(e) => updateQuantity(item.ingredient_id, e.target.value)}
                                            className="qty-input"
                                            step="0.01"
                                            min="0"
                                        />
                                        <button 
                                            className="remove-btn"
                                            onClick={() => toggleIngredient({ id: item.ingredient_id })}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ingredients List */}
                    <div className="ingredients-grid-modal">
                        {loading ? (
                            <div className="loading-center">
                                <div className="spinner"></div>
                                <p>Loading ingredients...</p>
                            </div>
                        ) : filteredIngredients.length > 0 ? (
                            filteredIngredients.map(ing => (
                                <button
                                    key={ing.id}
                                    className={`ingredient-btn-modal ${isSelected(ing.id) ? 'selected' : ''}`}
                                    onClick={() => toggleIngredient(ing)}
                                >
                                    <span className="ing-icon">{getCategoryIcon(ing.category)}</span>
                                    <span className="ing-name">{ing.name}</span>
                                    {isSelected(ing.id) && <span className="check">✓</span>}
                                </button>
                            ))
                        ) : (
                            <div className="no-results">
                                {availableIngredients.length === 0 ? (
                                    <p>All ingredients are already in your pantry! 🎉</p>
                                ) : (
                                    <p>No ingredients found matching your search.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={handleAdd}
                        disabled={selectedIngredients.length === 0 || addingLoading}
                    >
                        {addingLoading ? 'Adding...' : `Add ${selectedIngredients.length} Ingredient${selectedIngredients.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddToPantryModal;