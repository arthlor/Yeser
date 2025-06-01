// src/screens/EnhancedSplashScreen.tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';

/**
 * Enhanced splash screen with polished animations
 * Uses staggered animations for a more engaging user experience
 */
const EnhancedSplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Log screen view for analytics
  useEffect(() => {
    analyticsService.logScreenView('splash_screen');
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="Yeşer uygulama logosu"
        >
          Yeşer
        </Text>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View
            style={styles.loadingIndicator}
            accessibilityRole="progressbar"
            accessibilityLabel="Yükleniyor"
          />
        </View>

        {/* Loading text */}
        <Text style={styles.loadingText} accessibilityLabel="Yükleniyor">
          Yükleniyor...
        </Text>
      </View>

      {/* App version */}
      <Text style={styles.versionText}>v1.0.0</Text>
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
      padding: theme.spacing.lg,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...theme.typography.displayLarge,
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    loadingContainer: {
      marginVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
    },
    loadingIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
      marginBottom: theme.spacing.sm,
    },
    loadingText: {
      ...theme.typography.titleMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    versionText: {
      ...theme.typography.labelSmall,
      color: theme.colors.tertiary,
      position: 'absolute',
      bottom: theme.spacing.lg,
    },
  });

export default EnhancedSplashScreen;
