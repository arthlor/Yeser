# Component Guide

This document provides comprehensive guidance for building and maintaining UI components in the Yeser gratitude app using the modern hybrid architecture with TanStack Query, Zustand, and **7-layer error protection system**.

## 🧩 Component Architecture Overview

The Yeşer app follows a **modern component architecture** built on:

- **Functional Components**: React hooks-based components with performance optimizations
- **TanStack Query Integration**: Server state via custom hooks with intelligent caching
- **Zustand Integration**: Client state via selective subscriptions with optimized re-renders
- **Themed Components**: React Native Paper + custom theming with enhanced visual hierarchy
- **TypeScript**: Full type safety and excellent developer experience (100% coverage)
- **7-Layer Error Protection**: Comprehensive error handling preventing technical errors from reaching users
- **Performance Optimization**: Production-ready components with React.memo, useMemo, and useCallback

```
┌─────────────────────────────────────────────────────────┐
│                    SCREEN COMPONENTS                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Screens   │  │   Enhanced  │  │  Navigation │     │
│  │ (Containers)│  │  Screens    │  │   Stacks    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  FEATURE COMPONENTS                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ GratitudeEntry│ │ UserProfile │  │ StreakDisplay│    │
│  │  Components │  │ Components  │  │  Components │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                     UI COMPONENTS                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Inputs    │  │   Buttons   │  │   Layout    │     │
│  │ (Forms,     │  │ (Actions,   │  │ (Cards,     │     │
│  │  Fields)    │  │  Navigation)│  │  Containers)│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 7-LAYER ERROR PROTECTION                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Error     │  │ Translation │  │ UI Safety   │     │
│  │ Boundaries  │  │   Layer     │  │ Components  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   STATE INTEGRATION                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │TanStack Qry │  │   Zustand   │  │   Local     │     │
│  │   Hooks     │  │   Selectors │  │   State     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Design System & Theming (Enhanced)

### Theme Architecture with Enhanced Visual Hierarchy

The app uses a comprehensive theming system with React Native Paper as the base, now enhanced with improved visual hierarchy:

```typescript
// src/themes/types.ts - Enhanced theme interface
export interface AppTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
    // Enhanced custom colors for better visual hierarchy
    gratitudeCard: string;
    streakGreen: string;
    modalOverlay: string;
    // Enhanced border colors for better element definition
    outline: string; // Strengthened for light theme: #94A3B8, dark theme: #7C8B9E
    outlineVariant: string; // Enhanced: #CBD2DC (light), #5A6875 (dark)
    borderLight: string; // Added for dark theme: #475569
    borderMedium: string; // Added for dark theme: #5A6875
    borderStrong: string; // Added for dark theme: #7C8B9E
  };
  spacing: {
    xs: number; // 4
    sm: number; // 8
    md: number; // 16
    lg: number; // 24
    xl: number; // 32
    xxl: number; // 48
  };
  typography: {
    headingLarge: TextStyle;
    headingMedium: TextStyle;
    headingSmall: TextStyle;
    bodyLarge: TextStyle;
    bodyMedium: TextStyle;
    bodySmall: TextStyle;
    caption: TextStyle;
  };
  borderRadius: {
    small: number; // 4
    medium: number; // 8
    large: number; // 16
    full: number; // 999
  };
  // Enhanced shadow system for better depth perception
  shadows: {
    light: {
      small: ViewStyle;
      medium: ViewStyle;
      large: ViewStyle;
    };
    dark: {
      small: ViewStyle;
      medium: ViewStyle;
      large: ViewStyle;
    };
  };
}
```

### Enhanced Theme Usage in Components

```typescript
// Using enhanced theme in components with automatic shadow adaptation
import { useThemeStore } from '@/store/themeStore';
import { getThemeAwareShadow } from '@/utils/shadowUtils';

const ThemedComponent: React.FC = () => {
  const { activeTheme } = useThemeStore();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: activeTheme.colors.surface,
        borderColor: activeTheme.colors.outline, // Enhanced border definition
        ...getThemeAwareShadow(activeTheme, 'medium'), // Automatic shadow adaptation
      }
    ]}>
      <Text style={[styles.title, { color: activeTheme.colors.text }]}>
        Enhanced Themed Content
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1, // Enhanced border for better element definition
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

## 🔐 Authentication Components (Production-Ready)

### Magic Link Authentication System with 7-Layer Error Protection

The Yeşer app implements a modern **passwordless authentication system** using Supabase magic links with comprehensive error protection and enhanced user experience.

#### LoginScreen Component (Enhanced)

The main authentication entry point with magic link functionality and comprehensive error handling:

