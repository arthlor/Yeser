// src/screens/EnhancedSplashScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';

import splashAnimation from '@/assets/animations/splash.json';

import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
// Analytics disabled
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';

const { width: screenWidth } = Dimensions.get('window');

// Localized rotating gratitude tips
const buildLocalizedTips = (t: (key: string) => string) =>
  [
    {
      title: t('auth.splash.carousel.moments.title'),
      description: t('auth.splash.carousel.moments.desc'),
    },
    {
      title: t('auth.splash.carousel.challenges.title'),
      description: t('auth.splash.carousel.challenges.desc'),
    },
    {
      title: t('auth.splash.carousel.relationships.title'),
      description: t('auth.splash.carousel.relationships.desc'),
    },
    {
      title: t('auth.splash.carousel.health.title'),
      description: t('auth.splash.carousel.health.desc'),
    },
    {
      title: t('auth.splash.carousel.growth.title'),
      description: t('auth.splash.carousel.growth.desc'),
    },
  ] as const;

/**
 * **ENHANCED SPLASH SCREEN WITH GRATITUDE TIPS**
 *
 * Features:
 * - Rotating Turkish gratitude tips (5 different messages)
 * - Smooth transitions between tips
 * - Extended duration to prevent race conditions
 * - Educational content while users wait
 */
const EnhancedSplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useGlobalError();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // Tip rotation state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipOpacity] = useState(new Animated.Value(1));

  // Animation system
  const animations = useCoordinatedAnimations();

  // Lottie animation ref
  const lottieRef = React.useRef<LottieView>(null);

  // 🛡️ MEMORY LEAK FIX: Cleanup refs on unmount
  React.useEffect(() => {
    const lottie = lottieRef.current;
    return () => {
      if (lottie) {
        // No explicit cleanup needed for the ref itself,
        // React handles unmounting.
      }
    };
  }, []);

  // **TIP ROTATION SYSTEM**: Cycle through gratitude tips every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out current tip
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change tip and fade in
        setCurrentTipIndex((prev) => (prev + 1) % 5);
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [tipOpacity]);

  // **ENTRANCE ANIMATIONS**: Smooth coordinated entrance
  const triggerEntranceAnimations = useCallback(() => {
    // Subtle entrance animation
    animations.animateEntrance({ duration: 600 });

    // Start Lottie animation
    setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }, 300);
  }, [animations]);

  // Analytics and initialization
  useEffect(() => {
    // Analytics disabled
  }, [showError]);

  // Start entrance animations
  useEffect(() => {
    triggerEntranceAnimations();
  }, [triggerEntranceAnimations]);

  const tips = useMemo(() => buildLocalizedTips(t), [t]);
  const currentTip = tips[currentTipIndex];

  // Memoized animated style to avoid inline objects and satisfy hook deps
  const tipContainerAnimatedStyle = useMemo(() => ({ opacity: tipOpacity }), [tipOpacity]);
  const contentAnimatedStyle = useMemo(
    () => ({ opacity: animations.fadeAnim, transform: animations.entranceTransform }),
    [animations.fadeAnim, animations.entranceTransform]
  );

  return (
    <ScreenLayout
      scrollable={false}
      edges={['top']}
      edgeToEdge={true}
      constrainContentWidth={false}
    >
      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        {/* Background Gradient Overlay */}
        <View style={styles.backgroundOverlay} />

        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                accessibilityLabel={t('auth.splash.logoA11y')}
              >
                {t('auth.splash.appName')}
              </Text>
              <View style={styles.logoUnderline} />
            </View>
            <Text style={styles.subtitle}>{t('auth.splash.journey')}</Text>
          </View>

          {/* Lottie Animation Section */}
          <View style={styles.animationContainer}>
            <LottieView
              ref={lottieRef}
              source={splashAnimation}
              style={styles.lottieAnimation}
              autoPlay={false}
              loop={true}
              resizeMode="contain"
              speed={0.8}
            />
          </View>

          {/* **NEW**: Rotating Gratitude Tips Section */}
          <Animated.View style={[styles.tipContainer, tipContainerAnimatedStyle]}>
            <Text style={styles.tipTitle}>{currentTip.title}</Text>
            <Text style={styles.tipDescription}>{currentTip.description}</Text>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Loading Text */}
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingText} accessibilityLabel={t('auth.splash.loadingA11y')}>
              {t('auth.splash.preparing')}
            </Text>
          </View>

          {/* Tip Progress Indicator */}
          <View style={styles.progressContainer}>
            {tips.map((_, index) => (
              <View
                key={index}
                style={[styles.progressDot, currentTipIndex === index && styles.progressDotActive]}
              />
            ))}
          </View>

          {/* Version Info */}
          <Text style={styles.versionText}>{t('auth.splash.version', { version: '1.0' })}</Text>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${theme.colors.primary}08`,
    },
    content: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    mainContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.displayLarge,
      fontSize: 56,
      fontWeight: '900',
      color: theme.colors.primary,
      textAlign: 'center',
      letterSpacing: -2,
      textShadowColor: theme.colors.primary + '40',
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 12,
    },
    logoUnderline: {
      width: 80,
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
      marginTop: theme.spacing.sm,
      ...getPrimaryShadow.floating(theme),
    },
    subtitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    animationContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: screenWidth * 0.5, // Smaller to make room for tips
      height: screenWidth * 0.5,
      maxWidth: 240,
      maxHeight: 240,
      marginBottom: theme.spacing.lg,
    },
    lottieAnimation: {
      width: '100%',
      height: '100%',
    },
    // **NEW**: Gratitude Tips Styling
    tipContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
      maxWidth: screenWidth * 0.85,
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
    },
    tipTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    tipDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      lineHeight: 22,
      opacity: 0.8,
    },
    bottomSection: {
      alignItems: 'center',
      width: '100%',
    },
    loadingTextContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    loadingText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    loadingDots: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
    },
    // **NEW**: Progress Indicator for Tips
    progressContainer: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    progressDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline,
      opacity: 0.3,
    },
    progressDotActive: {
      backgroundColor: theme.colors.primary,
      opacity: 1,
    },
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7,
      fontWeight: '500',
    },
  });

export default EnhancedSplashScreen;
