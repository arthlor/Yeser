import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelAllScheduledNotifications,
} from './notificationService';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: {
    DEFAULT: 'default',
  },
}));

// Mock react-native Platform and Alert
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // Default mock OS
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockExpoNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  describe('requestNotificationPermissions', () => {
    it('should setup channel and return true on Android', async () => {
      Platform.OS = 'android';
      const result = await requestNotificationPermissions();
      expect(mockExpoNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.any(Object));
      expect(result).toBe(true);
    });

    it('should return true on iOS if permissions already granted', async () => {
      Platform.OS = 'ios';
      mockExpoNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as Notifications.NotificationPermissionsStatus);
      const result = await requestNotificationPermissions();
      expect(mockExpoNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should request and return true on iOS if permissions granted by user', async () => {
      Platform.OS = 'ios';
      mockExpoNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as Notifications.NotificationPermissionsStatus);
      mockExpoNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as Notifications.NotificationPermissionsStatus);
      const result = await requestNotificationPermissions();
      expect(mockExpoNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should request, alert, and return false on iOS if permissions denied by user', async () => {
      Platform.OS = 'ios';
      mockExpoNotifications.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as Notifications.NotificationPermissionsStatus);
      mockExpoNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as Notifications.NotificationPermissionsStatus);
      const result = await requestNotificationPermissions();
      expect(mockExpoNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('İzin Gerekli', expect.any(String));
      expect(result).toBe(false);
    });

    it('should return false for unsupported platforms', async () => {
      Platform.OS = 'web'; // Simulate an unsupported platform
      const result = await requestNotificationPermissions();
      expect(result).toBe(false);
    });
  });

  describe('scheduleDailyReminder', () => {
    const reminderDetails = { hour: 8, minute: 0, title: 'Test Reminder', body: 'Test Body' };

    it('should cancel existing notifications and schedule a new one, returning ID', async () => {
      mockExpoNotifications.scheduleNotificationAsync.mockResolvedValue('test-notification-id');
      const notificationId = await scheduleDailyReminder(
        reminderDetails.hour,
        reminderDetails.minute,
        reminderDetails.title,
        reminderDetails.body
      );
      expect(mockExpoNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(mockExpoNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: reminderDetails.title,
          body: reminderDetails.body,
          sound: true,
        },
        trigger: {
          hour: reminderDetails.hour,
          minute: reminderDetails.minute,
          repeats: true,
          channelId: 'default',
        },
      });
      expect(notificationId).toBe('test-notification-id');
    });

    it('should alert and return null if scheduling fails', async () => {
      mockExpoNotifications.scheduleNotificationAsync.mockRejectedValue(new Error('Scheduling failed'));
      const notificationId = await scheduleDailyReminder(
        reminderDetails.hour,
        reminderDetails.minute,
        reminderDetails.title,
        reminderDetails.body
      );
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Günlük hatırlatıcı ayarlanamadı.');
      expect(notificationId).toBeNull();
    });
  });

  describe('cancelAllScheduledNotifications', () => {
    it('should call cancelAllScheduledNotificationsAsync', async () => {
      await cancelAllScheduledNotifications();
      expect(mockExpoNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });

    it('should alert if cancelling fails', async () => {
      mockExpoNotifications.cancelAllScheduledNotificationsAsync.mockRejectedValue(new Error('Cancelling failed'));
      await cancelAllScheduledNotifications();
      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Hatırlatıcılar iptal edilemedi.');
    });
  });
});
