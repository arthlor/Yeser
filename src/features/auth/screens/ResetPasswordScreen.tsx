import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import { ScreenContent, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { resetPasswordSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
}

/**
 * ResetPasswordScreen provides a secure password reset experience
 * with proper validation, error handling and user feedback.
 */
const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetAttempts, setResetAttempts] = useState(0);

  // Clear errors when component unmounts
  useEffect(
    () => () => {
      clearError();
    },
    [clearError]
  );

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('reset_password');
  }, []);

  // Handle password reset
  const handlePasswordReset = useCallback(async () => {
    Keyboard.dismiss();

    // Reset previous errors
    setEmailError(undefined);

    const validationResult = resetPasswordSchema.safeParse({ email });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      if (fieldErrors.email) {
        setEmailError(fieldErrors.email[0]);
      }
      return;
    }

    clearError();
    setResetAttempts((prev) => prev + 1);

    try {
      analyticsService.logEvent('password_reset_attempt', { email: email.toLowerCase() });
      await resetPassword(validationResult.data.email);

      // Show success state
      setIsSuccess(true);
      analyticsService.logEvent('password_reset_success', { email: email.toLowerCase() });

      // Show success alert
      Alert.alert(
        'E-posta Gönderildi',
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. E-postanızı kontrol ederek şifrenizi sıfırlayabilirsiniz.',
        [
          {
            text: 'Tamam',
            style: 'default',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } catch {
      analyticsService.logEvent('password_reset_failure', {
        email: email.toLowerCase(),
        attempts: resetAttempts + 1,
      });
    }
  }, [email, clearError, resetPassword, resetAttempts, navigation]);

  // Navigate back to login
  const navigateToLogin = useCallback(() => {
    analyticsService.logEvent('navigate_to_login_from_reset');
    navigation.goBack();
  }, [navigation]);

  // Get email validation state
  const getEmailValidationState = () => {
    if (emailError) {
      return 'error';
    }
    if (email && email.includes('@') && email.includes('.')) {
      return 'success';
    }
    return 'default';
  };

  return (
    <ScreenLayout keyboardAware={true} edges={['top']} density="comfortable" edgeToEdge={true}>
      <ScreenContent isLoading={isLoading} error={error} onRetry={clearError}>
        {/* Header Section */}
        <ScreenSection spacing="large">
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={navigateToLogin}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Giriş sayfasına geri dön"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Ionicons
                  name="key-outline"
                  size={48}
                  color={theme.colors.primary}
                  accessibilityLabel="Şifre sıfırlama"
                />
              </View>
            </View>

            <Text style={styles.title} accessibilityRole="header">
              Şifre Sıfırlama
            </Text>

            <Text style={styles.subtitle} accessibilityRole="text">
              E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
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
                autoComplete="email"
                errorText={emailError}
                leftIcon="email"
                style={styles.inputContainer}
                isRequired={true}
                showValidationIcon={true}
                validationState={getEmailValidationState()}
                helperText={!emailError ? 'Kayıtlı e-posta adresinizi girin' : undefined}
                showClearButton={true}
                editable={!isSuccess}
              />

              <ThemedButton
                title="Şifre Sıfırlama E-postası Gönder"
                onPress={handlePasswordReset}
                variant="primary"
                size="standard"
                fullWidth={true}
                style={styles.primaryButton}
                isLoading={isLoading}
                disabled={isLoading || isSuccess || !email.trim()}
                iconLeft={isSuccess ? 'check-circle' : 'email-send'}
              />

              <View style={styles.infoContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  E-posta spam klasörünüzü de kontrol etmeyi unutmayın.
                </Text>
              </View>
            </View>
          </ThemedCard>
        </ScreenSection>

        {/* Security Info Section */}
        <ScreenSection spacing="medium">
          <ThemedCard variant="outlined" density="comfortable" style={styles.securityCard}>
            <View style={styles.securityContent}>
              <View style={styles.securityHeader}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
                <Text style={styles.securityTitle}>Güvenlik Bilgisi</Text>
              </View>

              <Text style={styles.securityText}>
                • Şifre sıfırlama bağlantısı sadece 1 saat geçerlidir{'\n'}• Güvenliğiniz için
                bağlantı sadece bir kez kullanılabilir{'\n'}• E-posta gelmediyse 5 dakika sonra
                tekrar deneyebilirsiniz
              </Text>
            </View>
          </ThemedCard>
        </ScreenSection>

        {/* Footer Section */}
        <ScreenSection spacing="medium">
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={navigateToLogin}
              activeOpacity={0.7}
              style={styles.footerLink}
              accessibilityLabel="Giriş sayfasına dön"
              accessibilityRole="button"
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={theme.colors.primary}
                style={styles.linkIcon}
              />
              <Text style={styles.linkText}>Giriş Sayfasına Dön</Text>
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
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: 0,
      top: theme.spacing.lg,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    logoContainer: {
      marginBottom: theme.spacing.lg,
    },
    logoBackground: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.floating(theme),
    },
    title: {
      ...theme.typography.headlineMedium,
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
      paddingHorizontal: theme.spacing.md,
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
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.primaryContainer,
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      marginTop: theme.spacing.sm,
    },
    infoIcon: {
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },
    infoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onPrimaryContainer,
      flex: 1,
      lineHeight: 18,
    },
    securityCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.success,
      borderWidth: 1,
    },
    securityContent: {
      // Padding handled by density="comfortable"
    },
    securityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    securityTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.success,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    securityText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    footerContainer: {
      alignItems: 'center',
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    linkIcon: {
      marginRight: theme.spacing.sm,
    },
    linkText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '500',
    },
  });

export default ResetPasswordScreen;
