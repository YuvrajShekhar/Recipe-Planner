import React, { useState } from 'react';
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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const validateForm = () => {
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }
        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) return;
        
        setLoading(true);

        try {
            await register(formData);
            setSuccess('Account created successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                const firstError = Object.values(errors)[0];
                setError(Array.isArray(firstError) ? firstError[0] : firstError);
            } else {
                setError(err.response?.data?.message || 'Registration failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Create Account</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '25px' }}>
                    Join RecipePlanner to save your favorites
                </p>

                {error && <Alert type="error" message={error} />}
                {success && <Alert type="success" message={success} />}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-control"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Choose a username"
                            required
                            autoFocus
                        />
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
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="form-control"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create a password (min 8 characters)"
                            required
                            minLength="8"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password_confirm">Confirm Password</label>
                        <input
                            type="password"
                            id="password_confirm"
                            name="password_confirm"
                            className="form-control"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || success}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;