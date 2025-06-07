import firebase from '@react-native-firebase/app';
import { logger } from '@/utils/debugConfig';
import { config } from '@/utils/config';

class FirebaseService {
  private isInitialized = false;

  /**
   * Initialize Firebase if not already initialized
   * React Native Firebase automatically handles initialization with google-services.json
   * but we need to ensure it's properly set up
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Check if Firebase is already initialized
      if (firebase.apps.length === 0) {
        logger.warn(
          'Firebase not initialized. This usually means google-services.json is missing.'
        );
        return false;
      }

      // Firebase is initialized automatically by React Native Firebase
      // using the google-services.json file
      const app = firebase.app();

      logger.debug('Firebase initialized successfully', {
        appName: app.name,
        projectId: config.firebase.projectId,
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Firebase', error as Error);
      return false;
    }
  }

  /**
   * Check if Firebase is properly initialized
   */
  isFirebaseReady(): boolean {
    return this.isInitialized && firebase.apps.length > 0;
  }

  /**
   * Get the default Firebase app instance
   */
  getApp() {
    if (!this.isFirebaseReady()) {
      throw new Error('Firebase is not initialized. Call initialize() first.');
    }
    return firebase.app();
  }
}

export const firebaseService = new FirebaseService();
