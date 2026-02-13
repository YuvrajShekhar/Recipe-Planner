import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is logged in on app load
    const checkAuth = useCallback(async () => {
        // If no token in localStorage, user is not authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await authAPI.getProfile();
            setUser(response.data.user);
            setError(null);
        } catch (err) {
            setUser(null);
            // Token is invalid or expired — remove it
            localStorage.removeItem('authToken');
            // Don't set error for 401/403 (not authenticated) - that's expected
            if (err.response?.status !== 403 && err.response?.status !== 401) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (credentials) => {
        try {
            setError(null);
            const response = await authAPI.login(credentials);
            // Save the auth token to localStorage
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
            }
            setUser(response.data.user);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            throw err;
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            const response = await authAPI.register(userData);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            throw err;
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            // Always remove the token and clear user state
            localStorage.removeItem('authToken');
            setUser(null);
            setError(null);
        }
    };

    const updateProfile = async (data) => {
        try {
            setError(null);
            const response = await authAPI.updateProfile(data);
            setUser(response.data.user);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Profile update failed');
            throw err;
        }
    };

    const clearError = () => {
        setError(null);
    };

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        checkAuth,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;