import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="not-found-icon">🍳</div>
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>
                    Oops! The recipe you're looking for seems to have wandered off. 
                    Let's get you back to the kitchen!
                </p>
                
                <div className="not-found-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => navigate(-1)}
                    >
                        ← Go Back
                    </button>
                    <Link to="/" className="btn btn-primary">
                        🏠 Go Home
                    </Link>
                </div>

                <div className="not-found-suggestions">
                    <h3>You might be looking for:</h3>
                    <div className="suggestion-links">
                        <Link to="/recipes" className="suggestion-link">
                            <span className="suggestion-icon">📖</span>
                            <span>Browse Recipes</span>
                        </Link>
                        <Link to="/match" className="suggestion-link">
                            <span className="suggestion-icon">🔍</span>
                            <span>Find by Ingredients</span>
                        </Link>
                        <Link to="/pantry" className="suggestion-link">
                            <span className="suggestion-icon">📦</span>
                            <span>My Pantry</span>
                        </Link>
                        <Link to="/favorites" className="suggestion-link">
                            <span className="suggestion-icon">❤️</span>
                            <span>My Favorites</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;