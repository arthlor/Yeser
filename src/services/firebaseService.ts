import { getApp, getApps } from '@react-native-firebase/app';
import { logger } from '@/utils/debugConfig';
import { config } from '@/utils/config';
import { Platform } from 'react-native';

class FirebaseService {
  private isInitialized = false;
  private app: ReturnType<typeof getApp> | null = null;

  /**
   * Initialize Firebase if not already initialized
   * React Native Firebase automatically handles initialization with google-services.json
   * but we need to ensure it's properly set up
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized && this.app) {
        logger.debug('Firebase already initialized');
        return true;
      }

      // Enhanced iOS debugging
      if (Platform.OS === 'ios') {
        logger.debug('🍎 Initializing Firebase on iOS...');
        logger.debug('iOS Bundle ID should match GoogleService-Info.plist BUNDLE_ID');
      }

      // Use modern API: getApps() instead of deprecated firebase.apps
      const apps = getApps();

      if (apps.length === 0) {
        const errorMessage = Platform.OS === 'ios' 
          ? 'Firebase not initialized on iOS. Check that:\n1. GoogleService-Info.plist is in ios/YeerDev/ folder\n2. FirebaseApp.configure() is called in AppDelegate.swift\n3. @react-native-firebase/app plugin is configured in app.config.js'
          : 'Firebase not initialized on Android. Check that google-services.json is in android/app/ folder';
        
        logger.warn(errorMessage);
        return false;
      }

      // Get the default Firebase app using modern API
      this.app = getApp();

      logger.debug('✅ Firebase initialized successfully', {
        platform: Platform.OS,
        appName: this.app.name,
        projectId: config.firebase?.projectId || 'Not configured',
        appsCount: apps.length,
      });

      // iOS-specific Analytics validation
      if (Platform.OS === 'ios') {
        try {
          // Try to import Analytics to verify it's working
          const { getAnalytics } = await import('@react-native-firebase/analytics');
          getAnalytics();
          logger.debug('✅ iOS Firebase Analytics ready');
        } catch (analyticsError) {
          logger.error('❌ iOS Firebase Analytics initialization failed:', analyticsError as Error);
          // Don't fail the entire Firebase init if just Analytics fails
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      const enhancedError = Platform.OS === 'ios'
        ? `iOS Firebase initialization failed. Common causes:\n1. Missing GoogleService-Info.plist\n2. Missing FirebaseApp.configure() in AppDelegate.swift\n3. Incorrect Bundle ID\nOriginal error: ${(error as Error).message}`
        : `Android Firebase initialization failed: ${(error as Error).message}`;
        
      logger.error(enhancedError);
      this.isInitialized = false;
      this.app = null;
      return false;
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isFirebaseReady(): boolean {
    const isReady = this.isInitialized && this.app !== null && getApps().length > 0;
    
    if (!isReady && Platform.OS === 'ios') {
      logger.debug('🍎 iOS Firebase not ready. Check AppDelegate.swift Firebase initialization');
    }
    
    return isReady;
  }

  /**
   * Get the default Firebase app instance
   */
  getApp(): ReturnType<typeof getApp> {
    if (!this.isFirebaseReady() || !this.app) {
      const errorMessage = Platform.OS === 'ios'
        ? 'iOS Firebase is not initialized. Ensure FirebaseApp.configure() is called in AppDelegate.swift'
        : 'Firebase is not initialized. Call initialize() first.';
      throw new Error(errorMessage);
    }
    return this.app;
  }

  /**
   * Reset the Firebase service (useful for testing)
   */
  reset(): void {
    this.isInitialized = false;
    this.app = null;
  }

  /**
   * Get platform-specific debug information
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      platform: Platform.OS,
      isInitialized: this.isInitialized,
      hasApp: this.app !== null,
      appsCount: getApps().length,
      projectId: config.firebase?.projectId || 'Not configured',
    };
  }
}

export const firebaseService = new FirebaseService();
