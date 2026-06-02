import React, { useState, useEffect, useRef } from 'react';
import { pantryAPI, nutritionAPI } from '../../services/api';
import '../../styles/Health.css';

// ── Nutrition calculation helpers (mirror the backend logic) ──────────────────

function convertToGrams(qty, unit, nutrition) {
  const u = (unit || '').toLowerCase().trim();
  if (['g', 'gram', 'grams'].includes(u)) return qty;
  if (['kg', 'kilogram', 'kilograms'].includes(u)) return qty * 1000;
  if (['piece', 'pieces', 'pcs', 'pc', 'whole', 'unit', 'units'].includes(u)) {
    if (nutrition.gram_equivalent_per_piece)
      return qty * parseFloat(nutrition.gram_equivalent_per_piece);
  }
  if (['cup', 'cups'].includes(u)) {
    if (nutrition.gram_equivalent_per_cup)
      return qty * parseFloat(nutrition.gram_equivalent_per_cup);
  }
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(u)) {
    if (nutrition.gram_equivalent_per_tbsp)
      return qty * parseFloat(nutrition.gram_equivalent_per_tbsp);
  }
  if (['tsp', 'teaspoon', 'teaspoons'].includes(u)) {
    if (nutrition.gram_equivalent_per_tsp)
      return qty * parseFloat(nutrition.gram_equivalent_per_tsp);
  }
  if (['ml', 'milliliter', 'milliliters'].includes(u)) return qty;
  if (['l', 'liter', 'liters'].includes(u)) return qty * 1000;
  return null;
}

function calcMacros(nutrition, qty, unit) {
  if (!nutrition || !qty || qty <= 0) return null;
  if (nutrition.unit_type === 'per_unit') {
    return {
      calories: qty * parseFloat(nutrition.calories_per_unit || 0),
      protein:  qty * parseFloat(nutrition.protein_per_unit  || 0),
      carbs:    qty * parseFloat(nutrition.carbs_per_unit    || 0),
      fat:      qty * parseFloat(nutrition.fat_per_unit      || 0),
      fiber:    qty * parseFloat(nutrition.fiber_per_unit    || 0),
    };
  }
  const grams = convertToGrams(qty, unit, nutrition);
  if (!grams) return null;
  const m = grams / 100;
  return {
    calories: m * parseFloat(nutrition.calories_per_100g || 0),
    protein:  m * parseFloat(nutrition.protein_per_100g  || 0),
    carbs:    m * parseFloat(nutrition.carbs_per_100g    || 0),
    fat:      m * parseFloat(nutrition.fat_per_100g      || 0),
    fiber:    m * parseFloat(nutrition.fiber_per_100g    || 0),
  };
}

