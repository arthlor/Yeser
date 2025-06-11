import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { getPrimaryShadow } from '@/themes/utils';
import { magicLinkSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';

const { height: screenHeight } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * 🌟 POLISHED EDGE-TO-EDGE LOGIN SCREEN
 * Clean, spacious authentication experience with proper text sizing and layout
 *
 * **SIMPLIFIED ANIMATION SYSTEM**: Using minimal, non-intrusive animations
 * with 4 essential values: fadeAnim, scaleAnim, opacityAnim, heightAnim
 *
 * **TOAST INTEGRATION**: Auth errors now show as toasts instead of inline display.
 * Only field validation errors (emailError) show inline for immediate feedback.
 */
const LoginScreen: React.FC<Props> = React.memo(({ navigation: _navigation }) => {
  const { theme } = useTheme();
  const { showWarning, showError } = useToast();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const {
    loginWithMagicLink,
    loginWithGoogle,
    isLoading,
    magicLinkSent,
    canSendMagicLink,
    resetMagicLinkSent,
  } = useAuthStore();

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

  // **MINIMAL SUCCESS FEEDBACK**: Simple fade effect instead of celebration
  useEffect(() => {
    if (magicLinkSent) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Simple fade effect instead of complex celebration
      animations.animateFade(0.9, { duration: 200 });
      setTimeout(() => {
        animations.animateFade(1, { duration: 200 });
      }, 300);
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
      resetMagicLinkSent();
    },
    [resetMagicLinkSent]
  );

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('login');
  }, []);

  // 🚀 TOAST INTEGRATION: Enhanced magic link login with complementary toast notifications
  const handleMagicLinkLogin = useCallback(async () => {
    Keyboard.dismiss();

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setEmailError(undefined);

    if (!canSendMagicLink()) {
      // Keep inline error for immediate visibility + toast for emphasis
      setEmailError('Çok sık deneme yapıyorsunuz. Lütfen bir süre bekleyin.');
      // 🚀 TOAST INTEGRATION: Add toast warning for rate limiting
      showWarning('Çok sık giriş denemesi yapıyorsunuz. Lütfen 1 dakika bekleyip tekrar deneyin.', {
        duration: 5000,
      });
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    const validationResult = magicLinkSchema.safeParse({ email });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      if (fieldErrors.email) {
        // Keep inline error for immediate feedback
        setEmailError(fieldErrors.email[0]);
        // 🚀 TOAST INTEGRATION: Add toast error for validation failure
        showError('Lütfen geçerli bir email adresi girin');
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
      return;
    }

    analyticsService.logEvent('magic_link_request');

    await loginWithMagicLink({
      email: validationResult.data.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'yeserapp://auth/confirm',
      },
    });
  }, [email, canSendMagicLink, loginWithMagicLink, showWarning, showError]);

  // Handle Google login
  const handleGoogleLogin = useCallback(async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    analyticsService.logEvent('google_auth_attempt');

    await loginWithGoogle();
  }, [loginWithGoogle]);

  // **ENHANCED GRADIENT COLORS**: More visible and properly structured
  const gradientColors = useMemo(() => {
    if (theme.name === 'dark') {
      return [
        `${theme.colors.primary}25`,
        `${theme.colors.secondary}18`,
        `${theme.colors.background}85`,
        theme.colors.background,
      ] as const;
    }
    return [
      `${theme.colors.primary}15`,
      `${theme.colors.secondary}12`,
      `${theme.colors.background}90`,
      theme.colors.background,
    ] as const;
  }, [theme]);

  // **SIMPLIFIED HEADER**: Using minimal fade and scale only
  const renderHeader = () => (
    <Animated.View
      style={[
        styles.headerSection,
        {
          opacity: animations.fadeAnim,
          transform: animations.entranceTransform,
        },
      ]}
    >
      <View style={styles.brandContainer}>
        <View style={styles.brandIcon}>
          <Ionicons name="leaf" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.brandText}>Yeşer</Text>
      </View>
      <Text style={styles.welcomeTitle}>
        {magicLinkSent ? 'Giriş Bağlantısı Gönderildi!' : 'Hoş Geldiniz!'}
      </Text>
      <Text style={styles.welcomeSubtitle}>
        {magicLinkSent
          ? 'E-postanızı kontrol edin ve giriş bağlantısına tıklayın.'
          : 'Minnet yolculuğunuza devam edin'}
      </Text>
    </Animated.View>
  );

  // **SIMPLIFIED MAIN CONTENT**: Separated transform and layout animations
  const renderMainContent = () => (
    <View style={styles.mainContent}>
      {/* Outer wrapper for layout animations */}
      <Animated.View
        style={{
          opacity: animations.fadeAnim,
        }}
      >
        {/* Inner wrapper for transform animations */}
        <Animated.View
          style={{
            transform: animations.pressTransform,
          }}
        >
          <ThemedCard style={styles.contentCard}>
            <View style={styles.cardInner}>
              {!magicLinkSent && (
                <>
                  {/* Trust Indicators */}
                  <View style={styles.trustSection}>
                    <View style={styles.trustBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
                      <Text style={styles.trustText}>Güvenli Giriş</Text>
                    </View>
                    <View style={styles.trustBadge}>
                      <Ionicons name="lock-closed" size={14} color={theme.colors.success} />
                      <Text style={styles.trustText}>Şifresiz</Text>
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputSection}>
                    <ThemedInput
                      label="E-posta Adresi"
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
                      placeholder="ornek@email.com"
                    />
                  </View>

                  {/* Login Button */}
                  <ThemedButton
                    title={isLoading ? 'Gönderiliyor...' : 'Giriş Bağlantısı Gönder'}
                    onPress={handleMagicLinkLogin}
                    variant="primary"
                    isLoading={isLoading}
                    disabled={isLoading || !email.trim() || !canSendMagicLink() || !isEmailValid}
                    style={styles.loginButton}
                    fullWidth
                  />

                  {/* Help Section Toggle */}
                  <ThemedButton
                    title={showHelpSection ? 'Yardımı Gizle' : 'Güvenli Link Nedir?'}
                    variant="ghost"
                    onPress={toggleHelpSection}
                    style={styles.helpToggle}
                    iconLeft={showHelpSection ? 'chevron-up' : 'help-circle-outline'}
                    size="compact"
                  />

                  {/* **SIMPLIFIED HELP SECTION**: Using layout transition animation */}
                  <Animated.View
                    style={[
                      styles.helpSection,
                      {
                        height: animations.heightAnim,
                        opacity: animations.opacityAnim,
                      },
                    ]}
                  >
                    <View style={styles.helpContent}>
                      <Text style={styles.helpTitle}>🔒 Güvenli ve Kolay</Text>
                      <Text style={styles.helpText}>
                        Güvenli link ile şifre hatırlamaya gerek yok. E-postanıza özel bir bağlantı
                        gönderiyoruz.
                      </Text>
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
                  <Text style={styles.successTitle}>Başarılı!</Text>
                  <Text style={styles.successMessage}>
                    E-posta adresinizi kontrol edin ve güvenli giriş bağlantısına tıklayın.
                  </Text>
                  <ThemedButton
                    title="Tekrar Gönder"
                    variant="secondary"
                    onPress={handleMagicLinkLogin}
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

  // **SIMPLIFIED GOOGLE SECTION**: Basic fade animation
  const renderGoogleSection = () => (
    <Animated.View
      style={[
        styles.googleSection,
        {
          opacity: animations.fadeAnim,
        },
      ]}
    >
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.dividerLine} />
      </View>

      <ThemedButton
        title="Google ile Devam Et"
        onPress={handleGoogleLogin}
        variant="secondary"
        iconLeft="google"
        disabled={isLoading}
        style={styles.googleButton}
        fullWidth
      />
    </Animated.View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.fullScreenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.safeContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader()}

        <View style={styles.contentArea}>
          {renderMainContent()}
          {!magicLinkSent && renderGoogleSection()}
        </View>
      </ScrollView>
    </LinearGradient>
  );
});

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    // **FULL SCREEN GRADIENT**: Covers entire screen
    fullScreenContainer: {
      flex: 1,
    },
    // **SCROLLABLE CONTAINER**: Enables scrolling while maintaining gradient
    scrollView: {
      flex: 1,
    },
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
  });

LoginScreen.displayName = 'LoginScreen';

export default LoginScreen;
