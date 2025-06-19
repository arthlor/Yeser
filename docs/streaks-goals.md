# Streak & Goals System

> Gamification and progress tracking system that motivates consistent gratitude practice.

## 🎯 Overview

The Streak & Goals system is the motivational backbone of Yeser, encouraging users to maintain consistent gratitude practice through:

- **Daily Goal Tracking** - Customizable targets for daily gratitude statements
- **Streak Calculation** - Current and longest streak tracking
- **Progress Visualization** - Real-time progress indicators and completion celebrations
- **Milestone Achievements** - Recognition for consistency and growth
- **Habit Formation** - Psychology-backed features to build lasting gratitude habits

## 🏗 Data Architecture

### Database Schema

```sql
-- Streaks tracking table
CREATE TABLE public.streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_entry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with goal settings
CREATE TABLE public.profiles (
    -- ... other fields
    daily_gratitude_goal INTEGER DEFAULT 3,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TIME DEFAULT '09:00:00'
);

-- RLS Policies
CREATE POLICY "Users can only access their own streaks"
ON public.streaks FOR ALL USING (auth.uid() = user_id);
```

### TypeScript Schemas

```typescript
// Streak data structures
export const streakSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_entry_date: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const updateStreakSchema = z.object({
  current_streak: z.number().int().min(0).optional(),
  longest_streak: z.number().int().min(0).optional(),
  last_entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export type Streak = z.infer<typeof streakSchema>;
export type UpdateStreakPayload = z.infer<typeof updateStreakSchema>;
```

## 🔄 Streak Calculation Logic

### Core Algorithm

