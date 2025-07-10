import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logger } from '@/utils/debugConfig';
import { useTheme } from '@/providers/ThemeProvider';

const NotificationSettings = () => {
  const { theme } = useTheme();
  const { expoPushToken, register, unregister } = usePushNotifications();

  const handleToggle = async (isEnabled: boolean) => {
    try {
      if (isEnabled) {
        logger.debug('User enabled notifications. Registering...');
        await register();
      } else {
        logger.debug('User disabled notifications. Unregistering...');
        await unregister();
      }
    } catch (error) {
      logger.error('Failed to toggle notification settings:', { error });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text, ...theme.typography.body1 }]}>
        Daily Reminders
      </Text>
      <ThemedSwitch value={!!expoPushToken} onValueChange={handleToggle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
  },
});

export default NotificationSettings;
