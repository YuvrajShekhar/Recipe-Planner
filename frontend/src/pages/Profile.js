import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common';

const Profile = () => {
    const { user } = useAuth();

    return (
        <div className="container">
            <PageHeader 
                title="My Profile" 
                subtitle="Manage your account"
            />
            
            <div className="grid grid-2" style={{ maxWidth: '800px' }}>
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ marginBottom: '20px' }}>Account Information</h3>
                        <div className="form-group">
                            <label>Username</label>
                            <p style={{ padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                                {user?.username}
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <p style={{ padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                                {user?.email}
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Member Since</label>
                            <p style={{ padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <h3 style={{ marginBottom: '20px' }}>Quick Stats</h3>
                        <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                            <div className="stat-card">
                                <div className="stat-card-icon">🥘</div>
                                <div className="stat-card-value">-</div>
                                <div className="stat-card-label">Pantry Items</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon">❤️</div>
                                <div className="stat-card-value">-</div>
                                <div className="stat-card-label">Favorite Recipes</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;