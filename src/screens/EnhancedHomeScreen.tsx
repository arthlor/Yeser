import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import EnhancedStreakVisual from '../components/EnhancedStreakVisual';
import ThrowbackModal from '../components/features/ThrowbackModal';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import useStreak from '../hooks/useStreak';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { useProfileStore } from '../store/profileStore';
import { useThrowbackStore } from '../store/throwbackStore';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<MainAppTabParamList, 'HomeTab'>['navigation'],
  StackNavigationProp<RootStackParamList>
>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
  route: BottomTabScreenProps<MainAppTabParamList, 'HomeTab'>['route'];
};

/**
 * EnhancedHomeScreen provides an improved UI/UX for the home screen.
 * It uses animation components for a more engaging experience and
 * the enhanced streak visual component for better milestone visualization.
 */
const EnhancedHomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  useStreak(); // Initialize the hook to fetch streak and update store

  // Get state from store
  const streak = useProfileStore(state => state.streak);
  const streakLoading = useProfileStore(state => state.streakLoading);
  const streakError = useProfileStore(state => state.streakError);

  // Throwback functionality
  const {
    fetchRandomEntry: fetchThrowbackEntry,
    showThrowback,
    isLoading: isThrowbackLoading,
    error: throwbackError,
  } = useThrowbackStore();

  // Start animations on mount
  useEffect(() => {
    // Log screen view
    analyticsService.logScreenView('EnhancedHomeScreen');
  }, []);

  const handleFetchAndShowThrowback = async () => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      // Ideally use react-native-haptic-feedback library here
    }

    await fetchThrowbackEntry();
    if (!useThrowbackStore.getState().error) {
      showThrowback();
    }
  };

  const handleNewEntryPress = () => {
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      // Ideally use react-native-haptic-feedback library here
    }

    navigation.navigate('DailyEntryTab');
  };

  const handleReminderSettingsPress = () => {
    navigation.navigate('SettingsTab');
  };

  // Handle milestone reached
  const handleMilestoneReached = (milestone: {
    description: string;
    emoji: string;
    level: number;
    minDays: number;
    maxDays: number;
  }) => {
    // Show celebration or notification
    console.log(`Milestone reached: ${milestone.description}`);
    // Could show a toast or modal here
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Yeşer</Text>
        </View>

        {/* Welcome Message */}
        <View
          style={{
            marginTop: theme.spacing.medium,
            paddingHorizontal: theme.spacing.medium,
          }}
        >
          <ThemedCard
            variant="elevated"
            elevation="sm"
            contentPadding="md"
            style={styles.welcomeCard}
          >
            <Text style={styles.welcomeText}>
              Hoş geldiniz! Bugün minnettar olduğunuz üç şey nedir?
            </Text>
          </ThemedCard>
        </View>

        {/* Streak Visual */}
        <View style={styles.streakContainer}>
          {streakLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : streakError ? (
            <ThemedCard
              variant="outlined"
              contentPadding="sm"
              style={styles.errorCard}
            >
              <Text style={styles.errorText}>
                Seri yüklenemedi: {streakError}
              </Text>
            </ThemedCard>
          ) : (
            <EnhancedStreakVisual
              streakCount={streak ?? 0}
              onMilestoneReached={handleMilestoneReached}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <ThemedButton
            variant="primary"
            onPress={handleNewEntryPress}
            style={styles.newEntryButton}
            title="Yeni Giriş Ekle"
          >
            Yeni Giriş Ekle
          </ThemedButton>

          <ThemedButton
            variant="outline"
            onPress={handleReminderSettingsPress}
            style={styles.reminderButton}
            title="Hatırlatıcılar"
          >
            Hatırlatıcılar
          </ThemedButton>

          <ThemedButton
            variant="ghost"
            onPress={handleFetchAndShowThrowback}
            style={styles.throwbackButton}
            isLoading={isThrowbackLoading}
            title="Geçmiş Anı Göster"
          >
            Geçmiş Anı Göster
          </ThemedButton>
        </View>

        {/* Error Message */}
        {throwbackError && (
          <Text style={styles.throwbackErrorText}>{throwbackError}</Text>
        )}
      </ScrollView>

      {/* Throwback Modal */}
      <ThrowbackModal />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      paddingTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.large,
      alignItems: 'center',
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    welcomeContainer: {
      marginTop: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
    },
    welcomeCard: {
      marginBottom: theme.spacing.large,
    },
    welcomeText: {
      ...theme.typography.h3,
      color: theme.colors.secondary,
      textAlign: 'center',
    },
    streakContainer: {
      marginTop: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
      alignItems: 'center',
    },
    actionsContainer: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.large,
      gap: theme.spacing.medium,
    },
    newEntryButton: {
      marginBottom: theme.spacing.small,
    },
    reminderButton: {
      marginBottom: theme.spacing.small,
    },
    throwbackButton: {
      alignSelf: 'center',
    },
    errorCard: {
      backgroundColor: theme.colors.errorContainer,
      borderColor: theme.colors.error,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.error,
      textAlign: 'center',
    },
    throwbackErrorText: {
      ...theme.typography.caption,
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.small,
      paddingHorizontal: theme.spacing.large,
    },
  });

export default EnhancedHomeScreen;
