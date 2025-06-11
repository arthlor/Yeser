import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import ErrorState from '@/shared/components/ui/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import StatementDetailCard from '@/shared/components/ui/StatementDetailCard';
import { useGratitudeEntry, useGratitudeMutations } from '../hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { AppTheme } from '@/themes/types';
import { RootStackParamList } from '@/types/navigation';
import { ScreenLayout } from '@/shared/components/layout';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import { ZodError } from 'zod';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';
import { analyticsService } from '@/services/analyticsService';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Define the type for the route params
type EntryDetailScreenRouteProp = RouteProp<RootStackParamList, 'EntryDetail'>;

// Define navigation prop type for navigating back or to an edit screen
type EntryDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'EntryDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/**
 * **SIMPLIFIED ENTRY DETAIL SCREEN**: Minimal, elegant entry detail experience
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Eliminated all 3 LayoutAnimation calls that caused performance issues
 * - Removed complex platform-specific animation setup
 * - Replaced with simple state changes for editing interactions
 * - Maintained all functionality with cleaner, minimal approach
 */

/**
 * EnhancedEntryDetailScreen displays a single gratitude entry with beautiful journal-like design
 * Features: Individual statement cards, enhanced animations, gorgeous visual hierarchy
 */
const EnhancedEntryDetailScreen: React.FC<{
  route: EntryDetailScreenRouteProp;
  navigation: EntryDetailScreenNavigationProp;
}> = ({ route }) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useToast();
  const { handleMutationError } = useGlobalError();
  const { entryDate: routeEntryDate } = route.params;

  // Provide fallback for entryDate if not provided
  const entryDate = routeEntryDate || new Date().toISOString().split('T')[0];

  // Live data fetching for real-time updates
  const {
    data: currentEntry,
    isLoading: isLoadingEntry,
    refetch: refetchEntry,
    isRefetching,
    error: entryError,
  } = useGratitudeEntry(entryDate);

  // Mutation hooks for editing operations only (delete removed for past entries)
  const { editStatement, editStatementError } = useGratitudeMutations();

  // Local state for editing
  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);

  // Animation values for enhanced entrance effects
  const animations = useCoordinatedAnimations();
  const [animationsReady, setAnimationsReady] = useState(false);

  // Use live data or fallback to route params
  const gratitudeItems = currentEntry?.statements || [];

  // 🎯 TOAST INTEGRATION: Refresh handler with toast feedback
  const handleRefresh = useCallback(async () => {
    try {
      await refetchEntry();
      // Success feedback for refresh
      showSuccess('Minnet kayıtları yenilendi');
    } catch (error) {
      // Error feedback for refresh failure
      showError('Kayıtlar yenilenemedi. Lütfen tekrar deneyin.');
      logger.error('Refresh error:', error instanceof Error ? error : new Error(String(error)));
    }
  }, [refetchEntry, showSuccess, showError]);

  // Analytics tracking
  useEffect(() => {
    analyticsService.logScreenView('entry_detail_screen');

    // Track detailed entry context
    analyticsService.logEvent('entry_detail_viewed', {
      entry_date: entryDate,
      statements_count: gratitudeItems.length,
      is_today: entryDate === new Date().toISOString().split('T')[0],
      is_loading: isLoadingEntry,
      has_error: !!entryError,
    });
  }, [entryDate, gratitudeItems.length, isLoadingEntry, entryError]);

  // Enhanced date formatting with relative time
  const formatEntryDate = () => {
    if (!entryDate) {
      return { formattedDate: 'Tarih bilgisi yok', relativeTime: '', isToday: false };
    }

    const entryDateObj = new Date(entryDate);
    const today = new Date();
    const diffTime = today.getTime() - entryDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = entryDateObj.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    let relativeTime = '';
    const isToday = diffDays === 0;

    if (isToday) {
      relativeTime = 'Bugün';
    } else if (diffDays === 1) {
      relativeTime = 'Dün';
    } else if (diffDays < 7) {
      relativeTime = `${diffDays} gün önce`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      relativeTime = `${weeks} hafta önce`;
    } else {
      const months = Math.floor(diffDays / 30);
      relativeTime = `${months} ay önce`;
    }

    return { formattedDate, relativeTime, isToday };
  };

  const { formattedDate, relativeTime, isToday } = formatEntryDate();

  // 🎯 TOAST INTEGRATION: Handle mutations errors with toast notifications
  useEffect(() => {
    if (editStatementError) {
      handleMutationError(editStatementError, 'editStatement');
      showError('Düzenleme işlemi başarısız oldu. Lütfen tekrar deneyin.');
    }
  }, [editStatementError, handleMutationError, showError]);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    setAnimationsReady(true);
    animations.animateEntrance({ duration: 400 });
  }, [animations, gratitudeItems.length]);

  // Handle initial loading state
  if (isLoadingEntry) {
    return <LoadingState fullScreen={true} message="Minnet kayıtları yükleniyor..." />;
  }

  // Handle error state
  if (entryError) {
    return (
      <ScreenLayout
        scrollable={false}
        showsVerticalScrollIndicator={false}
        edges={['top']}
        edgeToEdge={true}
      >
        <ErrorState
          title="Yüklenemedi"
          error={entryError}
          icon="calendar-alert"
          onRetry={() => refetchEntry()}
          retryText="Tekrar Dene"
        />
      </ScreenLayout>
    );
  }

  const handleEditStatement = (index: number) => {
    setEditingStatementIndex(index);
  };

  const handleSaveEditedStatement = async (index: number, updatedText: string) => {
    if (!updatedText.trim()) {
      return;
    }

    try {
      gratitudeStatementSchema.parse(updatedText.trim());

      await editStatement({
        entryDate: entryDate,
        statementIndex: index,
        updatedStatement: updatedText.trim(),
      });

      setEditingStatementIndex(null);

      // 🎯 TOAST INTEGRATION: Success feedback for statement updates
      showSuccess('Minnet kaydın başarıyla güncellendi');
    } catch (error) {
      if (error instanceof ZodError) {
        // 🎯 TOAST INTEGRATION: Use toast for validation errors with user-friendly messages
        showError('Lütfen geçerli bir minnet ifadesi girin');
      } else {
        // 🎯 TOAST INTEGRATION: Use toast for general errors
        showError('Düzenleme işlemi başarısız oldu. Lütfen tekrar deneyin.');
        handleMutationError(error, 'saveEditedStatement');
        logger.error(
          'Edit statement error:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  };

  const handleCancelEditingStatement = () => {
    setEditingStatementIndex(null);
  };

  const styles = createStyles(theme);

  // Enhanced Empty State Component
  const EmptyStateEnhanced = () => (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        {
          opacity: animations.fadeAnim,
        },
      ]}
    >
      <ThemedCard
        variant="outlined"
        density="comfortable"
        elevation="card"
        style={styles.emptyStateCard}
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={72}
              color={theme.colors.primary + '60'}
            />
            <View style={styles.sparkleContainer}>
              <MaterialCommunityIcons
                name="star-outline"
                size={16}
                color={theme.colors.primary + '40'}
                style={styles.sparkle1}
              />
              <MaterialCommunityIcons
                name="star-outline"
                size={12}
                color={theme.colors.primary + '40'}
                style={styles.sparkle2}
              />
              <MaterialCommunityIcons
                name="star-outline"
                size={14}
                color={theme.colors.primary + '40'}
                style={styles.sparkle3}
              />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Bu günün hikayesi henüz yazılmamış</Text>
          <Text style={styles.emptySubtitle}>
            Bu özel güne ait minnet kayıtları henüz yok.{'\n'}
            Geri dönüp o günün güzel anılarını paylaşabilirsin!
          </Text>
          <View style={styles.emptyQuote}>
            <MaterialCommunityIcons
              name="format-quote-open"
              size={20}
              color={theme.colors.primary + '60'}
            />
            <Text style={styles.emptyQuoteText}>
              "Her gün, minnettarlık için{'\n'}yeni fırsatlar sunar."
            </Text>
          </View>
        </View>
      </ThemedCard>
    </Animated.View>
  );

  return (
    <ScreenLayout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      density="compact"
      edges={['top']}
      edgeToEdge={true}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
          progressBackgroundColor={theme.colors.surface}
        />
      }
    >
      {/* 🎯 ENHANCED HERO ZONE: More aesthetic header design */}
      <Animated.View
        style={[
          styles.heroZone,
          {
            opacity: animations.fadeAnim,
          },
        ]}
      >
        <ThemedCard
          variant="elevated"
          density="comfortable"
          elevation="floating"
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.dateSection}>
              <View style={styles.dateDisplayContainer}>
                <View style={styles.dateDisplayBadge}>
                  <Text style={styles.dayNumber}>
                    {new Date(entryDate || new Date()).getDate()}
                  </Text>
                  <Text style={styles.monthText}>
                    {new Date(entryDate || new Date())
                      .toLocaleDateString('tr-TR', { month: 'short' })
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateText}>{formattedDate}</Text>
                  <View style={styles.relativeDateContainer}>
                    <MaterialCommunityIcons
                      name="calendar-heart"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.relativeDateText}>{relativeTime}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsSection}>
                <View style={styles.countBadge}>
                  <MaterialCommunityIcons
                    name="cards-heart"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.countText}>{gratitudeItems.length}</Text>
                </View>
                <Text style={styles.countLabel}>minnet</Text>
              </View>
            </View>

            {gratitudeItems.length > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <MaterialCommunityIcons
                    name={gratitudeItems.length >= 3 ? 'trophy' : 'target'}
                    size={16}
                    color={gratitudeItems.length >= 3 ? theme.colors.success : theme.colors.primary}
                  />
                  <Text style={styles.progressTitle}>
                    {gratitudeItems.length >= 3
                      ? isToday
                        ? '🎉 Bugün hedef tamamlandı!'
                        : '🎉 O gün hedef tamamlanmıştı!'
                      : isToday
                        ? `Hedefe ${3 - gratitudeItems.length} kaldı`
                        : `O gün hedefe ${3 - gratitudeItems.length} kalmıştı`}
                  </Text>
                </View>
                <View style={styles.progressLineContainer}>
                  <View style={styles.progressLine}>
                    <View
                      style={[
                        styles.progressLineFill,
                        {
                          width: `${Math.min((gratitudeItems.length / 3) * 100, 100)}%`,
                          backgroundColor:
                            gratitudeItems.length >= 3
                              ? theme.colors.success
                              : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                  {gratitudeItems.length >= 3 && (
                    <View style={styles.goalCompleteIndicator}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color={theme.colors.success}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </ThemedCard>
      </Animated.View>

      {/* 🎯 ENHANCED CONTENT ZONE: More aesthetic statements display */}
      {gratitudeItems.length > 0 ? (
        <View style={styles.contentZone}>
          <ThemedCard
            variant="elevated"
            density="standard"
            elevation="card"
            style={styles.statementsCard}
          >
            <View style={styles.statementsHeader}>
              <View style={styles.statementsHeaderLeft}>
                <View style={styles.statementsIconContainer}>
                  <MaterialCommunityIcons
                    name="heart-multiple"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.statementsTitle}>
                  {isToday ? 'Bugünkü minnetleriniz' : 'O günkü minnetleriniz'}
                </Text>
              </View>
              <View style={styles.statementsCounter}>
                <Text style={styles.statementsCountText}>{gratitudeItems.length}</Text>
              </View>
            </View>

            <View style={styles.statementsContainer}>
              {gratitudeItems.map((item, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.statementWrapper,
                    animationsReady && {
                      opacity: animations.fadeAnim,
                      transform: [
                        {
                          translateY: animations.fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <StatementDetailCard
                    statement={item}
                    date={entryDate}
                    index={index}
                    totalCount={gratitudeItems.length}
                    variant="elegant"
                    showQuotes={true}
                    showSequence={true}
                    numberOfLines={undefined}
                    animateEntrance={animationsReady}
                    isEditing={editingStatementIndex === index}
                    onEdit={() => handleEditStatement(index)}
                    onSave={(newStatement: string) =>
                      handleSaveEditedStatement(index, newStatement)
                    }
                    onCancel={handleCancelEditingStatement}
                    enableInlineEdit={true}
                    confirmDelete={false}
                    maxLength={500}
                    edgeToEdge={true}
                    style={styles.enhancedStatementCard}
                  />
                </Animated.View>
              ))}
            </View>
          </ThemedCard>
        </View>
      ) : (
        <EmptyStateEnhanced />
      )}
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // 🎯 ENHANCED HERO ZONE: Edge-to-Edge Header
    heroZone: {
      paddingBottom: theme.spacing.lg,
    },
    heroCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.floating(theme),
    },
    heroContent: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    dateSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    dateDisplayContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    dateDisplayBadge: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      ...getPrimaryShadow.small(theme),
    },
    dayNumber: {
      ...theme.typography.titleLarge,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '900',
      fontSize: 20,
      lineHeight: 22,
    },
    monthText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
      fontSize: 8,
      letterSpacing: 1,
    },
    dateInfo: {
      flex: 1,
    },
    dateText: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xs,
      lineHeight: 28,
    },
    relativeDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    relativeDateText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    statsSection: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    countBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
      ...getPrimaryShadow.small(theme),
    },
    countText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
    },
    countLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },

    // Enhanced Progress Section
    progressSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '15',
      paddingTop: theme.spacing.md,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    progressTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      letterSpacing: -0.2,
      flex: 1,
    },
    progressLineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    progressLine: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressLineFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    goalCompleteIndicator: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.full,
      padding: 2,
      ...getPrimaryShadow.small(theme),
    },

    // 🎯 ENHANCED CONTENT ZONE: Edge-to-Edge Statement Display
    contentZone: {
      marginBottom: theme.spacing.xl,
    },
    statementsCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.outline + '10',
      ...getPrimaryShadow.card(theme),
    },
    statementsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    statementsHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    statementsIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryContainer + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statementsTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    statementsCounter: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.full,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    statementsCountText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
    },
    statementsContainer: {
      gap: 0,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    statementWrapper: {
      // Container for individual statements
    },
    enhancedStatementCard: {
      marginVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },

    // 🎯 ENHANCED EMPTY STATE: Edge-to-Edge Inspiring Void
    emptyStateContainer: {
      paddingVertical: theme.spacing.xl,
    },
    emptyStateCard: {
      borderRadius: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl * 1.5,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIconContainer: {
      position: 'relative',
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sparkleContainer: {
      position: 'absolute',
      width: 120,
      height: 120,
    },
    sparkle1: {
      position: 'absolute',
      top: 15,
      right: 20,
    },
    sparkle2: {
      position: 'absolute',
      bottom: 20,
      left: 15,
    },
    sparkle3: {
      position: 'absolute',
      top: 35,
      left: 10,
    },
    emptyTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      letterSpacing: -0.3,
    },
    emptySubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.lg,
    },
    emptyQuote: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '20',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    emptyQuoteText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 20,
      marginTop: theme.spacing.sm,
    },
  });

export default EnhancedEntryDetailScreen;
