import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/shared/components/layout';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  edgeToEdge?: boolean;
}

/**
 * Standardized onboarding layout component ensuring:
 * - Fullscreen scrollable content
 * - Proper Android navigation bar handling
 * - Consistent safe area insets
 * - Edge-to-edge design on modern devices
 * - Prevents button overlap with device menu
 * - Optional edge-to-edge mode for full immersion
 */
export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  edgeToEdge = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets, edgeToEdge);

  return (
    <ScreenLayout
      edges={['top']} // Handle top safe area only
      edgeToEdge={true} // Always enable fullscreen layout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.screenContainer}
      keyboardDismissMode="interactive"
    >
      <View style={styles.contentContainer}>{children}</View>

      {/* Android Navigation Bar Safe Area Spacer */}
      {Platform.OS === 'android' && <View style={styles.androidBottomSpacer} />}
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme, insets: { bottom: number }, edgeToEdge: boolean) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: edgeToEdge ? 0 : theme.spacing.lg, // Consistent horizontal padding
      // Ensure content never touches edges
      paddingTop: theme.spacing.md,
    },
    contentContainer: {
      flex: 1,
      minHeight: '100%', // Ensure content takes full height for proper spacing
    },
    androidBottomSpacer: {
      // Extra bottom padding for Android to prevent overlap with navigation bar
      paddingBottom:
        Platform.OS === 'android' ? Math.max(insets.bottom, theme.spacing.xl) : insets.bottom,
      backgroundColor: theme.colors.background,
    },
  });

export default OnboardingLayout;
