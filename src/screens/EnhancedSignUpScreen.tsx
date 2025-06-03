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
  Dimensions,
} from 'react-native';

import ErrorState from '../components/states/ErrorState';
import LoadingState from '../components/states/LoadingState';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import ThemedInput from '../components/ThemedInput';
import { useTheme } from '../providers/ThemeProvider';
import { signupSchema } from '../schemas/authSchemas';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { AppTheme } from '../themes/types';
import { AuthStackParamList } from '../types/navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const formSlideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      // Animate logo scale down when keyboard shows
      Animated.timing(logoScaleAnim, {
        toValue: 0.5,
        duration: theme.animations.duration?.normal || 300,
        useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
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

  // Form completion progress
  useEffect(() => {
    const filledFields = [username, email, password, confirmPassword].filter(Boolean).length;
    const progress = filledFields / 4;

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: theme.animations.duration?.fast || 200,
      useNativeDriver: false,
    }).start();
  }, [username, email, password, confirmPassword, progressAnim, theme.animations.duration]);

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
    setSignUpAttempts((prev) => prev + 1);

    try {
      analyticsService.logEvent('signup_attempt', {
        has_username: !!validationResult.data.username,
      });

      await signUpWithEmail({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          data: { username: validationResult.data.username },
        },
      });

      analyticsService.logEvent('signup_success');

      Alert.alert(
        'Kayıt Başarılı! 🎉',
        'E-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktive edebilirsiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              navigation.navigate('Login');
            },
            style: 'default',
          },
        ]
      );
    } catch (err: any) {
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

  // Calculate form completion percentage for visual feedback
  const getFormCompletionText = () => {
    const filledFields = [username, email, password, confirmPassword].filter(Boolean).length;
    const percentage = Math.round((filledFields / 4) * 100);

    if (percentage === 0) return 'Başlayalım! 🚀';
    if (percentage < 50) return `İyi gidiyorsun! %${percentage}`;
    if (percentage < 100) return `Neredeyse bitti! %${percentage}`;
    return 'Harika! Kayıt olmaya hazırsın! 🎉';
  };

  // Render screen reader optimized version
  if (isScreenReaderEnabled) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.accessibleContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.accessibleTitle} accessibilityRole="header">
            Hesap Oluştur
          </Text>

          <Text style={styles.accessibleSubtitle} accessibilityRole="text">
            Yeşer'e katılın ve minnetinizi kaydedin.
          </Text>

          <View style={styles.accessibleFormContainer}>
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
                    width: progressAnim.interpolate({
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
          <ThemedCard variant="elevated" elevation="lg" style={styles.formContainer}>
            <View style={styles.formContent}>
              <ThemedInput
                label="Kullanıcı Adı"
                value={username}
                onChangeText={setUsername}
                error={formErrors.username}
                autoCapitalize="none"
                startIcon={
                  <Ionicons name="person-outline" size={20} color={theme.colors.onSurfaceVariant} />
                }
                accessibilityLabel="Kullanıcı adınızı girin"
                accessibilityHint="Kullanıcı adınız en az 3 karakter olmalıdır"
                containerStyle={styles.inputContainer}
              />

              <ThemedInput
                label="E-posta Adresi"
                value={email}
                onChangeText={setEmail}
                error={formErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                startIcon={
                  <Ionicons name="mail-outline" size={20} color={theme.colors.onSurfaceVariant} />
                }
                accessibilityLabel="E-posta adresinizi girin"
                accessibilityHint="Geçerli bir e-posta adresi giriniz"
                containerStyle={styles.inputContainer}
              />

              <ThemedInput
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                error={formErrors.password}
                secureTextEntry
                startIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
                accessibilityLabel="Şifrenizi girin"
                accessibilityHint="Şifreniz en az 6 karakter olmalıdır"
                containerStyle={styles.inputContainer}
              />

              <ThemedInput
                label="Şifre Tekrar"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={formErrors.confirmPassword}
                secureTextEntry
                startIcon={
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
                accessibilityLabel="Şifrenizi tekrar girin"
                accessibilityHint="Şifrenizi doğrulamak için tekrar girin"
                containerStyle={styles.inputContainer}
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
                <View style={styles.loadingContainer}>
                  <LoadingState message="Kaydolunuyor..." />
                </View>
              ) : (
                <ThemedButton
                  title="Kaydol"
                  onPress={handleSignUp}
                  variant="primary"
                  style={styles.primaryButton}
                  accessibilityLabel="Kaydol butonu"
                  accessibilityHint="Hesap oluşturmak için dokunun"
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
              accessibilityLabel="Giriş ekranına git"
              accessibilityHint="Zaten bir hesabınız varsa giriş yapın"
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
      ...theme.elevation.md,
      shadowColor: theme.colors.primary,
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
    },
    formContent: {
      padding: theme.spacing.medium,
    },
    inputContainer: {
      marginBottom: theme.spacing.medium,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.medium,
    },
    primaryButton: {
      width: '100%',
      marginTop: theme.spacing.medium,
      paddingVertical: theme.spacing.medium + 2,
      borderRadius: theme.borderRadius.medium,
      ...theme.elevation.xs,
    },
    footerContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing.medium,
      paddingBottom: Platform.OS === 'ios' ? theme.spacing.xl : theme.spacing.large,
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
    accessibleLink: {
      alignItems: 'center',
      paddingVertical: theme.spacing.medium,
    },
    button: {
      width: '100%',
      marginTop: theme.spacing.medium,
    },
  });

export default EnhancedSignUpScreen;
