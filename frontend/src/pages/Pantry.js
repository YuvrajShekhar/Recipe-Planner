import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Pantry = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <h3>Login Required</h3>
                    <p>Please login to manage your pantry</p>
                    <Link to="/login" className="btn btn-primary">Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>My Pantry</h1>
                <p>Manage ingredients you have at home</p>
            </div>
            <p>Pantry management coming soon...</p>
        </div>
    );
};

export default Pantry;