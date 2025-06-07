import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { ScreenContent, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import PasswordStrengthIndicator from '@/shared/components/ui/PasswordStrengthIndicator';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import { setNewPasswordSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';

type SetNewPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SetNewPassword'>;
type SetNewPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'SetNewPassword'>;

interface Props {
  navigation: SetNewPasswordScreenNavigationProp;
  route: SetNewPasswordScreenRouteProp;
}

/**
 * SetNewPasswordScreen allows users to set a new password after clicking
 * the password reset link from their email.
 */
const SetNewPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { updatePassword, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>(undefined);
  const [updateAttempts, setUpdateAttempts] = useState(0);
  const [isSessionReady, setIsSessionReady] = useState(false);

  // Clear errors when component unmounts
  useEffect(
    () => () => {
      clearError();
    },
    [clearError]
  );

  // Log screen view
  useEffect(() => {
    logger.debug('SetNewPassword screen mounted');
    analyticsService.logScreenView('set_new_password');
  }, []);

  // Handle recovery session from deep link
  useEffect(() => {
    const setupRecoverySession = async () => {
      const params = route.params;

      // Debug logging
      logger.debug('SetNewPassword - Route setup:', {
        routeName: route.name,
        hasAccessToken: !!params?.access_token,
        hasRefreshToken: !!params?.refresh_token,
        type: params?.type,
      });

      if (params?.access_token && params?.refresh_token) {
        try {
          // Set the session with the recovery tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (error) {
            Alert.alert(
              'Oturum Hatası',
              'Şifre sıfırlama oturumu geçersiz veya süresi dolmuş. Lütfen yeni bir şifre sıfırlama isteği gönderin.',
              [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
            );
            return;
          }

          if (data.session) {
            setIsSessionReady(true);
          }
        } catch {
          Alert.alert(
            'Bağlantı Hatası',
            'Şifre sıfırlama oturumu oluşturulamadı. Lütfen tekrar deneyin.',
            [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
          );
        }
      } else {
        // No recovery tokens found - redirect to login
        Alert.alert(
          'Geçersiz Bağlantı',
          'Şifre sıfırlama bağlantısı geçersiz. Lütfen yeni bir şifre sıfırlama isteği gönderin.',
          [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }]
        );
      }
    };

    setupRecoverySession();
  }, [route.params, navigation]);

  // Handle password update
  const handlePasswordUpdate = useCallback(async () => {
    Keyboard.dismiss();

    // Reset previous errors
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);

    const validationResult = setNewPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      if (fieldErrors.password) {
        setPasswordError(fieldErrors.password[0]);
      }
      if (fieldErrors.confirmPassword) {
        setConfirmPasswordError(fieldErrors.confirmPassword[0]);
      }
      return;
    }

    clearError();
    setUpdateAttempts((prev) => prev + 1);

    try {
      analyticsService.logEvent('password_update_attempt');
      await updatePassword(validationResult.data.password);
      analyticsService.logEvent('password_update_success');

      // Show success alert and navigate to login
      Alert.alert(
        'Şifre Güncellendi',
        'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
        [
          {
            text: 'Giriş Yap',
            style: 'default',
            onPress: () => navigation.navigate('Login'),
          },
        ],
        { cancelable: false }
      );
    } catch {
      analyticsService.logEvent('password_update_failure', {
        attempts: updateAttempts + 1,
      });
    }
  }, [password, confirmPassword, clearError, updatePassword, updateAttempts, navigation]);

  // Navigate back to login
  const navigateToLogin = useCallback(() => {
    analyticsService.logEvent('navigate_to_login_from_set_password');
    navigation.navigate('Login');
  }, [navigation]);

  // Get password validation state
  const getPasswordValidationState = () => {
    if (passwordError) {
      return 'error';
    }
    if (password && password.length >= 8) {
      return 'success';
    }
    return 'default';
  };

  // Get confirm password validation state
  const getConfirmPasswordValidationState = () => {
    if (confirmPasswordError) {
      return 'error';
    }
    if (confirmPassword && confirmPassword === password) {
      return 'success';
    }
    return 'default';
  };

  // Show loading while setting up recovery session
  if (!isSessionReady) {
    return (
      <ScreenLayout keyboardAware={true} edges={['top']} density="comfortable" edgeToEdge={true}>
        <ScreenContent isLoading={true} error={null} onRetry={() => {}}>
          <ScreenSection spacing="large">
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <Ionicons
                    name="lock-closed"
                    size={48}
                    color={theme.colors.primary}
                    accessibilityLabel="Şifre sıfırlama hazırlanıyor"
                  />
                </View>
              </View>
              <Text style={styles.title} accessibilityRole="header">
                Hazırlanıyor...
              </Text>
              <Text style={styles.subtitle} accessibilityRole="text">
                Şifre sıfırlama oturumunuz hazırlanıyor.
              </Text>
            </View>
          </ScreenSection>
        </ScreenContent>
      </ScreenLayout>
    );
  }

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
                  name="lock-closed"
                  size={48}
                  color={theme.colors.primary}
                  accessibilityLabel="Yeni şifre oluşturma"
                />
              </View>
            </View>

            <Text style={styles.title} accessibilityRole="header">
              Yeni Şifre Oluşturun
            </Text>

            <Text style={styles.subtitle} accessibilityRole="text">
              Hesabınız için güçlü ve güvenli bir şifre belirleyin.
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
                label="Yeni Şifreniz"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                errorText={passwordError}
                leftIcon="lock-outline"
                style={styles.inputContainer}
                isRequired={true}
                showValidationIcon={true}
                validationState={getPasswordValidationState()}
                helperText={
                  !passwordError
                    ? 'En az 8 karakter, büyük-küçük harf, rakam ve özel karakter içermeli'
                    : undefined
                }
                showClearButton={false}
              />

              {password && (
                <PasswordStrengthIndicator password={password} style={styles.passwordStrength} />
              )}

              <ThemedInput
                label="Şifre Onayı"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                errorText={confirmPasswordError}
                leftIcon="lock-outline"
                style={styles.inputContainer}
                isRequired={true}
                showValidationIcon={true}
                validationState={getConfirmPasswordValidationState()}
                helperText={!confirmPasswordError ? 'Yukarıdaki şifreyi tekrar girin' : undefined}
                showClearButton={false}
              />

              <ThemedButton
                title="Şifreyi Güncelle"
                onPress={handlePasswordUpdate}
                variant="primary"
                size="standard"
                fullWidth={true}
                style={styles.primaryButton}
                isLoading={isLoading}
                disabled={
                  isLoading || !password.trim() || !confirmPassword.trim() || !isSessionReady
                }
                iconLeft="shield-checkmark"
              />

              <View style={styles.infoContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  Şifrenizi güncelledikten sonra yeni şifrenizle giriş yapmanız gerekecek.
                </Text>
              </View>
            </View>
          </ThemedCard>
        </ScreenSection>

        {/* Security Tips Section */}
        <ScreenSection spacing="medium">
          <ThemedCard variant="outlined" density="comfortable" style={styles.securityCard}>
            <View style={styles.securityContent}>
              <View style={styles.securityHeader}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
                <Text style={styles.securityTitle}>Güvenlik İpuçları</Text>
              </View>

              <Text style={styles.securityText}>
                • Kolay tahmin edilebilir şifreler kullanmayın{'\n'}• Kişisel bilgilerinizi (doğum
                tarihi, adınız) şifrede kullanmayın{'\n'}• Bu şifreyi başka hesaplarda kullanmayın
                {'\n'}• Şifrenizi düzenli olarak güncelleyin
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
    passwordStrength: {
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

export default SetNewPasswordScreen;
