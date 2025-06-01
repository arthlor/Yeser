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

interface Milestone {
  minDays: number;
  maxDays: number;
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
    maxDays: Infinity,
    emoji: '✨',
    description: 'Artık ışıldayan bir bahçen var!',
  },
];

/**
 * EnhancedStreakVisual displays the user's streak milestone with animations
 * and improved visual design using the ThemedCard component.
 */
const EnhancedStreakVisual: React.FC<EnhancedStreakVisualProps> = ({
  streakCount,
  previousStreakCount,
  onMilestoneReached,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showCelebration, setShowCelebration] = useState(false);

  // Find current milestone
  const currentMilestone =
    milestones.find(
      m => streakCount >= m.minDays && streakCount <= m.maxDays
    ) || milestones[0];

  // Find previous milestone if previous streak count is provided
  const previousMilestone =
    previousStreakCount !== undefined
      ? milestones.find(
          m =>
            previousStreakCount >= m.minDays && previousStreakCount <= m.maxDays
        ) || milestones[0]
      : currentMilestone;

  // Check if milestone level has changed
  const hasMilestoneChanged =
    previousMilestone.level !== currentMilestone.level;

  // Handle milestone change
  useEffect(() => {
    if (hasMilestoneChanged) {
      // Notify about milestone reached
      if (onMilestoneReached) {
        onMilestoneReached(currentMilestone);
      }

      // Show celebration text
      setShowCelebration(true);

      // Hide celebration after a delay
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentMilestone, hasMilestoneChanged, onMilestoneReached]);

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

        {streakCount > 0 && (
          <Text style={styles.streakText}>{streakCount} günlük seri!</Text>
        )}

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, (streakCount / (currentMilestone.maxDays === Infinity ? 60 : currentMilestone.maxDays)) * 100)}%`,
              },
            ]}
          />
        </View>

        {currentMilestone.level < 5 && (
          <Text style={styles.nextMilestone}>
            {currentMilestone.maxDays - streakCount} gün sonra yeni seviye!
          </Text>
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
      paddingVertical: theme.spacing.md,
    },
    celebrationContainer: {
      position: 'absolute',
      top: -theme.spacing.lg,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    celebrationText: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
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
      borderRadius: theme.borderRadius.full,
    },
    nextMilestone: {
      ...theme.typography.labelMedium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
  });

export default EnhancedStreakVisual;
