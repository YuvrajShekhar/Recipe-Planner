import { useState } from 'react';
import { ingredientAPI } from '../../services/api';

const CATEGORIES = [
  { value: 'vegetable', label: 'Vegetable' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'meat', label: 'Meat' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grain', label: 'Grain' },
  { value: 'spice', label: 'Spice' },
  { value: 'condiment', label: 'Condiment' },
  { value: 'other', label: 'Other' },
];

const NewIngredientModal = ({ onCreated, onClose }) => {
  const [form, setForm] = useState({ name: '', category: 'other', unit: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      setError('Name and default unit are required.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const res = await ingredientAPI.create(form);
      onCreated(res.data.ingredient);
    } catch (err) {
      const msg = err.response?.data?.errors?.name?.[0]
        || err.response?.data?.message
        || 'Failed to create ingredient';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box new-ingredient-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Ingredient</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Name *</label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Smoked Paprika"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              className="form-control"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Default Unit *</label>
            <input
              className="form-control"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              placeholder="e.g. grams, pieces, tsp"
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding...' : 'Add Ingredient'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewIngredientModal;
