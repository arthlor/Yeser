import React, { useCallback } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';

import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface AvatarPickerRowProps {
  username?: string | null;
  avatarUrl: string | null;
  onPick: () => Promise<void>;
  onRemove: () => Promise<void>;
}

const AvatarPickerRow: React.FC<AvatarPickerRowProps> = ({
  username,
  avatarUrl,
  onPick,
  onRemove,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const initial = (username || '').trim().charAt(0).toUpperCase() || '🙂';

  const openSheet = useCallback(() => {
    const showAndroid = () => {
      Alert.alert(t('shared.profile.avatar.title'), undefined, [
        { text: t('shared.media.actions.choosePhoto'), onPress: () => void onPick() },
        {
          text: t('shared.media.actions.removePhoto'),
          style: 'destructive',
          onPress: () => void onRemove(),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    };

    const showIOS = () => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('shared.media.actions.choosePhoto'),
            t('shared.media.actions.removePhoto'),
            t('common.cancel'),
          ],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) {
            void onPick();
          } else if (index === 1) {
            void onRemove();
          }
        }
      );
    };

    if (Platform.OS === 'ios') {
      showIOS();
    } else {
      showAndroid();
    }
  }, [onPick, onRemove, t]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
          <View>
            <Text style={styles.title}>{t('shared.profile.avatar.profilePhotoLabel')}</Text>
            <Text style={styles.subtitle}>{t('shared.profile.avatar.profilePhotoSubtitle')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={openSheet}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={t('shared.profile.avatar.title')}
        >
          <Icon name="image-edit" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
    avatarInitial: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
    },
    title: { ...theme.typography.bodyLarge, color: theme.colors.onSurface, fontWeight: '600' },
    subtitle: { ...theme.typography.bodySmall, color: theme.colors.onSurfaceVariant },
    action: { padding: theme.spacing.xs },
  });

export default AvatarPickerRow;
