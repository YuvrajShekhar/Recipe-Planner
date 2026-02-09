# Railway.app Deployment Guide

This guide will help you deploy your Recipe Planner backend to Railway.app.

## Files Created for Deployment

✅ **requirements.txt** - Python dependencies including gunicorn
✅ **Procfile** - Tells Railway how to run your Django app
✅ **runtime.txt** - Specifies Python version (3.11.9)
✅ **railway.json** - Railway-specific configuration
✅ **nixpacks.toml** - Nixpacks build configuration
✅ **Updated settings.py** - Production-ready configuration
✅ **.env.example** - Template for environment variables
✅ **.gitignore** - Prevents sensitive data from being committed

## Step-by-Step Deployment

### 1. Prepare Your Repository

Before deploying to Railway, ensure your code is committed to Git:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Railway deployment"

# Push to GitHub (create a repo first on github.com)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up using your GitHub account
3. Verify your email address

### 3. Create New Project on Railway

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your repository (recipe-planner)
4. Railway will automatically detect it's a Django project

### 4. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically added

### 5. Configure Environment Variables

In your Railway project settings, add these environment variables:

**Required Variables:**

```
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

**Optional Variables (will be set after deployment):**

```
FRONTEND_URL=https://your-frontend-url.vercel.app
BACKEND_URL=https://your-backend-url.railway.app
```

**To generate a secure SECRET_KEY:**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 6. Deploy

1. Railway will automatically deploy when you push to your main branch
2. Monitor the deployment logs in the Railway dashboard
3. Wait for the deployment to complete (usually 2-5 minutes)

### 7. Run Migrations

After successful deployment:

1. Go to your project in Railway dashboard
2. Click on your service
3. Go to the **"Deploy"** tab
4. The migrations will run automatically due to the `release` command in Procfile
5. Or manually run: `python manage.py migrate`

### 8. Create Superuser (Optional)

To access Django admin in production:

1. In Railway dashboard, click on your service
2. Go to **"Settings"** → **"Deploy Logs"**
3. Use the Railway CLI to run commands:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Create superuser
railway run python manage.py createsuperuser
```

### 9. Get Your Deployment URL

1. In Railway dashboard, go to **"Settings"**
2. Under **"Domains"**, you'll see your deployment URL
3. It will be something like: `https://your-project-name.railway.app`
4. Copy this URL for your frontend configuration

### 10. Update Frontend Configuration

In your React frontend ([frontend/src/services/api.js](frontend/src/services/api.js)), update the base URL:

```javascript
const API_BASE_URL = 'https://your-railway-app.railway.app/api';
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Django secret key for security | ✅ Yes | - |
| `DEBUG` | Debug mode (set to False in production) | ✅ Yes | False |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts | ✅ Yes | * |
| `DATABASE_URL` | PostgreSQL connection string | Auto-set | - |
| `FRONTEND_URL` | Your frontend URL for CORS | Optional | localhost:3000 |
| `BACKEND_URL` | Your backend URL | Auto-set | - |

## Troubleshooting

### ❌ "No start command was found" Error

**Cause**: Railway couldn't find the start command or detected the wrong root directory.

**Solution**: This is fixed by the `railway.json` and `nixpacks.toml` files that were created. Make sure both files are committed to your repository.

### ❌ Python Version Error ("no precompiled python found")

**Cause**: Railway doesn't support Python 3.8.10 as a precompiled package.

**Solution**: Updated `runtime.txt` to Python 3.11.9 which is fully supported by Railway.

### ❌ "root directory set as 'backend'" Error

**Cause**: Railway auto-detected a `backend` folder and set it as root.

**Solution**: The `railway.json` file configures Railway to use the correct root directory where `manage.py` is located.

### ❌ "pip: command not found" Error (exit code: 127)

**Cause**: The nixpacks configuration was trying to use `pip` before Python was properly set up, or was manually specifying the install phase incorrectly.

**Solution**: Updated `nixpacks.toml` to use `'...'` which tells Railway to auto-detect Python and handle the installation automatically. This ensures pip is available when needed.

### ❌ PostgreSQL Package Collision Error (exit code: 25)

**Cause**: Conflict between `postgresql-16.4-dev` and `postgresql-16.4` packages. This happened when manually adding `postgresql` to nixPkgs while `'...'` was already auto-detecting and including it.

**Solution**: Removed the manual `postgresql` package from `nixpacks.toml`. The `'...'` auto-detection handles all required packages including PostgreSQL client libraries needed by `psycopg2`. Final config: `nixPkgs = ['...']`

### Migration Issues

If migrations fail:

```bash
# Using Railway CLI
railway run python manage.py migrate --run-syncdb
```

### Static Files Not Loading

Ensure WhiteNoise is in requirements.txt and settings.py is configured correctly (already done).

### CORS Errors

1. Add your frontend URL to `FRONTEND_URL` environment variable
2. Restart your Railway service

### Database Connection Issues

1. Verify PostgreSQL database is running in Railway
2. Check that `DATABASE_URL` is set automatically
3. Review logs for connection errors

### Build Fails After Following This Guide

1. Ensure all new files are committed:
   ```bash
   git add railway.json nixpacks.toml runtime.txt
   git commit -m "Fix Railway deployment configuration"
   git push origin main
   ```

2. In Railway dashboard, trigger a new deployment:
   - Go to your service
   - Click "Deployments"
   - Click "Redeploy" on the latest deployment

## Monitoring

- **Logs**: View in Railway dashboard under "Deploy Logs"
- **Metrics**: Check CPU, Memory, Network usage in Railway dashboard
- **Database**: Monitor PostgreSQL database in Railway

## Continuous Deployment

Railway automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will:
1. Detect the push
2. Build your application
3. Run migrations (via Procfile release command)
4. Deploy the new version

## Cost

- Railway offers a **free tier** with limited hours
- After free tier, costs scale based on usage
- Monitor your usage in Railway dashboard

## Next Steps

1. ✅ Deploy backend to Railway (this guide)
2. 🔄 Deploy frontend to Vercel/Netlify
3. 🔄 Update frontend API URL to Railway backend
4. 🔄 Test full application flow
5. 🔄 Set up custom domain (optional)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Django Deployment: https://docs.djangoproject.com/en/4.2/howto/deployment/

---

**Note**: The database credentials in your local `settings.py` are for development only. Railway will automatically provide a production PostgreSQL database with the `DATABASE_URL` environment variable.
