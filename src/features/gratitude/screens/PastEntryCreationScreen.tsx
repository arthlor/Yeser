import GratitudeInputBar from '../components/GratitudeInputBar';
import { useGratitudeEntry, useGratitudeMutations } from '../hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import StatementEditCard from '@/shared/components/ui/StatementEditCard';
import { AppTheme } from '@/themes/types';
import { RootStackParamList } from '@/types/navigation';
import { analyticsService } from '@/services/analyticsService';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { ScreenLayout } from '@/shared/components/layout';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type PastEntryCreationScreenRouteProp = RouteProp<RootStackParamList, 'PastEntryCreation'>;

interface Props {
  route: PastEntryCreationScreenRouteProp;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * PastEntryCreationScreen - A dedicated screen for adding entries to a past date.
 * Mirrors the design of DailyEntryScreen for a consistent user experience.
 */
const PastEntryCreationScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();
  const { showSuccess, handleMutationError } = useGlobalError();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  const [statementInputError, setStatementInputError] = useState<string | null>(null);

  const masterFadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(-50)).current;

  const statements = currentEntry?.statements || [];

  useEffect(() => {
    if (addStatementError || editStatementError || deleteStatementError) {
      const operation = addStatementError
        ? 'minnet ekleme'
        : editStatementError
          ? 'minnet düzenleme'
          : 'minnet silme';
      const error = addStatementError || editStatementError || deleteStatementError;
      handleMutationError(error, operation);
    }
  }, [addStatementError, editStatementError, deleteStatementError, handleMutationError]);

  useEffect(() => {
    if (entryError) {
      handleMutationError(entryError, 'geçmiş kayıt yükleme');
    }
  }, [entryError, handleMutationError]);

  useEffect(() => {
    const animations = [
      Animated.timing(masterFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(heroSlideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ];

    Animated.stagger(100, animations).start();
  }, [masterFadeAnim, heroSlideAnim]);

  useEffect(() => {
    analyticsService.logScreenView('past_entry_creation_screen');
    analyticsService.logEvent('past_entry_creation_screen_viewed', {
      entry_date: finalDateString,
    });
  }, [finalDateString]);

  const handleAddStatement = useCallback(
    (statementText: string) => {
      try {
        gratitudeStatementSchema.parse(statementText);
        setStatementInputError(null);

        addStatement(
          { entryDate: finalDateString, statement: statementText },
          {
            onSuccess: () => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              if (statements.length + 1 >= (profile?.daily_gratitude_goal ?? 3)) {
                showSuccess('Hedef tamamlandı!');
                navigation.goBack();
              }
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          setStatementInputError(error.issues[0]?.message || 'Invalid statement');
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
    ]
  );

  const handleEditStatement = useCallback((index: number) => {
    setEditingStatementIndex(index);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const handleCancelEditingStatement = useCallback(() => {
    setEditingStatementIndex(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            },
          }
        );
      } catch (error) {
        if (error instanceof ZodError) {
          setStatementInputError(error.issues[0]?.message || 'Invalid statement');
        }
      }
    },
    [finalDateString, editStatement]
  );

  const handleDeleteStatement = useCallback(
    (index: number) => {
      deleteStatement(
        { entryDate: finalDateString, statementIndex: index },
        {
          onSuccess: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          },
        }
      );
    },
    [finalDateString, deleteStatement]
  );

  const handleRefresh = useCallback(async () => {
    await refetchEntry();
  }, [refetchEntry]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: masterFadeAnim,
              transform: [{ translateY: heroSlideAnim }],
            },
          ]}
        >
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="floating"
            style={styles.heroCard}
          >
            <View style={styles.dateSection}>
              <Icon name="calendar-today" size={24} color={theme.colors.primary} />
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formatDate(entryDate)}</Text>
                <Text style={styles.dateSubtext}>Bu tarihe minnet ekleniyor</Text>
              </View>
            </View>
          </ThemedCard>
        </Animated.View>

        <GratitudeInputBar
          onSubmit={handleAddStatement}
          error={statementInputError?.toString()}
          disabled={isAddingStatement}
          placeholder={isAddingStatement ? 'Minnet ekleniyor...' : 'Neye minnettar olduğunu yaz...'}
        />

        {isLoadingEntry && (
          <View style={styles.entryLoadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Kayıtlar yükleniyor...</Text>
          </View>
        )}

        {statements.length > 0 ? (
          <View style={styles.contentZone}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="format-list-bulleted" size={20} color={theme.colors.onSurface} />
                <Text style={styles.sectionTitle}>Eklenen Minnetler</Text>
              </View>
              <View style={styles.statementsCounter}>
                <Text style={styles.statementsCountText}>{statements.length}</Text>
              </View>
            </View>

            <View style={styles.statementsContainer}>
              {statements.map((statement, index) => (
                <View key={index} style={styles.statementWrapperOuter}>
                  <Animated.View
                    style={[
                      styles.statementWrapper,
                      {
                        opacity: masterFadeAnim,
                        transform: [
                          {
                            translateY: masterFadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20 + index * 5, 0],
                            }),
                          },
                        ],
                      },
                    ]}
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
                      onSave={(updatedText: string) =>
                        handleSaveEditedStatement(index, updatedText)
                      }
                      enableInlineEdit={true}
                      confirmDelete={true}
                      maxLength={500}
                      accessibilityLabel={`Minnet ${index + 1}: ${statement}`}
                    />
                  </Animated.View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <ThemedCard
              variant="outlined"
              density="comfortable"
              elevation="card"
              style={styles.emptyStateCard}
            >
              <View style={styles.emptyStateContent}>
                <Icon name={'heart-plus-outline'} size={64} color={theme.colors.primary + '40'} />
                <Text style={styles.emptyStateTitle}>İlk minnetini ekle!</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Bu tarihe minnettarlık hissettiğin anları yazarak başla.
                </Text>
              </View>
            </ThemedCard>
          </View>
        )}
      </ScreenLayout>
    </>
  );
};

// Keeping styles consistent with DailyEntryScreen
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    heroSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    heroCard: {
      // styles for the hero card
    },
    dateSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
    },
    dateTextContainer: {
      marginLeft: theme.spacing.md,
    },
    dateText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    dateSubtext: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    contentZone: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '15',
      ...getPrimaryShadow.small(theme),
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    sectionTitle: {
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
      paddingVertical: theme.spacing.sm,
    },
    statementWrapperOuter: {
      // Outer wrapper for layout animations
    },
    statementWrapper: {
      position: 'relative',
    },
    emptyStateContainer: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    emptyStateCard: {
      // styles for empty state card
    },
    emptyStateContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    emptyStateTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
      fontWeight: '700',
    },
    emptyStateSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      lineHeight: 22,
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
    loadingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.md,
    },
  });

export default PastEntryCreationScreen;
