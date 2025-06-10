import { getApp, getApps } from '@react-native-firebase/app';
import { logger } from '@/utils/debugConfig';
import { config } from '@/utils/config';

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

      // Use modern API: getApps() instead of deprecated firebase.apps
      const apps = getApps();

      if (apps.length === 0) {
        logger.warn(
          'Firebase not initialized. This usually means google-services.json is missing or invalid.'
        );
        return false;
      }

      // Get the default Firebase app using modern API
      this.app = getApp();

      logger.debug('Firebase initialized successfully', {
        appName: this.app.name,
        projectId: config.firebase.projectId,
        appsCount: apps.length,
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Firebase', error as Error);
      this.isInitialized = false;
      this.app = null;
      return false;
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isFirebaseReady(): boolean {
    return this.isInitialized && this.app !== null && getApps().length > 0;
  }

  /**
   * Get the default Firebase app instance
   */
  getApp(): ReturnType<typeof getApp> {
    if (!this.isFirebaseReady() || !this.app) {
      throw new Error('Firebase is not initialized. Call initialize() first.');
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
}

export const firebaseService = new FirebaseService();
