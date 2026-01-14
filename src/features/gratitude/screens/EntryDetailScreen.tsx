import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
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

import LoadingState from '@/components/states/LoadingState';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useGratitudeEntry, useGratitudeMutations } from '../hooks';
import { AppTheme } from '@/themes/types';
import { AppStackParamList, RootStackParamList } from '@/types/navigation';
import { analyticsService } from '@/services/analyticsService';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useMoodEmoji } from '@/shared/hooks/useMoodEmoji';
import type { MoodEmoji } from '@/types/mood.types';
import { useLanguageStore } from '@/store/languageStore';

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
  onEdit: () => void;
  onSave: (updated: string, mood?: MoodEmoji | null) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
  serverMood?: MoodEmoji | null;
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
    serverMood,
    theme: _theme,
  }) => {
    const { moodEmoji, setMoodEmoji } = useMoodEmoji({ entryDate, index });

    useEffect(() => {
      if (serverMood !== null && serverMood !== undefined && serverMood !== moodEmoji) {
        void setMoodEmoji(serverMood);
      }
    }, [serverMood, moodEmoji, setMoodEmoji]);

    const handleChangeMood = (mood: MoodEmoji | null) => {
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
        onEdit={onEdit}
        onSave={(updated, mood) => onSave(updated, mood)}
        onCancel={onCancel}
        onDelete={onDelete}
        isLoading={isLoading}
        edgeToEdge={true}
        variant="primary"
        showQuotes={true}
        animateEntrance={true}
        moodEmoji={moodEmoji}
        onChangeMood={handleChangeMood}
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

  const { entryDate: routeEntryDate } = route.params;
  const entryDate = routeEntryDate || new Date().toISOString().split('T')[0];
  const effectiveDate = new Date(entryDate);

  const {
    data: currentEntry,
    isLoading: isLoadingEntry,
    refetch: refetchEntry,
    isRefetching,
  } = useGratitudeEntry(entryDate);

  const { editStatement, deleteStatement, addStatement, isDeletingStatement } =
    useGratitudeMutations();

  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);
  const animations = useCoordinatedAnimations();
  const scrollRef = useRef<ScrollView>(null);

  const statements = useMemo(() => currentEntry?.statements || [], [currentEntry?.statements]);
  const displayStatements = useMemo(() => [...statements].reverse(), [statements]);

  useEffect(() => {
    animations.animateEntrance({ duration: 500 });
  }, [animations]);

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

  const formattedDate = format(effectiveDate, 'EEEE, d MMMM', { locale: getDateLocale() });
  const monthYear = format(effectiveDate, 'MMMM yyyy', { locale: getDateLocale() });

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedText: string, updatedMood?: MoodEmoji | null) => {
      try {
        // Logic similar to DailyEntryScreen
        const originalIndex = statements.length - 1 - index; // Reverse index
        const originalMood = (currentEntry?.moods as Record<string, string> | undefined)?.[
          String(originalIndex)
        ] as MoodEmoji | undefined;

        if (
          updatedText.trim() === displayStatements[index].trim() &&
          updatedMood === (originalMood ?? null)
        ) {
          setEditingStatementIndex(null);
          return;
        }
        await editStatement({
          entryDate,
          statementIndex: originalIndex,
          updatedStatement: updatedText,
          moodEmoji: updatedMood,
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
    ]
  );

  const handleDeleteStatement = useCallback(
    async (index: number) => {
      const deletedItem = displayStatements[index];
      const originalIndex = statements.length - 1 - index;

      try {
        await deleteStatement({ entryDate, statementIndex: originalIndex });
        showSuccess(t('shared.statement.deleted'), {
          action: {
            label: t('shared.statement.undoAction'),
            onPress: () => addStatement({ entryDate, statement: deletedItem }),
          },
        });
      } catch {
        showError(t('gratitude.errors.deleteFailed'));
      }
    },
    [
      statements.length,
      displayStatements,
      deleteStatement,
      entryDate,
      showSuccess,
      showError,
      t,
      addStatement,
    ]
  );

  // Header Logic
  const isToday = entryDate === new Date().toISOString().split('T')[0];

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
              <Text style={styles.headerDate}>{formattedDate.toUpperCase()}</Text>
              <Text style={styles.headerTitle}>
                {isToday ? t('home.headline.greeting.morning', 'Your Day') : monthYear}
              </Text>
              <Text style={styles.headerSubtitle}>{t('gratitude.detail.subtitle')}</Text>
            </View>
          </View>

          {/* STATEMENTS LIST SECTION */}
          <View style={styles.listSection}>
            {displayStatements.map((statement, index) => (
              <View key={`${entryDate}-${index}`} style={styles.statementWrapper}>
                <EntryDetailStatementItem
                  index={index}
                  statement={statement}
                  entryDate={entryDate}
                  isEditing={editingStatementIndex === index}
                  isLoading={isDeletingStatement}
                  onEdit={() => setEditingStatementIndex(index)}
                  onSave={(updated, mood) => handleSaveEditedStatement(index, updated, mood)}
                  onCancel={() => setEditingStatementIndex(null)}
                  onDelete={() => handleDeleteStatement(index)}
                  serverMood={
                    ((currentEntry?.moods as Record<string, string> | undefined)?.[
                      String(statements.length - 1 - index)
                    ] as MoodEmoji | undefined) ?? null
                  }
                  theme={theme}
                />
              </View>
            ))}

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
  });

export default EnhancedEntryDetailScreen;
