import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pantryAPI } from '../services/api';
import { Loading, Alert, PageHeader, EmptyState } from '../components/common';
import { useDocumentTitle } from '../hooks';

const ShoppingCart = () => {
    useDocumentTitle('Shopping Cart');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checked, setChecked] = useState({});
    const [purchased, setPurchased] = useState({});
    const [restocking, setRestocking] = useState({});

    useEffect(() => {
        loadLowStock();
    }, []);

    const loadLowStock = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await pantryAPI.getLowStock();
            setItems(res.data.pantry_items || []);
        } catch (err) {
            setError('Failed to load shopping cart. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatQty = (val) => {
        if (val === null || val === undefined) return '0';
        const n = parseFloat(val);
        return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
    };

    const handleCheck = (itemId) => {
        setChecked(prev => {
            const nowChecked = !prev[itemId];
            if (!nowChecked) {
                setPurchased(p => ({ ...p, [itemId]: '' }));
            }
            return { ...prev, [itemId]: nowChecked };
        });
    };

    const handleRestock = async (item) => {
        const amount = parseFloat(purchased[item.id]);
        if (!amount || amount <= 0) return;

        const currentQty = parseFloat(item.quantity) || 0;
        const newQty = currentQty + amount;

        setRestocking(prev => ({ ...prev, [item.id]: true }));
        try {
            await pantryAPI.update(item.id, newQty, item.unit, item.low_stock_threshold, item.low_stock_unit);

            const threshold = parseFloat(item.low_stock_threshold) || 0;
            if (newQty >= threshold) {
                setItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                setItems(prev => prev.map(i =>
                    i.id === item.id ? { ...i, quantity: newQty } : i
                ));
            }

            setChecked(prev => ({ ...prev, [item.id]: false }));
            setPurchased(prev => ({ ...prev, [item.id]: '' }));
        } catch (err) {
            setError('Failed to update pantry. Please try again.');
        } finally {
            setRestocking(prev => ({ ...prev, [item.id]: false }));
        }
    };

    return (
        <div className="shopping-cart-page">
            <div className="container">
                <PageHeader
                    title="Shopping Cart"
                    subtitle={
                        items.length === 0
                            ? 'No items below alert threshold'
                            : `${items.length} item${items.length !== 1 ? 's' : ''} need restocking`
                    }
                />

                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                {loading ? (
                    <Loading message="Loading shopping cart..." />
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="🛒"
                        title="Cart is empty"
                        message="All your pantry items are above their alert thresholds. Set low-stock alerts in your pantry to get notified here."
                        actionText="Go to Pantry"
                        onAction={() => window.location.href = '/pantry'}
                    />
                ) : (
                    <>
                        <div className="cart-info-banner">
                            Check off items you've bought and enter how much you got to update your pantry.
                        </div>

                        <div className="cart-list">
                            {items.map(item => {
                                const unit = item.unit || item.ingredient?.unit || '';
                                const isChecked = !!checked[item.id];
                                const isSaving = !!restocking[item.id];
                                return (
                                    <div key={item.id} className={`cart-item ${isChecked ? 'cart-item-checked' : ''}`}>
                                        <input
                                            type="checkbox"
                                            className="cart-checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCheck(item.id)}
                                        />
                                        <div className="cart-item-info">
                                            <span className="cart-item-name">{item.ingredient?.name}</span>
                                            <span className="cart-item-category">
                                                {item.ingredient?.category
                                                    ? item.ingredient.category.charAt(0).toUpperCase() + item.ingredient.category.slice(1)
                                                    : 'Other'}
                                            </span>
                                        </div>

                                        {isChecked ? (
                                            <div className="cart-restock-row">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="cart-qty-input"
                                                    placeholder="Amount bought"
                                                    value={purchased[item.id] || ''}
                                                    onChange={e => setPurchased(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    autoFocus
                                                />
                                                {unit && <span className="cart-unit-label">{unit}</span>}
                                                <button
                                                    className="btn btn-primary btn-small"
                                                    onClick={() => handleRestock(item)}
                                                    disabled={isSaving || !purchased[item.id]}
                                                >
                                                    {isSaving ? '...' : 'Add'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="cart-item-stock">
                                                <span className="stock-value stock-low">
                                                    {formatQty(item.quantity)} {unit}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="cart-actions">
                            <Link to="/pantry" className="btn btn-outline">
                                Go to Pantry
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShoppingCart;
