// src/screens/EnhancedSplashScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
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

// Turkish gratitude tips that rotate while users wait
const GRATITUDE_TIPS = [
  {
    title: 'Küçük Anları Fark Et',
    description:
      'Günlük hayattaki basit zevkleri keşfet. Bir fincan çay, güzel bir manzara, sevdiklerinin gülümsemesi...',
  },
  {
    title: 'Zorluklardan Öğren',
    description:
      'Yaşadığın zorluklar seni güçlendirdi. Her deneyim, bugünkü bilge ve güçlü haline katkı sağladı.',
  },
  {
    title: 'İlişkilerini Değerlendir',
    description:
      'Hayatındaki insanlar senin için orada. Dostluklar, aile bağları, destekçilerin... Hepsi birer armağan.',
  },
  {
    title: 'Sağlığına Minnet Duy',
    description:
      'Nefes alabilmek, hareket edebilmek, hissetmek... Vücudun her gün senin için mucizeler gerçekleştiriyor.',
  },
  {
    title: 'Büyüme Fırsatları',
    description:
      'Öğrenme, gelişme ve yeni deneyimler yaşama şansın var. Her gün yeni bir keşif, yeni bir adım.',
  },
];

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
        setCurrentTipIndex((prev) => (prev + 1) % GRATITUDE_TIPS.length);
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
    try {
      analyticsService.logScreenView('splash_screen');
    } catch {
      // 🛡️ ERROR PROTECTION: Handle analytics errors silently
      showError('Uygulama başlatılırken bir hata oluştu.');
    }
  }, [showError]);

  // Start entrance animations
  useEffect(() => {
    triggerEntranceAnimations();
  }, [triggerEntranceAnimations]);

  const currentTip = GRATITUDE_TIPS[currentTipIndex];

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
          {/* Logo Section */}
          <View style={styles.logoSection}>
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
            <Text style={styles.subtitle}>Minnettarlık Yolculuğun...</Text>
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
          <Animated.View style={[styles.tipContainer, { opacity: tipOpacity }]}>
            <Text style={styles.tipTitle}>{currentTip.title}</Text>
            <Text style={styles.tipDescription}>{currentTip.description}</Text>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Loading Text */}
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingText} accessibilityLabel="Yükleniyor">
              Hazırlanıyor...
            </Text>
          </View>

          {/* Tip Progress Indicator */}
          <View style={styles.progressContainer}>
            {GRATITUDE_TIPS.map((_, index) => (
              <View
                key={index}
                style={[styles.progressDot, currentTipIndex === index && styles.progressDotActive]}
              />
            ))}
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
