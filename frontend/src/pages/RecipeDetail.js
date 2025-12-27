import React from 'react';
import { useParams } from 'react-router-dom';

const RecipeDetail = () => {
    const { id } = useParams();
    
    return (
        <div className="container">
            <h1>Recipe Detail</h1>
            <p>Recipe ID: {id}</p>
            <p>Full recipe details coming soon...</p>
        </div>
    );
};

export default RecipeDetail;