import * as Notifications from 'expo-notifications';

import { notificationService } from '../notificationService';

// Mock expo-notifications with simplified types
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  AndroidNotificationPriority: {
    HIGH: 'high',
    DEFAULT: 'default',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
    CALENDAR: 'calendar',
  },
}));

// Mock analytics service
jest.mock('../analyticsService', () => ({
  analyticsService: {
    logEvent: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/debugConfig', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

// Helper to create mock permission response
const createMockPermissionResponse = (granted: boolean) => ({
  status: granted ? 'granted' : 'denied',
  ios: {},
  android: {},
  expires: 'never',
});

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with permissions', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      const result = await notificationService.initialize();

      expect(result).toBe(true);
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('Permission error'));

      const result = await notificationService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('requestPermissions', () => {
    it('should return true when permissions are already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      const result = await notificationService.requestPermissions();

      expect(result).toBe(true);
      expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permissions when not granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      mockNotifications.requestPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      const result = await notificationService.requestPermissions();

      expect(result).toBe(true);
      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permissions are denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      mockNotifications.requestPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      const result = await notificationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('scheduleDailyReminder', () => {
    beforeEach(async () => {
      // Initialize service with permissions
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValue([]);
      await notificationService.initialize();
    });

    it('should schedule daily reminder successfully', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('test-id');

      const result = await notificationService.scheduleDailyReminder(9, 0, true);

      expect(result.success).toBe(true);
      expect(result.identifier).toBe('test-id');
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: '🌟 Minnettarlık Zamanı!',
          body: 'Bugün hangi şeyler için minnettarsın? Bir dakikani ayırıp yaz! ✨',
          sound: 'default',
          priority: 'high',
          categoryIdentifier: 'DAILY_REMINDER',
        },
        trigger: {
          type: 'calendar',
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });
    });

    it('should return success when disabled', async () => {
      const result = await notificationService.scheduleDailyReminder(9, 0, false);

      expect(result.success).toBe(true);
      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should validate time parameters', async () => {
      const result = await notificationService.scheduleDailyReminder(25, 0, true);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('scheduling');
      expect(result.error?.message).toContain('Invalid time');
    });

    it('should handle permission errors', async () => {
      // Create new service instance without permissions
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      mockNotifications.requestPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      // Force re-initialization
      await notificationService.initialize();

      const result = await notificationService.scheduleDailyReminder(9, 0, true);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('permission');
    });
  });

  describe('cancelAllScheduledNotifications', () => {
    it('should cancel all notifications successfully', async () => {
      mockNotifications.cancelAllScheduledNotificationsAsync.mockResolvedValue();

      await notificationService.cancelAllScheduledNotifications();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('should handle cancellation errors', async () => {
      mockNotifications.cancelAllScheduledNotificationsAsync.mockRejectedValue(
        new Error('Cancellation failed')
      );

      await expect(notificationService.cancelAllScheduledNotifications()).rejects.toThrow(
        'Cancellation failed'
      );
    });
  });

  describe('getPermissionStatus', () => {
    it('should return current permission status', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      const status = await notificationService.getPermissionStatus();

      expect(status).toBe('granted');
      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    beforeEach(async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(true) as any
      );

      await notificationService.initialize();
    });

    it('should send test notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('test-id');

      await notificationService.sendTestNotification();

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: '🧪 Test Bildirimi',
          body: 'Bu bir test bildirimidir. Bildirimler çalışıyor! ✅',
          sound: 'default',
        },
        trigger: {
          type: 'timeInterval',
          seconds: 1,
        },
      });
    });

    it('should throw error when no permissions', async () => {
      // Reset permissions
      mockNotifications.getPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      mockNotifications.requestPermissionsAsync.mockResolvedValue(
        createMockPermissionResponse(false) as any
      );

      await notificationService.initialize();

      await expect(notificationService.sendTestNotification()).rejects.toThrow(
        'No notification permissions'
      );
    });
  });
});
