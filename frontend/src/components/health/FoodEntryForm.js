import React, { useState } from 'react';
import '../../styles/Health.css';

const FoodEntryForm = ({ onSubmit, onCancel, selectedDate }) => {
  const [formData, setFormData] = useState({
    dish_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.dish_name.trim()) {
      newErrors.dish_name = 'Dish name is required';
    }

    if (!formData.calories || parseFloat(formData.calories) < 0) {
      newErrors.calories = 'Valid calories required';
    }

    if (!formData.protein || parseFloat(formData.protein) < 0) {
      newErrors.protein = 'Valid protein amount required';
    }

    if (!formData.carbs || parseFloat(formData.carbs) < 0) {
      newErrors.carbs = 'Valid carbs amount required';
    }

    if (!formData.fat || parseFloat(formData.fat) < 0) {
      newErrors.fat = 'Valid fat amount required';
    }

    if (!formData.fiber || parseFloat(formData.fiber) < 0) {
      newErrors.fiber = 'Valid fiber amount required';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const submitData = {
      ...formData,
      date: `${year}-${month}-${day}`,
      calories: parseFloat(formData.calories),
      protein: parseFloat(formData.protein),
      carbs: parseFloat(formData.carbs),
      fat: parseFloat(formData.fat),
      fiber: parseFloat(formData.fiber)
    };

    onSubmit(submitData);
  };

  return (
    <div className="food-entry-form">
      <h3>Add Food Entry</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="dish_name">Dish Name *</label>
          <input
            type="text"
            id="dish_name"
            name="dish_name"
            value={formData.dish_name}
            onChange={handleChange}
            placeholder="e.g., Chicken Salad"
            className={errors.dish_name ? 'error' : ''}
          />
          {errors.dish_name && <span className="error-text">{errors.dish_name}</span>}
        </div>

        <div className="nutrition-grid">
          <div className="form-group">
            <label htmlFor="calories">Calories (kcal) *</label>
            <input
              type="number"
              id="calories"
              name="calories"
              value={formData.calories}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0"
              className={errors.calories ? 'error' : ''}
            />
            {errors.calories && <span className="error-text">{errors.calories}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="protein">Protein (g) *</label>
            <input
              type="number"
              id="protein"
              name="protein"
              value={formData.protein}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0"
              className={errors.protein ? 'error' : ''}
            />
            {errors.protein && <span className="error-text">{errors.protein}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="carbs">Carbs (g) *</label>
            <input
              type="number"
              id="carbs"
              name="carbs"
              value={formData.carbs}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0"
              className={errors.carbs ? 'error' : ''}
            />
            {errors.carbs && <span className="error-text">{errors.carbs}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="fat">Fat (g) *</label>
            <input
              type="number"
              id="fat"
              name="fat"
              value={formData.fat}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0"
              className={errors.fat ? 'error' : ''}
            />
            {errors.fat && <span className="error-text">{errors.fat}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="fiber">Fiber (g) *</label>
            <input
              type="number"
              id="fiber"
              name="fiber"
              value={formData.fiber}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0"
              className={errors.fiber ? 'error' : ''}
            />
            {errors.fiber && <span className="error-text">{errors.fiber}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional notes..."
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button type="submit" className="btn-submit">
            Add Entry
          </button>
        </div>
      </form>
    </div>
  );
};

export default FoodEntryForm;
