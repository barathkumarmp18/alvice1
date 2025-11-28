# 🔍 Troubleshooting: Black Screen Issue

## Issue: Black Screen on Preview URL

You've added the domain to Firebase Console, but still seeing a black screen. Let's diagnose and fix this!

---

## ✅ What's Working

- Firebase credentials configured
- Firebase SDK initialized (verified in console)
- App runs perfectly on localhost:5000
- Login screen displays correctly locally

---

## 🐛 Possible Causes

### 1. **Browser Caching** (Most Common)
The browser might be caching an old version of the app.

**Solution:**
```
1. Open the preview URL in browser
2. Open DevTools (F12)
3. Right-click the Refresh button
4. Select "Empty Cache and Hard Reload"
```

Or use **Incognito/Private Mode**:
```
1. Open a new Incognito/Private window
2. Navigate to your preview URL
3. Check if it loads correctly
```

### 2. **Service Worker Issues**
An old service worker might be cached and causing issues.

**Solution:**
```
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in left sidebar
4. Click "Unregister" for any service workers
5. Refresh the page
```

### 3. **Console Errors**
JavaScript errors preventing the app from loading.

**Check:**
```
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for red error messages
4. Share the errors if you see any
```

### 4. **Network Issues**
Firebase or app resources not loading.

**Check:**
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Refresh the page
4. Look for failed requests (red)
5. Check if Firebase scripts loaded
```

### 5. **Environment Variables Not Loading**
Preview URL might not have access to .env file.

**Verify:**
```javascript
// Check in browser console:
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Should show your Firebase credentials
// If shows undefined, env variables aren't loading
```

---

## 🔧 Quick Fixes

### Fix 1: Force Reload Everything

```bash
# In the terminal, restart the app completely:
sudo supervisorctl restart app

# Wait 10 seconds
# Then hard refresh browser (Ctrl+Shift+R)
```

### Fix 2: Check Browser Console

Open browser DevTools and look for:
- ✅ `✅ Firebase Config Loaded`
- ✅ `✅ Firebase App initialized successfully`
- ✅ `🚀 Firebase SDK ready`

If you DON'T see these, there's a Firebase config issue.

### Fix 3: Verify the Correct Preview URL

The preview URL should be:
```
https://debug-preview-1.preview.emergentagent.com
```

Make sure:
1. This exact domain is added to Firebase Console
2. You're accessing the correct URL
3. HTTPS (not HTTP)

---

## 🔍 Diagnostic Steps

### Step 1: Check App is Running

```bash
# Check if process is running
sudo supervisorctl status app

# Should show: RUNNING

# Check if port is listening
netstat -tuln | grep 5000

# Should show port 5000 LISTEN
```

### Step 2: Check Logs

```bash
# View recent logs
tail -50 /var/log/supervisor/app.out.log

# Look for:
# - "serving on port 5000"
# - Any error messages
```

### Step 3: Test Localhost

```bash
# Test if app works locally
curl http://localhost:5000

# Should return HTML content
```

### Step 4: Browser DevTools

1. Open preview URL
2. Press F12 (DevTools)
3. Check **Console** tab for errors
4. Check **Network** tab for failed requests
5. Check **Application** → **Storage** → Check if Firebase config is there

---

## 🚀 Step-by-Step Resolution

### Option A: Complete Fresh Start

```bash
# 1. Stop all processes
sudo supervisorctl stop app
pkill -f "npm"
pkill -f "vite"

# 2. Clear any cached files
cd /app
rm -rf node_modules/.vite
rm -rf client/.vite

# 3. Restart
sudo supervisorctl start app

# 4. Wait 10 seconds
sleep 10

# 5. Test
curl http://localhost:5000 | grep "Alvice"
```

### Option B: Check Environment

```bash
# Verify .env file exists and has content
cat /app/.env

# Should show your Firebase credentials
# If empty or missing, that's the issue!
```

### Option C: Production Build

If dev mode has issues, try a production build:

```bash
# Build the app
cd /app
npm run build

# Run production mode
npm run start
```

---

## 📊 Expected Behavior

### Working State:

**Browser Console should show:**
```
✅ Firebase Config Loaded: {projectId: alvice12345, ...}
✅ Firebase App initialized successfully
✅ Firebase Analytics initialized
🚀 Firebase SDK ready
```

**Page should display:**
- Alvice logo (orange text)
- "Welcome back" heading
- Google sign-in button
- Email/password form
- Sign up link

**Network tab should show:**
- Firebase scripts loaded (200 status)
- Vite HMR connected
- No 404 errors

---

## 🆘 Still Black Screen?

If you've tried everything above and still see black screen, provide:

1. **Browser Console Screenshot**
   - Press F12
   - Go to Console tab
   - Screenshot showing any errors

2. **Network Tab Screenshot**
   - Press F12
   - Go to Network tab
   - Refresh page
   - Screenshot showing requests

3. **Application Tab Check**
   - Press F12
   - Go to Application → Storage → Local Storage
   - Screenshot showing what's stored

4. **Exact URL** you're accessing

5. **Browser** and version you're using

---

## 💡 Additional Checks

### Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/alvice12345)
2. Check **Authentication** → **Users**
   - Should be empty (no users yet)
3. Check **Firestore Database**
   - Should exist but empty
4. Check **Storage**
   - Should exist but empty

### Check Authorized Domains

Firebase Console → Authentication → Settings → Authorized domains

Should include:
- ✅ `alvice12345.firebaseapp.com` (default)
- ✅ `localhost`
- ✅ `5e884c69-d280-46df-a355-770ea56b7ca0.preview.emergentagent.com`

---

## 🔐 Security Check

If you see errors about CORS or blocked requests:

```
Error: "Blocked by CORS policy"
Error: "Failed to load resource"
```

This means Firebase security is working! But it needs the domain authorized.

**Double-check:**
1. Domain is EXACTLY correct (no typos)
2. Domain was saved in Firebase Console
3. May take 1-2 minutes to propagate

---

## 📞 Quick Test Checklist

Run these in order:

1. ✅ App running? `sudo supervisorctl status app` → Should be RUNNING
2. ✅ Port listening? `netstat -tuln | grep 5000` → Should show LISTEN
3. ✅ Localhost works? `curl http://localhost:5000` → Should return HTML
4. ✅ .env exists? `cat /app/.env` → Should show Firebase config
5. ✅ Browser cache cleared? Hard refresh (Ctrl+Shift+R)
6. ✅ DevTools console? Should show Firebase initialized messages
7. ✅ Domain authorized? Check Firebase Console

---

## 🎯 Most Likely Solution

**95% of "black screen" issues are:**
1. **Browser cache** - Hard refresh fixes it
2. **Old service worker** - Unregister in DevTools
3. **Wrong URL** - Double-check you're using the correct preview URL

**Try these first before anything else!**

---

## ✅ Success Indicators

You'll know it's working when:
- Page loads with Alvice login screen
- Console shows Firebase initialized messages
- Can click buttons and see UI responses
- No red errors in console

---

Let me know what you see in the browser console and I'll help you fix it! 🚀
