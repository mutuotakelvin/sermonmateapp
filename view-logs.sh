#!/bin/bash

# Quick script to view React Native/Expo logs from Android device
# Usage: ./view-logs.sh

echo "📱 Viewing Android Logs"
echo "======================="
echo ""
echo "Make sure your Android device is connected via USB"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb is not installed"
    echo "Install: sudo apt-get install android-tools-adb"
    exit 1
fi

# Check if device is connected
DEVICE=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ No Android device detected"
    echo "Connect your device via USB and enable USB debugging"
    exit 1
fi

echo "✅ Device detected: $DEVICE"
echo ""
echo "📝 Viewing logs (filtered for API/Error/ReactNative)..."
echo "Press Ctrl+C to stop"
echo ""
echo "----------------------------------------"
echo ""

# View logs with better filtering for React Native
adb logcat -c  # Clear old logs first
adb logcat | grep --line-buffered -E "ReactNativeJS|Expo|API|Error|LOGIN|api|error|Network|NETWORK" -i







