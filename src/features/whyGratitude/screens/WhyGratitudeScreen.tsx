import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useGratitudeBenefits } from '../hooks/useGratitudeBenefits';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';
import type { AppTheme } from '@/themes/types';
import type { AppStackParamList } from '@/types/navigation';

// Screen dimensions available if needed
// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type WhyGratitudeScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'WhyGratitude'
>;

export const WhyGratitudeScreen: React.FC = React.memo(() => {
  const { theme } = useTheme();
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
  const styles = useMemo(() => createStyles(theme), [theme]);

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

      // Navigate to DailyEntryTab through MainAppTabs
      setTimeout(() => {
        try {
          navigation.navigate('MainAppTabs', {
            screen: 'DailyEntryTab',
            params: { initialPrompt: prompt || undefined },
          });
        } catch (error) {
          logger.warn('Navigation failed in WhyGratitudeScreen:', { error });
          // Fallback: just navigate to the tab without params
          navigation.navigate('MainAppTabs', {
            screen: 'DailyEntryTab',
          });
        }
      }, 100);

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
              color={theme.colors.primary}
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
            <Icon
              name="alert-circle-outline"
              size={64}
              color={theme.colors.error}
              style={styles.errorIcon}
            />
            <Text style={styles.errorTitle}>İçerik yüklenirken bir hata oluştu</Text>
            <Text style={styles.errorMessage}>
              Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
            </Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Text style={styles.retryButtonLabel}>Tekrar Dene</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Simple Header */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={handleGoBack}
            accessibilityLabel="Geri dön"
            style={styles.appBarBackAction}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Minnetin Gücü</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Simple Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>Zihinsel Sağlığınız İçin Bir Adım Atın</Text>
            <Text style={styles.intro}>
              Yeşer ile her gün minnettar olduğunuz şeyleri düşünmek, zihinsel sağlığınız üzerinde
              kanıtlanmış güçlü etkilere sahiptir.
            </Text>
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Neden minnet duymalıyız?</Text>
            <Text style={styles.benefitsSubtitle}>Araştırmalarla desteklenen minnetin gücü...</Text>

            {benefits?.map((benefit, index) => (
              <TouchableOpacity
                key={benefit.id}
                style={styles.benefitCard}
                onPress={() =>
                  handleBenefitCtaPress(
                    benefit.cta_prompt_tr || '',
                    benefit.id,
                    benefit.title_tr,
                    index
                  )
                }
                activeOpacity={0.8}
              >
                {/* Gradient Border Container */}
                <View style={styles.benefitGradientBorderContainer}>
                  <LinearGradient
                    colors={[
                      theme.colors.primary,
                      theme.colors.secondary || theme.colors.primaryContainer,
                      theme.colors.tertiary || theme.colors.primary,
                    ]}
                    style={styles.benefitGradientBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>

                <View style={styles.benefitContent}>
                  {/* Icon */}
                  <View style={styles.benefitIconContainer}>
                    <Icon name={benefit.icon} size={24} color={theme.colors.primary} />
                  </View>

                  {/* Content */}
                  <View style={styles.benefitTextContainer}>
                    <Text style={styles.benefitTitle}>{benefit.title_tr}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description_tr}</Text>
                    {benefit.stat_tr && <Text style={styles.benefitStat}>{benefit.stat_tr}</Text>}
                  </View>

                  {/* Arrow */}
                  <View style={styles.benefitArrow}>
                    <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Simple CTA Section */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Bugün Hemen Başla</Text>
            <Text style={styles.ctaSubtitle}>Bu faydaları deneyimlemek için ilk adımını at.</Text>

            <TouchableOpacity
              onPress={() => handleStartJournaling(primaryPrompt)}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaButtonLabel}>Hemen Başla</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
      shadowOpacity: 0.05,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    appBarBackAction: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: `${theme.colors.primary}06`,
    },
    appBarTitle: {
      fontWeight: '700',
      fontSize: 20,
      color: theme.colors.onSurface,
      flex: 1,
      textAlign: 'center',
      marginRight: 44, // Balance the back button
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
      paddingBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
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
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 32,
      fontWeight: '700',
    },
    intro: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 26,
      opacity: 0.85,
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
      marginTop: theme.spacing.lg,
    },
    benefitsTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    benefitsSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.8,
      marginBottom: theme.spacing.xl,
    },

    // Benefit cards
    benefitCard: {
      position: 'relative',
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    benefitGradientBorderContainer: {
      position: 'absolute',
      top: -0.5,
      left: -0.3,
      right: -0.3,
      bottom: -0.5,
      borderRadius: theme.borderRadius.lg + 0.5,
      zIndex: 0,
    },
    benefitGradientBorder: {
      flex: 1,
      borderRadius: theme.borderRadius.lg + 0.5,
    },
    benefitContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      position: 'relative',
      zIndex: 1,
    },
    benefitIconContainer: {
      marginRight: theme.spacing.lg,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${theme.colors.primary}08`,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.primary}15`,
    },
    benefitTextContainer: {
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    benefitTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      lineHeight: 22,
    },
    benefitDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
      lineHeight: 20,
      opacity: 0.9,
    },
    benefitStat: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 13,
    },
    benefitArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.colors.primary}06`,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // CTA section
    ctaSection: {
      marginTop: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      alignItems: 'center',
    },
    ctaContent: {
      alignItems: 'center',
    },
    ctaTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
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
    ctaButton: {
      borderRadius: theme.borderRadius.full,
      minHeight: 56,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      minWidth: 200,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    ctaButtonLabel: {
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: theme.colors.onPrimary,
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
      color: theme.colors.onSurface,
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
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    retryButtonLabel: {
      fontWeight: '600',
      color: theme.colors.onPrimary,
      fontSize: 16,
    },
  });
