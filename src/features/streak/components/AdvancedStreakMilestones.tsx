import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, Vibration, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

interface AdvancedStreakMilestonesProps {
  currentStreak: number;
  longestStreak: number;
  onMilestoneAchieved?: (milestone: AdvancedMilestone) => void;
  showCelebration?: boolean;
  onPress?: () => void;
}

export interface AdvancedMilestone {
  id: string;
  minDays: number;
  maxDays: number;
  title: string;
  description: string;
  emoji: string;
  reward: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary';
  colorPrimary: string;
  colorSecondary: string;
  particleEffect: 'sparks' | 'stars' | 'hearts' | 'fire' | 'rainbow' | 'galaxy';
  soundEffect?: string;
  unlockedMessage: string;
}

// Removed unused screenWidth variable

// Enhanced milestone system with 15 levels
const ADVANCED_MILESTONES: AdvancedMilestone[] = [
  {
    id: 'first-step',
    minDays: 1,
    maxDays: 1,
    title: 'İlk Adım',
    description: 'Minnettarlık yolculuğun başladı!',
    emoji: '🌱',
    reward: 'Başlangıç Rozeti',
    category: 'beginner',
    colorPrimary: '#4CAF50',
    colorSecondary: '#81C784',
    particleEffect: 'sparks',
    unlockedMessage: 'Tebrikler! İlk adımı attın. Bu, güzel bir başlangıç! 🎉',
  },
  {
    id: 'momentum',
    minDays: 3,
    maxDays: 6,
    title: 'Momentum',
    description: 'Alışkanlık oluşmaya başlıyor!',
    emoji: '🌿',
    reward: 'Kararlılık Rozeti',
    category: 'beginner',
    colorPrimary: '#66BB6A',
    colorSecondary: '#A5D6A7',
    particleEffect: 'hearts',
    unlockedMessage: 'Harika! Momentum kazanıyorsun. Devam et! 💚',
  },
  {
    id: 'first-week',
    minDays: 7,
    maxDays: 13,
    title: 'İlk Hafta',
    description: 'Bir hafta boyunca devam ettin!',
    emoji: '🌳',
    reward: 'Haftalık Şampiyon',
    category: 'intermediate',
    colorPrimary: '#2E7D32',
    colorSecondary: '#4CAF50',
    particleEffect: 'stars',
    unlockedMessage: 'İnanılmaz! Bir hafta tamamladın. Artık bir alışkanlık! ⭐',
  },
  {
    id: 'two-weeks',
    minDays: 14,
    maxDays: 20,
    title: 'İki Hafta',
    description: 'Çiçeklenme zamanı!',
    emoji: '🌸',
    reward: 'Çiçek Açtırıcı',
    category: 'intermediate',
    colorPrimary: '#E91E63',
    colorSecondary: '#F48FB1',
    particleEffect: 'hearts',
    unlockedMessage: 'Muhteşem! İki hafta doldu. Artık çiçek açıyorsun! 🌸',
  },
  {
    id: 'three-weeks',
    minDays: 21,
    maxDays: 29,
    title: 'Üç Hafta',
    description: 'Alışkanlık kökleşti!',
    emoji: '🌺',
    reward: 'Köklü Alışkanlık',
    category: 'intermediate',
    colorPrimary: '#9C27B0',
    colorSecondary: '#CE93D8',
    particleEffect: 'fire',
    unlockedMessage: 'Fantastik! Üç hafta! Alışkanlığın artık kökleşti! 🌺',
  },
  {
    id: 'one-month',
    minDays: 30,
    maxDays: 44,
    title: 'Bir Ay',
    description: 'Aylık başarı! Güneş gibi parlıyorsun!',
    emoji: '🌻',
    reward: 'Güneş Savaşçısı',
    category: 'advanced',
    colorPrimary: '#FF9800',
    colorSecondary: '#FFB74D',
    particleEffect: 'rainbow',
    unlockedMessage: 'Olağanüstü! Bir ay doldu! Artık güneş gibi parlıyorsun! ☀️',
  },
  {
    id: 'six-weeks',
    minDays: 45,
    maxDays: 59,
    title: 'Altı Hafta',
    description: 'Enerji dolu! Güç seninle!',
    emoji: '⚡',
    reward: 'Enerji Ustası',
    category: 'advanced',
    colorPrimary: '#FFC107',
    colorSecondary: '#FFF176',
    particleEffect: 'fire',
    unlockedMessage: 'İnanılmaz enerji! Altı hafta! Güç seninle! ⚡',
  },
  {
    id: 'two-months',
    minDays: 60,
    maxDays: 89,
    title: 'İki Ay',
    description: 'Değerli taş gibi parıldıyorsun!',
    emoji: '💎',
    reward: 'Elmas Kalbi',
    category: 'advanced',
    colorPrimary: '#3F51B5',
    colorSecondary: '#7986CB',
    particleEffect: 'stars',
    unlockedMessage: 'Paha biçilmez! İki ay! Elmas gibi değerlisin! 💎',
  },
  {
    id: 'three-months',
    minDays: 90,
    maxDays: 119,
    title: 'Üç Ay',
    description: 'Ateşli ruha sahipsin!',
    emoji: '🔥',
    reward: 'Alev Koruyucusu',
    category: 'expert',
    colorPrimary: '#F44336',
    colorSecondary: '#EF5350',
    particleEffect: 'fire',
    unlockedMessage: 'Ateş gibi! Üç ay! Artık alev koruyucususun! 🔥',
  },
  {
    id: 'four-months',
    minDays: 120,
    maxDays: 149,
    title: 'Dört Ay',
    description: 'Yıldız gibi ışıldıyorsun!',
    emoji: '🌟',
    reward: 'Yıldız Avcısı',
    category: 'expert',
    colorPrimary: '#795548',
    colorSecondary: '#A1887F',
    particleEffect: 'galaxy',
    unlockedMessage: 'Yıldız gibi! Dört ay! Gökyüzünün yıldızısın! 🌟',
  },
  {
    id: 'five-months',
    minDays: 150,
    maxDays: 179,
    title: 'Beş Ay',
    description: 'Ay ışığı gibi büyülü!',
    emoji: '🌙',
    reward: 'Ay Işığı Sihirbazı',
    category: 'expert',
    colorPrimary: '#607D8B',
    colorSecondary: '#90A4AE',
    particleEffect: 'stars',
    unlockedMessage: 'Büyülü! Beş ay! Ay ışığı gibi büyülüsün! 🌙',
  },
  {
    id: 'six-months',
    minDays: 180,
    maxDays: 269,
    title: 'Altı Ay',
    description: 'Gökkuşağı gibi renkli!',
    emoji: '🌈',
    reward: 'Gökkuşağı Koruyucusu',
    category: 'expert',
    colorPrimary: '#E91E63',
    colorSecondary: '#F48FB1',
    particleEffect: 'rainbow',
    unlockedMessage: 'Renkli hayat! Altı ay! Gökkuşağının koruyucususun! 🌈',
  },
  {
    id: 'nine-months',
    minDays: 270,
    maxDays: 364,
    title: '👑 Dokuz Ay',
    description: 'Kraliçe/Kral gibi heybetli!',
    emoji: '👑',
    reward: 'Minnettarlık Kralı',
    category: 'legendary',
    colorPrimary: '#FF6F00',
    colorSecondary: '#FFB74D',
    particleEffect: 'galaxy',
    unlockedMessage: 'Kraliyet! Dokuz ay! Minnettarlık kralısın! 👑',
  },
  {
    id: 'one-year',
    minDays: 365,
    maxDays: 499,
    title: 'Bir Yıl',
    description: 'Efsane başarı! Şampiyon!',
    emoji: '🏆',
    reward: 'Altın Şampiyon',
    category: 'legendary',
    colorPrimary: '#FFD700',
    colorSecondary: '#FFF176',
    particleEffect: 'galaxy',
    unlockedMessage: 'EFSANEVİ! Tam bir yıl! Artık şampiyonsun! 🏆',
  },
  {
    id: 'infinite',
    minDays: 500,
    maxDays: Infinity,
    title: 'Sonsuz',
    description: 'Artık evrenin enerjisiyle birsin!',
    emoji: '✨',
    reward: 'Evren Ustası',
    category: 'legendary',
    colorPrimary: '#9C27B0',
    colorSecondary: '#E1BEE7',
    particleEffect: 'galaxy',
    unlockedMessage: 'SONSUZ GÜÇ! Evrenin enerjisiyle birsin! ✨',
  },
];

