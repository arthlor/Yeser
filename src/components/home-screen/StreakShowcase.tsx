import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface StreakShowcaseProps {
  currentStreak: number;
  isLoading?: boolean;
  onPress?: () => void;
  longestStreak?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const StreakShowcase: React.FC<StreakShowcaseProps> = ({
  currentStreak,
  isLoading,
  onPress,
  longestStreak = 0,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation values for enhanced interactions
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const fireAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  const [showCelebration, setShowCelebration] = useState(false);

  // Start fire animations when streak is high
  useEffect(() => {
    if (currentStreak >= 7) {
      // Staggered fire particle animations
      const animations = fireAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1000 + index * 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        )
      );

      animations.forEach((anim) => {
        anim.start();
      });
    }
  }, [currentStreak, fireAnimations]);

  // Floating animation for high streaks
  useEffect(() => {
    if (currentStreak >= 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatValue, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [currentStreak, floatValue]);

  // Glow effect for very high streaks
  useEffect(() => {
    if (currentStreak >= 30) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [currentStreak, glowValue]);

  const getStreakLevel = () => {
    if (currentStreak >= 365)
      return {
        title: '🏆 Efsane',
        subtitle: 'Bir yıllık devamlılık!',
        color: '#FFD700',
        bgGradient: ['#FFD700', '#FFA000'],
        level: 'legendary',
      };
    if (currentStreak >= 100)
      return {
        title: '💎 Ustalaştı',
        subtitle: 'Yüz günlük kararlılık!',
        color: '#00BCD4',
        bgGradient: ['#00BCD4', '#0097A7'],
        level: 'master',
      };
    if (currentStreak >= 50)
      return {
        title: '🔥 Ateşli',
        subtitle: 'Elli günlük tutku!',
        color: '#FF5722',
        bgGradient: ['#FF5722', '#D84315'],
        level: 'fire',
      };
    if (currentStreak >= 30)
      return {
        title: '⚡ Güçlü',
        subtitle: 'Otuz günlük güç!',
        color: '#9C27B0',
        bgGradient: ['#9C27B0', '#7B1FA2'],
        level: 'powerful',
      };
    if (currentStreak >= 14)
      return {
        title: '🌟 Parlak',
        subtitle: 'İki haftlık parlaklık!',
        color: '#2196F3',
        bgGradient: ['#2196F3', '#1976D2'],
        level: 'bright',
      };
    if (currentStreak >= 7)
      return {
        title: '💪 Kararlı',
        subtitle: 'Bir haftlık kararlılık!',
        color: '#4CAF50',
        bgGradient: ['#4CAF50', '#388E3C'],
        level: 'determined',
      };
    if (currentStreak >= 3)
      return {
        title: '🌱 Büyüyen',
        subtitle: 'Üç günlük başlangıç!',
        color: '#8BC34A',
        bgGradient: ['#8BC34A', '#689F38'],
        level: 'growing',
      };
    return {
      title: '⭐ Başlangıç',
      subtitle: 'Her adım değerli!',
      color: '#FFC107',
      bgGradient: ['#FFC107', '#F57C00'],
      level: 'starter',
    };
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate([10, 50, 10]);
    }

    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1.05,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  const streakData = getStreakLevel();
  const isPersonalRecord = currentStreak > longestStreak;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleValue },
            {
              translateY: floatValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -3],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.showcaseCard,
          {
            borderColor: streakData.color + '40',
            shadowColor: streakData.color,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Glow effect for high streaks */}
        {currentStreak >= 30 && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                backgroundColor: streakData.color + '20',
                opacity: glowValue,
              },
            ]}
          />
        )}

        {/* Fire particles for very high streaks */}
        {currentStreak >= 7 && (
          <View style={styles.fireContainer}>
            {fireAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.fireParticle,
                  {
                    left: 20 + index * 15,
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -20],
                        }),
                      },
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.5, 1, 0.3],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.fireEmoji}>🔥</Text>
              </Animated.View>
            ))}
          </View>
        )}

        <View style={styles.content}>
          {/* Main streak number */}
          <View style={styles.streakNumberContainer}>
            <Text style={[styles.streakNumber, { color: streakData.color }]}>
              {isLoading ? '...' : currentStreak}
            </Text>
            <Text style={styles.streakUnit}>günlük seri</Text>

            {/* Personal record indicator */}
            {isPersonalRecord && currentStreak > 0 && (
              <View style={styles.recordBadge}>
                <Icon name="trophy" size={12} color="#FFD700" />
                <Text style={styles.recordText}>YENİ REKOR!</Text>
              </View>
            )}
          </View>

          {/* Level and description */}
          <View style={styles.levelContainer}>
            <Text style={[styles.levelTitle, { color: streakData.color }]}>{streakData.title}</Text>
            <Text style={styles.levelSubtitle}>{streakData.subtitle}</Text>
          </View>

          {/* Progress to next milestone */}
          <View style={styles.progressContainer}>
            {currentStreak < 365 && (
              <>
                <Text style={styles.progressText}>
                  Sonraki seviyeye: {getNextMilestone() - currentStreak} gün
                </Text>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: streakData.color,
                        width: `${getProgressToNext()}%`,
                      },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Icon name="chevron-right" size={20} color={streakData.color} style={{ opacity: 0.7 }} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  function getNextMilestone() {
    const milestones = [3, 7, 14, 30, 50, 100, 365];
    return milestones.find((m) => m > currentStreak) || 365;
  }

  function getProgressToNext() {
    const next = getNextMilestone();
    const prev = [...[0, 3, 7, 14, 30, 50, 100]].reverse().find((m) => m <= currentStreak) || 0;
    return ((currentStreak - prev) / (next - prev)) * 100;
  }
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
    },
    showcaseCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl + 8,
      borderWidth: 2,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 12,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      position: 'relative',
      overflow: 'hidden',
    },
    glowEffect: {
      position: 'absolute',
      top: -10,
      left: -10,
      right: -10,
      bottom: -10,
      borderRadius: theme.borderRadius.xl + 18,
    },
    fireContainer: {
      position: 'absolute',
      top: 10,
      left: 0,
      right: 0,
      height: 30,
    },
    fireParticle: {
      position: 'absolute',
    },
    fireEmoji: {
      fontSize: 16,
    },
    content: {
      flex: 1,
    },
    streakNumberContainer: {
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    streakNumber: {
      fontSize: 42,
      fontWeight: '900',
      letterSpacing: -2,
      lineHeight: 48,
    },
    streakUnit: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginTop: -4,
      letterSpacing: 0.5,
    },
    recordBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFD700' + '30',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 4,
    },
    recordText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FF8F00',
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    levelContainer: {
      marginBottom: theme.spacing.sm,
    },
    levelTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 2,
      letterSpacing: -0.3,
    },
    levelSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    progressContainer: {
      marginTop: theme.spacing.xs,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.outline + '30',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    chevronContainer: {
      padding: theme.spacing.sm,
    },
  });

export default StreakShowcase;
