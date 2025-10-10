import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import ScreenLayout from '@/shared/components/layout/ScreenLayout';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { getPrimaryShadow } from '@/themes/utils';
import { magicLinkSchema } from '@/schemas/authSchemas';
// Analytics disabled
import { logger } from '@/utils/debugConfig';
import {
  useAppleAuthState,
  useAppleOAuth,
  useAuthActions,
  useCoreAuth,
  useGoogleAuthState,
  useGoogleOAuth,
  useMagicLink,
  useMagicLinkState,
} from '@/features/auth';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';
import { supabaseService } from '@/utils/supabaseClient';

const { height: screenHeight } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * 🌟 POLISHED EDGE-TO-EDGE LOGIN SCREEN
 * Clean, spacious authentication experience with proper text sizing and layout
 *
 * **REFACTORED**: Now uses unified modern auth hooks for consistent state management
 *
 * **SIMPLIFIED ANIMATION SYSTEM**: Using minimal, non-intrusive animations
 * with 4 essential values: fadeAnim, scaleAnim, opacityAnim, heightAnim
 *
 * **TOAST INTEGRATION**: Auth errors now show as toasts instead of inline display.
 * Only field validation errors (emailError) show inline for immediate feedback.
 */
const LoginScreen: React.FC<Props> = React.memo(({ navigation: _navigation }) => {
  const { theme } = useTheme();
  const { showWarning, showError, showSuccess } = useToast();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  const { t } = useTranslation();

  // Modern selective auth state for better performance
  const { isAuthenticated, isLoading: coreLoading } = useCoreAuth();
  const { isLoading: magicLinkLoading } = useMagicLinkState();
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

  // Modern unified auth actions
  const { sendMagicLink, signInWithGoogle, signInWithApple, resetMagicLink } = useAuthActions();

  // Magic link specific state and actions
  const { lastSentEmail, lastSentAt, canSendMagicLink } = useMagicLink();

  // Google OAuth specific state and actions
  const { initialize: initializeGoogle } = useGoogleOAuth();
  const { initialize: initializeApple } = useAppleOAuth();

  // Derive magic link sent state (matches legacy behavior)
  const magicLinkSent = !!(lastSentEmail && lastSentAt);
  const isLoading = coreLoading || magicLinkLoading;

  // Track OAuth callback state
  const [isWaitingForOAuthCallback, setIsWaitingForOAuthCallback] = useState(false);

  // Reset OAuth callback state after timeout
  useEffect(() => {
    if (isWaitingForOAuthCallback) {
      const timeout = setTimeout(() => {
        setIsWaitingForOAuthCallback(false);
        logger.debug('OAuth callback timeout - resetting state');
      }, 60000); // 1 minute timeout

      return () => clearTimeout(timeout);
    }
  }, [isWaitingForOAuthCallback]);

  // Reset OAuth callback state when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isWaitingForOAuthCallback) {
      setIsWaitingForOAuthCallback(false);
      logger.debug('OAuth callback successful - resetting state');
      // Show success message for OAuth completion (provider-agnostic)
      setTimeout(() => {
        showSuccess?.(t('auth.login.toasts.loginSuccess'));
      }, 100);
    }
  }, [isAuthenticated, isWaitingForOAuthCallback, showSuccess, t]);

  // Form state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [showHelpSection, setShowHelpSection] = useState(false);

  // **SIMPLIFIED ANIMATION SYSTEM**: Single minimal hook with 4 essential values
  const animations = useCoordinatedAnimations();

  // Lightweight internal debounced callback to avoid external dependency
  const useDebouncedCallbackString = (
    callback: (value: string) => void,
    delay: number
  ): ((value: string) => void) => {
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedFn = React.useCallback(
      (value: string) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(value);
        }, delay);
      },
      [callback, delay]
    );

    // Clear on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return debouncedFn;
  };

  // Debounced validator to avoid validation on every keystroke (300 ms after user stops typing)
  const debouncedValidateEmail = useDebouncedCallbackString((text: string) => {
    if (text.length > 0) {
      const isValid = magicLinkSchema.safeParse({ email: text }).success;
      setIsEmailValid(isValid);
    } else {
      setIsEmailValid(false);
    }
  }, 300);

  // **MINIMAL ENTRANCE**: Simple 400ms fade-in instead of complex sequence
  const triggerEntranceAnimations = useCallback(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **OPTIMIZED SUCCESS FEEDBACK**: Immediate and smooth transition
  useEffect(() => {
    if (magicLinkSent) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // OPTIMIZED: Immediate smooth transition without artificial delay
      animations.animateFade(1, { duration: 150 }); // Faster, smoother transition
    }
  }, [magicLinkSent, animations]);

  // **LAYOUT TRANSITION**: Using animateLayoutTransition instead of LayoutAnimation
  const toggleHelpSection = useCallback(() => {
    setShowHelpSection(!showHelpSection);
    // Use layout transition animation (replaces LayoutAnimation)
    animations.animateLayoutTransition(!showHelpSection, 120, { duration: 250 });
  }, [showHelpSection, animations]);

  // Start entrance animation on mount
  useEffect(() => {
    triggerEntranceAnimations();
  }, [triggerEntranceAnimations]);

  // Initialize Google OAuth after database is ready
  useEffect(() => {
    const initGoogle = async () => {
      try {
        // Only initialize if Supabase is ready (proper database readiness check)
        if (supabaseService.isInitialized()) {
          await initializeGoogle();
          logger.debug('Google OAuth initialized after database ready');
        } else {
          // Wait for database to be ready
          const checkReady = setInterval(async () => {
            if (supabaseService.isInitialized()) {
              clearInterval(checkReady);
              await initializeGoogle();
              logger.debug('Google OAuth initialized after database became ready');
            }
          }, 500);

          // Cleanup after 10 seconds to prevent infinite waiting
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

  // Real-time email validation
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      setEmailError(undefined);

      // Trigger debounced validation
      debouncedValidateEmail(text);
    },
    [debouncedValidateEmail]
  );

  // Clear errors when component unmounts
  useEffect(
    () => () => {
      resetMagicLink();
    },
    [resetMagicLink]
  );

  // Log screen view
  useEffect(() => {
    // Analytics disabled
  }, []);

  // 🚀 TOAST INTEGRATION: Enhanced magic link login with complementary toast notifications
  const handleSendMagicLink = useCallback(async () => {
    if (!canSendMagicLink()) {
      showWarning(t('auth.login.toasts.rateLimit'));
      return;
    }

    // Simple email validation
    if (!email || !email.includes('@')) {
      showError(t('auth.login.toasts.invalidEmail'));
      return;
    }

    try {
      await sendMagicLink(
        {
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
          },
        },
        // Success callback - this will be called when magic link is sent successfully
        (message: string) => {
          showSuccess(message);
          logger.debug('Magic link sent successfully with UI feedback');
        },
        // Error callback - this will be called if there's an error
        (error: Error) => {
          showError(error.message);
          logger.error('Magic link send failed with UI feedback:', error);
        }
      );
    } catch (error) {
      // This catch is for any remaining unhandled errors
      logger.error('Magic link send failed in UI catch block:', error as Error);
    }
  }, [email, canSendMagicLink, sendMagicLink, showWarning, showError, showSuccess, t]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    if (!canAttemptGoogleSignIn) {
      showWarning(t('auth.login.toasts.googleNotReady'));
      return;
    }

    try {
      // Analytics disabled
      setIsWaitingForOAuthCallback(true);

      // Use the unified auth actions
      await signInWithGoogle();

      // The result handling is done in the store, but we need to manage UI state
      setIsWaitingForOAuthCallback(false);
    } catch (error) {
      setIsWaitingForOAuthCallback(false);
      // Only log actual errors, not the normal OAuth callback flow
      if (error instanceof Error && error.message !== 'OAUTH_CALLBACK_REQUIRED') {
        logger.error('Google OAuth error in UI:', error as Error);
      }
    }
  }, [canAttemptGoogleSignIn, signInWithGoogle, showWarning, t]);

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
      // Analytics disabled
      setIsWaitingForOAuthCallback(true);
      await signInWithApple();
      setIsWaitingForOAuthCallback(false);
    } catch (error) {
      setIsWaitingForOAuthCallback(false);
      if (error instanceof Error && error.message !== 'OAUTH_CALLBACK_REQUIRED') {
        logger.error('Apple OAuth error in UI:', error as Error);
      }
    }
  }, [canAttemptAppleSignIn, signInWithApple, showWarning, t]);

  // Animated styles
  const headerAnimatedStyle = useMemo(
    () => ({ opacity: animations.fadeAnim, transform: animations.entranceTransform }),
    [animations.fadeAnim, animations.entranceTransform]
  );
  const mainFadeStyle = useMemo(() => ({ opacity: animations.fadeAnim }), [animations.fadeAnim]);
  const pressTransformStyle = useMemo(
    () => ({ transform: animations.pressTransform }),
    [animations.pressTransform]
  );
  const helpSectionAnimatedStyle = useMemo(
    () => ({ height: animations.heightAnim, opacity: animations.opacityAnim }),
    [animations.heightAnim, animations.opacityAnim]
  );

  // **SIMPLIFIED HEADER**: Using minimal fade and scale only
  const renderHeader = () => (
    <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
      <View style={styles.brandContainer}>
        <View style={styles.brandIcon}>
          <Ionicons name="leaf" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.brandText}>{t('auth.login.brand')}</Text>
      </View>
      <Text style={styles.welcomeTitle}>
        {magicLinkSent ? t('auth.login.magicLinkSentTitle') : t('auth.login.welcome')}
      </Text>
      <Text style={styles.welcomeSubtitle}>
        {magicLinkSent ? t('auth.login.magicLinkSentDesc') : t('auth.login.continueJourney')}
      </Text>
    </Animated.View>
  );

  // **SIMPLIFIED MAIN CONTENT**: Separated transform and layout animations
  const renderMainContent = () => (
    <View style={styles.mainContent}>
      {/* Outer wrapper for layout animations */}
      <Animated.View style={mainFadeStyle}>
        {/* Inner wrapper for transform animations */}
        <Animated.View style={pressTransformStyle}>
          <ThemedCard style={styles.contentCard}>
            <View style={styles.cardInner}>
              {!magicLinkSent && (
                <>
                  {/* Trust Indicators */}
                  <View style={styles.trustSection}>
                    <View style={styles.trustBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
                      <Text style={styles.trustText}>{t('auth.login.secure.trust1')}</Text>
                    </View>
                    <View style={styles.trustBadge}>
                      <Ionicons name="lock-closed" size={14} color={theme.colors.success} />
                      <Text style={styles.trustText}>{t('auth.login.secure.trust2')}</Text>
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputSection}>
                    <ThemedInput
                      label={t('auth.login.labels.email')}
                      value={email}
                      onChangeText={handleEmailChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      errorText={emailError}
                      leftIcon="mail"
                      editable={!isLoading}
                      validationState={isEmailValid ? 'success' : 'default'}
                      showValidationIcon={email.length > 0}
                      placeholder={t('auth.login.labels.emailPlaceholder')}
                    />
                  </View>

                  {/* Login Button */}
                  <ThemedButton
                    title={
                      isLoading ? t('auth.login.buttons.sending') : t('auth.login.buttons.send')
                    }
                    onPress={handleSendMagicLink}
                    variant="primary"
                    isLoading={isLoading}
                    disabled={isLoading || !email.trim() || !canSendMagicLink() || !isEmailValid}
                    style={styles.loginButton}
                    fullWidth
                  />

                  {/* Social OAuth Section */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.login.divider.or')}</Text>
                    <View style={styles.dividerLine} />
                  </View>

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
                    fullWidth
                  />

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
                      style={styles.googleButton}
                      fullWidth
                    />
                  )}

                  {/* OAuth Callback Waiting Indicator */}
                  {isWaitingForOAuthCallback && (
                    <View style={styles.oauthCallbackIndicator}>
                      <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.oauthCallbackText}>
                        {t('auth.login.oauth.browserReturnInstruction')}
                      </Text>
                    </View>
                  )}

                  {/* Help Section Toggle */}
                  <ThemedButton
                    title={
                      showHelpSection
                        ? t('auth.login.secure.toggleHelp.hide')
                        : t('auth.login.secure.toggleHelp.show')
                    }
                    variant="ghost"
                    onPress={toggleHelpSection}
                    style={styles.helpToggle}
                    iconLeft={showHelpSection ? 'chevron-up' : 'help-circle-outline'}
                    size="compact"
                  />

                  {/* **SIMPLIFIED HELP SECTION**: Using layout transition animation */}
                  <Animated.View style={[styles.helpSection, helpSectionAnimatedStyle]}>
                    <View style={styles.helpContent}>
                      <Text style={styles.helpTitle}>{t('auth.login.secure.helpTitle')}</Text>
                      <Text style={styles.helpText}>{t('auth.login.secure.helpDesc')}</Text>
                    </View>
                  </Animated.View>
                </>
              )}

              {/* Success State */}
              {magicLinkSent && (
                <View style={styles.successSection}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                  </View>
                  <Text style={styles.successTitle}>{t('auth.login.magicLinkSentTitle')}</Text>
                  <Text style={styles.successMessage}>{t('auth.login.magicLinkSentDesc')}</Text>
                  <ThemedButton
                    title={t('auth.login.buttons.resend')}
                    variant="secondary"
                    onPress={handleSendMagicLink}
                    disabled={!canSendMagicLink()}
                    style={styles.resendButton}
                  />
                </View>
              )}
            </View>
          </ThemedCard>
        </Animated.View>
      </Animated.View>
    </View>
  );

  return (
    <ScreenLayout
      scrollable={true}
      keyboardAware={true}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      backgroundColor={theme.colors.background}
      statusBarStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
      contentContainerStyle={styles.safeContainer}
    >
      {renderHeader()}

      <View style={styles.contentArea}>{renderMainContent()}</View>
    </ScreenLayout>
  );
});

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    // **SAFE CONTENT CONTAINER**: Applies safe area insets and spacing
    safeContainer: {
      flexGrow: 1,
      paddingTop: insets.top + theme.spacing.lg,
      paddingBottom: insets.bottom + theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    container: {
      flex: 1,
      paddingTop: insets.top + theme.spacing.lg,
      paddingBottom: insets.bottom + theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },

    // Header section
    headerSection: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    brandIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: `${theme.colors.primary}12`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    brandIconImage: {
      width: 24,
      height: 24,
    },
    brandText: {
      ...theme.typography.headlineMedium,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    welcomeTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    welcomeSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },

    // Content area
    contentArea: {
      flex: 1,
      justifyContent: 'center',
      minHeight: screenHeight * 0.5,
    },

    // Main content card
    mainContent: {
      marginBottom: theme.spacing.xl,
    },
    contentCard: {
      backgroundColor:
        theme.name === 'dark' ? `${theme.colors.surface}95` : `${theme.colors.surface}98`,
      borderWidth: 1,
      borderColor:
        theme.name === 'dark' ? `${theme.colors.outline}25` : `${theme.colors.outline}30`,
      ...getPrimaryShadow.medium(theme),
    },
    cardInner: {
      padding: theme.spacing.xl,
    },

    // Trust indicators
    trustSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    trustBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: `${theme.colors.success}10`,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: `${theme.colors.success}25`,
    },
    trustText: {
      ...theme.typography.labelMedium,
      color: theme.colors.success,
      fontWeight: '600',
    },

    // Form elements
    inputSection: {
      marginBottom: theme.spacing.xl,
    },
    loginButton: {
      marginTop: theme.spacing.md,
      minHeight: 52, // Increased for better text accommodation
      ...getPrimaryShadow.small(theme),
    },
    helpToggle: {
      marginTop: theme.spacing.lg,
      alignSelf: 'center',
      minWidth: 200, // Ensure enough width for Turkish text
      paddingHorizontal: theme.spacing.md,
    },
    helpSection: {
      overflow: 'hidden',
      marginTop: theme.spacing.md,
    },
    helpContent: {
      padding: theme.spacing.md,
      backgroundColor: `${theme.colors.primary}06`,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}15`,
    },
    helpTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
      fontWeight: '600',
    },
    helpText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },

    // Success state
    successSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    successIcon: {
      marginBottom: theme.spacing.lg,
    },
    successTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.success,
      fontWeight: '700',
      marginBottom: theme.spacing.md,
    },
    successMessage: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontWeight: '500',
    },
    resendButton: {
      ...getPrimaryShadow.small(theme),
    },

    // Error state
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    errorIconContainer: {
      marginTop: 1,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      flex: 1,
      lineHeight: 18,
    },

    // Google section
    googleSection: {
      paddingTop: theme.spacing.md,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: `${theme.colors.outline}40`,
    },
    dividerText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.xs,
    },
    googleButton: {
      backgroundColor:
        theme.name === 'dark' ? `${theme.colors.surface}90` : `${theme.colors.surface}95`,
      borderColor: `${theme.colors.outline}30`,
      minHeight: 52, // Increased for better text accommodation
      ...getPrimaryShadow.small(theme),
    },
    oauthCallbackIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: `${theme.colors.primary}08`,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}20`,
    },
    oauthCallbackText: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary,
      flex: 1,
      lineHeight: 18,
      fontWeight: '500',
    },
  });

LoginScreen.displayName = 'LoginScreen';

export default LoginScreen;
