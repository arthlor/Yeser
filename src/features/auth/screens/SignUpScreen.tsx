// src/screens/EnhancedSignUpScreen.tsx
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ErrorState from '@/shared/components/ui/ErrorState';
import LoadingState from '@/components/states/LoadingState';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import ThemedInput from '@/shared/components/ui/ThemedInput';
import PasswordStrengthIndicator from '@/shared/components/ui/PasswordStrengthIndicator';
import { useTheme } from '@/providers/ThemeProvider';
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/themes/animations';
import { getPrimaryShadow } from '@/themes/utils';
import { signupSchema } from '@/schemas/authSchemas';
import { analyticsService } from '@/services/analyticsService';
import useAuthStore from '@/store/authStore';
import { AppTheme } from '@/themes/types';
import { AuthStackParamList } from '@/types/navigation';

import type { ZodError } from 'zod';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

// EnhancedSignUpScreen provides a beautiful and accessible sign-up experience
// with animations, proper error handling, and themed components.
const EnhancedSignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { signUpWithEmail, isLoading, error, clearError } = useAuthStore();

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // UI state
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Animation refs for native driver animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const formSlideAnim = useRef(new Animated.Value(30)).current;
  
  // Separate progress animation - uses JS driver for layout properties
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Check for screen reader on mount
  useEffect(() => {
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(isEnabled);
    };
    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Entrance animations
  useEffect(() => {
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATIONS.normal,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATIONS.normal,
          useNativeDriver: true,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          ...SPRING_CONFIGS.gentle,
        }),
        Animated.timing(formSlideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATIONS.normal,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateEntrance();
  }, [fadeAnim, slideAnim, logoScaleAnim, formSlideAnim]);

  // Progress animation based on form completion
  useEffect(() => {
    const completedFields = [username, email, password, confirmPassword].filter(
      (field) => field.length > 0
    ).length;
    const progress = completedFields / 4;

    Animated.timing(progressWidth, {
      toValue: progress,
      duration: ANIMATION_DURATIONS.fast,
      useNativeDriver: false, // Must be false for width interpolation
    }).start();
  }, [username, email, password, confirmPassword, progressWidth]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    try {
      signupSchema.parse({
        username,
        email,
        password,
        confirmPassword,
      });
    } catch (validationError) {
      const zodError = validationError as ZodError;
      zodError.errors?.forEach((err) => {
        const field = err.path[0];
        if (field in errors) {
          errors[field as keyof typeof errors] = err.message;
        }
      });
    }

    setFormErrors(errors);
    return Object.values(errors).every((error) => error === '');
  }, [username, email, password, confirmPassword]);

  // Navigation handlers
  const navigateToLogin = useCallback(() => {
    analyticsService.logEvent('signup_navigate_to_login');
    navigation.navigate('Login');
  }, [navigation]);

  // Form submission
  const handleSignUp = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Form Hatası', 'Lütfen tüm alanları doğru şekilde doldurun.');
      return;
    }

    try {
      analyticsService.logEvent('signup_attempt', {
        method: 'email',
        username_length: username.length,
      });

      await signUpWithEmail({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      analyticsService.logEvent('signup_success', {
        method: 'email',
      });

      Alert.alert(
        'Kayıt Başarılı!',
        'E-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktifleştirin.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (signUpError) {
      const errorMessage = signUpError instanceof Error ? signUpError.message : 'Unknown error';
      analyticsService.logEvent('signup_error', {
        method: 'email',
        error: errorMessage,
      });
    }
  }, [validateForm, signUpWithEmail, email, password, username, navigation]);

  const getFormCompletionText = () => {
    const completedFields = [username, email, password, confirmPassword].filter(
      (field) => field.length > 0
    ).length;
    return `Form ${completedFields}/4 tamamlandı`;
  };

  // Render simplified version for screen readers
  if (isScreenReaderEnabled) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title} accessibilityRole="header">
              Hesap Oluştur
            </Text>
            <Text style={styles.subtitle} accessibilityRole="text">
              Yeşer'e katılın ve minnetinizi kaydedin.
            </Text>
          </View>

          <View style={styles.formSection}>
            <ThemedInput
              label="Kullanıcı Adı"
              value={username}
              onChangeText={setUsername}
              errorText={formErrors.username}
              autoCapitalize="none"
            />

            <ThemedInput
              label="E-posta Adresi"
              value={email}
              onChangeText={setEmail}
              errorText={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <ThemedInput
              label="Şifre"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setShowPasswordStrength(text.length > 0);
              }}
              onFocus={() => setShowPasswordStrength(password.length > 0)}
              onBlur={() => setShowPasswordStrength(false)}
              errorText={formErrors.password}
              secureTextEntry
            />

            {showPasswordStrength && (
              <PasswordStrengthIndicator password={password} />
            )}

            <ThemedInput
              label="Şifre Tekrar"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              errorText={formErrors.confirmPassword}
              secureTextEntry
            />

            {error && (
              <ErrorState
                title="Bir hata oluştu"
                message={error}
                onRetry={clearError}
                retryText="Tekrar Dene"
              />
            )}

            {/* Email verification info */}
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.infoTitle}>E-posta Doğrulama Gereklidir</Text>
              </View>
              <Text style={styles.infoText}>
                Hesabınızı oluşturduktan sonra e-posta adresinize gönderilen doğrulama linkine tıklamanız gerekir. Link 5 dakika içerisinde geçersiz olacaktır.
              </Text>
            </View>

            {isLoading ? (
              <LoadingState message="Kaydolunuyor..." />
            ) : (
              <ThemedButton
                title="Kaydol"
                onPress={handleSignUp}
                variant="primary"
                style={styles.button}
              />
            )}

            <TouchableOpacity
              onPress={navigateToLogin}
              accessibilityLabel="Giriş ekranına git"
              accessibilityHint="Zaten bir hesabınız varsa giriş yapın"
              accessibilityRole="button"
              style={styles.accessibleLink}
            >
              <Text style={styles.linkText}>Zaten bir hesabınız var mı? Giriş Yapın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Render standard version with animations
  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingWrapper}
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
                size={isKeyboardVisible ? 40 : 56}
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
            Hesap Oluştur
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
            Yeşer'e katılın ve minnetinizi kaydedin.
          </Animated.Text>

          {/* Progress indicator */}
          <Animated.View
            style={[
              styles.progressContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{getFormCompletionText()}</Text>
          </Animated.View>
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
          <ThemedCard 
            variant="elevated" 
            density="comfortable"
            elevation="card"
            style={styles.formContainer}
          >
            <View style={styles.formContent}>
              <ThemedInput
                label="Kullanıcı Adı"
                value={username}
                onChangeText={setUsername}
                errorText={formErrors.username}
                autoCapitalize="none"
                leftIcon="account-circle"
                style={styles.inputContainer}
              />

              <ThemedInput
                label="E-posta Adresi"
                value={email}
                onChangeText={setEmail}
                errorText={formErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email"
                style={styles.inputContainer}
              />

              <ThemedInput
                label="Şifre"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setShowPasswordStrength(text.length > 0);
                }}
                onFocus={() => setShowPasswordStrength(password.length > 0)}
                onBlur={() => setShowPasswordStrength(false)}
                errorText={formErrors.password}
                secureTextEntry
                leftIcon="lock-outline"
                style={styles.inputContainer}
              />

              {showPasswordStrength && (
                <PasswordStrengthIndicator password={password} />
              )}

              <ThemedInput
                label="Şifre Tekrar"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                errorText={formErrors.confirmPassword}
                secureTextEntry
                leftIcon="lock-check"
                style={styles.inputContainer}
              />

              {error && (
                <ErrorState
                  title="Bir hata oluştu"
                  message={error}
                  onRetry={clearError}
                  retryText="Tekrar Dene"
                />
              )}

              {/* Email verification info */}
              <View style={styles.infoSection}>
                <View style={styles.infoHeader}>
                  <Ionicons 
                    name="information-circle-outline" 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.infoTitle}>E-posta Doğrulama Gereklidir</Text>
                </View>
                <Text style={styles.infoText}>
                  Hesabınızı oluşturduktan sonra e-posta adresinize gönderilen doğrulama linkine tıklamanız gerekir. Link 5 dakika içerisinde geçersiz olacaktır.
                </Text>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <LoadingState message="Kaydolunuyor..." />
                </View>
              ) : (
                <ThemedButton
                  title="Kaydol"
                  onPress={handleSignUp}
                  variant="primary"
                  style={styles.primaryButton}
                />
              )}
            </View>
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
              onPress={navigateToLogin}
              activeOpacity={0.7}
              style={styles.footerLink}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Zaten bir hesabınız var mı? </Text>
              <Text style={styles.linkTextBold}>Giriş Yapın</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardAvoidingWrapper: {
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
      paddingTop: Platform.OS === 'ios' ? theme.spacing.large : theme.spacing.medium,
      paddingBottom: theme.spacing.medium,
    },
    logoContainer: {
      marginBottom: theme.spacing.medium,
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
      marginBottom: theme.spacing.small,
      textAlign: 'center',
      fontWeight: '700',
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
      lineHeight: 22,
    },
    progressContainer: {
      width: '100%',
      maxWidth: 300,
      alignItems: 'center',
      marginBottom: theme.spacing.medium,
    },
    progressBackground: {
      width: '100%',
      height: 4,
      backgroundColor: theme.colors.outlineVariant,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginBottom: theme.spacing.small,
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
    },
    progressText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    formSection: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    formContainer: {
      width: '100%',
      marginBottom: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      ...getPrimaryShadow.card(theme),
    },
    formContent: {
      // Padding handled by density="comfortable"
    },
    inputContainer: {
      marginBottom: theme.spacing.medium,
    },
    infoSection: {
      backgroundColor: theme.colors.primaryContainer + '20',
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.medium,
      marginBottom: theme.spacing.medium,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.small,
    },
    infoTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginLeft: theme.spacing.small,
    },
    infoText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
    },
    primaryButton: {
      width: '100%',
      marginTop: theme.spacing.medium,
      paddingVertical: theme.spacing.medium + 2,
      borderRadius: theme.borderRadius.medium,
      ...theme.elevation.xs,
    },
    button: {
      width: '100%',
      marginTop: theme.spacing.medium,
    },
    footerContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
    },
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
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
      textDecorationLine: 'underline',
    },
    accessibleLink: {
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
      marginTop: theme.spacing.medium,
    },
  });

export default EnhancedSignUpScreen;
