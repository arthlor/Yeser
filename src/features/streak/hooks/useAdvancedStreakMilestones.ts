import { useEffect, useState } from 'react';
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';
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
  previousStreak,
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

  // Handle milestone changes and celebrations
  useEffect(() => {
    if (previousStreak !== undefined && currentStreak > previousStreak) {
      // Check if we've crossed into a new milestone
      const previousMilestone = ADVANCED_MILESTONES.find(
        (m) => previousStreak >= m.minDays && previousStreak <= m.maxDays
      );

      // If we've moved to a new milestone level, celebrate!
      if (previousMilestone && currentMilestone && previousMilestone.id !== currentMilestone.id) {
        triggerMilestoneCelebration(currentMilestone);
      }

      // Special celebrations for specific streak numbers
      const specialNumbers = [1, 7, 30, 100, 365];
      if (specialNumbers.includes(currentStreak)) {
        triggerSpecialCelebration(currentStreak);
      }
    }
  }, [currentStreak, previousStreak, currentMilestone]);

  const triggerMilestoneCelebration = (milestone: AdvancedMilestone) => {
    setJustUnlockedMilestone(milestone);
    setShowCelebration(true);

    // Haptic feedback
    if (Haptics.impactAsync) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Vibration.vibrate([100, 50, 100, 50, 200]);
    }

    // Analytics tracking
    analyticsService.logEvent('milestone_achieved', {
      milestone_id: milestone.id,
      milestone_title: milestone.title,
      streak_count: currentStreak,
      category: milestone.category,
      reward: milestone.reward,
      is_personal_record: isPersonalRecord,
    });

    logger.debug('Milestone unlocked!', {
      milestone: milestone.title,
      streak: currentStreak,
      category: milestone.category,
    });

    // Auto-hide celebration after 4 seconds
    setTimeout(() => {
      setShowCelebration(false);
      setJustUnlockedMilestone(null);
    }, 4000);
  };

  const triggerSpecialCelebration = (streakNumber: number) => {
    const celebrations: Record<number, string> = {
      1: 'İlk gün! Yolculuk başladı! 🌱',
      7: 'Bir hafta tamamlandı! 🎉',
      30: 'Bir ay doldu! İnanılmaz! 🌟',
      100: 'Yüz gün! Efsane başarı! 💯',
      365: 'TAM BİR YIL! ŞAMPIYONSUN! 🏆',
    };

    const message = celebrations[streakNumber];
    if (message) {
      analyticsService.logEvent('special_streak_achieved', {
        streak_count: streakNumber,
        message,
        is_personal_record: isPersonalRecord,
      });

      logger.debug('Special streak achieved!', {
        streak: streakNumber,
        message,
      });
    }
  };

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
