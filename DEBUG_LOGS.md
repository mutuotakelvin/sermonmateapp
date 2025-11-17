# How to View Logs on Android

When running the APK on your phone, you can view console logs using Android Debug Bridge (adb).

## Prerequisites
1. Enable Developer Options on your Android phone
2. Enable USB Debugging
3. Connect your phone to your computer via USB
4. Install adb (usually comes with Android Studio)

## View Logs

### Method 1: View All React Native/Expo Logs
```bash
adb logcat | grep -E "ReactNativeJS|Expo|API"
```

### Method 2: View Only Your App's Logs
```bash
adb logcat -s ReactNativeJS:* Expo:* *:E
```

### Method 3: View API-Related Logs
```bash
adb logcat | grep -i "api"
```

### Method 4: Save Logs to File
```bash
adb logcat > app_logs.txt
```
Then search for "API" or "Error" in the file.

### Method 5: Filter by Package Name
```bash
adb logcat | grep "com.sermonmate.app"
```

## Quick Debug Commands

### Clear old logs first:
```bash
adb logcat -c
```

### Then start logging:
```bash
adb logcat | grep -E "API|Error|ReactNative"
```

## What to Look For

When debugging the login issue, look for:
- `=== API Configuration ===` - Shows the API URL being used
- `API Request:` - Shows API requests being made
- `API Response Error:` - Shows any API errors
- `Network Error` - Shows network connectivity issues

## Alternative: Use React Native Debugger

1. Install React Native Debugger
2. Shake your device (or press menu button)
3. Select "Debug" or "Open Dev Menu"
4. Enable remote debugging

Note: Remote debugging might not work in production/preview builds.

