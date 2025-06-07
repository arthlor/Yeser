import React, { useCallback, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Portal, Snackbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '@/store/themeStore';
import { useGratitudeBenefits } from '../hooks/useGratitudeBenefits';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { BenefitCard } from '../components/BenefitCard';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { analyticsService } from '@/services/analyticsService';
import type { AppTheme } from '@/themes/types';
import type { RootStackParamList } from '@/types/navigation';

const { width: screenWidth } = Dimensions.get('window');

type WhyGratitudeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WhyGratitude'
>;

export const WhyGratitudeScreen: React.FC = () => {
  const { activeTheme } = useThemeStore();
  const navigation = useNavigation<WhyGratitudeScreenNavigationProp>();
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');

  // Data fetching hooks
  const { data: benefits, isLoading, error, refetch } = useGratitudeBenefits();
  const { profile } = useUserProfile();
  const { data: streak } = useStreakData();

  // Memoized calculations
  const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);
  const userName = useMemo(() => profile?.username, [profile?.username]);

  // Track screen view
  React.useEffect(() => {
    analyticsService.logEvent('why_gratitude_viewed', {
      screen_name: 'WhyGratitudeScreen',
      user_id: profile?.id || 'anonymous',
      timestamp: Date.now(),
    });
  }, [profile?.id]);

  // Memoized event handlers
  const handleStartJournaling = useCallback(
    (prompt?: string | null) => {
      // Track analytics
      analyticsService.logEvent('cta_button_pressed', {
        prompt: prompt || 'none',
        user_streak: streak?.current_streak || 0,
        user_id: profile?.id || 'anonymous',
      });

      analyticsService.logEvent('navigation_to_journal', {
        source: 'why_gratitude',
        prompt_used: !!prompt,
        user_id: profile?.id || 'anonymous',
      });

      navigation.navigate('MainApp', {
        screen: 'DailyEntryTab',
        params: { initialPrompt: prompt || undefined },
      });

      if (prompt) {
        setSnackbarMessage(`Harika bir başlangıç! "${prompt}" seni bekliyor.`);
        setSnackbarVisible(true);
      }
    },
    [navigation, streak?.current_streak, profile?.id]
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const onDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator
          animating={true}
          color={activeTheme.colors.primary}
          size="large"
          accessibilityLabel="İçerik yükleniyor"
        />
        <Text style={styles.loadingText}>İçerik yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  // Error State
  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Text style={[styles.errorTitle, { color: activeTheme.colors.error }]}>
          İçerik yüklenirken bir hata oluştu
        </Text>
        <Text style={[styles.errorMessage, { color: activeTheme.colors.textSecondary }]}>
          Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
        </Text>
        <Button
          mode="contained"
          onPress={handleRetry}
          style={styles.retryButton}
          accessibilityLabel="Tekrar dene"
        >
          Tekrar Dene
        </Button>
      </SafeAreaView>
    );
  }

  const primaryPrompt = benefits?.[0]?.cta_prompt_tr;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Appbar.Header elevated style={{ backgroundColor: activeTheme.colors.background }}>
          <Appbar.BackAction onPress={handleGoBack} accessibilityLabel="Geri dön" />
          <Appbar.Content title="Şükranın Gücü" titleStyle={styles.appBarTitle} />
        </Appbar.Header>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          accessible={true}
          accessibilityLabel="Şükranın gücü içeriği"
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {userName
                ? `${userName}, Zihnin İçin Bir Adım At`
                : 'Zihinsel Sağlığınız İçin Bir Adım Atın'}
            </Text>
            <Text style={styles.intro}>
              Yeşer ile her gün minnettar olduğunuz şeyleri düşünmek, zihinsel sağlığınız üzerinde
              kanıtlanmış güçlü etkilere sahiptir.
            </Text>
            {streak && streak.current_streak > 0 && (
              <Text style={styles.streakText}>
                Harika gidiyorsun!{' '}
                <Text style={{ fontWeight: 'bold' }}>{streak.current_streak} günlük serinle</Text>{' '}
                bu faydaların kilidini açmaya başladın bile.
              </Text>
            )}
          </View>

          {benefits?.map((benefit, index) => (
            <BenefitCard
              key={benefit.id}
              index={index}
              icon={benefit.icon}
              title={benefit.title_tr}
              description={benefit.description_tr}
              stat={benefit.stat_tr}
              initialExpanded={index === 0}
              testID={`benefit-card-${benefit.id}`}
            />
          ))}

          <Button
            mode="contained"
            onPress={() => handleStartJournaling(primaryPrompt)}
            style={styles.ctaButton}
            labelStyle={styles.ctaButtonLabel}
            contentStyle={{ paddingVertical: activeTheme.spacing.sm }}
            icon="pencil-plus-outline"
            accessibilityLabel="Hemen günlüğüne başla"
            accessibilityHint="Günlük yazma ekranına gider"
          >
            Hemen Günlüğüne Başla
          </Button>
        </ScrollView>

        <Portal>
          <Snackbar
            visible={snackbarVisible}
            onDismiss={onDismissSnackbar}
            duration={3000}
            action={{
              label: 'Kapat',
              onPress: onDismissSnackbar,
            }}
          >
            {snackbarMessage}
          </Snackbar>
        </Portal>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    appBarTitle: {
      fontWeight: 'bold',
      fontSize: 18,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    intro: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: theme.spacing.sm,
    },
    streakText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
      backgroundColor: `${theme.colors.primary}20`,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      marginHorizontal: theme.spacing.sm,
    },
    ctaButton: {
      marginTop: theme.spacing.xl,
      borderRadius: theme.borderRadius.full,
      minHeight: 48, // Accessibility touch target
    },
    ctaButtonLabel: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      color: theme.colors.textSecondary,
    },
    errorTitle: {
      ...theme.typography.headlineSmall,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    errorMessage: {
      ...theme.typography.bodyMedium,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    retryButton: {
      minHeight: 48,
    },
  });
