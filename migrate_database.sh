#!/bin/bash
# Database Migration Script: Local PostgreSQL → Railway PostgreSQL

set -e  # Exit on error

echo "🗄️  Database Migration: Local → Railway"
echo "========================================"
echo ""

# Step 1: Create dump from local database
echo "📦 Step 1: Creating dump from local database..."
pg_dump -U recipe_user -d recipe_planner_db -F c -f recipe_planner_dump.backup
echo "✅ Dump created: recipe_planner_dump.backup"
echo ""

# Step 2: Check if Railway CLI is installed
echo "🔍 Step 2: Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm i -g @railway/cli
    echo "✅ Railway CLI installed"
else
    echo "✅ Railway CLI found"
fi
echo ""

# Step 3: Link to Railway (if not already linked)
echo "🔗 Step 3: Linking to Railway project..."
echo "Please follow the prompts to login and select your project..."
railway link
echo ""

# Step 4: Restore to Railway database
echo "📥 Step 4: Restoring dump to Railway database..."
echo "This may take a few minutes depending on database size..."
railway run pg_restore --no-owner --no-acl --clean --if-exists -d \$DATABASE_URL recipe_planner_dump.backup
echo "✅ Database restored to Railway"
echo ""

# Step 5: Verify migration
echo "🔍 Step 5: Verifying migration..."
echo ""
echo "Recipe count:"
railway run psql \$DATABASE_URL -c "SELECT COUNT(*) FROM recipes_recipe;"
echo ""
echo "Ingredient count:"
railway run psql \$DATABASE_URL -c "SELECT COUNT(*) FROM recipes_ingredient;"
echo ""
echo "User count:"
railway run psql \$DATABASE_URL -c "SELECT COUNT(*) FROM auth_user;"
echo ""

echo "🎉 Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test your Railway API endpoints"
echo "2. Update your React frontend with Railway URL"
echo "3. Deploy your frontend"
echo ""
