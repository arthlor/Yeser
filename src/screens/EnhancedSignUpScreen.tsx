// src/screens/EnhancedSignUpScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { signupSchema } from '../schemas/authSchemas';
import {
  AccessibilityInfo,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // Added
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

  // Handle sign up
  const handleSignUp = useCallback(async () => {
    Keyboard.dismiss();

    // Reset previous errors
    setFormErrors({
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
    });

    const validationResult = signupSchema.safeParse({
      username,
      email,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const { fieldErrors } = validationResult.error.formErrors;
      const newFormErrors = { email: '', password: '', confirmPassword: '', username: '' };
      if (fieldErrors.username) {
        newFormErrors.username = fieldErrors.username[0];
      }
      if (fieldErrors.email) {
        newFormErrors.email = fieldErrors.email[0];
      }
      if (fieldErrors.password) {
        newFormErrors.password = fieldErrors.password[0];
      }
      if (fieldErrors.confirmPassword) {
        newFormErrors.confirmPassword = fieldErrors.confirmPassword[0];
      }
      setFormErrors(newFormErrors);
      return;
    }

    clearError();
    setSignUpAttempts(prev => prev + 1);

    try {
      analyticsService.logEvent('signup_attempt', {
        has_username: !!validationResult.data.username, // Use validated data
      });

      await signUpWithEmail({
        email: validationResult.data.email, // Use validated data
        password: validationResult.data.password, // Use validated data
        options: {
          data: { username: validationResult.data.username }, // Use validated data
        },
      });

      analyticsService.logEvent('signup_success');

      Alert.alert(
        'Kayıt Başarılı!',
        'E-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktive edebilirsiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Login'),
            style: 'default',
          },
        ]
      );
    } catch (err: any) {
      // Error is already handled by useAuthStore and displayed via the error prop
      // Specific error handling for sign-up can be added here if needed
      analyticsService.logEvent('signup_failure', {
        error_message: err.message || 'Unknown error',
        attempts: signUpAttempts + 1,
      });
    }
  }, [
    username,
    email,
    password,
    confirmPassword,
    clearError,
    signUpWithEmail,
    navigation,
    signUpAttempts,
  ]);

  // Navigate to login screen
  const navigateToLogin = useCallback(() => {
    analyticsService.logEvent('navigate_to_login_from_signup');
    navigation.navigate('Login');
  }, [navigation]);

  // Render screen reader optimized version
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
        >
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
            error={formErrors.username}
            autoCapitalize="none"
            accessibilityLabel="Kullanıcı adınızı girin"
            accessibilityHint="Kullanıcı adınız en az 3 karakter olmalıdır"
          />

          <ThemedInput
            label="E-posta Adresi"
            value={email}
            onChangeText={setEmail}
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
            error={formErrors.password}
            secureTextEntry
            accessibilityLabel="Şifrenizi girin"
            accessibilityHint="Şifreniz en az 6 karakter olmalıdır"
          />

          <ThemedInput
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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
      >
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
            error={formErrors.username}
            autoCapitalize="none"
            accessibilityLabel="Kullanıcı adınızı girin"
            accessibilityHint="Kullanıcı adınız en az 3 karakter olmalıdır"
          />

          <ThemedInput
            label="E-posta Adresi"
            value={email}
            onChangeText={setEmail}
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
            error={formErrors.password}
            secureTextEntry
            accessibilityLabel="Şifrenizi girin"
            accessibilityHint="Şifreniz en az 6 karakter olmalıdır"
          />

          <ThemedInput
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardAvoidingWrapper: { // Added
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1, // Changed for ScrollView
      justifyContent: 'center',
      alignItems: 'center',
      // backgroundColor: theme.colors.background, // Removed, handled by wrapper
      paddingHorizontal: theme.spacing.large,
      paddingVertical: theme.spacing.medium, // Added for better spacing
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
