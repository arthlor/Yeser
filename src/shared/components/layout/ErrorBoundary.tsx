import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';
import { AppTheme } from '@/themes/types';

// A complete, static fallback theme based on the light theme structure.
// This ensures the ErrorBoundary can always render without relying on context.
const fallbackTheme: AppTheme = {
  name: 'light',
  colors: {
    primary: '#0F766E',
    onPrimary: '#F0FDFA',
    primaryVariant: '#0D9488',
    primaryContainer: '#F0FDFA',
    onPrimaryContainer: '#042F2E',
    secondary: '#92400E',
    onSecondary: '#FEF3C7',
    secondaryContainer: '#FEF3C7',
    onSecondaryContainer: '#451A03',
    tertiary: '#0369A1',
    onTertiary: '#E0F2FE',
    tertiaryContainer: '#E0F2FE',
    onTertiaryContainer: '#0C4A6E',
    accent: '#CA8A04',
    onAccent: '#FEF3C7',
    accentContainer: '#FEF3C7',
    onAccentContainer: '#713F12',
    background: '#F8FAFC',
    onBackground: '#1E293B',
    surface: '#FFFFFF',
    onSurface: '#1E293B',
    surfaceVariant: '#F1F5F9',
    onSurfaceVariant: '#475569',
    surfaceTint: '#0F766E',
    inverseSurface: '#334155',
    inverseOnSurface: '#F8FAFC',
    surfaceElevated: '#FEFEFE',
    surfaceContainer: '#F8FAFC',
    surfaceBright: '#FFFFFF',
    surfaceDim: '#F1F5F9',
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',
    scrim: 'rgba(15, 23, 42, 0.5)',
    borderLight: '#F1F5F9',
    borderMedium: '#E2E8F0',
    borderStrong: '#CBD5E1',
    success: '#059669',
    onSuccess: '#F0FDF4',
    successContainer: '#ECFDF5',
    onSuccessContainer: '#064E3B',
    warning: '#D97706',
    onWarning: '#FEF3C7',
    warningContainer: '#FEF3C7',
    onWarningContainer: '#92400E',
    error: '#DC2626',
    onError: '#FEF2F2',
    errorContainer: '#FEF2F2',
    onErrorContainer: '#7F1D1D',
    info: '#0284C7',
    onInfo: '#E0F2FE',
    infoContainer: '#E0F2FE',
    onInfoContainer: '#0369A1',
    disabled: '#94A3B8',
    onDisabled: '#64748B',
    hover: 'rgba(15, 118, 110, 0.04)',
    pressed: 'rgba(15, 118, 110, 0.08)',
    focus: 'rgba(15, 118, 110, 0.12)',
    selected: 'rgba(15, 118, 110, 0.06)',
    hoverStrong: 'rgba(15, 118, 110, 0.10)',
    focusRing: '#0F766E',
    activeState: 'rgba(15, 118, 110, 0.15)',
    gradientStart: '#0F766E',
    gradientEnd: '#059669',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    inputBackground: '#FEFEFE',
    inputText: '#1E293B',
    danger: '#DC2626',
    onDanger: '#FEF2F2',
    shadow: 'rgba(15, 23, 42, 0.08)',
    surfaceDisabled: '#F1F5F9',
  },
  typography: {
    fontFamilyRegular: 'Inter-Regular',
    fontFamilyMedium: 'Inter-Medium',
    fontFamilyBold: 'Inter-Bold',
    fontFamilyMono: 'JetBrainsMono-Regular',
    fontFamilySerif: 'Lora-Regular',
    fontFamilySerifMedium: 'Lora-Medium',
    fontFamilySerifBold: 'Lora-Bold',
    displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64 },
    displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52 },
    displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44 },
    headlineLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.5 },
    headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: -0.3 },
    headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32, letterSpacing: -0.2 },
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.1 },
    titleMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    titleSmall: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 26, letterSpacing: 0.1 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 22, letterSpacing: 0.1 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18, letterSpacing: 0.2 },
    labelLarge: { fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.3 },
    labelSmall: { fontSize: 11, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5 },
    h1: { fontSize: 32, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: 'bold' },
    body1: { fontSize: 16 },
    body2: { fontSize: 14 },
    button: { fontSize: 16, fontWeight: '500' },
    caption: { fontSize: 12 },
    overline: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
    subtitle1: { fontSize: 18, fontWeight: '500' },
    label: { fontSize: 14, fontWeight: '500' },
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    component: 16,
    section: 28,
    page: 16,
    content: 12,
    edge: 6,
    small: 8,
    medium: 16,
    large: 24,
  },
  borderRadius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
    small: 4,
    medium: 8,
    large: 16,
  },
  elevation: {
    none: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    sm: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 8,
    },
    xl: {
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 28,
      elevation: 12,
    },
    card: {
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    floating: {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
      elevation: 8,
    },
    overlay: {
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 16,
    },
  },
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    analyticsService.logEvent('error_boundary_triggered', {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 1000) || null,
      component_stack: errorInfo.componentStack?.substring(0, 1000) || null,
    });

    if (__DEV__) {
      logger.error('Error Boundary caught an error:', error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    analyticsService.logEvent('error_boundary_retry');
  };

  render() {
    const theme = fallbackTheme; // Always use the static fallback theme
    const styles = createStyles(theme);

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
            <Text style={styles.title}>Bir şeyler ters gitti</Text>
            <Text style={styles.message}>
              Beklenmeyen bir hata oluştu. Lütfen uygulamayı yeniden başlatmayı deneyin.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.spacing.page,
    },
    content: {
      alignItems: 'center',
      maxWidth: 300,
    },
    title: {
      fontFamily: 'Lora-Medium',
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      letterSpacing: -0.2,
      lineHeight: 24,
    },
    message: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    debugInfo: {
      backgroundColor: theme.colors.errorContainer + '40',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.xl,
      width: '100%',
    },
    debugTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.onErrorContainer,
      marginBottom: theme.spacing.xs,
    },
    debugText: {
      fontSize: 12,
      color: theme.colors.onErrorContainer,
      fontFamily: 'monospace',
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    retryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default ErrorBoundary;
