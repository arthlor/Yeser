import React from 'react';

interface OnboardingGradientBackgroundProps {
  /**
   * The variant determines the subtle tint of the gradient wash.
   */
  variant?: 'warm' | 'sunrise' | 'calm' | 'celebrate';
}

/**
 * Disabled onboarding gradient background. Returns null to fall back to
 * the solid theme background color.
 */
export const OnboardingGradientBackground: React.FC<OnboardingGradientBackgroundProps> = () => {
  return null;
};

export default OnboardingGradientBackground;
