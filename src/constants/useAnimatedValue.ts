import { useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';

type AnimationConfig = {
  toValue: number;
  duration?: number;
  delay?: number;
  useNativeDriver?: boolean;
};

/**
 * Custom hook for creating and managing animated values
 *
 * @param initialValue - The initial value of the animation
 * @returns An object with the animated value and utility functions
 */
export const useAnimatedValue = (initialValue: number = 0) => {
  const { theme } = useTheme();
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const durationNormal = theme.animations.duration?.normal;

  const startTiming = useCallback(
    (config: AnimationConfig, callback?: (finished: boolean) => void) => {
      const { toValue, duration, delay = 0, useNativeDriver = true } = config;

      Animated.timing(animatedValue, {
        toValue,
        duration: duration || durationNormal || 300,
        delay,
        useNativeDriver,
      }).start(({ finished }) => {
        if (callback) {
          callback(finished);
        }
      });
    },
    [animatedValue, durationNormal]
  );

  const startSpring = useCallback(
    (
      config: AnimationConfig & { friction?: number; tension?: number },
      callback?: (finished: boolean) => void
    ) => {
      const {
        toValue,
        friction = 7,
        tension = 40,
        delay = 0,
        useNativeDriver = true,
      } = config;

      Animated.spring(animatedValue, {
        toValue,
        friction,
        tension,
        delay,
        useNativeDriver,
      }).start(({ finished }) => {
        if (callback) {
          callback(finished);
        }
      });
    },
    [animatedValue] // Corrected: theme dependency removed as it's not used
  );

  const reset = useCallback(
    (value: number = initialValue) => {
      animatedValue.setValue(value);
    },
    [animatedValue, initialValue]
  );

  const interpolate = useCallback(
    (
      inputRange: number[],
      outputRange: number[] | string[],
      extrapolate: 'extend' | 'clamp' | 'identity' = 'extend'
    ) => {
      return animatedValue.interpolate({
        inputRange,
        outputRange,
        extrapolate,
      });
    },
    [animatedValue]
  );

  return useMemo(
    () => ({
      value: animatedValue,
      startTiming,
      startSpring,
      reset,
      interpolate,
    }),
    [animatedValue, startTiming, startSpring, reset, interpolate]
  );
};

export default useAnimatedValue;
