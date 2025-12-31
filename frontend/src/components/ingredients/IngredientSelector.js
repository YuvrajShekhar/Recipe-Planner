import React, { useState, useEffect, useMemo } from 'react';
import { ingredientAPI } from '../../services/api';

const IngredientSelector = ({ 
    selectedIngredients, 
    onSelectionChange,
    maxSelections = 50 
}) => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadIngredients();
        loadCategories();
    }, []);

    const loadIngredients = async () => {
        try {
            setLoading(true);
            const response = await ingredientAPI.getAll();
            setIngredients(response.data.ingredients || []);
        } catch (err) {
            console.error('Error loading ingredients:', err);
            setError('Failed to load ingredients');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await ingredientAPI.getCategories();
            const rawCategories = response.data.categories || [];
            
            // Handle both formats: array of strings OR array of [value, label] tuples
            const processedCategories = rawCategories.map(cat => {
                if (Array.isArray(cat)) {
                    // Format: ['meat', 'Meat'] - return the value (first element)
                    return cat[0];
                } else if (typeof cat === 'object' && cat !== null) {
                    // Format: {value: 'meat', label: 'Meat'}
                    return cat.value || cat.id || cat.name;
                } else {
                    // Format: 'meat' - already a string
                    return cat;
                }
            });
            
            setCategories(processedCategories);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ing => {
            const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || ing.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [ingredients, searchQuery, activeCategory]);

    const groupedIngredients = useMemo(() => {
        const groups = {};
        filteredIngredients.forEach(ing => {
            const category = ing.category || 'other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(ing);
        });
        return groups;
    }, [filteredIngredients]);

    const isSelected = (ingredientId) => {
        return selectedIngredients.some(ing => ing.id === ingredientId);
    };

    const toggleIngredient = (ingredient) => {
        if (isSelected(ingredient.id)) {
            onSelectionChange(selectedIngredients.filter(ing => ing.id !== ingredient.id));
        } else {
            if (selectedIngredients.length < maxSelections) {
                onSelectionChange([...selectedIngredients, ingredient]);
            }
        }
    };

    const clearAll = () => {
        onSelectionChange([]);
    };

    const selectByCategory = (category) => {
        const categoryIngredients = ingredients.filter(ing => ing.category === category);
        const newSelection = [...selectedIngredients];
        
        categoryIngredients.forEach(ing => {
            if (!isSelected(ing.id) && newSelection.length < maxSelections) {
                newSelection.push(ing);
            }
        });
        
        onSelectionChange(newSelection);
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
        // Handle null, undefined, or non-string values
        if (!category || typeof category !== 'string') {
            return 'Other';
        }
        return category.charAt(0).toUpperCase() + category.slice(1);
    };

    if (loading) {
        return (
            <div className="ingredient-selector loading">
                <div className="spinner"></div>
                <p>Loading ingredients...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ingredient-selector error">
                <p>{error}</p>
                <button onClick={loadIngredients} className="btn btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="ingredient-selector">
            {/* Selected Ingredients */}
            <div className="selected-ingredients-section">
                <div className="section-header-row">
                    <h3>
                        Selected Ingredients 
                        <span className="count-badge">{selectedIngredients.length}</span>
                    </h3>
                    {selectedIngredients.length > 0 && (
                        <button 
                            className="btn btn-small btn-outline"
                            onClick={clearAll}
                        >
                            Clear All
                        </button>
                    )}
                </div>
                
                {selectedIngredients.length > 0 ? (
                    <div className="selected-tags">
                        {selectedIngredients.map(ing => (
                            <span 
                                key={ing.id} 
                                className="ingredient-tag selected"
                                onClick={() => toggleIngredient(ing)}
                            >
                                {getCategoryIcon(ing.category)} {ing.name}
                                <span className="remove-tag">×</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="empty-selection">
                        Click on ingredients below to add them
                    </p>
                )}
            </div>

            {/* Search and Filter */}
            <div className="ingredient-controls">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search ingredients..."
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

                <div className="category-tabs">
                    <button
                        className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('all')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ingredients List */}
            <div className="ingredients-list">
                {activeCategory === 'all' ? (
                    // Grouped view
                    Object.keys(groupedIngredients).length > 0 ? (
                        Object.entries(groupedIngredients).map(([category, ings]) => (
                            <div key={category} className="ingredient-group">
                                <div className="group-header">
                                    <h4>
                                        {getCategoryIcon(category)} {getCategoryLabel(category)}
                                        <span className="group-count">({ings.length})</span>
                                    </h4>
                                    <button
                                        className="btn btn-tiny btn-outline"
                                        onClick={() => selectByCategory(category)}
                                    >
                                        Select All
                                    </button>
                                </div>
                                <div className="ingredient-grid">
                                    {ings.map(ing => (
                                        <button
                                            key={ing.id}
                                            className={`ingredient-btn ${isSelected(ing.id) ? 'selected' : ''}`}
                                            onClick={() => toggleIngredient(ing)}
                                        >
                                            {ing.name}
                                            {isSelected(ing.id) && <span className="check">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            <p>No ingredients found matching "{searchQuery}"</p>
                        </div>
                    )
                ) : (
                    // Single category view
                    <div className="ingredient-grid single-category">
                        {filteredIngredients.length > 0 ? (
                            filteredIngredients.map(ing => (
                                <button
                                    key={ing.id}
                                    className={`ingredient-btn ${isSelected(ing.id) ? 'selected' : ''}`}
                                    onClick={() => toggleIngredient(ing)}
                                >
                                    {ing.name}
                                    {isSelected(ing.id) && <span className="check">✓</span>}
                                </button>
                            ))
                        ) : (
                            <div className="no-results">
                                <p>No ingredients found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IngredientSelector;