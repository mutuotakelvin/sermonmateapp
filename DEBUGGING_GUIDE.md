# Debugging Guide for Login 500 Error

## Quick Start - Capture Logs

### Option 1: Use the Script (Easiest)
```bash
cd aipreacher
chmod +x capture-logs.sh
./capture-logs.sh
```

Then try to login from your app. The logs will show in real-time.

### Option 2: Manual Command
```bash
# Connect your phone via USB, then:
adb logcat | grep -E "API|Error|ReactNative|LOGIN"
```

## What to Look For

When you try to login, you should see logs like:

### ✅ Good Signs:
```
=== API Configuration ===
Using API Base URL: https://api.sermonmate.bobakdevs.com/api/v1

🔐 LOGIN ATTEMPT
Full Login URL: https://api.sermonmate.bobakdevs.com/api/v1/login

📤 API REQUEST
Full URL: https://api.sermonmate.bobakdevs.com/api/v1/login
Method: POST
```

### ❌ Bad Signs:
```
ERROR: API_BASE_URL is not set!
Network Error - No response received
Status: 500
```

## Common Issues & Solutions

### Issue 1: API URL is undefined
**Symptom:** Logs show `API_BASE_URL is not set!`

**Solution:** The hardcoded fallback should prevent this, but if you see it, the build might not have the code. Rebuild:
```bash
eas build --profile preview --platform android
```

### Issue 2: Network Error
**Symptom:** `Network Error - No response received`

**Possible causes:**
- Phone not connected to internet
- API server is down
- Wrong API URL
- CORS issue

**Check:** Look at the "Full URL" in the logs. It should be:
```
https://api.sermonmate.bobakdevs.com/api/v1/login
```

### Issue 3: 500 Error from Server
**Symptom:** `Status: 500` in logs

**What to check:**
1. Look at the "Response Data" in the logs - it will show the server error message
2. Check server logs (you already did this - server shows it's working)
3. The issue might be:
   - Request format is wrong
   - Headers are missing
   - Server expects different data format

**Solution:** Share the "Response Data" from the logs with me.

### Issue 4: Wrong URL Path
**Symptom:** 404 Not Found

**Check:** The full URL should be exactly:
```
https://api.sermonmate.bobakdevs.com/api/v1/login
```

Not:
- `https://api.sermonmate.bobakdevs.com/login` ❌
- `https://api.sermonmate.bobakdevs.com/api/login` ❌
- `https://api.sermonmate.bobakdevs.com/v1/login` ❌

## Step-by-Step Debugging

1. **Connect your phone via USB**
2. **Run the log capture script:**
   ```bash
   ./capture-logs.sh
   ```
3. **Try to login from your app**
4. **Look for these specific log entries:**
   - `=== API Configuration ===` - Shows the API URL
   - `🔐 LOGIN ATTEMPT` - Shows login is being attempted
   - `📤 API REQUEST` - Shows the request being sent
   - `❌ API RESPONSE ERROR` - Shows any errors

5. **Copy the error logs** and share them

## What Information to Share

When reporting the issue, please share:

1. **The API Configuration section:**
   ```
   === API Configuration ===
   Using API Base URL: ...
   ```

2. **The API Request section:**
   ```
   📤 API REQUEST
   Full URL: ...
   Method: ...
   Headers: ...
   ```

3. **The Error section (if any):**
   ```
   ❌ API RESPONSE ERROR
   Status: ...
   Response Data: ...
   ```

## Alternative: Save Logs to File

If you can't monitor in real-time:

```bash
# Save all logs to a file
adb logcat > debug_logs.txt

# Then try to login, wait 10 seconds, then press Ctrl+C

# Search for relevant logs
grep -E "API|Error|LOGIN" debug_logs.txt > filtered_logs.txt

# Share filtered_logs.txt
```

## Testing API Connection

I've added a test function. You can add this to your login screen temporarily:

```typescript
import { testApiConnection } from '@/lib/apiTest';

// In your component, add a test button:
const testConnection = async () => {
  const result = await testApiConnection();
  console.log('Test result:', result);
  Alert.alert('API Test', result.message);
};
```

This will help verify if the API is reachable at all.

