# 🗄️ Migrate Database from Local to Railway

## Overview

You need to:
1. Export (dump) your local PostgreSQL database
2. Import (restore) it to Railway PostgreSQL

## Method 1: Using pg_dump and Railway CLI (Recommended)

### Step 1: Create a Dump from Your Local Database

```bash
# Navigate to your project directory
cd /root/Project_Software_Enginnering/recipe-planner

# Create a database dump
pg_dump -U recipe_user -d recipe_planner_db -F c -f recipe_planner_dump.backup

# Or as plain SQL (alternative)
pg_dump -U recipe_user -d recipe_planner_db > recipe_planner_dump.sql
```

**Enter password when prompted:** `yuvi@123`

### Step 2: Install Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Verify installation
railway --version
```

### Step 3: Login and Link to Your Project

```bash
# Login to Railway
railway login

# Navigate to your project directory
cd /root/Project_Software_Enginnering/recipe-planner

# Link to your Railway project
railway link
```

Follow the prompts to select your Recipe Planner project.

### Step 4: Get Railway Database Connection String

```bash
# Show all environment variables (including DATABASE_URL)
railway variables

# Or specifically get DATABASE_URL
railway variables | grep DATABASE_URL
```

Copy the `DATABASE_URL` - it looks like:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

### Step 5: Restore to Railway Database

**Option A: Using Custom Format Dump (.backup)**

```bash
# Restore the custom format dump
pg_restore --no-owner --no-acl -d "postgresql://postgres:PASSWORD@HOST:PORT/railway" recipe_planner_dump.backup
```

**Option B: Using SQL Dump (.sql)**

```bash
# Restore the SQL dump
psql "postgresql://postgres:PASSWORD@HOST:PORT/railway" < recipe_planner_dump.sql
```

**Option C: Using Railway CLI Directly**

```bash
# Connect to Railway database and restore
railway run psql $DATABASE_URL < recipe_planner_dump.sql
```

---

## Method 2: Django dumpdata/loaddata (Simpler but Slower)

This method uses Django's built-in commands - good for smaller databases.

### Step 1: Export Data from Local Database

```bash
# Activate your virtual environment
source venv/bin/activate

# Export all data to JSON
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude contenttypes --exclude auth.permission \
  --indent 2 > database_dump.json

# Or export specific apps only
python manage.py dumpdata recipes --indent 2 > recipes_dump.json
```

### Step 2: Upload Data to Railway

```bash
# Make sure Railway CLI is installed and linked
railway login
railway link

# Set the DATABASE_URL to use Railway's database
# Then load the data
railway run python manage.py loaddata database_dump.json
```

---

## Method 3: Using pgAdmin or DBeaver (GUI Method)

### Step 1: Export from Local Database

**Using pgAdmin:**
1. Open pgAdmin
2. Right-click on `recipe_planner_db` database
3. Select "Backup..."
4. Choose format: "Custom" or "Plain"
5. Specify filename: `recipe_planner_backup.backup`
6. Click "Backup"

**Using DBeaver:**
1. Open DBeaver
2. Connect to your local database
3. Right-click on database → Tools → Dump database
4. Save the dump file

### Step 2: Get Railway Database Credentials

In Railway dashboard:
1. Click on your PostgreSQL service
2. Go to "Connect" tab
3. Copy the connection details or full `DATABASE_URL`

### Step 3: Import to Railway Database

**Using pgAdmin:**
1. Add new server connection in pgAdmin
2. Use Railway database credentials
3. Right-click on Railway database
4. Select "Restore..."
5. Select your backup file
6. Click "Restore"

**Using DBeaver:**
1. Create new connection with Railway credentials
2. Right-click on database → Tools → Restore database
3. Select your dump file

---

## Method 4: Direct PostgreSQL Connection (Advanced)

### Step 1: Create Dump

```bash
# Create a compressed dump
pg_dump -U recipe_user -h localhost -d recipe_planner_db -F c -b -v -f recipe_dump.backup

# Password: yuvi@123
```

### Step 2: Get Railway Database Info

```bash
# Get Railway database connection string
railway variables | grep DATABASE_URL

