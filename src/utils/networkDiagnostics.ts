import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { logger } from './debugConfig';
import { robustFetch, testNetworkConnectivity } from './robustFetch';

interface NetworkDiagnostics {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
  canReachGoogle: boolean;
  canReachSupabase: boolean;
  platform: string;
  isSimulator: boolean;
}

export const runNetworkDiagnostics = async (): Promise<NetworkDiagnostics> => {
  logger.debug('🔍 Running network diagnostics...');

  // Get network info
  const netInfo = await NetInfo.fetch();

  // Use robust fetch for enhanced connectivity testing
  const connectivityResults = await testNetworkConnectivity();
  const canReachGoogle = connectivityResults.canReachGoogle;
  const canReachSupabase = connectivityResults.canReachSupabase;

  const diagnostics: NetworkDiagnostics = {
    isConnected: netInfo.isConnected ?? false,
    type: netInfo.type,
    isInternetReachable: netInfo.isInternetReachable,
    canReachGoogle,
    canReachSupabase,
    platform: Platform.OS,
    isSimulator: Platform.OS === 'ios' && !Platform.isPad && Platform.isTV === false,
  };

  logger.debug('📊 Network Diagnostics Results:', {
    isConnected: diagnostics.isConnected.toString(),
    type: diagnostics.type,
    canReachGoogle: diagnostics.canReachGoogle.toString(),
    canReachSupabase: diagnostics.canReachSupabase.toString(),
    platform: diagnostics.platform,
  });

  return diagnostics;
};

export const getSimulatorNetworkAdvice = (): string[] => {
  if (Platform.OS !== 'ios') {
    return [];
  }

  return [
    '🔧 iOS Simulator Network Troubleshooting:',
    '1. Reset iOS Simulator: Device → Erase All Content and Settings',
    '2. Restart Simulator: Hardware → Restart',
    '3. Check Mac network: Try accessing same URLs in Safari',
    '4. Reset Network Settings: iOS Settings → General → Reset → Reset Network Settings',
    '5. Try different simulator device (iPhone 15 Pro vs iPhone 14)',
    '6. Check if VPN/Proxy is interfering',
    '7. Restart Metro bundler: npx expo start --clear',
  ];
};
