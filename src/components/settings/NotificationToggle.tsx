import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { useThemeStore } from '@/store/themeStore';

interface NotificationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  enabled,
  onToggle,
  isLoading,
}) => {
  const theme = useThemeStore((state) => state.activeTheme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <Icon name="bell-outline" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Bildirimleri Aç</Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            Günde 4 hatırlatıcı alacaksınız{'\n'}
            (12:00, 14:00, 19:00, 21:00)
          </Text>
        </View>
      </View>
      <ThemedSwitch value={enabled} onValueChange={onToggle} disabled={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default NotificationToggle;
