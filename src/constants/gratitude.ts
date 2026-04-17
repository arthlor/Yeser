/**
 * Shared constants for gratitude statements.
 *
 * Keeping the max length in one place keeps schemas, inputs, counters,
 * and the Throwback share card perfectly aligned. Before changing this,
 * verify the ThrowbackShareCard still fits worst-case text.
 */
export const GRATITUDE_MAX_LENGTH = 300;

/**
 * Threshold at which the inline character counter should flip to the
 * error color to prompt the user to wrap up.
 */
export const GRATITUDE_WARNING_LENGTH = Math.round(GRATITUDE_MAX_LENGTH * 0.9);
