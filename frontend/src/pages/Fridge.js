import React, { useState, useEffect } from 'react';
import { fridgeAPI, recipeAPI } from '../services/api';
import '../styles/Fridge.css';

const Fridge = () => {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cook modal state
  const [showCookModal, setShowCookModal] = useState(false);
  const [allRecipes, setAllRecipes] = useState([]);
  const [cookForm, setCookForm] = useState({ recipe_id: '', portions: 1 });
  const [cookLoading, setCookLoading] = useState(false);
  const [cookError, setCookError] = useState('');
  const [missingIngredients, setMissingIngredients] = useState([]);
  const [pendingForce, setPendingForce] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadFridge = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fridgeAPI.getAll();
      setFridgeItems(res.data.fridge_items || []);
    } catch {
      setError('Failed to load fridge.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const res = await recipeAPI.getAll();
      setAllRecipes(res.data.recipes || []);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    loadFridge();
  }, []);

  // ── Cook flow ──────────────────────────────────────────────────────────────

  const openCookModal = () => {
    setCookForm({ recipe_id: '', portions: 1 });
    setCookError('');
    setMissingIngredients([]);
    setPendingForce(false);
    setShowCookModal(true);
    if (allRecipes.length === 0) loadRecipes();
  };

  const handleCookSubmit = async (force = false) => {
    if (!cookForm.recipe_id) { setCookError('Please select a recipe.'); return; }
    if (!cookForm.portions || cookForm.portions <= 0) { setCookError('Portions must be greater than 0.'); return; }

    setCookLoading(true);
    setCookError('');
    setMissingIngredients([]);

    try {
      const res = await fridgeAPI.cook({
        recipe_id: parseInt(cookForm.recipe_id),
        portions: parseFloat(cookForm.portions),
        force,
      });
      setShowCookModal(false);
      setPendingForce(false);
      await loadFridge();
      alert(res.data.message);
    } catch (err) {
      const data = err.response?.data;
      if (data?.missing && !force) {
        // Show missing ingredients and ask user if they want to proceed anyway
        setMissingIngredients(data.missing);
        setPendingForce(true);
        setCookError('You are missing some ingredients (see below). Do you still want to cook?');
      } else {
        setCookError(data?.error || 'Failed to cook recipe.');
      }
    } finally {
      setCookLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.recipe.title}" from your fridge?`)) return;
    try {
      await fridgeAPI.delete(item.id);
      setFridgeItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      alert('Failed to remove item.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fridge-page">
      <div className="fridge-container">
        <header className="fridge-header">
          <div>
            <h1>My Fridge</h1>
            <p>Cooked dishes ready to eat. Cook a recipe to add it here.</p>
          </div>
          <button className="btn btn-primary" onClick={openCookModal}>
            + Cook a Recipe
          </button>
        </header>

        {error && <div className="fridge-error">{error}</div>}

        {loading ? (
          <div className="fridge-loading">Loading fridge...</div>
        ) : fridgeItems.length === 0 ? (
          <div className="fridge-empty">
            <span className="fridge-empty-icon">🧊</span>
            <p>Your fridge is empty.</p>
            <p>Cook a recipe and it will appear here!</p>
          </div>
        ) : (
          <div className="fridge-grid">
            {fridgeItems.map(item => (
              <div key={item.id} className="fridge-card">
                {item.recipe.thumbnail_url && (
                  <img
                    src={item.recipe.thumbnail_url}
                    alt={item.recipe.title}
                    className="fridge-card-img"
                  />
                )}
                <div className="fridge-card-body">
                  <h3 className="fridge-card-title">{item.recipe.title}</h3>
                  <div className="fridge-card-meta">
                    <span className="fridge-portions">
                      🍽 {parseFloat(item.portions)} portion{parseFloat(item.portions) !== 1 ? 's' : ''} left
                    </span>
                    <span className="fridge-cooked-at">Cooked {formatDate(item.cooked_at)}</span>
                  </div>
                  {item.notes && <p className="fridge-notes">{item.notes}</p>}
                  <div className="fridge-card-actions">
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(item)}
                    >
                      Throw Away
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cook Modal ── */}
      {showCookModal && (
        <div className="modal-overlay" onClick={() => setShowCookModal(false)}>
          <div className="modal-box fridge-cook-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cook a Recipe</h2>
              <button className="modal-close" onClick={() => setShowCookModal(false)}>✕</button>
            </div>

            <div className="fridge-cook-form">
              <div className="form-group">
                <label>Recipe</label>
                <select
                  className="form-control"
                  value={cookForm.recipe_id}
                  onChange={e => setCookForm(f => ({ ...f, recipe_id: e.target.value }))}
                >
                  <option value="">— select a recipe —</option>
                  {allRecipes.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Portions to cook</label>
                <input
                  className="form-control"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={cookForm.portions}
                  onChange={e => setCookForm(f => ({ ...f, portions: e.target.value }))}
                />
              </div>

              {cookError && <p className="fridge-cook-error">{cookError}</p>}

              {missingIngredients.length > 0 && (
                <div className="missing-ingredients-list">
                  <h4>Missing ingredients:</h4>
                  <table className="missing-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Needed</th>
                        <th>Available</th>
                        <th>Missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingIngredients.map((m, i) => (
                        <tr key={i}>
                          <td>{m.ingredient}</td>
                          <td>{m.needed} {m.unit}</td>
                          <td>{m.available} {m.unit}</td>
                          <td className="missing-qty">{Math.max(0, m.needed - m.available).toFixed(2)} {m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions">
                {pendingForce ? (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCookSubmit(true)}
                      disabled={cookLoading}
                    >
                      {cookLoading ? 'Cooking...' : 'Yes, Cook Anyway'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => { setPendingForce(false); setMissingIngredients([]); setCookError(''); }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCookSubmit(false)}
                      disabled={cookLoading}
                    >
                      {cookLoading ? 'Checking...' : 'Cook'}
                    </button>
                    <button className="btn btn-outline" onClick={() => setShowCookModal(false)}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fridge;
