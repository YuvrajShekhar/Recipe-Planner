import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <p>&copy; {new Date().getFullYear()} RecipePlanner. All rights reserved.</p>
                <ul className="footer-links">
                    <li><Link to="/recipes">Recipes</Link></li>
                    <li><Link to="/match">Find Recipes</Link></li>
                    <li><Link to="/about">About</Link></li>
                </ul>
            </div>
        </footer>
    );
};

export default Footer;