import { useState, useEffect } from 'react';
import { fridgeAPI } from '../../services/api';
import '../../styles/Health.css';

const FridgeFoodEntry = ({ onSubmit, onCancel, selectedDate }) => {
  const [fridgeItems, setFridgeItems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [portions, setPortions]             = useState(1);
  const [notes, setNotes]                   = useState('');

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    fridgeAPI.getAll()
      .then(res => setFridgeItems(res.data.fridge_items || []))
      .catch(() => setError('Failed to load fridge items.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedItem = fridgeItems.find(i => String(i.id) === String(selectedItemId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemId) { setError('Please select a dish.'); return; }
    if (!portions || portions <= 0) { setError('Portions must be greater than 0.'); return; }
    if (selectedItem && portions > parseFloat(selectedItem.portions)) {
      setError(`Only ${selectedItem.portions} portion(s) available in fridge.`);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await fridgeAPI.consume({
        fridge_item_id: parseInt(selectedItemId),
        portions_consumed: parseFloat(portions),
        date: formatDate(selectedDate),
        notes,
      });
      onSubmit();  // parent refreshes health logs
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="fridge-entry-loading">Loading fridge...</div>;

  return (
    <div className="fridge-entry-form">
      <h3>Log from Fridge</h3>

      {fridgeItems.length === 0 ? (
        <p className="fridge-entry-empty">Your fridge is empty. Cook a recipe first!</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Dish</label>
            <select
              className="form-control"
              value={selectedItemId}
              onChange={e => { setSelectedItemId(e.target.value); setPortions(1); }}
            >
              <option value="">— select a dish —</option>
              {fridgeItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.recipe.title} ({parseFloat(item.portions)} portion{parseFloat(item.portions) !== 1 ? 's' : ''} left)
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="form-group">
              <label>
                Portions eaten
                <span className="fridge-max-hint"> (max {parseFloat(selectedItem.portions)})</span>
              </label>
              <input
                className="form-control"
                type="number"
                min="0.1"
                max={parseFloat(selectedItem.portions)}
                step="0.1"
                value={portions}
                onChange={e => setPortions(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Notes (optional)</label>
            <input
              className="form-control"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. added hot sauce"
            />
          </div>

          {error && <p className="fridge-entry-error">{error}</p>}

          <div className="fridge-entry-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Entry'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FridgeFoodEntry;
