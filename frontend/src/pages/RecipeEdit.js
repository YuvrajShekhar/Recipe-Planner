import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipeAPI, ingredientAPI } from '../services/api';
import { Loading, Alert, PageHeader } from '../components/common';

const RecipeEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        instructions: '',
        prep_time: '',
        cook_time: '',
        servings: '',
        difficulty: 'medium',
        image_url: '',
    });

    const [ingredients, setIngredients] = useState([]);
    const [recipeIngredients, setRecipeIngredients] = useState([]);
    const [allIngredients, setAllIngredients] = useState([]);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            const [recipeRes, ingredientsRes] = await Promise.all([
                recipeAPI.getById(id),
                ingredientAPI.getAll()
            ]);

            const recipe = recipeRes.data.recipe;
            
            // Check ownership
            if (recipe.created_by?.id !== user?.id) {
                navigate('/recipes');
                return;
            }

            setFormData({
                title: recipe.title || '',
                description: recipe.description || '',
                instructions: recipe.instructions || '',
                prep_time: recipe.prep_time || '',
                cook_time: recipe.cook_time || '',
                servings: recipe.servings || '',
                difficulty: recipe.difficulty || 'medium',
                image_url: recipe.image_url || '',
            });

            setRecipeIngredients(
                recipe.recipe_ingredients?.map(ri => ({
                    ingredient_id: ri.ingredient.id,
                    name: ri.ingredient.name,
                    quantity: ri.quantity,
                    unit: ri.unit,
                })) || []
            );

            setAllIngredients(ingredientsRes.data.ingredients || []);

        } catch (err) {
            console.error('Error loading recipe:', err);
            setError('Failed to load recipe');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleIngredientChange = (index, field, value) => {
        const updated = [...recipeIngredients];
        updated[index][field] = value;
        setRecipeIngredients(updated);
    };

    const addIngredient = () => {
        setRecipeIngredients([
            ...recipeIngredients,
            { ingredient_id: '', quantity: '', unit: '' }
        ]);
    };

    const removeIngredient = (index) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const payload = {
                ...formData,
                prep_time: parseInt(formData.prep_time),
                cook_time: parseInt(formData.cook_time),
                servings: parseInt(formData.servings),
                ingredients: recipeIngredients
                    .filter(ri => ri.ingredient_id && ri.quantity && ri.unit)
                    .map(ri => ({
                        ingredient_id: parseInt(ri.ingredient_id),
                        quantity: parseFloat(ri.quantity),
                        unit: ri.unit,
                    }))
            };

            await recipeAPI.update(id, payload);
            setSuccess('Recipe updated successfully!');
            
            setTimeout(() => {
                navigate(`/recipes/${id}`);
            }, 1500);

        } catch (err) {
            console.error('Error updating recipe:', err);
            setError(err.response?.data?.message || 'Failed to update recipe');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <Loading message="Loading recipe..." />
            </div>
        );
    }

    return (
        <div className="container">
            <PageHeader 
                title="Edit Recipe" 
                subtitle={`Editing: ${formData.title}`}
            />

            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {success && <Alert type="success" message={success} />}

            <form onSubmit={handleSubmit} className="recipe-form">
                <div className="form-grid">
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>Basic Information</h3>
                        
                        <div className="form-group">
                            <label htmlFor="title">Recipe Title *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                className="form-control"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="image_url">Image URL</label>
                            <input
                                type="url"
                                id="image_url"
                                name="image_url"
                                className="form-control"
                                value={formData.image_url}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                    </div>

                    {/* Time & Servings */}
                    <div className="form-section">
                        <h3>Time & Servings</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="prep_time">Prep Time (min) *</label>
                                <input
                                    type="number"
                                    id="prep_time"
                                    name="prep_time"
                                    className="form-control"
                                    value={formData.prep_time}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="cook_time">Cook Time (min) *</label>
                                <input
                                    type="number"
                                    id="cook_time"
                                    name="cook_time"
                                    className="form-control"
                                    value={formData.cook_time}
                                    onChange={handleChange}
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="servings">Servings *</label>
                                <input
                                    type="number"
                                    id="servings"
                                    name="servings"
                                    className="form-control"
                                    value={formData.servings}
                                    onChange={handleChange}
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="difficulty">Difficulty *</label>
                                <select
                                    id="difficulty"
                                    name="difficulty"
                                    className="form-control"
                                    value={formData.difficulty}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ingredients */}
                <div className="form-section">
                    <div className="section-header-flex">
                        <h3>Ingredients</h3>
                        <button 
                            type="button" 
                            className="btn btn-small btn-secondary"
                            onClick={addIngredient}
                        >
                            + Add Ingredient
                        </button>
                    </div>

                    <div className="ingredients-editor">
                        {recipeIngredients.map((ri, index) => (
                            <div key={index} className="ingredient-row">
                                <select
                                    className="form-control"
                                    value={ri.ingredient_id}
                                    onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                                >
                                    <option value="">Select ingredient</option>
                                    {allIngredients.map(ing => (
                                        <option key={ing.id} value={ing.id}>
                                            {ing.name}
                                        </option>
                                    ))}
                                </select>
                                
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Qty"
                                    value={ri.quantity}
                                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                    step="0.01"
                                    min="0"
                                />
                                
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Unit"
                                    value={ri.unit}
                                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                />
                                
                                <button
                                    type="button"
                                    className="btn btn-small btn-danger"
                                    onClick={() => removeIngredient(index)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        {recipeIngredients.length === 0 && (
                            <p className="text-muted">No ingredients added yet.</p>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="form-section">
                    <h3>Instructions</h3>
                    <div className="form-group">
                        <label htmlFor="instructions">Step-by-step instructions *</label>
                        <textarea
                            id="instructions"
                            name="instructions"
                            className="form-control"
                            value={formData.instructions}
                            onChange={handleChange}
                            rows="10"
                            placeholder="1. First step...&#10;2. Second step...&#10;3. Third step..."
                            required
                        />
                        <small className="form-hint">
                            Put each step on a new line. You can start with numbers like "1." or just write the steps.
                        </small>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button 
                        type="button" 
                        className="btn btn-outline"
                        onClick={() => navigate(`/recipes/${id}`)}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RecipeEdit;