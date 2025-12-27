import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setMobileMenuOpen(false);
        navigate('/');
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar">
            <div className="container">
                <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
                    🍳 Recipe<span>Planner</span>
                </Link>

                {/* Mobile Menu Button */}
                <button 
                    className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                {/* Navigation Links */}
                <ul className={`navbar-nav ${mobileMenuOpen ? 'open' : ''}`}>
                    <li>
                        <Link 
                            to="/recipes" 
                            className={isActive('/recipes')}
                            onClick={closeMobileMenu}
                        >
                            Recipes
                        </Link>
                    </li>
                    <li>
                        <Link 
                            to="/match" 
                            className={isActive('/match')}
                            onClick={closeMobileMenu}
                        >
                            Find by Ingredients
                        </Link>
                    </li>

                    {isAuthenticated ? (
                        <>
                            <li>
                                <Link 
                                    to="/pantry" 
                                    className={isActive('/pantry')}
                                    onClick={closeMobileMenu}
                                >
                                    My Pantry
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/favorites" 
                                    className={isActive('/favorites')}
                                    onClick={closeMobileMenu}
                                >
                                    Favorites
                                </Link>
                            </li>
                            <li className="navbar-user">
                                <Link 
                                    to="/profile" 
                                    className={isActive('/profile')}
                                    onClick={closeMobileMenu}
                                >
                                    👤 {user.username}
                                </Link>
                            </li>
                            <li>
                                <button 
                                    onClick={handleLogout} 
                                    className="btn btn-outline btn-small"
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link 
                                    to="/login" 
                                    className="btn btn-outline btn-small"
                                    onClick={closeMobileMenu}
                                >
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/register" 
                                    className="btn btn-primary btn-small"
                                    onClick={closeMobileMenu}
                                >
                                    Sign Up
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;