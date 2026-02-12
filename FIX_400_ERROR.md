# 🔧 Fix 400 Bad Request Error

## Problem

Your Django app is deployed and running, but returns **400 Bad Request** when you visit the URL:

```
GET /favicon.ico 400 34ms
GET /admin 400 26ms
```

## Root Cause

Django's `ALLOWED_HOSTS` security setting is rejecting requests because your Railway domain wasn't properly configured.

## ✅ Solution Applied

Updated [backend/settings.py](backend/settings.py) to automatically detect and allow Railway domains:

### Changes Made:

1. **ALLOWED_HOSTS** - Now automatically includes:
   - Railway environment variables (`RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_STATIC_URL`)
   - All `*.railway.app` domains
   - Fallback to `*` for development

2. **CSRF_TRUSTED_ORIGINS** - Updated to include:
   - Railway environment variables
   - All Railway HTTPS domains
   - Your custom backend URL

## 🚀 Deploy the Fix

```bash
git add backend/settings.py FIX_400_ERROR.md
git commit -m "Fix 400 error - auto-detect Railway domains in ALLOWED_HOSTS"
git push origin main
```

Railway will automatically redeploy (takes ~2-3 minutes).

## ✅ Verify It Works

After deployment completes:

### 1. Test Root URL
Visit your Railway URL in browser:
```
https://your-app.railway.app/
```

You should see a different response (not 400).

### 2. Test Django Admin
```
https://your-app.railway.app/admin/
```

Should show Django admin login page.

### 3. Test API Endpoints
```bash
# Test recipes endpoint
curl https://your-app.railway.app/api/recipes/

# Should return JSON data or empty list []
```

## 🔍 What Each Endpoint Should Return

| Endpoint | Expected Response |
|----------|-------------------|
| `/` | DRF browsable API or 404 |
| `/admin/` | Django admin login page |
| `/api/` | API root view (DRF) |
| `/api/recipes/` | JSON list of recipes |
| `/api/ingredients/` | JSON list of ingredients |

## 🛡️ How It Works Now

Your `settings.py` automatically detects Railway deployment:

```python
# Automatically add Railway domain
if os.getenv('RAILWAY_PUBLIC_DOMAIN'):
    ALLOWED_HOSTS.append(os.getenv('RAILWAY_PUBLIC_DOMAIN'))

# Allow all Railway.app domains
ALLOWED_HOSTS.extend(['*.railway.app', '.railway.app'])

# Fallback for development
if not ALLOWED_HOSTS or DEBUG:
    ALLOWED_HOSTS = ['*']
```

## 🆘 Still Getting 400?

### Option 1: Check Railway Logs

1. Go to Railway dashboard
2. Click your Django service
3. Click "Deployments" tab
4. Click on latest deployment
5. Check logs for errors

### Option 2: Temporarily Enable Debug Mode

⚠️ **Only for testing, not production!**

Add this environment variable in Railway:

```
DEBUG=True
```

Then visit your URL. You'll see detailed error information.

**Remember to set `DEBUG=False` after troubleshooting!**

### Option 3: Force Allow All Hosts

Add this environment variable in Railway:

```
ALLOWED_HOSTS=*
```

This bypasses all host checking. Use only for testing.

## 📊 Settings Priority

Your Django settings now follow this priority:

1. **Environment Variables** (highest priority)
   - `ALLOWED_HOSTS` from Railway
   - `RAILWAY_PUBLIC_DOMAIN`
   - `RAILWAY_STATIC_URL`

2. **Auto-Detection**
   - All `*.railway.app` domains
   - All `.railway.app` domains

3. **Fallback** (lowest priority)
   - `*` (allow all) if DEBUG=True or no hosts configured

## ✅ After Fix Works

Once you confirm the 400 error is fixed:

1. ✅ Your backend API is fully accessible
2. ✅ You can access Django admin at `/admin/`
3. ✅ All API endpoints work correctly
4. ✅ Ready to connect your React frontend!

## 🎯 Next Steps

1. ✅ Fix 400 error (deploy this commit)
2. ⏭️ Test all API endpoints work
3. ⏭️ Create Django superuser (optional):
   ```bash
   railway run python manage.py createsuperuser
   ```
4. ⏭️ Get your Railway URL and add to React frontend
5. ⏭️ Deploy React frontend with backend URL

---

**Deploy Command:**
```bash
git add backend/settings.py FIX_400_ERROR.md
git commit -m "Fix 400 Bad Request - auto-detect Railway domains"
git push origin main
```

Wait 2-3 minutes, then test your Railway URL! 🚀
