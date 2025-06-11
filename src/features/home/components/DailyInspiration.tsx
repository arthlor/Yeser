import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyInspirationProps {
  currentCount: number;
  dailyGoal: number;
  onPress?: () => void;
  animateEntrance?: boolean;
}

// 🎯 STABLE BASE CARDS: Prevent unnecessary re-renders
const BASE_INSPIRATION_CARDS = [
  {
    id: 'gratitude',
    icon: 'leaf-outline',
    iconColor: '#6BCF7F',
    title: 'Minnettarlık',
    message: 'Her minnettarlık, kalbinde yeşeren bir umut tohumudur.',
    gradient: ['#6BCF7F20', '#6BCF7F10'],
  },
  {
    id: 'peace',
    icon: 'heart',
    iconColor: '#FF6B6B',
    title: 'İçsel Huzur',
    message: 'Minnettarlık, ruhun en derin köşelerinde saklı huzuru bulmanın anahtarıdır.',
    gradient: ['#FF6B6B20', '#FF6B6B10'],
  },
  {
    id: 'energy',
    icon: 'sunny',
    iconColor: '#FFD93D',
    title: 'Pozitif Enerji',
    message: 'Minnettarlık, hayatına renk katan en güçlü pozitif enerji kaynağıdır.',
    gradient: ['#FFD93D20', '#FFD93D10'],
  },
  {
    id: 'growth',
    icon: 'flower',
    iconColor: '#6BCF7F',
    title: 'Büyüme',
    message: 'Her minnettarlık, kişisel gelişimin yolunda atılan sağlam bir adımdır.',
    gradient: ['#6BCF7F20', '#6BCF7F10'],
  },
] as const;

/**
 * ✨ SWIPEABLE DAILY INSPIRATION
 *
 * **EDGE-TO-EDGE INSPIRATION CAROUSEL**:
 * - Swipeable inspiration cards with horizontal scrolling
 * - Edge-to-edge design spanning full screen width
 * - Subtle but striking visual design with coordinated animations
 * - Multiple inspirational messages with progress-aware content
 * - Smooth page indicator and minimal interaction design
 * - 🚀 ENHANCED: Fixed state management and caching issues
 */
