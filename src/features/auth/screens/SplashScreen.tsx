// src/screens/EnhancedSplashScreen.tsx
import React, { useCallback, useEffect } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

import splashAnimation from '@/assets/animations/splash.json';

import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { analyticsService } from '@/services/analyticsService';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';

const { width: screenWidth } = Dimensions.get('window');

/**
 * **SIMPLIFIED SPLASH SCREEN**: Minimal, non-intrusive animations
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Reduced from 5 animation instances to 1 (80% reduction)
 * - Eliminated complex staged sequences (mainAnimations, logoAnimations, bottomAnimations, pulseAnimations, dotsAnimations)
 * - Replaced with subtle 400ms entrance fade following roadmap philosophy
 * - Removed translateY stages and pulse effects for cleaner, minimal experience
 * - Maintained Lottie animation without complex coordination overhead
 */
const EnhancedSplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useGlobalError();
  const styles = createStyles(theme);

  // **SIMPLIFIED ANIMATION SYSTEM**: Single coordinated instance (5 → 1, 80% reduction)
  const animations = useCoordinatedAnimations();

  // Lottie animation ref
  const lottieRef = React.useRef<LottieView>(null);

  // 🛡️ MEMORY LEAK FIX: Cleanup ref on unmount for better GC
  React.useEffect(() => {
    return () => {
      // Set ref to null on unmount to help with garbage collection
      if (lottieRef.current) {
        lottieRef.current = null;
      }
    };
  }, []);

  // **MINIMAL ENTRANCE**: Simple 400ms fade-in, barely noticeable
  const triggerEntranceAnimations = useCallback(() => {
    // Single subtle entrance animation - no complex sequences
    animations.animateEntrance({ duration: 400 });

    // Start Lottie animation with minimal delay
    setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }, 200);
  }, [animations]);

  // Log screen view for analytics
  useEffect(() => {
    try {
      analyticsService.logScreenView('splash_screen');
    } catch {
      // 🛡️ ERROR PROTECTION: Handle analytics errors silently
      showError('Uygulama başlatılırken bir hata oluştu.');
    }
  }, [showError]);

  // Start minimal entrance animation
  useEffect(() => {
    triggerEntranceAnimations();
  }, [triggerEntranceAnimations]);

  return (
    <ScreenLayout scrollable={false} edges={['top']} edgeToEdge={true} style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* Background Gradient Overlay */}
        <View style={styles.backgroundOverlay} />

        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Logo Section - No separate animations, unified entrance */}
          <View style={styles.logoSection}>
            {/* App Logo with Enhanced Typography */}
            <View style={styles.logoContainer}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                accessibilityLabel="Yeşer uygulama logosu"
              >
                Yeşer
              </Text>
              <View style={styles.logoUnderline} />
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>Minnettarlık Yolculuğun</Text>
          </View>

          {/* Lottie Animation Section - Simple, no pulse effects */}
          <View style={styles.animationContainer}>
            {/* Beautiful flower bloom animation from splash.json */}
            <LottieView
              ref={lottieRef}
              source={splashAnimation}
              style={styles.lottieAnimation}
              autoPlay={false}
              loop={true}
              resizeMode="contain"
              speed={0.8} // Slightly slower for more elegant feel
            />

            {/* Fallback loading indicator if Lottie fails */}
            <View style={styles.fallbackContainer}>
              {/* Green dot and loading ring removed as requested */}
            </View>
          </View>
        </View>

        {/* Bottom Section - No separate animations, unified entrance */}
        <View style={styles.bottomSection}>
          {/* Loading Text */}
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingText} accessibilityLabel="Yükleniyor">
              Hazırlanıyor...
            </Text>
            {/* Simplified loading dots - no pulsing animation */}
            <View style={styles.loadingDots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>

          {/* Version Info */}
          <Text style={styles.versionText}>Yeşer • Versiyon 1.0</Text>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
    },
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `${theme.colors.primary}08`, // Very subtle primary tint
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
      marginBottom: theme.spacing.xxl * 2,
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
      // Enhanced shadow for logo
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
      width: screenWidth * 0.65, // Slightly larger for flower animation
      height: screenWidth * 0.65,
      maxWidth: 320,
      maxHeight: 320,
      marginBottom: theme.spacing.xl,
    },
    lottieAnimation: {
      width: '100%',
      height: '100%',
    },
    fallbackContainer: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    bottomSection: {
      alignItems: 'center',
      width: '100%',
    },
    loadingTextContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
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
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7,
      fontWeight: '500',
    },
  });

export default EnhancedSplashScreen;
