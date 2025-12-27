import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="container">
                <Link to="/" className="navbar-brand">
                    Recipe<span>Planner</span>
                </Link>
                
                <ul className="navbar-nav">
                    <li><Link to="/recipes">Recipes</Link></li>
                    <li><Link to="/match">Find by Ingredients</Link></li>
                    
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/pantry">My Pantry</Link></li>
                            <li><Link to="/favorites">Favorites</Link></li>
                            <li><Link to="/profile">Profile</Link></li>
                            <li>
                                <button onClick={handleLogout} className="btn btn-outline btn-small">
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login" className="btn btn-outline btn-small">Login</Link></li>
                            <li><Link to="/register" className="btn btn-primary btn-small">Sign Up</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;