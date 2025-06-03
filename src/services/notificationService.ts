import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Added to satisfy NotificationBehavior type
    shouldShowList: true, // Added to satisfy NotificationBehavior type
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    // Android permissions are typically granted by default for local notifications
    // However, you might need to set up a notification channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    return true; // Assuming granted or channel setup is sufficient
  }

  if (Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          // allowAnnouncements: true, // Removed, not a valid property
        },
      });
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert(
        'İzin Gerekli',
        'Günlük hatırlatıcıları almak için lütfen bildirimlere izin verin.'
      );
      return false;
    }
    return true;
  }
  return false; // Should not happen on supported platforms
};

export const scheduleDailyReminder = async (
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<string | null> => {
  try {
    // First, cancel any existing notifications to avoid duplicates if re-scheduling
    await Notifications.cancelAllScheduledNotificationsAsync();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true, // Plays the default sound
      },
      trigger: {
        hour, // 0-23
        minute, // 0-59
        repeats: true, // Daily
        channelId: 'default', // Ensure this matches the channel set up for Android
      },
    });
    console.log('Daily reminder scheduled with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    Alert.alert('Hata', 'Günlük hatırlatıcı ayarlanamadı.');
    return null;
  }
};

export const cancelAllScheduledNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled.');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    Alert.alert('Hata', 'Hatırlatıcılar iptal edilemedi.');
  }
};
