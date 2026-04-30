import React, { useState } from 'react';

const PantryItem = ({ item, onUpdate, onRemove, availableUnits = [] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [quantity, setQuantity] = useState(item.quantity || '');
    const resolvedUnit = item.unit || item.ingredient?.unit || '';
    const [unit, setUnit] = useState(resolvedUnit);
    const [threshold, setThreshold] = useState(item.low_stock_threshold || '');
    const [thresholdUnit, setThresholdUnit] = useState(item.low_stock_unit || resolvedUnit);
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

    const unitOptions = (currentUnit) => {
        const opts = currentUnit && !availableUnits.includes(currentUnit)
            ? [currentUnit, ...availableUnits]
            : availableUnits;
        return opts;
    };

    const isLow = item.low_stock_threshold != null &&
        item.quantity != null &&
        parseFloat(item.quantity) < parseFloat(item.low_stock_threshold);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onUpdate(
                item.id,
                quantity ? parseFloat(quantity) : null,
                unit,
                threshold !== '' ? parseFloat(threshold) : '',
                thresholdUnit
            );
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
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setQuantity(item.quantity || '');
            setThreshold(item.low_stock_threshold || '');
            setIsEditing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`pantry-item ${loading ? 'loading' : ''} ${isLow ? 'low-stock' : ''}`}>
            <div className="pantry-item-info">
                <h4 className="pantry-item-name">
                    {item.ingredient?.name}
                    {isLow && <span className="low-stock-badge">⚠️ Low</span>}
                </h4>
                <span className="pantry-item-category">
                    {item.ingredient?.category?.charAt(0).toUpperCase() + item.ingredient?.category?.slice(1)}
                </span>
            </div>

            <div className="pantry-item-quantity">
                {isEditing ? (
                    <div className="quantity-edit-block">
                        <div className="quantity-edit">
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Qty"
                                autoFocus
                                step="0.001"
                                min="0"
                            />
                            <select
                                className="qty-unit-select"
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                            >
                                {!availableUnits.includes(unit) && unit && (
                                    <option value={unit}>{unit}</option>
                                )}
                                {availableUnits.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div className="threshold-edit">
                            <span className="threshold-label">Alert below</span>
                            <input
                                type="number"
                                className="threshold-input"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="—"
                                step="0.001"
                                min="0"
                            />
                            <select
                                className="qty-unit-select"
                                value={thresholdUnit}
                                onChange={(e) => setThresholdUnit(e.target.value)}
                            >
                                {unitOptions(thresholdUnit).map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div
                        className="quantity-display"
                        onClick={() => setIsEditing(true)}
                        title="Click to edit"
                    >
                        {item.quantity ? (
                            <>
                                <span className="qty-value">{item.quantity}</span>
                                <span className="qty-unit">{unit}</span>
                            </>
                        ) : (
                            <span className="qty-empty">Tap to set qty</span>
                        )}
                        <span className="edit-icon">✏️</span>
                    </div>
                )}
            </div>

            {!isEditing && item.low_stock_threshold && (
                <div className="pantry-item-threshold">
                    Alert: &lt; {item.low_stock_threshold} {item.low_stock_unit || unit}
                </div>
            )}

            <div className="pantry-item-date">
                Added {formatDate(item.added_at)}
            </div>

            <div className="pantry-item-actions">
                {isEditing ? (
                    <>
                        <button className="btn btn-small btn-success" onClick={handleSave} disabled={loading}>✓</button>
                        <button className="btn btn-small btn-secondary" onClick={() => {
                            setQuantity(item.quantity || '');
                            setThreshold(item.low_stock_threshold || '');
                            setIsEditing(false);
                        }}>✕</button>
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
