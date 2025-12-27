import React from 'react';
import { PageHeader } from '../components/common';

const Favorites = () => {
    return (
        <div className="container">
            <PageHeader 
                title="My Favorites" 
                subtitle="Your saved recipes"
            />
            <div className="card">
                <div className="card-body">
                    <p>Favorites list coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default Favorites;