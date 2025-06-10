import { useCallback, useEffect, useRef, useState } from 'react';

// **RACE CONDITION FIX**: Input coordination types
interface SafeInputConfig {
  debounceMs?: number;
  maxLength?: number;
  minLength?: number;
  validateOnChange?: boolean;
  preventSubmissionUpdates?: boolean;
}

interface SafeInputState {
  value: string;
  debouncedValue: string;
  isDebouncing: boolean;
  isSubmitting: boolean;
  isFocused: boolean;
  error: string | null;
  hasChanged: boolean;
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// **RACE CONDITION FIX**: Safe input with debouncing and submission coordination
export const useSafeInput = (initialValue: string = '', config: SafeInputConfig = {}) => {
  const {
    debounceMs = 300,
    maxLength = 500,
    minLength = 0,
    validateOnChange = true,
    preventSubmissionUpdates = true,
  } = config;

  // Component mount state
  const isMountedRef = useRef(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);

  // Input state
  const [state, setState] = useState<SafeInputState>({
    value: initialValue,
    debouncedValue: initialValue,
    isDebouncing: false,
    isSubmitting: false,
    isFocused: false,
    error: null,
    hasChanged: false,
  });

  // **RACE CONDITION FIX**: Safe state updates only when mounted
  const safeSetState = useCallback((updates: Partial<SafeInputState>) => {
    if (!isMountedRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // **VALIDATION**: Input validation logic
  const validateInput = useCallback(
    (value: string): ValidationResult => {
      if (value.length < minLength) {
        return {
          isValid: false,
          error: `En az ${minLength} karakter gereklidir`,
        };
      }

      if (value.length > maxLength) {
        return {
          isValid: false,
          error: `Maksimum ${maxLength} karakter kullanabilirsiniz`,
        };
      }

      return {
        isValid: true,
        error: null,
      };
    },
    [minLength, maxLength]
  );

  // **RACE CONDITION FIX**: Debounced value update with submission protection
  const updateDebouncedValue = useCallback(
    (newValue: string) => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // **PROTECTION**: Don't update if submitting
      if (preventSubmissionUpdates && isSubmittingRef.current) {
        return;
      }

      safeSetState({ isDebouncing: true });

      debounceTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        // Validate if enabled
        let validationResult: ValidationResult = { isValid: true, error: null };
        if (validateOnChange) {
          validationResult = validateInput(newValue);
        }

        safeSetState({
          debouncedValue: newValue,
          isDebouncing: false,
          error: validationResult.error,
        });
      }, debounceMs);
    },
    [debounceMs, preventSubmissionUpdates, validateOnChange, validateInput, safeSetState]
  );

  // **SAFE INPUT CHANGE**: Coordinated input handling
  const handleInputChange = useCallback(
    (newValue: string) => {
      // **PROTECTION**: Prevent updates during submission
      if (preventSubmissionUpdates && isSubmittingRef.current) {
        return;
      }

      // **PROTECTION**: Respect max length strictly
      if (newValue.length > maxLength) {
        return;
      }

      safeSetState({
        value: newValue,
        hasChanged: newValue !== initialValue,
      });

      // Trigger debounced update
      updateDebouncedValue(newValue);
    },
    [initialValue, maxLength, preventSubmissionUpdates, safeSetState, updateDebouncedValue]
  );

  // **FOCUS MANAGEMENT**: Safe focus/blur handling
  const handleFocus = useCallback(() => {
    safeSetState({ isFocused: true });
  }, [safeSetState]);

  const handleBlur = useCallback(() => {
    safeSetState({ isFocused: false });

    // Trigger immediate validation on blur
    if (validateOnChange) {
      const validationResult = validateInput(state.value);
      safeSetState({ error: validationResult.error });
    }
  }, [validateOnChange, validateInput, state.value, safeSetState]);

  // **SUBMISSION COORDINATION**: Prevent race conditions during submission
  const startSubmission = useCallback(() => {
    isSubmittingRef.current = true;
    safeSetState({ isSubmitting: true });

    // Clear any pending debounce updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Force debounced value to current value
    safeSetState({
      debouncedValue: state.value,
      isDebouncing: false,
    });
  }, [state.value, safeSetState]);

  const endSubmission = useCallback(() => {
    isSubmittingRef.current = false;
    safeSetState({ isSubmitting: false });
  }, [safeSetState]);

  // **VALUE RESET**: Safe reset functionality
  const resetInput = useCallback(
    (newValue: string = initialValue) => {
      // Clear pending timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      safeSetState({
        value: newValue,
        debouncedValue: newValue,
        isDebouncing: false,
        error: null,
        hasChanged: newValue !== initialValue,
      });
    },
    [initialValue, safeSetState]
  );

  // **CLEANUP**: Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // **SYNC WITH EXTERNAL CHANGES**: Update when initialValue changes
  useEffect(() => {
    if (initialValue !== state.value && !state.hasChanged && !state.isSubmitting) {
      resetInput(initialValue);
    }
  }, [initialValue, state.value, state.hasChanged, state.isSubmitting, resetInput]);

  // **VALIDATION RESULTS**: Current validation state
  const validation = validateInput(state.value);
  const canSubmit = validation.isValid && state.value.trim().length > 0 && !state.isSubmitting;

  return {
    // Input state
    value: state.value,
    debouncedValue: state.debouncedValue,
    error: state.error,
    hasChanged: state.hasChanged,

    // Input status
    isDebouncing: state.isDebouncing,
    isSubmitting: state.isSubmitting,
    isFocused: state.isFocused,
    canSubmit,

    // Input handlers
    handleInputChange,
    handleFocus,
    handleBlur,

    // Submission coordination
    startSubmission,
    endSubmission,

    // Utilities
    resetInput,
    validate: () => validateInput(state.value),

    // Character count info
    characterCount: state.value.length,
    isNearLimit: state.value.length >= maxLength * 0.9,
    isOverLimit: state.value.length > maxLength,
    remainingChars: maxLength - state.value.length,
  };
};
