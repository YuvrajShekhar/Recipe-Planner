import React from 'react';
import { PageHeader } from '../components/common';

const Pantry = () => {
    return (
        <div className="container">
            <PageHeader 
                title="My Pantry" 
                subtitle="Manage ingredients you have at home"
            />
            <div className="card">
                <div className="card-body">
                    <p>Pantry management feature coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default Pantry;