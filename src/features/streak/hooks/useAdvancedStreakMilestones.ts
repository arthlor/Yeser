import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AdvancedMilestone,
  createAdvancedMilestones,
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
  const { t } = useTranslation();

  // Create milestones with localized content
  const ADVANCED_MILESTONES = useMemo(() => createAdvancedMilestones(t), [t]);

  const [showCelebration, setShowCelebration] = useState(false);
  const [justUnlockedMilestone, setJustUnlockedMilestone] = useState<AdvancedMilestone | null>(
    null
  );

  // Find current milestone
  const currentMilestone =
    ADVANCED_MILESTONES.find(
      (m: AdvancedMilestone) => currentStreak >= m.minDays && currentStreak <= m.maxDays
    ) || ADVANCED_MILESTONES[0];

  // Find next milestone
  const nextMilestone =
    ADVANCED_MILESTONES.find((m: AdvancedMilestone) => m.minDays > currentStreak) || null;

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
  const achievementsUnlocked = ADVANCED_MILESTONES.filter(
    (m: AdvancedMilestone) => currentStreak >= m.minDays
  );

  const dismissCelebration = () => {
    setShowCelebration(false);
    setJustUnlockedMilestone(null);
  };

  const getMotivationalMessage = (): string => {
    if (currentStreak === 0) {
      return t('streak.motivation.beginning');
    }

    if (currentStreak < 7) {
      return t('streak.milestones.momentum.unlockedMessage');
    }

    if (currentStreak < 30) {
      return t('streak.motivation.momentum');
    }

    if (currentStreak < 100) {
      return t('streak.motivation.strong');
    }

    if (currentStreak < 365) {
      return t('streak.motivation.legendary');
    }

    return t('streak.motivation.legendary');
  };

  const getCategoryProgress = () => {
    const categories = ['beginner', 'intermediate', 'advanced', 'expert', 'legendary'] as const;

    return categories.map((category) => {
      const categoryMilestones = ADVANCED_MILESTONES.filter(
        (m: AdvancedMilestone) => m.category === category
      );
      const unlockedInCategory = categoryMilestones.filter(
        (m: AdvancedMilestone) => currentStreak >= m.minDays
      );

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
