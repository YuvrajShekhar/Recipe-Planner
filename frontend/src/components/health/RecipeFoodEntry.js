import React, { useState, useEffect } from 'react';
import { recipeAPI, nutritionAPI } from '../../services/api';
import '../../styles/Health.css';

const RecipeFoodEntry = ({ onSubmit, onCancel, selectedDate }) => {
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [servings, setServings] = useState(1);

  const [nutrition, setNutrition] = useState(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState(null);

  const [notes, setNotes] = useState('');

  // Fetch all recipes on mount
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await recipeAPI.getAll();
        const data = response.data;
        setRecipes(Array.isArray(data) ? data : (data.recipes || data.results || []));
      } catch (err) {
        console.error('Error fetching recipes:', err);
      } finally {
        setRecipesLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  // Fetch nutrition when a recipe is selected
  useEffect(() => {
    if (!selectedRecipe) {
      setNutrition(null);
      setNutritionError(null);
      return;
    }

    const fetchNutrition = async () => {
      try {
        setNutritionLoading(true);
        setNutritionError(null);
        const response = await nutritionAPI.getRecipeNutrition(selectedRecipe.id);
        setNutrition(response.data);
      } catch (err) {
        setNutritionError('Nutrition data is not available for this recipe.');
        setNutrition(null);
      } finally {
        setNutritionLoading(false);
      }
    };

    fetchNutrition();
  }, [selectedRecipe]);

  const filteredRecipes = recipes.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setServings(1);
  };

  const adjustServings = (delta) => {
    setServings(prev => Math.max(0.1, parseFloat((prev + delta).toFixed(2))));
  };

  const handleServingsInput = (e) => {
    const val = e.target.value;
    if (val === '' || val === '.') {
      setServings(val);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setServings(num);
    }
  };

  const handleServingsBlur = () => {
    const num = parseFloat(servings);
    setServings(isNaN(num) || num <= 0 ? 1 : num);
  };

  // Scale nutrition by the number of servings the user ate
  const getScaledNutrition = () => {
    if (!nutrition) return null;
    return {
      calories: (parseFloat(nutrition.calories_per_serving) * servings).toFixed(1),
      protein:  (parseFloat(nutrition.protein_per_serving)  * servings).toFixed(1),
      carbs:    (parseFloat(nutrition.carbs_per_serving)    * servings).toFixed(1),
      fat:      (parseFloat(nutrition.fat_per_serving)      * servings).toFixed(1),
      fiber:    (parseFloat(nutrition.fiber_per_serving)    * servings).toFixed(1),
    };
  };

  const scaled = getScaledNutrition();

  const handleSubmit = () => {
    if (!selectedRecipe || !scaled) return;

    const servingLabel = servings === 1 ? '1 serving' : `${servings} servings`;
    onSubmit({
      date:      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      dish_name: `${selectedRecipe.title} (${servingLabel})`,
      calories:  parseFloat(scaled.calories),
      protein:   parseFloat(scaled.protein),
      carbs:     parseFloat(scaled.carbs),
      fat:       parseFloat(scaled.fat),
      fiber:     parseFloat(scaled.fiber),
      notes,
    });
  };

  return (
    <div className="food-entry-form recipe-food-entry">
      <h3>Add from Recipe</h3>

      {/* Search */}
      <div className="form-group">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="recipe-search-input"
        />
      </div>

      {/* Scrollable recipe list */}
      <div className="recipe-scroll-list">
        {recipesLoading ? (
          <p className="recipe-list-status">Loading recipes...</p>
        ) : filteredRecipes.length === 0 ? (
          <p className="recipe-list-status">No recipes found.</p>
        ) : (
          filteredRecipes.map(recipe => (
            <div
              key={recipe.id}
              className={`recipe-list-item${selectedRecipe?.id === recipe.id ? ' selected' : ''}`}
              onClick={() => handleSelectRecipe(recipe)}
            >
              {recipe.image_url && (
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="recipe-list-thumb"
                />
              )}
              <div className="recipe-list-info">
                <span className="recipe-list-title">{recipe.title}</span>
                <span className="recipe-list-meta">
                  {recipe.difficulty} · {recipe.preference} · {recipe.total_time || recipe.cook_time} min
                </span>
              </div>
              {selectedRecipe?.id === recipe.id && (
                <span className="recipe-selected-tick">✓</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Servings + Nutrition preview */}
      {selectedRecipe && (
        <div className="recipe-servings-section">
          <div className="servings-row">
            <label>Servings eaten:</label>
            <div className="servings-control">
              <button type="button" onClick={() => adjustServings(-1)}>−</button>
              <input
                type="number"
                value={servings}
                onChange={handleServingsInput}
                onBlur={handleServingsBlur}
                min="0.1"
                step="any"
                className="servings-input"
              />
              <button type="button" onClick={() => adjustServings(1)}>+</button>
            </div>
          </div>

          {nutritionLoading && (
            <p className="nutrition-status">Fetching nutrition data...</p>
          )}

          {nutritionError && (
            <p className="nutrition-status error">{nutritionError}</p>
          )}

          {scaled && !nutritionLoading && (
            <div className="nutrition-preview">
              <p className="nutrition-preview-label">
                Nutrition for {servings} serving{servings !== 1 ? 's' : ''}:
              </p>
              <div className="entry-nutrition">
                <span className="nutrition-badge calories">{scaled.calories} kcal</span>
                <span className="nutrition-badge protein">P: {scaled.protein}g</span>
                <span className="nutrition-badge carbs">C: {scaled.carbs}g</span>
                <span className="nutrition-badge fat">F: {scaled.fat}g</span>
                <span className="nutrition-badge fiber">Fi: {scaled.fiber}g</span>
              </div>
              {nutrition.ingredients_without_nutrition?.length > 0 && (
                <p className="nutrition-status warning">
                  Note: Some ingredients lack nutrition data — values may be incomplete.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* Actions */}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-submit"
          disabled={!selectedRecipe || !scaled || nutritionLoading}
        >
          Add Entry
        </button>
      </div>
    </div>
  );
};

export default RecipeFoodEntry;
