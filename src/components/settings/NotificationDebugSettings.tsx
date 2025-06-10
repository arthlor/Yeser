import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { notificationService } from '@/services/notificationService';
import { analyticsService } from '@/services/analyticsService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '@/themes/types';

interface NotificationDebugInfo {
  identifier: string;
  title: string;
  body: string;
  trigger: any;
  categoryIdentifier?: string;
}

interface NotificationDebugSettingsProps {
  isVisible?: boolean;
}

const NotificationDebugSettings: React.FC<NotificationDebugSettingsProps> = ({
  isVisible = false,
}) => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useGlobalError();
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    count: number;
    notifications: NotificationDebugInfo[];
  }>({ count: 0, notifications: [] });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const loadDebugInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await notificationService.getScheduledNotificationsDebugInfo();
      setDebugInfo(info);
      setLastRefresh(new Date());

      logger.debug('Notification debug info loaded', {
        count: info.count,
        notifications: info.notifications.length,
      });
    } catch (error) {
      logger.error('Failed to load notification debug info', error as Error);
      showError('Debug bilgileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const handleClearAllNotifications = useCallback(async () => {
    setIsLoading(true);
    hapticFeedback.medium();

    try {
      await notificationService.cancelAllScheduledNotifications();
      await loadDebugInfo(); // Refresh the list

      showSuccess('Tüm bildirimler temizlendi!');

      analyticsService.logEvent('debug_all_notifications_cleared', {
        previous_count: debugInfo.count,
      });

      logger.debug('All notifications cleared via debug panel');
    } catch (error) {
      showError('Bildirimler temizlenirken hata oluştu');
      logger.error('Failed to clear all notifications', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [showError, showSuccess, debugInfo.count, loadDebugInfo]);

  // Auto-load on mount and when visible
  useEffect(() => {
    if (isVisible) {
      loadDebugInfo();
    }
  }, [isVisible, loadDebugInfo]);

  if (!isVisible) {
    return null;
  }

  const getDuplicateNotifications = () => {
    const titleGroups = debugInfo.notifications.reduce(
      (acc, notification) => {
        const key = `${notification.title}-${notification.categoryIdentifier}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(notification);
        return acc;
      },
      {} as Record<string, NotificationDebugInfo[]>
    );

    return Object.entries(titleGroups).filter(([, notifications]) => notifications.length > 1);
  };

  const duplicates = getDuplicateNotifications();
  const dailyReminders = debugInfo.notifications.filter(
    (n) => n.categoryIdentifier === 'DAILY_REMINDER'
  );
  const throwbackReminders = debugInfo.notifications.filter(
    (n) => n.categoryIdentifier === 'THROWBACK_REMINDER'
  );

  return (
    <ThemedCard>
      <Text style={styles.cardTitle}>🔧 Bildirim Debug Paneli</Text>
      <View style={styles.container}>
        {/* Summary Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{debugInfo.count}</Text>
            <Text style={styles.statLabel}>Toplam Bildirim</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, duplicates.length > 0 && styles.statValueError]}>
              {duplicates.length}
            </Text>
            <Text style={styles.statLabel}>Tekrar Eden</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dailyReminders.length}</Text>
            <Text style={styles.statLabel}>Günlük</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{throwbackReminders.length}</Text>
            <Text style={styles.statLabel}>Geçmiş</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <ThemedButton
            variant="secondary"
            title="Yenile"
            onPress={loadDebugInfo}
            isLoading={isLoading}
            style={styles.actionButton}
            iconLeft="refresh"
          />

          <ThemedButton
            variant="secondary"
            title="Tümünü Temizle"
            onPress={handleClearAllNotifications}
            isLoading={isLoading}
            style={styles.actionButton}
            iconLeft="delete-outline"
          />
        </View>

        {/* Duplicate Notifications Alert */}
        {duplicates.length > 0 && (
          <View style={styles.alertContainer}>
            <View style={styles.alertIcon}>
              <Icon name="alert-circle" size={20} color={theme.colors.error} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Tekrar Eden Bildirimler Tespit Edildi!</Text>
              <Text style={styles.alertDescription}>
                {duplicates.length} grup bildirim birden fazla kez zamanlanmış. Bu çoklu bildirim
                sorununun kaynağı.
              </Text>
            </View>
          </View>
        )}

        {/* Last Refresh Time */}
        {lastRefresh && (
          <Text style={styles.refreshTime}>
            Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
          </Text>
        )}

        {/* Detailed Notification List */}
        {debugInfo.count > 0 && (
          <ScrollView style={styles.notificationList} nestedScrollEnabled>
            {debugInfo.notifications.map((notification, index) => (
              <View key={`${notification.identifier}-${index}`} style={styles.notificationItem}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <View
                    style={[
                      styles.categoryBadge,
                      notification.categoryIdentifier === 'DAILY_REMINDER' && styles.dailyBadge,
                      notification.categoryIdentifier === 'THROWBACK_REMINDER' &&
                        styles.throwbackBadge,
                    ]}
                  >
                    <Text style={styles.categoryText}>
                      {notification.categoryIdentifier || 'Bilinmeyen'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.notificationBody}>{notification.body}</Text>
                <Text style={styles.notificationId}>ID: {notification.identifier}</Text>
                {notification.trigger && (
                  <Text style={styles.triggerInfo}>
                    Tetikleyici: {JSON.stringify(notification.trigger, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {debugInfo.count === 0 && (
          <View style={styles.emptyState}>
            <Icon name="bell-off-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyStateText}>Zamanlanmış bildirim bulunamadı</Text>
          </View>
        )}
      </View>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardTitle: {
      ...theme.typography.headlineSmall,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.md,
    },
    container: {
      gap: theme.spacing.md,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant + '30',
      borderRadius: theme.borderRadius.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      ...theme.typography.headlineSmall,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    statValueError: {
      color: theme.colors.error,
    },
    statLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.xs,
    },
    actionContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
    alertContainer: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.sm,
    },
    alertIcon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      ...theme.typography.bodyLarge,
      fontWeight: '600',
      color: theme.colors.onErrorContainer,
      marginBottom: theme.spacing.xs,
    },
    alertDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      lineHeight: 20,
    },
    refreshTime: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    notificationList: {
      maxHeight: 300,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.small(theme),
    },
    notificationItem: {
      padding: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '20',
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xs,
    },
    notificationTitle: {
      ...theme.typography.bodyLarge,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    categoryBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    dailyBadge: {
      backgroundColor: theme.colors.primaryContainer,
    },
    throwbackBadge: {
      backgroundColor: theme.colors.secondaryContainer,
    },
    categoryText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontSize: 10,
    },
    notificationBody: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    notificationId: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'monospace',
      marginBottom: theme.spacing.xs,
    },
    triggerInfo: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'monospace',
      backgroundColor: theme.colors.surfaceVariant + '30',
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyStateText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

export default NotificationDebugSettings;
