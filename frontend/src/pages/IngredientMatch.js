import React from 'react';
import { PageHeader } from '../components/common';

const IngredientMatch = () => {
    return (
        <div className="container">
            <PageHeader 
                title="Find Recipes by Ingredients" 
                subtitle="Select the ingredients you have and find matching recipes"
            />
            <div className="card">
                <div className="card-body">
                    <p>Ingredient matching feature coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default IngredientMatch;