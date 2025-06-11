import { networkMonitorService } from '@/services/networkMonitorService';
import { notificationService } from '@/services/notificationService';
import { RobustFetch } from './robustFetch';

/**
 * Cleanup all singleton services to avoid memory-leaks – useful for
 * app unmount, hot-reload, and unit-test teardown.
 */
export const cleanupSingletons = (): void => {
  try {
    networkMonitorService.cleanup();
  } catch {
    // ignored – service might not be initialised
  }

  try {
    RobustFetch.dispose();
  } catch {
    // ignored – listener may already be disposed
  }

  try {
    notificationService.shutdown();
  } catch {
    // ignored – service may not have been initialised
  }
}; 