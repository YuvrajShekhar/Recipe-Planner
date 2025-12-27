import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/common';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: ''
    });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
        return Math.min(strength, 100);
    };

    const getPasswordStrengthLabel = () => {
        if (passwordStrength < 30) return { label: 'Weak', color: '#e74c3c' };
        if (passwordStrength < 60) return { label: 'Fair', color: '#f39c12' };
        if (passwordStrength < 80) return { label: 'Good', color: '#3498db' };
        return { label: 'Strong', color: '#27ae60' };
    };

    const validateField = (name, value) => {
        switch (name) {
            case 'username':
                if (!value.trim()) return 'Username is required';
                if (value.length < 3) return 'Username must be at least 3 characters';
                if (value.length > 30) return 'Username must be less than 30 characters';
                if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
                return '';
            case 'email':
                if (!value.trim()) return 'Email is required';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
                return '';
            case 'password':
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                return '';
            case 'password_confirm':
                if (!value) return 'Please confirm your password';
                if (value !== formData.password) return 'Passwords do not match';
                return '';
            default:
                return '';
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Clear API error when user types
        setApiError('');
        
        // Validate field
        const error = validateField(name, value);
        setErrors({ ...errors, [name]: error });

        // Calculate password strength
        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }

        // Re-validate confirm password when password changes
        if (name === 'password' && formData.password_confirm) {
            const confirmError = value !== formData.password_confirm ? 'Passwords do not match' : '';
            setErrors(prev => ({ ...prev, password_confirm: confirmError }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const error = validateField(name, value);
        setErrors({ ...errors, [name]: error });
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setApiError('');
        setLoading(true);

        try {
            await register(formData);
            navigate('/login', { state: { registered: true } });
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                // Handle field-specific errors from API
                const fieldErrors = {};
                Object.keys(errors).forEach(key => {
                    fieldErrors[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
                });
                setErrors(fieldErrors);
            } else {
                setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const strengthInfo = getPasswordStrengthLabel();

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon">🍳</div>
                    <h2>Create Account</h2>
                    <p>Join RecipePlanner to save your favorites</p>
                </div>

                {apiError && (
                    <Alert 
                        type="error" 
                        message={apiError} 
                        onClose={() => setApiError('')}
                    />
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label htmlFor="username">
                            Username <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className={`form-control ${errors.username ? 'error' : ''}`}
                                value={formData.username}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Choose a username"
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </div>
                        {errors.username && (
                            <span className="error-message">{errors.username}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">
                            Email <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`form-control ${errors.email ? 'error' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter your email"
                                required
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && (
                            <span className="error-message">{errors.email}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            Password <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                className={`form-control ${errors.password ? 'error' : ''}`}
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Create a strong password"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {formData.password && (
                            <div className="password-strength">
                                <div className="strength-bar">
                                    <div 
                                        className="strength-fill" 
                                        style={{ 
                                            width: `${passwordStrength}%`,
                                            backgroundColor: strengthInfo.color
                                        }}
                                    ></div>
                                </div>
                                <span style={{ color: strengthInfo.color }}>
                                    {strengthInfo.label}
                                </span>
                            </div>
                        )}
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password_confirm">
                            Confirm Password <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="password_confirm"
                                name="password_confirm"
                                className={`form-control ${errors.password_confirm ? 'error' : ''}`}
                                value={formData.password_confirm}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Confirm your password"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.password_confirm && (
                            <span className="error-message">{errors.password_confirm}</span>
                        )}
                        {formData.password_confirm && !errors.password_confirm && formData.password === formData.password_confirm && (
                            <span className="success-message">✓ Passwords match</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="btn-loading">
                                <span className="spinner-small"></span>
                                Creating Account...
                            </span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <div className="auth-footer">
                    <p>Already have an account?</p>
                    <Link to="/login" className="btn btn-outline btn-block">
                        Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;