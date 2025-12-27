import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <div className="container">
            <div className="text-center" style={{ padding: '60px 20px' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#2c3e50' }}>
                    Welcome to Recipe<span style={{ color: '#e74c3c' }}>Planner</span>
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
                    Find recipes based on ingredients you already have. 
                    Save your favorites, manage your pantry, and discover new dishes!
                </p>
                
                {isAuthenticated ? (
                    <div>
                        <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                            Welcome back, <strong>{user.username}</strong>!
                        </p>
                        <div className="flex gap-20" style={{ justifyContent: 'center' }}>
                            <Link to="/match" className="btn btn-primary btn-large">
                                Find Recipes by Ingredients
                            </Link>
                            <Link to="/pantry" className="btn btn-secondary btn-large">
                                Manage My Pantry
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-20" style={{ justifyContent: 'center' }}>
                        <Link to="/match" className="btn btn-primary btn-large">
                            Find Recipes by Ingredients
                        </Link>
                        <Link to="/register" className="btn btn-secondary btn-large">
                            Create Free Account
                        </Link>
                    </div>
                )}

                <div className="grid grid-3 mt-30" style={{ marginTop: '60px' }}>
                    <div className="card">
                        <div className="card-body text-center">
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔍</div>
                            <h3>Smart Matching</h3>
                            <p>Find recipes that match ingredients you have at home</p>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-body text-center">
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🥘</div>
                            <h3>Pantry Management</h3>
                            <p>Keep track of your available ingredients</p>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-body text-center">
                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>❤️</div>
                            <h3>Save Favorites</h3>
                            <p>Build your personal recipe collection</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;