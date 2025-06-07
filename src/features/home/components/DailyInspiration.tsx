import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedCard from '@/shared/components/ui/ThemedCard';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DailyInspirationProps {
  currentCount: number;
  dailyGoal: number;
}

interface InspirationItem {
  id: string;
  icon: string;
  title: string;
  message: string;
  color: string;
}

const { width: screenWidth } = Dimensions.get('window');

const DailyInspiration: React.FC<DailyInspirationProps> = ({ currentCount, dailyGoal }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Simplified animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Swipe state
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Simple entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getAllInspirationItems = useCallback((): InspirationItem[] => {
    const hour = new Date().getHours();
    const progress = currentCount / dailyGoal;

    // Goal completed inspirations
    if (currentCount >= dailyGoal) {
      return [
        {
          id: 'celebration-1',
          icon: 'check-circle',
          title: 'Harika! Hedefi tamamladınız! 🎉',
          message: 'Bugünkü minnettarlık yolculuğunuz tamamlandı.',
          color: theme.colors.success,
        },
        {
          id: 'celebration-2',
          icon: 'star',
          title: 'Mükemmel bir gün! ✨',
          message: 'Bu başarıyı kutlayın ve içinizde hissedin.',
          color: theme.colors.success,
        },
        {
          id: 'celebration-3',
          icon: 'trophy',
          title: 'Başarıyı elde ettiniz! 🏆',
          message: 'Her minnet sizi daha güçlü kılıyor.',
          color: theme.colors.success,
        },
      ];
    }

    // Progress inspirations
    if (currentCount > 0) {
      return [
        {
          id: 'progress-1',
          icon: 'heart',
          title: 'Güzel ilerliyorsunuz! 💫',
          message: 'Her minnet ruhunuzu güçlendiriyor.',
          color: theme.colors.primary,
        },
        {
          id: 'progress-2',
          icon: 'trending-up',
          title: `${Math.round(progress * 100)}% tamamlandı! 📈`,
          message: 'Hedefinize yaklaşıyorsunuz.',
          color: theme.colors.primary,
        },
        {
          id: 'progress-3',
          icon: 'compass',
          title: 'Doğru yoldasınız! 🧭',
          message: 'Minnettarlık sizi doğru yönde yönlendiriyor.',
          color: theme.colors.secondary,
        },
      ];
    }

    // Time-based inspirations
    if (hour >= 5 && hour < 12) {
      return [
        {
          id: 'morning-1',
          icon: 'weather-sunny',
          title: 'Güne minnetle başlayın 🌅',
          message: 'Her yeni gün, yeni fırsatlar demektir.',
          color: theme.colors.primary,
        },
        {
          id: 'morning-2',
          icon: 'coffee',
          title: 'Huzurlu bir başlangıç ☀️',
          message: 'Küçük anları keşfetmeye hazır mısınız?',
          color: theme.colors.secondary,
        },
      ];
    }

    if (hour >= 12 && hour < 17) {
      return [
        {
          id: 'afternoon-1',
          icon: 'heart-outline',
          title: 'Günün ortasında bir mola 🌞',
          message: 'Sevildiğinizi hissedin, minnet duyun.',
          color: theme.colors.primary,
        },
        {
          id: 'afternoon-2',
          icon: 'leaf',
          title: 'Doğanın armağanları 🍃',
          message: 'Etrafınızdaki güzellikleri fark edin.',
          color: theme.colors.secondary,
        },
      ];
    }

    if (hour >= 17 && hour < 22) {
      return [
        {
          id: 'evening-1',
          icon: 'weather-sunset',
          title: 'Günün güzelliklerini hatırlayın 🌆',
          message: 'Bugün size neşe getiren anları düşünün.',
          color: theme.colors.primary,
        },
        {
          id: 'evening-2',
          icon: 'home-heart',
          title: 'Sıcak yuva hissi 🏠',
          message: 'Size güven veren insanlar için minnettar olun.',
          color: theme.colors.secondary,
        },
      ];
    }

    // Night inspirations
    return [
      {
        id: 'night-1',
        icon: 'weather-night',
        title: 'Gecenin sessizliğinde 🌙',
        message: 'Bugün için minnettar olduğunuz anları düşünün.',
        color: theme.colors.primary,
      },
      {
        id: 'night-2',
        icon: 'star-outline',
        title: 'Huzurlu gece düşünceleri 😴',
        message: 'Minnettarlık güzel rüyalar getirir.',
        color: theme.colors.secondary,
      },
    ];
  }, [currentCount, dailyGoal, theme]);

  const inspirationItems = getAllInspirationItems();

  const dynamicStyles = useMemo(
    () => ({
      itemWidth: { width: screenWidth - 32 },
      paginationDotActive: { width: 16 },
      paginationDotInactive: { width: 6 },
    }),
    []
  );

  const renderInspirationItem = useCallback(
    ({ item }: { item: InspirationItem }) => (
      <View style={[styles.itemContainer, dynamicStyles.itemWidth]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
            <Icon name={item.icon} size={16} color={item.color} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
          </View>
        </View>
      </View>
    ),
    [styles, dynamicStyles.itemWidth]
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  }, []);

  const handlePaginationPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentIndex(index);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ThemedCard
        variant="elevated"
        density="compact"
        elevation="card"
        style={styles.inspirationCard}
      >
        <FlatList
          ref={flatListRef}
          data={inspirationItems}
          renderItem={renderInspirationItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={screenWidth - 32}
          snapToAlignment="center"
          decelerationRate="fast"
        />

        {/* Compact pagination indicators */}
        {inspirationItems.length > 1 && (
          <View style={styles.paginationContainer}>
            {inspirationItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      currentIndex === index ? item.color : theme.colors.outline + '40',
                  },
                  currentIndex === index
                    ? dynamicStyles.paginationDotActive
                    : dynamicStyles.paginationDotInactive,
                ]}
                onPress={() => handlePaginationPress(index)}
                accessible={true}
                accessibilityLabel={`${index + 1}. mesaja git`}
                accessibilityRole="button"
              />
            ))}
          </View>
        )}
      </ThemedCard>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
    },
    inspirationCard: {
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      ...getPrimaryShadow.card(theme),
      elevation: 2,
    },
    itemContainer: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 60,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      lineHeight: 18,
    },
    message: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
      opacity: 0.8,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    paginationDot: {
      height: 6,
      borderRadius: 8,
    },
  });

export default DailyInspiration;
