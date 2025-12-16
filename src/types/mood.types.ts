// Core moods (original 5) + expanded palette (7 new)
export const MOOD_EMOJIS = [
  '😊', // Joyful
  '🙏', // Grateful
  '🌟', // Inspired
  '💪', // Empowered
  '🧘', // Calm
  '🥰', // Loving
  '😌', // Content
  '🌿', // Refreshed
  '🤔', // Thoughtful
  '🌅', // Hopeful
  '🎯', // Focused
  '🚀', // Motivated
] as const;

export type MoodEmoji = (typeof MOOD_EMOJIS)[number];
