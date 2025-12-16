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
import { AppTheme } from '@/themes/types';

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
    <View style={styles.container}>
      <TouchableOpacity style={styles.row} onPress={openSheet} activeOpacity={0.7}>
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
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('shared.profile.avatar.profilePhotoLabel')}</Text>
          <Text style={styles.subtitle}>{t('shared.profile.avatar.profilePhotoSubtitle')}</Text>
        </View>
        <View style={styles.editIconContainer}>
          <Icon name="image-edit" size={18} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarInitial: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    editIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AvatarPickerRow;
