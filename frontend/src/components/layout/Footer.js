import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>🍳 Recipe<span>Planner</span></h3>
                        <p>Find recipes based on ingredients you have.</p>
                    </div>

                    <div className="footer-links-section">
                        <h4>Quick Links</h4>
                        <ul className="footer-links">
                            <li><Link to="/recipes">All Recipes</Link></li>
                            <li><Link to="/match">Find by Ingredients</Link></li>
                            <li><Link to="/pantry">My Pantry</Link></li>
                            <li><Link to="/favorites">Favorites</Link></li>
                        </ul>
                    </div>

                    <div className="footer-links-section">
                        <h4>Account</h4>
                        <ul className="footer-links">
                            <li><Link to="/login">Login</Link></li>
                            <li><Link to="/register">Sign Up</Link></li>
                            <li><Link to="/profile">Profile</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} RecipePlanner. All rights reserved.</p>
                    <p>Built with ❤️ for food lovers</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;