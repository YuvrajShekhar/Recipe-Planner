import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/ToastContainer';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Common Components
import { ProtectedRoute, ScrollToTop } from './components/common';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEdit from './pages/RecipeEdit';
import IngredientMatch from './pages/IngredientMatch';
import Pantry from './pages/Pantry';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Styles
import './styles/main.css';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Router>
                    <ScrollToTop />
                    <div className="app">
                        <Navbar />
                        <main className="page">
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/recipes" element={<Recipes />} />
                                <Route path="/recipes/:id" element={<RecipeDetail />} />
                                <Route path="/match" element={<IngredientMatch />} />
                                
                                {/* Protected Routes */}
                                <Route 
                                    path="/recipes/:id/edit" 
                                    element={
                                        <ProtectedRoute>
                                            <RecipeEdit />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/pantry" 
                                    element={
                                        <ProtectedRoute>
                                            <Pantry />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/favorites" 
                                    element={
                                        <ProtectedRoute>
                                            <Favorites />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/profile" 
                                    element={
                                        <ProtectedRoute>
                                            <Profile />
                                        </ProtectedRoute>
                                    } 
                                />
                                
                                {/* 404 Route */}
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;