import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recipeAPI, ingredientAPI } from '../services/api';
import { RecipeCard } from '../components/recipes';
import { Loading, Alert } from '../components/common';
import { useDocumentTitle } from '../hooks';

const Home = () => {
    useDocumentTitle('Home - Find Recipes with Your Ingredients');
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const [featuredRecipes, setFeaturedRecipes] = useState([]);
    const [recentRecipes, setRecentRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ recipes: 0, ingredients: 0 });

    useEffect(() => {
        loadHomeData();
    }, []);

    const loadHomeData = async () => {
        try {
            setLoading(true);
            
            // Load recipes and ingredients count
            const [recipesRes, ingredientsRes] = await Promise.all([
                recipeAPI.getAll({ limit: 6 }),
                ingredientAPI.getAll()
            ]);

            const recipes = recipesRes.data.recipes || [];
            
            // Split into featured (easy) and recent
            const easyRecipes = recipes.filter(r => r.difficulty === 'easy').slice(0, 3);
            const otherRecipes = recipes.slice(0, 3);

            setFeaturedRecipes(easyRecipes.length > 0 ? easyRecipes : otherRecipes);
            setRecentRecipes(recipes.slice(0, 6));
            
            setStats({
                recipes: recipesRes.data.count || recipes.length,
                ingredients: ingredientsRes.data.count || 0
            });

        } catch (err) {
            console.error('Error loading home data:', err);
            setError('Failed to load recipes. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/recipes?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleFavoriteToggle = (recipeId, isFavorited) => {
        // Update local state if needed
        setFeaturedRecipes(prev => 
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
        setRecentRecipes(prev => 
            prev.map(r => r.id === recipeId ? { ...r, is_favorited: isFavorited } : r)
        );
    };

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background">
                    <div className="hero-overlay"></div>
                </div>
                <div className="container">
                    <div className="hero-content">
                        <h1>
                            Find Recipes with
                            <span className="highlight"> Ingredients You Have</span>
                        </h1>
                        <p className="hero-subtitle">
                            Stop wondering what to cook! Enter the ingredients in your kitchen
                            and discover delicious recipes you can make right now.
                        </p>

                        {/* Search Bar */}
                        <form className="hero-search" onSubmit={handleSearch}>
                            <div className="search-input-wrapper">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search recipes by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-large">
                                Search
                            </button>
                        </form>

                        {/* CTA Buttons */}
                        <div className="hero-cta">
                            <Link to="/match" className="btn btn-secondary btn-large">
                                🥗 Find by Ingredients
                            </Link>
                            {!isAuthenticated && (
                                <Link to="/register" className="btn btn-outline-light btn-large">
                                    Create Free Account
                                </Link>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="hero-stats">
                            <div className="hero-stat">
                                <span className="stat-number">{stats.recipes}+</span>
                                <span className="stat-label">Recipes</span>
                            </div>
                            <div className="hero-stat">
                                <span className="stat-number">{stats.ingredients}+</span>
                                <span className="stat-label">Ingredients</span>
                            </div>
                            <div className="hero-stat">
                                <span className="stat-number">100%</span>
                                <span className="stat-label">Free</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Welcome Message for Logged In Users */}
            {isAuthenticated && (
                <section className="welcome-section">
                    <div className="container">
                        <div className="welcome-card">
                            <div className="welcome-content">
                                <h2>Welcome back, {user.username}! 👋</h2>
                                <p>Ready to cook something delicious today?</p>
                            </div>
                            <div className="welcome-actions">
                                <Link to="/pantry" className="btn btn-primary">
                                    Manage Pantry
                                </Link>
                                <Link to="/favorites" className="btn btn-secondary">
                                    View Favorites
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* How It Works Section */}
            <section className="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <h2>How It Works</h2>
                        <p>Find the perfect recipe in 3 simple steps</p>
                    </div>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <div className="step-icon">🥕</div>
                            <h3>Select Ingredients</h3>
                            <p>Choose the ingredients you have available in your kitchen or pantry</p>
                        </div>

                        <div className="step-card">
                            <div className="step-number">2</div>
                            <div className="step-icon">🔍</div>
                            <h3>Find Matches</h3>
                            <p>Our smart algorithm finds recipes that match your ingredients</p>
                        </div>

                        <div className="step-card">
                            <div className="step-number">3</div>
                            <div className="step-icon">🍳</div>
                            <h3>Start Cooking</h3>
                            <p>Follow the recipe and enjoy a delicious homemade meal</p>
                        </div>
                    </div>

                    <div className="text-center mt-30">
                        <Link to="/match" className="btn btn-primary btn-large">
                            Try It Now - It's Free!
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Recipes Section */}
            <section className="featured-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Easy Recipes to Get Started</h2>
                        <p>Perfect for beginners or when you're short on time</p>
                    </div>

                    {loading ? (
                        <Loading message="Loading recipes..." />
                    ) : error ? (
                        <Alert type="error" message={error} />
                    ) : featuredRecipes.length > 0 ? (
                        <>
                            <div className="recipes-grid grid grid-3">
                                {featuredRecipes.map(recipe => (
                                    <RecipeCard 
                                        key={recipe.id} 
                                        recipe={recipe}
                                        onFavoriteToggle={handleFavoriteToggle}
                                    />
                                ))}
                            </div>
                            <div className="text-center mt-30">
                                <Link to="/recipes?difficulty=easy" className="btn btn-outline">
                                    View All Easy Recipes →
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>No recipes available yet.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* All Recipes Section */}
            <section className="recent-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Browse All Recipes</h2>
                        <p>Discover our complete collection of delicious recipes</p>
                    </div>

                    {!loading && recentRecipes.length > 0 && (
                        <>
                            <div className="recipes-grid grid grid-3">
                                {recentRecipes.map(recipe => (
                                    <RecipeCard 
                                        key={recipe.id} 
                                        recipe={recipe}
                                        onFavoriteToggle={handleFavoriteToggle}
                                    />
                                ))}
                            </div>
                            <div className="text-center mt-30">
                                <Link to="/recipes" className="btn btn-primary">
                                    View All Recipes →
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Why Use RecipePlanner?</h2>
                        <p>Everything you need to plan your meals efficiently</p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🎯</div>
                            <h3>Smart Matching</h3>
                            <p>Our algorithm calculates match percentages to help you find recipes you can actually make.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">📱</div>
                            <h3>Pantry Management</h3>
                            <p>Keep track of ingredients you have at home and find recipes instantly.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">❤️</div>
                            <h3>Save Favorites</h3>
                            <p>Build your personal collection of favorite recipes for quick access.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">🛒</div>
                            <h3>Shopping Lists</h3>
                            <p>See exactly which ingredients you're missing for any recipe.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!isAuthenticated && (
                <section className="cta-section">
                    <div className="container">
                        <div className="cta-content">
                            <h2>Ready to Start Cooking?</h2>
                            <p>Create a free account to save your favorites and manage your pantry</p>
                            <div className="cta-buttons">
                                <Link to="/register" className="btn btn-primary btn-large">
                                    Get Started Free
                                </Link>
                                <Link to="/recipes" className="btn btn-outline-light btn-large">
                                    Browse Recipes
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;