```typescript
// Key features of enhanced LoginScreen:
// - Magic link email authentication with rate limiting protection
// - Google OAuth integration with error cancellation handling
// - 7-layer error protection with Turkish localization
// - Enhanced button sizing for Turkish text
// - Animated help section with user guidance
// - Real-time form validation with user feedback
// - Loading states with haptic feedback
// - Comprehensive analytics integration

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { activeTheme } = useThemeStore();
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleMagicLinkLogin = useCallback(async (): Promise<void> => {
    // Enhanced email validation with error protection
    if (!email.trim()) {
      setError('Lütfen email adresinizi girin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Geçerli bir email adresi girin');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Use enhanced auth service with 7-layer protection
      const result = await authService.signInWithMagicLink(email.trim());

      if (result.success) {
        setSuccess('Giriş bağlantısı email adresinize gönderildi!');
        // Enhanced analytics tracking
        analyticsService.trackEvent('magic_link_sent', {
          email_domain: email.split('@')[1],
          user_action: 'manual_entry'
        });
      } else {
        // Error message already translated by 7-layer protection
        setError(result.error || 'Giriş bağlantısı gönderilemedi');
      }
    } catch (error) {
      // Final safety net - should rarely be reached due to 7-layer protection
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
      logger.error('LoginScreen magic link error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

  const handleGoogleLogin = useCallback(async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError('');

      // Enhanced Google OAuth with cancellation handling
      const result = await authService.signInWithGoogle();

      if (result.success) {
        analyticsService.trackEvent('google_oauth_success');
      } else if (result.userCancelled) {
        // Handle user cancellation gracefully (no error message)
        logger.debug('Google OAuth cancelled by user');
      } else {
        // Error message already translated by 7-layer protection
        setError(result.error || 'Google ile giriş yapılırken bir hata oluştu');
      }
    } catch (error) {
      // Final safety net with enhanced error handling
      const safeMessage = safeErrorDisplay(error);
      setError(safeMessage);
      logger.error('LoginScreen Google OAuth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Enhanced component render with optimized button sizing and Turkish localization
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Enhanced UI with improved visual hierarchy and accessibility */}

        {/* Email input with real-time validation */}
        <TextInput
          mode="outlined"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(''); // Clear error on change
          }}
          placeholder="Email adresinizi girin"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          disabled={isSubmitting}
          style={styles.emailInput}
          error={!!error}
          testID="email-input"
        />

        {/* Enhanced ThemedButton with improved text handling */}
        <ThemedButton
          mode="contained"
          onPress={handleMagicLinkLogin}
          loading={isSubmitting}
          disabled={!email.trim() || isSubmitting}
          size="large" // Enhanced sizing for Turkish text
          style={styles.magicLinkButton}
          testID="magic-link-button"
        >
          Güvenli Giriş Bağlantısı Gönder
        </ThemedButton>

        {/* Google OAuth button with enhanced error handling */}
        <ThemedButton
          mode="outlined"
          onPress={handleGoogleLogin}
          disabled={isSubmitting}
          size="large"
          style={styles.googleButton}
          icon="google"
          testID="google-oauth-button"
        >
          Google ile Giriş Yap
        </ThemedButton>

        {/* Error/Success display with enhanced styling */}
        {error && (
          <Card style={[styles.messageCard, styles.errorCard]}>
            <Card.Content>
              <Text style={[styles.messageText, { color: activeTheme.colors.error }]}>
                {error}
              </Text>
            </Card.Content>
          </Card>
        )}

        {success && (
          <Card style={[styles.messageCard, styles.successCard]}>
            <Card.Content>
              <Text style={[styles.messageText, { color: activeTheme.colors.success }]}>
                {success}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Enhanced help section with animations */}
        <EnhancedHelpSection />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 24,
  },
  emailInput: {
    marginBottom: 16,
  },
  magicLinkButton: {
    marginBottom: 12,
    minHeight: 52, // Enhanced height for Turkish text
  },
  googleButton: {
    marginBottom: 24,
    minHeight: 52, // Enhanced height for Turkish text
  },
  messageCard: {
    marginBottom: 16,
    elevation: 2,
  },
  errorCard: {
    backgroundColor: '#FEF2F2', // Light red background
  },
  successCard: {
    backgroundColor: '#F0FDF4', // Light green background
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
```

#### Enhanced ThemedButton Component (Fixed)

Improved button component with better text handling and Turkish localization support:

