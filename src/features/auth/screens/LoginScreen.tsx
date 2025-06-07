// src/features/auth/screens/LoginScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenContent, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { loginSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import * as authService from '@/services/authService';
import useAuthStore from '@/store/authStore';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList, RootStackParamList } from '@/types/navigation';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

/**
 * LoginScreen provides a clean and accessible login experience
 * with proper error handling and themed components.
 */
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { loginWithEmail, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Clear errors when component unmounts
  useEffect(
    () => () => {
      clearError();
    },
    [clearError]
  );

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('login');
  }, []);

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

      const result = await authService.signInWithGoogle();

      if (result.error) {
        if (result.error.name === 'AuthCancelledError') {
          // User cancelled OAuth - show friendly feedback
          Alert.alert(
            'Giriş İptal Edildi',
            'Google ile giriş işlemi iptal edildi. İstediğiniz zaman tekrar deneyebilirsiniz.',
            [{ text: 'Tamam', style: 'default' }],
            { cancelable: true }
          );
          analyticsService.logEvent('login_cancelled', { method: 'google' });
        } else {
          // Other OAuth errors will be handled by the auth store
          analyticsService.logEvent('login_failure', {
            method: 'google',
            attempts: loginAttempts + 1,
            error: result.error.message,
          });
        }
      } else if (result.user) {
        analyticsService.logEvent('login_success', { method: 'google' });
      }
    } catch (loginError) {
      analyticsService.logEvent('login_failure', {
        method: 'google',
        attempts: loginAttempts + 1,
      });
    }
  }, [clearError, loginAttempts]);

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

  return (
    <ScreenLayout keyboardAware={true} edges={['top']} density="comfortable" edgeToEdge={true}>
      <ScreenContent isLoading={isLoading} error={error} onRetry={clearError}>
        {/* Header Section */}
        <ScreenSection spacing="large">
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Ionicons
                  name="leaf-outline"
                  size={64}
                  color={theme.colors.primary}
                  accessibilityLabel="Yeşer logo"
                />
              </View>
            </View>

            <Text style={styles.title} accessibilityRole="header">
              Yeşer'e Hoş Geldin!
            </Text>

            <Text style={styles.subtitle} accessibilityRole="text">
              Minnettarlık yolculuğuna başla.
            </Text>
          </View>
        </ScreenSection>

        {/* Form Section */}
        <ScreenSection spacing="large">
          <ThemedCard
            variant="elevated"
            density="comfortable"
            elevation="card"
            style={styles.formCard}
          >
            <View style={styles.formContent}>
              <ThemedInput
                label="E-posta Adresiniz"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                errorText={emailError}
                leftIcon="email"
                style={styles.inputContainer}
                isRequired={true}
                showValidationIcon={true}
                validationState={
                  emailError
                    ? 'error'
                    : email && email.includes('@') && email.includes('.')
                      ? 'success'
                      : 'default'
                }
                helperText={!emailError ? 'Kayıtlı e-posta adresinizi girin' : undefined}
                showClearButton={true}
              />

              <ThemedInput
                label="Şifreniz"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                errorText={passwordError}
                leftIcon="lock-outline"
                style={styles.inputContainer}
                isRequired={true}
                showValidationIcon={true}
                validationState={
                  passwordError ? 'error' : password && password.length >= 8 ? 'success' : 'default'
                }
                helperText={!passwordError ? 'En az 8 karakter olmalıdır' : undefined}
                showClearButton={false} // Don't show clear for password
              />

              <ThemedButton
                title="Giriş Yap"
                onPress={handleEmailLogin}
                variant="primary"
                size="standard"
                fullWidth={true}
                style={styles.primaryButton}
                isLoading={isLoading}
                disabled={isLoading}
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
        </ScreenSection>

        {/* Social Login Section */}
        <ScreenSection spacing="large">
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          <ThemedCard
            variant="elevated"
            density="standard"
            elevation="card"
            style={styles.socialCard}
          >
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
        </ScreenSection>

        {/* Footer Section */}
        <ScreenSection spacing="medium">
          <View style={styles.footerContainer}>
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
          </View>
        </ScreenSection>
      </ScreenContent>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    headerContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
    },
    logoContainer: {
      marginBottom: theme.spacing.lg,
    },
    logoBackground: {
      width: 100,
      height: 100,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      // 🌟 Beautiful primary shadow for logo
      ...getPrimaryShadow.floating(theme),
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      fontWeight: '700',
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
    },
    formCard: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    },
    formContent: {
      // Padding handled by density="comfortable"
    },
    inputContainer: {
      marginBottom: theme.spacing.md,
    },
    primaryButton: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    forgotPasswordContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    forgotPasswordText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
    },
    dividerText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.sm,
    },
    socialCard: {
      borderRadius: theme.borderRadius.md,
    },
    socialButton: {
      // Padding handled by density="standard"
    },
    socialButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
    },
    socialButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.md,
      fontWeight: '600',
    },
    footerContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
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
  });

export default LoginScreen;
