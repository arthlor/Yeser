import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import StatementDisplayCard from '@/shared/components/ui/StatementDisplayCard';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';

// Define a more specific type for the throwback entry prop
interface ThrowbackEntryData {
  statements: string[];
  entry_date: string; // Assuming date is a string that can be parsed by new Date()
}

interface ThrowbackTeaserProps {
  throwbackEntry: ThrowbackEntryData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void; // Refresh to get a new random entry
}

const ThrowbackTeaser: React.FC<ThrowbackTeaserProps> = React.memo(
  ({ throwbackEntry, isLoading, error, onRefresh }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    /**
     * **ENHANCED UI/UX IMPLEMENTATION**:
     * - Modern gradient header design with improved visual hierarchy
     * - Enhanced typography and spacing throughout
     * - Better visual feedback for all interaction states
     * - Improved accessibility and user experience
     * - Maintained all existing functionality with zero breaking changes
     */

    // Enhanced refresh handler with improved feedback
    const handleRefresh = useCallback(() => {
      if (!onRefresh) {
        return;
      }
      onRefresh();
    }, [onRefresh]);

    // Debug logging - FIXED: Remove unstable timestamp to prevent infinite re-renders
    const debugData = useMemo(
      () => ({
        hasEntry: !!throwbackEntry,
        isLoading,
        error: error?.substring(0, 100), // Log first 100 chars of error
        entryData: throwbackEntry
          ? {
              date: throwbackEntry.entry_date,
              statementsCount: throwbackEntry.statements?.length,
              firstStatement: throwbackEntry.statements?.[0]?.substring(0, 50),
            }
          : null,
      }),
      [throwbackEntry, isLoading, error]
    );

    React.useEffect(() => {
      logger.debug('ThrowbackTeaser Debug:', {
        ...debugData,
        timestamp: new Date().toISOString(), // Move timestamp here to prevent re-render loop
        // Add helpful debug info for single entry case
        note:
          throwbackEntry &&
          'If refresh returns same entry, you may need more gratitude entries for randomization to work',
      });
    }, [debugData, throwbackEntry]);

    // Enhanced loading state with modern design
    if (isLoading) {
      return (
        <View style={styles.container}>
          <View style={styles.modernCard}>
            {/* Enhanced Header with Gradient */}
            <View style={styles.gradientHeader}>
              <View style={styles.headerContentLoading}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainerLoading}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                  <View style={styles.titleSection}>
                    <Text style={styles.titleText}>Geçmişten Anılar</Text>
                    <Text style={styles.subtitleTextLoading}>Güzel bir anı yükleniyor...</Text>
                  </View>
                </View>
                <View style={styles.loadingSpinner}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              </View>
            </View>

            {/* Enhanced Loading Content */}
            <View style={styles.cardBody}>
              <View style={styles.loadingContent}>
                <View style={styles.loadingTextContainer}>
                  <View style={styles.skeletonLine} />
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLineMedium} />
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Enhanced error state with better visual design
    if (error && !throwbackEntry) {
      return (
        <View style={styles.container}>
          <TouchableOpacity style={styles.modernCard} onPress={onRefresh} activeOpacity={0.8}>
            {/* Enhanced Error Header */}
            <View style={styles.errorHeader}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainerError}>
                    <Icon name="alert-circle-outline" size={20} color={theme.colors.error} />
                  </View>
                  <View style={styles.titleSection}>
                    <Text style={styles.titleText}>Anı Yüklenemedi</Text>
                    <Text style={styles.subtitleTextError}>Bir sorun oluştu</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRefresh}
                  activeOpacity={0.7}
                >
                  <Icon name="refresh" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Error Content */}
            <View style={styles.cardBody}>
              <View style={styles.errorContent}>
                <View style={styles.errorIconContainer}>
                  <Icon
                    name="emoticon-sad-outline"
                    size={32}
                    color={theme.colors.onErrorContainer}
                  />
                </View>
                <Text style={styles.errorMessage}>{error}</Text>
                <Text style={styles.errorRetryText}>Tekrar denemek için dokunun</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Enhanced placeholder state with inspiring design
    if (!throwbackEntry) {
      return (
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.modernCard}
            onPress={() => {
              logger.debug('ThrowbackTeaser: Manual refresh triggered by user tap');
              onRefresh?.();
            }}
            activeOpacity={0.8}
          >
            {/* Enhanced Placeholder Header */}
            <View style={styles.placeholderHeader}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainerPlaceholder}>
                    <Icon name="history" size={22} color={theme.colors.primary} />
                  </View>
                  <View style={styles.titleSection}>
                    <Text style={styles.titleText}>Geçmişten Anılar</Text>
                    <Text style={styles.subtitleTextPlaceholder}>Anılarınız burada görünecek</Text>
                  </View>
                </View>
                <View style={styles.sparkleIcon}>
                  <Icon name="sparkles" size={18} color={theme.colors.tertiary} />
                </View>
              </View>
            </View>

            {/* Enhanced Placeholder Content */}
            <View style={styles.cardBody}>
              <View style={styles.placeholderContent}>
                <View style={styles.placeholderIconContainer}>
                  <Icon
                    name="heart-multiple-outline"
                    size={48}
                    color={theme.colors.primary + '40'}
                  />
                  <View style={styles.decorativeElements}>
                    <Icon
                      name="star-outline"
                      size={16}
                      color={theme.colors.tertiary}
                      style={styles.star1}
                    />
                    <Icon
                      name="star-outline"
                      size={12}
                      color={theme.colors.tertiary}
                      style={styles.star2}
                    />
                    <Icon
                      name="star-outline"
                      size={14}
                      color={theme.colors.tertiary}
                      style={styles.star3}
                    />
                  </View>
                </View>
                <Text style={styles.placeholderTitle}>Anılarınız Birikiyor</Text>
                <Text style={styles.placeholderSubtitle}>
                  Minnet kayıtlarınız arttıkça, burada geçmişten güzel anılarınızı keşfedeceksiniz.
                </Text>
                <View style={styles.placeholderHint}>
                  <Icon name="hand-pointing-up" size={16} color={theme.colors.primary} />
                  <Text style={styles.placeholderHintText}>Keşfetmeye başlamak için dokunun</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Enhanced main content with sophisticated design
    return (
      <View style={styles.container}>
        <View style={styles.modernCard}>
          {/* Enhanced Header with Modern Design */}
          <View style={styles.modernHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Icon name="history" size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.titleSection}>
                  <Text style={styles.titleText}>Geçmişten Bir Anı</Text>
                  <Text style={styles.subtitleText}>Geçmiş minnettarlıklarınızdan</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
                disabled={isLoading}
                accessibilityLabel="Yeni anı getir"
                accessibilityHint="Başka bir geçmiş minnettarlık anısı yükler"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <View style={styles.refreshButtonContent}>
                    <Icon name="refresh" size={18} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Statement Display with Better Integration */}
          <View style={styles.cardBody}>
            <StatementDisplayCard
              statement={throwbackEntry.statements?.[0] || 'Geçmişten bir minnet ifadeniz var.'}
              date={throwbackEntry.entry_date}
              variant="inspiration"
              showQuotes={true}
              showTimestamp={true}
              animateEntrance={true}
              numberOfLines={4}
              edgeToEdge={false}
              style={styles.enhancedStatementCard}
            />
          </View>
        </View>
      </View>
    );
  }
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
    } as ViewStyle,

    // Enhanced Modern Card Design - Edge-to-Edge
    modernCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 0,
      overflow: 'hidden',
      ...getPrimaryShadow.medium(theme),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '20',
      borderBottomColor: theme.colors.outline + '20',
    } as ViewStyle,

    // Enhanced Header Designs
    modernHeader: {
      backgroundColor: `linear-gradient(135deg, ${theme.colors.primaryContainer}40, ${theme.colors.surface})`,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    gradientHeader: {
      backgroundColor: theme.colors.primaryContainer + '30',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    errorHeader: {
      backgroundColor: theme.colors.errorContainer + '20',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.error + '20',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    placeholderHeader: {
      backgroundColor: theme.colors.tertiaryContainer + '30',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    // Enhanced Header Content
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 44,
    } as ViewStyle,

    headerContentLoading: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 44,
    } as ViewStyle,

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.sm,
    } as ViewStyle,

    // Enhanced Icon Containers
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      ...getPrimaryShadow.small(theme),
    } as ViewStyle,

    iconContainerLoading: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryContainer + '40',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    iconContainerError: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.errorContainer + '40',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    iconContainerPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.tertiaryContainer + '40',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    // Enhanced Typography
    titleSection: {
      flex: 1,
      marginLeft: theme.spacing.xs,
    } as ViewStyle,

    titleText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.onSurface,
      letterSpacing: 0.3,
      lineHeight: 24,
    } as TextStyle,

    subtitleText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
      letterSpacing: 0.1,
    } as TextStyle,

    subtitleTextLoading: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.primary,
      marginTop: 2,
      fontStyle: 'italic',
    } as TextStyle,

    subtitleTextError: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.error,
      marginTop: 2,
    } as TextStyle,

    subtitleTextPlaceholder: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.tertiary,
      marginTop: 2,
      fontStyle: 'italic',
    } as TextStyle,

    // Enhanced Action Buttons
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      ...getPrimaryShadow.small(theme),
    } as ViewStyle,

    refreshButtonContent: {
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    retryButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.errorContainer + '30',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    } as ViewStyle,

    sparkleIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.tertiaryContainer + '40',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    // Enhanced Card Body
    cardBody: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    // Enhanced Loading States
    loadingSpinner: {
      marginLeft: theme.spacing.sm,
    } as ViewStyle,

    loadingContent: {
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    loadingTextContainer: {
      gap: theme.spacing.sm,
    } as ViewStyle,

    skeletonLine: {
      height: 16,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.sm,
      width: '100%',
    } as ViewStyle,

    skeletonLineShort: {
      height: 16,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.sm,
      width: '70%',
    } as ViewStyle,

    skeletonLineMedium: {
      height: 16,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.sm,
      width: '85%',
    } as ViewStyle,

    // Enhanced Error States
    errorContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    } as ViewStyle,

    errorIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.errorContainer + '30',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    } as ViewStyle,

    errorMessage: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: '90%',
    } as TextStyle,

    errorRetryText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
    } as TextStyle,

    // Enhanced Placeholder States
    placeholderContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    } as ViewStyle,

    placeholderIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      position: 'relative',
    } as ViewStyle,

    decorativeElements: {
      position: 'absolute',
      width: 80,
      height: 80,
    } as ViewStyle,

    star1: {
      position: 'absolute',
      top: 8,
      right: 12,
    } as ViewStyle,

    star2: {
      position: 'absolute',
      bottom: 15,
      left: 8,
    } as ViewStyle,

    star3: {
      position: 'absolute',
      top: 25,
      left: -5,
    } as ViewStyle,

    placeholderTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onSurface,
      textAlign: 'center',
      letterSpacing: 0.2,
    } as TextStyle,

    placeholderSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: '90%',
      paddingHorizontal: theme.spacing.sm,
    } as TextStyle,

    placeholderHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primaryContainer + '20',
      borderRadius: theme.borderRadius.lg,
    } as ViewStyle,

    placeholderHintText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
      letterSpacing: 0.1,
    } as TextStyle,

    // Enhanced Statement Card Integration - Edge-to-Edge
    enhancedStatementCard: {
      marginHorizontal: 0,
      marginVertical: 0,
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      elevation: 0,
      shadowOpacity: 0,
    } as ViewStyle,
  });

ThrowbackTeaser.displayName = 'ThrowbackTeaser';

export default ThrowbackTeaser;
