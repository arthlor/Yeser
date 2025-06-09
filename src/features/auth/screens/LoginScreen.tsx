// src/features/auth/screens/LoginScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Animated,
  Dimensions,
  Easing, 
  Keyboard, 
  Platform,
  StyleSheet, 
  Text, 
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ScreenLayout } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { magicLinkSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import { NetworkDiagnostics } from '@/components/debug/NetworkDiagnostics';

const { height: screenHeight } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * 🌟 POLISHED EDGE-TO-EDGE LOGIN SCREEN
 * Clean, spacious authentication experience with proper text sizing and layout
 */
const LoginScreen: React.FC<Props> = React.memo(({ navigation: _navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  
  const { 
    loginWithMagicLink, 
    loginWithGoogle, 
    isLoading, 
    error, 
    magicLinkSent,
    canSendMagicLink,
    clearError,
    resetMagicLinkSent
  } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [showHelpSection, setShowHelpSection] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardSlideAnim = useRef(new Animated.Value(30)).current;
  const successPulseAnim = useRef(new Animated.Value(1)).current;
  const helpSlideAnim = useRef(new Animated.Value(0)).current;

  // Help section height calculation
  const helpHeight = useMemo(() => {
    return helpSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 100], // Adjust this value based on your help content height
    });
  }, [helpSlideAnim]);

  // Start entrance animation on mount
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: 500,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, cardSlideAnim]);

  // Success pulse animation
  useEffect(() => {
    if (magicLinkSent) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Animated.sequence([
        Animated.spring(successPulseAnim, {
          toValue: 1.02,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.spring(successPulseAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
      ]).start();
    }
  }, [magicLinkSent, successPulseAnim]);

  // Help section animation
  const toggleHelpSection = useCallback(() => {
    const toValue = showHelpSection ? 0 : 1;
    setShowHelpSection(!showHelpSection);
    
    Animated.timing(helpSlideAnim, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [showHelpSection, helpSlideAnim]);

  // Real-time email validation
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailError(undefined);
    
    if (text.length > 0) {
      const isValid = magicLinkSchema.safeParse({ email: text }).success;
      setIsEmailValid(isValid);
    } else {
      setIsEmailValid(false);
    }
  }, []);

  // Clear errors when component unmounts
  useEffect(() => () => {
    clearError();
    resetMagicLinkSent();
  }, [clearError, resetMagicLinkSent]);

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('login');
  }, []);

  // Handle magic link login
  const handleMagicLinkLogin = useCallback(async () => {
    Keyboard.dismiss();

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setEmailError(undefined);

    if (!canSendMagicLink()) {
      setEmailError('Çok sık deneme yapıyorsunuz. Lütfen bir süre bekleyin.');
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    const validationResult = magicLinkSchema.safeParse({ email });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      if (fieldErrors.email) {
        setEmailError(fieldErrors.email[0]);
        if (Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
      return;
    }

    clearError();
    analyticsService.logEvent('magic_link_request');
    
    await loginWithMagicLink({
      email: validationResult.data.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'yeserapp://auth/confirm',
      },
    });
  }, [email, canSendMagicLink, clearError, loginWithMagicLink]);

  // Handle Google login
  const handleGoogleLogin = useCallback(async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    clearError();
    analyticsService.logEvent('google_auth_attempt');
    
    await loginWithGoogle();
  }, [clearError, loginWithGoogle]);

  // Gradient colors based on theme
  const gradientColors = useMemo(() => {
    if (theme.name === 'dark') {
      return [
        `${theme.colors.primary}15`,
        `${theme.colors.secondary}08`,
        `${theme.colors.background}95`,
      ] as const;
    }
    return [
      `${theme.colors.primary}08`,
      `${theme.colors.secondary}05`,
      `${theme.colors.background}98`,
    ] as const;
  }, [theme]);

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
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
          : 'Minnet yolculuğunuza devam edin'
        }
      </Text>
    </Animated.View>
  );

  const renderMainContent = () => (
    <Animated.View 
      style={[
        styles.mainContent,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: cardSlideAnim },
            { scale: successPulseAnim },
          ],
        },
      ]}
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
                title={showHelpSection ? "Yardımı Gizle" : "Güvenli Link Nedir?"}
                variant="ghost"
                onPress={toggleHelpSection}
                style={styles.helpToggle}
                iconLeft={showHelpSection ? "chevron-up" : "help-circle-outline"}
                size="compact"
              />

              {/* Collapsible Help Section */}
              <Animated.View 
                style={[
                  styles.helpSection,
                  { height: helpHeight }
                ]}
              >
                <View style={styles.helpContent}>
                  <Text style={styles.helpTitle}>🔒 Güvenli ve Kolay</Text>
                  <Text style={styles.helpText}>
                    Güvenli link ile şifre hatırlamaya gerek yok. E-postanıza özel bir bağlantı 
                    gönderiyoruz, tıklayıp güvenle giriş yapabilirsiniz.
                  </Text>
                </View>
              </Animated.View>
            </>
          )}

          {magicLinkSent && (
            <View style={styles.successContent}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
              </View>
              <Text style={styles.successTitle}>Başarılı!</Text>
              <Text style={styles.successMessage}>
                {email} adresine giriş bağlantısı gönderildi.
              </Text>
              <Text style={styles.successInstructions}>
                E-postanızı açın ve "Giriş Yap" butonuna tıklayın.
              </Text>
              
              <ThemedButton
                title="Yeni E-posta Gönder"
                variant="outline"
                onPress={() => {
                  resetMagicLinkSent();
                  setEmail('');
                  setIsEmailValid(false);
                }}
                style={styles.resendButton}
                iconLeft="refresh"
              />
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={18} color={theme.colors.onErrorContainer} />
              </View>
              <Text style={styles.errorText}>{safeErrorDisplay(error)}</Text>
            </View>
          )}
        </View>
      </ThemedCard>
    </Animated.View>
  );

  const renderGoogleSection = () => (
    <Animated.View 
      style={[
        styles.googleSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: cardSlideAnim }],
        },
      ]}
    >
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.dividerLine} />
      </View>

      <ThemedButton
        title="Google ile Giriş Yap"
        variant="outline"
        onPress={handleGoogleLogin}
        isLoading={isLoading}
        disabled={isLoading}
        style={styles.googleButton}
        iconLeft="google"
        fullWidth
      />
    </Animated.View>
  );

  return (
    <ScreenLayout edgeToEdge scrollable showStatusBar={false}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.container}>
          {renderHeader()}
          
          <View style={styles.contentArea}>
            {renderMainContent()}
            {!magicLinkSent && renderGoogleSection()}
            {__DEV__ && <NetworkDiagnostics />}
          </View>
        </View>
      </LinearGradient>
    </ScreenLayout>
  );
});

const createStyles = (
  theme: AppTheme, 
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    gradientBackground: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingTop: insets.top + theme.spacing.lg,
      paddingBottom: insets.bottom + theme.spacing.lg,
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
      paddingHorizontal: theme.spacing.lg,
      minHeight: screenHeight * 0.5,
    },

    // Main content card
    mainContent: {
      marginBottom: theme.spacing.xl,
    },
    contentCard: {
      backgroundColor: theme.name === 'dark' 
        ? `${theme.colors.surface}95` 
        : `${theme.colors.surface}98`,
      borderWidth: 1,
      borderColor: theme.name === 'dark'
        ? `${theme.colors.outline}25`
        : `${theme.colors.outline}30`,
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
    successContent: {
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
    successInstructions: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 20,
      paddingHorizontal: theme.spacing.md,
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
      paddingHorizontal: 0,
    },
    dividerContainer: {
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
      backgroundColor: theme.name === 'dark' 
        ? `${theme.colors.surface}90` 
        : `${theme.colors.surface}95`,
      borderColor: `${theme.colors.outline}30`,
      minHeight: 52, // Increased for better text accommodation
      ...getPrimaryShadow.small(theme),
    },
  });

LoginScreen.displayName = 'LoginScreen';

export default LoginScreen;
