// src/screens/EnhancedLoginScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { loginSchema } from '../schemas/authSchemas';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  KeyboardAvoidingView, // Added
  Platform,
  StyleSheet,
  ScrollView, // Added for content scrolling if needed
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ErrorState from '../components/states/ErrorState';
import LoadingState from '../components/states/LoadingState';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import ThemedInput from '../components/ThemedInput';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { AppTheme } from '../themes/types';
import { AuthStackParamList, RootStackParamList } from '../types/navigation';

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Login'
>;

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
  const { loginWithEmail, loginWithGoogle, isLoading, error, clearError } =
    useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined
  );
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
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
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

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
    setLoginAttempts(prev => prev + 1);

    try {
      analyticsService.logEvent('login_attempt', { method: 'email' });
      await loginWithEmail({ email, password }); // Use validated data: validationResult.data.email, validationResult.data.password
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
    setLoginAttempts(prev => prev + 1);

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
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('PrivacyPolicy');
  }, [navigation]);

  // Navigate to password reset (placeholder for future implementation)
  const navigateToPasswordReset = useCallback(() => {
    Alert.alert(
      'Şifre Sıfırlama',
      'Şifre sıfırlama özelliği yakında eklenecektir.',
      [{ text: 'Tamam', style: 'default' }]
    );
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
        style={styles.keyboardAvoidingView} // Use dedicated style
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Added offset
      >
        <ScrollView contentContainerStyle={styles.container}> {/* Inner ScrollView with container style */}
          <Text style={styles.title} accessibilityRole="header">
          Yeşer'e Hoş Geldin!
        </Text>

        <Text style={styles.subtitle} accessibilityRole="text">
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
        </View> {/* Closes accessibleFormContainer */}
        </ScrollView> {/* Closes ScrollView */}
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
      <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="leaf-outline"
              size={64}
              color={theme.colors.primary}
              accessibilityLabel="Yeşer logo"
            />
          </View>

          <Text style={styles.title} accessibilityRole="header">
            Yeşer'e Hoş Geldin!
          </Text>

          <Text style={styles.subtitle} accessibilityRole="text">
            Minnettarlık yolculuğuna başla.
          </Text>

          <ThemedCard variant="elevated" style={styles.formCard}>
            <ThemedInput
              label="E-posta Adresiniz"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              startIcon={
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              }
              accessibilityLabel="E-posta adresi giriş alanı"
              accessibilityHint="E-posta adresinizi girin"
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
                  color={theme.colors.textSecondary}
                />
              }
              accessibilityLabel="Şifre giriş alanı"
              accessibilityHint="Şifrenizi girin"
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
              style={styles.button}
              accessibilityLabel="E-posta ile giriş yap butonu"
            />

            <TouchableOpacity
              onPress={navigateToPasswordReset}
              activeOpacity={0.7}
              accessibilityLabel="Şifremi unuttum"
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          </ThemedCard>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtonContainer}>
            <Ionicons
              name="logo-google"
              size={20}
              color={theme.colors.primary}
              style={styles.socialButtonIcon}
            />
            <ThemedButton
              title="Google ile Giriş Yap"
              onPress={handleGoogleLogin}
              variant="secondary"
              style={styles.socialButton}
              accessibilityLabel="Google ile giriş yap butonu"
            />
          </View>

          {!isKeyboardVisible && (
            <View style={styles.footerContainer}>
              <TouchableOpacity
                onPress={navigateToSignUp}
                activeOpacity={0.7}
                style={styles.footerLink}
                accessibilityLabel="Hesap oluşturma sayfasına git"
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Hesabın yok mu?</Text>
                <Text style={styles.linkTextBold}>Kaydol</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={navigateToPrivacyPolicy}
                activeOpacity={0.7}
                style={styles.footerLink}
                accessibilityLabel="Gizlilik politikası sayfasına git"
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Gizlilik Politikası</Text>
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    // ...
    keyboardAvoidingView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1, // Changed to flexGrow for ScrollView content
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.large,
      paddingVertical: theme.spacing.medium, // Added vertical padding for scroll content
    },
    logoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.large,
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      marginBottom: theme.spacing.small,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body1,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.large,
      textAlign: 'center',
    },
    formCard: {
      width: '100%',
      marginBottom: theme.spacing.large,
      padding: theme.spacing.medium,
    },
    errorText: {
      ...theme.typography.caption,
      color: theme.colors.error,
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
    },
    button: {
      width: '100%',
      marginTop: theme.spacing.medium,
      marginBottom: theme.spacing.small,
    },
    socialButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: theme.spacing.medium,
    },
    socialButtonIcon: {
      marginRight: theme.spacing.small,
    },
    socialButton: {
      flex: 1,
      marginBottom: theme.spacing.medium,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '80%',
      marginVertical: theme.spacing.medium,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: theme.spacing.medium,
      color: theme.colors.textSecondary,
      ...theme.typography.caption,
    },
    footerContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 40 : 20,
      width: '100%',
      alignItems: 'center',
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.small,
    },
    linkText: {
      color: theme.colors.textSecondary,
      ...theme.typography.body2,
      marginRight: theme.spacing.small,
    },
    linkTextBold: {
      color: theme.colors.primary,
      ...theme.typography.body2,
      fontWeight: 'bold',
    },
    forgotPasswordText: {
      color: theme.colors.primary,
      ...theme.typography.body2,
      textAlign: 'center',
      marginTop: theme.spacing.small,
    },
    // Accessible styles for screen readers
    accessibleFormContainer: {
      width: '100%',
      marginVertical: theme.spacing.large,
    },
    accessibleButton: {
      marginBottom: theme.spacing.medium,
      width: '100%',
    },
  });
};

export default EnhancedLoginScreen;
