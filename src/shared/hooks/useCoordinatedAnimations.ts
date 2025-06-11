import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

// **MINIMAL ANIMATION SYSTEM**: Simple, non-intrusive animations with performance benefits
interface MinimalAnimationConfig {
  duration?: number;
  useNativeDriver?: boolean;
  onComplete?: () => void;
}

interface MinimalAnimationState {
  isRunning: boolean;
  currentAnimation: Animated.CompositeAnimation | null;
}

// **SIMPLIFIED COORDINATION HOOK**: Performance optimized with minimal animations
export const useCoordinatedAnimations = () => {
  // **MINIMAL ANIMATION VALUES**: Only what's needed for subtle interactions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current; // For loading states
  const heightAnim = useRef(new Animated.Value(0)).current; // For layout transitions only
  const layoutOpacityAnim = useRef(new Animated.Value(1)).current; // Separate for layout opacity

  // Simple animation state - no complex tracking needed
  const animationState = useRef<MinimalAnimationState>({
    isRunning: false,
    currentAnimation: null,
  });

  // Component mount state for cleanup
  const isMountedRef = useRef(true);

  // **SIMPLE STOP FUNCTION**: Clean and minimal
  const stopCurrentAnimation = useCallback(() => {
    const state = animationState.current;
    if (state.currentAnimation && state.isRunning) {
      state.currentAnimation.stop();
    }
    state.isRunning = false;
    state.currentAnimation = null;
  }, []);

  // **MINIMAL ENTRANCE**: Subtle fade-in only
  const animateEntrance = useCallback(
    (config: MinimalAnimationConfig = {}) => {
      if (!isMountedRef.current) {
        return;
      }

      const { duration = 300, onComplete } = config;

      // Set initial state
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.98);

      const entranceAnimation = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]);

      animationState.current = {
        isRunning: true,
        currentAnimation: entranceAnimation,
      };

      entranceAnimation.start((finished) => {
        if (finished && isMountedRef.current) {
          animationState.current.isRunning = false;
          animationState.current.currentAnimation = null;
          onComplete?.();
        }
      });
    },
    [fadeAnim, scaleAnim]
  );

  // **SUBTLE PRESS FEEDBACK**: Minimal scale effect
  const animatePressIn = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const animatePressOut = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // **SIMPLE FADE**: For loading states and visibility changes
  const animateFade = useCallback(
    (toValue: number, config: MinimalAnimationConfig = {}) => {
      if (!isMountedRef.current) {
        return;
      }

      const { duration = 200, onComplete } = config;

      const fadeAnimation = Animated.timing(fadeAnim, {
        toValue,
        duration,
        useNativeDriver: true,
      });

      fadeAnimation.start((finished) => {
        if (finished && isMountedRef.current) {
          onComplete?.();
        }
      });
    },
    [fadeAnim]
  );

  // **LAYOUT TRANSITION**: Simple replacement for LayoutAnimation (performance critical)
  const animateLayoutTransition = useCallback(
    (expanded: boolean, targetHeight: number = 100, config: MinimalAnimationConfig = {}) => {
      if (!isMountedRef.current) {
        return;
      }

      const { duration = 250, onComplete } = config;
      const toHeight = expanded ? targetHeight : 0;
      const toOpacity = expanded ? 1 : 0;

      // **SEPARATE ANIMATIONS**: Avoid native/JS driver conflicts
      const heightAnimation = Animated.timing(heightAnim, {
        toValue: toHeight,
        duration,
        useNativeDriver: false, // Height requires layout driver
      });

      const opacityAnimation = Animated.timing(layoutOpacityAnim, {
        toValue: toOpacity,
        duration,
        useNativeDriver: true,
      });

      // **PARALLEL EXECUTION**: Now safe with separate animation values
      const layoutAnimation = Animated.parallel([heightAnimation, opacityAnimation]);

      animationState.current = {
        isRunning: true,
        currentAnimation: layoutAnimation,
      };

      layoutAnimation.start((finished) => {
        if (finished && isMountedRef.current) {
          animationState.current.isRunning = false;
          animationState.current.currentAnimation = null;
          onComplete?.();
        }
      });
    },
    [heightAnim, layoutOpacityAnim]
  );

  // **CLEANUP**: Proper cleanup for performance
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCurrentAnimation();
    };
  }, [stopCurrentAnimation]);

  // **MINIMAL TRANSFORM**: Only basic scale for press feedback
  const pressTransform = useMemo(() => [{ scale: scaleAnim }], [scaleAnim]);

  // **ENTRANCE TRANSFORM**: Combined fade and scale for entrances
  const entranceTransform = useMemo(() => [{ scale: scaleAnim }], [scaleAnim]);

  // **SIMPLIFIED API**: Clean and minimal interface
  return useMemo(
    () => ({
      // Animation values (minimal set)
      fadeAnim,
      scaleAnim,
      opacityAnim,
      heightAnim,
      layoutOpacityAnim, // Separate for layout transitions

      // Animation functions (essential only)
      animateEntrance,
      animatePressIn,
      animatePressOut,
      animateFade,
      animateLayoutTransition, // LayoutAnimation replacement

      // Transform utilities (minimal)
      pressTransform,
      entranceTransform,

      // Control
      stopAllAnimations: stopCurrentAnimation,
      isAnimating: () => animationState.current.isRunning,

      // **DEPRECATED**: Simplified aliases for backward compatibility
      animateSettingsExpansion: animateLayoutTransition, // Keep for existing code
      animateShake: () => {}, // No-op for backward compatibility
      animateCelebration: () => {}, // No-op for backward compatibility
      animateProgress: () => {}, // No-op for backward compatibility
      animateSequence: () => {}, // No-op for backward compatibility
      createSequence: () => ({ id: '', animations: [], parallel: true }), // No-op
      progressAnim: fadeAnim, // Alias for compatibility
      combinedTransform: pressTransform, // Alias for compatibility
      progressInterpolation: fadeAnim, // Alias for compatibility
    }),
    [
      fadeAnim,
      scaleAnim,
      opacityAnim,
      heightAnim,
      layoutOpacityAnim,
      animateEntrance,
      animatePressIn,
      animatePressOut,
      animateFade,
      animateLayoutTransition,
      pressTransform,
      entranceTransform,
      stopCurrentAnimation,
    ]
  );
};
