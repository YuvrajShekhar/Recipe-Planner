import { useState, useEffect } from 'react';
import { recipeAPI, ingredientAPI } from '../../services/api';
import NewIngredientModal from './NewIngredientModal';
import ImageUpload from './ImageUpload';

const UNITS = [
  'grams', 'kg', 'ml', 'liters',
  'tbsp', 'tsp', 'cups',
  'pieces', 'whole', 'slices', 'cloves', 'pinch',
];

const EMPTY_INGREDIENT_ROW = { ingredient_id: '', quantity: '', unit: 'grams' };

const CreateRecipeModal = ({ onCreated, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    prep_time: '',
    cook_time: '',
    servings: '4',
    difficulty: 'medium',
    preference: 'veg',
    image_url: '',
    thumbnail_url: '',
    is_public: false,
  });
  const [ingredientRows, setIngredientRows] = useState([{ ...EMPTY_INGREDIENT_ROW }]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [ingredientSearch, setIngredientSearch] = useState([]);   // per-row search text
  const [showNewIngredient, setShowNewIngredient] = useState(false);
  const [addingForRow, setAddingForRow] = useState(null);         // which row triggered popup
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ingredientAPI.getAll().then(res => {
      const list = res.data.ingredients || [];
      setAllIngredients(list);
      setIngredientSearch(ingredientRows.map(() => ''));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ingredient rows ──────────────────────────────────────────────────────

  const addRow = () => {
    setIngredientRows(rows => [...rows, { ...EMPTY_INGREDIENT_ROW }]);
    setIngredientSearch(s => [...s, '']);
  };

  const removeRow = (i) => {
    setIngredientRows(rows => rows.filter((_, idx) => idx !== i));
    setIngredientSearch(s => s.filter((_, idx) => idx !== i));
  };

  const updateRow = (i, field, value) => {
    setIngredientRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const updateSearch = (i, value) => {
    setIngredientSearch(s => s.map((v, idx) => idx === i ? value : v));
    // If user selects from filtered list, clear search after selection
  };

  // Filtered ingredient list for a given row's search text
  const filteredIngredients = (i) => {
    const q = (ingredientSearch[i] || '').toLowerCase();
    if (!q) return allIngredients;
    return allIngredients.filter(ing => ing.name.toLowerCase().includes(q));
  };

  // Called when user picks an ingredient from the select
  const handleIngredientSelect = (i, ingredientId) => {
    updateRow(i, 'ingredient_id', ingredientId);
    // Auto-fill unit from ingredient's default unit
    if (ingredientId) {
      const ing = allIngredients.find(ing => String(ing.id) === String(ingredientId));
      if (ing?.unit) {
        const match = UNITS.find(u => ing.unit.toLowerCase().includes(u.toLowerCase()));
        updateRow(i, 'unit', match || ing.unit);
      }
    }
    setIngredientSearch(s => s.map((v, idx) => idx === i ? '' : v));
  };

  // ── New ingredient popup ─────────────────────────────────────────────────

  const openNewIngredient = (rowIndex) => {
    setAddingForRow(rowIndex);
    setShowNewIngredient(true);
  };

  const handleNewIngredientCreated = (ingredient) => {
    setAllIngredients(prev => [...prev, ingredient]);
    if (addingForRow !== null) {
      updateRow(addingForRow, 'ingredient_id', String(ingredient.id));
      const match = UNITS.find(u => ingredient.unit.toLowerCase().includes(u.toLowerCase()));
      updateRow(addingForRow, 'unit', match || ingredient.unit || 'grams');
    }
    setShowNewIngredient(false);
    setAddingForRow(null);
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validRows = ingredientRows.filter(r => r.ingredient_id && r.quantity);
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.instructions.trim()) { setError('Instructions are required.'); return; }
    if (!form.prep_time || !form.cook_time) { setError('Prep and cook times are required.'); return; }

    try {
      setSaving(true);
      const payload = {
        ...form,
        prep_time: parseInt(form.prep_time, 10),
        cook_time: parseInt(form.cook_time, 10),
        servings: parseInt(form.servings, 10),
        is_public: form.is_public,
        ingredients: validRows.map(r => ({
          ingredient_id: parseInt(r.ingredient_id, 10),
          quantity: parseFloat(r.quantity),
          unit: r.unit,
        })),
      };
      const res = await recipeAPI.create(payload);
      onCreated(res.data.recipe);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create recipe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box create-recipe-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create New Recipe</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <form onSubmit={handleSubmit} className="modal-form create-recipe-form">

            {/* ── Basic Info ── */}
            <div className="cr-section">
              <h4>Basic Info</h4>

              <div className="form-group">
                <label>Title *</label>
                <input className="form-control" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Pasta Carbonara" />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of the recipe" />
              </div>

              <div className="form-group">
                <label>Instructions *</label>
                <textarea className="form-control" rows={5} value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder={"Step 1: ...\nStep 2: ..."} />
              </div>

              <div className="form-group">
                <label>Recipe Image</label>
                <ImageUpload
                  currentUrl={form.image_url}
                  onUploaded={({ image_url, thumbnail_url }) =>
                    setForm(f => ({ ...f, image_url, thumbnail_url }))
                  }
                />
              </div>
            </div>

            {/* ── Timing & Details ── */}
            <div className="cr-section">
              <h4>Details</h4>
              <div className="cr-row-4">
                <div className="form-group">
                  <label>Prep Time (min) *</label>
                  <input className="form-control" type="number" min="0" value={form.prep_time}
                    onChange={e => setForm(f => ({ ...f, prep_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Cook Time (min) *</label>
                  <input className="form-control" type="number" min="0" value={form.cook_time}
                    onChange={e => setForm(f => ({ ...f, cook_time: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Servings</label>
                  <input className="form-control" type="number" min="1" value={form.servings}
                    onChange={e => setForm(f => ({ ...f, servings: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select className="form-control" value={form.difficulty}
                    onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="cr-row-2">
                <div className="form-group">
                  <label>Preference</label>
                  <select className="form-control" value={form.preference}
                    onChange={e => setForm(f => ({ ...f, preference: e.target.value }))}>
                    <option value="veg">Veg</option>
                    <option value="nonveg">Non-Veg</option>
                  </select>
                </div>
                <div className="form-group cr-public-toggle">
                  <label className="cr-toggle-label">
                    <input type="checkbox" checked={form.is_public}
                      onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} />
                    <span>Share publicly</span>
                  </label>
                  <p className="cr-toggle-hint">
                    {form.is_public
                      ? 'All users can see this recipe.'
                      : 'Only you can see this recipe.'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Ingredients ── */}
            <div className="cr-section">
              <div className="cr-section-header">
                <h4>Ingredients</h4>
                <button type="button" className="btn-add-ingredient-row" onClick={addRow}>
                  + Add Row
                </button>
              </div>

              {ingredientRows.map((row, i) => (
                <div key={i} className="cr-ingredient-row">
                  {/* Ingredient selector */}
                  <div className="cr-ing-select-wrap">
                    <input
                      className="form-control cr-ing-search"
                      placeholder="Search ingredient..."
                      value={ingredientSearch[i] || ''}
                      onChange={e => updateSearch(i, e.target.value)}
                    />
                    <select
                      className="form-control cr-ing-select"
                      value={row.ingredient_id}
                      onChange={e => handleIngredientSelect(i, e.target.value)}
                      size={1}
                    >
                      <option value="">— select —</option>
                      {filteredIngredients(i).map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <input
                    className="form-control cr-qty-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={e => updateRow(i, 'quantity', e.target.value)}
                  />

                  {/* Unit */}
                  <select
                    className="form-control cr-unit-select"
                    value={row.unit}
                    onChange={e => updateRow(i, 'unit', e.target.value)}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>

                  {/* Add new ingredient / remove row */}
                  <button type="button" className="btn-new-ingredient"
                    title="Add new ingredient"
                    onClick={() => openNewIngredient(i)}>
                    + New
                  </button>
                  {ingredientRows.length > 1 && (
                    <button type="button" className="btn-remove-ingredient-row"
                      onClick={() => removeRow(i)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Actions ── */}
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Create Recipe'}
              </button>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNewIngredient && (
        <NewIngredientModal
          onCreated={handleNewIngredientCreated}
          onClose={() => { setShowNewIngredient(false); setAddingForRow(null); }}
        />
      )}
    </>
  );
};

export default CreateRecipeModal;
