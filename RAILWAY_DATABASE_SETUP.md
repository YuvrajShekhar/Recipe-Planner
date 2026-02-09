# 🗄️ Railway Database Setup - REQUIRED!

## ⚠️ Current Error

```
Traceback (most recent call last):
  File "/app/manage.py", line 22, in <module>
    main()
  File "/opt/venv/lib/python3.11/site-packages/django/core/management/__init__.py", line 382, in execute
    settings.INSTALLED_APPS
  File "/opt/venv/lib/python3.11/site-packages/django/conf/__init__.py", line 102, in __getattr__
    self._setup(name)
```

## 🔍 Root Cause

**You haven't added a PostgreSQL database to your Railway project yet!**

Your Django app is trying to run migrations, but there's no database configured. Railway needs you to explicitly add a PostgreSQL database service to your project.

## ✅ Solution: Add PostgreSQL Database

### Step 1: Open Your Railway Project

1. Go to [railway.app](https://railway.app)
2. Log in and open your Recipe Planner project
3. You should see your Django service running (or attempting to run)

### Step 2: Add PostgreSQL Database

**Option A: From Dashboard (Recommended)**

1. In your Railway project dashboard, click the **"+ New"** button (top right)
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will create a PostgreSQL database instance

**Option B: From Command Line**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Add PostgreSQL
railway add postgresql
```

### Step 3: Wait for Database Provisioning

- Railway will automatically provision the PostgreSQL database
- This takes about 30-60 seconds
- The database will appear as a new service in your project

### Step 4: Verify DATABASE_URL is Set

Railway automatically creates a `DATABASE_URL` environment variable:

1. Click on your **Django service** (not the database)
2. Go to the **"Variables"** tab
3. You should see `DATABASE_URL` listed (Railway adds this automatically when you add a database)
4. The format will be: `postgresql://username:password@host:port/dbname`

### Step 5: Redeploy Your Django App

After adding the database:

1. Go to your Django service
2. Click the **"Deployments"** tab
3. Click **"Redeploy"** on the latest deployment

OR just push a new commit:

```bash
git commit --allow-empty -m "Trigger redeploy with database"
git push origin main
```

## 🎯 What Will Happen After Adding Database

1. ✅ Railway sets `DATABASE_URL` environment variable automatically
2. ✅ Your Django app detects `DATABASE_URL` in settings.py
3. ✅ Migrations run successfully: `python manage.py migrate --no-input`
4. ✅ Your app starts with `gunicorn backend.wsgi`
5. ✅ Deployment succeeds! 🎉

## 📋 Optional: Set Other Environment Variables

While you're in the Variables tab, also set these (recommended):

```bash
# Generate a secret key first:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Then add to Railway:

```
SECRET_KEY=<paste-the-generated-key>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

**Note:** `SECRET_KEY` has a default fallback, but it's best practice to set a unique one for production.

## 🔗 Database Connection Details

After adding PostgreSQL, Railway provides these variables (automatically):

- `DATABASE_URL` - Full connection string (your Django app uses this)
- `PGHOST` - Database host
- `PGPORT` - Database port (usually 5432)
- `PGUSER` - Database username
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

**Your Django app only needs `DATABASE_URL`** - Railway sets it automatically!

## 🎓 Understanding Your Django Database Config

In your `backend/settings.py`:

```python
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    # Production - Railway PostgreSQL
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Local development - Your local PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'recipe_planner_db',
            'USER': 'recipe_user',
            'PASSWORD': 'yuvi@123',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }
```

This means:
- ✅ **On Railway**: Uses `DATABASE_URL` from Railway's PostgreSQL
- ✅ **Locally**: Uses your local database (`recipe_planner_db`)

## 🆘 Troubleshooting

### "Unable to connect to database"

- Verify PostgreSQL service is running in Railway (green dot)
- Check that `DATABASE_URL` is set in your Django service variables
- Try redeploying after database is fully provisioned

### "Relation does not exist" errors

- Migrations didn't run successfully
- Check Railway logs to see if migrations completed
- Manually run: `railway run python manage.py migrate`

### Database shows as "Crashed"

- Check database logs in Railway
- Database might need more resources (upgrade plan if needed)
- Try restarting the database service

## 📊 Visual Guide

```
Railway Project Structure (After Setup):
┌─────────────────────────────────────┐
│  Recipe Planner Project             │
│                                     │
│  ┌─────────────────┐  ┌──────────┐ │
│  │ Django Service  │  │PostgreSQL│ │
│  │ (backend.wsgi)  │──│ Database │ │
│  │                 │  │          │ │
│  │ Variables:      │  └──────────┘ │
│  │ • DATABASE_URL  │               │
│  │ • SECRET_KEY    │               │
│  │ • DEBUG         │               │
│  └─────────────────┘               │
└─────────────────────────────────────┘
```

## ✅ Checklist

Before your deployment will succeed, ensure:

- [ ] PostgreSQL database added to Railway project
- [ ] `DATABASE_URL` appears in Django service variables (automatic)
- [ ] Django service redeployed after adding database
- [ ] Migrations run successfully (check logs)
- [ ] Optional: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` set

## 🚀 Next Steps After Database Setup

1. ✅ Add PostgreSQL database (you're doing this now!)
2. ✅ Verify deployment succeeds
3. ✅ Get your deployment URL from Railway
4. ✅ Create a superuser (optional):
   ```bash
   railway run python manage.py createsuperuser
   ```
5. ✅ Update frontend to point to your Railway backend URL
6. ✅ Test your application!

---

**Quick Summary:**
1. Click "+ New" → "Database" → "PostgreSQL" in Railway dashboard
2. Wait 30-60 seconds for provisioning
3. Railway automatically sets `DATABASE_URL`
4. Redeploy your Django service
5. Done! ✅