```typescript
// Key improvements in ThemedButton:
// - Removed numberOfLines={1} restriction for better text display
// - Changed from flex: 1 to flexShrink: 1 for dynamic sizing
// - Increased minWidth values for Turkish text requirements
// - Enhanced accessibility and testing support
// - Performance optimizations with React.memo

interface ThemedButtonProps {
  mode?: 'text' | 'outlined' | 'contained';
  size?: 'compact' | 'standard' | 'large';
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  icon?: string;
  testID?: string;
}

export const ThemedButton: React.FC<ThemedButtonProps> = React.memo(({
  mode = 'contained',
  size = 'standard',
  children,
  loading = false,
  disabled = false,
  onPress,
  style,
  icon,
  testID,
}) => {
  const { activeTheme } = useThemeStore();

  // Enhanced size configurations for Turkish text
  const buttonConfig = {
    compact: { minWidth: 120, minHeight: 36, fontSize: 14 },
    standard: { minWidth: 130, minHeight: 44, fontSize: 16 },
    large: { minWidth: 150, minHeight: 52, fontSize: 16 }, // Increased for Turkish
  };

  const config = buttonConfig[size];

  const buttonStyle = [
    {
      minWidth: config.minWidth,
      minHeight: config.minHeight,
    },
    style,
  ];

  const labelStyle = [
    {
      fontSize: config.fontSize,
      fontWeight: '600' as const,
    },
  ];

  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      style={buttonStyle}
      labelStyle={labelStyle}
      icon={icon}
      testID={testID}
      // Enhanced content handling - no numberOfLines restriction
      contentStyle={{
        minHeight: config.minHeight,
        paddingHorizontal: 16,
      }}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.buttonText, labelStyle]}>
          {children}
        </Text>
      </View>
    </Button>
  );
});

const styles = StyleSheet.create({
  textContainer: {
    flexShrink: 1, // Changed from flex: 1 for better text handling
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    // Removed numberOfLines restriction for Turkish text
  },
});
```

#### Deep Link Handler Component (Enhanced)

Enhanced deep link handler with comprehensive error protection:

```typescript
// src/features/auth/components/DeepLinkHandler.tsx
export const DeepLinkHandler: React.FC = () => {
  const { setSession, setIsLoading } = useAuthStore();

  useEffect(() => {
    const handleDeepLink = async (url: string): Promise<void> => {
      try {
        setIsLoading(true);

        // Enhanced deep link handling with 7-layer protection
        const result = await deepLinkAuthService.handleAuthCallback(url);

        if (result.success && result.session) {
          setSession(result.session);

          // Enhanced analytics tracking
          analyticsService.trackEvent('magic_link_authentication_success', {
            provider: result.session.user?.app_metadata?.provider || 'magic_link',
            user_id: result.session.user?.id,
          });
        } else {
          // Error already handled by 7-layer protection
          logger.error('Deep link authentication failed:', result.error);

          // Track authentication failure for analytics
          analyticsService.trackEvent('magic_link_authentication_failed', {
            error_type: result.errorType || 'unknown',
            url_scheme: url.split('://')[0],
          });
        }
      } catch (error) {
        // Final safety net with error protection
        const safeMessage = safeErrorDisplay(error);
        logger.error('Deep link handler error:', { error, safeMessage });

        analyticsService.trackEvent('deep_link_handler_error', {
          error_message: safeMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Enhanced URL listener setup
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle app launch from magic link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription?.remove();
  }, [setSession, setIsLoading]);

  return null; // Background component with no UI
};
```

### Authentication Flow Architecture (Enhanced)

```
┌─────────────────────────────────────────────────────────┐
│                 ENHANCED AUTHENTICATION FLOW            │
│                                                         │
│  1. User enters email in LoginScreen                   │
│  2. 7-layer error protection validates input           │
│  3. Magic link sent via Supabase Auth with rate limit  │
│  4. User clicks link in email                          │
│  5. Deep link opens app with auth tokens               │
│  6. DeepLinkHandler processes tokens with protection   │
│  7. Session established in AuthStore                   │
│  8. Analytics tracking for authentication flow         │
│  9. User redirected to authenticated screens           │
│                                                         │
│  Alternative: Google OAuth flow with cancellation      │
│  - Google sign-in modal with user cancellation detect  │
│  - OAuth tokens processed with error protection        │
│  - Session established with analytics tracking         │
│  - Graceful error handling for all scenarios           │
└─────────────────────────────────────────────────────────┘
```

### Key Authentication Features (Enhanced)

- **Passwordless Security**: No password storage or management with enhanced security measures
- **Magic Link Flow**: Secure email-based authentication with time-limited tokens
- **Google OAuth**: Alternative social login option with user cancellation detection
- **Deep Link Handling**: Seamless app re-entry from email with comprehensive validation
- **Turkish Localization**: User-friendly error messages with cultural sensitivity
- **Enhanced UX**: Loading states, success feedback, help sections with animations
- **7-Layer Error Protection**: Comprehensive error handling preventing technical errors
- **Session Management**: Automatic session restoration and persistence with analytics
- **Performance Optimized**: React.memo, useCallback, and useMemo optimizations
- **Analytics Integration**: Comprehensive tracking for authentication events and user behavior

## 🔌 Modern Component Patterns

### 1. TanStack Query-Powered Components

Components that consume server state via TanStack Query hooks:

