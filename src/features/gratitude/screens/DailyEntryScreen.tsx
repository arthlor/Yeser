import { RouteProp, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenLayout } from '@/shared/components/layout';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MascotImage from '@/assets/assets/mascot1.png';
import ErrorState from '@/shared/components/ui/ErrorState';

import {
  useAttachmentMutations,
  useCurrentPrompt,
  useGratitudeEntry,
  useGratitudeMutations,
  usePromptMutations,
  usePromptText,
} from '../hooks';
import AttachmentRail from '../components/AttachmentRail';
import type { PendingAttachments } from '../components/GratitudeInputBar';
import type { Attachment } from '@/schemas/gratitudeEntrySchema';
import { MAX_ATTACHMENTS_PER_DAY_PER_KIND } from '../mediaApi';
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
import InsightTeaserCard from '@/features/mood/components/InsightTeaserCard';
import { useLatestMoodInsight, useMoodInsights } from '@/features/mood/hooks';

import GratitudeInputBar, { GratitudeInputBarRef } from '../components/GratitudeInputBar';
import { AICoachPrompt } from '@/shared/components/ui/AICoachPrompt';
import { AIChatModal } from '@/shared/components/ui/AIChatModal';

import { hapticFeedback } from '@/utils/hapticFeedback';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { enUS, es, tr } from 'date-fns/locale';
import { getStaticDefaultPrompt } from '@/features/gratitude/hooks/usePrompts';

type DailyEntryScreenRouteProp = RouteProp<MainTabParamList, 'DailyEntryTab'>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

const LAST_INSIGHT_TEASER_KEY = 'lastInsightTeaserShownAt';

const getInsightTeaserDayStamp = () => new Date().toISOString().split('T')[0];

const wasInsightTeaserShownToday = async (): Promise<boolean> => {
  const storedDay = await AsyncStorage.getItem(LAST_INSIGHT_TEASER_KEY);
  return storedDay === getInsightTeaserDayStamp();
};

const markInsightTeaserShownToday = async (): Promise<void> => {
  await AsyncStorage.setItem(LAST_INSIGHT_TEASER_KEY, getInsightTeaserDayStamp());
};

/**
 * Enhanced Daily Entry Screen - Redesigned
 *
 * Design Goals:
 * - "Very smooth, contrasted": High contrast surfaces, fluid animations.
 * - Premium feel: Large typography, clean spacing.
 * - Focus on Input: The input bar is the hero.
 */
