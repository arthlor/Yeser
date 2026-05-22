import GratitudeInputBar, { GratitudeInputBarRef } from '../components/GratitudeInputBar';
import { useGratitudeEntry, useGratitudeMutations } from '../hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { AppTheme } from '@/themes/types';
import { AppStackParamList, RootStackParamList } from '@/types/navigation';
import { analyticsService } from '@/services/analyticsService';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { ScreenLayout } from '@/shared/components/layout';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { enUS, es, tr } from 'date-fns/locale';
import { GRATITUDE_MAX_LENGTH } from '@/constants/gratitude';
import { useLanguageStore } from '@/store/languageStore';
import { AICoachPrompt } from '@/shared/components/ui/AICoachPrompt';

type PastEntryCreationScreenRouteProp = RouteProp<AppStackParamList, 'PastEntryCreation'>;

const PastEntryCreationScreen: React.FC<{ route: PastEntryCreationScreenRouteProp }> = ({
  route,
}) => {
  const { theme } = useTheme();
  const { showSuccess, handleMutationError, showError } = useGlobalError();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { canAccessPastEntries, checkGate } = useSubscription();
  const language = useLanguageStore((state) => state.language);

  // **DOUBLE LOCK**: Secure screen access against deep links or bypasses
  useEffect(() => {
    if (!canAccessPastEntries()) {
      checkGate('past_entry_screen_access');
      navigation.goBack();
    }
  }, [canAccessPastEntries, checkGate, navigation]);

  // The date is passed from the calendar screen and is not user-changeable here.
  const { date: dateString } = route.params;
  const entryDate = new Date(dateString);
  const finalDateString = entryDate.toISOString().split('T')[0];

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
  const inputBarRef = React.useRef<GratitudeInputBarRef>(null);

  const animations = useCoordinatedAnimations();

  const statements = currentEntry?.statements || [];
  const dailyGoal = profile?.daily_gratitude_goal ?? 3;

  useEffect(() => {
    if (addStatementError || editStatementError || deleteStatementError) {
      const operation = addStatementError
        ? 'addStatement'
        : editStatementError
          ? 'editStatement'
          : 'deleteStatement';
      const error = addStatementError || editStatementError || deleteStatementError;
      handleMutationError(error, operation);
    }
  }, [addStatementError, editStatementError, deleteStatementError, handleMutationError]);

  useEffect(() => {
    if (entryError) {
      handleMutationError(entryError, 'past entry load');
    }
  }, [entryError, handleMutationError]);

  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  useEffect(() => {
    analyticsService.logScreenView('past_entry_creation_screen');
    analyticsService.logEvent('past_entry_creation_screen_viewed', {
      entry_date: finalDateString,
    });
  }, [finalDateString]);

  const handleAddStatement = useCallback(
    (statementText: string, moodEmoji?: import('@/types/mood.types').MoodEmoji | null) => {
      try {
        gratitudeStatementSchema.parse(statementText);

        addStatement(
          { entryDate: finalDateString, statement: statementText, moodEmoji: moodEmoji ?? null },
          {
            onSuccess: () => {
              if (statements.length + 1 >= (profile?.daily_gratitude_goal ?? 3)) {
                showSuccess(t('gratitude.success.goalCompletedPastEntry'));
                navigation.goBack();
              }
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
      addStatement,
      statements.length,
      profile?.daily_gratitude_goal,
      showSuccess,
      navigation,
      showError,
      t,
    ]
  );

  const handleEditStatement = useCallback((index: number) => {
    setEditingStatementIndex(index);
  }, []);

  const handleCancelEditingStatement = useCallback(() => {
    setEditingStatementIndex(null);
  }, []);

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedText: string) => {
      try {
        gratitudeStatementSchema.parse(updatedText);
        editStatement(
          { entryDate: finalDateString, statementIndex: index, updatedStatement: updatedText },
          {
            onSuccess: () => {
              setEditingStatementIndex(null);
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
    [finalDateString, editStatement, showSuccess, showError, t]
  );

  const handleDeleteStatement = useCallback(
    (index: number) => {
      deleteStatement(
        { entryDate: finalDateString, statementIndex: index },
        {
          onSuccess: () => {
            // Animation handled by list
          },
        }
      );
    },
    [finalDateString, deleteStatement]
  );

  const handleRefresh = useCallback(async () => {
    await refetchEntry();
  }, [refetchEntry]);

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

  // Format date like DailyEntryScreen
  const formattedDate = format(entryDate, 'EEEE, d MMMM', { locale: getDateLocale() });
  const formattedMonthYear = format(entryDate, 'MMMM yyyy', { locale: getDateLocale() });

  return (
    <>
      <StatusBar barStyle="default" backgroundColor="transparent" translucent />
      <ScreenLayout
        edges={['top']}
        scrollable={true}
        density="comfortable"
        edgeToEdge={true}
        backgroundColor={theme.colors.background}
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
        <Animated.View
          style={[
            styles.container,
            {
              opacity: animations.fadeAnim,
              transform: animations.entranceTransform,
            },
          ]}
        >
          {/* HEADER SECTION - Matching DailyEntryScreen */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerDate} maxFontSizeMultiplier={1.3}>
                {formattedDate.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : language)}
              </Text>
              <Text style={styles.headerTitle} maxFontSizeMultiplier={1.3}>
                {formattedMonthYear}
              </Text>
              <Text style={styles.headerSubtitle} maxFontSizeMultiplier={1.3}>
                {t('throwback.teaser.subtitle')}
              </Text>
            </View>

            <View style={styles.progressRingContainer}>
              <Animated.View style={styles.progressRing}>
                <Icon
                  name={statements.length >= dailyGoal ? 'check-decagram' : 'calendar-clock'}
                  size={24}
                  color={
                    statements.length >= dailyGoal ? theme.colors.success : theme.colors.primary
                  }
                />
                <Text style={styles.progressText} maxFontSizeMultiplier={1.3}>
                  {statements.length}/{dailyGoal}
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* INPUT SECTION */}
          <View style={styles.inputSection}>
            <GratitudeInputBar
              ref={inputBarRef}
              onSubmit={handleAddStatement}
              onSubmitWithMood={(text, mood) => handleAddStatement(text, mood ?? null)}
              disabled={isAddingStatement}
              placeholder={
                isAddingStatement ? t('gratitude.input.motto') : t('gratitude.input.placeholder')
              }
            />
          </View>

          {/* AI COACH PROMPT */}
          <View style={styles.coachSection}>
            <AICoachPrompt
              recentEntries={statements.slice(0, 5)}
              onSelectPrompt={(prompt) => {
                inputBarRef.current?.setInputText?.(prompt);
                inputBarRef.current?.focus();
              }}
            />
          </View>

          {/* STATEMENTS LIST SECTION */}
          <View style={styles.listSection}>
            {isLoadingEntry && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('shared.layout.screenContent.loading')}</Text>
              </View>
            )}

            {statements.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  {t('gratitude.sections.todaysGratitudes', 'Your Gratitudes')}
                </Text>
                <View style={styles.lineDivider} />
              </View>
            )}

            {[...statements].reverse().map((statement, index) => (
              <View key={index} style={styles.statementWrapper}>
                <Animated.View
                  style={{
                    opacity: animations.fadeAnim,
                    transform: [
                      {
                        translateY: animations.fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20 + index * 5, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <StatementEditCard
                    statement={statement}
                    variant="primary"
                    date={finalDateString}
                    isEditing={editingStatementIndex === index}
                    isLoading={isEditingStatement || isDeletingStatement}
                    onEdit={() => handleEditStatement(index)}
                    onDelete={() => handleDeleteStatement(index)}
                    onCancel={handleCancelEditingStatement}
                    onSave={(updatedText: string) => handleSaveEditedStatement(index, updatedText)}
                    enableInlineEdit={true}
                    confirmDelete={true}
                    maxLength={GRATITUDE_MAX_LENGTH}
                    edgeToEdge={true}
                    showQuotes={true}
                    animateEntrance={true}
                    accessibilityLabel={t('shared.statement.a11y.memoryLabel', {
                      text: statement,
                    })}
                  />
                </Animated.View>
              </View>
            ))}

            {statements.length === 0 && !isLoadingEntry && (
              <View style={styles.emptyContainer}>
                <Icon name="feather" size={32} color={theme.colors.onSurfaceVariant + '40'} />
                <Text style={styles.emptyText}>
                  {t('gratitude.empty.past', 'No entries for this day.')}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScreenLayout>
    </>
  );
};

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
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
    },
    headerContent: {
      flex: 1,
      paddingRight: theme.spacing.md,
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
    inputSection: {
      paddingHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.md,
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
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    loadingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default PastEntryCreationScreen;
