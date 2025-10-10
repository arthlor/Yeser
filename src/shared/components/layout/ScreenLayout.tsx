import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Animated } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface ScreenLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  scrollRef?: React.Ref<ScrollView>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  animatedScroll?: boolean;
  keyboardAware?: boolean;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  keyboardVerticalOffset?: number; // iOS header/safe-area offset for KAV
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

  // Optional maximum content width for large screens (iPad/tablet)
  maxContentWidth?: number;

  // Whether to constrain content width on large screens (default: true)
  constrainContentWidth?: boolean;
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
  scrollRef,
  onScroll,
  animatedScroll = false,
  keyboardAware = false,
  keyboardDismissMode = 'interactive',
  keyboardShouldPersistTaps = 'handled',
  keyboardVerticalOffset,
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
  maxContentWidth = 900,
  constrainContentWidth = true,
}) => {
  const { theme, colorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () =>
      createStyles(
        theme,
        insets,
        edges,
        density,
        edgeToEdge,
        width,
        maxContentWidth,
        constrainContentWidth
      ),
    [theme, insets, edges, density, edgeToEdge, width, maxContentWidth, constrainContentWidth]
  );

  const defaultStatusBarStyle =
    statusBarStyle || (colorMode === 'dark' ? 'light-content' : 'dark-content');
  const screenBackgroundColor = backgroundColor || theme.colors.surface;
  const containerBackgroundStyle = useMemo(
    () => ({ backgroundColor: screenBackgroundColor }),
    [screenBackgroundColor]
  );

  const content = (
    <View style={[styles.container, containerBackgroundStyle, style]}>
      {showStatusBar && (
        <StatusBar
          backgroundColor={screenBackgroundColor}
          barStyle={defaultStatusBarStyle}
          translucent={false}
        />
      )}

      {scrollable ? (
        animatedScroll ? (
          <Animated.ScrollView
            ref={scrollRef as never}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            keyboardDismissMode={keyboardDismissMode}
            contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {children}
          </Animated.ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            keyboardDismissMode={keyboardDismissMode}
            contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        )
      ) : (
        <View style={[styles.content, contentContainerStyle]}>
          <View style={styles.contentInnerFull}>{children}</View>
        </View>
      )}
    </View>
  );

  if (keyboardAware) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? // Prefer explicit prop; otherwise use top inset as a sane default
              typeof keyboardVerticalOffset === 'number'
              ? keyboardVerticalOffset
              : insets.top
            : 0
        }
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
  edgeToEdge: boolean,
  screenWidth: number,
  maxContentWidth: number,
  constrainContentWidth: boolean
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

  const constrainedWidth = constrainContentWidth
    ? Math.min(screenWidth, maxContentWidth)
    : screenWidth;

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
    contentInner: {
      width: constrainedWidth,
      alignSelf: 'center',
    },
    contentInnerFull: {
      width: '100%',
      alignSelf: 'stretch',
      flex: 1,
    },
  });
};

export default ScreenLayout;
