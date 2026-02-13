import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAssets } from 'expo-asset';
import { MotiView } from 'moti';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ScreenLayout from '@/shared/components/layout/ScreenLayout';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { logger } from '@/utils/debugConfig';
import {
  useAppleAuthState,
  useAppleOAuth,
  useCoreAuth,
  useGoogleAuthState,
  useGoogleOAuth,
} from '@/features/auth';
import { AppTheme } from '@/themes/types';
import { alpha, blend } from '@/themes/utils';
import { AuthStackParamList } from '@/types/navigation';
import { supabaseService } from '@/utils/supabaseClient';
import LoginBackgroundVideo from '@/assets/videos/login-background.mp4';
import AppIcon from '@/assets/assets/icon.png';

const { height: screenHeight } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * 🌟 PROFESSIONAL LOGIN SCREEN
 * Minimal, subtle authentication experience
 */
const LoginScreen: React.FC<Props> = React.memo(({ navigation: _navigation }) => {
  const { theme, colorMode } = useTheme();
  const { showWarning, showSuccess } = useToast();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets, colorMode);
  const { t } = useTranslation();
  const isDark = colorMode === 'dark';

  // Video assets
  const [assets] = useAssets([LoginBackgroundVideo]);
  const [videoReady, setVideoReady] = useState(false);

  const videoSource = assets ? assets[0] : null;

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener('statusChange', (status) => {
      // status: 'idle' | 'loading' | 'readyToPlay' | 'error'
      if (status.status === 'readyToPlay') {
        setVideoReady(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player]);

  const gradientColors = useMemo<readonly [string, string, string]>(() => {
    if (isDark) {
      return [
        alpha(theme.colors.surface, 0.95),
        alpha(theme.colors.background, 0.98),
        alpha(theme.colors.primary, 0.18),
      ] as const;
    }

    const midTone = blend(theme.colors.gradientStart, theme.colors.gradientEnd, 0.5);
    return [
      alpha(theme.colors.gradientStart, 0.14),
      alpha(midTone, 0.12),
      theme.colors.background,
    ] as const;
  }, [
    isDark,
    theme.colors.background,
    theme.colors.gradientEnd,
    theme.colors.gradientStart,
    theme.colors.primary,
    theme.colors.surface,
  ]);

  // Core auth state
  const { isAuthenticated, isLoading: coreLoading } = useCoreAuth();
  const {
    isLoading: googleOAuthLoading,
    isInitialized: googleOAuthReady,
    canAttemptSignIn: canAttemptGoogleSignIn,
  } = useGoogleAuthState();
  const {
    isLoading: appleOAuthLoading,
    isInitialized: appleOAuthReady,
    canAttemptSignIn: canAttemptAppleSignIn,
  } = useAppleAuthState();

  // OAuth specific state and actions
  const { initialize: initializeGoogle } = useGoogleOAuth();
  const { initialize: initializeApple } = useAppleOAuth();

  const isLoading = coreLoading;

  // Track OAuth callback state
  const [isWaitingForOAuthCallback, setIsWaitingForOAuthCallback] = useState(false);

  // Reset OAuth callback state after timeout
  useEffect(() => {
    if (isWaitingForOAuthCallback) {
      const timeout = setTimeout(() => {
        setIsWaitingForOAuthCallback(false);
        logger.debug('OAuth callback timeout - resetting state');
      }, 60000);

      return () => clearTimeout(timeout);
    }
  }, [isWaitingForOAuthCallback]);

  // Reset OAuth callback state when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isWaitingForOAuthCallback) {
      setIsWaitingForOAuthCallback(false);
      logger.debug('OAuth callback successful - resetting state');
      setTimeout(() => {
        showSuccess?.(t('auth.login.toasts.loginSuccess'));
      }, 100);
    }
  }, [isAuthenticated, isWaitingForOAuthCallback, showSuccess, t]);

  // Initialize Google OAuth after database is ready
  useEffect(() => {
    const initGoogle = async () => {
      try {
        if (supabaseService.isInitialized()) {
          await initializeGoogle();
          logger.debug('Google OAuth initialized after database ready');
        } else {
          const checkReady = setInterval(async () => {
            if (supabaseService.isInitialized()) {
              clearInterval(checkReady);
              await initializeGoogle();
              logger.debug('Google OAuth initialized after database became ready');
            }
          }, 500);

          setTimeout(() => clearInterval(checkReady), 10000);
        }
      } catch (error) {
        logger.debug('Google OAuth initialization failed (non-critical):', {
          message: (error as Error).message,
        });
      }
    };

    initGoogle();
  }, [initializeGoogle]);

  // Initialize Apple OAuth after database is ready (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    const initApple = async () => {
      try {
        if (supabaseService.isInitialized()) {
          await initializeApple();
          logger.debug('Apple OAuth initialized after database ready');
        } else {
          const checkReady = setInterval(async () => {
            if (supabaseService.isInitialized()) {
              clearInterval(checkReady);
              await initializeApple();
              logger.debug('Apple OAuth initialized after database became ready');
            }
          }, 500);
          setTimeout(() => clearInterval(checkReady), 10000);
        }
      } catch (error) {
        logger.debug('Apple OAuth initialization failed (non-critical):', {
          message: (error as Error).message,
        });
      }
    };

    initApple();
  }, [initializeApple]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    if (!canAttemptGoogleSignIn) {
      showWarning(t('auth.login.toasts.googleNotReady'));
      return;
    }

    try {
      setIsWaitingForOAuthCallback(true);
      const { useGoogleOAuthStore } = await import('@/features/auth');
      await useGoogleOAuthStore.getState().signIn();
      setIsWaitingForOAuthCallback(false);
    } catch (error) {
      setIsWaitingForOAuthCallback(false);
      if (error instanceof Error && error.message !== 'OAUTH_CALLBACK_REQUIRED') {
        logger.error('Google OAuth error in UI:', error as Error);
      }
    }
  }, [canAttemptGoogleSignIn, showWarning, t]);

  const handleAppleLogin = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      showWarning(t('auth.login.toasts.appleOnlyIOS'));
      return;
    }

    if (!canAttemptAppleSignIn) {
      showWarning(t('auth.login.toasts.appleNotReady'));
      return;
    }

    try {
      setIsWaitingForOAuthCallback(true);
      const { useAppleOAuthStore } = await import('@/features/auth');
      await useAppleOAuthStore.getState().signIn();
      setIsWaitingForOAuthCallback(false);
    } catch (error) {
      setIsWaitingForOAuthCallback(false);
      if (error instanceof Error && error.message !== 'OAUTH_CALLBACK_REQUIRED') {
        logger.error('Apple OAuth error in UI:', error as Error);
      }
    }
  }, [canAttemptAppleSignIn, showWarning, t]);

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Subtle Background */}
      <View pointerEvents="none" style={styles.backgroundLayer}>
        {/* Video Background */}
        {assets && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}

        {/* Fallback & Loading State (Fades out when video is ready) */}
        <MotiView
          from={{ opacity: 1 }}
          animate={{ opacity: videoReady ? 0 : 1 }}
          transition={{ type: 'timing', duration: 800 }}
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={gradientColors}
            style={styles.backgroundGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
          <View style={styles.orbTopRight} />
          <View style={styles.orbBottomLeft} />
          <View style={styles.orbCenter} />
        </MotiView>

        {/* Dark Overlay for readability */}
        <View style={styles.videoOverlay} />
      </View>

      <ScreenLayout
        scrollable={true}
        keyboardAware={true}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        backgroundColor="transparent"
        showStatusBar={false}
        edges={['top', 'bottom']}
        contentContainerStyle={styles.safeContainer}
      >
        {/* Content Container */}
        <View style={styles.contentContainer}>
          <View style={styles.heroCard}>
            {/* Brand Section */}
            <View style={styles.brandSection}>
              <View style={styles.brandIcon}>
                <Image source={AppIcon} style={styles.brandLogo} resizeMode="contain" />
              </View>
              <Text style={styles.brandName}>{t('auth.login.brand')}</Text>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>{t('auth.login.welcome')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('auth.login.continueJourney')}</Text>
            </View>

            {/* Trust Chips */}
            <View style={styles.trustRow}>
              <View style={styles.trustChip}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.trustText}>{t('auth.login.secure.trust1')}</Text>
              </View>
              <View style={styles.trustChip}>
                <Ionicons name="key-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.trustText}>{t('auth.login.secure.trust2')}</Text>
              </View>
            </View>

            {/* OAuth Buttons Container */}
            <View style={styles.authContainer}>
              {/* Google Button */}
              <ThemedButton
                title={
                  !googleOAuthReady
                    ? t('auth.login.buttons.googleLoading')
                    : isWaitingForOAuthCallback
                      ? t('auth.login.buttons.openInBrowser')
                      : googleOAuthLoading
                        ? t('auth.login.buttons.googleSigning')
                        : t('auth.login.oauth.googleContinue')
                }
                onPress={handleGoogleLogin}
                variant="secondary"
                iconLeft="google"
                disabled={
                  isLoading ||
                  googleOAuthLoading ||
                  !googleOAuthReady ||
                  !canAttemptGoogleSignIn ||
                  isWaitingForOAuthCallback
                }
                style={styles.googleButton}
                textStyle={styles.googleButtonText}
                fullWidth
              />

              {/* Apple Button (iOS only) */}
              {Platform.OS === 'ios' && (
                <ThemedButton
                  title={
                    !appleOAuthReady
                      ? t('auth.login.buttons.appleLoading')
                      : isWaitingForOAuthCallback
                        ? t('auth.login.buttons.openInBrowser')
                        : appleOAuthLoading
                          ? t('auth.login.buttons.appleSigning')
                          : t('auth.login.oauth.appleContinue')
                  }
                  onPress={handleAppleLogin}
                  variant="secondary"
                  iconLeft="apple"
                  disabled={
                    isLoading ||
                    appleOAuthLoading ||
                    !appleOAuthReady ||
                    !canAttemptAppleSignIn ||
                    isWaitingForOAuthCallback
                  }
                  style={styles.appleButton}
                  textStyle={styles.appleButtonText}
                  fullWidth
                />
              )}

              {/* OAuth Callback Indicator */}
              {isWaitingForOAuthCallback && (
                <View style={styles.callbackIndicator}>
                  <Ionicons name="open-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.callbackText}>
                    {t('auth.login.oauth.browserReturnInstruction')}
                  </Text>
                </View>
              )}
            </View>

            {/* Privacy Note */}
            <View style={styles.privacySection}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles.privacyText}>{t('auth.login.privacyNote')}</Text>
            </View>
          </View>
        </View>
      </ScreenLayout>
    </View>
  );
});

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number },
  colorMode: string
) =>
  StyleSheet.create({
    root: {
      flex: 1,
      // backgroundColor: theme.colors.background, // Removed to let video show through
    },
    safeContainer: {
      flexGrow: 1,
      // Padding removed to rely on ScreenLayout's safe area handling
      // but keeping bottom spacing for aesthetic balance
      paddingBottom: theme.spacing.lg,
    },
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
      // zIndex: -1, // Removed to prevent video from being hidden behind root background
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    orbTopRight: {
      position: 'absolute',
      top: -120,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor:
        colorMode === 'dark'
          ? alpha(theme.colors.primary, 0.25)
          : alpha(theme.colors.primary, 0.18),
    },
    orbBottomLeft: {
      position: 'absolute',
      bottom: -140,
      left: -90,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor:
        colorMode === 'dark'
          ? alpha(theme.colors.secondary, 0.22)
          : alpha(theme.colors.secondary, 0.16),
    },
    orbCenter: {
      position: 'absolute',
      top: screenHeight * 0.32,
      right: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor:
        colorMode === 'dark'
          ? alpha(theme.colors.tertiary, 0.18)
          : alpha(theme.colors.tertiary, 0.12),
    },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: alpha(theme.colors.scrim, 0.3),
    },

    // Content layout
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
      minHeight: screenHeight * 0.7,
    },
    heroCard: {
      backgroundColor:
        colorMode === 'dark' ? alpha(theme.colors.surface, 0.7) : alpha(theme.colors.surface, 0.75),
      borderRadius: 24,
      padding: theme.spacing.xl,
      borderWidth: 1,
      borderColor: alpha(theme.colors.outlineVariant, 0.4),
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: colorMode === 'dark' ? 0.28 : 0.12,
      shadowRadius: 18,
      elevation: 10,
    },

    // Brand section
    brandSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    brandIcon: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor:
        colorMode === 'dark' ? alpha(theme.colors.primary, 0.2) : alpha(theme.colors.primary, 0.14),
      borderWidth: 1,
      borderColor: alpha(theme.colors.primary, 0.2),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    brandLogo: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    brandName: {
      fontSize: 30,
      fontWeight: '700',
      color: theme.colors.onBackground,
      letterSpacing: 0.4,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
    },

    // Welcome section
    welcomeSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    welcomeTitle: {
      fontSize: 26,
      fontWeight: '600',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.4,
      fontFamily: theme.typography.fontFamilySerif || theme.typography.fontFamilyMedium,
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.7,
      fontFamily: theme.typography.fontFamilyRegular || 'Inter-Regular',
      maxWidth: 260,
      lineHeight: 20,
    },

    trustRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    trustChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor:
        colorMode === 'dark'
          ? alpha(theme.colors.surfaceVariant, 0.6)
          : alpha(theme.colors.surfaceVariant, 0.8),
      borderWidth: 1,
      borderColor: alpha(theme.colors.outlineVariant, 0.35),
    },
    trustText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.typography.fontFamilyMedium || 'Inter-Medium',
    },

    // Auth container
    authContainer: {
      width: '100%',
      maxWidth: 340,
      alignSelf: 'center',
      marginTop: theme.spacing.sm,
    },

    // Google button - clean white
    googleButton: {
      backgroundColor: theme.colors.surfaceBright,
      borderWidth: 1,
      borderColor: alpha(theme.colors.outline, 0.28),
      minHeight: 54,
      borderRadius: 14,
      marginBottom: theme.spacing.md,
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorMode === 'dark' ? 0.3 : 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    googleButtonText: {
      color: theme.colors.onSurface,
      fontWeight: '500',
      fontSize: 15,
      letterSpacing: 0.1,
    },

    // Apple button - matching theme style
    appleButton: {
      backgroundColor: colorMode === 'dark' ? theme.colors.surfaceContainer : theme.colors.surface,
      borderWidth: 1,
      borderColor: alpha(theme.colors.outline, 0.28),
      minHeight: 54,
      borderRadius: 14,
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorMode === 'dark' ? 0.3 : 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    appleButtonText: {
      color: theme.colors.onSurface,
      fontWeight: '500',
      fontSize: 15,
      letterSpacing: 0.1,
    },

    // Callback indicator
    callbackIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    callbackText: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },

    // Privacy section
    privacySection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.lg,
    },
    privacyText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.5,
      fontFamily: theme.typography.fontFamilyRegular || 'Inter-Regular',
    },
  });

LoginScreen.displayName = 'LoginScreen';

export default LoginScreen;
