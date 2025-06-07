import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedCard from '@/shared/components/ui/ThemedCard';

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

const { width: screenWidth } = Dimensions.get('window');

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

const AdvancedStreakMilestones: React.FC<AdvancedStreakMilestonesProps> = ({
  currentStreak,
  longestStreak,
  onMilestoneAchieved,
  showCelebration = false,
  onPress,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation refs
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  const [currentMilestone, setCurrentMilestone] = useState<AdvancedMilestone | null>(null);
  const [nextMilestone, setNextMilestone] = useState<AdvancedMilestone | null>(null);
  const [isPersonalRecord, setIsPersonalRecord] = useState(false);

  // Find current and next milestones
  useEffect(() => {
    const current = ADVANCED_MILESTONES.find(
      (m) => currentStreak >= m.minDays && currentStreak <= m.maxDays
    ) || ADVANCED_MILESTONES[0];

    const next = ADVANCED_MILESTONES.find((m) => m.minDays > currentStreak);

    setCurrentMilestone(current);
    setNextMilestone(next || null);
    setIsPersonalRecord(currentStreak > longestStreak && currentStreak > 0);
  }, [currentStreak, longestStreak]);

  // Calculate progress to next milestone
  const getProgressPercentage = (): number => {
    if (!currentMilestone || !nextMilestone) {
      return 100;
    }
    
    const currentRange = currentMilestone.maxDays - currentMilestone.minDays + 1;
    const progress = currentStreak - currentMilestone.minDays + 1;
    return Math.min(100, (progress / currentRange) * 100);
  };

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

  // Celebration animation
  useEffect(() => {
    if (showCelebration) {
      startCelebrationAnimation();
      // Trigger haptic feedback for milestone achievement
      if (currentMilestone) {
        triggerHapticFeedback(currentMilestone);
      }
    }
  }, [showCelebration, currentMilestone, triggerHapticFeedback]);

  const startCelebrationAnimation = () => {
    // Scale animation
    Animated.sequence([
      Animated.spring(celebrationScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.spring(celebrationScale, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle effects
    startParticleAnimation();

    // Glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
      { iterations: 3 }
    ).start();
  };

  const startParticleAnimation = () => {
    particleAnimations.forEach((particle, index) => {
      // Random positions for particles
      const randomX = (Math.random() - 0.5) * screenWidth * 0.8;
      const randomDelay = index * 150;

      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: randomX,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: -200,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset particle
        particle.opacity.setValue(0);
        particle.scale.setValue(0);
        particle.translateX.setValue(0);
        particle.translateY.setValue(0);
      });
    });
  };

  // Progress bar animation
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: getProgressPercentage(),
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStreak]);

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
      {/* Glow effect for high streaks */}
      {currentStreak >= 30 && (
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnimation,
              backgroundColor: currentMilestone.colorPrimary + '20',
            },
          ]}
        />
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            {
              transform: [{ scale: celebrationScale }],
            },
          ]}
        >
          <Text style={styles.celebrationText}>
            {currentMilestone.unlockedMessage}
          </Text>
        </Animated.View>
      )}

      {/* Particle effects */}
      {showCelebration && (
        <View style={styles.particleContainer}>
          {particleAnimations.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { scale: particle.scale },
                  ],
                },
              ]}
            >
              <Text style={styles.particleEmoji}>
                {currentMilestone.particleEffect === 'stars' && '⭐'}
                {currentMilestone.particleEffect === 'hearts' && '💖'}
                {currentMilestone.particleEffect === 'fire' && '🔥'}
                {currentMilestone.particleEffect === 'sparks' && '✨'}
                {currentMilestone.particleEffect === 'rainbow' && '🌈'}
                {currentMilestone.particleEffect === 'galaxy' && '🌌'}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.content}>
        {/* Current milestone display */}
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneIconContainer}>
            <Text style={[styles.milestoneEmoji, { fontSize: 32 }]}>
              {currentMilestone.emoji}
            </Text>
          </View>
          <View style={styles.milestoneInfo}>
            <Text
              style={[
                styles.milestoneTitle,
                { color: currentMilestone.colorPrimary },
              ]}
            >
              {currentMilestone.title}
            </Text>
            <Text style={styles.milestoneDescription}>
              {currentMilestone.description}
            </Text>
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
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnimation.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
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
              style={[
                styles.achievementBadge,
                {
                  opacity: currentStreak >= milestone.minDays ? 1 : 0.3,
                  backgroundColor:
                    currentStreak >= milestone.minDays
                      ? milestone.colorPrimary + '15'
                      : theme.colors.surfaceVariant + '50',
                },
              ]}
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
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
      // Icon styling handled in component
    },
    milestoneInfo: {
      flex: 1,
    },
    milestoneTitle: {
      ...theme.typography.titleSmall,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.2,
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