# Example output:
# DATABASE_URL=postgresql://postgres:xxx@containers-us-west-xxx.railway.app:7432/railway
```

### Step 3: Restore to Railway

```bash
# Parse the DATABASE_URL components
# HOST: containers-us-west-xxx.railway.app
# PORT: 7432
# USER: postgres
# PASSWORD: xxx
# DATABASE: railway

# Restore the dump
pg_restore --no-owner --no-acl -h containers-us-west-xxx.railway.app \
  -p 7432 -U postgres -d railway recipe_dump.backup
```

Enter the password when prompted.

---

## 🎯 Recommended Approach

**For your case, I recommend Method 1 (pg_dump + Railway CLI):**

```bash
# 1. Create dump from local database
pg_dump -U recipe_user -d recipe_planner_db -F c -f recipe_dump.backup

# 2. Install Railway CLI
npm i -g @railway/cli

# 3. Login and link
railway login
railway link

# 4. Restore to Railway
railway run pg_restore --no-owner --no-acl -d $DATABASE_URL recipe_dump.backup
```

---

## ⚠️ Important Notes

### Before Migration:

1. **Backup Railway database first** (just in case):
   ```bash
   railway run pg_dump $DATABASE_URL > railway_backup.sql
   ```

2. **Check if tables exist**:
   ```bash
   railway run psql $DATABASE_URL -c "\dt"
   ```

3. **If tables exist, you may need to drop them first**:
   ```bash
   railway run python manage.py migrate --fake-initial
   ```

### Data Conflicts:

If you get errors about existing data:

```bash
# Option 1: Use --clean flag to drop existing objects
pg_restore --clean --no-owner --no-acl -d "DATABASE_URL" recipe_dump.backup

# Option 2: Clear Railway database first
railway run psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
railway run python manage.py migrate

# Then restore your data
railway run pg_restore --no-owner --no-acl -d $DATABASE_URL recipe_dump.backup
```

---

## 🔍 Verify Migration

After restoring, verify data was migrated:

```bash
# Check table counts
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes_recipe;"
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes_ingredient;"
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM auth_user;"

# Or use Django shell
railway run python manage.py shell

# In shell:
>>> from recipes.models import Recipe, Ingredient
>>> Recipe.objects.count()
>>> Ingredient.objects.count()
```

---

## 🆘 Troubleshooting

### Error: "role does not exist"

Use `--no-owner` flag:
```bash
pg_restore --no-owner --no-acl -d $DATABASE_URL recipe_dump.backup
```

### Error: "permission denied"

Railway database user might not have all permissions. Use:
```bash
pg_restore --no-owner --no-acl --if-exists -d $DATABASE_URL recipe_dump.backup
```

### Error: "relation already exists"

Tables are already created by migrations. Use:
```bash
pg_restore --data-only --no-owner -d $DATABASE_URL recipe_dump.backup
```

Or drop and recreate:
```bash
railway run psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
railway run python manage.py migrate
pg_restore --no-owner --no-acl -d $DATABASE_URL recipe_dump.backup
```

### Check if dump file is valid:

```bash
pg_restore --list recipe_dump.backup | head -20
```

---

## 📋 Quick Reference Commands

```bash
# LOCAL → DUMP
pg_dump -U recipe_user -d recipe_planner_db -F c -f dump.backup

# RAILWAY CLI SETUP
npm i -g @railway/cli
railway login
railway link

# DUMP → RAILWAY
railway run pg_restore --no-owner --no-acl -d $DATABASE_URL dump.backup

# VERIFY
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM recipes_recipe;"
```

---

## ✅ Post-Migration Checklist

After successful migration:

- [ ] Verify record counts match local database
- [ ] Test API endpoints return correct data
- [ ] Test user login (if you have users)
- [ ] Test recipe matching functionality
- [ ] Test admin panel access
- [ ] Update any hardcoded IDs in frontend (if any)

---

## 🎉 Success!

Once migration is complete, your Railway database will have all your:
- ✅ Recipes
- ✅ Ingredients
- ✅ Users
- ✅ Pantry items
- ✅ Favorites
- ✅ Nutritional data

Your production backend is now fully populated! 🚀
