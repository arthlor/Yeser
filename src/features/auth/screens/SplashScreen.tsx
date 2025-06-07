// src/screens/EnhancedSplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

import splashAnimation from '@/assets/animations/splash.json';

import { ScreenContent, ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { getPrimaryShadow } from '@/themes/utils';
import { AppTheme } from '@/themes/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Premium splash screen with Lottie animations
 * Features sophisticated animations and modern design
 */
const EnhancedSplashScreen: React.FC = () => {
  const { theme, colorMode } = useTheme();
  const styles = createStyles(theme);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoSlideAnim = useRef(new Animated.Value(-50)).current;
  const bottomSlideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Lottie animation ref
  const lottieRef = useRef<LottieView>(null);

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('splash_screen');
  }, []);

  // Start entrance animations
  useEffect(() => {
    // Main entrance sequence
    Animated.sequence([
      // Initial fade and scale in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(logoSlideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
      // Bottom elements slide up
      Animated.spring(bottomSlideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle pulse animation synchronized with flower bloom
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1400, // Slower, more elegant pulse
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Start Lottie animation with delay for entrance effect
    const animationTimer = setTimeout(() => {
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }, 600); // Start flower animation after entrance animations

    return () => {
      pulseAnimation.stop();
      clearTimeout(animationTimer);
    };
  }, [fadeAnim, scaleAnim, logoSlideAnim, bottomSlideAnim, pulseAnim]);

  return (
    <ScreenLayout 
      scrollable={false} 
              edges={['top']}
      edgeToEdge={true}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Background Gradient Overlay */}
        <View style={styles.backgroundOverlay} />
        
        {/* Main Content Container */}
        <View style={styles.mainContent}>
          
          {/* Logo Section */}
          <Animated.View 
            style={[
              styles.logoSection,
              {
                transform: [{ translateY: logoSlideAnim }]
              }
            ]}
          >
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
            <Animated.Text 
              style={[
                styles.subtitle,
                { opacity: fadeAnim }
              ]}
            >
              Minnettarlık Yolculuğun
            </Animated.Text>
          </Animated.View>

          {/* Lottie Animation Section */}
          <Animated.View 
            style={[
              styles.animationContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            {/* Beautiful flower bloom animation */}
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
              <Animated.View 
                style={[
                  styles.loadingIndicator,
                  {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              />
              <View style={styles.loadingRing} />
            </View>
          </Animated.View>

        </View>

        {/* Bottom Section */}
        <Animated.View 
          style={[
            styles.bottomSection,
            {
              transform: [{ translateY: bottomSlideAnim }]
            }
          ]}
        >
          {/* Loading Text */}
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingText} accessibilityLabel="Yükleniyor">
              Hazırlanıyor...
            </Text>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
            </View>
          </View>

          {/* App Version */}
          <Text style={styles.versionText}>v1.0.0</Text>
        </Animated.View>

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
    loadingIndicator: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      ...getPrimaryShadow.floating(theme),
    },
    loadingRing: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
      borderStyle: 'dashed',
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
