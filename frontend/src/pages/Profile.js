import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <h3>Login Required</h3>
                    <p>Please login to view your profile</p>
                    <Link to="/login" className="btn btn-primary">Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>My Profile</h1>
            </div>
            <div className="card" style={{ maxWidth: '500px' }}>
                <div className="card-body">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Member since:</strong> {new Date(user.date_joined).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default Profile;