```typescript
// src/components/features/UserProfileCard.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useThemeStore } from '@/store/themeStore';

interface UserProfileCardProps {
  onEditPress?: () => void;
  showEditButton?: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  onEditPress,
  showEditButton = false,
}) => {
  const { activeTheme } = useThemeStore();
  const { profile, isLoading, error, updateProfile, isUpdatingProfile } = useUserProfile();

  // Loading state
  if (isLoading) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content style={styles.loadingContent}>
          <ActivityIndicator size="large" color={activeTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: activeTheme.colors.textSecondary }]}>
            Loading profile...
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.errorText, { color: activeTheme.colors.error }]}>
            Failed to load profile
          </Text>
          <Text style={[styles.errorDetails, { color: activeTheme.colors.textSecondary }]}>
            {error.message}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // No profile state
  if (!profile) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.noProfileText, { color: activeTheme.colors.textSecondary }]}>
            No profile found
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Success state with data
  return (
    <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={[styles.username, { color: activeTheme.colors.text }]}>
            {profile.fullName || profile.username || 'Anonymous User'}
          </Text>
          {showEditButton && (
            <Button
              mode="outlined"
              onPress={onEditPress}
              disabled={isUpdatingProfile}
              style={styles.editButton}
            >
              Edit
            </Button>
          )}
        </View>

        <View style={styles.details}>
          <DetailRow
            label="Daily Goal"
            value={`${profile.dailyGratitudeGoal} statements`}
            theme={activeTheme}
          />
          <DetailRow
            label="Daily Reminders"
            value={profile.reminderEnabled ? `Enabled (${profile.reminderTime})` : 'Disabled'}
            theme={activeTheme}
          />
          <DetailRow
            label="Throwback Reminders"
            value={profile.throwbackReminderEnabled ?
              `${profile.throwbackReminderFrequency} (${profile.throwbackReminderTime})` : 'Disabled'}
            theme={activeTheme}
          />
          <DetailRow
            label="Varied Prompts"
            value={profile.useVariedPrompts ? 'Enabled (Database)' : 'Standard'}
            theme={activeTheme}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

// Helper component
const DetailRow: React.FC<{
  label: string;
  value: string;
  theme: AppTheme;
}> = ({ label, value, theme }) => (
  <View style={styles.detailRow}>
    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
      {label}:
    </Text>
    <Text style={[styles.value, { color: theme.colors.text }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorDetails: {
    fontSize: 14,
  },
  noProfileText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    minWidth: 80,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
  },
});
```

### 2. Form Components with Mutations

Components that handle user input and mutations:

```typescript
// src/components/features/GratitudeStatementForm.tsx
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { TextInput, Button, Card, HelperText } from 'react-native-paper';
import { useGratitudeMutations } from '@/hooks/useGratitudeMutations';
import { useThemeStore } from '@/store/themeStore';
import { hapticFeedback } from '@/utils/hapticFeedback';

interface GratitudeStatementFormProps {
  entryDate: string;
  onSubmitSuccess?: (statement: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const GratitudeStatementForm: React.FC<GratitudeStatementFormProps> = ({
  entryDate,
  onSubmitSuccess,
  placeholder = "What are you grateful for today?",
  autoFocus = false,
}) => {
  const { activeTheme } = useThemeStore();
  const { addStatement, isAddingStatement } = useGratitudeMutations();

  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    const trimmedStatement = statement.trim();

    if (!trimmedStatement) {
      setError('Please enter a gratitude statement');
      return;
    }

    if (trimmedStatement.length < 3) {
      setError('Statement must be at least 3 characters long');
      return;
    }

    if (trimmedStatement.length > 500) {
      setError('Statement must be less than 500 characters');
      return;
    }

    try {
      // Clear any previous errors
      setError(null);

      // Submit via TanStack Query mutation
      addStatement(
        { entryDate, statement: trimmedStatement },
        {
          onSuccess: () => {
            // Success feedback
            hapticFeedback.success();
            setStatement(''); // Clear form
            onSubmitSuccess?.(trimmedStatement);
          },
          onError: (error) => {
            // Error handling
            hapticFeedback.error();
            setError(error.message || 'Failed to add statement');
            Alert.alert(
              'Error',
              'Failed to add your gratitude statement. Please try again.',
              [{ text: 'OK' }]
            );
          },
        }
      );
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const isSubmitDisabled = isAddingStatement || !statement.trim();

  return (
    <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
      <Card.Content>
        <TextInput
          mode="outlined"
          value={statement}
          onChangeText={(text) => {
            setStatement(text);
            if (error) setError(null); // Clear error on change
          }}
          placeholder={placeholder}
          multiline
          numberOfLines={3}
          maxLength={500}
          autoFocus={autoFocus}
          disabled={isAddingStatement}
          style={styles.textInput}
          contentStyle={{ color: activeTheme.colors.text }}
          outlineColor={activeTheme.colors.primary}
          testID="statement-input"
        />

        {error && (
          <HelperText type="error" visible={!!error} testID="error-message">
            {error}
          </HelperText>
        )}

        <View style={styles.footer}>
          <HelperText
            type="info"
            visible={statement.length > 0}
            style={[
              styles.characterCount,
              { color: statement.length > 450 ? activeTheme.colors.warning : activeTheme.colors.textSecondary }
            ]}
          >
            {statement.length}/500 characters
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            loading={isAddingStatement}
            style={styles.submitButton}
            testID="submit-button"
          >
            {isAddingStatement ? 'Adding...' : 'Add Gratitude'}
          </Button>
        </View>

        {isAddingStatement && (
          <HelperText type="info" visible testID="loading-indicator">
            Adding your gratitude statement...
          </HelperText>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  textInput: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    margin: 0,
  },
  submitButton: {
    minWidth: 120,
  },
});
```

