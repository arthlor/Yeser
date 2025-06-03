import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

import ThemedCard from './ThemedCard';

interface EnhancedStreakVisualProps {
  streakCount: number;
  previousStreakCount?: number;
  onMilestoneReached?: (milestone: Milestone) => void;
}

export interface Milestone {
  minDays: number;
  maxDays: number; // Use number for consistency, handle Infinity in logic
  emoji: string;
  description: string;
  level: number;
}

const milestones: Milestone[] = [
  {
    level: 0,
    minDays: 0,
    maxDays: 2,
    emoji: '🌱',
    description: 'Tohum filizleniyor!',
  },
  {
    level: 1,
    minDays: 3,
    maxDays: 6,
    emoji: '🌿',
    description: 'Minik bir fidan!',
  },
  {
    level: 2,
    minDays: 7,
    maxDays: 13,
    emoji: '🌳',
    description: 'Fidanın büyüyor!',
  },
  {
    level: 3,
    minDays: 14,
    maxDays: 29,
    emoji: '🌸',
    description: 'Tomurcuklar belirdi!',
  },
  {
    level: 4,
    minDays: 30,
    maxDays: 59,
    emoji: '🌻',
    description: 'Çiçeğin açtı!',
  },
  {
    level: 5,
    minDays: 60,
    maxDays: Infinity, // Represents the final, open-ended milestone
    emoji: '✨',
    description: 'Artık ışıldayan bir bahçen var!',
  },
];

const CELEBRATION_DURATION_MS = 3000;
const MAX_PROGRESS_BAR_STREAK_CAP_FOR_INFINITE_MILESTONE = 90; // Or currentMilestone.minDays, or another sensible cap for display

/**
 * EnhancedStreakVisual displays the user's streak milestone with animations
 * and improved visual design using the ThemedCard component.
 */
export const EnhancedStreakVisual: React.FC<EnhancedStreakVisualProps> = ({
  streakCount,
  previousStreakCount,
  onMilestoneReached,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showCelebration, setShowCelebration] = useState(false);

  // Find current milestone
  const currentMilestone =
    milestones.find((m) => streakCount >= m.minDays && streakCount <= m.maxDays) || milestones[0]; // Fallback to the first milestone

  // Find previous milestone if previous streak count is provided
  const previousMilestone =
    previousStreakCount !== undefined
      ? milestones.find(
          (m) => previousStreakCount >= m.minDays && previousStreakCount <= m.maxDays
        ) || milestones[0]
      : currentMilestone;

  // Check if milestone level has changed
  const hasMilestoneChanged = previousMilestone.level !== currentMilestone.level;

  // Handle milestone change
  useEffect(() => {
    if (hasMilestoneChanged && streakCount > (previousStreakCount ?? -1)) {
      // Ensure streak actually increased
      if (onMilestoneReached) {
        onMilestoneReached(currentMilestone);
      }
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, CELEBRATION_DURATION_MS);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [currentMilestone, hasMilestoneChanged, onMilestoneReached, streakCount, previousStreakCount]);

  // Calculate progress percentage
  let progressPercentage = 0;
  if (currentMilestone.maxDays === Infinity) {
    // For the infinite milestone, show 100% once minDays is met,
    // or progress towards minDays if not yet met.
    // Or, cap progress display, e.g., based on MAX_PROGRESS_BAR_STREAK_CAP_FOR_INFINITE_MILESTONE
    // For simplicity, let's show 100% if minDays is reached.
    progressPercentage =
      streakCount >= currentMilestone.minDays
        ? 100
        : (streakCount / currentMilestone.minDays) * 100;
  } else if (currentMilestone.maxDays > 0) {
    // Avoid division by zero if maxDays could be 0
    // For regular milestones, progress is streakCount relative to maxDays of current milestone
    // This represents how "full" the current milestone is.
    // An alternative: (streakCount - currentMilestone.minDays) / (currentMilestone.maxDays - currentMilestone.minDays +1)
    // The original (streakCount / currentMilestone.maxDays) is simpler and visually intuitive.
    progressPercentage = (streakCount / currentMilestone.maxDays) * 100;
  }
  progressPercentage = Math.min(100, Math.max(0, progressPercentage)); // Clamp between 0 and 100

  // Calculate days to next milestone
  let daysToNextMilestone: number | null = null;
  if (
    currentMilestone.maxDays !== Infinity &&
    currentMilestone.level < milestones[milestones.length - 1].level
  ) {
    // Next milestone starts at currentMilestone.maxDays + 1
    daysToNextMilestone = currentMilestone.maxDays + 1 - streakCount;
    if (daysToNextMilestone < 0) daysToNextMilestone = 0; // Should not happen if logic is correct
  }

  return (
    <ThemedCard
      variant="elevated"
      elevation="md"
      contentPadding="lg"
      style={styles.card}
      accessibilityLabel={`${streakCount} günlük seri. ${currentMilestone.description}`}
    >
      <View style={styles.container}>
        {showCelebration && (
          <View style={styles.celebrationContainer}>
            <Text style={styles.celebrationText}>🎉 Yeni seviye! 🎉</Text>
          </View>
        )}

        <Text style={styles.emoji}>{currentMilestone.emoji}</Text>
        <Text style={styles.description}>{currentMilestone.description}</Text>

        {streakCount > 0 && <Text style={styles.streakText}>{streakCount} günlük seri!</Text>}

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercentage}%`,
              },
            ]}
            accessibilityLabel={`Seri ilerlemesi: yüzde ${Math.round(progressPercentage)}`}
          />
        </View>

        {daysToNextMilestone !== null && daysToNextMilestone > 0 && (
          <Text style={styles.nextMilestone}>{daysToNextMilestone} gün sonra yeni seviye!</Text>
        )}
        {daysToNextMilestone === 0 && currentMilestone.maxDays !== Infinity && (
          <Text style={styles.nextMilestone}>Yarın yeni seviye!</Text>
        )}
      </View>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
    },
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md, // Keep some padding even if celebration text is overlaid
    },
    celebrationContainer: {
      position: 'absolute',
      top: -theme.spacing.md, // Adjusted to be less aggressive if card has padding
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1, // Ensure it's above other elements
    },
    celebrationText: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden', // For borderRadius to clip background
      elevation: 2, // Add shadow/elevation if needed for visibility
    },
    emoji: {
      fontSize: 60,
      marginBottom: theme.spacing.sm,
    },
    description: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    streakText: {
      ...theme.typography.titleLarge,
      color: theme.colors.primary,
      fontWeight: 'bold',
      marginBottom: theme.spacing.md,
    },
    progressContainer: {
      width: '100%',
      height: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginTop: theme.spacing.sm,
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full, // Keep for smooth edges during animation
    },
    nextMilestone: {
      ...theme.typography.labelMedium,
      color: theme.colors.textSecondary, // Changed from onSurfaceVariant for potentially better contrast
      marginTop: theme.spacing.sm,
    },
  });
