import { useState, useEffect } from 'react';
import { foodAPI, foodPantryAPI } from '../../services/api';
import '../../styles/Health.css';

const FoodItemEntry = ({ onSubmit, onCancel, selectedDate }) => {
  const [foods,       setFoods]       = useState([]);
  const [stockMap,    setStockMap]    = useState({});   // food_item.id → pantry entry
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [warning,     setWarning]     = useState('');   // over/no-stock warning
  const [confirmed,   setConfirmed]   = useState(false);

  const [selectedId, setSelectedId] = useState('');
  const [servings,   setServings]   = useState(1);
  const [notes,      setNotes]      = useState('');

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    Promise.all([foodAPI.getAll(), foodPantryAPI.getAll()])
      .then(([foodsRes, pantryRes]) => {
        setFoods(foodsRes.data.food_items || []);
        const map = {};
        (pantryRes.data.pantry || []).forEach(p => {
          map[p.food_item.id] = p;
        });
        setStockMap(map);
      })
      .catch(() => setError('Failed to load food items.'))
      .finally(() => setLoading(false));
  }, []);

  const fi = foods.find(f => String(f.id) === String(selectedId));
  const pantryEntry = fi ? stockMap[fi.id] : null;
  const inStock = pantryEntry ? parseFloat(pantryEntry.quantity) : 0;
  const qty = parseFloat(servings) || 0;

  // Recompute warning whenever selection or servings change
  useEffect(() => {
    setWarning('');
    setConfirmed(false);
    if (!fi || qty <= 0) return;
    if (inStock === 0) {
      setWarning('This food isn\'t in your stock. Do you still want to log it?');
    } else if (qty > inStock) {
      setWarning(`This is more than what's in stock (${inStock} available). Log anyway?`);
    }
  }, [selectedId, servings]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) { setError('Please select a food item.'); return; }
    if (qty <= 0)    { setError('Servings must be greater than 0.'); return; }

    // If there's a warning and user hasn't confirmed yet, prompt them
    if (warning && !confirmed) {
      setConfirmed(true); // show confirm UI — submit button becomes "Yes, log it"
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await foodPantryAPI.consume({
        food_item_id:      parseInt(selectedId),
        servings_consumed: qty,
        date:              formatDate(selectedDate),
        notes,
      });
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="fridge-entry-loading">Loading foods...</div>;

  return (
    <div className="fridge-entry-form">
      <h3>Log from Foods</h3>

      {foods.filter(f => stockMap[f.id] && parseFloat(stockMap[f.id].quantity) > 0).length === 0 ? (
        <p className="fridge-entry-empty">
          {foods.length === 0
            ? <>No food items yet. Go to the <strong>Foods</strong> page to add items.</>
            : <>No food items currently in stock. Go to the <strong>Foods</strong> page to restock.</>}
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Food Item</label>
            <select className="form-control" value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setServings(1); setConfirmed(false); }}>
                      <option value="">- select a food item -</option>
              {foods
                .filter(food => stockMap[food.id] && parseFloat(stockMap[food.id].quantity) > 0)
                .map(food => (
                  <option key={food.id} value={food.id}>
                    {food.name}
                    {food.brand ? ` (${food.brand})` : ''}
                    {` - ${parseFloat(stockMap[food.id].quantity)} in stock`}
                  </option>
                ))}
            </select>
          </div>

          {fi && (
            <>
              <div className="form-group">
                <label>
                  Servings eaten
                  <span className="fridge-max-hint">
                    {' '}(1 serving = {fi.serving_description}
                    {inStock > 0 ? `, ${inStock} in stock` : ', none in stock'})
                  </span>
                </label>
                <input className="form-control" type="number"
                  min="0.1" step="0.1"
                  value={servings} onChange={e => { setServings(e.target.value); setConfirmed(false); }} />
              </div>

              {qty > 0 && (
                <div className="scanner-nutrition-preview" style={{ marginBottom: '0.75rem' }}>
                  <h4>Nutrition for {qty.toFixed(1)} serving{qty !== 1 ? 's' : ''}</h4>
                  <div className="nutrition-preview-grid">
                    {[
                      { label: 'kcal',    val: (fi.calories * qty).toFixed(0) },
                      { label: 'Protein', val: `${(fi.protein * qty).toFixed(1)}g` },
                      { label: 'Carbs',   val: `${(fi.carbs   * qty).toFixed(1)}g` },
                      { label: 'Fat',     val: `${(fi.fat     * qty).toFixed(1)}g` },
                      { label: 'Fiber',   val: `${(fi.fiber   * qty).toFixed(1)}g` },
                    ].map(n => (
                      <div key={n.label} className="nutrient-cell">
                        <span className="nutrient-val">{n.val}</span>
                        <span className="nutrient-label">{n.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warning && (
                <div className="food-entry-warning">
                  <span>⚠️ {warning}</span>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Notes (optional)</label>
            <input className="form-control" type="text" value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="e.g. with breakfast" />
          </div>

          {error && <p className="fridge-entry-error">{error}</p>}

          <div className="fridge-entry-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? 'Logging...'
                : confirmed
                  ? 'Yes, log it'
                  : 'Log Entry'}
            </button>
            {confirmed && (
              <button type="button" className="btn btn-outline"
                onClick={() => setConfirmed(false)}>
                Cancel
              </button>
            )}
            {!confirmed && (
              <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default FoodItemEntry;