function sumMacros(items) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.macros?.calories || 0),
      protein:  acc.protein  + (item.macros?.protein  || 0),
      carbs:    acc.carbs    + (item.macros?.carbs     || 0),
      fat:      acc.fat      + (item.macros?.fat       || 0),
      fiber:    acc.fiber    + (item.macros?.fiber     || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const QuickMealEntry = ({ onSubmit, onCancel, selectedDate }) => {
  const [pantryItems, setPantryItems]   = useState([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [search, setSearch]             = useState('');

  const [mealName, setMealName] = useState('');
  const [notes, setNotes]       = useState('');

  // Confirmed ingredients added to the meal
  const [addedItems, setAddedItems] = useState([]);

  // "Staging" area — the ingredient being configured before confirming
  const [stagingItem,      setStagingItem]      = useState(null);   // pantry item object
  const [stagingQty,       setStagingQty]       = useState('');
  const [stagingUnit,      setStagingUnit]      = useState('');
  const [stagingNutrition, setStagingNutrition] = useState(null);
  const [stagingLoading,   setStagingLoading]   = useState(false);
  const [stagingMacros,    setStagingMacros]    = useState(null);

  const nutritionCache = useRef({});
  const [submitting, setSubmitting] = useState(false);

  // Load pantry on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await pantryAPI.getAll();
        setPantryItems(res.data.pantry_items || []);
      } catch (err) {
        console.error('Failed to load pantry:', err);
      } finally {
        setPantryLoading(false);
      }
    })();
  }, []);

  // Recalculate staging macros whenever qty / unit / nutrition changes
  useEffect(() => {
    const qty = parseFloat(stagingQty);
    if (stagingNutrition && !isNaN(qty) && qty > 0 && stagingUnit) {
      setStagingMacros(calcMacros(stagingNutrition, qty, stagingUnit));
    } else {
      setStagingMacros(null);
    }
  }, [stagingQty, stagingUnit, stagingNutrition]);

  const handleSelectPantryItem = async (pantryItem) => {
    setStagingItem(pantryItem);
    setStagingQty('');
    setStagingUnit(pantryItem.unit || pantryItem.ingredient.unit || '');
    setStagingMacros(null);

    const ingId = pantryItem.ingredient.id;
    if (nutritionCache.current[ingId]) {
      setStagingNutrition(nutritionCache.current[ingId]);
      return;
    }

    setStagingLoading(true);
    try {
      const res = await nutritionAPI.getByIngredient(ingId);
      nutritionCache.current[ingId] = res.data;
      setStagingNutrition(res.data);
    } catch {
      setStagingNutrition(null);
    } finally {
      setStagingLoading(false);
    }
  };

  const handleConfirmStagingItem = () => {
    if (!stagingItem) return;
    const qty = parseFloat(stagingQty);
    if (isNaN(qty) || qty <= 0) return;

    setAddedItems(prev => [
      ...prev,
      {
        id:            Date.now(),
        pantryItem:    stagingItem,
        ingredientId:  stagingItem.ingredient.id,
        qty,
        unit:          stagingUnit,
        nutritionData: stagingNutrition,
        macros:        stagingMacros,
      },
    ]);

    // Reset staging
    setStagingItem(null);
    setStagingQty('');
    setStagingUnit('');
    setStagingNutrition(null);
    setStagingMacros(null);
    setSearch('');
  };

  const handleRemoveItem = (id) =>
    setAddedItems(prev => prev.filter(item => item.id !== id));

  const handleUpdateItem = (id, newQty, newUnit) => {
    setAddedItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const qty = parseFloat(newQty);
        return {
          ...item,
          qty:   isNaN(qty) ? newQty : qty,
          unit:  newUnit,
          macros: (!isNaN(qty) && qty > 0 && newUnit && item.nutritionData)
            ? calcMacros(item.nutritionData, qty, newUnit)
            : null,
        };
      })
    );
  };

  const totals = sumMacros(addedItems);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSubmit = async () => {
    if (!mealName.trim() || addedItems.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        meal_name: mealName.trim(),
        date:      formatDate(selectedDate),
        notes,
        ingredients: addedItems.map(item => ({
          pantry_item_id: item.pantryItem.id,
          ingredient_id:  item.ingredientId,
          quantity:       item.qty,
          unit:           item.unit,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPantry = pantryItems.filter(p =>
    p.ingredient.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasMissingNutrition = addedItems.some(item => !item.macros);
  const canSubmit = mealName.trim() && addedItems.length > 0 && !submitting;

  return (
    <div className="food-entry-form quick-meal-entry">
      <h3>Quick Meal Builder</h3>
      <p className="quick-meal-subtitle">
        Pick ingredients straight from your pantry — macros update as you go
      </p>

      {/* Meal name */}
      <div className="form-group">
        <label>Meal Name *</label>
        <input
          type="text"
          value={mealName}
          onChange={e => setMealName(e.target.value)}
          placeholder="e.g. Egg sandwich, Oat bowl..."
          className="meal-name-input"
        />
      </div>

      {/* Live macro summary bar */}
      {addedItems.length > 0 && (
        <div className="quick-meal-macro-bar">
          <span className="qm-macro-label">Total macros:</span>
          <span className="nutrition-badge calories">{totals.calories.toFixed(1)} kcal</span>
          <span className="nutrition-badge protein">P: {totals.protein.toFixed(1)}g</span>
          <span className="nutrition-badge carbs">C: {totals.carbs.toFixed(1)}g</span>
          <span className="nutrition-badge fat">F: {totals.fat.toFixed(1)}g</span>
          <span className="nutrition-badge fiber">Fi: {totals.fiber.toFixed(1)}g</span>
          {hasMissingNutrition && (
            <span className="qm-macro-incomplete">⚠ Some items have no nutrition data</span>
          )}
        </div>
      )}

      {/* Added ingredients */}
      {addedItems.length > 0 && (
        <div className="quick-meal-ingredients">
          <p className="qm-section-label">Meal ingredients:</p>
          {addedItems.map(item => (
            <div key={item.id} className="quick-meal-ingredient-row">
              <span className="qm-ing-name">{item.pantryItem.ingredient.name}</span>
              <input
                type="number"
                value={item.qty}
                min="0.01"
                step="any"
                className="qm-qty-input"
                onChange={e => handleUpdateItem(item.id, e.target.value, item.unit)}
              />
              <input
                type="text"
                value={item.unit}
                className="qm-unit-input"
                onChange={e => handleUpdateItem(item.id, item.qty, e.target.value)}
              />
              {item.macros ? (
                <span className="qm-item-kcal">{item.macros.calories.toFixed(0)} kcal</span>
              ) : (
                <span className="qm-item-kcal no-data">—</span>
              )}
              <button className="qm-remove-btn" onClick={() => handleRemoveItem(item.id)} title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Ingredient picker */}
      <div className="quick-meal-picker">
        <p className="qm-section-label">Add ingredient from pantry:</p>

        {!stagingItem ? (
          <>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your pantry..."
              className="recipe-search-input"
            />
            <div className="recipe-scroll-list qm-pantry-list">
              {pantryLoading ? (
                <p className="recipe-list-status">Loading pantry...</p>
              ) : filteredPantry.length === 0 ? (
                <p className="recipe-list-status">No items match your search.</p>
              ) : (
                filteredPantry.map(item => (
                  <div
                    key={item.id}
                    className="recipe-list-item"
                    onClick={() => handleSelectPantryItem(item)}
                  >
                    <div className="recipe-list-info">
                      <span className="recipe-list-title">{item.ingredient.name}</span>
                      <span className="recipe-list-meta">
                        {item.quantity != null
                          ? `${item.quantity} ${item.unit || item.ingredient.unit}`
                          : 'quantity not set'}{' '}
                        · {item.ingredient.category}
                      </span>
                    </div>
                    <span className="qm-pick-arrow">›</span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Staging: configure qty + unit before confirming */
          <div className="qm-staging-area">
            <div className="qm-staging-header">
              <strong>{stagingItem.ingredient.name}</strong>
              <span className="qm-staging-available">
                In pantry:{' '}
                {stagingItem.quantity != null
                  ? `${stagingItem.quantity} ${stagingItem.unit || stagingItem.ingredient.unit}`
                  : 'unknown'}
              </span>
            </div>

            <div className="qm-staging-inputs">
              <div className="qm-input-group">
                <label>How much did you use?</label>
                <input
                  type="number"
                  value={stagingQty}
                  min="0.01"
                  step="any"
                  placeholder="e.g. 3"
                  onChange={e => setStagingQty(e.target.value)}
                  className="servings-input"
                  autoFocus
                />
              </div>
              <div className="qm-input-group">
                <label>Unit</label>
                <input
                  type="text"
                  value={stagingUnit}
                  placeholder="e.g. pieces, g, ml"
                  onChange={e => setStagingUnit(e.target.value)}
                  className="qm-unit-text-input"
                />
              </div>
            </div>

            {stagingLoading && (
              <p className="nutrition-status">Fetching nutrition data...</p>
            )}

            {stagingMacros && (
              <div className="nutrition-preview">
                <p className="nutrition-preview-label">
                  Macros for {stagingQty} {stagingUnit}:
                </p>
                <div className="entry-nutrition">
                  <span className="nutrition-badge calories">{stagingMacros.calories.toFixed(1)} kcal</span>
                  <span className="nutrition-badge protein">P: {stagingMacros.protein.toFixed(1)}g</span>
                  <span className="nutrition-badge carbs">C: {stagingMacros.carbs.toFixed(1)}g</span>
                  <span className="nutrition-badge fat">F: {stagingMacros.fat.toFixed(1)}g</span>
                  <span className="nutrition-badge fiber">Fi: {stagingMacros.fiber.toFixed(1)}g</span>
                </div>
              </div>
            )}

            {!stagingLoading && stagingNutrition === null && (
              <p className="nutrition-status warning">
                No nutrition data for this ingredient — it'll be logged with 0 macros.
              </p>
            )}

            {!stagingLoading && stagingNutrition && !stagingMacros && stagingQty && (
              <p className="nutrition-status warning">
                Can't convert "{stagingUnit}" to grams — try: g, pieces, cup, tbsp, ml…
              </p>
            )}

            <div className="qm-staging-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setStagingItem(null);
                  setStagingQty('');
                  setStagingUnit('');
                  setStagingNutrition(null);
                  setStagingMacros(null);
                }}
              >
                Back
              </button>
              <button
                className="btn-submit"
                onClick={handleConfirmStagingItem}
                disabled={!stagingQty || parseFloat(stagingQty) <= 0 || stagingLoading}
              >
                + Add to Meal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows="2"
        />
      </div>

      {/* Final actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-submit"
          disabled={!canSubmit}
        >
          {submitting ? 'Logging...' : 'Log Meal & Update Pantry'}
        </button>
      </div>
    </div>
  );
};

export default QuickMealEntry;
