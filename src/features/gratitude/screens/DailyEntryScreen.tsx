import GratitudeInputBar from '../components/GratitudeInputBar';

import {
  useGratitudeEntry,
  useGratitudeMutations,
  usePromptMutations,
  usePromptText,
} from '../hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { AppTheme } from '@/themes/types';
import { MainTabParamList } from '@/types/navigation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { analyticsService } from '@/services/analyticsService';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import { RouteProp } from '@react-navigation/native';
import { ScreenLayout } from '@/shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ErrorState from '@/shared/components/ui/ErrorState';

type DailyEntryScreenRouteProp = RouteProp<MainTabParamList, 'DailyEntryTab'>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

/**
 * Enhanced Daily Entry Screen - Beautiful Statement Cards Design
 * 
 * **ANIMATION COORDINATION REFACTORING**: Consolidated from 2 coordination instances
 * + 5 LayoutAnimation calls + 2 custom refs into single coordinated system.
 * 
 * **Phase 1 & 2 Implementation**: 
 * - Eliminated all LayoutAnimation.configureNext() calls (Phase 2)
 * - Single coordination system for all animations (Phase 1)
 * - Enhanced statement card interactions with coordinated feedback
 */
const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();
  const { handleMutationError, showError, showSuccess } = useGlobalError();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [manualDate, setManualDate] = useState<Date | null>(null);

  const initialDate = route?.params?.initialDate ? new Date(route.params.initialDate) : new Date();

  const effectiveDate = manualDate || initialDate;
  const finalDateString = effectiveDate.toISOString().split('T')[0];

  // Create a setter function for when user manually changes date
  const setEntryDate = useCallback((newDate: Date) => {
    setManualDate(newDate);
  }, []);

  const {
    data: currentEntry,
    isLoading: isLoadingEntry,
    refetch: refetchEntry,
    isRefetching,
    error: entryError,
  } = useGratitudeEntry(finalDateString);

  const {
    addStatement,
    isAddingStatement,
    addStatementError,
    editStatement,
    isEditingStatement,
    editStatementError,
    deleteStatement,
    isDeletingStatement,
    deleteStatementError,
  } = useGratitudeMutations();

  const { profile } = useUserProfile();

  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { fetchNewPrompt } = usePromptMutations();

  // Extract profile data first
  const { daily_gratitude_goal } = profile || {};

  // 🎬 MINIMAL ANIMATIONS: Simple and non-intrusive animation system
  const animations = useCoordinatedAnimations();

  // TanStack Query hooks for prompts - with refresh functionality
  const {
    promptText: currentPrompt,
    isLoading: promptLoading,
    error: promptError,
  } = usePromptText();

  // Computed values (after profile data is available)
  const statements = currentEntry?.statements || [];
  const dailyGoal = daily_gratitude_goal || 3;
  const isToday = finalDateString === new Date().toISOString().split('T')[0];
  const progressPercentage = Math.min((statements.length / dailyGoal) * 100, 100);
  const isGoalComplete = statements.length >= dailyGoal;
  const wasGoalJustCompleted = useRef(false);

  // 🛡️ MEMORY LEAK FIX: Add timer refs for cleanup
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🛡️ MEMORY LEAK FIX: Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      if (layoutTimerRef.current) {
        clearTimeout(layoutTimerRef.current);
      }
    };
  }, []);

  // **SIMPLE ENTRANCE**: Just a subtle fade-in on screen load
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **MINIMAL PROGRESS UPDATE**: Simple opacity change when statements change
  useEffect(() => {
    if (statements.length > 0) {
      animations.animateFade(1, { duration: 200 });
    }
  }, [statements.length, animations]);

  // **SIMPLE GOAL COMPLETION**: Toast notification instead of visual overlay
  useEffect(() => {
    if (isGoalComplete && !wasGoalJustCompleted.current) {
      wasGoalJustCompleted.current = true;
      // 🚀 TOAST INTEGRATION: Replace visual celebration with success toast
      showSuccess('Tebrikler! Günlük hedefinizi tamamladınız! 🎉');
      
      // 📊 ANALYTICS TRACKING: Log goal completion achievement
      analyticsService.logEvent('daily_goal_completed', {
        entry_date: finalDateString,
        is_today: isToday,
        statements_count: statements.length,
        daily_goal: dailyGoal,
        completion_time: new Date().toISOString(),
        user_id: profile?.id || null,
      });
      
      // Simple fade effect for completion feedback
      animations.animateFade(0.9, { duration: 300 });
      animationTimerRef.current = setTimeout(() => {
        animations.animateFade(1, { duration: 300 });
      }, 600);
    } else if (!isGoalComplete) {
      wasGoalJustCompleted.current = false;
    }
  }, [isGoalComplete, animations, showSuccess, finalDateString, isToday, statements.length, dailyGoal, profile?.id]);

  // 🛡️ ERROR PROTECTION: Handle mutations errors with global error system
  useEffect(() => {
    if (addStatementError) {
      handleMutationError(addStatementError, 'addStatement');
    }
  }, [addStatementError, handleMutationError]);

  useEffect(() => {
    if (editStatementError) {
      handleMutationError(editStatementError, 'editStatement');
    }
  }, [editStatementError, handleMutationError]);

  useEffect(() => {
    if (deleteStatementError) {
      handleMutationError(deleteStatementError, 'deleteStatement');
    }
  }, [deleteStatementError, handleMutationError]);

  // Analytics tracking with comprehensive context
  useEffect(() => {
    analyticsService.logScreenView('daily_entry_screen');

    // Track detailed screen context
    analyticsService.logEvent('daily_entry_screen_viewed', {
      entry_date: finalDateString,
      is_today: isToday,
      current_statements_count: statements.length,
      daily_goal: dailyGoal,
      progress_percentage: Math.round(progressPercentage),
      is_goal_complete: isGoalComplete,
      has_prompt: !!currentPrompt,
      user_id: profile?.id || null,
    });
  }, [
    finalDateString,
    isToday,
    statements.length,
    dailyGoal,
    progressPercentage,
    isGoalComplete,
    currentPrompt,
    profile?.id,
  ]);

  // **SIMPLE STATEMENT OPERATIONS**: Minimal animation feedback
  const handleAddStatement = useCallback(
    (statementText: string) => {
      try {
        gratitudeStatementSchema.parse(statementText);

        // Capture current state for contextual toasts
        const isFirstStatement = statements.length === 0;
        const newCount = statements.length + 1;
        const newPercentage = (newCount / dailyGoal) * 100;

        addStatement(
          { entryDate: finalDateString, statement: statementText },
          {
            onSuccess: () => {
              // 🚀 ENHANCED TOAST INTEGRATION: Contextual success feedback
              if (isFirstStatement) {
                showSuccess(`${isToday ? 'Günün' : 'Bu tarihin'} ilk minnettarlığı! Harika bir başlangıç ✨`);
                analyticsService.logEvent('first_statement_added', {
                  entry_date: finalDateString,
                  is_today: isToday,
                  daily_goal: dailyGoal,
                });
              } else if (newPercentage >= 80 && newPercentage < 100) {
                showSuccess('Hedefinize çok yaklaştınız! Devam edin 🎯');
                analyticsService.logEvent('progress_milestone_reached', {
                  entry_date: finalDateString,
                  new_count: newCount,
                  daily_goal: dailyGoal,
                  progress_percentage: Math.round(newPercentage),
                  milestone: '80_percent',
                });
              } else {
                showSuccess('Minnet ifadeniz eklendi! ✨');
                analyticsService.logEvent('statement_added', {
                  entry_date: finalDateString,
                  new_count: newCount,
                  daily_goal: dailyGoal,
                  progress_percentage: Math.round(newPercentage),
                });
              }
              
              // **MINIMAL FEEDBACK**: Simple layout transition instead of complex animation
              animations.animateLayoutTransition(true, 60, { duration: 200 });
              layoutTimerRef.current = setTimeout(() => {
                animations.animateLayoutTransition(false, 0, { duration: 200 });
              }, 1000);
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          // 🚀 TOAST INTEGRATION: Use toast error instead of inline error state
          showError(error.issues[0]?.message || 'Geçersiz minnet ifadesi');
          // Simple fade feedback for errors instead of shake
          animations.animateFade(0.7, { duration: 150 });
          fadeTimerRef.current = setTimeout(() => {
            animations.animateFade(1, { duration: 150 });
          }, 300);
        }
      }
    },
    [finalDateString, addStatement, showSuccess, showError, animations, statements.length, dailyGoal, isToday]
  );

  const handleEditStatement = useCallback((index: number) => {
    setEditingStatementIndex(index);
    // **MINIMAL EDITING STATE**: Simple layout transition
    animations.animateLayoutTransition(true, 100, { duration: 200 });
  }, [animations]);

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedStatement: string) => {
      try {
        gratitudeStatementSchema.parse(updatedStatement);

        await editStatement(
          { entryDate: finalDateString, statementIndex: index, updatedStatement },
          {
            onSuccess: () => {
              // **MINIMAL COMPLETION**: Simple layout transition
              animations.animateLayoutTransition(false, 0, { duration: 200 });
              setEditingStatementIndex(null);
              showSuccess('Minnet ifadesi güncellendi');
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          showError(error.issues[0]?.message || 'Geçersiz minnet ifadesi');
          // Simple fade feedback for errors
          animations.animateFade(0.7, { duration: 150 });
          animationTimerRef.current = setTimeout(() => {
            animations.animateFade(1, { duration: 150 });
          }, 300);
        }
      }
    },
    [finalDateString, editStatement, showSuccess, showError, animations]
  );

  const handleCancelEditing = useCallback(() => {
    setEditingStatementIndex(null);
    // **MINIMAL CANCEL**: Simple layout transition
    animations.animateLayoutTransition(false, 0, { duration: 200 });
  }, [animations]);

  const handleDeleteStatement = useCallback(
    (index: number) => {
      deleteStatement(
        { entryDate: finalDateString, statementIndex: index },
        {
          onSuccess: () => {
            // **MINIMAL DELETION FEEDBACK**: Simple layout transition
            animations.animateLayoutTransition(false, 0, { duration: 200 });
            showSuccess('Minnet ifadesi silindi');
          },
        }
      );
    },
    [finalDateString, deleteStatement, showSuccess, animations]
  );

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const handleRefresh = async () => {
    await refetchEntry();
  };

  const handlePromptRefresh = useCallback(() => {
    // Always allow refreshing prompts - for varied prompts, fetch new from API
    // For static prompts, the component will cycle through fallback prompts
    if (profile?.useVariedPrompts) {
      fetchNewPrompt();
    }
    // Note: For static prompts, refresh is handled within GratitudeInputBar component
  }, [fetchNewPrompt, profile?.useVariedPrompts]);

  // Date formatting
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 🛡️ ERROR PROTECTION: Render a full-screen error state if the main query fails
  if (entryError) {
    return (
      <ScreenLayout>
        <ErrorState
          error={entryError}
          title="Veriler Yüklenemedi"
          onRetry={refetchEntry}
          retryText="Tekrar Dene"
        />
      </ScreenLayout>
    );
  }

  return (
    <>
      <StatusBar barStyle="default" backgroundColor="transparent" translucent />

      <ScreenLayout
        edges={['top']}
        scrollable={true}
        density="compact"
        edgeToEdge={true}
        showsVerticalScrollIndicator={false}
        keyboardAware={true}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {/* **EDGE-TO-EDGE HERO SECTION**: Full-width hero with proper spacing */}
        <Animated.View
          style={[
            styles.edgeToEdgeHeroSection,
            {
              opacity: animations.fadeAnim,
              transform: animations.entranceTransform,
            },
          ]}
        >
          {/* Date Selection Header - Edge-to-edge */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.edgeToEdgeDateHeader}
            activeOpacity={0.8}
          >
            <View style={styles.dateHeaderContent}>
              <View style={styles.dateHeaderLeft}>
                <Icon name="calendar-today" size={24} color={theme.colors.primary} />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateText}>{formatDate(effectiveDate)}</Text>
                  <Text style={styles.dateSubtext}>{isToday ? 'Bugün' : 'Geçmiş tarih'}</Text>
                </View>
              </View>
              <View style={styles.dateHeaderRight}>
                <Icon name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Progress Section - Edge-to-edge with gradient background */}
          <View style={styles.edgeToEdgeProgressSection}>
            <View style={styles.progressContent}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Günlük İlerleme</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {statements.length}/{dailyGoal}
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPercentage}%`,
                        backgroundColor: isGoalComplete
                          ? theme.colors.success
                          : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentageText}>
                  {Math.round(progressPercentage)}% tamamlandı
                </Text>
              </View>

              {isGoalComplete && (
                <View style={styles.goalCompleteBadge}>
                  <Icon name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.goalCompleteText}>Harika! Günlük hedefiniz tamamlandı 🎉</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* **EDGE-TO-EDGE CONTENT SECTION**: All content with proper edge-to-edge design */}
        <Animated.View
          style={[
            styles.edgeToEdgeContentSection,
            {
              opacity: animations.fadeAnim,
              transform: animations.pressTransform,
            },
          ]}
        >
          {/* Gratitude Input Bar - Enhanced edge-to-edge */}
          <View style={styles.inputBarContainer}>
            <GratitudeInputBar
              promptText={profile?.useVariedPrompts ? currentPrompt : undefined}
              onSubmit={handleAddStatement}
              disabled={isAddingStatement}
              error={null}
              onRefreshPrompt={profile?.useVariedPrompts ? handlePromptRefresh : undefined}
              promptLoading={profile?.useVariedPrompts ? (promptLoading || isLoadingEntry) : false}
              promptError={profile?.useVariedPrompts ? (promptError?.message || null) : null}
              showPrompt={profile?.useVariedPrompts ?? false}
            />
          </View>

          {/* Statement Cards Section - Edge-to-edge layout */}
          {statements.length > 0 ? (
            <View style={styles.statementsSection}>
              <View style={styles.statementsSectionHeader}>
                <Text style={styles.statementsSectionTitle}>Bugünün Minnettarlıkları</Text>
                <View style={styles.statementsCounter}>
                  <Text style={styles.statementsCountText}>{statements.length}</Text>
                </View>
              </View>
              
              <View style={styles.statementsContainer}>
                {statements.map((statement, index) => (
                  <View key={`${finalDateString}-${index}`} style={styles.statementCardWrapper}>
                    <StatementEditCard
                      statement={statement}
                      date={effectiveDate.toISOString()}
                      isEditing={editingStatementIndex === index}
                      onEdit={() => handleEditStatement(index)}
                      onSave={(updatedStatement) => handleSaveEditedStatement(index, updatedStatement)}
                      onCancel={handleCancelEditing}
                      onDelete={() => handleDeleteStatement(index)}
                      isLoading={isEditingStatement || isDeletingStatement}
                      edgeToEdge={true}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* Empty State - Edge-to-edge design */
            <View style={styles.emptyStateSection}>
              <View style={styles.emptyStateContent}>
                <View style={styles.emptyStateIcon}>
                  <Icon name="heart-plus-outline" size={48} color={theme.colors.primary + '40'} />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {isToday ? 'Bugünün ilk minnettarlığını ekle' : 'Bu tarihte henüz bir giriş yok'}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {isToday 
                    ? 'Günün güzel anlarını ve minnettarlıklarını paylaş'
                    : 'Bu tarih için yeni minnettarlıklar ekleyebilirsin'
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Loading State - Improved design */}
          {isLoadingEntry && statements.length === 0 && (
            <View style={styles.loadingStateSection}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingStateText}>Günlük girişler yükleniyor...</Text>
            </View>
          )}
        </Animated.View>
      </ScreenLayout>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={effectiveDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // **EDGE-TO-EDGE HERO SECTION**: Full-width hero with proper spacing
    edgeToEdgeHeroSection: {
      marginBottom: theme.spacing.md,
    },
    edgeToEdgeDateHeader: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    dateHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    dateHeaderRight: {
      paddingLeft: theme.spacing.md,
    },
    dateTextContainer: {
      flex: 1,
    },
    dateText: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    dateSubtext: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },

    // **EDGE-TO-EDGE PROGRESS SECTION**: Full-width progress with gradient background
    edgeToEdgeProgressSection: {
      backgroundColor: theme.colors.primaryContainer + '20',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
    },
    progressContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    progressTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    progressBadge: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      minWidth: 32,
      alignItems: 'center',
    },
    progressBadgeText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
    },
    progressBarContainer: {
      marginBottom: theme.spacing.sm,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.outline + '20',
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      minWidth: 8,
    },
    progressPercentageText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500',
    },
    goalCompleteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.successContainer,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.sm,
    },
    goalCompleteText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSuccessContainer,
      fontWeight: '600',
    },

    // **EDGE-TO-EDGE CONTENT SECTION**: All content with proper edge-to-edge design
    edgeToEdgeContentSection: {
      flex: 1,
    },
    inputBarContainer: {
      marginBottom: theme.spacing.lg,
    },
    statementsSection: {
      flex: 1,
    },
    statementsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    statementsSectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    statementsCounter: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statementsCountText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
    },
    statementsContainer: {
      paddingVertical: theme.spacing.sm,
    },
    statementCardWrapper: {
      marginBottom: theme.spacing.sm,
    },

    // **EMPTY STATE SECTION**: Edge-to-edge empty state design
    emptyStateSection: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xxxl,
      justifyContent: 'center',
    },
    emptyStateContent: {
      alignItems: 'center',
      maxWidth: 320,
      alignSelf: 'center',
    },
    emptyStateIcon: {
      marginBottom: theme.spacing.lg,
      opacity: 0.6,
    },
    emptyStateTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontWeight: '600',
      lineHeight: 28,
    },
    emptyStateSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
    },

    // **LOADING STATE SECTION**: Edge-to-edge loading state design
    loadingStateSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xxxl,
    },
    loadingStateText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
      fontWeight: '500',
      textAlign: 'center',
    },

    // **LEGACY STYLES**: Maintained for compatibility (can be removed after testing)
    contentZone: {
      flex: 1,
    },
    contentSection: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
    },
    statementsList: {
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      margin: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    },
    loadingText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
      fontWeight: '500',
      textAlign: 'center',
    },
    sectionHeader: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    statementsContainer2: {
      paddingVertical: theme.spacing.sm,
    },
    statementWrapper: {
      position: 'relative',
    },
    editingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      ...getPrimaryShadow.card(theme),
    },
    editingContainer: {
      width: '100%',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.floating(theme),
    },
    heroSection: {
      marginBottom: theme.spacing.md,
    },
    heroCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.card(theme),
    },
    dateButton: {
      // Padding handled by density="comfortable"
    },
    dateSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    progressSection: {
      alignItems: 'center',
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    progressStats: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    progressCount: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    progressGoal: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    progressLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
      fontWeight: '500',
    },
    emptyStateContainer: {
      flex: 1,
      paddingVertical: theme.spacing.xl,
    },
    emptyStateCard: {
      borderRadius: 0,
      borderStyle: 'dashed',
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderTopColor: theme.colors.outline + '30',
      borderBottomColor: theme.colors.outline + '30',
      backgroundColor: theme.colors.surface,
      ...getPrimaryShadow.small(theme),
    },
    entryLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      margin: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    },
  });

export default EnhancedDailyEntryScreen;
