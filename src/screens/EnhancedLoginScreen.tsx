// src/screens/EnhancedLoginScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';

import ErrorState from '../components/states/ErrorState';
import LoadingState from '../components/states/LoadingState';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import ThemedInput from '../components/ThemedInput';
import { useTheme } from '../providers/ThemeProvider';
import { loginSchema } from '../schemas/authSchemas';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { AppTheme } from '../themes/types';
import { AuthStackParamList, RootStackParamList } from '../types/navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * EnhancedLoginScreen provides a beautiful and accessible login experience
 * with animations, proper error handling, and themed components.
 */
const EnhancedLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { loginWithEmail, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const formSlideAnim = useRef(new Animated.Value(100)).current;

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();

    // Subscribe to screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      // Animate logo scale down when keyboard shows
      Animated.timing(logoScaleAnim, {
        toValue: 0.6,
        duration: theme.animations.duration?.normal || 300,
        useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // Animate logo scale back when keyboard hides
      Animated.timing(logoScaleAnim, {
        toValue: 0.8,
        duration: theme.animations.duration?.normal || 300,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [logoScaleAnim, theme.animations.duration]);

  // Initial entrance animations
  useEffect(() => {
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animations.duration?.slow || 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: theme.animations.duration?.slow || 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: theme.animations.duration?.slow || 500,
          useNativeDriver: true,
        }),
        Animated.timing(formSlideAnim, {
          toValue: 0,
          duration: theme.animations.duration?.slow || 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateEntrance();
  }, [fadeAnim, slideAnim, logoScaleAnim, formSlideAnim, theme.animations.duration]);

  // Clear errors when component unmounts
  useEffect(
    () => () => {
      clearError();
    },
    [clearError]
  );

  // Handle login with email
  const handleEmailLogin = useCallback(async () => {
    Keyboard.dismiss();

    // Reset previous errors
    setEmailError(undefined);
    setPasswordError(undefined);

    const validationResult = loginSchema.safeParse({ email, password });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      if (fieldErrors.email) {
        setEmailError(fieldErrors.email[0]);
      }
      if (fieldErrors.password) {
        setPasswordError(fieldErrors.password[0]);
      }
      return;
    }

    clearError();
    setLoginAttempts((prev) => prev + 1);

    try {
      analyticsService.logEvent('login_attempt', { method: 'email' });
      await loginWithEmail(validationResult.data);
      analyticsService.logEvent('login_success', { method: 'email' });
    } catch {
      analyticsService.logEvent('login_failure', {
        method: 'email',
        attempts: loginAttempts + 1,
      });
    }
  }, [email, password, clearError, loginWithEmail, loginAttempts]);

  // Handle login with Google
  const handleGoogleLogin = useCallback(async () => {
    clearError();
    setLoginAttempts((prev) => prev + 1);

    try {
      analyticsService.logEvent('login_attempt', { method: 'google' });
      await loginWithGoogle();
      analyticsService.logEvent('login_success', { method: 'google' });
    } catch {
      analyticsService.logEvent('login_failure', {
        method: 'google',
        attempts: loginAttempts + 1,
      });
    }
  }, [clearError, loginWithGoogle, loginAttempts]);

  // Navigate to sign up screen
  const navigateToSignUp = useCallback(() => {
    analyticsService.logEvent('navigate_to_signup_from_login');
    navigation.navigate('SignUp');
  }, [navigation]);

  // Navigate to privacy policy
  const navigateToPrivacyPolicy = useCallback(() => {
    analyticsService.logEvent('navigate_to_privacy_from_login');
    navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate('PrivacyPolicy');
  }, [navigation]);

  // Navigate to password reset (placeholder for future implementation)
  const navigateToPasswordReset = useCallback(() => {
    Alert.alert('Şifre Sıfırlama', 'Şifre sıfırlama özelliği yakında eklenecektir.', [
      { text: 'Tamam', style: 'default' },
    ]);
    analyticsService.logEvent('password_reset_attempted');
  }, []);

  // Show loading state if authenticating
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState message="Giriş yapılıyor..." />
      </View>
    );
  }

  // Render screen reader optimized version
  if (isScreenReaderEnabled) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.accessibleContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.accessibleTitle} accessibilityRole="header">
            Yeşer'e Hoş Geldin!
          </Text>

          <Text style={styles.accessibleSubtitle} accessibilityRole="text">
            Minnettarlık yolculuğuna başla.
          </Text>

          <View style={styles.accessibleFormContainer}>
            <ThemedInput
              label="E-posta Adresiniz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              accessibilityLabel="E-posta adresi giriş alanı"
              accessibilityHint="E-posta adresinizi girin"
            />

            <ThemedInput
              label="Şifreniz"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={passwordError}
              accessibilityLabel="Şifre giriş alanı"
              accessibilityHint="Şifrenizi girin"
            />

            {error && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            )}

            <ThemedButton
              title="Giriş Yap"
              onPress={handleEmailLogin}
              variant="primary"
              style={styles.accessibleButton}
              accessibilityLabel="E-posta ile giriş yap butonu"
            />

            <ThemedButton
              title="Google ile Giriş Yap"
              onPress={handleGoogleLogin}
              variant="secondary"
              style={styles.accessibleButton}
              accessibilityLabel="Google ile giriş yap butonu"
            />

            <ThemedButton
              title="Hesap Oluştur"
              onPress={navigateToSignUp}
              variant="outline"
              style={styles.accessibleButton}
              accessibilityLabel="Hesap oluşturma sayfasına git"
            />

            <ThemedButton
              title="Şifremi Unuttum"
              onPress={navigateToPasswordReset}
              variant="ghost"
              style={styles.accessibleButton}
              accessibilityLabel="Şifre sıfırlama sayfasına git"
            />

            <ThemedButton
              title="Gizlilik Politikası"
              onPress={navigateToPrivacyPolicy}
              variant="ghost"
              style={styles.accessibleButton}
              accessibilityLabel="Gizlilik politikası sayfasına git"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Render standard version with animations
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScaleAnim }],
              },
            ]}
          >
            <View style={styles.logoBackground}>
              <Ionicons
                name="leaf-outline"
                size={isKeyboardVisible ? 48 : 64}
                color={theme.colors.primary}
                accessibilityLabel="Yeşer logo"
              />
            </View>
          </Animated.View>

          <Animated.Text
            style={[
              styles.title,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            accessibilityRole="header"
          >
            Yeşer'e Hoş Geldin!
          </Animated.Text>

          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            accessibilityRole="text"
          >
            Minnettarlık yolculuğuna başla.
          </Animated.Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formSection,
            {
              transform: [{ translateY: formSlideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <ThemedCard variant="elevated" elevation="lg" style={styles.formCard}>
            <View style={styles.formContent}>
              <ThemedInput
                label="E-posta Adresiniz"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
                startIcon={
                  <Ionicons name="mail-outline" size={20} color={theme.colors.onSurfaceVariant} />
                }
                accessibilityLabel="E-posta adresi giriş alanı"
                accessibilityHint="E-posta adresinizi girin"
                containerStyle={styles.inputContainer}
              />

              <ThemedInput
                label="Şifreniz"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={passwordError}
                startIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
                accessibilityLabel="Şifre giriş alanı"
                accessibilityHint="Şifrenizi girin"
                containerStyle={styles.inputContainer}
              />

              {error && (
                <ErrorState
                  title="Giriş Hatası"
                  message={error}
                  onRetry={clearError}
                  icon="alert-circle-outline"
                />
              )}

              <ThemedButton
                title="Giriş Yap"
                onPress={handleEmailLogin}
                variant="primary"
                style={styles.primaryButton}
                accessibilityLabel="E-posta ile giriş yap butonu"
              />

              <TouchableOpacity
                onPress={navigateToPasswordReset}
                activeOpacity={0.7}
                style={styles.forgotPasswordContainer}
                accessibilityLabel="Şifremi unuttum"
                accessibilityRole="button"
              >
                <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
              </TouchableOpacity>
            </View>
          </ThemedCard>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          <ThemedCard variant="outlined" style={styles.socialCard}>
            <TouchableOpacity
              onPress={handleGoogleLogin}
              style={styles.socialButton}
              activeOpacity={0.7}
              accessibilityLabel="Google ile giriş yap butonu"
              accessibilityRole="button"
            >
              <View style={styles.socialButtonContent}>
                <Ionicons name="logo-google" size={24} color={theme.colors.primary} />
                <Text style={styles.socialButtonText}>Google ile Giriş Yap</Text>
              </View>
            </TouchableOpacity>
          </ThemedCard>
        </Animated.View>

        {!isKeyboardVisible && (
          <Animated.View
            style={[
              styles.footerContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <TouchableOpacity
              onPress={navigateToSignUp}
              activeOpacity={0.7}
              style={styles.footerLink}
              accessibilityLabel="Hesap oluşturma sayfasına git"
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Hesabın yok mu? </Text>
              <Text style={styles.linkTextBold}>Kaydol</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToPrivacyPolicy}
              activeOpacity={0.7}
              style={styles.footerLink}
              accessibilityLabel="Gizlilik politikası sayfasına git"
              accessibilityRole="button"
            >
              <Text style={styles.privacyText}>Gizlilik Politikası</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.large,
      paddingVertical: theme.spacing.medium,
    },
    headerContainer: {
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.large,
      paddingBottom: theme.spacing.large,
    },
    logoContainer: {
      marginBottom: theme.spacing.large,
    },
    logoBackground: {
      width: 100,
      height: 100,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.md,
      shadowColor: theme.colors.primary,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.small,
      textAlign: 'center',
      fontWeight: '700',
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
    },
    formSection: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    formCard: {
      width: '100%',
      marginBottom: theme.spacing.large,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
    },
    formContent: {
      padding: theme.spacing.medium,
    },
    inputContainer: {
      marginBottom: theme.spacing.medium,
    },
    primaryButton: {
      width: '100%',
      marginTop: theme.spacing.medium,
      marginBottom: theme.spacing.small,
      paddingVertical: theme.spacing.medium + 2,
      borderRadius: theme.borderRadius.medium,
      ...theme.elevation.xs,
    },
    forgotPasswordContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.small,
    },
    forgotPasswordText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.large,
      paddingHorizontal: theme.spacing.medium,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
    },
    dividerText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.small,
    },
    socialCard: {
      marginBottom: theme.spacing.large,
      borderRadius: theme.borderRadius.medium,
    },
    socialButton: {
      padding: theme.spacing.medium,
    },
    socialButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.small,
    },
    socialButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.medium,
      fontWeight: '600',
    },
    footerContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing.medium,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.large,
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.small,
      paddingVertical: theme.spacing.small,
    },
    linkText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
    linkTextBold: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    privacyText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textDecorationLine: 'underline',
    },

    // Accessible styles for screen readers
    accessibleContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.large,
      paddingVertical: theme.spacing.medium,
    },
    accessibleTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
    },
    accessibleSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    accessibleFormContainer: {
      width: '100%',
    },
    accessibleButton: {
      marginBottom: theme.spacing.medium,
      width: '100%',
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.error,
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
      padding: theme.spacing.medium,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.small,
    },
  });

export default EnhancedLoginScreen;
