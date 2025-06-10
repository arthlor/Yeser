import { useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// **RACE CONDITION FIX**: Animation coordination types
type AnimationType = 'entrance' | 'press' | 'pulse' | 'shake' | 'scale' | 'fade';

interface AnimationConfig {
  type: AnimationType;
  toValue: number;
  duration: number;
  useNativeDriver?: boolean;
  loop?: boolean;
  priority?: number; // Higher priority interrupts lower priority
}

interface AnimationState {
  isRunning: boolean;
  currentType: AnimationType | null;
  currentPriority: number;
  animation: Animated.CompositeAnimation | null;
}

// **RACE CONDITION FIX**: Centralized animation controller
export const useCoordinatedAnimations = () => {
  // Animation refs - stable across renders
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animation state tracking
  const animationState = useRef<AnimationState>({
    isRunning: false,
    currentType: null,
    currentPriority: 0,
    animation: null,
  });

  // Component mount state for cleanup
  const isMountedRef = useRef(true);

  // **RACE CONDITION FIX**: Animation conflict resolution
  const canRunAnimation = useCallback((type: AnimationType, priority: number = 1): boolean => {
    const state = animationState.current;

    // No animation running - can start
    if (!state.isRunning) {
      return true;
    }

    // Higher priority can interrupt lower priority
    if (priority > state.currentPriority) {
      return true;
    }

    // Same type can be restarted
    if (state.currentType === type) {
      return true;
    }

    return false;
  }, []);

  // **RACE CONDITION FIX**: Stop current animation safely
  const stopCurrentAnimation = useCallback(() => {
    const state = animationState.current;

    if (state.animation && state.isRunning) {
      state.animation.stop();
      state.isRunning = false;
      state.currentType = null;
      state.currentPriority = 0;
      state.animation = null;
    }
  }, []);

  // **RACE CONDITION FIX**: Start animation with coordination
  const startCoordinatedAnimation = useCallback(
    (config: AnimationConfig, animatedValue: Animated.Value, onComplete?: () => void) => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const priority = config.priority || 1;

      // Check if animation can run
      if (!canRunAnimation(config.type, priority)) {
        return;
      }

      // Stop current animation if lower priority
      stopCurrentAnimation();

      // Create new animation
      let animation: Animated.CompositeAnimation;

      if (config.loop) {
        animation = Animated.loop(
          Animated.timing(animatedValue, {
            toValue: config.toValue,
            duration: config.duration,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      } else {
        animation = Animated.timing(animatedValue, {
          toValue: config.toValue,
          duration: config.duration,
          useNativeDriver: config.useNativeDriver ?? true,
        });
      }

      // Update state
      animationState.current = {
        isRunning: true,
        currentType: config.type,
        currentPriority: priority,
        animation,
      };

      // Start animation with completion handler
      animation.start((finished) => {
        // Only process completion if component is still mounted
        if (!isMountedRef.current) {
          return;
        }

        if (finished) {
          // Reset state on successful completion
          animationState.current.isRunning = false;
          animationState.current.currentType = null;
          animationState.current.currentPriority = 0;
          animationState.current.animation = null;

          onComplete?.();
        }
      });
    },
    [canRunAnimation, stopCurrentAnimation]
  );

  // **ANIMATION PRIMITIVES**: Coordinated animation functions
  const animateEntrance = useCallback(
    (delay = 0) => {
      if (!isMountedRef.current) {
        return;
      }

      // Reset values for entrance
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);

      // Start coordinated entrance animation
      const entranceAnimation = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay,
          useNativeDriver: true,
        }),
      ]);

      animationState.current = {
        isRunning: true,
        currentType: 'entrance',
        currentPriority: 2, // High priority for entrance
        animation: entranceAnimation,
      };

      entranceAnimation.start((finished) => {
        if (finished && isMountedRef.current) {
          animationState.current.isRunning = false;
          animationState.current.currentType = null;
          animationState.current.currentPriority = 0;
          animationState.current.animation = null;
        }
      });
    },
    [fadeAnim, scaleAnim]
  );

  const animatePressIn = useCallback(() => {
    startCoordinatedAnimation(
      {
        type: 'press',
        toValue: 0.98,
        duration: 150,
        priority: 3, // High priority for user interaction
      },
      pressAnim
    );
  }, [pressAnim, startCoordinatedAnimation]);

  const animatePressOut = useCallback(() => {
    startCoordinatedAnimation(
      {
        type: 'press',
        toValue: 1,
        duration: 150,
        priority: 3, // High priority for user interaction
      },
      pressAnim
    );
  }, [pressAnim, startCoordinatedAnimation]);

  const animatePulse = useCallback(
    (start = true) => {
      if (!start) {
        stopCurrentAnimation();
        pulseAnim.setValue(1);
        return;
      }

      if (!canRunAnimation('pulse', 1)) {
        return;
      }

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      animationState.current = {
        isRunning: true,
        currentType: 'pulse',
        currentPriority: 1,
        animation: pulseAnimation,
      };

      pulseAnimation.start();
    },
    [pulseAnim, canRunAnimation, stopCurrentAnimation]
  );

  const animateShake = useCallback(() => {
    startCoordinatedAnimation(
      {
        type: 'shake',
        toValue: 0,
        duration: 400,
        priority: 4, // Highest priority for error indication
      },
      shakeAnim,
      () => shakeAnim.setValue(0) // Reset after shake
    );

    // Custom shake sequence
    if (canRunAnimation('shake', 4)) {
      stopCurrentAnimation();

      const shakeSequence = Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]);

      animationState.current = {
        isRunning: true,
        currentType: 'shake',
        currentPriority: 4,
        animation: shakeSequence,
      };

      shakeSequence.start((finished) => {
        if (finished && isMountedRef.current) {
          animationState.current.isRunning = false;
          animationState.current.currentType = null;
          animationState.current.currentPriority = 0;
          animationState.current.animation = null;
        }
      });
    }
  }, [shakeAnim, startCoordinatedAnimation, canRunAnimation, stopCurrentAnimation]);

  const animateScale = useCallback(
    (toValue: number, duration = 300) => {
      startCoordinatedAnimation(
        {
          type: 'scale',
          toValue,
          duration,
          priority: 2,
        },
        scaleAnim
      );
    },
    [scaleAnim, startCoordinatedAnimation]
  );

  // **RACE CONDITION FIX**: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCurrentAnimation();
    };
  }, [stopCurrentAnimation]);

  // **COMBINED TRANSFORM VALUES**: Pre-calculated for performance
  const combinedTransform = [
    { scale: Animated.multiply(Animated.multiply(scaleAnim, pressAnim), pulseAnim) },
    { translateX: shakeAnim },
  ];

  return {
    // Animation values
    fadeAnim,
    scaleAnim,
    pressAnim,
    pulseAnim,
    shakeAnim,

    // Animation functions
    animateEntrance,
    animatePressIn,
    animatePressOut,
    animatePulse,
    animateShake,
    animateScale,

    // Control functions
    stopAllAnimations: stopCurrentAnimation,

    // Combined transforms for performance
    combinedTransform,

    // State queries
    isAnimating: () => animationState.current.isRunning,
    getCurrentAnimation: () => animationState.current.currentType,
  };
};
