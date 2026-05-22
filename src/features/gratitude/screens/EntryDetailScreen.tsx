import { CompositeNavigationProp, RouteProp, StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, es, tr } from 'date-fns/locale';

import LoadingState from '@/shared/components/states/LoadingState';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { useAttachmentMutations } from '@/features/gratitude/hooks';
import type { Attachment } from '@/schemas/gratitudeEntrySchema';
import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useGratitudeEntry, useGratitudeEntryById, useGratitudeMutations } from '../hooks';
import { useSubscription } from '@/hooks/useSubscription';
import { AppTheme } from '@/themes/types';
import { AppStackParamList, RootStackParamList } from '@/types/navigation';
import { analyticsService } from '@/services/analyticsService';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useMoodEmoji } from '@/shared/hooks/useMoodEmoji';
import type { MoodEmoji } from '@/types/mood.types';
import { useLanguageStore } from '@/store/languageStore';
import ThrowbackShareCard from '@/features/throwback/components/ThrowbackShareCard';
import { shareThrowbackCard } from '@/features/throwback/shareThrowback';
import { groupAttachmentsByStatementIndex } from '@/features/gratitude/utils/attachmentGrouping';

type EntryDetailScreenRouteProp = RouteProp<AppStackParamList, 'EntryDetail'>;
type EntryDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, 'EntryDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  route: EntryDetailScreenRouteProp;
  navigation: EntryDetailScreenNavigationProp;
}

const EntryDetailStatementItem = React.memo<{
  index: number;
  statement: string;
  entryDate: string;
  isEditing: boolean;
  isLoading: boolean;
  onEdit?: () => void;
  onSave: (updated: string, mood?: MoodEmoji | null) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  onShare: () => void;
  serverMood?: MoodEmoji | null;
  readOnly?: boolean;
  attachments?: Attachment[];
  onRemoveAttachment?: (attachment: Attachment) => void | Promise<void>;
  theme: AppTheme;
}>(
  ({
    index,
    statement,
    entryDate,
    isEditing,
    isLoading,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onShare,
    serverMood,
    readOnly = false,
    attachments,
    onRemoveAttachment,
    theme: _theme,
  }) => {
    const { moodEmoji, setMoodEmoji } = useMoodEmoji({ entryDate, index });

    useEffect(() => {
      if (serverMood !== null && serverMood !== undefined && serverMood !== moodEmoji) {
        void setMoodEmoji(serverMood);
      }
    }, [serverMood, moodEmoji, setMoodEmoji]);

    const { isPro, checkGate } = useSubscription();

    const handleChangeMood = (mood: MoodEmoji | null) => {
      if (!isPro) {
        checkGate('mood_editing');
        return;
      }
      setMoodEmoji(mood);
      if (mood) {
        analyticsService.logEvent('mood_selected', { entry_date: entryDate, index, emoji: mood });
      }
    };

    return (
      <StatementEditCard
        statement={statement}
        date={entryDate} // Passing raw date string usually works if StatementEditCard handles it, or use new Date().toISOString() if needed
        isEditing={isEditing}
        onEdit={readOnly ? undefined : onEdit}
        onSave={(updated, mood) => onSave(updated, mood)}
        onCancel={onCancel}
        onDelete={readOnly ? undefined : onDelete}
        onShare={onShare}
        isLoading={isLoading}
        edgeToEdge={true}
        variant="primary"
        showQuotes={true}
        animateEntrance={true}
        moodEmoji={moodEmoji}
        onChangeMood={handleChangeMood}
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
        compactAttachments={false}
      />
    );
  }
);
EntryDetailStatementItem.displayName = 'EntryDetailStatementItem';

const EnhancedEntryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useToast();
  useGlobalError(); // Used for other parts, but not handleMutationError in this file
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const language = useLanguageStore((state) => state.language);
  const { isPro, checkGate } = useSubscription();

  const { entryId, entryDate: routeEntryDate } = route.params;
  const isQueryById = !!entryId;
  const isQueryByDate = !isQueryById && !!routeEntryDate;

  const {
    data: entryByDate,
    isLoading: isLoadingEntryByDate,
    refetch: refetchEntryByDate,
    isRefetching: isRefetchingByDate,
  } = useGratitudeEntry(isQueryByDate ? (routeEntryDate as string) : '');

  const {
    data: entryById,
    isLoading: isLoadingEntryById,
    refetch: refetchEntryById,
    isRefetching: isRefetchingById,
  } = useGratitudeEntryById(isQueryById ? entryId : '');

  const currentEntry = isQueryById ? entryById : entryByDate;
  const isLoadingEntry = isQueryById ? isLoadingEntryById : isLoadingEntryByDate;
  const refetchEntry = isQueryById ? refetchEntryById : refetchEntryByDate;
  const isRefetching = isQueryById ? isRefetchingById : isRefetchingByDate;

  // Resolve entryDate from currentEntry if available, otherwise use routeEntryDate or today
  const entryDate =
    currentEntry?.entry_date || routeEntryDate || new Date().toISOString().split('T')[0];
  const todayDateString = new Date().toISOString().split('T')[0];
  const isPastEntry = entryDate < todayDateString;
  const isReadOnlyForFree = !isPro && isPastEntry;
  const effectiveDate = new Date(entryDate);

  const {
    editStatement,
    deleteStatement,
    deleteEntireEntry,
    addStatement,
    isDeletingStatement,
    isDeletingEntry,
  } = useGratitudeMutations();
  const { deleteAttachment: removeAttachment } = useAttachmentMutations();

  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);
  const [isDeletingCurrentEntry, setIsDeletingCurrentEntry] = useState(false);
  const isDeletingCurrentEntryRef = useRef(false);
  const animations = useCoordinatedAnimations();
  const scrollRef = useRef<ScrollView>(null);

  const statements = useMemo(() => currentEntry?.statements || [], [currentEntry?.statements]);
  const displayStatements = useMemo(() => [...statements].reverse(), [statements]);
  const attachments = useMemo(
    () => (currentEntry?.attachments as Attachment[] | undefined) ?? [],
    [currentEntry?.attachments]
  );
  const attachmentsByStatementIndex = useMemo(
    () => groupAttachmentsByStatementIndex(attachments),
    [attachments]
  );

  const shareCardRef = useRef<View>(null);
  const [statementToShare, setStatementToShare] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    animations.animateEntrance({ duration: 500 });
  }, [animations]);

  // Effect to redirect to NotFoundScreen if query by ID returns no entry
  useEffect(() => {
    if (!isLoadingEntry && isQueryById && !currentEntry && !isDeletingCurrentEntryRef.current) {
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.replace('NotFound');
    }
  }, [isLoadingEntry, isQueryById, currentEntry, isDeletingCurrentEntry, navigation]);

  const handleRefresh = useCallback(async () => {
    try {
      hapticFeedback.light();
      await refetchEntry();
    } catch {
      // quiet error
    }
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

  const formattedDate = format(effectiveDate, 'EEEE', { locale: getDateLocale() });
  const fullDateTitle = format(effectiveDate, 'd MMMM yyyy', { locale: getDateLocale() });

  const handleShareStatement = useCallback(
    async (statement: string) => {
      if (isSharing) {
        return;
      }
      setIsSharing(true);
      setStatementToShare(statement);
      // Wait briefly for React to render the hidden card before capturing
      setTimeout(async () => {
        try {
          await shareThrowbackCard({
            cardRef: shareCardRef,
            fallbackMessage: `${formattedDate.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : language)}, ${fullDateTitle}\n\n"${statement}"\n\nYeşer`,
            dialogTitle: t('throwback.modal.shareTitle', { defaultValue: 'Share this memory' }),
          });
          analyticsService.logEvent('gratitude_shared', { source: 'detail_screen' });
        } finally {
          setIsSharing(false);
          setStatementToShare(null);
        }
      }, 150);
    },
    [isSharing, formattedDate, fullDateTitle, t, language]
  );

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedText: string, updatedMood?: MoodEmoji | null) => {
      try {
        if (isReadOnlyForFree) {
          checkGate('past_entry_edit');
          return;
        }

        // Logic similar to DailyEntryScreen
        const originalIndex = statements.length - 1 - index; // Reverse index
        const originalMood = (currentEntry?.moods as Record<string, string> | undefined)?.[
          String(originalIndex)
        ] as MoodEmoji | undefined;
        let finalMood = updatedMood ?? null;

        if (!isPro && finalMood !== (originalMood ?? null)) {
          checkGate('mood_editing');
          finalMood = originalMood ?? null;
        }

        if (
          updatedText.trim() === displayStatements[index].trim() &&
          finalMood === (originalMood ?? null)
        ) {
          setEditingStatementIndex(null);
          return;
        }
        await editStatement({
          entryDate,
          statementIndex: originalIndex,
          updatedStatement: updatedText,
          moodEmoji: finalMood,
        });
        setEditingStatementIndex(null);
        showSuccess(t('gratitude.success.entryUpdated'));
      } catch {
        showError(t('gratitude.errors.editFailed'));
      }
    },
    [
      statements.length,
      displayStatements,
      editStatement,
      entryDate,
      showSuccess,
      showError,
      t,
      currentEntry?.moods,
      isPro,
      checkGate,
      isReadOnlyForFree,
    ]
  );

  const handleDeleteStatement = useCallback(
    (index: number) => {
      if (isReadOnlyForFree) {
        checkGate('past_entry_delete');
        return;
      }

      const deletedItem = displayStatements[index];
      const originalIndex = statements.length - 1 - index;
      const shouldRedirectToEntries = statements.length <= 1;
      const deletedMood = (currentEntry?.moods as Record<string, string> | undefined)?.[
        String(originalIndex)
      ] as MoodEmoji | undefined;

      if (shouldRedirectToEntries) {
        isDeletingCurrentEntryRef.current = true;
        setIsDeletingCurrentEntry(true);

        deleteEntireEntry(
          { entryDate, entryId: currentEntry?.id || entryId },
          {
            onSuccess: () => {
              showSuccess(t('shared.statement.deleted'), {
                action: {
                  label: t('shared.statement.undoAction'),
                  onPress: () =>
                    addStatement({
                      entryDate,
                      statement: deletedItem,
                      moodEmoji: deletedMood ?? null,
                    }),
                },
              });

              navigation.dispatch(
                StackActions.replace('MainAppTabs', { screen: 'PastEntriesTab' })
              );
            },
            onError: () => {
              isDeletingCurrentEntryRef.current = false;
              setIsDeletingCurrentEntry(false);
              showError(t('gratitude.errors.deleteFailed'));
            },
          }
        );
        return;
      }

      deleteStatement(
        { entryDate, statementIndex: originalIndex },
        {
          onSuccess: () => {
            showSuccess(t('shared.statement.deleted'), {
              action: {
                label: t('shared.statement.undoAction'),
                onPress: () =>
                  addStatement({
                    entryDate,
                    statement: deletedItem,
                    moodEmoji: deletedMood ?? null,
                  }),
              },
            });
          },
          onError: () => {
            showError(t('gratitude.errors.deleteFailed'));
          },
        }
      );
    },
    [
      statements.length,
      displayStatements,
      deleteStatement,
      deleteEntireEntry,
      entryDate,
      entryId,
      showSuccess,
      showError,
      t,
      addStatement,
      isReadOnlyForFree,
      checkGate,
      navigation,
      currentEntry?.id,
      currentEntry?.moods,
    ]
  );

  const handleRemoveAttachment = useCallback(
    (attachment: Attachment) => {
      if (isReadOnlyForFree) {
        checkGate('past_entry_attachment_delete');
        return;
      }

      void removeAttachment({
        entryDate,
        attachmentId: attachment.id,
      });
    },
    [checkGate, entryDate, isReadOnlyForFree, removeAttachment]
  );

  if (isLoadingEntry) {
    return <LoadingState fullScreen message={t('shared.loading')} />;
  }

  return (
    <>
      <StatusBar barStyle="default" backgroundColor="transparent" translucent />
      <ScreenLayout
        edges={['top']}
        scrollable={true}
        scrollRef={scrollRef}
        density="comfortable"
        edgeToEdge={true}
        backgroundColor={theme.colors.background} // Background color consistency
        showsVerticalScrollIndicator={false}
        keyboardAware={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View
          style={[
            styles.container,
            { opacity: animations.fadeAnim, transform: animations.entranceTransform },
          ]}
        >
          {/* BACK BUTTON ROW */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>

          {/* HEADER SECTION (Matching DailyEntryScreen Style) */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerDate}>
                {formattedDate.toLocaleUpperCase(language === 'tr' ? 'tr-TR' : language)}
              </Text>
              <Text style={styles.headerTitle}>{fullDateTitle}</Text>
              <Text style={styles.headerSubtitle}>{t('gratitude.detail.subtitle')}</Text>
            </View>
          </View>

          {/* STATEMENTS LIST SECTION */}
          <View style={styles.listSection}>
            {displayStatements.map((statement, index) => {
              const originalIndex = statements.length - 1 - index;
              const statementAttachments = attachmentsByStatementIndex.get(originalIndex) ?? [];
              return (
                <View key={`${entryDate}-${originalIndex}`} style={styles.statementWrapper}>
                  <EntryDetailStatementItem
                    index={index}
                    statement={statement}
                    entryDate={entryDate}
                    isEditing={editingStatementIndex === index}
                    isLoading={isDeletingStatement || isDeletingEntry}
                    onEdit={() => setEditingStatementIndex(index)}
                    onSave={(updated, mood) => handleSaveEditedStatement(index, updated, mood)}
                    onCancel={() => setEditingStatementIndex(null)}
                    onDelete={() => handleDeleteStatement(index)}
                    onShare={() => handleShareStatement(statement)}
                    readOnly={isReadOnlyForFree}
                    serverMood={
                      ((currentEntry?.moods as Record<string, string> | undefined)?.[
                        String(statements.length - 1 - index)
                      ] as MoodEmoji | undefined) ?? null
                    }
                    theme={theme}
                    attachments={statementAttachments}
                    onRemoveAttachment={isReadOnlyForFree ? undefined : handleRemoveAttachment}
                  />
                </View>
              );
            })}

            {statements.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="feather"
                  size={32}
                  color={theme.colors.onSurfaceVariant + '40'}
                />
                <Text style={styles.emptyText}>{t('gratitude.empty.past')}</Text>
              </View>
            )}
          </View>

          {/* Hidden Share Card */}
          {statementToShare !== null && (
            <View style={styles.hiddenShareCardContainer} pointerEvents="none">
              <ThrowbackShareCard
                ref={shareCardRef}
                dateLabel={fullDateTitle}
                statement={statementToShare}
              />
            </View>
          )}
        </Animated.View>
      </ScreenLayout>
    </>
  );
};

EnhancedEntryDetailScreen.displayName = 'EnhancedEntryDetailScreen';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: theme.spacing.xl,
    },
    navRow: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '40',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    headerContent: {
      flex: 1,
      paddingRight: theme.spacing.md,
    },
    headerDate: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700', // Matches DailyEntryScreen
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    headerTitle: {
      ...theme.typography.displaySmall, // Matches DailyEntryScreen Size
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
    listSection: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
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
    hiddenShareCardContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 400, // Fixed width for nice rendering
      opacity: 0,
      zIndex: -1,
    },
  });

export default EnhancedEntryDetailScreen;
