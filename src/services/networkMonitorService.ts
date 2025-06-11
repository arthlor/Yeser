import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/utils/debugConfig';
import { testNetworkConnectivity } from '@/utils/robustFetch';
import { analyticsService } from './analyticsService';

interface NetworkHealth {
  isOnline: boolean;
  canReachGoogle: boolean;
  canReachSupabase: boolean;
  latency: number | null;
  connectionType: string;
  isSimulator: boolean;
  issues: string[];
  recommendations: string[];
  lastChecked: Date;
}

interface NetworkIssue {
  type: 'connectivity' | 'latency' | 'dns' | 'ssl' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}

/**
 * 🌐 NETWORK MONITOR SERVICE: Comprehensive network health monitoring
 * Specifically designed to handle iOS Simulator network issues
 */
class NetworkMonitorService {
  private health: NetworkHealth = {
    isOnline: true,
    canReachGoogle: false,
    canReachSupabase: false,
    latency: null,
    connectionType: 'unknown',
    isSimulator: Platform.OS === 'ios' && __DEV__,
    issues: [],
    recommendations: [],
    lastChecked: new Date(),
  };

  private listeners: ((health: NetworkHealth) => void)[] = [];
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private isInitialized = false;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.netInfoUnsubscribe) {
      return;
    }

    try {
      logger.debug('🌐 Initializing Network Monitor Service...');

      // Set up NetInfo listener and store unsubscribe callback for cleanup
      this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleNetInfoChange.bind(this));

      // Initial health check
      await this.performHealthCheck();

      // Set up periodic monitoring (more frequent for simulator)
      const interval = this.health.isSimulator ? 30000 : 60000; // 30s for simulator, 60s for device
      this.monitoringInterval = setInterval(() => {
        this.performHealthCheck();
      }, interval);

      this.isInitialized = true;
      logger.debug('✅ Network Monitor Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Network Monitor Service', error as Error);
    }
  }

  /**
   * Handle NetInfo state changes
   */
  private handleNetInfoChange(state: NetInfoState): void {
    const wasOnline = this.health.isOnline;
    const isNowOnline = !!state.isConnected;

    this.health.isOnline = isNowOnline;
    this.health.connectionType = state.type || 'unknown';

    // Log significant changes
    if (wasOnline !== isNowOnline) {
      logger.debug('Network connectivity changed', {
        extra: {
          wasOnline,
          isNowOnline,
          connectionType: this.health.connectionType,
          isSimulator: this.health.isSimulator,
        },
      });

      // Track connectivity events
      analyticsService.logEvent('network_connectivity_change', {
        from_online: wasOnline,
        to_online: isNowOnline,
        connection_type: this.health.connectionType,
        is_simulator: this.health.isSimulator,
      });

      // Perform immediate health check on state change
      this.performHealthCheck();
    }
  }

  /**
   * Perform comprehensive network health check
   */
  async performHealthCheck(): Promise<NetworkHealth> {
    const startTime = Date.now();

    try {
      // Test connectivity to key endpoints
      const connectivityResults = await testNetworkConnectivity();

      this.health.canReachGoogle = connectivityResults.canReachGoogle;
      this.health.canReachSupabase = connectivityResults.canReachSupabase;
      this.health.latency = Date.now() - startTime;
      this.health.lastChecked = new Date();

      // Analyze issues and generate recommendations
      this.analyzeNetworkHealth();

      // Notify listeners
      this.notifyListeners();

      // Log critical issues
      if (this.health.issues.length > 0) {
        logger.warn('Network health issues detected', {
          extra: {
            issues: this.health.issues,
            recommendations: this.health.recommendations,
            isSimulator: this.health.isSimulator,
          },
        });
      }

      return this.health;
    } catch (error) {
      logger.error('Network health check failed', error as Error);

      this.health.issues = ['Health check failed'];
      this.health.recommendations = ['Check network configuration'];
      this.health.lastChecked = new Date();

      return this.health;
    }
  }

  /**
   * Analyze network health and generate recommendations
   */
  private analyzeNetworkHealth(): void {
    const issues: NetworkIssue[] = [];

    // Connectivity issues
    if (!this.health.isOnline) {
      issues.push({
        type: 'connectivity',
        severity: 'critical',
        message: 'No network connection detected',
        recommendation: 'Check device network settings',
      });
    }

    if (!this.health.canReachGoogle && !this.health.canReachSupabase) {
      issues.push({
        type: 'connectivity',
        severity: 'critical',
        message: 'Cannot reach external endpoints',
        recommendation: this.health.isSimulator
          ? 'Restart iOS Simulator or check Mac network'
          : 'Check internet connection and DNS settings',
      });
    }

    if (!this.health.canReachSupabase) {
      issues.push({
        type: 'connectivity',
        severity: 'high',
        message: 'Cannot reach Supabase API',
        recommendation: 'Check Supabase configuration and project status',
      });
    }

    // Latency issues
    if (this.health.latency && this.health.latency > 5000) {
      issues.push({
        type: 'latency',
        severity: 'medium',
        message: `High latency detected: ${this.health.latency}ms`,
        recommendation: this.health.isSimulator
          ? 'Simulator network performance issue - try restarting'
          : 'Slow network connection detected',
      });
    }

    // Simulator-specific issues
    if (this.health.isSimulator && issues.length > 0) {
      issues.push({
        type: 'connectivity',
        severity: 'low',
        message: 'iOS Simulator network issues detected',
        recommendation: 'Try: Reset Simulator → Device → Erase All Content and Settings',
      });
    }

    // Update health object
    this.health.issues = issues.map((issue) => issue.message);
    this.health.recommendations = [...new Set(issues.map((issue) => issue.recommendation))];
  }

  /**
   * Subscribe to network health updates
   */
  subscribe(listener: (health: NetworkHealth) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of health updates
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.health);
      } catch (error) {
        logger.error('Network monitor listener error', error as Error);
      }
    });
  }

  /**
   * Get current network health
   */
  getHealth(): NetworkHealth {
    return { ...this.health };
  }

  /**
   * Force a health check
   */
  async checkNow(): Promise<NetworkHealth> {
    return this.performHealthCheck();
  }

  /**
   * Get simulator-specific troubleshooting steps
   */
  getSimulatorTroubleshooting(): string[] {
    if (!this.health.isSimulator) {
      return [];
    }

    return [
      '🔧 iOS Simulator Network Troubleshooting:',
      '',
      '1. BASIC FIXES:',
      '   • Reset Simulator: Device → Erase All Content and Settings',
      '   • Restart Simulator: Hardware → Restart',
      '   • Reset Network Settings: iOS Settings → General → Reset',
      '',
      '2. METRO BUNDLER:',
      '   • Stop Metro: Ctrl+C in terminal',
      '   • Clear cache: npx expo start --clear',
      '   • Restart: npx expo start',
      '',
      '3. MAC NETWORK:',
      '   • Check Mac internet connection',
      '   • Test URLs in Safari browser',
      '   • Disable VPN/Proxy temporarily',
      '',
      '4. XCODE/SIMULATOR:',
      '   • Try different simulator device',
      '   • Reset iOS Simulator settings',
      '   • Update Xcode if available',
      '',
      '5. ADVANCED:',
      '   • Check firewall settings',
      '   • Reset DNS cache: sudo dscacheutil -flushcache',
      '   • Check for network monitoring software',
    ];
  }

  /**
   * Cleanup monitoring
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Remove NetInfo listener if present
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.listeners = [];
    this.isInitialized = false;

    logger.debug('🌐 Network Monitor Service cleaned up');
  }
}

// Export singleton instance
export const networkMonitorService = new NetworkMonitorService();

// Export types
export type { NetworkHealth, NetworkIssue };
