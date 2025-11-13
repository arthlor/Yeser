export const MOOD_EMOJIS = ['😊', '🙏', '🌟', '💪', '🧘'] as const;

export type MoodEmoji = (typeof MOOD_EMOJIS)[number];
