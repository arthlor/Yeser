# 🌐 Network Troubleshooting Guide

This guide provides comprehensive solutions for fixing "Network request failed" errors in iOS Simulator during development.

## 🚨 **Quick Fix**

Run the automated fix script:

```bash
./scripts/fix-simulator-network.sh
```

## 🔍 **Problem Analysis**

The "Network request failed" errors typically occur due to:

1. **iOS Simulator Network Stack Issues**: Simulator's network implementation can be unstable
2. **DNS Resolution Problems**: Simulator may have DNS caching issues
3. **Metro Bundler Interference**: Development server conflicts
4. **Firewall/Security Software**: Mac security blocking requests
5. **Environment Configuration**: Missing or incorrect API keys

## 🛠️ **Complete Fix Implementation**

Our solution includes multiple layers of protection:

### 1. **Robust Fetch Wrapper** (`src/utils/robustFetch.ts`)

- ✅ Simulator-aware timeouts and retries
- ✅ Exponential backoff with jitter
- ✅ Enhanced error messages with troubleshooting advice
- ✅ Automatic network connectivity testing

### 2. **Network Monitor Service** (`src/services/networkMonitorService.ts`)

- ✅ Real-time network health monitoring
- ✅ Automatic issue detection and recommendations
- ✅ Simulator-specific troubleshooting advice
- ✅ Performance metrics tracking

### 3. **Enhanced Query Client** (`src/api/queryClient.ts`)

- ✅ Simulator-aware retry configuration
- ✅ Longer timeouts for iOS Simulator
- ✅ Intelligent error classification

### 4. **Debug Tools** (`src/components/debug/NetworkStatus.tsx`)

- ✅ Real-time network status display (dev only)
- ✅ Interactive troubleshooting guide
- ✅ Performance monitoring

## 📋 **Manual Troubleshooting Steps**

### **Level 1: Basic Fixes**

```bash
# 1. Reset iOS Simulator
xcrun simctl shutdown all
xcrun simctl erase all

# 2. Clear Metro cache
npx expo start --clear

# 3. Restart development server
npx expo start
```

### **Level 2: Network Reset**

```bash
# 1. Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 2. Reset network interfaces
sudo ifconfig en0 down && sudo ifconfig en0 up
```

### **Level 3: System Reset**

```bash
# 1. Check firewall settings
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# 2. Disable VPN temporarily
# 3. Restart Mac
# 4. Update Xcode to latest version
```

### **Level 4: Simulator Settings**

In iOS Simulator:

1. **Settings** → **General** → **Reset** → **Reset Network Settings**
2. **Settings** → **Privacy & Security** → **Location Services** → **OFF** (then back ON)
3. Try different simulator devices (iPhone 15 Pro vs iPhone 14)

## 🔧 **Configuration Verification**

### **Environment Variables**

Ensure these are properly set in your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### **Firebase Configuration**

Verify files exist:

- ✅ `ios/GoogleService-Info.plist`
- ✅ `android/app/google-services.json`

### **Network Test Commands**

```bash
# Test basic connectivity
ping google.com

# Test Supabase endpoint
curl -I https://your-project.supabase.co/rest/v1/

# Test Firebase
curl -I https://firebase.googleapis.com/
```

## 🎯 **Development Workflow**

### **Using Network Debug Tools**

1. **Add Network Status Component** (development only):

```tsx
import NetworkStatus from '@/components/debug/NetworkStatus';

// In your development screen
{
  __DEV__ && <NetworkStatus showDetails />;
}
```

2. **Monitor Network Health**:

```tsx
import { networkMonitorService } from '@/services/networkMonitorService';

// Subscribe to network updates
useEffect(() => {
  const unsubscribe = networkMonitorService.subscribe((health) => {
    console.log('Network Health:', health);
  });
  return unsubscribe;
}, []);
```

3. **Force Connectivity Check**:

```tsx
const checkNetwork = async () => {
  const health = await networkMonitorService.checkNow();
  console.log('Current network status:', health);
};
```

## 🚀 **Performance Optimizations**

Our implementation includes several performance improvements:

### **Simulator-Specific Settings**

- **Longer timeouts**: 15s vs 10s for real devices
- **More retries**: 5 vs 3 attempts
- **Enhanced logging**: Detailed simulator diagnostics
- **Connectivity pre-checks**: Verify network before requests

### **Smart Retry Logic**

- **Exponential backoff**: 1s → 2s → 4s → 8s delays
- **Jitter**: Random delays to prevent thundering herd
- **Client error detection**: Don't retry 4xx errors
- **Network-aware**: Pause retries when offline

### **Caching Strategy**

- **Stale-while-revalidate**: Serve cached data while fetching
- **Background updates**: Refresh data without blocking UI
- **Query deduplication**: Prevent duplicate requests

## 🧪 **Testing Network Reliability**

### **Automated Tests**

```bash
# Run network connectivity tests
npm run test:network

# Test with simulated network failures
npm run test:network:offline
```

### **Manual Testing Scenarios**

1. **Airplane Mode**: Enable/disable airplane mode during requests
2. **Slow Connection**: Use Network Link Conditioner in Xcode
3. **Network Switching**: Switch between WiFi networks
4. **Background/Foreground**: Test app state transitions

## 📊 **Monitoring & Analytics**

Network issues are automatically tracked:

- **Connectivity events**: Online/offline transitions
- **Request failures**: Failed network requests with context
- **Performance metrics**: Latency and timeout tracking
- **Simulator detection**: Special handling for simulator issues

## 🆘 **Emergency Fixes**

If you're experiencing critical network issues:

### **Quick Reset (2 minutes)**

```bash
# Kill all simulators
xcrun simctl shutdown all

# Clear all caches
npx expo start --clear
rm -rf node_modules/.cache

# Restart with fresh environment
npx expo start
```

### **Nuclear Option (5 minutes)**

```bash
# Reset everything
xcrun simctl delete all
xcrun simctl create "iPhone 15 Pro" com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro com.apple.CoreSimulator.SimRuntime.iOS-17-0

# Reinstall dependencies
rm -rf node_modules
npm install

# Start fresh
npx expo start --clear
```

## 🔮 **Future Enhancements**

Planned improvements:

- **Offline mode**: Complete offline functionality
- **Request queuing**: Queue requests when offline
- **Smart prefetching**: Predictive data loading
- **Network quality detection**: Adapt behavior to connection quality

---

## 📞 **Need Help?**

If network issues persist:

1. Check our [GitHub Issues](https://github.com/your-repo/issues)
2. Run the debug script: `./scripts/fix-simulator-network.sh`
3. Enable network debug component in development
4. Check logs in Metro bundler terminal

**Remember**: These issues are typically iOS Simulator-specific and rarely occur on real devices or in production builds.