const DailyInspiration: React.FC<DailyInspirationProps> = React.memo(
  ({ currentCount, dailyGoal, onPress, animateEntrance = true }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollTimeoutRef = useRef<number | null>(null);

    // **COORDINATED ANIMATION SYSTEM**: Subtle entrance animation
    const animations = useCoordinatedAnimations();

    // 🎯 STABLE INSPIRATION CARDS: Memoized with dependencies for better performance
    const inspirationCards = useMemo(() => {
      // Determine progress state for conditional content
      const progressState =
        currentCount === 0 ? 'start' : currentCount >= dailyGoal ? 'complete' : 'progress';

      // Create progress-specific card
      let progressCard;
      switch (progressState) {
        case 'start': {
          progressCard = {
            id: 'start',
            icon: 'play-circle',
            iconColor: theme.colors.primary,
            title: 'Başlangıç',
            message: 'Bugün için ilk minnettarlığını yazarak güzel bir başlangıç yap.',
            gradient: [theme.colors.primary + '20', theme.colors.primary + '10'],
          };
          break;
        }
        case 'complete': {
          progressCard = {
            id: 'complete',
            icon: 'trophy',
            iconColor: '#FFD700',
            title: 'Başarı',
            message: 'Bugünün hedefini tamamladın! Minnettarlığın hayatına renk katıyor.',
            gradient: ['#FFD70020', '#FFD70010'],
          };
          break;
        }
        default: {
          const remaining = dailyGoal - currentCount;
          progressCard = {
            id: 'progress',
            icon: 'trending-up',
            iconColor: theme.colors.primary,
            title: 'Devam Et',
            message: `${remaining} minnettarlık daha yazarak bugünün hedefine ulaşabilirsin.`,
            gradient: [theme.colors.primary + '20', theme.colors.primary + '10'],
          };
        }
      }

      // Return stable array with progress card first
      return [progressCard, ...BASE_INSPIRATION_CARDS];
    }, [currentCount, dailyGoal, theme.colors.primary]);

    // 🚀 IMPROVED SCROLL HANDLING: Debounced for better performance
    const handleScroll = useCallback(
      (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(scrollPosition / SCREEN_WIDTH);

        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce index updates to prevent rapid state changes
        scrollTimeoutRef.current = setTimeout(() => {
          if (newIndex >= 0 && newIndex < inspirationCards.length && newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
          }
        }, 50) as unknown as number; // Small delay to debounce rapid scroll events
      },
      [currentIndex, inspirationCards.length]
    );

    // 🎯 ENHANCED SCROLL TO INDEX: Better scroll behavior
    const scrollToIndex = useCallback(
      (index: number) => {
        if (index >= 0 && index < inspirationCards.length && scrollViewRef.current) {
          setCurrentIndex(index);
          scrollViewRef.current.scrollTo({
            x: index * SCREEN_WIDTH,
            animated: true,
          });
        }
      },
      [inspirationCards.length]
    );

    // 🛡️ MEMORY LEAK PREVENTION: Enhanced cleanup
    useEffect(() => {
      return () => {
        // Clear timeout on unmount
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        // Clear ref for better garbage collection
        if (scrollViewRef.current) {
          scrollViewRef.current = null;
        }
      };
    }, []);

    // 📱 RESPONSIVE INDEX VALIDATION: Ensure currentIndex stays within bounds
    useEffect(() => {
      if (currentIndex >= inspirationCards.length) {
        setCurrentIndex(0); // Reset to first card if out of bounds
      }
    }, [currentIndex, inspirationCards.length]);

    // **COORDINATED ENTRANCE**: Subtle entrance animation
    useEffect(() => {
      if (animateEntrance) {
        animations.animateEntrance({ duration: 600 });
      }
    }, [animateEntrance, animations]);

    const handlePress = useCallback(() => {
      onPress?.();
    }, [onPress]);

    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* **SWIPEABLE CARDS**: Horizontal scrolling inspiration */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          // 🚀 ENHANCED SCROLL PERFORMANCE
          removeClippedSubviews={true}
          decelerationRate="fast"
        >
          {inspirationCards.map((card, _index) => (
            <TouchableOpacity
              key={card.id} // Use stable ID instead of index
              onPress={handlePress}
              onPressIn={animations.animatePressIn}
              onPressOut={animations.animatePressOut}
              activeOpacity={0.95}
              style={styles.card}
            >
              <Animated.View
                style={[
                  styles.cardContent,
                  {
                    transform: [{ scale: animations.scaleAnim }],
                  },
                ]}
              >
                {/* **SUBTLE GRADIENT BACKGROUND** */}
                <View style={[styles.gradientBackground, { backgroundColor: card.gradient[0] }]} />

                {/* **CARD HEADER** */}
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: card.iconColor + '20' }]}>
                    <Ionicons
                      name={card.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={card.iconColor}
                    />
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>

                {/* **INSPIRATION MESSAGE** */}
                <Text style={styles.cardMessage}>"{card.message}"</Text>

                {/* **PROGRESS INDICATOR** */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {currentCount} / {dailyGoal} minnettarlık
                  </Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 🎯 ENHANCED PAGE INDICATOR: Better state synchronization */}
        <View style={styles.pageIndicator}>
          {inspirationCards.map((card, index) => (
            <TouchableOpacity
              key={card.id} // Use stable ID
              onPress={() => scrollToIndex(index)}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
                // Enhanced visual feedback
                index === currentIndex && styles.activeDotShadow,
              ]}
              accessibilityLabel={`${index + 1}. kart`}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          ))}
        </View>
      </Animated.View>
    );
  }
);

DailyInspiration.displayName = 'DailyInspiration';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      alignItems: 'center',
    },
    card: {
      width: SCREEN_WIDTH,
      paddingHorizontal: theme.spacing.md,
    },
    cardContent: {
      height: 160,
      borderRadius: theme.borderRadius.large,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    cardTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    cardMessage: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 24,
      fontStyle: 'italic',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    progressContainer: {
      position: 'absolute',
      bottom: theme.spacing.md,
      right: theme.spacing.md,
    },
    progressText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    pageIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
      gap: 6, // Better spacing between dots
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    activeDot: {
      backgroundColor: theme.colors.primary,
      width: 10, // Slightly larger for active state
      height: 10,
      borderRadius: 5,
    },
    inactiveDot: {
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: 0.4, // Better contrast
    },
    // 🎯 ENHANCED ACTIVE DOT: Better visual feedback
    activeDotShadow: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  });

export default DailyInspiration;
