/**
 * Type definitions for the "Why Gratitude Matters" feature
 * These types correspond to the gratitude_benefits table in Supabase
 */

/**
 * @deprecated Use GratitudeBenefit from @/schemas/gratitudeBenefitSchema instead for consistency
 */
export interface GratitudeBenefit {
  id: number;
  icon: string;
  title_tr: string;
  title_en: string | null;
  description_tr: string;
  description_en: string | null;
  stat_tr: string | null;
  stat_en: string | null;
  cta_prompt_tr: string | null;
  cta_prompt_en: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GratitudeBenefitsResponse {
  benefits: GratitudeBenefit[];
  total_count: number;
}

// Props for the main screen component
export interface WhyGratitudeScreenProps {
  // Navigation prop will be typed by React Navigation
}

// Props for the benefit card component
export interface BenefitCardProps {
  icon: string;
  title: string;
  description: string;
  stat: string | null;
  ctaPrompt: string | null;
  index: number;
  initialExpanded?: boolean;
  testID?: string;
  onCtaPress?: (prompt: string) => void;
}

// Analytics event types for the feature
export interface WhyGratitudeAnalyticsEvents {
  why_gratitude_viewed: {
    screen_name: string;
    user_id?: string;
    timestamp: number;
  };
  benefit_card_expanded: {
    benefit_id: number;
    title: string;
    index: number;
    user_id?: string;
  };
  benefit_card_cta_pressed: {
    benefit_id: number;
    title: string;
    prompt: string;
    index: number;
    user_id?: string;
  };
  cta_button_pressed: {
    prompt?: string | null;
    user_streak?: number;
    user_id?: string;
    source?: 'main_button' | 'benefit_card';
  };
  navigation_to_journal: {
    source: 'why_gratitude';
    prompt_used: boolean;
    user_id?: string;
  };
  error_occurred: {
    error_type: string;
    error_message: string;
    screen: 'why_gratitude';
  };
}

// Error types for the feature
export interface WhyGratitudeError extends Error {
  code?: string;
  details?: string;
}
