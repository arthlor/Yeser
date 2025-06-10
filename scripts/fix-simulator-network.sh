#!/bin/bash
# Yeser iOS Simulator Network Fix Script
echo "🔧 Yeser iOS Simulator Network Troubleshooting"
echo "=============================================="
echo ""

# Function to run commands with error handling
run_command() {
    echo "Running: $1"
    if eval "$1" 2>/dev/null; then
        echo "✅ Success"
    else
        echo "❌ Failed (this might be normal)"
    fi
    echo ""
}

echo "1. Testing basic connectivity..."
run_command "ping -c 3 google.com"

echo "2. Flushing DNS cache..."
run_command "sudo dscacheutil -flushcache"
run_command "sudo killall -HUP mDNSResponder"

echo "3. Restarting iOS Simulator (if running)..."
run_command "xcrun simctl shutdown all"
run_command "xcrun simctl erase all"

echo "4. Clearing Metro cache..."
run_command "npx expo start --clear"

echo ""
echo "🚀 Manual Steps (if issues persist):"
echo "   1. Restart your Mac"
echo "   2. Check VPN/Proxy settings"
echo "   3. Update Xcode"
echo "   4. Reset Network Settings in System Preferences"
echo ""
echo "📱 In iOS Simulator:"
echo "   Settings → General → Reset → Reset Network Settings"
echo "" 