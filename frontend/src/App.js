import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import IngredientMatch from './pages/IngredientMatch';
import Pantry from './pages/Pantry';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app">
                    <Navbar />
                    <main className="page">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/recipes" element={<Recipes />} />
                            <Route path="/recipes/:id" element={<RecipeDetail />} />
                            <Route path="/match" element={<IngredientMatch />} />
                            <Route path="/pantry" element={<Pantry />} />
                            <Route path="/favorites" element={<Favorites />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;