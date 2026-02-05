import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Alert, ConfirmModal } from '../components/common';
import { pantryAPI, favoritesAPI } from '../services/api';
import { useDocumentTitle } from '../hooks';

const Profile = () => {
    useDocumentTitle('Find Recipes by Ingredients');
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();

    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({ email: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [stats, setStats] = useState({ pantryCount: 0, favoritesCount: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setFormData({ email: user.email || '' });
            loadStats();
        }
    }, [user]);

    const loadStats = async () => {
        try {
            setStatsLoading(true);
            const [pantryRes, favoritesRes] = await Promise.all([
                pantryAPI.getIngredientIds(),
                favoritesAPI.getRecipeIds()
            ]);
            setStats({
                pantryCount: pantryRes.data.count || 0,
                favoritesCount: favoritesRes.data.count || 0
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setMessage({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setEditing(false);
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Failed to update profile' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const cancelEdit = () => {
        setFormData({ email: user.email || '' });
        setEditing(false);
        setMessage({ type: '', text: '' });
    };

    return (
        <div className="container">
            <PageHeader 
                title="My Profile" 
                subtitle="Manage your account settings"
            />

            {message.text && (
                <Alert 
                    type={message.type} 
                    message={message.text} 
                    onClose={() => setMessage({ type: '', text: '' })}
                />
            )}

            <div className="profile-layout">
                {/* Account Information */}
                <div className="card">
                    <div className="card-body">
                        <div className="card-header-flex">
                            <h3>Account Information</h3>
                            {!editing && (
                                <button 
                                    className="btn btn-small btn-outline"
                                    onClick={() => setEditing(true)}
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>

                        {editing ? (
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={user?.username || ''}
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                    <small className="form-hint">Username cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={cancelEdit}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="profile-info">
                                <div className="info-row">
                                    <span className="info-label">👤 Username</span>
                                    <span className="info-value">{user?.username}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">📧 Email</span>
                                    <span className="info-value">{user?.email || 'Not set'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">📅 Member Since</span>
                                    <span className="info-value">
                                        {user?.date_joined 
                                            ? new Date(user.date_joined).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : 'N/A'
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Card */}
                <div className="card">
                    <div className="card-body">
                        <h3>Your Activity</h3>
                        
                        <div className="profile-stats">
                            <div 
                                className="profile-stat-item clickable"
                                onClick={() => navigate('/pantry')}
                            >
                                <div className="stat-icon">🥘</div>
                                <div className="stat-details">
                                    <span className="stat-value">
                                        {statsLoading ? '...' : stats.pantryCount}
                                    </span>
                                    <span className="stat-label">Pantry Items</span>
                                </div>
                                <span className="stat-arrow">→</span>
                            </div>

                            <div 
                                className="profile-stat-item clickable"
                                onClick={() => navigate('/favorites')}
                            >
                                <div className="stat-icon">❤️</div>
                                <div className="stat-details">
                                    <span className="stat-value">
                                        {statsLoading ? '...' : stats.favoritesCount}
                                    </span>
                                    <span className="stat-label">Favorite Recipes</span>
                                </div>
                                <span className="stat-arrow">→</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <div className="card-body">
                        <h3>Quick Actions</h3>
                        
                        <div className="quick-actions">
                            <button 
                                className="quick-action-btn"
                                onClick={() => navigate('/match')}
                            >
                                <span className="action-icon">🔍</span>
                                <span>Find Recipes by Ingredients</span>
                            </button>

                            <button 
                                className="quick-action-btn"
                                onClick={() => navigate('/pantry')}
                            >
                                <span className="action-icon">➕</span>
                                <span>Add to Pantry</span>
                            </button>

                            <button 
                                className="quick-action-btn"
                                onClick={() => navigate('/recipes')}
                            >
                                <span className="action-icon">📖</span>
                                <span>Browse Recipes</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="card card-danger">
                    <div className="card-body">
                        <h3>Session</h3>
                        <p className="text-muted">Logout from your account</p>
                        
                        <button 
                            className="btn btn-danger"
                            onClick={() => setShowLogoutModal(true)}
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showLogoutModal}
                title="Logout"
                message="Are you sure you want to logout?"
                confirmText="Logout"
                cancelText="Cancel"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutModal(false)}
                danger
            />
        </div>
    );
};

export default Profile;