```sql
-- PostgreSQL function for streak calculation
CREATE OR REPLACE FUNCTION calculate_streak_for_user(p_user_id UUID)
RETURNS RECORD AS $$
DECLARE
    current_streak_count INTEGER := 0;
    longest_streak_count INTEGER := 0;
    last_entry_date DATE;
    temp_streak INTEGER := 0;
    entry_date DATE;
    prev_date DATE;
    entry_cursor CURSOR FOR
        SELECT DISTINCT entry_date
        FROM public.gratitude_entries
        WHERE user_id = p_user_id
        ORDER BY entry_date DESC;
BEGIN
    -- Get the most recent entry date
    SELECT MAX(entry_date) INTO last_entry_date
    FROM public.gratitude_entries
    WHERE user_id = p_user_id;

    -- If no entries, return zeros
    IF last_entry_date IS NULL THEN
        RETURN ROW(0, 0, NULL::DATE);
    END IF;

    -- Check if the streak is broken (no entry yesterday or today)
    IF last_entry_date < CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak is broken, current streak is 0
        current_streak_count := 0;
    ELSE
        -- Calculate current streak (consecutive days from most recent)
        OPEN entry_cursor;
        FETCH entry_cursor INTO entry_date;

        -- Start with the most recent entry
        current_streak_count := 1;
        prev_date := entry_date;

        -- Count consecutive days going backward
        LOOP
            FETCH entry_cursor INTO entry_date;
            EXIT WHEN NOT FOUND;

            -- Check if this date is consecutive to the previous
            IF entry_date = prev_date - INTERVAL '1 day' THEN
                current_streak_count := current_streak_count + 1;
                prev_date := entry_date;
            ELSE
                -- Non-consecutive date found, stop counting
                EXIT;
            END IF;
        END LOOP;

        CLOSE entry_cursor;
    END IF;

    -- Calculate longest streak (scan all entries)
    temp_streak := 0;
    longest_streak_count := 0;
    prev_date := NULL;

    FOR entry_date IN
        SELECT DISTINCT entry_date
        FROM public.gratitude_entries
        WHERE user_id = p_user_id
        ORDER BY entry_date ASC
    LOOP
        IF prev_date IS NULL OR entry_date = prev_date + INTERVAL '1 day' THEN
            -- Consecutive or first entry
            temp_streak := temp_streak + 1;
            longest_streak_count := GREATEST(longest_streak_count, temp_streak);
        ELSE
            -- Non-consecutive, reset temporary streak
            temp_streak := 1;
        END IF;

        prev_date := entry_date;
    END LOOP;

    RETURN ROW(current_streak_count, longest_streak_count, last_entry_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update streaks automatically
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
    streak_data RECORD;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Calculate new streak values
    SELECT * INTO streak_data FROM calculate_streak_for_user(current_user_id);

    -- Update or insert streak record
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_entry_date)
    VALUES (current_user_id,
            (streak_data).f1,
            (streak_data).f2,
            (streak_data).f3)
    ON CONFLICT (user_id)
    DO UPDATE SET
        current_streak = (streak_data).f1,
        longest_streak = GREATEST(streaks.longest_streak, (streak_data).f2),
        last_entry_date = (streak_data).f3,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Client-Side Streak Hooks

```typescript
// Custom hooks for streak management
export const useStreakData = () => {
  return useQuery({
    queryKey: queryKeys.streaks.current(),
    queryFn: streakApi.getCurrentStreak,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdvancedStreakMilestones = () => {
  const { data: streak } = useStreakData();

  return useMemo(() => {
    if (!streak) return null;

    return calculateStreakMilestones(streak);
  }, [streak]);
};

// Streak milestone calculation
interface StreakMilestone {
  type: 'current' | 'next' | 'achievement';
  title: string;
  description: string;
  value: number;
  progress: number;
  isAchieved: boolean;
  icon: string;
  color: string;
}

const calculateStreakMilestones = (streak: Streak): StreakMilestone[] => {
  const { current_streak, longest_streak } = streak;
  const milestones: StreakMilestone[] = [];

  // Define milestone targets
  const targets = [3, 7, 14, 30, 60, 100, 365];

  // Current streak milestone
  milestones.push({
    type: 'current',
    title: 'Mevcut Seri',
    description: `${current_streak} gün üst üste minnet`,
    value: current_streak,
    progress: 100,
    isAchieved: true,
    icon: 'fire',
    color: current_streak > 0 ? '#FF6B35' : '#666',
  });

  // Next milestone
  const nextTarget = targets.find((target) => target > current_streak);
  if (nextTarget) {
    const progress = (current_streak / nextTarget) * 100;
    milestones.push({
      type: 'next',
      title: `${nextTarget} Günlük Hedef`,
      description: `${nextTarget - current_streak} gün kaldı`,
      value: nextTarget,
      progress,
      isAchieved: false,
      icon: 'target',
      color: '#4CAF50',
    });
  }

  // Achievement milestones
  targets.forEach((target) => {
    if (longest_streak >= target) {
      milestones.push({
        type: 'achievement',
        title: `${target} Gün Ustası`,
        description: `${target} gün üst üste başarı`,
        value: target,
        progress: 100,
        isAchieved: true,
        icon: getMilestoneIcon(target),
        color: '#FFD700',
      });
    }
  });

  return milestones;
};

const getMilestoneIcon = (days: number): string => {
  if (days >= 365) return 'crown';
  if (days >= 100) return 'diamond';
  if (days >= 30) return 'star';
  if (days >= 14) return 'medal';
  if (days >= 7) return 'trophy';
  return 'award';
};
```

## 🎯 Goal Tracking System

### Daily Goal Management

```typescript
// Goal tracking interface
interface DailyGoalProgress {
  currentCount: number;
  targetCount: number;
  percentage: number;
  isComplete: boolean;
  timeToComplete?: string;
  streakImpact: 'maintains' | 'increases' | 'breaks';
}

// Goal calculation hook
export const useDailyGoalProgress = (date: string) => {
  const { data: entry } = useGratitudeEntry(date);
  const { profile } = useUserProfile();
  const { data: streak } = useStreakData();

  return useMemo((): DailyGoalProgress => {
    const statements = entry?.statements || [];
    const targetCount = profile?.daily_gratitude_goal || 3;
    const currentCount = statements.length;
    const percentage = Math.min((currentCount / targetCount) * 100, 100);
    const isComplete = currentCount >= targetCount;

    // Determine streak impact
    let streakImpact: DailyGoalProgress['streakImpact'] = 'maintains';
    const isToday = date === new Date().toISOString().split('T')[0];

    if (isToday) {
      if (isComplete) {
        const lastEntryDate = streak?.last_entry_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        if (!lastEntryDate || lastEntryDate < yesterdayString) {
          streakImpact = 'increases';
        } else {
          streakImpact = 'maintains';
        }
      } else {
        streakImpact = 'breaks';
      }
    }

    return {
      currentCount,
      targetCount,
      percentage,
      isComplete,
      streakImpact,
    };
  }, [entry, profile, streak, date]);
};
```

### Goal Setting & Customization

```typescript
// Goal management component
interface GoalSettingsProps {
  currentGoal: number;
  onGoalChange: (newGoal: number) => void;
}

const GoalSettings: React.FC<GoalSettingsProps> = React.memo(({
  currentGoal,
  onGoalChange
}) => {
  const [selectedGoal, setSelectedGoal] = useState(currentGoal);
  const { theme } = useTheme();

  const goalOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleGoalSelect = useCallback((goal: number) => {
    setSelectedGoal(goal);
    onGoalChange(goal);

    // Analytics tracking
    analyticsService.logEvent('daily_goal_changed', {
      old_goal: currentGoal,
      new_goal: goal,
      change_direction: goal > currentGoal ? 'increase' : 'decrease',
    });
  }, [currentGoal, onGoalChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Günlük Hedef</Text>
      <Text style={styles.description}>
        Her gün kaç minnet ifadesi yazmak istiyorsun?
      </Text>

      <View style={styles.goalGrid}>
        {goalOptions.map(goal => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.goalOption,
              selectedGoal === goal && styles.selectedGoal,
            ]}
            onPress={() => handleGoalSelect(goal)}
            accessibilityRole="button"
            accessibilityLabel={`${goal} günlük hedef seç`}
          >
            <Text style={[
              styles.goalText,
              selectedGoal === goal && styles.selectedGoalText,
            ]}>
              {goal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <GoalRecommendation currentGoal={selectedGoal} />
    </View>
  );
});

// Goal recommendation system
const GoalRecommendation: React.FC<{ currentGoal: number }> = ({ currentGoal }) => {
  const recommendation = useMemo(() => {
    if (currentGoal <= 2) {
      return {
        text: 'Başlangıç için harika! Küçük adımlar büyük değişimler yaratır.',
        icon: 'seedling',
        color: '#4CAF50',
      };
    } else if (currentGoal <= 5) {
      return {
        text: 'Mükemmel denge! Sürdürülebilir ve etkili bir hedef.',
        icon: 'balance-scale',
        color: '#2196F3',
      };
    } else {
      return {
        text: 'Ambiösyöz hedef! Tutarlılık anahtarın olacak.',
        icon: 'mountain',
        color: '#FF9800',
      };
    }
  }, [currentGoal]);

  return (
    <View style={styles.recommendation}>
      <Icon name={recommendation.icon} size={20} color={recommendation.color} />
      <Text style={styles.recommendationText}>{recommendation.text}</Text>
    </View>
  );
};
```

## 📊 Progress Visualization

### Advanced Progress Components

```typescript
// Enhanced progress ring component
interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = React.memo(({
  progress,
  size,
  strokeWidth,
  color,
  backgroundColor = '#E0E0E0',
  showPercentage = true,
  animated = true,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [progress, animated, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {showPercentage && (
        <View style={styles.progressText}>
          <Text style={styles.percentageText}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
});

// Streak visualization component
const StreakVisualization: React.FC<{ streak: Streak }> = ({ streak }) => {
  const { theme } = useTheme();
  const { current_streak, longest_streak } = streak;

  const streakColor = useMemo(() => {
    if (current_streak === 0) return theme.colors.onSurfaceVariant;
    if (current_streak < 7) return '#FF6B35';
    if (current_streak < 30) return '#FF9500';
    return '#FF6B00';
  }, [current_streak, theme]);

  return (
    <View style={styles.streakContainer}>
      <View style={styles.streakHeader}>
        <Icon name="fire" size={24} color={streakColor} />
        <Text style={styles.streakTitle}>Seri</Text>
      </View>

      <View style={styles.streakNumbers}>
        <View style={styles.streakItem}>
          <Text style={[styles.streakValue, { color: streakColor }]}>
            {current_streak}
          </Text>
          <Text style={styles.streakLabel}>Mevcut</Text>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakItem}>
          <Text style={[styles.streakValue, { color: theme.colors.primary }]}>
            {longest_streak}
          </Text>
          <Text style={styles.streakLabel}>En Uzun</Text>
        </View>
      </View>

      <StreakProgress current={current_streak} longest={longest_streak} />
    </View>
  );
};
```

## 🏆 Achievement System

### Milestone Recognition

```typescript
// Achievement calculation system
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'streak' | 'goal' | 'consistency' | 'milestone';
  requirement: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number;
}

export const useAchievements = () => {
  const { data: streak } = useStreakData();
  const { profile } = useUserProfile();
  const { data: totalEntries } = useQuery({
    queryKey: queryKeys.gratitude.count(),
    queryFn: gratitudeApi.getTotalGratitudeEntriesCount,
  });

  return useMemo(() => {
    if (!streak || !profile) return [];

    const achievements: Achievement[] = [
      // Streak achievements
      {
        id: 'first_streak',
        title: 'İlk Adım',
        description: '2 gün üst üste minnet',
        icon: 'footprint',
        color: '#4CAF50',
        category: 'streak',
        requirement: 2,
        isUnlocked: streak.longest_streak >= 2,
        progress: Math.min((streak.current_streak / 2) * 100, 100),
      },
      {
        id: 'week_warrior',
        title: 'Hafta Savaşçısı',
        description: '7 gün üst üste minnet',
        icon: 'sword',
        color: '#FF9800',
        category: 'streak',
        requirement: 7,
        isUnlocked: streak.longest_streak >= 7,
        progress: Math.min((streak.current_streak / 7) * 100, 100),
      },
      {
        id: 'month_master',
        title: 'Ay Ustası',
        description: '30 gün üst üste minnet',
        icon: 'crown',
        color: '#9C27B0',
        category: 'streak',
        requirement: 30,
        isUnlocked: streak.longest_streak >= 30,
        progress: Math.min((streak.current_streak / 30) * 100, 100),
      },

      // Total entries achievements
      {
        id: 'century_club',
        title: 'Yüzler Kulübü',
        description: '100 minnet ifadesi',
        icon: 'certificate',
        color: '#2196F3',
        category: 'milestone',
        requirement: 100,
        isUnlocked: (totalEntries || 0) >= 100,
        progress: Math.min(((totalEntries || 0) / 100) * 100, 100),
      },

      // Goal consistency achievements
      {
        id: 'goal_achiever',
        title: 'Hedef Odaklı',
        description: 'Günlük hedefini 10 kez tamamla',
        icon: 'bullseye',
        color: '#FF5722',
        category: 'goal',
        requirement: 10,
        isUnlocked: false, // Calculated based on goal completion history
        progress: 0, // Would need additional tracking
      },
    ];

    return achievements;
  }, [streak, profile, totalEntries]);
};

// Achievement notification system
export const useAchievementNotifications = () => {
  const achievements = useAchievements();
  const [notifiedAchievements, setNotifiedAchievements] = useState<Set<string>>(new Set());
  const { showSuccess } = useToast();

  useEffect(() => {
    achievements.forEach((achievement) => {
      if (achievement.isUnlocked && !notifiedAchievements.has(achievement.id)) {
        // Show achievement notification
        showSuccess(`🏆 ${achievement.title} başarısını açtın! ${achievement.description}`);

        // Track in analytics
        analyticsService.logEvent('achievement_unlocked', {
          achievement_id: achievement.id,
          achievement_title: achievement.title,
          category: achievement.category,
        });

        // Mark as notified
        setNotifiedAchievements((prev) => new Set([...prev, achievement.id]));
      }
    });
  }, [achievements, notifiedAchievements, showSuccess]);
};
```

## 📈 Analytics & Insights

### Goal & Streak Analytics

```typescript
// Analytics tracking for goals and streaks
export const goalAnalytics = {
  goalCompleted: (goal: number, timeToComplete: number) => {
    analyticsService.logEvent('daily_goal_completed', {
      goal_amount: goal,
      completion_time_minutes: timeToComplete,
      timestamp: Date.now(),
    });
  },

  streakMilestone: (streakLength: number, milestoneType: string) => {
    analyticsService.logEvent('streak_milestone_reached', {
      streak_length: streakLength,
      milestone_type: milestoneType,
      achievement_date: new Date().toISOString(),
    });
  },

  streakBroken: (streakLength: number, daysSinceLastEntry: number) => {
    analyticsService.logEvent('streak_broken', {
      final_streak_length: streakLength,
      days_since_last_entry: daysSinceLastEntry,
      break_date: new Date().toISOString(),
    });
  },

  goalAdjusted: (oldGoal: number, newGoal: number, reason: string) => {
    analyticsService.logEvent('goal_adjusted', {
      old_goal: oldGoal,
      new_goal: newGoal,
      adjustment_direction: newGoal > oldGoal ? 'increase' : 'decrease',
      reason,
    });
  },
};

// Streak insights calculation
export const useStreakInsights = () => {
  const { data: streak } = useStreakData();

  return useMemo(() => {
    if (!streak) return null;

    const { current_streak, longest_streak } = streak;

    return {
      streakHealth: calculateStreakHealth(current_streak),
      improvementTip: getImprovementTip(current_streak, longest_streak),
      motivationalMessage: getMotivationalMessage(current_streak),
      nextMilestone: getNextMilestone(current_streak),
    };
  }, [streak]);
};

const calculateStreakHealth = (currentStreak: number): 'excellent' | 'good' | 'needs_attention' => {
  if (currentStreak >= 7) return 'excellent';
  if (currentStreak >= 3) return 'good';
  return 'needs_attention';
};

const getImprovementTip = (current: number, longest: number): string => {
  if (current === 0) {
    return 'Bugün yeni bir başlangıç! Küçük bir minnet ifadesi ile başla.';
  }
  if (current < longest / 2) {
    return 'Daha önce daha uzun seriler yapmışsın. O kararlılığı tekrar gösterebilirsin!';
  }
  if (current >= longest) {
    return 'Harika! Kişisel rekoruna yaklaşıyorsun veya onu geçtin!';
  }
  return 'Düzenli devam etmeye odaklan. Küçük adımlar büyük başarılar getirir.';
};
```

This comprehensive streak and goals system provides the gamification backbone that motivates users to maintain consistent gratitude practice while providing meaningful progress tracking and achievement recognition.
