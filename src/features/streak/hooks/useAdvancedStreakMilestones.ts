import { useState } from 'react';
import {
  ADVANCED_MILESTONES,
  type AdvancedMilestone,
} from '../components/AdvancedStreakMilestones';

interface UseAdvancedStreakMilestonesProps {
  currentStreak: number;
  previousStreak?: number;
  longestStreak: number;
}

interface MilestoneState {
  currentMilestone: AdvancedMilestone | null;
  nextMilestone: AdvancedMilestone | null;
  isPersonalRecord: boolean;
  showCelebration: boolean;
  justUnlockedMilestone: AdvancedMilestone | null;
  progressPercentage: number;
  daysToNext: number;
  achievementsUnlocked: AdvancedMilestone[];
  dismissCelebration: () => void;
  getMotivationalMessage: () => string;
  getCategoryProgress: () => Array<{
    category: string;
    total: number;
    unlocked: number;
    percentage: number;
  }>;
}

export const useAdvancedStreakMilestones = ({
  currentStreak,
  previousStreak: _previousStreak,
  longestStreak,
}: UseAdvancedStreakMilestonesProps): MilestoneState => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [justUnlockedMilestone, setJustUnlockedMilestone] = useState<AdvancedMilestone | null>(
    null
  );

  // Find current milestone
  const currentMilestone =
    ADVANCED_MILESTONES.find((m) => currentStreak >= m.minDays && currentStreak <= m.maxDays) ||
    ADVANCED_MILESTONES[0];

  // Find next milestone
  const nextMilestone = ADVANCED_MILESTONES.find((m) => m.minDays > currentStreak) || null;

  // Check if this is a personal record
  const isPersonalRecord = currentStreak > longestStreak && currentStreak > 0;

  // Calculate progress percentage
  const progressPercentage = (() => {
    if (!currentMilestone || !nextMilestone) {
      return 100;
    }

    const currentRange = currentMilestone.maxDays - currentMilestone.minDays + 1;
    const progress = currentStreak - currentMilestone.minDays + 1;
    return Math.min(100, (progress / currentRange) * 100);
  })();

  // Calculate days to next milestone
  const daysToNext = nextMilestone ? nextMilestone.minDays - currentStreak : 0;

  // Get all unlocked achievements
  const achievementsUnlocked = ADVANCED_MILESTONES.filter((m) => currentStreak >= m.minDays);

  const dismissCelebration = () => {
    setShowCelebration(false);
    setJustUnlockedMilestone(null);
  };

  const getMotivationalMessage = (): string => {
    if (currentStreak === 0) {
      return 'Her büyük yolculuk tek bir adımla başlar! 🌱';
    }

    if (currentStreak < 7) {
      return 'Harika başlangıç! Devam et! 💪';
    }

    if (currentStreak < 30) {
      return 'Momentum kazanıyorsun! Durma! 🚀';
    }

    if (currentStreak < 100) {
      return 'Alışkanlığın artık güçlü! Mükemmelsin! ⭐';
    }

    if (currentStreak < 365) {
      return 'İnanılmaz kararlılık! Efsanesin! 🔥';
    }

    return 'Artık bir usta oldun! Evrenin enerjisiyle birsin! ✨';
  };

  const getCategoryProgress = () => {
    const categories = ['beginner', 'intermediate', 'advanced', 'expert', 'legendary'] as const;

    return categories.map((category) => {
      const categoryMilestones = ADVANCED_MILESTONES.filter((m) => m.category === category);
      const unlockedInCategory = categoryMilestones.filter((m) => currentStreak >= m.minDays);

      return {
        category,
        total: categoryMilestones.length,
        unlocked: unlockedInCategory.length,
        percentage: (unlockedInCategory.length / categoryMilestones.length) * 100,
      };
    });
  };

  return {
    currentMilestone,
    nextMilestone,
    isPersonalRecord,
    showCelebration,
    justUnlockedMilestone,
    progressPercentage,
    daysToNext: Math.max(0, daysToNext),
    achievementsUnlocked,
    dismissCelebration,
    getMotivationalMessage,
    getCategoryProgress,
  };
};
