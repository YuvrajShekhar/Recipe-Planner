import React from 'react';
import '../../styles/Health.css';

const AddFoodChoiceModal = ({ onChooseManual, onChooseRecipe, onChooseFridge, onCancel }) => {
  return (
    <div className="choice-modal-overlay" onClick={onCancel}>
      <div className="choice-modal" onClick={e => e.stopPropagation()}>
        <h3>Add Food Entry</h3>
        <p>How would you like to add this entry?</p>

        <div className="choice-options">
          <button className="choice-btn fridge-choice" onClick={onChooseFridge}>
            <span className="choice-icon">🧊</span>
            <span className="choice-title">From Fridge</span>
            <span className="choice-desc">Log a dish you already cooked and stored in your fridge</span>
          </button>

          <button className="choice-btn recipe-choice" onClick={onChooseRecipe}>
            <span className="choice-icon">🍽️</span>
            <span className="choice-title">From Recipes</span>
            <span className="choice-desc">Pick from your existing recipes and set servings</span>
          </button>

          <button className="choice-btn manual-choice" onClick={onChooseManual}>
            <span className="choice-icon">✏️</span>
            <span className="choice-title">Add Manually</span>
            <span className="choice-desc">Enter the nutrition details yourself</span>
          </button>
        </div>

        <button className="choice-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AddFoodChoiceModal;
