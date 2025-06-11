import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeStore } from '@/store/themeStore';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useGratitudeBenefits } from '../hooks/useGratitudeBenefits';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { BenefitCard } from '../components/BenefitCard';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { analyticsService } from '@/services/analyticsService';
import type { AppTheme } from '@/themes/types';
import type { RootStackParamList } from '@/types/navigation';

// Screen dimensions available if needed
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type WhyGratitudeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WhyGratitude'
>;

export const WhyGratitudeScreen: React.FC = React.memo(() => {
  const { activeTheme } = useThemeStore();
  const { showError, showSuccess } = useGlobalError();
  const navigation = useNavigation<WhyGratitudeScreenNavigationProp>();

  // Data fetching hooks
  const { data: benefits, isLoading, error, refetch } = useGratitudeBenefits();
  const { profile } = useUserProfile();
  const { data: streak } = useStreakData();

  // 🛡️ ERROR PROTECTION: Handle benefits loading errors
  React.useEffect(() => {
    if (error) {
      showError('Minnet faydaları yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [error, showError]);

  // ✅ PERFORMANCE FIX: Separate static styles from dynamic values
  const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);

  const userName = useMemo(() => profile?.username, [profile?.username]);

  // ✅ PERFORMANCE FIX: Consolidate analytics tracking
  React.useEffect(() => {
    const trackScreenView = () => {
      analyticsService.logScreenView('why_gratitude_screen');

      // Batch analytics events
      analyticsService.logEvent('why_gratitude_viewed', {
        user_id: profile?.id || 'anonymous',
        user_streak: streak?.current_streak || 0,
        has_benefits_data: !!benefits?.length,
        timestamp: Date.now(),
      });
    };

    trackScreenView();
  }, [profile?.id, streak?.current_streak, benefits?.length]);

  // 🚀 TOAST INTEGRATION: Enhanced event handlers with centralized toast notifications
  const handleStartJournaling = useCallback(
    (prompt?: string | null, source: 'main_button' | 'benefit_card' = 'main_button') => {
      // Track analytics
      analyticsService.logEvent('cta_button_pressed', {
        prompt: prompt || 'none',
        user_streak: streak?.current_streak || 0,
        user_id: profile?.id || 'anonymous',
        source,
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

      // 🚀 TOAST INTEGRATION: Use centralized toast system instead of custom Snackbar
      if (prompt) {
        showSuccess(`Harika bir başlangıç! "${prompt}" seni bekliyor.`);
      }
    },
    [navigation, streak?.current_streak, profile?.id, showSuccess]
  );

  const handleBenefitCtaPress = useCallback(
    (prompt: string, benefitId: number, title: string, index: number) => {
      // Track benefit-specific analytics
      analyticsService.logEvent('benefit_card_cta_pressed', {
        benefit_id: benefitId,
        title,
        prompt,
        index,
        user_id: profile?.id || 'anonymous',
      });

      // Navigate with the specific prompt
      handleStartJournaling(prompt, 'benefit_card');
    },
    [handleStartJournaling, profile?.id]
  );

  const handleRetry = useCallback(() => {
    refetch();
    // 🛡️ ERROR PROTECTION: Notify user when retrying
    showSuccess('Yeniden yükleniyor...');
  }, [refetch, showSuccess]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ✅ PERFORMANCE FIX: Memoize computed values
  const primaryPrompt = useMemo(() => benefits?.[0]?.cta_prompt_tr, [benefits]);

  // Enhanced Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.loadingContent}>
            <ActivityIndicator
              animating={true}
              color={activeTheme.colors.primary}
              size="large"
              accessibilityLabel="İçerik yükleniyor"
            />
            <Text style={styles.loadingText}>İçerik yükleniyor...</Text>
            <Text style={styles.loadingSubtext}>Minnetin faydaları hazırlanıyor</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Enhanced Error State
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.errorContent}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={64}
              color={activeTheme.colors.error}
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>İçerik yüklenirken bir hata oluştu</Text>
            <Text style={styles.errorMessage}>
              Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
            </Text>
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButton}
              labelStyle={styles.retryButtonLabel}
              icon="refresh"
              accessibilityLabel="Tekrar dene"
            >
              Tekrar Dene
            </Button>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Enhanced Header */}
        <Animated.View entering={SlideInUp.duration(600)}>
          <Appbar.Header elevated style={styles.appBar}>
            <Appbar.BackAction
              onPress={handleGoBack}
              accessibilityLabel="Geri dön"
              iconColor={activeTheme.colors.onBackground}
            />
            <Appbar.Content
              title="Minnetin Gücü"
              titleStyle={styles.appBarTitle}
              color={activeTheme.colors.onBackground}
            />
          </Appbar.Header>
        </Animated.View>

        {/* Content Container */}
        <View style={styles.contentWrapper}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            accessible={true}
            accessibilityLabel="Minnetin gücü içeriği"
          >
            {/* Hero Section */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(800)}
              style={styles.heroSection}
            >
              <View style={styles.heroIconContainer}>
                <View style={styles.heroIconBackground}>
                  <MaterialCommunityIcons
                    name="heart-multiple-outline"
                    size={48}
                    color={activeTheme.colors.primary}
                  />
                </View>
              </View>

              <Text style={styles.title}>
                {userName
                  ? `${userName}, Zihnin İçin Bir Adım At`
                  : 'Zihinsel Sağlığınız İçin Bir Adım Atın'}
              </Text>

              <Text style={styles.intro}>
                Yeşer ile her gün minnettar olduğunuz şeyleri düşünmek, zihinsel sağlığınız üzerinde
                kanıtlanmış güçlü etkilere sahiptir.
              </Text>

              {/* Enhanced Streak Display */}
              {streak && streak.current_streak > 0 && (
                <Animated.View
                  entering={FadeInUp.delay(600).duration(600)}
                  style={styles.streakContainer}
                >
                  <View style={styles.streakBackground}>
                    <MaterialCommunityIcons
                      name="fire"
                      size={24}
                      color={activeTheme.colors.success}
                      style={styles.streakIcon}
                    />
                    <Text style={styles.streakText}>
                      <Text style={styles.streakTextBold}>Harika gidiyorsun!</Text>
                      {'\n'}
                      <Text style={styles.streakNumber}>{streak.current_streak} günlük</Text>{' '}
                      serinle bu faydaların kilidini açmaya başladın bile.
                    </Text>
                  </View>
                </Animated.View>
              )}
            </Animated.View>

            {/* Benefits Section */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(800)}
              style={styles.benefitsSection}
            >
              <View style={styles.benefitsSectionHeader}>
                <Text style={styles.benefitsTitle}>Neden minnet duymalıyız?</Text>
                <Text style={styles.benefitsSubtitle}>
                  Araştırmalarla desteklenen minnetin gücü...
                </Text>
              </View>

              {benefits?.map((benefit, index) => (
                <View key={benefit.id} style={styles.benefitCardWrapper}>
                  <BenefitCard
                    index={index}
                    icon={benefit.icon}
                    title={benefit.title_tr}
                    description={benefit.description_tr}
                    stat={benefit.stat_tr}
                    ctaPrompt={benefit.cta_prompt_tr}
                    initialExpanded={index === 0}
                    testID={`benefit-card-${benefit.id}`}
                    onCtaPress={(prompt) =>
                      handleBenefitCtaPress(prompt, benefit.id, benefit.title_tr, index)
                    }
                  />
                </View>
              ))}
            </Animated.View>

            {/* Enhanced CTA Section */}
            <Animated.View entering={FadeInUp.delay(800).duration(800)} style={styles.ctaSection}>
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Bugün Hemen Başla</Text>
                <Text style={styles.ctaSubtitle}>
                  Bu faydaları deneyimlemek için günlüğüne ilk adımını at
                </Text>

                <Button
                  mode="contained"
                  onPress={() => handleStartJournaling(primaryPrompt)}
                  style={styles.ctaButton}
                  labelStyle={styles.ctaButtonLabel}
                  contentStyle={styles.ctaButtonContent}
                  icon="pencil-plus-outline"
                  buttonColor={activeTheme.colors.primary}
                  textColor={activeTheme.colors.onPrimary}
                  accessibilityLabel="Hemen günlüğüne başla"
                  accessibilityHint="Günlük yazma ekranına gider"
                >
                  Hemen Günlüğüne Başla
                </Button>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
});

WhyGratitudeScreen.displayName = 'WhyGratitudeScreen';

// **CLEAN DESIGN**: Simplified styles without gradients
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Header styles
    appBar: {
      backgroundColor: theme.colors.surface,
      elevation: 2,
      shadowOpacity: 0.1,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    appBarTitle: {
      fontWeight: 'bold',
      fontSize: 20,
      color: theme.colors.onBackground,
    },

    // Layout containers
    contentWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },

    // Hero section
    heroSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    heroIconContainer: {
      marginBottom: theme.spacing.lg,
    },
    heroIconBackground: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: `${theme.colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.lg,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      lineHeight: 32,
      fontWeight: '700',
    },
    intro: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 26,
      paddingHorizontal: theme.spacing.md,
      opacity: 0.9,
    },

    // Streak section
    streakContainer: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      width: '100%',
    },
    streakBackground: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: `${theme.colors.success}30`,
    },
    streakIcon: {
      alignSelf: 'center',
      marginBottom: theme.spacing.sm,
    },
    streakText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onBackground,
      textAlign: 'center',
      lineHeight: 22,
    },
    streakTextBold: {
      fontWeight: '700',
      color: theme.colors.success,
    },
    streakNumber: {
      fontWeight: '700',
      color: theme.colors.success,
      fontSize: 18,
    },

    // Benefits section
    benefitsSection: {
      marginTop: theme.spacing.xl,
    },
    benefitsSectionHeader: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    benefitsTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
    },
    benefitsSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.8,
    },
    benefitCardWrapper: {
      marginBottom: theme.spacing.xl,
    },

    // CTA section
    ctaSection: {
      marginTop: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    ctaContent: {
      alignItems: 'center',
    },
    ctaTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    ctaSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      opacity: 0.8,
      lineHeight: 20,
    },
    ctaButtonContainer: {
      borderRadius: theme.borderRadius.full,
      width: '100%',
      maxWidth: 280,
      ...theme.elevation.md,
    },
    ctaButton: {
      borderRadius: theme.borderRadius.full,
      minHeight: 56,
    },
    ctaButtonContent: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    ctaButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // Loading states
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContent: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    loadingText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      marginTop: theme.spacing.lg,
      textAlign: 'center',
      fontWeight: '600',
    },
    loadingSubtext: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      opacity: 0.7,
    },

    // Error states
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContent: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    errorIcon: {
      marginBottom: theme.spacing.lg,
    },
    errorTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontWeight: '600',
    },
    errorMessage: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      lineHeight: 22,
    },
    retryButton: {
      minHeight: 48,
      borderRadius: theme.borderRadius.full,
    },
    retryButtonLabel: {
      fontWeight: '600',
    },
  });
