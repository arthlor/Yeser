/**
 * Enhanced animation constants for better theming
 * Provides comprehensive animation tokens for consistent motion design
 */

// Enhanced duration tokens for different interaction types
export const ANIMATION_DURATIONS = {
  instant: 0,
  micro: 75, // Quick hover/press feedback
  fast: 150, // Button presses, toggles
  normal: 250, // Standard transitions
  slow: 350, // Page transitions
  slower: 500, // Complex animations
  glacial: 1000, // Major state changes
} as const;

// Material Design inspired easing curves
export const ANIMATION_EASING = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Material Design curves
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard easing
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)', // Elements entering screen
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)', // Elements leaving screen
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)', // Temporary elements
  
  // Enhanced back easing
  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Bounce effects
  bounceOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounceIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
} as const;

// Spring configurations for React Native Animated
export const SPRING_CONFIGS = {
  gentle: { tension: 120, friction: 14, useNativeDriver: true },
  wobbly: { tension: 180, friction: 12, useNativeDriver: true },
  stiff: { tension: 210, friction: 20, useNativeDriver: true },
  slow: { tension: 280, friction: 60, useNativeDriver: true },
  
  // Enhanced configs for different use cases
  button: { tension: 300, friction: 10, useNativeDriver: true }, // Quick button feedback
  modal: { tension: 100, friction: 8, useNativeDriver: true }, // Modal appearance
  drawer: { tension: 200, friction: 25, useNativeDriver: true }, // Side drawer
  tab: { tension: 400, friction: 25, useNativeDriver: true }, // Tab switching
} as const;

// Timing configurations for React Native Animated
export const TIMING_CONFIGS = {
  fast: {
    duration: ANIMATION_DURATIONS.fast,
    easing: ANIMATION_EASING.standard,
    useNativeDriver: true,
  },
  normal: {
    duration: ANIMATION_DURATIONS.normal,
    easing: ANIMATION_EASING.standard,
    useNativeDriver: true,
  },
  slow: {
    duration: ANIMATION_DURATIONS.slow,
    easing: ANIMATION_EASING.decelerate,
    useNativeDriver: true,
  },
  
  // Specific interaction configs
  buttonPress: {
    duration: ANIMATION_DURATIONS.micro,
    easing: ANIMATION_EASING.sharp,
    useNativeDriver: true,
  },
  fadeIn: {
    duration: ANIMATION_DURATIONS.normal,
    easing: ANIMATION_EASING.decelerate,
    useNativeDriver: true,
  },
  fadeOut: {
    duration: ANIMATION_DURATIONS.fast,
    easing: ANIMATION_EASING.accelerate,
    useNativeDriver: true,
  },
} as const;

// Stagger utilities for sequence animations
export const STAGGER = {
  micro: 25,
  small: 50,
  medium: 100,
  large: 150,
  
  // Function to calculate stagger delay
  calculate: (index: number, baseDelay = 50) => index * baseDelay,
} as const;

// For migration convenience and backward compatibility
export const animations = {
  duration: ANIMATION_DURATIONS,
  easing: ANIMATION_EASING,
  spring: SPRING_CONFIGS,
  timing: TIMING_CONFIGS,
  stagger: STAGGER,
} as const;

// Animation presets for common use cases
export const ANIMATION_PRESETS = {
  // Button interactions
  buttonHover: {
    duration: ANIMATION_DURATIONS.micro,
    easing: ANIMATION_EASING.standard,
  },
  buttonPress: {
    duration: ANIMATION_DURATIONS.fast,
    easing: ANIMATION_EASING.sharp,
  },
  
  // Modal/overlay animations
  modalEnter: {
    duration: ANIMATION_DURATIONS.normal,
    easing: ANIMATION_EASING.decelerate,
  },
  modalExit: {
    duration: ANIMATION_DURATIONS.fast,
    easing: ANIMATION_EASING.accelerate,
  },
  
  // Page transitions
  pageEnter: {
    duration: ANIMATION_DURATIONS.slow,
    easing: ANIMATION_EASING.decelerate,
  },
  pageExit: {
    duration: ANIMATION_DURATIONS.normal,
    easing: ANIMATION_EASING.accelerate,
  },
  
  // Notification/toast animations
  toastSlideIn: {
    duration: ANIMATION_DURATIONS.normal,
    easing: ANIMATION_EASING.bounceOut,
  },
  toastSlideOut: {
    duration: ANIMATION_DURATIONS.fast,
    easing: ANIMATION_EASING.accelerate,
  },
} as const; 