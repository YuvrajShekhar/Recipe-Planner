import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pantryAPI, cartAPI } from '../services/api';
import { Loading, Alert, PageHeader } from '../components/common';
import { useDocumentTitle } from '../hooks';

const ShoppingCart = () => {
    useDocumentTitle('Shopping Cart');

    // Pantry low-stock section
    const [pantryItems, setPantryItems] = useState([]);
    const [pantryLoading, setPantryLoading] = useState(true);
    const [checked, setChecked] = useState({});
    const [purchased, setPurchased] = useState({});
    const [restocking, setRestocking] = useState({});

    // Manual list section
    const [cartItems, setCartItems] = useState([]);
    const [cartLoading, setCartLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newNote, setNewNote] = useState('');
    const [adding, setAdding] = useState(false);

    const [error, setError] = useState('');

    useEffect(() => {
        loadPantry();
        loadCart();
    }, []);

    const loadPantry = async () => {
        try {
            setPantryLoading(true);
            const res = await pantryAPI.getLowStock();
            setPantryItems(res.data.pantry_items || []);
        } catch {
            setError('Failed to load pantry alerts.');
        } finally {
            setPantryLoading(false);
        }
    };

    const loadCart = async () => {
        try {
            setCartLoading(true);
            const res = await cartAPI.getAll();
            setCartItems(res.data.items || []);
        } catch {
            setError('Failed to load cart items.');
        } finally {
            setCartLoading(false);
        }
    };

    // ── Pantry restock handlers ──────────────────────────────────────────────

    const formatQty = (val) => {
        if (val === null || val === undefined) return '0';
        const n = parseFloat(val);
        return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
    };

    const handlePantryCheck = (itemId) => {
        setChecked(prev => {
            const nowChecked = !prev[itemId];
            if (!nowChecked) setPurchased(p => ({ ...p, [itemId]: '' }));
            return { ...prev, [itemId]: nowChecked };
        });
    };

    const handleRestock = async (item) => {
        const amount = parseFloat(purchased[item.id]);
        if (!amount || amount <= 0) return;
        const newQty = (parseFloat(item.quantity) || 0) + amount;
        setRestocking(prev => ({ ...prev, [item.id]: true }));
        try {
            await pantryAPI.update(item.id, newQty, item.unit, item.low_stock_threshold, item.low_stock_unit);
            const threshold = parseFloat(item.low_stock_threshold) || 0;
            if (newQty >= threshold) {
                setPantryItems(prev => prev.filter(i => i.id !== item.id));
            } else {
                setPantryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
            }
            setChecked(prev => ({ ...prev, [item.id]: false }));
            setPurchased(prev => ({ ...prev, [item.id]: '' }));
        } catch {
            setError('Failed to update pantry.');
        } finally {
            setRestocking(prev => ({ ...prev, [item.id]: false }));
        }
    };

    // ── Manual cart handlers ─────────────────────────────────────────────────

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setAdding(true);
        try {
            const res = await cartAPI.add(newName.trim(), newNote.trim());
            setCartItems(prev => [res.data, ...prev]);
            setNewName('');
            setNewNote('');
        } catch {
            setError('Failed to add item.');
        } finally {
            setAdding(false);
        }
    };

    const handleToggle = async (item) => {
        const newChecked = !item.is_checked;
        setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: newChecked } : i));
        try {
            await cartAPI.toggle(item.id, newChecked);
        } catch {
            setCartItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: item.is_checked } : i));
        }
    };

    const handleRemoveItem = async (id) => {
        setCartItems(prev => prev.filter(i => i.id !== id));
        try {
            await cartAPI.remove(id);
        } catch {
            setError('Failed to remove item.');
            loadCart();
        }
    };

    const handleClearChecked = async () => {
        setCartItems(prev => prev.filter(i => !i.is_checked));
        try {
            await cartAPI.clearChecked();
        } catch {
            setError('Failed to clear checked items.');
            loadCart();
        }
    };

    const checkedCount = cartItems.filter(i => i.is_checked).length;

    return (
        <div className="shopping-cart-page">
            <div className="container">
                <PageHeader title="Shopping Cart" />

                {error && <Alert type="error" message={error} onClose={() => setError('')} />}

                <div className="cart-two-col">
                    {/* ── Pantry Alerts ───────────────────────────────── */}
                    <section className="cart-section">
                        <div className="cart-section-header">
                            <h3>Pantry Alerts</h3>
                            {pantryItems.length > 0 && (
                                <span className="cart-section-count">{pantryItems.length}</span>
                            )}
                        </div>

                        {pantryLoading ? (
                            <Loading message="Loading..." />
                        ) : pantryItems.length === 0 ? (
                            <div className="cart-empty-msg">
                                All stocked up — nothing below alert threshold.
                                <br />
                                <Link to="/pantry" className="cart-empty-link">Manage pantry →</Link>
                            </div>
                        ) : (
                            <>
                                <p className="cart-section-hint">
                                    Check off items you've bought and enter how much you got.
                                </p>
                                <div className="cart-list">
                                    {pantryItems.map(item => {
                                        const unit = item.unit || item.ingredient?.unit || '';
                                        const isChecked = !!checked[item.id];
                                        const isSaving = !!restocking[item.id];
                                        return (
                                            <div key={item.id} className={`cart-item ${isChecked ? 'cart-item-checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="cart-checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handlePantryCheck(item.id)}
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
                                                            type="number" min="0" step="0.01"
                                                            className="cart-qty-input"
                                                            placeholder="Amount"
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
                                <div className="cart-section-footer">
                                    <Link to="/pantry" className="btn btn-outline btn-small">Go to Pantry</Link>
                                </div>
                            </>
                        )}
                    </section>

                    {/* ── My List ─────────────────────────────────────── */}
                    <section className="cart-section">
                        <div className="cart-section-header">
                            <h3>My List</h3>
                            {cartItems.length > 0 && (
                                <span className="cart-section-count">{cartItems.length}</span>
                            )}
                        </div>

                        {/* Add item form */}
                        <form className="cart-add-form" onSubmit={handleAddItem}>
                            <input
                                className="cart-add-name"
                                type="text"
                                placeholder="Item name..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <input
                                className="cart-add-note"
                                type="text"
                                placeholder="Note (optional)"
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary btn-small"
                                disabled={adding || !newName.trim()}
                            >
                                {adding ? '...' : '+ Add'}
                            </button>
                        </form>

                        {cartLoading ? (
                            <Loading message="Loading..." />
                        ) : cartItems.length === 0 ? (
                            <div className="cart-empty-msg">No items yet. Add something above.</div>
                        ) : (
                            <>
                                <div className="cart-list">
                                    {cartItems.map(item => (
                                        <div key={item.id} className={`cart-item manual-item ${item.is_checked ? 'cart-item-done' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="cart-checkbox"
                                                checked={item.is_checked}
                                                onChange={() => handleToggle(item)}
                                            />
                                            <div className="cart-item-info">
                                                <span className="cart-item-name">{item.name}</span>
                                                {item.note && (
                                                    <span className="cart-item-category">{item.note}</span>
                                                )}
                                            </div>
                                            <button
                                                className="cart-remove-btn"
                                                onClick={() => handleRemoveItem(item.id)}
                                                title="Remove"
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                                {checkedCount > 0 && (
                                    <div className="cart-section-footer">
                                        <button
                                            className="btn btn-outline btn-small btn-danger-outline"
                                            onClick={handleClearChecked}
                                        >
                                            Clear {checkedCount} checked
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ShoppingCart;
