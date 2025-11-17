#!/bin/bash

# Script to capture Android logs for debugging
# Usage: ./capture-logs.sh

echo "📱 Android Log Capture Script"
echo "=============================="
echo ""
echo "Make sure your Android device is connected via USB and USB debugging is enabled."
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb (Android Debug Bridge) is not installed or not in PATH"
    echo "Please install Android SDK Platform Tools"
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ Error: No Android device detected"
    echo "Please:"
    echo "1. Connect your device via USB"
    echo "2. Enable USB debugging"
    echo "3. Accept the USB debugging prompt on your device"
    exit 1
fi

echo "✅ Device detected"
echo ""

# Clear old logs
echo "Clearing old logs..."
adb logcat -c

echo ""
echo "📝 Starting log capture..."
echo "Press Ctrl+C to stop"
echo ""
echo "Filtering for: API, Error, ReactNative, Expo"
echo ""

# Capture logs with filters
adb logcat | grep -E "API|Error|ReactNative|Expo|LOGIN|api|error" --color=always

