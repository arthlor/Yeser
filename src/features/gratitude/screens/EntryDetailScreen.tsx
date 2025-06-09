import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
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
import { AppTheme } from '@/themes/types';
import { RootStackParamList } from '@/types/navigation';
import { ScreenLayout } from '@/shared/components/layout';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import { ZodError } from 'zod';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';
import { analyticsService } from '@/services/analyticsService';

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
 * EnhancedEntryDetailScreen displays a single gratitude entry with beautiful journal-like design
 * Features: Individual statement cards, enhanced animations, gorgeous visual hierarchy
 */
const EnhancedEntryDetailScreen: React.FC<{
  route: EntryDetailScreenRouteProp;
  navigation: EntryDetailScreenNavigationProp;
}> = ({ route }) => {
  const { theme } = useTheme();
  const { entryDate } = route.params;

  // Live data fetching for real-time updates
  const {
    data: currentEntry,
    isLoading: isLoadingEntry,
    refetch: refetchEntry,
    isRefetching,
    error: entryError,
  } = useGratitudeEntry(entryDate);

  // Mutation hooks for editing operations only (delete removed for past entries)
  const { editStatement, isEditingStatement, editStatementError } = useGratitudeMutations();

  // Local state for editing
  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);

  // Animation values for enhanced entrance effects
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const [animationsReady, setAnimationsReady] = useState(false);

  // Use live data or fallback to route params
  const gratitudeItems = currentEntry?.statements || [];

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
      return { formattedDate: 'Tarih bilgisi yok', relativeTime: '' };
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
    if (diffDays === 0) {
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

    return { formattedDate, relativeTime };
  };

  const { formattedDate, relativeTime } = formatEntryDate();

  // Error handling for mutations
  useEffect(() => {
    if (editStatementError) {
      Alert.alert('Hata', 'Minnet ifadesi düzenlenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [editStatementError]);

  useEffect(() => {
    // Start animations immediately when component mounts or data changes
    setAnimationsReady(true);

    // Header animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, gratitudeItems.length]);

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
          message="Minnet kayıtları yüklenirken bir hata oluştu. Lütfen tekrar deneyin."
          icon="calendar-alert"
          onRetry={() => refetchEntry()}
          retryText="Tekrar Dene"
        />
      </ScreenLayout>
    );
  }

  const handleEditStatement = (index: number) => {
    setEditingStatementIndex(index);
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (error) {
      if (error instanceof ZodError) {
        Alert.alert('Hata', error.errors[0]?.message || 'Geçersiz girdi');
      } else {
        Alert.alert('Hata', 'Bir hata oluştu');
        logger.error(
          'Edit statement error:',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  };

  const handleCancelEditingStatement = () => {
    setEditingStatementIndex(null);
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleRefresh = async () => {
    try {
      await refetchEntry();
    } catch (error) {
      logger.error('Refresh error:', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const styles = createStyles(theme);

  // Enhanced Empty State Component
  const EmptyStateEnhanced = () => (
    <Animated.View
      style={[
        styles.emptyStateContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
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
      {/* 🎯 ENHANCED HERO ZONE: Edge-to-Edge Header */}
      <Animated.View
        style={[
          styles.heroZone,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
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
                      name="clock-outline"
                      size={14}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.relativeDateText}>{relativeTime}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsSection}>
                <View style={styles.countBadge}>
                  <MaterialCommunityIcons name="heart" size={16} color={theme.colors.primary} />
                  <Text style={styles.countText}>{gratitudeItems.length}</Text>
                </View>
                <Text style={styles.countLabel}>minnet kaydı</Text>
              </View>
            </View>

            {gratitudeItems.length > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>
                    {gratitudeItems.length >= 3
                      ? '🎉 O gün hedef tamamlanmıştı!'
                      : `Hedefe ${3 - gratitudeItems.length} kaldı`}
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
                        size={16}
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

      {/* 🎯 ENHANCED CONTENT ZONE: Edge-to-Edge Statements Display */}
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
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={20}
                  color={theme.colors.onSurface}
                />
                <Text style={styles.statementsTitle}>O günkü minnetleriniz</Text>
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
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20 + index * 5, 0],
                          }),
                        },
                        {
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* 🚀 ENHANCED StatementDetailCard - Perfect for Entry Detail Reading */}
                  <StatementDetailCard
                    statement={item}
                    variant="detailed" // Enhanced readability for entry details
                    index={index} // Sequence indicators for better reading flow
                    totalCount={gratitudeItems.length}
                    isEditing={editingStatementIndex === index}
                    isLoading={isEditingStatement}
                    onEdit={() => handleEditStatement(index)}
                    onCancel={handleCancelEditingStatement}
                    onSave={(updatedText: string) => handleSaveEditedStatement(index, updatedText)}
                    // Enhanced detail configuration
                    enableInlineEdit={true}
                    confirmDelete={true}
                    maxLength={500}
                    // Accessibility
                    accessibilityLabel={`Minnet ${index + 1} / ${gratitudeItems.length}: ${item}`}
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
      marginBottom: theme.spacing.sm,
    },
    progressTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
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
