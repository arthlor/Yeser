import { RouteProp, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenLayout } from '@/shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ErrorState from '@/shared/components/ui/ErrorState';

import {
  useCurrentPrompt,
  useGratitudeEntry,
  useGratitudeMutations,
  usePromptMutations,
  usePromptText,
} from '../hooks';
import { useUserProfile } from '@/shared/hooks';
import { useLanguageStore } from '@/store/languageStore';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { useMoodEmoji } from '@/shared/hooks/useMoodEmoji';
import type { MoodEmoji } from '@/types/mood.types';
import { AppTheme } from '@/themes/types';
import { AppStackParamList, MainTabParamList } from '@/types/navigation';
import { analyticsService } from '@/services/analyticsService';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { logger } from '@/utils/logger';

import GratitudeInputBar, { GratitudeInputBarRef } from '../components/GratitudeInputBar';

import { hapticFeedback } from '@/utils/hapticFeedback';
import { useTranslation } from 'react-i18next';

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
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { theme } = useTheme();
  const { handleMutationError, showError } = useGlobalError();
  const { showSuccess } = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const initialDate = route?.params?.initialDate ? new Date(route.params.initialDate) : new Date();

  const effectiveDate = initialDate;
  const finalDateString = effectiveDate.toISOString().split('T')[0];

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
  const [showSaveHint, setShowSaveHint] = useState(false);

  // **INPUT BAR REF**: Reference to control input focus from empty state button
  const inputBarRef = useRef<GratitudeInputBarRef>(null);

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

  // 🔍 DEBUG: Log prompt data to identify Turkish prompt source
  const language = useLanguageStore((state) => state.language);
  const { data: rawCurrentPrompt } = useCurrentPrompt();

  React.useEffect(() => {
    logger.debug('Prompt debug', {
      component: 'DailyEntryScreen',
      language,
      currentPrompt,
      promptText: rawCurrentPrompt?.prompt_text,
      isLoading: promptLoading,
      error: promptError?.message,
    });

    if (language === 'en' && rawCurrentPrompt?.prompt_text) {
      logger.debug('English prompt check', {
        component: 'DailyEntryScreen',
        promptId: rawCurrentPrompt.id,
        promptText: rawCurrentPrompt.prompt_text,
        isEnglishText:
          rawCurrentPrompt.prompt_text.includes('you') ||
          rawCurrentPrompt.prompt_text.includes('what') ||
          rawCurrentPrompt.prompt_text.includes('how'),
        isTurkishText:
          rawCurrentPrompt.prompt_text.includes('bugün') ||
          rawCurrentPrompt.prompt_text.includes('ne') ||
          rawCurrentPrompt.prompt_text.includes('hangi'),
      });
    }
  }, [language, currentPrompt, rawCurrentPrompt, promptLoading, promptError]);

  // Computed values (after profile data is available)
  const statements = useMemo(() => currentEntry?.statements || [], [currentEntry?.statements]);
  // Newest-first display order
  const displayStatements = useMemo(() => {
    return [...statements].reverse();
  }, [statements]);
  const dailyGoal = daily_gratitude_goal || 3;
  const isToday = finalDateString === new Date().toISOString().split('T')[0];
  const progressPercentage = Math.min((statements.length / dailyGoal) * 100, 100);
  const isGoalComplete = statements.length >= dailyGoal;
  const wasGoalJustCompleted = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardPositionsRef = useRef<Record<number, number>>({});

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
      showSuccess(t('gratitude.success.goalCompleted'));
      hapticFeedback.success();

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
  }, [
    isGoalComplete,
    animations,
    showSuccess,
    t,
    finalDateString,
    isToday,
    statements.length,
    dailyGoal,
    profile?.id,
  ]);

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
    showSuccess,
  ]);

  // **SIMPLE STATEMENT OPERATIONS**: Minimal animation feedback
  const handleAddStatement = useCallback(
    (statementText: string, moodEmoji?: MoodEmoji | null) => {
      try {
        gratitudeStatementSchema.parse(statementText);

        // Capture current state for contextual toasts
        const isFirstStatement = statements.length === 0;
        const newCount = statements.length + 1;
        const newPercentage = (newCount / dailyGoal) * 100;

        addStatement(
          { entryDate: finalDateString, statement: statementText, moodEmoji: moodEmoji ?? null },
          {
            onSuccess: () => {
              // 🚀 ENHANCED TOAST INTEGRATION: Contextual success feedback
              hapticFeedback.medium();
              if (isFirstStatement) {
                showSuccess(
                  isToday
                    ? t('gratitude.success.firstEntryToday')
                    : t('gratitude.success.firstEntryThisDate')
                );
                analyticsService.logEvent('first_statement_added', {
                  entry_date: finalDateString,
                  is_today: isToday,
                  daily_goal: dailyGoal,
                });
              } else if (newPercentage >= 80 && newPercentage < 100) {
                showSuccess(t('gratitude.success.goalNearCompletion'));
                analyticsService.logEvent('progress_milestone_reached', {
                  entry_date: finalDateString,
                  new_count: newCount,
                  daily_goal: dailyGoal,
                  progress_percentage: Math.round(newPercentage),
                  milestone: '80_percent',
                });
              } else {
                showSuccess(t('gratitude.success.statementAdded'));
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
          showError(error.issues[0]?.message || t('gratitude.validation.invalidStatement'));
          hapticFeedback.warning();
          // Simple fade feedback for errors instead of shake
          animations.animateFade(0.7, { duration: 150 });
          fadeTimerRef.current = setTimeout(() => {
            animations.animateFade(1, { duration: 150 });
          }, 300);
        }
      }
    },
    [
      finalDateString,
      addStatement,
      showSuccess,
      showError,
      animations,
      t,
      statements.length,
      dailyGoal,
      isToday,
    ]
  );

  // Removed unused handleEditStatement to satisfy linter

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedStatement: string) => {
      // Find the original statement. Note the reverse order of displayStatements.
      const originalStatement = statements[statements.length - 1 - index];

      if (updatedStatement.trim() === originalStatement.trim()) {
        setShowSaveHint(true);
        return;
      }

      try {
        gratitudeStatementSchema.parse(updatedStatement);

        await editStatement(
          { entryDate: finalDateString, statementIndex: index, updatedStatement },
          {
            onSuccess: () => {
              // **MINIMAL COMPLETION**: Simple layout transition
              animations.animateLayoutTransition(false, 0, { duration: 200 });
              setEditingStatementIndex(null);
              setShowSaveHint(false); // Hide hint on successful save
              showSuccess(t('statement.updated'));
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          showError(error.issues[0]?.message || t('gratitude.validation.invalidStatement'));
          // Simple fade feedback for errors
          animations.animateFade(0.7, { duration: 150 });
          animationTimerRef.current = setTimeout(() => {
            animations.animateFade(1, { duration: 150 });
          }, 300);
        }
      }
    },
    [finalDateString, editStatement, showSuccess, showError, animations, t, statements]
  );

  const handleCancelEditing = useCallback(() => {
    setEditingStatementIndex(null);
    // **MINIMAL CANCEL**: Simple layout transition
    animations.animateLayoutTransition(false, 0, { duration: 200 });
  }, [animations]);

  const handleDeleteStatement = useCallback(
    (index: number) => {
      const deleted = statements[index];
      deleteStatement(
        { entryDate: finalDateString, statementIndex: index },
        {
          onSuccess: () => {
            // **MINIMAL DELETION FEEDBACK**: Simple layout transition
            animations.animateLayoutTransition(false, 0, { duration: 200 });
            showSuccess(t('statement.deleted'), {
              action: {
                label: t('statement.undoAction'),
                onPress: () => {
                  addStatement(
                    { entryDate: finalDateString, statement: deleted },
                    { onSuccess: () => showSuccess(t('statement.undoSuccess')) }
                  );
                },
              },
            });
          },
        }
      );
    },
    [finalDateString, deleteStatement, showSuccess, animations, addStatement, statements, t]
  );

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

  // 🛡️ ERROR PROTECTION: Render a full-screen error state if the main query fails
  if (entryError) {
    return (
      <ScreenLayout>
        <ErrorState
          error={entryError}
          title={t('gratitude.errors.dataLoadFailed')}
          onRetry={refetchEntry}
          retryText={t('common.retry')}
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
        scrollRef={scrollRef}
        density="compact"
        edgeToEdge={true}
        backgroundColor={theme.colors.surface}
        showsVerticalScrollIndicator={false}
        keyboardAware={true}
        keyboardVerticalOffset={0}
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
        {/* **EDGE-TO-EDGE HERO SECTION**: Built-in navigation header */}
        <Animated.View
          style={[
            styles.edgeToEdgeHeroSection,
            {
              opacity: animations.fadeAnim,
              transform: animations.entranceTransform,
            },
          ]}
        >
          {/* Enhanced Navigation Header - Beautiful Title Design */}
          <View style={styles.enhancedNavigationHeader}>
            <View style={styles.enhancedNavigationBackground} />
            <View style={styles.enhancedNavigationContent}>
              <View style={styles.titleContainer}>
                <View style={styles.titleIconContainer}>
                  <Icon name="book-open-page-variant" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.enhancedNavigationTitle}>
                    {t('home.actions.start.subtitle')}
                  </Text>
                  <Text style={styles.enhancedNavigationSubtitle}>
                    {isToday
                      ? t('home.inspiration.progress.start.message')
                      : t('throwback.teaser.placeholderSubtitle')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Progress Section - Edge-to-edge */}
          <View style={styles.edgeToEdgeProgressSection}>
            <View style={styles.progressContent}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  {t('home.inspiration.progress.progress.title')}
                </Text>
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
                <Text style={styles.progressPercentageText}>{Math.round(progressPercentage)}%</Text>
              </View>

              {isGoalComplete && (
                <View style={styles.goalCompleteBadge}>
                  <Icon name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={styles.goalCompleteText}>
                    {t('home.hero.goalComplete.secondary')}
                  </Text>
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
          {/* Gratitude Input Bar */}
          <View style={styles.inputBarContainer}>
            <GratitudeInputBar
              ref={inputBarRef}
              promptText={currentPrompt}
              onSubmit={handleAddStatement}
              onSubmitWithMood={(text, mood) => {
                handleAddStatement(text, mood ?? null);
              }}
              disabled={isAddingStatement}
              error={null}
              onRefreshPrompt={handlePromptRefresh}
              promptLoading={promptLoading || isLoadingEntry}
              promptError={promptError?.message || null}
              showPrompt={true}
              currentCount={statements.length}
              goal={dailyGoal}
            />
          </View>

          {/* Statement Cards Section - Unified design */}
          {statements.length > 0 ? (
            <View style={styles.unifiedStatementsSection}>
              {/* Integrated header within the same container */}
              <View style={styles.unifiedSectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionIconContainer}>
                    <Icon name="heart-multiple" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.modernSectionTitle}>
                    {t('gratitude.sections.todaysGratitudes')}
                  </Text>
                </View>
                <View style={styles.sectionCounterContainer}>
                  <Text style={styles.sectionCounterText}>{statements.length}</Text>
                </View>
              </View>

              {/* Statements directly in the same container (newest first) */}
              {displayStatements.map((statement, index) => (
                <View
                  key={`${finalDateString}-${index}-${statement.slice(0, 10)}`}
                  style={styles.modernStatementWrapper}
                  onLayout={(event) => {
                    cardPositionsRef.current[index] = event.nativeEvent.layout.y;
                  }}
                >
                  <DailyEntryStatementItem
                    index={index}
                    statement={statement}
                    entryDate={finalDateString}
                    dateIso={effectiveDate.toISOString()}
                    isEditing={editingStatementIndex === index}
                    isLoading={isEditingStatement || isDeletingStatement}
                    onEdit={() => {
                      // Force editing only in Entry Detail screen
                      navigation.navigate('EntryDetail', {
                        entryDate: finalDateString,
                        entryId: '',
                      });
                    }}
                    onSave={(updated) => handleSaveEditedStatement(index, updated)}
                    onCancel={handleCancelEditing}
                    onDelete={() => handleDeleteStatement(index)}
                    serverMood={
                      ((currentEntry?.moods as Record<string, string> | undefined)?.[
                        String(statements.length - 1 - index)
                      ] as MoodEmoji | undefined) ?? null
                    }
                    showSaveHint={editingStatementIndex === index && showSaveHint}
                  />
                </View>
              ))}
            </View>
          ) : (
            /* Enhanced Empty State - Modern design */
            <View style={styles.modernEmptyState}>
              <View style={styles.emptyStateContent}>
                <View style={styles.modernEmptyIcon}>
                  <Icon name="heart-plus-outline" size={56} color={theme.colors.primary + '30'} />
                </View>
                <Text style={styles.modernEmptyTitle}>
                  {isToday ? t('home.actions.start.title') : t('pastEntries.empty.title')}
                </Text>
                <Text style={styles.modernEmptySubtitle}>
                  {isToday
                    ? t('home.inspiration.progress.start.message')
                    : t('throwback.teaser.placeholderHint')}
                </Text>
                {isToday && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => {
                      // **FIXED**: Actually focus the input using the ref
                      if (inputBarRef.current) {
                        inputBarRef.current.focus();
                        // Track the action for analytics
                        analyticsService.logEvent('empty_state_button_pressed', {
                          entry_date: finalDateString,
                          is_today: isToday,
                        });
                      }
                    }}
                    activeOpacity={0.8}
                    // **ACCESSIBILITY IMPROVEMENTS**
                    accessibilityRole="button"
                    accessibilityLabel={t('gratitude.input.a11y.addFirstGratitude')}
                    accessibilityHint={t('gratitude.input.a11y.addFirstGratitudeHint')}
                  >
                    <Icon name="plus" size={18} color={theme.colors.onPrimary} />
                    <Text style={styles.emptyStateButtonText}>
                      {t('gratitude.input.a11y.addFirstGratitude')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Loading State - Improved design */}
          {isLoadingEntry && statements.length === 0 && (
            <View style={styles.loadingStateSection}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingStateText}>
                {t('shared.layout.screenContent.loading')}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScreenLayout>
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // **EDGE-TO-EDGE HERO SECTION**: Full-width hero with built-in navigation
    edgeToEdgeHeroSection: {
      marginBottom: theme.spacing.md,
    },
    builtInNavigationHeader: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '20',
    },
    enhancedNavigationHeader: {
      position: 'relative',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      overflow: 'hidden',
    },
    enhancedNavigationBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // Subtle tinted backdrop instead of invalid gradient string
      backgroundColor: theme.colors.primaryContainer + '0D',
    },
    enhancedNavigationContent: {
      position: 'relative',
      zIndex: 1,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    titleIconContainer: {
      backgroundColor: theme.colors.primaryContainer + '20',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    titleTextContainer: {
      flex: 1,
      alignItems: 'center',
    },
    enhancedNavigationTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 2,
      fontFamily: 'Lora-Bold',
    },
    enhancedNavigationSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '500',
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
      letterSpacing: 0.1,
      fontStyle: 'italic',
    },
    navigationContent: {
      alignItems: 'center',
    },
    navigationTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onBackground,
      fontWeight: '600',
    },

    // **EDGE-TO-EDGE PROGRESS SECTION**: More compact progress section
    edgeToEdgeProgressSection: {
      backgroundColor: theme.colors.primaryContainer + '10',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '12',
    },
    progressContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm, // Reduced from lg
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm, // Reduced from md
    },
    progressTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      fontSize: 16, // Reduced
    },
    progressBadge: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      minWidth: 26,
      alignItems: 'center',
    },
    progressBadgeText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
      fontSize: 12, // Reduced
    },
    progressBarContainer: {
      marginBottom: theme.spacing.xs,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outline + '12',
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
      minWidth: 4,
    },
    progressPercentageText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500',
      fontSize: 12, // Reduced
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
      marginBottom: theme.spacing.md,
    },
    statementsSection: {
      flex: 1,
    },
    unifiedStatementsSection: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '12',
    },
    unifiedSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '10',
    },
    modernSectionHeader: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
    },
    sectionHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    sectionIconContainer: {
      backgroundColor: theme.colors.primaryContainer,
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
    },
    modernSectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    sectionCounterContainer: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionCounterText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
    },
    modernStatementsContainer: {
      paddingVertical: theme.spacing.xs, // Reduced from sm
    },
    modernStatementWrapper: {
      marginBottom: theme.spacing.sm,
      position: 'relative',
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '10',
    },
    modernEmptyState: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    emptyStateContent: {
      alignItems: 'center',
      maxWidth: 320,
      alignSelf: 'center',
    },
    modernEmptyIcon: {
      marginBottom: theme.spacing.lg,
      opacity: 0.6,
    },
    modernEmptyTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontWeight: '600',
      lineHeight: 28,
    },
    modernEmptySubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
    },
    emptyStateButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.onPrimary + '10',
    },
    emptyStateButtonText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onPrimary,
      fontWeight: '600',
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
    headerStyle: {
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '20',
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
    // removed: gradient border now built into StatementEditCard
  });

