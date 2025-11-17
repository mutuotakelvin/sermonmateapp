# Debug Setup Complete ✅

I've added comprehensive debugging to help identify the login 500 error issue.

## What I've Added

### 1. Enhanced Logging
- **Detailed request logging** - Shows full URL, headers, and payload (password hidden)
- **Detailed response logging** - Shows status, response data, and error details
- **Login attempt logging** - Logs when login is attempted with API URL

### 2. Debug Tools
- **`capture-logs.sh`** - Script to easily capture Android logs
- **`apiTest.ts`** - Function to test API connectivity
- **`DEBUGGING_GUIDE.md`** - Complete guide on how to debug

### 3. Improved Error Handling
- Better error messages for different scenarios
- More detailed error logging

## Next Steps - How to Debug

### Step 1: Rebuild Your App
```bash
cd aipreacher
eas build --profile preview --platform android
```

### Step 2: Install the New APK on Your Phone

### Step 3: Connect Phone and Capture Logs

**Option A - Use the script (easiest):**
```bash
cd aipreacher
./capture-logs.sh
```

**Option B - Manual command:**
```bash
adb logcat | grep -E "API|Error|LOGIN|ReactNative"
```

### Step 4: Try to Login
While the log capture is running, try to login from your app.

### Step 5: Look for These Logs

You should see logs like this when you try to login:

```
=== API Configuration ===
Using API Base URL: https://api.sermonmate.bobakdevs.com/api/v1

🔐 LOGIN ATTEMPT
Full Login URL: https://api.sermonmate.bobakdevs.com/api/v1/login

═══════════════════════════════════════
📤 API REQUEST
═══════════════════════════════════════
Method: POST
Full URL: https://api.sermonmate.bobakdevs.com/api/v1/login
Headers: {...}
Request payload: {"email":"...","password":"***HIDDEN***"}
═══════════════════════════════════════
```

If there's an error, you'll see:

```
═══════════════════════════════════════
❌ API RESPONSE ERROR
═══════════════════════════════════════
Status: 500
Full URL: https://api.sermonmate.bobakdevs.com/api/v1/login
Response Data: {...}
═══════════════════════════════════════
```

### Step 6: Share the Logs

Copy the relevant log sections (especially the error section if there is one) and share them with me.

## What to Check

1. **Is the API URL correct?**
   - Should be: `https://api.sermonmate.bobakdevs.com/api/v1`
   - Check the "Using API Base URL" log

2. **Is the full URL correct?**
   - Should be: `https://api.sermonmate.bobakdevs.com/api/v1/login`
   - Check the "Full URL" in the API REQUEST log

3. **What's the error?**
   - Check the "Response Data" in the error log
   - This will tell us what the server is saying

4. **Is it a network error?**
   - If you see "Network Error - No response received", it's a connectivity issue
   - Check internet connection on your phone

## Expected Behavior

Since your server logs show the API is working, the issue is likely:

1. **Wrong URL** - But we've hardcoded it, so this shouldn't happen
2. **Request format issue** - The logs will show this
3. **CORS issue** - Less likely since it's a mobile app
4. **Network connectivity** - Check phone's internet

## Quick Test

After rebuilding, the logs will automatically show:
- The API URL being used
- The exact request being sent
- The exact response (or error) received

This will tell us exactly what's wrong!

## Files Changed

- `lib/api.ts` - Enhanced logging
- `lib/stores/auth.ts` - Added login attempt logging
- `lib/apiTest.ts` - New file for API testing
- `capture-logs.sh` - New script for log capture
- `DEBUGGING_GUIDE.md` - Complete debugging guide

## Important Notes

- The API URL is now **hardcoded** as a fallback, so it should always work
- All passwords in logs are hidden (shown as `***HIDDEN***`)
- The logs are very detailed - they'll show exactly what's happening

Once you capture the logs, we'll be able to see exactly what's causing the 500 error!

