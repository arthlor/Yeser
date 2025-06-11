import { useCallback } from 'react';
import { useCoordinatedAnimations } from './useCoordinatedAnimations';

/**
 * **SIMPLIFIED SETTINGS ANIMATIONS**: Minimal, non-intrusive settings animations
 * 
 * Provides subtle animation patterns for settings components following the
 * "barely noticeable, maximum performance" philosophy.
 * 
 * **Replaces**: Complex LayoutAnimation patterns with simple coordinated transitions
 */
export const useSettingsAnimations = () => {
  const animations = useCoordinatedAnimations();

  // **MINIMAL EXPANSION**: Simple height/opacity transition for expandable sections
  const animateExpansion = useCallback(
    (expanded: boolean, targetHeight: number = 100) => {
      animations.animateLayoutTransition(expanded, targetHeight);
    },
    [animations]
  );

  // **SUBTLE TOGGLE**: Gentle scale feedback for toggle interactions
  const animateToggle = useCallback(
    (_enabled: boolean) => {
      // Brief press feedback
      animations.animatePressIn();
      setTimeout(() => {
        animations.animatePressOut();
      }, 150);
    },
    [animations]
  );

  // **GENTLE FEEDBACK**: Subtle error/success feedback without jarring animations
  const animateError = useCallback(() => {
    // Gentle fade feedback instead of shake
    animations.animateFade(0.7, { duration: 200 });
    setTimeout(() => {
      animations.animateFade(1, { duration: 200 });
    }, 200);
  }, [animations]);

  const animateSuccess = useCallback(() => {
    // Subtle success confirmation
    animations.animateFade(0.9, { duration: 150 });
    setTimeout(() => {
      animations.animateFade(1, { duration: 150 });
    }, 150);
  }, [animations]);

  // **SIMPLE RETURN**: Minimal API surface
  return {
    // Core animations from coordinated hook
    ...animations,
    
    // Settings-specific simplified patterns
    animateExpansion,
    animateToggle,
    animateError,
    animateSuccess,
    
    // Simple convenience method for any setting change
    animateSettingChange: () => {
      animations.animatePressIn();
      setTimeout(() => animations.animatePressOut(), 100);
    },
  };
};

/**
 * **SIMPLIFIED MIGRATION HELPER**: Easy LayoutAnimation replacement
 * 
 * BEFORE: LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
 * AFTER: settingsAnimations.animateExpansion(expanded);
 */
export const replaceLayoutAnimation = {
  easeInEaseOut: (
    settingsAnimations: ReturnType<typeof useSettingsAnimations>, 
    expanded: boolean, 
    height = 100
  ) => {
    settingsAnimations.animateExpansion(expanded, height);
  },
}; 