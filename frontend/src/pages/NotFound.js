import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="container">
            <div className="empty-state">
                <div className="empty-state-icon">404</div>
                <h3>Page Not Found</h3>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
        </div>
    );
};

export default NotFound;