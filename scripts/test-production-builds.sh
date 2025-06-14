#!/bin/bash

# Yeşer Local Production Build Testing
# This script helps test production builds locally before using EAS Build quota

set -e

echo "🏗️  Yeşer Local Production Build Testing"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status "📋 Pre-flight checks..." $BLUE

# Check if .env exists and source it
if [ -f ".env" ]; then
    print_status "✓ Loading environment variables..." $GREEN
    set -a
    source .env
    set +a
else
    print_status "❌ .env file not found!" $RED
    exit 1
fi

# Validate that we have required environment variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    print_status "❌ Missing required environment variables!" $RED
    exit 1
fi

print_status "✓ Environment variables loaded" $GREEN

# Function to test Android production build
test_android_production() {
    print_status "🤖 Testing Android Production Build..." $BLUE
    
    if ! command_exists "adb"; then
        print_status "⚠️  ADB not found - install Android SDK Platform Tools" $YELLOW
        return 1
    fi
    
    # Check if Android device/emulator is connected
    DEVICES=$(adb devices | grep -v "List of devices" | grep "device")
    if [ -z "$DEVICES" ]; then
        print_status "⚠️  No Android device/emulator connected" $YELLOW
        print_status "   Please start an emulator or connect a device" $YELLOW
        return 1
    fi
    
    print_status "✓ Android device detected" $GREEN
    
    # Clean previous builds
    print_status "🧹 Cleaning previous builds..." $YELLOW
    rm -rf android/app/build/outputs/apk/release/
    
    # Build production APK locally
    print_status "🔨 Building production APK..." $BLUE
    print_status "   This may take 5-10 minutes..." $YELLOW
    
    npx expo run:android --variant release --no-bundler
    
    if [ $? -eq 0 ]; then
        print_status "✅ Android production build SUCCESS!" $GREEN
        print_status "   Test the app thoroughly on your device" $GREEN
        print_status "   Pay special attention to:" $YELLOW
        print_status "   • App startup (no hanging on splash)" $YELLOW
        print_status "   • Magic link authentication" $YELLOW
        print_status "   • All navigation flows" $YELLOW
        print_status "   • Data persistence" $YELLOW
    else
        print_status "❌ Android production build FAILED!" $RED
        return 1
    fi
}

# Function to test iOS production build
test_ios_production() {
    print_status "🍎 Testing iOS Production Build..." $BLUE
    
    if ! command_exists "xcodebuild"; then
        print_status "⚠️  Xcode not found - iOS build not available" $YELLOW
        return 1
    fi
    
    # Check if iOS simulator is available
    SIMULATORS=$(xcrun simctl list devices | grep "iPhone" | grep "Booted")
    if [ -z "$SIMULATORS" ]; then
        print_status "⚠️  No iOS simulator running" $YELLOW
        print_status "   Please start an iOS simulator" $YELLOW
        return 1
    fi
    
    print_status "✓ iOS simulator detected" $GREEN
    
    # Build production iOS app locally
    print_status "🔨 Building production iOS app..." $BLUE
    print_status "   This may take 5-10 minutes..." $YELLOW
    
    npx expo run:ios --configuration Release --no-bundler
    
    if [ $? -eq 0 ]; then
        print_status "✅ iOS production build SUCCESS!" $GREEN
        print_status "   Test the app thoroughly on simulator" $GREEN
        print_status "   Pay special attention to:" $YELLOW
        print_status "   • App startup behavior" $YELLOW
        print_status "   • Magic link authentication" $YELLOW
        print_status "   • Performance and memory usage" $YELLOW
        print_status "   • Deep link handling" $YELLOW
    else
        print_status "❌ iOS production build FAILED!" $RED
        return 1
    fi
}

# Function to test bundle export
test_bundle_export() {
    print_status "📦 Testing Bundle Export..." $BLUE
    
    # Clean previous exports
    rm -rf dist/
    
    # Export bundle for production
    print_status "🔨 Exporting production bundle..." $YELLOW
    npx expo export --platform all --output-dir dist
    
    if [ $? -eq 0 ]; then
        print_status "✅ Bundle export SUCCESS!" $GREEN
        
        # Analyze bundle
        if [ -d "dist/_expo/static/js" ]; then
            BUNDLE_SIZE=$(du -sh dist/_expo/static/js | cut -f1)
            print_status "📊 Bundle size: $BUNDLE_SIZE" $BLUE
            
            # Check for large files
            print_status "🔍 Analyzing large files..." $YELLOW
            find dist/_expo/static -name "*.js" -size +1M -exec ls -lh {} \; | while read line; do
                print_status "   Large file: $line" $YELLOW
            done
        fi
    else
        print_status "❌ Bundle export FAILED!" $RED
        return 1
    fi
}

# Main execution
print_status "🚀 Starting production build tests..." $BLUE

# Test bundle export first (fastest test)
if test_bundle_export; then
    print_status "✅ Bundle export test passed" $GREEN
else
    print_status "❌ Bundle export test failed - fix before proceeding" $RED
    exit 1
fi

# Offer choice of platform testing
echo ""
print_status "Which platform would you like to test?" $BLUE
print_status "1) Android only" $YELLOW
print_status "2) iOS only" $YELLOW  
print_status "3) Both platforms" $YELLOW
print_status "4) Skip device testing" $YELLOW

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        test_android_production
        ;;
    2)
        test_ios_production
        ;;
    3)
        test_android_production
        test_ios_production
        ;;
    4)
        print_status "⏭️  Skipping device testing" $YELLOW
        ;;
    *)
        print_status "❌ Invalid choice" $RED
        exit 1
        ;;
esac

echo ""
print_status "🎉 Production build testing complete!" $GREEN
print_status "📝 Don't forget to test these critical features:" $BLUE
print_status "   • Magic link authentication (email → app)" $YELLOW
print_status "   • Deep link handling (yeser://auth/callback)" $YELLOW
print_status "   • Data synchronization with Supabase" $YELLOW
print_status "   • Notification permissions and delivery" $YELLOW
print_status "   • App performance and memory usage" $YELLOW
print_status "   • Offline behavior and error handling" $YELLOW

echo ""
print_status "✅ If all tests pass, your app is ready for EAS Build!" $GREEN 