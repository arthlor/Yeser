import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface OnboardingMascotProps {
  source: number | { uri: string };
  height?: number;
  width?: number;
  delay?: number;
}

/**
 * Standardized mascot component for onboarding steps.
 *
 * Notes:
 * - `expo-image` `transition` is intentionally disabled. When enabled, any
 *   re-layout (TextInput focus, keyboard appearing, parent re-render) could
 *   replay the cross-fade and appear as a flicker on first interaction.
 * - The entrance/float animation is driven by Reanimated shared values and
 *   only runs once per mount. We guard it with a ref so React StrictMode
 *   or rapid prop identity changes can't re-trigger the fade-in.
 */
export const OnboardingMascot: React.FC<OnboardingMascotProps> = ({
  source,
  height = 140,
  width = 140,
  delay = 0,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, height, width);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const floatValue = useSharedValue(0);

  // Prevent the entrance animation from being re-triggered on subsequent
  // effect runs (e.g. if a parent re-renders and passes new prop identities).
  const hasAnimatedIn = useRef(false);

  useEffect(() => {
    if (hasAnimatedIn.current) {
      return;
    }
    hasAnimatedIn.current = true;

    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      })
    );
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));

    // Continuous float: 0 -> 1 -> 0 repeating forever, handled entirely on
    // the UI thread by Reanimated. Using withRepeat avoids the worklet/JS
    // boundary that recursive `withTiming` callbacks would cross.
    floatValue.value = withDelay(
      delay + 600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(floatValue);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value + floatValue.value * 6 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mascotWrapper, animatedStyle]}>
        <Image
          source={source}
          style={styles.image}
          contentFit="contain"
          // Transition intentionally disabled to avoid re-layout flicker.
          transition={0}
          cachePolicy="memory-disk"
          priority="high"
        />
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: AppTheme, height: number, width: number) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      zIndex: 1,
    },
    mascotWrapper: {
      width,
      height,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });

export default OnboardingMascot;
