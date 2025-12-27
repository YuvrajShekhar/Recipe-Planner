import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Favorites = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <h3>Login Required</h3>
                    <p>Please login to view your favorites</p>
                    <Link to="/login" className="btn btn-primary">Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>My Favorites</h1>
                <p>Your saved recipes</p>
            </div>
            <p>Favorites list coming soon...</p>
        </div>
    );
};

export default Favorites;