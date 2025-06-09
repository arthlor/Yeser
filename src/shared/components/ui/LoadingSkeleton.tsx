import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing } from '../../../themes/utils';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  lines?: number; // For text variant
  spacing?: number; // Spacing between lines
  shimmerSpeed?: number; // Animation duration in ms
}

/**
 * 🎯 LOADING SKELETON COMPONENT
 * Beautiful, animated loading states for better user experience
 *
 * Features:
 * - Smooth shimmer animation
 * - Multiple variants (text, circular, rectangular, rounded)
 * - Multi-line text skeleton support
 * - Customizable appearance and timing
 * - Semantic spacing integration
 * - Theme-aware styling
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width,
  height,
  borderRadius,
  style,
  variant = 'rectangular',
  lines = 1,
  spacing,
  shimmerSpeed = 1500,
}) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Shimmer animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: shimmerSpeed,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue, shimmerSpeed]);

  const styles = createStyles(theme, variant, width, height, borderRadius);

  // Shimmer effect
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  // Single skeleton item
  const renderSkeletonItem = (itemStyle?: ViewStyle, key?: number) => (
    <View key={key} style={[styles.skeleton, itemStyle, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      />
    </View>
  );

  // Multi-line text skeleton
  if (variant === 'text' && lines > 1) {
    return (
      <View style={styles.container}>
        {Array.from({ length: lines }).map((_, index) => {
          const isLastLine = index === lines - 1;
          const lineWidth = isLastLine ? '75%' : '100%'; // Last line typically shorter
          const lineSpacing = spacing || semanticSpacing(theme).elementGap;

          return renderSkeletonItem(
            {
              width: lineWidth,
              marginBottom: index < lines - 1 ? lineSpacing : 0,
            },
            index
          );
        })}
      </View>
    );
  }

  // Single skeleton item
  return renderSkeletonItem();
};

/**
 * 🎨 SKELETON STYLING SYSTEM
 * Theme-aware styling with variant support
 */
const createStyles = (
  theme: AppTheme,
  variant: 'text' | 'circular' | 'rectangular' | 'rounded',
  width?: number | string,
  height?: number,
  borderRadius?: number
) => {

  // Variant-specific defaults
  const variantDefaults = {
    text: {
      width: '100%',
      height: 16,
      borderRadius: theme.borderRadius.sm,
    },
    circular: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    rectangular: {
      width: '100%',
      height: 20,
      borderRadius: 0,
    },
    rounded: {
      width: '100%',
      height: 20,
      borderRadius: theme.borderRadius.md,
    },
  };

  const defaults = variantDefaults[variant];

  return StyleSheet.create({
    container: {
      width: '100%',
    },

    skeleton: {
      width: width || defaults.width,
      height: height || defaults.height,
      borderRadius: borderRadius !== undefined ? borderRadius : defaults.borderRadius,
      backgroundColor: theme.colors.surfaceVariant || theme.colors.surface,
      overflow: 'hidden',
      position: 'relative',
    } as ViewStyle,

    shimmer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface,
      opacity: 0.5,
    },
  });
};

/**
 * 🏗️ PRESET SKELETON COMPONENTS
 * Pre-configured skeleton components for common use cases
 */

// Text skeletons
export const TextSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="text" {...props} />
);

export const ParagraphSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant' | 'lines'>> = (
  props
) => <LoadingSkeleton variant="text" lines={3} {...props} />;

// Shape skeletons
export const CircularSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="circular" {...props} />
);

export const CardSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = (props) => (
  <LoadingSkeleton variant="rounded" height={120} {...props} />
);

// Button skeleton
export const ButtonSkeleton: React.FC<Omit<LoadingSkeletonProps, 'variant'>> = ({
  height = 44,
  ...props
}) => <LoadingSkeleton variant="rounded" height={height} {...props} />;

// Avatar skeleton
export const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <LoadingSkeleton variant="circular" width={size} height={size} />
);

// List item skeleton
export const ListItemSkeleton: React.FC<{ showAvatar?: boolean }> = ({ showAvatar = false }) => {
  const { theme } = useTheme();
  const spacing = semanticSpacing(theme);

  return (
    <View style={[styles.listItem, { padding: spacing.listItemPadding }]}>
      {showAvatar && (
        <View style={styles.avatar}>
          <AvatarSkeleton size={40} />
        </View>
      )}
      <View style={styles.content}>
        <TextSkeleton height={16} style={{ marginBottom: spacing.elementGap }} />
        <TextSkeleton height={14} width="70%" />
      </View>
    </View>
  );
};

// Shared styles for composite skeletons
const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
});

export default LoadingSkeleton;