export default EnhancedDailyEntryScreen;
// Local component to satisfy hooks rules for mood per item
const DailyEntryStatementItemDisplayName = 'DailyEntryStatementItem';
const DailyEntryStatementItem: React.FC<{
  index: number;
  statement: string;
  entryDate: string;
  dateIso: string;
  isEditing: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (updated: string) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
  serverMood?: MoodEmoji | null;
  showSaveHint?: boolean;
}> = React.memo(
  ({
    index,
    statement,
    entryDate,
    dateIso,
    isEditing,
    isLoading,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    serverMood,
    showSaveHint,
  }) => {
    const { moodEmoji, setMoodEmoji } = useMoodEmoji({ entryDate, index });
    const { setStatementMood } = useGratitudeMutations();

    // Initialize local mood from server when available
    useEffect(() => {
      if (serverMood !== null && serverMood !== undefined && serverMood !== moodEmoji) {
        void setMoodEmoji(serverMood);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverMood]);

    const handleChangeMood = (mood: MoodEmoji | null) => {
      setMoodEmoji(mood); // instant local UX
      // persist on server
      setStatementMood({ entryDate, statementIndex: index, moodEmoji: mood });
      if (mood) {
        analyticsService.logEvent('mood_selected', { entry_date: entryDate, index, emoji: mood });
      } else {
        analyticsService.logEvent('mood_cleared', { entry_date: entryDate, index });
      }
    };

    return (
      <StatementEditCard
        statement={statement}
        date={dateIso}
        isEditing={isEditing}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        isLoading={isLoading}
        edgeToEdge={true}
        variant="primary"
        showQuotes={true}
        animateEntrance={true}
        moodEmoji={moodEmoji}
        onChangeMood={handleChangeMood}
        showSaveHint={showSaveHint}
      />
    );
  }
);
DailyEntryStatementItem.displayName = DailyEntryStatementItemDisplayName;
