import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

interface PastEntriesErrorStateProps {
  error: string;
  onRetry: () => void;
}

/**
 * Enhanced Past Entries Error State with Edge-to-Edge Design
 *
 * DESIGN PHILOSOPHY:
 * 1. ERROR RECOVERY ZONE: Edge-to-edge error state with comprehensive recovery guidance
 * 2. VISUAL DEPTH: Enhanced shadows and elevation for modern feel
 * 3. CONTEXTUAL HELP: Smart error detection with appropriate guidance
 * 4. TYPOGRAPHY HIERARCHY: Consistent with established design system
 *
 * UX ENHANCEMENTS:
 * - Edge-to-edge card design with proper spacing
 * - Enhanced error icon with visual feedback
 * - Better contextual help and recovery options
 * - Improved status indicators and troubleshooting tips
 */
const PastEntriesErrorState: React.FC<PastEntriesErrorStateProps> = ({ error, onRetry }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Enhanced error type detection with better messaging
  const getErrorInfo = () => {
    const errorLower = error.toLowerCase();

    if (
      errorLower.includes('network') ||
      errorLower.includes('connection') ||
      errorLower.includes('internet')
    ) {
      return {
        icon: 'wifi-off',
        title: 'Bağlantı Sorunu',
        message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
        actionText: 'Yeniden Bağlan',
        type: 'network',
        color: theme.colors.warning,
      };
    }

    if (errorLower.includes('timeout') || errorLower.includes('slow')) {
      return {
        icon: 'clock-alert',
        title: 'Zaman Aşımı',
        message: 'İstek çok uzun sürdü. Sunucu yavaş yanıt veriyor olabilir.',
        actionText: 'Tekrar Dene',
        type: 'timeout',
        color: theme.colors.warning,
      };
    }

    if (errorLower.includes('auth') || errorLower.includes('unauthorized')) {
      return {
        icon: 'account-alert',
        title: 'Kimlik Doğrulama Hatası',
        message: 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.',
        actionText: 'Tekrar Dene',
        type: 'auth',
        color: theme.colors.error,
      };
    }

    // Generic error
    return {
      icon: 'alert-circle',
      title: 'Beklenmeyen Hata',
      message: 'Minnet kayıtları yüklenirken bir sorun oluştu. Tekrar deneyebilirsiniz.',
      actionText: 'Yeniden Dene',
      type: 'generic',
      color: theme.colors.error,
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <View style={styles.errorZone}>
      <ThemedCard
        variant="outlined"
        density="comfortable"
        elevation="overlay"
        style={styles.errorCard}
      >
        <View style={styles.errorContent}>
          {/* Enhanced Error Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={[styles.errorIconContainer, { borderColor: errorInfo.color + '40' }]}>
              <Icon name={errorInfo.icon} size={64} color={errorInfo.color} />
            </View>
            <View style={styles.alertContainer}>
              <Icon
                name="alert-circle-outline"
                size={16}
                color={errorInfo.color + '60'}
                style={styles.alertIcon1}
              />
              <Icon
                name="alert-circle-outline"
                size={12}
                color={errorInfo.color + '40'}
                style={styles.alertIcon2}
              />
            </View>
          </View>

          {/* Enhanced Main Content */}
          <View style={styles.messageSection}>
            <Text style={styles.errorTitle}>{errorInfo.title}</Text>
            <Text style={styles.errorMessage}>{errorInfo.message}</Text>

            {/* Technical Details for Development */}
            {__DEV__ && (
              <View style={styles.technicalSection}>
                <View style={styles.technicalHeader}>
                  <Icon name="code-tags" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.technicalTitle}>Geliştirici Detayı</Text>
                </View>
                <Text style={styles.technicalText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Enhanced Action Section */}
          <View style={styles.actionSection}>
            <ThemedButton
              title={errorInfo.actionText}
              onPress={onRetry}
              variant="primary"
              style={styles.retryButton}
              iconLeft="refresh"
            />
          </View>

          {/* Enhanced Troubleshooting Guide */}
          <View style={styles.troubleshootingSection}>
            <View style={styles.troubleshootingHeader}>
              <Icon name="tools" size={16} color={theme.colors.info} />
              <Text style={styles.troubleshootingTitle}>Sorun Giderme</Text>
            </View>

            <View style={styles.helpList}>
              <View style={styles.helpItem}>
                <View style={styles.helpBullet}>
                  <Icon name="circle" size={6} color={theme.colors.primary} />
                </View>
                <Text style={styles.helpText}>Uygulamayı kapatıp yeniden açmayı deneyin</Text>
              </View>

              {errorInfo.type === 'network' && (
                <View style={styles.helpItem}>
                  <View style={styles.helpBullet}>
                    <Icon name="circle" size={6} color={theme.colors.warning} />
                  </View>
                  <Text style={styles.helpText}>
                    Wi-Fi veya mobil veri bağlantınızı kontrol edin
                  </Text>
                </View>
              )}

              {errorInfo.type === 'auth' && (
                <View style={styles.helpItem}>
                  <View style={styles.helpBullet}>
                    <Icon name="circle" size={6} color={theme.colors.error} />
                  </View>
                  <Text style={styles.helpText}>Çıkış yapıp tekrar giriş yapmayı deneyin</Text>
                </View>
              )}

              <View style={styles.helpItem}>
                <View style={styles.helpBullet}>
                  <Icon name="circle" size={6} color={theme.colors.info} />
                </View>
                <Text style={styles.helpText}>Sorun devam ederse daha sonra tekrar deneyin</Text>
              </View>
            </View>
          </View>

          {/* Enhanced Status Indicators */}
          <View style={styles.statusSection}>
            <View style={styles.statusHeader}>
              <Icon name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.statusTitle}>Sistem Durumu</Text>
            </View>

            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.statusText}>Uygulama</Text>
                <Text style={styles.statusValue}>Çalışıyor</Text>
              </View>

              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        errorInfo.type === 'network' ? theme.colors.error : theme.colors.warning,
                    },
                  ]}
                />
                <Text style={styles.statusText}>Veri</Text>
                <Text style={styles.statusValue}>
                  {errorInfo.type === 'network' ? 'Bağlantı Yok' : 'Geçici Hata'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-Edge Error Zone
    errorZone: {
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    errorCard: {
      borderRadius: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.error + '30',
      backgroundColor: theme.colors.surface,
      ...getPrimaryShadow.card(theme),
    },
    errorContent: {
      alignItems: 'center',
      // Padding handled by density="comfortable"
    },

    // Enhanced Illustration
    illustrationContainer: {
      position: 'relative',
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorIconContainer: {
      width: 120,
      height: 120,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.errorContainer + '20',
      borderWidth: 3,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    alertContainer: {
      position: 'absolute',
      width: 160,
      height: 160,
    },
    alertIcon1: {
      position: 'absolute',
      top: 15,
      right: 25,
    },
    alertIcon2: {
      position: 'absolute',
      bottom: 20,
      left: 30,
    },

    // Enhanced Message Section
    messageSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    errorTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: theme.spacing.md,
    },
    errorMessage: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      letterSpacing: 0.1,
      marginBottom: theme.spacing.lg,
    },

    // Technical Section for Development
    technicalSection: {
      width: '100%',
      backgroundColor: theme.colors.surfaceVariant + '40',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
    },
    technicalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    technicalTitle: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    technicalText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'monospace',
      lineHeight: 18,
    },

    // Enhanced Action Section
    actionSection: {
      width: '100%',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    retryButton: {
      width: '100%',
    },

    // Enhanced Troubleshooting Section
    troubleshootingSection: {
      width: '100%',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
    },
    troubleshootingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    troubleshootingTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    helpList: {
      gap: theme.spacing.sm,
    },
    helpItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    helpBullet: {
      marginTop: theme.spacing.xs,
    },
    helpText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
      fontWeight: '500',
    },

    // Enhanced Status Section
    statusSection: {
      width: '100%',
      backgroundColor: theme.colors.surfaceVariant + '20',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    statusTitle: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    statusGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statusItem: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: theme.borderRadius.full,
      ...getPrimaryShadow.small(theme),
    },
    statusText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    statusValue: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

export default PastEntriesErrorState;