### 3. List Components with Query Data

Components that display lists of data from TanStack Query:

```typescript
// src/components/features/GratitudeStatementsList.tsx
import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { Card, IconButton, Chip } from 'react-native-paper';
import { useGratitudeEntry } from '@/hooks/useGratitudeQueries';
import { useGratitudeMutations } from '@/hooks/useGratitudeMutations';
import { useThemeStore } from '@/store/themeStore';
import { format } from 'date-fns';

interface GratitudeStatementsListProps {
  entryDate: string;
  onEditStatement?: (statement: string, index: number) => void;
  editable?: boolean;
}

export const GratitudeStatementsList: React.FC<GratitudeStatementsListProps> = ({
  entryDate,
  onEditStatement,
  editable = false,
}) => {
  const { activeTheme } = useThemeStore();
  const { data: entry, isLoading, error } = useGratitudeEntry(entryDate);
  const { deleteStatement, isDeletingStatement } = useGratitudeMutations();

  const handleDeleteStatement = (index: number) => {
    Alert.alert(
      'Delete Statement',
      'Are you sure you want to delete this gratitude statement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteStatement({ entryDate, statementIndex: index });
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content style={styles.centerContent}>
          <ActivityIndicator size="large" color={activeTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: activeTheme.colors.textSecondary }]}>
            Loading gratitude statements...
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content style={styles.centerContent}>
          <Text style={[styles.errorText, { color: activeTheme.colors.error }]}>
            Failed to load statements
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // No entry or empty statements
  if (!entry || !entry.statements || entry.statements.length === 0) {
    return (
      <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
        <Card.Content style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: activeTheme.colors.textSecondary }]}>
            No gratitude statements for {format(new Date(entryDate), 'MMMM d, yyyy')}
          </Text>
          <Text style={[styles.emptySubtext, { color: activeTheme.colors.textSecondary }]}>
            Add your first gratitude statement above!
          </Text>
        </Card.Content>
      </Card>
    );
  }

  // Render statement item
  const renderStatement = ({ item: statement, index }: { item: string; index: number }) => (
    <StatementItem
      statement={statement}
      index={index}
      onEdit={() => onEditStatement?.(statement, index)}
      onDelete={() => handleDeleteStatement(index)}
      editable={editable}
      isDeleting={isDeletingStatement}
      theme={activeTheme}
    />
  );

  return (
    <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>
            Gratitude for {format(new Date(entryDate), 'MMMM d, yyyy')}
          </Text>
          <Chip
            mode="outlined"
            style={styles.countChip}
            textStyle={{ color: activeTheme.colors.primary }}
          >
            {entry.statements.length}
          </Chip>
        </View>

        <FlatList
          data={entry.statements}
          renderItem={renderStatement}
          keyExtractor={(_, index) => `statement-${index}`}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </Card.Content>
    </Card>
  );
};

// Statement item component
const StatementItem: React.FC<{
  statement: string;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  editable: boolean;
  isDeleting: boolean;
  theme: AppTheme;
}> = ({ statement, index, onEdit, onDelete, editable, isDeleting, theme }) => (
  <View style={styles.statementItem}>
    <View style={styles.statementContent}>
      <Text style={[styles.statementNumber, { color: theme.colors.primary }]}>
        {index + 1}.
      </Text>
      <Text style={[styles.statementText, { color: theme.colors.text }]}>
        {statement}
      </Text>
    </View>

    {editable && (
      <View style={styles.actions}>
        <IconButton
          icon="pencil"
          size={18}
          onPress={onEdit}
          disabled={isDeleting}
          iconColor={theme.colors.textSecondary}
          testID={`edit-statement-${index}`}
        />
        <IconButton
          icon="delete"
          size={18}
          onPress={onDelete}
          disabled={isDeleting}
          iconColor={theme.colors.error}
          testID={`delete-statement-${index}`}
        />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  centerContent: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  countChip: {
    marginLeft: 8,
  },
  separator: {
    height: 12,
  },
  statementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  statementContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statementNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
    minWidth: 20,
  },
  statementText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
});
```

### 4. Modal Components with State