/**
 * 🏆 COORDINATED STREAK MILESTONES
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated direct Animated.timing for progress animations
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Enhanced consistency with coordinated animation philosophy
 */
const AdvancedStreakMilestones: React.FC<AdvancedStreakMilestonesProps> = ({
  currentStreak,
  longestStreak,
  onPress,
  showCelebration = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();

  const [currentMilestone, setCurrentMilestone] = useState<AdvancedMilestone | null>(null);
  const [nextMilestone, setNextMilestone] = useState<AdvancedMilestone | null>(null);
  const [isPersonalRecord, setIsPersonalRecord] = useState(false);

  // Memoized achievement badge styles
  const getAchievementBadgeStyle = useMemo(() => {
    return ADVANCED_MILESTONES.slice(0, 6).reduce((styles: Record<string, object>, milestone) => {
      const isUnlocked = currentStreak >= milestone.minDays;
      styles[milestone.id] = {
        opacity: isUnlocked ? 1 : 0.3,
        backgroundColor: isUnlocked
          ? milestone.colorPrimary + '15'
          : theme.colors.surfaceVariant + '50',
      };
      return styles;
    }, {});
  }, [currentStreak, theme.colors.surfaceVariant]);

  // Find current and next milestones
  useEffect(() => {
    const current =
      ADVANCED_MILESTONES.find((m) => currentStreak >= m.minDays && currentStreak <= m.maxDays) ||
      ADVANCED_MILESTONES[0];

    const next = ADVANCED_MILESTONES.find((m) => m.minDays > currentStreak);

    setCurrentMilestone(current);
    setNextMilestone(next || null);
    setIsPersonalRecord(currentStreak > longestStreak && currentStreak > 0);
  }, [currentStreak, longestStreak]);

  // Calculate progress to next milestone
  const getProgressPercentage = useCallback((): number => {
    if (!currentMilestone || !nextMilestone) {
      return 100;
    }

    const currentRange = currentMilestone.maxDays - currentMilestone.minDays + 1;
    const progress = currentStreak - currentMilestone.minDays + 1;
    return Math.min(100, (progress / currentRange) * 100);
  }, [currentMilestone, nextMilestone, currentStreak]);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((milestone: AdvancedMilestone) => {
    if (milestone.category === 'legendary') {
      // Strong haptic for legendary achievements
      Vibration.vibrate([0, 200, 100, 200, 100, 300]);
    } else if (milestone.category === 'expert') {
      // Medium haptic for expert achievements
      Vibration.vibrate([0, 150, 50, 150]);
    } else if (milestone.category === 'advanced') {
      // Medium haptic for advanced achievements
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      // Light haptic for beginner/intermediate achievements
      Vibration.vibrate(100);
    }
  }, []);

  // Simplified celebration - haptic feedback only
  useEffect(() => {
    if (showCelebration && currentMilestone) {
      triggerHapticFeedback(currentMilestone);
    }
  }, [showCelebration, currentMilestone, triggerHapticFeedback]);

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **MINIMAL PROGRESS FEEDBACK**: Simple opacity change when progress updates
  useEffect(() => {
    if (currentStreak > 0) {
      animations.animateFade(1, { duration: 200 });
    }
  }, [currentStreak, animations]);

  // **REMOVED TRANSFORM**: Prevents iOS blurriness
  // const optimizedTransform = animations.entranceTransform;

  if (!currentMilestone) {
    return null;
  }

  let daysToNext = nextMilestone ? nextMilestone.minDays - currentStreak : 0;
  if (daysToNext < 0) {
    daysToNext = 0;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: animations.fadeAnim,
          // **REMOVED TRANSFORM**: Prevents iOS blurriness on streak section
          // transform: optimizedTransform,
          // **iOS ANTI-BLUR OPTIMIZATIONS**: Ensure pixel-perfect rendering
          ...(Platform.OS === 'ios' && {
            shouldRasterizeIOS: true,
            rasterizationScale: 2, // Use 2x for Retina displays
          }),
          // **ANDROID OPTIMIZATION**
          ...(Platform.OS === 'android' && {
            renderToHardwareTextureAndroid: true,
          }),
        },
      ]}
    >
      <ThemedCard
        variant="elevated"
        density="standard"
        elevation="card"
        onPress={handlePress}
        style={styles.container}
        touchableProps={{
          activeOpacity: 0.8,
        }}
      >
        {/* Simplified celebration overlay */}
        {showCelebration && (
          <View style={styles.celebrationOverlay}>
            <Text style={styles.celebrationText}>{currentMilestone.unlockedMessage}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Current milestone display */}
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneIconContainer}>
              <Text style={styles.milestoneEmoji}>{currentMilestone.emoji}</Text>
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneTitle, { color: currentMilestone.colorPrimary }]}>
                {currentMilestone.title}
              </Text>
              <Text style={styles.milestoneDescription}>{currentMilestone.description}</Text>
            </View>
            {/* Subtle clickable indicator */}
            {onPress && (
              <View style={styles.clickableIndicator}>
                <Icon name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
              </View>
            )}
          </View>

          {/* Compact streak counter */}
          <View style={styles.streakCounter}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>günlük seri</Text>

            {isPersonalRecord && (
              <View style={styles.recordBadge}>
                <Icon name="trophy" size={10} color={theme.colors.warning} />
                <Text style={styles.recordText}>YENİ REKOR!</Text>
              </View>
            )}
          </View>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>
                Sonraki: {nextMilestone.title} ({daysToNext} gün)
              </Text>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${getProgressPercentage()}%`,
                      backgroundColor: currentMilestone.colorPrimary,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Compact achievement showcase */}
          <View style={styles.achievementGrid}>
            {ADVANCED_MILESTONES.slice(0, 6).map((milestone) => (
              <View
                key={milestone.id}
                style={[styles.achievementBadge, getAchievementBadgeStyle[milestone.id]]}
              >
                <Text style={styles.achievementEmoji}>{milestone.emoji}</Text>
              </View>
            ))}
          </View>

          {/* Subtle hint at bottom */}
          {onPress && (
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Detayları görmek için dokunun</Text>
            </View>
          )}
        </View>
      </ThemedCard>
    </Animated.View>
  );
};

AdvancedStreakMilestones.displayName = 'AdvancedStreakMilestones';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      // **iOS ANTI-BLUR OPTIMIZATIONS**
      ...(Platform.OS === 'ios' && {
        shouldRasterizeIOS: true,
        rasterizationScale: 2, // Use 2x for Retina displays
      }),
      // **ANDROID OPTIMIZATION**
      ...(Platform.OS === 'android' && {
        renderToHardwareTextureAndroid: true,
      }),
    },
    glowEffect: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: theme.borderRadius.lg + 8,
    },
    celebrationOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + 'CC',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      borderRadius: theme.borderRadius.lg,
    },
    celebrationText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    particleContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 5,
    },
    particle: {
      position: 'absolute',
      top: '50%',
      left: '50%',
    },
    particleEmoji: {
      fontSize: 20,
    },
    content: {
      // Remove padding since ThemedCard handles it
    },
    milestoneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    milestoneIconContainer: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    milestoneEmoji: {
      fontSize: 32,
    },
    milestoneInfo: {
      flex: 1,
    },
    milestoneTitle: {
      ...theme.typography.titleSmall,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.2,
      // **iOS TEXT OPTIMIZATION**: Prevent text blurring on iOS
      ...(Platform.OS === 'ios' && {
        includeFontPadding: false,
      }),
    },
    milestoneDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    streakCounter: {
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    streakNumber: {
      ...theme.typography.headlineMedium,
      fontWeight: '900',
      color: theme.colors.primary,
      lineHeight: 36,
      // **iOS TEXT OPTIMIZATION**: Prevent text blurring on iOS
      ...(Platform.OS === 'ios' && {
        textAlign: 'center',
        includeFontPadding: false,
      }),
    },
    streakLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    recordBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warningContainer + '60',
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      marginTop: theme.spacing.xs,
    },
    recordText: {
      ...theme.typography.labelSmall,
      fontWeight: '700',
      color: theme.colors.onWarningContainer,
      marginLeft: theme.spacing.xs,
      fontSize: 10,
    },
    progressSection: {
      marginBottom: theme.spacing.sm,
    },
    progressLabel: {
      ...theme.typography.bodySmall,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
    },
    progressBarContainer: {
      height: 4,
      backgroundColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    achievementGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    achievementBadge: {
      width: '15%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    achievementEmoji: {
      fontSize: 14,
    },
    clickableIndicator: {
      padding: theme.spacing.xs,
      opacity: 0.6,
    },
    tapHint: {
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    },
    tapHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      opacity: 0.8,
    },
  });

export default AdvancedStreakMilestones;
export { ADVANCED_MILESTONES };