const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { theme } = useTheme();
  const { handleMutationError, showError } = useGlobalError();
  const { showSuccess, showWarning } = useToast();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const initialDate = route?.params?.initialDate ? new Date(route.params.initialDate) : new Date();

  const effectiveDate = initialDate;
  const finalDateString = effectiveDate.toISOString().split('T')[0];
  const isToday = finalDateString === new Date().toISOString().split('T')[0];

  const { canAccessPastEntries, canAddDailyEntry, checkGate, isPro } = useSubscription();
  const {
    hasEnoughData: hasEnoughInsightData,
    isFresh: hasFreshInsight,
    isLoading: isLatestInsightLoading,
  } = useLatestMoodInsight('30d');
  const { refetch: generateInsight, isRefetching: isGeneratingInsight } = useMoodInsights('30d');

  // **PAST DATE INJECTION PROTECTION**
  useEffect(() => {
    if (!isToday && !canAccessPastEntries()) {
      checkGate('past_entry_injection_prevention');
      navigation.goBack();
    }
  }, [isToday, canAccessPastEntries, checkGate, navigation]);

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

  const { uploadImage, uploadAudio, deleteAttachment: removeAttachment } = useAttachmentMutations();

  const { profile } = useUserProfile();

  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);
  const [showSaveHint, setShowSaveHint] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isInsightTeaserVisible, setIsInsightTeaserVisible] = useState(false);
  const [pendingInsightTeaserCheck, setPendingInsightTeaserCheck] = useState(false);

  const inputBarRef = useRef<GratitudeInputBarRef>(null);

  const { fetchNewPrompt } = usePromptMutations();

  const { daily_gratitude_goal } = profile || {};
  const wantsVariedPrompts =
    isPro && (profile?.useVariedPrompts ?? profile?.use_varied_prompts ?? true);
  const canUseVariedPrompts = wantsVariedPrompts;
  const showInspirationPrompts = wantsVariedPrompts;

  const animations = useCoordinatedAnimations();

  const {
    promptText: currentPrompt,
    isLoading: promptLoading,
    error: promptError,
  } = usePromptText();

  const language = useLanguageStore((state) => state.language);
  const { data: rawCurrentPrompt } = useCurrentPrompt();

  // Prompt debugging logic (kept from original)
  React.useEffect(() => {
    if ((language === 'en' || language === 'es') && rawCurrentPrompt?.prompt_text) {
      // Debug logic preserved
    }
  }, [language, currentPrompt, rawCurrentPrompt]);

  const statements = useMemo(() => currentEntry?.statements || [], [currentEntry?.statements]);
  const displayStatements = useMemo(() => [...statements].reverse(), [statements]);

  const attachments = useMemo(
    () => (currentEntry?.attachments as Attachment[] | undefined) ?? [],
    [currentEntry?.attachments]
  );
  const imageAttachmentsRemaining = useMemo(
    () =>
      Math.max(
        0,
        MAX_ATTACHMENTS_PER_DAY_PER_KIND - attachments.filter((a) => a.kind === 'image').length
      ),
    [attachments]
  );
  const audioAttachmentsRemaining = useMemo(
    () =>
      Math.max(
        0,
        MAX_ATTACHMENTS_PER_DAY_PER_KIND - attachments.filter((a) => a.kind === 'audio').length
      ),
    [attachments]
  );
  const dailyGoal = daily_gratitude_goal || 3;
  const isGoalComplete = statements.length >= dailyGoal;
  const wasGoalJustCompleted = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Timer Refs
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animationTimer = animationTimerRef.current;
    const fadeTimer = fadeTimerRef.current;
    const layoutTimer = layoutTimerRef.current;
    return () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
      }
      if (fadeTimer) {
        clearTimeout(fadeTimer);
      }
      if (layoutTimer) {
        clearTimeout(layoutTimer);
      }
    };
  }, []);

  useEffect(() => {
    animations.animateEntrance({ duration: 600 }); // Slower, smoother entrance
  }, [animations]);

  useEffect(() => {
    if (statements.length > 0) {
      animations.animateFade(1, { duration: 300 });
    }
  }, [statements.length, animations]);

  // Goal Completion Effect
  useEffect(() => {
    if (isGoalComplete && !wasGoalJustCompleted.current) {
      wasGoalJustCompleted.current = true;
      showSuccess(t('gratitude.success.goalCompleted'));
      hapticFeedback.success();

      analyticsService.logEvent('daily_goal_completed', {
        entry_date: finalDateString,
        is_today: isToday,
        statements_count: statements.length,
        daily_goal: dailyGoal,
        user_id: profile?.id || null,
      });

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

  // Error Handling Effects
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

  useEffect(() => {
    analyticsService.logScreenView('daily_entry_screen');
    analyticsService.logEvent('daily_entry_screen_viewed', {
      entry_date: finalDateString,
      is_today: isToday,
      current_statements_count: statements.length,
    });
  }, [finalDateString, isToday, statements.length]);

  useEffect(() => {
    if (hasFreshInsight) {
      setIsInsightTeaserVisible(false);
    }
  }, [hasFreshInsight]);

  useEffect(() => {
    if (!pendingInsightTeaserCheck || !isToday || isLatestInsightLoading) {
      return;
    }

    let isMounted = true;

    const maybeShowTeaser = async () => {
      try {
        const shownToday = await wasInsightTeaserShownToday();

        if (!isMounted) {
          return;
        }

        if (!shownToday && hasEnoughInsightData && !hasFreshInsight) {
          setIsInsightTeaserVisible(true);
          await markInsightTeaserShownToday();
          analyticsService.logEvent('insight_teaser_shown', {
            source: 'daily_entry_success',
            isPro,
          });
        }
      } finally {
        if (isMounted) {
          setPendingInsightTeaserCheck(false);
        }
      }
    };

    void maybeShowTeaser();

    return () => {
      isMounted = false;
    };
  }, [
    hasEnoughInsightData,
    hasFreshInsight,
    isLatestInsightLoading,
    isPro,
    isToday,
    pendingInsightTeaserCheck,
  ]);

  const handleAddStatement = useCallback(
    (statementText: string, moodEmoji?: MoodEmoji | null): boolean => {
      try {
        if (!canAddDailyEntry(statements.length, isToday)) {
          checkGate('daily_limit');
          // Return false so GratitudeInputBar preserves the typed draft
          // instead of wiping it when the paywall is shown.
          return false;
        }

        gratitudeStatementSchema.parse(statementText);

        const isFirstStatement = statements.length === 0;
        const newCount = statements.length + 1;
        const newPercentage = (newCount / dailyGoal) * 100;

        addStatement(
          { entryDate: finalDateString, statement: statementText, moodEmoji: moodEmoji ?? null },
          {
            onSuccess: () => {
              hapticFeedback.medium();
              if (isFirstStatement) {
                showSuccess(
                  isToday
                    ? t('gratitude.success.firstEntryToday')
                    : t('gratitude.success.firstEntryThisDate')
                );
              } else if (newPercentage >= 80 && newPercentage < 100) {
                showSuccess(t('gratitude.success.goalNearCompletion'));
              } else {
                showSuccess(t('gratitude.success.statementAdded'));
              }

              animations.animateLayoutTransition(true, 100, { duration: 300 });
              layoutTimerRef.current = setTimeout(() => {
                animations.animateLayoutTransition(false, 0, { duration: 200 });
              }, 1000);

              if (isToday) {
                setPendingInsightTeaserCheck(true);
              }
            },
          }
        );
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          showError(error.issues[0]?.message || t('gratitude.validation.invalidStatement'));
          hapticFeedback.warning();
        }
        return false;
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
      canAddDailyEntry,
      checkGate,
      setPendingInsightTeaserCheck,
    ]
  );

  const handleAddStatementWithAttachments = useCallback(
    (
      statementText: string,
      moodEmoji: MoodEmoji | null,
      attachments: PendingAttachments
    ): boolean => {
      try {
        if (!canAddDailyEntry(statements.length, isToday)) {
          checkGate('daily_limit');
          return false;
        }
        gratitudeStatementSchema.parse(statementText);

        const newStatementIndex = statements.length; // server appends

        addStatement(
          { entryDate: finalDateString, statement: statementText, moodEmoji },
          {
            onSuccess: async () => {
              hapticFeedback.medium();
              try {
                if (attachments.image) {
                  await uploadImage({
                    entryDate: finalDateString,
                    statementIndex: newStatementIndex,
                    uri: attachments.image.uri,
                    mimeType: attachments.image.mimeType,
                    bytes: attachments.image.bytes,
                    width: attachments.image.width,
                    height: attachments.image.height,
                  });
                }
                if (attachments.audio) {
                  await uploadAudio({
                    entryDate: finalDateString,
                    statementIndex: newStatementIndex,
                    uri: attachments.audio.uri,
                    mimeType: attachments.audio.mimeType,
                    bytes: attachments.audio.bytes,
                    durationMs: attachments.audio.durationMs,
                  });
                }
                showSuccess(t('gratitude.success.statementAdded'));
              } catch (err) {
                showError((err as Error).message || t('shared.error'));
              }

              if (isToday) {
                setPendingInsightTeaserCheck(true);
              }
            },
          }
        );
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          showError(error.issues[0]?.message || t('gratitude.validation.invalidStatement'));
          hapticFeedback.warning();
        }
        return false;
      }
    },
    [
      addStatement,
      canAddDailyEntry,
      checkGate,
      finalDateString,
      isToday,
      showError,
      showSuccess,
      statements.length,
      t,
      uploadAudio,
      uploadImage,
    ]
  );

  const handleRemoveAttachment = useCallback(
    (attachment: Attachment) => {
      void removeAttachment({
        entryDate: finalDateString,
        attachmentId: attachment.id,
      });
    },
    [finalDateString, removeAttachment]
  );

  const handleDismissInsightTeaser = useCallback(() => {
    setIsInsightTeaserVisible(false);
    analyticsService.logEvent('insight_teaser_dismissed', {
      source: 'daily_entry_teaser',
      isPro,
    });
  }, [isPro]);

  const handleInsightTeaserPress = useCallback(async () => {
    analyticsService.logEvent('insight_reveal_requested', {
      source: 'daily_entry_teaser',
      range: '30d',
    });

    const result = await generateInsight();

    if (result.error) {
      handleMutationError(result.error, t('mood.analysis.errors.revealFailed'));
      return;
    }

    setIsInsightTeaserVisible(false);
    navigation.navigate('MoodAnalysis', {
      initialRange: '30d',
      source: 'daily_entry_teaser',
    });
  }, [generateInsight, handleMutationError, navigation, t]);

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedStatement: string, updatedMood?: MoodEmoji | null) => {
      const originalStatement = statements[statements.length - 1 - index];
      const originalMood = (currentEntry?.moods as Record<string, string> | undefined)?.[
        String(statements.length - 1 - index)
      ] as MoodEmoji | undefined;
      let finalMood = updatedMood ?? null;

      if (!isPro && finalMood !== (originalMood ?? null)) {
        checkGate('mood_editing');
        finalMood = originalMood ?? null;
      }

      try {
        gratitudeStatementSchema.parse(updatedStatement);

        if (
          updatedStatement.trim() === originalStatement.trim() &&
          finalMood === (originalMood ?? null)
        ) {
          animations.animateLayoutTransition(false, 0, { duration: 200 });
          setEditingStatementIndex(null);
          setShowSaveHint(false);
          return;
        }

        await editStatement(
          {
            entryDate: finalDateString,
            statementIndex: index,
            updatedStatement,
            moodEmoji: finalMood,
          },
          {
            onSuccess: () => {
              animations.animateLayoutTransition(false, 0, { duration: 200 });
              setEditingStatementIndex(null);
              setShowSaveHint(false);
              showSuccess(t('shared.statement.updated'));
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          showError(error.issues[0]?.message || t('gratitude.validation.invalidStatement'));
        }
      }
    },
    [
      finalDateString,
      editStatement,
      showSuccess,
      showError,
      animations,
      t,
      statements,
      currentEntry?.moods,
      isPro,
      checkGate,
    ]
  );

  const handleCancelEditing = useCallback(() => {
    setEditingStatementIndex(null);
    animations.animateLayoutTransition(false, 0, { duration: 200 });
  }, [animations]);

  const handleDeleteStatement = useCallback(
    (index: number) => {
      const deleted = statements[index];
      deleteStatement(
        { entryDate: finalDateString, statementIndex: index },
        {
          onSuccess: () => {
            animations.animateLayoutTransition(false, 0, { duration: 200 });
            showSuccess(t('shared.statement.deleted'), {
              action: {
                label: t('shared.statement.undoAction'),
                onPress: () => {
                  addStatement(
                    { entryDate: finalDateString, statement: deleted },
                    { onSuccess: () => showSuccess(t('shared.statement.undoSuccess')) }
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

  const effectivePromptText = canUseVariedPrompts
    ? currentPrompt
    : getStaticDefaultPrompt(language === 'tr' ? 'tr' : language === 'es' ? 'es' : 'en');
  const effectivePromptLoading = canUseVariedPrompts ? promptLoading : false;
  const effectivePromptError = canUseVariedPrompts ? promptError?.message || null : null;

  const handlePromptRefresh = useCallback(() => {
    if (!canUseVariedPrompts) {
      checkGate('varied_prompts');
      return;
    }
    fetchNewPrompt();
  }, [canUseVariedPrompts, checkGate, fetchNewPrompt]);

  const getDateLocale = () => {
    switch (language) {
      case 'tr':
        return tr;
      case 'es':
        return es;
      default:
        return enUS;
    }
  };

  const showLimitInfo = useCallback(() => {
    Alert.alert(
      t('gratitude.limits.title', 'Daily Limit'),
      t(
        'gratitude.limits.message',
        'On the free plan, you can only add 1 gratitude per day. Upgrade to Premium for unlimited entries.'
      ),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('gratitude.limits.goPro', 'Go Premium'),
          onPress: () => checkGate('limit_info_icon'),
        },
      ]
    );
  }, [t, checkGate]);

  const handleChatFabPress = useCallback(() => {
    if (isPro) {
      setShowAIChat(true);
      return;
    }
    checkGate('ai_chat');
  }, [isPro, checkGate]);

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

  // Header Title Logic
  const formattedDate = format(effectiveDate, 'EEEE, d MMMM', { locale: getDateLocale() });
  const getDynamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return t('home.headline.greeting.morning', { defaultValue: 'Good Morning' });
    }
    if (hour < 18) {
      return t('home.headline.greeting.afternoon', { defaultValue: 'Good Afternoon' });
    }
    return t('home.headline.greeting.evening', { defaultValue: 'Good Evening' });
  };

  const greeting = isToday
    ? getDynamicGreeting()
    : format(effectiveDate, 'MMMM yyyy', { locale: getDateLocale() });

  const getDynamicSubtitle = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return t(
        'home.inspiration.progress.start.message',
        'Make a beautiful start by writing your first gratitude for today.'
      );
    }
    if (hour < 18) {
      return t(
        'home.inspiration.progress.start.message_afternoon',
        'Add a touch of gratitude to your afternoon.'
      );
    }
    return t('home.inspiration.progress.start.message_evening', 'End your day on a peaceful note.');
  };

  const subtitle = isToday ? getDynamicSubtitle() : t('throwback.teaser.subtitle');

  return (
    <>
      <StatusBar barStyle="default" backgroundColor="transparent" translucent />

      <ScreenLayout
        edges={['top']}
        scrollable={true}
        scrollRef={scrollRef}
        density="comfortable"
        edgeToEdge={true}
        backgroundColor={theme.colors.background}
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
        <Animated.View
          style={[
            styles.container,
            {
              opacity: animations.fadeAnim,
              transform: animations.entranceTransform,
            },
          ]}
        >
          {/* HEADER SECTION */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerDate}>{formattedDate.toUpperCase()}</Text>
              <Text style={styles.headerTitle}>{greeting}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>

            <View style={styles.mascotContainer}>
              <Image
                source={MascotImage}
                style={styles.mascotImage}
                contentFit="contain"
                transition={400}
              />
            </View>
          </View>

          {/* INPUT SECTION */}
          <View style={styles.inputSection}>
            <GratitudeInputBar
              ref={inputBarRef}
              promptText={effectivePromptText}
              onSubmit={handleAddStatement}
              onSubmitWithMood={(text, mood) => handleAddStatement(text, mood ?? null)}
              onSubmitWithAttachments={handleAddStatementWithAttachments}
              onLockedVoicePress={() => checkGate('voice_attachment')}
              onLockedImagePress={() => checkGate('image_attachment')}
              imageAttachmentsRemaining={imageAttachmentsRemaining}
              audioAttachmentsRemaining={audioAttachmentsRemaining}
              onAttachmentLimitReached={(kind) => {
                showWarning(
                  kind === 'image'
                    ? t(
                        'gratitude.input.attach.imageLimitReachedToast',
                        'You’ve reached the daily limit of {{max}} images.',
                        { max: MAX_ATTACHMENTS_PER_DAY_PER_KIND }
                      )
                    : t(
                        'gratitude.input.attach.voiceLimitReachedToast',
                        'You’ve reached the daily limit of {{max}} voice notes.',
                        { max: MAX_ATTACHMENTS_PER_DAY_PER_KIND }
                      )
                );
              }}
              disabled={isAddingStatement}
              error={null}
              onRefreshPrompt={handlePromptRefresh}
              promptLoading={effectivePromptLoading || isLoadingEntry}
              promptError={effectivePromptError}
              showPrompt={showInspirationPrompts}
              currentCount={statements.length} // Pass to input bar for visual feedback
              goal={dailyGoal}
            />
          </View>

          {isInsightTeaserVisible ? (
            <View style={styles.insightTeaserSection}>
              <InsightTeaserCard
                title={t('mood.analysis.teaser.title')}
                description={t('mood.analysis.teaser.description')}
                promise={t('mood.analysis.promise')}
                ctaLabel={t('mood.analysis.home.cta.reveal')}
                onPress={() => void handleInsightTeaserPress()}
                emoji="✨"
                isLoading={isGeneratingInsight}
                lockedLabel={!isPro ? t('mood.analysis.home.previewBadge') : null}
                onDismiss={handleDismissInsightTeaser}
              />
            </View>
          ) : null}

          {/* AI COACH PROMPT (PRO only, today only) */}
          {isToday && (
            <View style={styles.coachSection}>
              <AICoachPrompt
                recentEntries={statements.slice(0, 5)}
                onSelectPrompt={(_prompt) => {
                  inputBarRef.current?.focus();
                  // The prompt will be shown as a hint
                }}
              />
            </View>
          )}

          {/* STATEMENTS LIST SECTION */}
          <View style={styles.listSection}>
            {statements.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  {t('gratitude.sections.todaysGratitudes', 'Your Gratitudes')}
                </Text>
                {!isPro && (
                  <TouchableOpacity
                    onPress={showLimitInfo}
                    style={styles.infoButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name="help-circle-outline"
                      size={18}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.lineDivider} />
              </View>
            )}

            {displayStatements.map((statement, index) => {
              const originalIndex = statements.length - 1 - index;
              const rawAttachments = (currentEntry?.attachments as Attachment[] | undefined) ?? [];
              const statementAttachments = rawAttachments.filter(
                (a) => a.statement_index === originalIndex
              );
              return (
                <View
                  key={`${finalDateString}-${index}-${statement.slice(0, 10)}`}
                  style={styles.statementWrapper}
                >
                  <DailyEntryStatementItem
                    index={index}
                    statement={statement}
                    entryDate={finalDateString}
                    dateIso={effectiveDate.toISOString()}
                    isEditing={editingStatementIndex === index}
                    isLoading={isEditingStatement || isDeletingStatement}
                    onEdit={() => {
                      navigation.navigate('EntryDetail', {
                        entryDate: finalDateString,
                        entryId: '',
                      });
                    }}
                    onSave={(updated, mood) => handleSaveEditedStatement(index, updated, mood)}
                    onCancel={handleCancelEditing}
                    onDelete={() => handleDeleteStatement(index)}
                    serverMood={
                      ((currentEntry?.moods as Record<string, string> | undefined)?.[
                        String(statements.length - 1 - index)
                      ] as MoodEmoji | undefined) ?? null
                    }
                    showSaveHint={editingStatementIndex === index && showSaveHint}
                    theme={theme}
                    canEditMood={isPro}
                    onLockedMoodEdit={() => checkGate('mood_editing')}
                  />
                  {statementAttachments.length > 0 ? (
                    <AttachmentRail
                      attachments={statementAttachments}
                      onRemove={handleRemoveAttachment}
                      compact
                    />
                  ) : null}
                </View>
              );
            })}

            {statements.length === 0 && !isLoadingEntry && (
              <View style={styles.emptyContainer}>
                <Icon name="feather" size={32} color={theme.colors.onSurfaceVariant + '40'} />
                <Text style={styles.emptyText}>
                  {isToday
                    ? t('gratitude.empty.today', 'Your gratitude journal is waiting.')
                    : t('gratitude.empty.past', 'No entries for this day.')}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScreenLayout>

      {/* AI Chat FAB (today only) */}
      {isToday && (
        <TouchableOpacity
          style={[styles.chatFab, !isPro && styles.chatFabLocked]}
          onPress={handleChatFabPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isPro
              ? t('ai.chat.title', 'AI Chat')
              : t('subscription.locked.aiChat.title', 'Unlock AI Chat')
          }
          accessibilityHint={
            isPro
              ? t('ai.chat.openHint', 'Open your AI chat companion')
              : t('subscription.locked.aiChat.cta', 'Go Premium')
          }
        >
          {!isPro && <View style={styles.chatFabRing} pointerEvents="none" />}
          <View style={[styles.chatFabInner, !isPro && styles.chatFabInnerLocked]}>
            <Icon
              name="chat-processing-outline"
              size={22}
              color={isPro ? theme.colors.onPrimary : theme.colors.primary}
            />
          </View>
          {!isPro && (
            <View style={styles.chatFabBadge}>
              <Icon name="lock" size={11} color={theme.colors.onPrimary} />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* AI Chat Modal */}
      <AIChatModal
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        recentEntries={statements.slice(0, 5)}
      />
    </>
  );
};

// Local component wrapper
const DailyEntryStatementItem = React.memo<{
  index: number;
  statement: string;
  entryDate: string;
  dateIso: string;
  isEditing: boolean;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (updated: string, mood?: MoodEmoji | null) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
  serverMood?: MoodEmoji | null;
  showSaveHint?: boolean;
  canEditMood: boolean;
  onLockedMoodEdit: () => void;
  theme: AppTheme;
}>(
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
    canEditMood,
    onLockedMoodEdit,
    theme: _theme,
  }) => {
    const { moodEmoji, setMoodEmoji } = useMoodEmoji({ entryDate, index });
    const { setStatementMood } = useGratitudeMutations();

    useEffect(() => {
      if (serverMood !== null && serverMood !== undefined && serverMood !== moodEmoji) {
        void setMoodEmoji(serverMood);
      }
    }, [serverMood, moodEmoji, setMoodEmoji]);

    const handleChangeMood = (mood: MoodEmoji | null) => {
      if (!canEditMood) {
        onLockedMoodEdit();
        return;
      }
      setMoodEmoji(mood);
      setStatementMood({ entryDate, statementIndex: index, moodEmoji: mood });
      if (mood) {
        analyticsService.logEvent('mood_selected', { entry_date: entryDate, index, emoji: mood });
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
DailyEntryStatementItem.displayName = 'DailyEntryStatementItem';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl + 10,
      paddingBottom: theme.spacing.md,
      position: 'relative', // Ensure absolute child is relative to header
    },
    headerContent: {
      flex: 1,
      paddingRight: 110,
    },
    headerDate: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    headerTitle: {
      ...theme.typography.displaySmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      marginBottom: 8,
      fontFamily: 'Lora-Bold',
    },
    headerSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 22,
    },
    progressRingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 8,
    },
    progressRing: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '40',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
    },
    progressText: {
      ...theme.typography.labelMedium,
      fontWeight: '700',
      color: theme.colors.onSurface,
    },
    mascotContainer: {
      position: 'absolute',
      right: -20,
      top: 5,
      width: 180,
      height: 180,
      zIndex: 0,
      opacity: 0.8,
    },
    mascotImage: {
      width: '100%',
      height: '100%',
    },
    inputSection: {
      paddingHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.md,
    },
    insightTeaserSection: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    coachSection: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    listSection: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    },
    listTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      marginRight: theme.spacing.md,
    },
    lineDivider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outline + '20',
    },
    statementWrapper: {
      marginBottom: theme.spacing.sm,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    emptyText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant + '80',
      fontStyle: 'italic',
    },
    infoButton: {
      marginRight: 8,
      justifyContent: 'center',
    },
    chatFab: {
      position: 'absolute',
      bottom: 24, // Optimized position
      right: theme.spacing.lg,
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    chatFabLocked: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary + '80',
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
    },
    chatFabInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chatFabInnerLocked: {
      backgroundColor: theme.colors.primary + '12',
    },
    chatFabRing: {
      position: 'absolute',
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.colors.primary + '33',
    },
    chatFabBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  });

export default EnhancedDailyEntryScreen;