Components that handle complex interactions with modals:

```typescript
// src/components/features/EnhancedThrowbackModal.tsx
import React from 'react';
import { View, Text, Modal, ScrollView } from 'react-native';
import { Card, Button, IconButton } from 'react-native-paper';
import { useThrowback } from '@/hooks/useThrowback';
import { useThemeStore } from '@/store/themeStore';
import { format } from 'date-fns';

export const EnhancedThrowbackModal: React.FC = () => {
  const { activeTheme } = useThemeStore();
  const {
    isThrowbackVisible,
    randomEntry,
    isLoading,
    error,
    hideThrowback,
    refreshRandomEntry,
  } = useThrowback();

  if (!isThrowbackVisible) return null;

  return (
    <Modal
      visible={isThrowbackVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={hideThrowback}
    >
      <View style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: activeTheme.colors.text }]}>
            Memory Lane
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={hideThrowback}
            iconColor={activeTheme.colors.textSecondary}
            testID="close-throwback-modal"
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading && (
            <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
              <Card.Content style={styles.centerContent}>
                <ActivityIndicator size="large" color={activeTheme.colors.primary} />
                <Text style={[styles.loadingText, { color: activeTheme.colors.textSecondary }]}>
                  Finding a special memory...
                </Text>
              </Card.Content>
            </Card>
          )}

          {error && (
            <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
              <Card.Content style={styles.centerContent}>
                <Text style={[styles.errorText, { color: activeTheme.colors.error }]}>
                  Couldn't load memory
                </Text>
                <Text style={[styles.errorDetails, { color: activeTheme.colors.textSecondary }]}>
                  {error.message}
                </Text>
                <Button
                  mode="outlined"
                  onPress={refreshRandomEntry}
                  style={styles.retryButton}
                >
                  Try Again
                </Button>
              </Card.Content>
            </Card>
          )}

          {randomEntry && !isLoading && !error && (
            <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
              <Card.Content>
                <Text style={[styles.dateText, { color: activeTheme.colors.primary }]}>
                  {format(new Date(randomEntry.entry_date), 'EEEE, MMMM d, yyyy')}
                </Text>

                <Text style={[styles.subtitle, { color: activeTheme.colors.textSecondary }]}>
                  You were grateful for:
                </Text>

                {randomEntry.statements.map((statement, index) => (
                  <View key={index} style={styles.statementItem}>
                    <Text style={[styles.statementNumber, { color: activeTheme.colors.primary }]}>
                      {index + 1}.
                    </Text>
                    <Text style={[styles.statementText, { color: activeTheme.colors.text }]}>
                      {statement}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {!randomEntry && !isLoading && !error && (
            <Card style={[styles.card, { backgroundColor: activeTheme.colors.surface }]}>
              <Card.Content style={styles.centerContent}>
                <Text style={[styles.noEntryText, { color: activeTheme.colors.textSecondary }]}>
                  No previous entries found
                </Text>
                <Text style={[styles.noEntrySubtext, { color: activeTheme.colors.textSecondary }]}>
                  Start writing gratitude statements to create memories!
                </Text>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={refreshRandomEntry}
            disabled={isLoading}
            style={styles.refreshButton}
            testID="refresh-memory-button"
          >
            Another Memory
          </Button>

          <Button
            mode="contained"
            onPress={hideThrowback}
            style={styles.closeButton}
            testID="close-modal-button"
          >
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    elevation: 2,
    marginBottom: 16,
  },
  centerContent: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorDetails: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    minWidth: 100,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  statementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statementNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
    minWidth: 20,
  },
  statementText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  noEntryText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  noEntrySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  refreshButton: {
    flex: 1,
  },
  closeButton: {
    flex: 1,
  },
});
```

### 2. Hook Implementation Patterns

This section provides a reference for the implementation of the core TanStack Query hooks that power the application's components. These patterns demonstrate best practices for queries, mutations, optimistic updates, and cache management.

#### User Profile Hook (`useUserProfile`)

This hook manages all data and actions related to the user's profile, including notification settings. It features an optimistic update for a highly responsive feel when settings are changed.

**Location**: `src/shared/hooks/useUserProfile.ts`

```typescript
export const useUserProfile = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile query
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<Profile | null, Error>({
    queryKey: queryKeys.profile(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      return await getProfile(); // API call
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Profile update mutation
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation<
    Profile,
    Error,
    Partial<Profile>
  >({
    mutationFn: async (updates) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await updateProfileApi(updates); // API call
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile(user?.id) });
      const previousProfile = queryClient.getQueryData<Profile>(queryKeys.profile(user?.id));
      queryClient.setQueryData(queryKeys.profile(user?.id), (old?: Profile | null) =>
        old ? { ...old, ...updates } : null
      );
      return { previousProfile };
    },
    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile(user?.id), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) });
    },
  });

  return { profile, isLoading, error, refetchProfile: refetch, updateProfile, isUpdatingProfile };
};
```

