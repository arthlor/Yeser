import DailyEntryPrompt from '../components/DailyEntryPrompt';
import GratitudeInputBar from '../components/GratitudeInputBar';

import {
  useGratitudeEntry,
  useGratitudeMutations,
  usePromptMutations,
  usePromptText,
} from '../hooks';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import { StatementCard } from '@/shared/components/ui';
import { AppTheme } from '@/themes/types';
import { MainAppTabParamList } from '@/types/navigation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { RouteProp } from '@react-navigation/native';
import { ScreenLayout } from '@/shared/components/layout';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type DailyEntryScreenRouteProp = RouteProp<MainAppTabParamList, 'DailyEntryTab'>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Enhanced Daily Entry Screen - Beautiful Statement Cards Design
 * Now featuring StatementCard components for truly prominent statement display
 */
const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [manualDate, setManualDate] = useState<Date | null>(null);

  const initialDate = route?.params?.initialDate 
    ? new Date(route.params.initialDate) 
    : new Date();

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
  const [statementInputError, setStatementInputError] = useState<string | null>(null);

  // Enhanced animations - More delightful and engaging
  const masterFadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(-50)).current;
  
  // New animations for enhanced UX
  const progressRingAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  // TanStack Query hooks for prompts - with refresh functionality
  const { useVariedPrompts, daily_gratitude_goal } = profile || {};
  const {
    promptText: currentPrompt,
    isLoading: promptLoading,
    error: promptError,
    isUsingDefault,
  } = usePromptText();
  
  const {
    fetchNewPrompt,
    isFetchingNewPrompt,
  } = usePromptMutations();

  // Computed values
  const statements = currentEntry?.statements || [];
  const dailyGoal = daily_gratitude_goal || 3;
  const isToday = finalDateString === new Date().toISOString().split('T')[0];
  const progressPercentage = Math.min((statements.length / dailyGoal) * 100, 100);
  const isGoalComplete = statements.length >= dailyGoal;
  const wasGoalJustCompleted = useRef(false);

  // Show error alerts for mutation failures
  useEffect(() => {
    if (addStatementError) {
      Alert.alert('Hata', 'Şükran ifadesi eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [addStatementError]);

  useEffect(() => {
    if (editStatementError) {
      Alert.alert('Hata', 'Şükran ifadesi düzenlenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [editStatementError]);

  useEffect(() => {
    if (deleteStatementError) {
      Alert.alert('Hata', 'Şükran ifadesi silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [deleteStatementError]);

  // Show entry loading error if exists
  useEffect(() => {
    if (entryError) {
      Alert.alert('Hata', 'Günlük minnet kayıtları yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    }
  }, [entryError]);

  // Handle goal completion celebration
  useEffect(() => {
    if (isGoalComplete && !wasGoalJustCompleted.current) {
      wasGoalJustCompleted.current = true;
      
      // Celebration animation
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnim, {
          toValue: 0,
          duration: 600,
          delay: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isGoalComplete) {
      wasGoalJustCompleted.current = false;
    }
  }, [isGoalComplete, celebrationAnim]);

  // Initialize animations
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
      Animated.timing(progressRingAnim, {
        toValue: progressPercentage / 100,
        duration: 1200,
        delay: 400,
        useNativeDriver: false,
      }),
    ];

    Animated.stagger(100, animations).start();
  }, [masterFadeAnim, heroSlideAnim, progressRingAnim, progressPercentage]);

  // Handle statement operations with enhanced UX
  const handleAddStatement = useCallback((statementText: string) => {
    try {
      gratitudeStatementSchema.parse(statementText);
      setStatementInputError(null);
      
      addStatement(
        { entryDate: finalDateString, statement: statementText },
        {
          onSuccess: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          },
        }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        setStatementInputError(error.issues[0]?.message || 'Invalid statement');
      }
    }
  }, [finalDateString, addStatement]);

  const handleEditStatement = useCallback((index: number) => {
    setEditingStatementIndex(index);
  }, []);

  const handleSaveEditedStatement = useCallback(
    async (index: number, updatedText: string) => {
      try {
        gratitudeStatementSchema.parse(updatedText);
        
               editStatement({ 
         entryDate: finalDateString, 
         statementIndex: index, 
         updatedStatement: updatedText 
       });
        
        setEditingStatementIndex(null);
      } catch (error) {
        if (error instanceof ZodError) {
          Alert.alert('Error', error.issues[0]?.message || 'Invalid statement');
        }
      }
    },
    [finalDateString, editStatement]
  );

  const handleCancelEditingStatement = useCallback(() => {
    setEditingStatementIndex(null);
  }, []);

  const handleDeleteStatement = useCallback((index: number) => {
    Alert.alert(
      'Minnet Kaydını Sil',
      'Bu şükür ifadesini silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteStatement({ entryDate: finalDateString, statementIndex: index });
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          },
        },
      ]
    );
  }, [finalDateString, deleteStatement]);

  const handleDateChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  }, [setEntryDate]);

  const handleRefresh = useCallback(async () => {
    await refetchEntry();
  }, [refetchEntry]);

  const handlePromptRefresh = useCallback(() => {
    if (profile?.useVariedPrompts) {
      fetchNewPrompt();
    }
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

  return (
    <>
             <StatusBar 
         barStyle="default" 
         backgroundColor="transparent" 
         translucent 
       />
      
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
        {/* Hero Section with Date and Progress */}
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
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
              activeOpacity={0.8}
            >
              <View style={styles.dateSection}>
                <Icon name="calendar-today" size={24} color={theme.colors.primary} />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateText}>
                    {formatDate(effectiveDate)}
                  </Text>
                  <Text style={styles.dateSubtext}>
                    {isToday ? 'Bugün' : 'Geçmiş tarih'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Minimalistic Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressStats}>
                <Text style={styles.progressCount}>{statements.length}</Text>
                <Text style={styles.progressGoal}>/ {dailyGoal}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressRingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', `${Math.min(progressPercentage, 100)}%`],
                        }),
                        backgroundColor: isGoalComplete ? theme.colors.success : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.progressLabel}>
                {isGoalComplete ? '🎉 Hedef tamamlandı!' : `${Math.round(progressPercentage)}% tamamlandı`}
              </Text>
            </View>
          </ThemedCard>
        </Animated.View>

        {/* Input Section - Now Edge-to-Edge */}
        <GratitudeInputBar
          onSubmit={handleAddStatement}
          error={statementInputError?.toString()}
          disabled={!isToday || isAddingStatement}
          placeholder={
            isToday
              ? isAddingStatement
                ? 'Şükran ifadesi ekleniyor...'
                : 'Bugün neye minnettar olduğunuzu yazın...'
              : 'Geçmiş tarihler için yeni kayıt ekleyemezsiniz'
          }
        />

        {/* Prompt Section */}
        <DailyEntryPrompt
          promptText={currentPrompt}
          isLoading={promptLoading || isFetchingNewPrompt}
          error={promptError?.message || null}
          isToday={isToday}
          useVariedPrompts={profile?.useVariedPrompts || false}
          onRefreshPrompt={handlePromptRefresh}
        />

        {/* Loading Overlay for Entry Data */}
        {isLoadingEntry && (
          <View style={styles.entryLoadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Minnet kayıtları yükleniyor...</Text>
          </View>
        )}

        {/* Beautiful Statement Cards Section */}
        {statements.length > 0 ? (
          <View style={styles.contentZone}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="format-list-bulleted" size={20} color={theme.colors.onSurface} />
                <Text style={styles.sectionTitle}>
                  {isToday ? 'Bugünkü minnetlerin' : 'O günkü minnetlerin'}
                </Text>
              </View>
              <View style={styles.statementsCounter}>
                <Text style={styles.statementsCountText}>{statements.length}</Text>
              </View>
            </View>
            
            {/* Beautiful Statement Cards */}
            <View style={styles.statementsContainer}>
              {statements.map((statement, index) => (
                <Animated.View 
                  key={index} 
                  style={[
                    styles.statementWrapper,
                    {
                      opacity: masterFadeAnim,
                      transform: [
                        {
                          translateY: masterFadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20 + (index * 5), 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* 🚀 ENHANCED Hero StatementCard with Full Interactive Features */}
                  <StatementCard
                    statement={statement}
                    variant="default"
                    showQuotes={true}
                    animateEntrance={false} // Already animated by parent
                    onPress={() => handleEditStatement(index)}
                    date={formatDate(effectiveDate)}
                    numberOfLines={4} // Limit lines for better UX
                    
                    // ✨ NEW: Enhanced Interactive Features
                    isEditing={editingStatementIndex === index}
                    isLoading={isEditingStatement || isDeletingStatement}
                    onEdit={() => handleEditStatement(index)}
                    onDelete={() => handleDeleteStatement(index)}
                    onCancel={handleCancelEditingStatement}
                    onSave={(updatedText: string) => handleSaveEditedStatement(index, updatedText)}
                    
                    // ✨ NEW: Interaction Configuration - Button-Based Approach
                    enableSwipeActions={false} // Disabled per user preference
                    enableLongPress={false} // Simplified interaction
                    enableInlineEdit={true} // Enable for hero display
                    enableQuickActions={true} // Small polished buttons
                    
                    // ✨ NEW: Visual Enhancement Options - Clean Button Interface
                    showActionOverlay={false} // Use quick action buttons instead
                    actionPosition="bottom"
                    confirmDelete={true}
                    maxLength={500}
                    
                    // ✨ NEW: Accessibility & Feedback
                    accessibilityLabel={`Ana şükran ${index + 1}: ${statement}`}
                    hapticFeedback={false} // Simplified feedback
                    
                    style={{
                      marginBottom: theme.spacing.md,
                    }}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyStateContainer}>
            <ThemedCard 
              variant="outlined" 
              density="comfortable"
              elevation="card"
              style={styles.emptyStateCard}
            >
              <View style={styles.emptyStateContent}>
                <Icon
                  name={isToday ? 'heart-plus-outline' : 'book-open-outline'}
                  size={64}
                  color={theme.colors.primary + '40'}
                />
                <Text style={styles.emptyStateTitle}>
                  {isToday ? 'İlk şükranını ekle!' : 'O gün henüz şükran eklemedin'}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {isToday
                    ? 'Bugün minnettarlık hissettiğin anları yazarak güne başla.'
                    : 'Bu tarihte henüz bir şükran ifadesi bulunmuyor.'}
                </Text>
              </View>
            </ThemedCard>
          </View>
        )}

        {/* Goal Celebration Overlay */}
        {isGoalComplete && (
          <Animated.View
            style={[
              styles.celebrationOverlay,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.celebrationContent}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
              <Text style={styles.celebrationText}>Günlük hedef tamamlandı!</Text>
            </View>
          </Animated.View>
        )}
      </ScreenLayout>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={effectiveDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // ... existing styles ...
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
    loadingText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.md,
      fontWeight: '500',
      textAlign: 'center',
    },
    
    // Hero Section Styles
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
    progressBarContainer: {
      width: '80%',
      maxWidth: 200,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline + '15',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      minWidth: 6,
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
    emptyStateContent: {
      alignItems: 'center',
      // Padding handled by density="comfortable"
    },
    emptyStateTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      fontWeight: '600',
    },
    emptyStateSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 280,
    },
    celebrationOverlay: {
      position: 'absolute',
      top: '40%',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1000,
    },
    celebrationContent: {
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      ...getPrimaryShadow.floating(theme),
    },
    celebrationEmoji: {
      fontSize: 48,
      marginBottom: theme.spacing.sm,
    },
    celebrationText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
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
