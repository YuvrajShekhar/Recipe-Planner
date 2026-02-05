import React, { useState, useEffect } from 'react';
import { nutritionAPI } from '../../services/api';

const NutritionCard = ({ recipeId }) => {
    const [nutrition, setNutrition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPerServing, setShowPerServing] = useState(true);

    useEffect(() => {
        const fetchNutrition = async () => {
            try {
                setLoading(true);
                const response = await nutritionAPI.getRecipeNutrition(recipeId);
                setNutrition(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching nutrition:', err);
                setError('Unable to load nutrition information');
            } finally {
                setLoading(false);
            }
        };

        if (recipeId) {
            fetchNutrition();
        }
    }, [recipeId]);

    if (loading) {
        return (
            <div className="nutrition-card loading">
                <div className="nutrition-loading">
                    <span className="loading-spinner"></span>
                    <p>Calculating nutrition...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="nutrition-card error">
                <p>{error}</p>
            </div>
        );
    }

    if (!nutrition) {
        return null;
    }

    // Choose between per serving or total values
    const calories = showPerServing ? nutrition.calories_per_serving : nutrition.total_calories;
    const protein = showPerServing ? nutrition.protein_per_serving : nutrition.total_protein;
    const carbs = showPerServing ? nutrition.carbs_per_serving : nutrition.total_carbs;
    const fat = showPerServing ? nutrition.fat_per_serving : nutrition.total_fat;
    const fiber = showPerServing ? nutrition.fiber_per_serving : nutrition.total_fiber;

    return (
        <div className="nutrition-card">
            <div className="nutrition-header">
                <h3>🥗 Nutrition Facts</h3>
                <div className="nutrition-toggle">
                    <button 
                        className={`toggle-btn ${showPerServing ? 'active' : ''}`}
                        onClick={() => setShowPerServing(true)}
                    >
                        Per Serving
                    </button>
                    <button 
                        className={`toggle-btn ${!showPerServing ? 'active' : ''}`}
                        onClick={() => setShowPerServing(false)}
                    >
                        Total
                    </button>
                </div>
            </div>

            <div className="nutrition-subtitle">
                {showPerServing 
                    ? `Based on ${nutrition.servings} servings` 
                    : `Total for entire recipe (${nutrition.servings} servings)`
                }
            </div>

            {/* Calories - Main Display */}
            <div className="nutrition-calories">
                <span className="calories-value">{Math.round(calories)}</span>
                <span className="calories-label">Calories</span>
            </div>

            {/* Macro Bars */}
            <div className="nutrition-macros">
                <div className="macro-item">
                    <div className="macro-header">
                        <span className="macro-name">Protein</span>
                        <span className="macro-value">{parseFloat(protein).toFixed(1)}g</span>
                    </div>
                    <div className="macro-bar">
                        <div 
                            className="macro-fill protein-fill" 
                            style={{ width: `${nutrition.protein_percentage}%` }}
                        ></div>
                    </div>
                    <span className="macro-percentage">{parseFloat(nutrition.protein_percentage).toFixed(0)}%</span>
                </div>

                <div className="macro-item">
                    <div className="macro-header">
                        <span className="macro-name">Carbs</span>
                        <span className="macro-value">{parseFloat(carbs).toFixed(1)}g</span>
                    </div>
                    <div className="macro-bar">
                        <div 
                            className="macro-fill carbs-fill" 
                            style={{ width: `${nutrition.carbs_percentage}%` }}
                        ></div>
                    </div>
                    <span className="macro-percentage">{parseFloat(nutrition.carbs_percentage).toFixed(0)}%</span>
                </div>

                <div className="macro-item">
                    <div className="macro-header">
                        <span className="macro-name">Fat</span>
                        <span className="macro-value">{parseFloat(fat).toFixed(1)}g</span>
                    </div>
                    <div className="macro-bar">
                        <div 
                            className="macro-fill fat-fill" 
                            style={{ width: `${nutrition.fat_percentage}%` }}
                        ></div>
                    </div>
                    <span className="macro-percentage">{parseFloat(nutrition.fat_percentage).toFixed(0)}%</span>
                </div>

                {parseFloat(fiber) > 0 && (
                    <div className="macro-item fiber-item">
                        <div className="macro-header">
                            <span className="macro-name">Fiber</span>
                            <span className="macro-value">{parseFloat(fiber).toFixed(1)}g</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Macro Pie Chart Visual */}
            <div className="nutrition-chart">
                <div className="pie-chart">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                        <circle
                            className="circle-bg"
                            cx="18" cy="18" r="15.9155"
                            fill="none"
                            stroke="#eee"
                            strokeWidth="3"
                        />
                        {/* Protein segment */}
                        <circle
                            className="circle protein-circle"
                            cx="18" cy="18" r="15.9155"
                            fill="none"
                            stroke="#4CAF50"
                            strokeWidth="3"
                            strokeDasharray={`${nutrition.protein_percentage} ${100 - nutrition.protein_percentage}`}
                            strokeDashoffset="25"
                        />
                        {/* Carbs segment */}
                        <circle
                            className="circle carbs-circle"
                            cx="18" cy="18" r="15.9155"
                            fill="none"
                            stroke="#2196F3"
                            strokeWidth="3"
                            strokeDasharray={`${nutrition.carbs_percentage} ${100 - nutrition.carbs_percentage}`}
                            strokeDashoffset={25 - nutrition.protein_percentage}
                        />
                        {/* Fat segment */}
                        <circle
                            className="circle fat-circle"
                            cx="18" cy="18" r="15.9155"
                            fill="none"
                            stroke="#FF9800"
                            strokeWidth="3"
                            strokeDasharray={`${nutrition.fat_percentage} ${100 - nutrition.fat_percentage}`}
                            strokeDashoffset={25 - nutrition.protein_percentage - nutrition.carbs_percentage}
                        />
                    </svg>
                </div>
                <div className="chart-legend">
                    <div className="legend-item">
                        <span className="legend-color protein-color"></span>
                        <span>Protein</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color carbs-color"></span>
                        <span>Carbs</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color fat-color"></span>
                        <span>Fat</span>
                    </div>
                </div>
            </div>

            {/* Missing Ingredients Warning */}
            {nutrition.ingredients_without_nutrition && nutrition.ingredients_without_nutrition.length > 0 && (
                <div className="nutrition-warning">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-content">
                        <p className="warning-title">Incomplete calculation</p>
                        <p className="warning-text">
                            Missing nutrition data for: {nutrition.ingredients_without_nutrition.join(', ')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionCard;