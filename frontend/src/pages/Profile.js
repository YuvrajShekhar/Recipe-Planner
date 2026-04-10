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

    // Body metrics state
    const [editingMetrics, setEditingMetrics] = useState(false);
    const [metricsForm, setMetricsForm] = useState({ age: '', height_cm: '', weight_kg: '', gender: '' });
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsMessage, setMetricsMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({ email: user.email || '' });
            const p = user.profile || {};
            setMetricsForm({
                age:       p.age       ?? '',
                height_cm: p.height_cm ?? '',
                weight_kg: p.weight_kg ?? '',
                gender:    p.gender    ?? '',
            });
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

    const handleMetricsChange = (e) => {
        setMetricsForm({ ...metricsForm, [e.target.name]: e.target.value });
        setMetricsMessage({ type: '', text: '' });
    };

    const handleMetricsSubmit = async (e) => {
        e.preventDefault();
        setMetricsLoading(true);
        setMetricsMessage({ type: '', text: '' });
        try {
            await updateProfile({
                profile: {
                    age:       metricsForm.age       || null,
                    height_cm: metricsForm.height_cm || null,
                    weight_kg: metricsForm.weight_kg || null,
                    gender:    metricsForm.gender    || null,
                },
            });
            setMetricsMessage({ type: 'success', text: 'Body metrics updated!' });
            setEditingMetrics(false);
        } catch (err) {
            setMetricsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update metrics' });
        } finally {
            setMetricsLoading(false);
        }
    };

    const cancelMetricsEdit = () => {
        const p = user?.profile || {};
        setMetricsForm({
            age:       p.age       ?? '',
            height_cm: p.height_cm ?? '',
            weight_kg: p.weight_kg ?? '',
            gender:    p.gender    ?? '',
        });
        setEditingMetrics(false);
        setMetricsMessage({ type: '', text: '' });
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

                {/* Body Metrics Card */}
                <div className="card">
                    <div className="card-body">
                        <div className="card-header-flex">
                            <h3>Body Metrics</h3>
                            {!editingMetrics && (
                                <button
                                    className="btn btn-small btn-outline"
                                    onClick={() => setEditingMetrics(true)}
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>

                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Used to calculate personalised calorie burn in the Fitness section.
                        </p>

                        {metricsMessage.text && (
                            <Alert
                                type={metricsMessage.type}
                                message={metricsMessage.text}
                                onClose={() => setMetricsMessage({ type: '', text: '' })}
                            />
                        )}

                        {editingMetrics ? (
                            <form onSubmit={handleMetricsSubmit}>
                                <div className="form-group">
                                    <label htmlFor="gender">Gender</label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        className="form-control"
                                        value={metricsForm.gender}
                                        onChange={handleMetricsChange}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="age">Age (years)</label>
                                    <input
                                        type="number"
                                        id="age"
                                        name="age"
                                        className="form-control"
                                        min="1"
                                        max="120"
                                        placeholder="e.g. 26"
                                        value={metricsForm.age}
                                        onChange={handleMetricsChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="height_cm">Height (cm)</label>
                                    <input
                                        type="number"
                                        id="height_cm"
                                        name="height_cm"
                                        className="form-control"
                                        min="50"
                                        max="300"
                                        step="0.1"
                                        placeholder="e.g. 179"
                                        value={metricsForm.height_cm}
                                        onChange={handleMetricsChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="weight_kg">Weight (kg)</label>
                                    <input
                                        type="number"
                                        id="weight_kg"
                                        name="weight_kg"
                                        className="form-control"
                                        min="1"
                                        max="500"
                                        step="0.1"
                                        placeholder="e.g. 75"
                                        value={metricsForm.weight_kg}
                                        onChange={handleMetricsChange}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={cancelMetricsEdit}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={metricsLoading}
                                    >
                                        {metricsLoading ? 'Saving...' : 'Save Metrics'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="profile-info">
                                <div className="info-row">
                                    <span className="info-label">⚧ Gender</span>
                                    <span className="info-value" style={{ textTransform: 'capitalize' }}>
                                        {user?.profile?.gender || <span style={{ color: '#fc8181' }}>Not set</span>}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">🎂 Age</span>
                                    <span className="info-value">
                                        {user?.profile?.age
                                            ? `${user.profile.age} yrs`
                                            : <span style={{ color: '#fc8181' }}>Not set</span>}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">📏 Height</span>
                                    <span className="info-value">
                                        {user?.profile?.height_cm
                                            ? `${user.profile.height_cm} cm`
                                            : <span style={{ color: '#fc8181' }}>Not set</span>}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">⚖️ Weight</span>
                                    <span className="info-value">
                                        {user?.profile?.weight_kg
                                            ? `${user.profile.weight_kg} kg`
                                            : <span style={{ color: '#fc8181' }}>Not set</span>}
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