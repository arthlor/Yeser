// **SIMPLIFIED HOOKS**: Only essential, minimal hooks following the "barely noticeable, maximum performance" philosophy

// Core utility hooks (simple and focused)
export { useUserProfile } from './useUserProfile';
export { useNetworkStatus } from './useNetworkStatus';
export { useUsernameValidation } from './useUsernameValidation';

// **SIMPLIFIED ANIMATION SYSTEM**: Minimal, non-intrusive animations
export { useCoordinatedAnimations } from './useCoordinatedAnimations';
export { useSettingsAnimations, replaceLayoutAnimation } from './useSettingsAnimations';

/**
 * **ARCHITECTURAL PHILOSOPHY**:
 * This index exports only hooks that follow the simplified approach:
 * - Minimal complexity (~200 lines total for animation hooks)
 * - Non-intrusive user experience ("barely noticeable")
 * - Maximum performance (single hook per component)
 * - Clean, maintainable code
 *
 * **REMOVED COMPLEX HOOKS**:
 * - useLifecycleCoordination (322 lines) - Too complex
 * - useNavigationCoordination (282 lines) - Too complex
 * - useRaceConditionTester (430 lines) - Development tool
 * - useSafeInput (258 lines) - Too complex
 *
 * These were replaced with the native React Native features and
 * TanStack Query patterns that provide the same functionality
 * with much less complexity.
 */