#### Gratitude Query Hooks (`useGratitudeQueries`)

These hooks are responsible for all read operations related to gratitude entries.

**Location**: `src/features/gratitude/hooks/useGratitudeQueries.ts`

```typescript
// Fetches all gratitude entries for the user
export const useGratitudeEntries = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.gratitudeEntries(user?.id),
    queryFn: () => getGratitudeDailyEntries(),
    enabled: !!user?.id,
  });
};

// Fetches a single entry for a specific date
export const useGratitudeEntry = (entryDate: string) => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
    queryFn: () => getGratitudeDailyEntryByDate(entryDate),
    enabled: !!user?.id && !!entryDate,
    staleTime: 30 * 1000, // Shorter stale time for the active day
  });
};
```

#### Gratitude Mutation Hook (`useGratitudeMutations`)

This hook manages all write operations for gratitude entries, featuring optimistic updates for adding, editing, and deleting statements.

**Location**: `src/features/gratitude/hooks/useGratitudeMutations.ts`

```typescript
export const useGratitudeMutations = (entryDate: string) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Utility to invalidate all related gratitude queries
  const invalidateGratitudeData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.gratitudeEntries(user?.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.streaks(user?.id) });
  };

  // Add Statement Mutation
  const addStatement = useMutation({
    mutationFn: (statement: string) => addGratitudeStatement(entryDate, statement),
    onMutate: async (newStatement) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.gratitudeEntry(user?.id, entryDate) });
      const previousEntry = queryClient.getQueryData<GratitudeEntry>(queryKeys.gratitudeEntry(user?.id, entryDate));

      // Optimistically update the entry
      const optimisticEntry = { ... };
      queryClient.setQueryData(queryKeys.gratitudeEntry(user?.id, entryDate), optimisticEntry);

      return { previousEntry };
    },
    onError: (err, newStatement, context) => {
      if (context?.previousEntry) {
        queryClient.setQueryData(queryKeys.gratitudeEntry(user?.id, entryDate), context.previousEntry);
      }
    },
    onSettled: () => {
      invalidateGratitudeData();
    },
  });

  // (Edit and Delete statement mutations follow a similar pattern)

  return { addStatement, ... };
};
```

## 🎯 Client State Components

### Components using Zustand for UI state

```typescript
// src/components/features/ThemeToggle.tsx
import React from 'react';
import { View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useThemeStore } from '@/store/themeStore';

export const ThemeToggle: React.FC = () => {
  const { activeThemeName, toggleTheme, activeTheme } = useThemeStore();

  return (
    <View style={styles.container}>
      <IconButton
        icon={activeThemeName === 'light' ? 'weather-sunny' : 'weather-night'}
        size={24}
        onPress={toggleTheme}
        iconColor={activeTheme.colors.primary}
        testID="theme-toggle"
      />
      <Text style={[styles.label, { color: activeTheme.colors.textSecondary }]}>
        {activeThemeName === 'light' ? 'Light Theme' : 'Dark Theme'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    marginLeft: 8,
  },
});
```

## 📱 Screen Components

### Modern Screen Architecture

Screen components orchestrate multiple feature components:

```typescript
// src/screens/EnhancedHomeScreen.tsx
import React from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGratitudeEntry } from '@/hooks/useGratitudeQueries';
import { useStreakData } from '@/hooks/useStreakData';
import { useThemeStore } from '@/store/themeStore';
import { UserProfileCard } from '@/components/features/UserProfileCard';
import { StreakDisplay } from '@/components/features/StreakDisplay';
import { GratitudeStatementForm } from '@/components/features/GratitudeStatementForm';
import { QuickActionsCard } from '@/components/features/QuickActionsCard';
import { DiscoverySection } from '@/components/features/DiscoverySection';
import { format } from 'date-fns';

export const EnhancedHomeScreen: React.FC = () => {
  const { activeTheme } = useThemeStore();
  const currentDate = format(new Date(), 'yyyy-MM-dd');

  // TanStack Query hooks for server state
  const { profile, isLoading: profileLoading, refetchProfile } = useUserProfile();
  const { data: todaysEntry, isLoading: entryLoading } = useGratitudeEntry(currentDate);
  const { data: streak, isLoading: streakLoading } = useStreakData();

  // Combine loading states
  const isLoading = profileLoading || entryLoading || streakLoading;

  const handleRefresh = async () => {
    // Refresh all data
    await refetchProfile();
    // Other queries will automatically refetch if stale
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: activeTheme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={activeTheme.colors.primary}
          />
        }
      >
        {/* User Profile Section */}
        <UserProfileCard />

        {/* Streak Display */}
        {streak && (
          <StreakDisplay
            currentStreak={streak.current_streak}
            longestStreak={streak.longest_streak}
            lastEntryDate={streak.last_entry_date}
          />
        )}

        {/* Today's Gratitude Form */}
        <GratitudeStatementForm
          entryDate={currentDate}
          onSubmitSuccess={() => {
            // Handle success if needed
          }}
        />

        {/* Quick Actions */}
        <QuickActionsCard
          hasEntryToday={!!todaysEntry && todaysEntry.statements.length > 0}
          onViewPastEntries={() => {
            // Navigation handled by parent
          }}
          onViewCalendar={() => {
            // Navigation handled by parent
          }}
        />

        {/* Discovery Section */}
        <DiscoverySection />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  bottomSpacing: {
    height: 32,
  },
});
```

