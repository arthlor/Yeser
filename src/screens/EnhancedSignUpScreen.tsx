// src/screens/EnhancedSignUpScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  StyleSheet,
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
import { AuthStackParamList } from '../types/navigation';

type SignUpScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'SignUp'
>;

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const [signUpAttempts, setSignUpAttempts] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(isEnabled);
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
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Log screen view
  useEffect(() => {
    analyticsService.logScreenView('sign_up');
  }, []);

  // Validation functions
  const validateEmail = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    setFormErrors(prev => ({
      ...prev,
      email: !value
        ? 'E-posta adresinizi giriniz'
        : !isValid
          ? 'Geçerli bir e-posta adresi giriniz'
          : '',
    }));
    return isValid && !!value;
  }, []);

  const validatePassword = useCallback((value: string) => {
    const isValid = value.length >= 6;
    setFormErrors(prev => ({
      ...prev,
      password: !value
        ? 'Şifrenizi giriniz'
        : !isValid
          ? 'Şifre en az 6 karakter olmalıdır'
          : '',
    }));
    return isValid && !!value;
  }, []);

  const validateConfirmPassword = useCallback(
    (value: string) => {
      const isValid = value === password;
      setFormErrors(prev => ({
        ...prev,
        confirmPassword: !value
          ? 'Şifrenizi tekrar giriniz'
          : !isValid
            ? 'Şifreler eşleşmiyor'
            : '',
      }));
      return isValid && !!value;
    },
    [password]
  );

  const validateUsername = useCallback((value: string) => {
    const isValid = value.length >= 3;
    setFormErrors(prev => ({
      ...prev,
      username: !value
        ? 'Kullanıcı adınızı giriniz'
        : !isValid
          ? 'Kullanıcı adı en az 3 karakter olmalıdır'
          : '',
    }));
    return isValid && !!value;
  }, []);

  // Handle sign up
  const handleSignUp = useCallback(async () => {
    Keyboard.dismiss();

    // Validate all inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isUsernameValid = validateUsername(username);

    if (
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid ||
      !isUsernameValid
    ) {
      return;
    }

    clearError();
    setSignUpAttempts(prev => prev + 1);

    try {
      analyticsService.logEvent('signup_attempt', {
        has_username: !!username,
      });

      await signUpWithEmail({
        email,
        password,
        options: {
          data: { username },
        },
      });

      analyticsService.logEvent('signup_success');

      Alert.alert(
        'Kayıt Başarılı!',
        'E-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktive edebilirsiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              analyticsService.logEvent('navigate_to_login_after_signup');
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch {
      analyticsService.logEvent('signup_failure', {
        attempts: signUpAttempts + 1,
      });
    }
  }, [
    email,
    password,
    confirmPassword,
    username,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateUsername,
    clearError,
    signUpWithEmail,
    signUpAttempts,
    navigation,
  ]);

  // Navigate to login screen
  const navigateToLogin = useCallback(() => {
    analyticsService.logEvent('navigate_to_login_from_signup');
    navigation.navigate('Login');
  }, [navigation]);

  // Render screen reader optimized version
  if (isScreenReaderEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Hesap Oluştur
        </Text>

        <Text style={styles.subtitle} accessibilityRole="text">
          Yeşer'e katılın ve minnetinizi kaydedin.
        </Text>

        <ThemedInput
          label="Kullanıcı Adı"
          value={username}
          onChangeText={setUsername}
          onBlur={() => validateUsername(username)}
          error={formErrors.username}
          autoCapitalize="none"
          accessibilityLabel="Kullanıcı adınızı girin"
          accessibilityHint="Kullanıcı adınız en az 3 karakter olmalıdır"
        />

        <ThemedInput
          label="E-posta Adresi"
          value={email}
          onChangeText={setEmail}
          onBlur={() => validateEmail(email)}
          error={formErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="E-posta adresinizi girin"
          accessibilityHint="Geçerli bir e-posta adresi giriniz"
        />

        <ThemedInput
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePassword(password)}
          error={formErrors.password}
          secureTextEntry
          accessibilityLabel="Şifrenizi girin"
          accessibilityHint="Şifreniz en az 6 karakter olmalıdır"
        />

        <ThemedInput
          label="Şifre Tekrar"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => validateConfirmPassword(confirmPassword)}
          error={formErrors.confirmPassword}
          secureTextEntry
          accessibilityLabel="Şifrenizi tekrar girin"
          accessibilityHint="Şifrenizi doğrulamak için tekrar girin"
        />

        {error && (
          <ErrorState
            title="Bir hata oluştu"
            message={error}
            onRetry={clearError}
            retryLabel="Tekrar Dene"
          />
        )}

        {isLoading ? (
          <LoadingState message="Kaydolunuyor..." />
        ) : (
          <ThemedButton
            title="Kaydol"
            onPress={handleSignUp}
            variant="primary"
            style={styles.button}
            accessibilityLabel="Kaydol butonu"
            accessibilityHint="Hesap oluşturmak için dokunun"
          />
        )}

        <TouchableOpacity
          onPress={navigateToLogin}
          accessibilityLabel="Giriş ekranına git"
          accessibilityHint="Zaten bir hesabınız varsa giriş yapın"
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>
            Zaten bir hesabınız var mı? Giriş Yapın
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render standard version with animations
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Ionicons
          name="leaf-outline"
          size={64}
          color={theme.colors.primary}
          accessibilityLabel="Yeşer logo"
        />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Hesap Oluştur
      </Text>

      <Text style={styles.subtitle} accessibilityRole="text">
        Yeşer'e katılın ve minnetinizi kaydedin.
      </Text>

      <ThemedCard style={styles.formContainer}>
        <ThemedInput
          label="Kullanıcı Adı"
          value={username}
          onChangeText={setUsername}
          onBlur={() => validateUsername(username)}
          error={formErrors.username}
          autoCapitalize="none"
          accessibilityLabel="Kullanıcı adınızı girin"
          accessibilityHint="Kullanıcı adınız en az 3 karakter olmalıdır"
        />

        <ThemedInput
          label="E-posta Adresi"
          value={email}
          onChangeText={setEmail}
          onBlur={() => validateEmail(email)}
          error={formErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="E-posta adresinizi girin"
          accessibilityHint="Geçerli bir e-posta adresi giriniz"
        />

        <ThemedInput
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          onBlur={() => validatePassword(password)}
          error={formErrors.password}
          secureTextEntry
          accessibilityLabel="Şifrenizi girin"
          accessibilityHint="Şifreniz en az 6 karakter olmalıdır"
        />

        <ThemedInput
          label="Şifre Tekrar"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => validateConfirmPassword(confirmPassword)}
          error={formErrors.confirmPassword}
          secureTextEntry
          accessibilityLabel="Şifrenizi tekrar girin"
          accessibilityHint="Şifrenizi doğrulamak için tekrar girin"
        />

        {error && (
          <ErrorState
            title="Bir hata oluştu"
            message={error}
            onRetry={clearError}
            retryLabel="Tekrar Dene"
          />
        )}

        {isLoading ? (
          <LoadingState message="Kaydolunuyor..." />
        ) : (
          <ThemedButton
            title="Kaydol"
            onPress={handleSignUp}
            variant="primary"
            style={styles.button}
            accessibilityLabel="Kaydol butonu"
            accessibilityHint="Hesap oluşturmak için dokunun"
          />
        )}
      </ThemedCard>

      {!isKeyboardVisible && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={navigateToLogin}
            accessibilityLabel="Giriş ekranına git"
            accessibilityHint="Zaten bir hesabınız varsa giriş yapın"
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              Zaten bir hesabınız var mı? Giriş Yapın
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.large,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.medium,
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
    formContainer: {
      width: '100%',
      padding: theme.spacing.medium,
      marginBottom: theme.spacing.medium,
    },
    button: {
      width: '100%',
      marginTop: theme.spacing.medium,
    },
    footer: {
      alignItems: 'center',
      marginTop: theme.spacing.small,
    },
    linkText: {
      color: theme.colors.primary,
      ...theme.typography.body2,
      textDecorationLine: 'underline',
    },
  });

export default EnhancedSignUpScreen;
