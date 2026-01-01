import React, { useState } from 'react';

const PantryItem = ({ item, onUpdate, onRemove }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [quantity, setQuantity] = useState(item.quantity || '');
    const [loading, setLoading] = useState(false);

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

    const handleSave = async () => {
        setLoading(true);
        try {
            await onUpdate(item.id, quantity ? parseFloat(quantity) : null);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating item:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        setLoading(true);
        try {
            await onRemove(item.id);
        } catch (err) {
            console.error('Error removing item:', err);
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setQuantity(item.quantity || '');
            setIsEditing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`pantry-item ${loading ? 'loading' : ''}`}>
            <div className="pantry-item-icon">
                {getCategoryIcon(item.ingredient?.category)}
            </div>

            <div className="pantry-item-info">
                <h4 className="pantry-item-name">{item.ingredient?.name}</h4>
                <span className="pantry-item-category">
                    {item.ingredient?.category?.charAt(0).toUpperCase() + item.ingredient?.category?.slice(1)}
                </span>
            </div>

            <div className="pantry-item-quantity">
                {isEditing ? (
                    <div className="quantity-edit">
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Qty"
                            autoFocus
                            step="0.01"
                            min="0"
                        />
                        <span className="unit">{item.ingredient?.unit}</span>
                    </div>
                ) : (
                    <div 
                        className="quantity-display"
                        onClick={() => setIsEditing(true)}
                        title="Click to edit quantity"
                    >
                        {item.quantity ? (
                            <>
                                <span className="qty-value">{item.quantity}</span>
                                <span className="qty-unit">{item.ingredient?.unit}</span>
                            </>
                        ) : (
                            <span className="qty-empty">No qty set</span>
                        )}
                        <span className="edit-icon">✏️</span>
                    </div>
                )}
            </div>

            <div className="pantry-item-date">
                Added {formatDate(item.added_at)}
            </div>

            <div className="pantry-item-actions">
                {isEditing ? (
                    <>
                        <button 
                            className="btn btn-small btn-success"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            ✓
                        </button>
                        <button 
                            className="btn btn-small btn-secondary"
                            onClick={() => {
                                setQuantity(item.quantity || '');
                                setIsEditing(false);
                            }}
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <button 
                        className="btn btn-small btn-danger"
                        onClick={handleRemove}
                        disabled={loading}
                        title="Remove from pantry"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
};

export default PantryItem;