## 🔄 Component Communication

### Props vs Hooks Pattern

```typescript
// ❌ Avoid: Prop drilling
const Parent = () => {
  const { profile } = useUserProfile();
  return <Child profile={profile} />;
};

const Child = ({ profile }: { profile: Profile }) => {
  return <GrandChild profile={profile} />;
};

// ✅ Prefer: Hook usage at component level
const Parent = () => {
  return <Child />;
};

const Child = () => {
  const { profile } = useUserProfile(); // Use hook directly
  return <GrandChild />;
};
```

### Event Handling Patterns

```typescript
// Component with event handlers
interface ComponentProps {
  onAction?: (data: SomeData) => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

const Component: React.FC<ComponentProps> = ({ onAction, onError, onSuccess }) => {
  const { mutate, isLoading, error } = useSomeMutation();

  const handleSubmit = (data: SomeData) => {
    mutate(data, {
      onSuccess: () => {
        onSuccess?.();
      },
      onError: (err) => {
        onError?.(err);
      },
    });
  };

  // Component implementation
};
```

## 🎨 Styling Best Practices

### Responsive Design

```typescript
// Responsive styles using theme
const useResponsiveStyles = () => {
  const { activeTheme } = useThemeStore();

  return StyleSheet.create({
    container: {
      padding: activeTheme.spacing.md,
      margin: activeTheme.spacing.sm,
    },
    title: {
      ...activeTheme.typography.headingMedium,
      color: activeTheme.colors.text,
    },
    card: {
      backgroundColor: activeTheme.colors.surface,
      borderRadius: activeTheme.borderRadius.medium,
      elevation: 2,
    },
  });
};

// Usage in component
const Component = () => {
  const styles = useResponsiveStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Title</Text>
    </View>
  );
};
```

### Platform-Specific Styles

```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

## 🧪 Component Testing

### Testing TanStack Query Components

```typescript
// Component test with TanStack Query
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileCard } from '../UserProfileCard';

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('UserProfileCard displays loading state', async () => {
  const Wrapper = createTestWrapper();

  const { getByText } = render(
    <Wrapper>
      <UserProfileCard />
    </Wrapper>
  );

  expect(getByText('Loading profile...')).toBeTruthy();
});
```

## 🚀 Performance Optimization

### Component Memoization

```typescript
// Memoize expensive components
export const ExpensiveComponent = React.memo<Props>(({ data, onAction }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  const handleAction = useCallback(() => {
    onAction?.(processedData);
  }, [onAction, processedData]);

  return (
    <View>
      {/* Component content */}
    </View>
  );
});

// Custom comparison function if needed
export const SmartComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.importantProp === nextProps.importantProp;
});
```

### Lazy Loading

```typescript
// Lazy load heavy components
const HeavyModal = React.lazy(() => import('./HeavyModal'));

const App = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <View>
      {/* Other content */}

      <React.Suspense fallback={<ActivityIndicator />}>
        {showModal && <HeavyModal onClose={() => setShowModal(false)} />}
      </React.Suspense>
    </View>
  );
};
```

## 🔮 Advanced Patterns

### Higher-Order Components

```typescript
// HOC for loading states
const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P & { isLoading?: boolean }) => {
    const { isLoading, ...componentProps } = props;

    if (isLoading) {
      return <LoadingSpinner />;
    }

    return <Component {...(componentProps as P)} />;
  };
};

// Usage
const EnhancedComponent = withLoadingState(MyComponent);
```

### Render Props Pattern

```typescript
// Render props for data fetching
interface DataFetcherProps<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  children: (data: {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
  }) => React.ReactNode;
}

const DataFetcher = <T,>({ queryKey, queryFn, children }: DataFetcherProps<T>) => {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn,
  });

  return <>{children({ data, isLoading, error })}</>;
};

// Usage
<DataFetcher
  queryKey={['profile']}
  queryFn={getProfile}
>
  {({ data: profile, isLoading, error }) => (
    <>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {profile && <ProfileDisplay profile={profile} />}
    </>
  )}
</DataFetcher>
```

---

This component guide provides comprehensive patterns and best practices for building maintainable, performant, and well-architected components in the modern TanStack Query + Zustand architecture of the Yeser gratitude app.
