import { Platform } from 'react-native';
import { getApps } from '@react-native-firebase/app';
import { logger } from '@/utils/debugConfig';
import { firebaseService } from '@/services/firebaseService';

interface FirebaseDebugInfo {
  platform: string;
  isFirebaseInitialized: boolean;
  firebaseAppsCount: number;
  analyticsReady: boolean;
  expectedBundleId: string;
  configurationIssues: string[];
  recommendations: string[];
}

/**
 * Comprehensive Firebase debugging utility for iOS issues
 */
export class FirebaseDebugger {
  static async diagnose(): Promise<FirebaseDebugInfo> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let analyticsReady = false;

    // Check Firebase initialization
    const apps = getApps();
    const isFirebaseInitialized = apps.length > 0;

    if (!isFirebaseInitialized) {
      if (Platform.OS === 'ios') {
        issues.push('Firebase not initialized on iOS');
        recommendations.push('Add FirebaseApp.configure() to AppDelegate.swift in didFinishLaunchingWithOptions');
        recommendations.push('Verify GoogleService-Info.plist is in ios/YeerDev/ folder');
        recommendations.push('Check @react-native-firebase/app plugin in app.config.js');
      } else {
        issues.push('Firebase not initialized on Android');
        recommendations.push('Verify google-services.json is in android/app/ folder');
      }
    }

    // Check Analytics specifically
    if (isFirebaseInitialized) {
      try {
        const { getAnalytics } = await import('@react-native-firebase/analytics');
        getAnalytics(); // Initialize analytics to verify it works
        analyticsReady = true;
        
        if (Platform.OS === 'ios') {
          logger.debug('✅ iOS Firebase Analytics is working correctly');
        }
      } catch {
        analyticsReady = false;
        if (Platform.OS === 'ios') {
          issues.push('iOS Firebase Analytics failed to initialize');
          recommendations.push('Verify Analytics is enabled in Firebase Console');
          recommendations.push('Check Bundle ID matches GoogleService-Info.plist');
          recommendations.push('Ensure iOS deployment target is >= 12.0');
        }
      }
    }

    // iOS-specific configuration checks
    if (Platform.OS === 'ios') {
      recommendations.push('Bundle ID should be: com.arthlor.yeser');
      recommendations.push('GoogleService-Info.plist should be in ios/YeerDev/ folder');
      recommendations.push('AppDelegate.swift should import Firebase and call FirebaseApp.configure()');
      
      if (!analyticsReady) {
        recommendations.push('Run: cd ios && pod install to update iOS dependencies');
        recommendations.push('Clean build: npx expo run:ios --clear');
      }
    }

    return {
      platform: Platform.OS,
      isFirebaseInitialized,
      firebaseAppsCount: apps.length,
      analyticsReady,
      expectedBundleId: 'com.arthlor.yeser',
      configurationIssues: issues,
      recommendations,
    };
  }

  /**
   * Print detailed Firebase diagnostic information
   */
  static async printDiagnostics(): Promise<void> {
    const diagnosis = await this.diagnose();
    
    logger.debug('🔥 Firebase Diagnostics Report');
    logger.debug('================================');
    logger.debug(`Platform: ${diagnosis.platform}`);
    logger.debug(`Firebase Initialized: ${diagnosis.isFirebaseInitialized ? '✅' : '❌'}`);
    logger.debug(`Firebase Apps Count: ${diagnosis.firebaseAppsCount}`);
    logger.debug(`Analytics Ready: ${diagnosis.analyticsReady ? '✅' : '❌'}`);
    logger.debug(`Expected Bundle ID: ${diagnosis.expectedBundleId}`);
    
    if (diagnosis.configurationIssues.length > 0) {
      logger.debug('\n❌ Configuration Issues:');
      diagnosis.configurationIssues.forEach((issue, index) => {
        logger.debug(`${index + 1}. ${issue}`);
      });
    }
    
    if (diagnosis.recommendations.length > 0) {
      logger.debug('\n💡 Recommendations:');
      diagnosis.recommendations.forEach((rec, index) => {
        logger.debug(`${index + 1}. ${rec}`);
      });
    }
    
    // Firebase service debug info
    if (firebaseService) {
      logger.debug('\n🔧 Firebase Service Status:');
      const debugInfo = firebaseService.getDebugInfo();
      logger.debug(JSON.stringify(debugInfo, null, 2));
    }
  }

  /**
   * Quick health check for Firebase Analytics
   */
  static async quickHealthCheck(): Promise<boolean> {
    try {
      const diagnosis = await this.diagnose();
      const isHealthy = diagnosis.isFirebaseInitialized && diagnosis.analyticsReady;
      
      if (!isHealthy && Platform.OS === 'ios') {
        logger.warn('🍎 iOS Firebase Analytics health check failed');
        await this.printDiagnostics();
      }
      
      return isHealthy;
    } catch (error) {
      logger.error('Firebase health check failed:', error as Error);
      return false;
    }
  }
}

/**
 * Auto-run diagnostics in development for iOS
 */
if (__DEV__ && Platform.OS === 'ios') {
  // Run diagnostics after a short delay to allow Firebase to initialize
  setTimeout(async () => {
    try {
      await FirebaseDebugger.printDiagnostics();
    } catch {
      logger.debug('Firebase diagnostics not available yet');
    }
  }, 3000);
} 