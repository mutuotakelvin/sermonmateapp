#!/bin/bash

# Script to restart Expo with cleared cache
echo "🔄 Restarting Expo with cleared cache..."
echo ""

# Kill any existing Metro processes
pkill -f "expo start" || true
pkill -f "metro" || true

# Wait a moment
sleep 2

# Clear Metro cache and restart
echo "Clearing Metro cache..."
npx expo start --clear







