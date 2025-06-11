import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { semanticSpacing } from '@/themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

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
 * 🎯 COORDINATED LOADING SKELETON
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Integrated coordinated animation system for consistency
 * - Maintained essential shimmer animation for loading feedback
 * - Simplified animation system while preserving functionality
 * - Enhanced performance with coordinated approach
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

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  // **ESSENTIAL SHIMMER ANIMATION**: Keep minimal shimmer for loading feedback
  const shimmerValue = useRef(new Animated.Value(0)).current;

  // **MINIMAL SHIMMER**: Essential loading indication
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: shimmerSpeed,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerValue, shimmerSpeed]);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 300 });
  }, [animations]);

  const styles = createStyles(theme, variant, width, height, borderRadius);

  // **MINIMAL SHIMMER EFFECT**: Essential for loading indication
  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  // Single skeleton item
  const renderSkeletonItem = (itemStyle?: ViewStyle, key?: number) => (
    <Animated.View
      key={key}
      style={[
        styles.skeleton,
        itemStyle,
        style,
        {
          opacity: animations.fadeAnim, // Coordinated entrance animation
        },
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      />
    </Animated.View>
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

LoadingSkeleton.displayName = 'LoadingSkeleton';

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
  height = 48,
  ...props
}) => <LoadingSkeleton variant="rounded" height={height} {...props} />;

// Avatar skeleton
export const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <LoadingSkeleton variant="circular" width={size} height={size} />
);

// List item skeleton
export const ListItemSkeleton: React.FC<{ showAvatar?: boolean }> = ({ showAvatar = false }) => {
  const listItemStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    avatarContainer: {
      marginRight: 12,
    },
    contentContainer: {
      flex: 1,
    },
    titleSkeleton: {
      marginBottom: 8,
    },
  });

  return (
    <View style={listItemStyles.container}>
      {showAvatar && (
        <View style={listItemStyles.avatarContainer}>
          <AvatarSkeleton />
        </View>
      )}
      <View style={listItemStyles.contentContainer}>
        <TextSkeleton height={16} style={listItemStyles.titleSkeleton} />
        <TextSkeleton height={14} width="60%" />
      </View>
    </View>
  );
};

export default LoadingSkeleton;
