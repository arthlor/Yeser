import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAware?: boolean;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  showStatusBar?: boolean;
  statusBarStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
  showsVerticalScrollIndicator?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  density?: 'comfortable' | 'standard' | 'compact';
  edgeToEdge?: boolean;
}

/**
 * Standardized screen layout component that ensures consistent:
 * - Safe area handling
 * - Spacing and margins
 * - Keyboard avoidance and behavior
 * - Status bar configuration
 * - Scroll behavior
 * - Edge-to-edge support
 * - Customizable keyboard dismiss modes
 */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  scrollable = true,
  keyboardAware = false,
  keyboardDismissMode = 'interactive',
  keyboardShouldPersistTaps = 'handled',
  showStatusBar = true,
  statusBarStyle,
  backgroundColor,
  contentContainerStyle,
  style,
  refreshControl,
  showsVerticalScrollIndicator = false,
  edges = ['top', 'bottom'],
  density = 'standard',
  edgeToEdge = false,
}) => {
  const { theme, colorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets, edges, density, edgeToEdge);

  const defaultStatusBarStyle =
    statusBarStyle || (colorMode === 'dark' ? 'light-content' : 'dark-content');
  const screenBackgroundColor = backgroundColor || theme.colors.background;

  const content = (
    <View style={[styles.container, { backgroundColor: screenBackgroundColor }, style]}>
      {showStatusBar && (
        <StatusBar
          backgroundColor={screenBackgroundColor}
          barStyle={defaultStatusBarStyle}
          translucent={false}
        />
      )}

      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number },
  edges: ('top' | 'bottom' | 'left' | 'right')[],
  density: 'comfortable' | 'standard' | 'compact',
  edgeToEdge: boolean
) => {
  // Modern spacing based on density and edge-to-edge preference
  const getHorizontalSpacing = () => {
    if (edgeToEdge) {
      return 0; // No horizontal padding for edge-to-edge
    }

    switch (density) {
      case 'compact':
        return theme.spacing.content; // 8px - very tight for lists
      case 'comfortable':
        return theme.spacing.md; // 16px - spacious for forms
      case 'standard':
      default:
        return theme.spacing.page; // 12px - modern standard
    }
  };

  const getBottomSpacing = () => {
    if (edgeToEdge) {
      return 0; // Minimal bottom padding for edge-to-edge
    }

    switch (density) {
      case 'compact':
        return theme.spacing.md; // 16px
      case 'comfortable':
        return theme.spacing.xl; // 32px
      case 'standard':
      default:
        return theme.spacing.lg; // 24px - reduced from xl for modern feel
    }
  };

  return StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingTop: edges.includes('top') ? insets.top : 0,
      paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      paddingLeft: edges.includes('left') ? insets.left : 0,
      paddingRight: edges.includes('right') ? insets.right : 0,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: getHorizontalSpacing(),
      paddingBottom: getBottomSpacing(),
    },
    content: {
      flex: 1,
      paddingHorizontal: getHorizontalSpacing(),
    },
  });
};

export default ScreenLayout;
