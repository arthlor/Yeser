import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedCard from '@/shared/components/ui/ThemedCard';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Swipe state
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse animation for the icon
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  const getAllInspirationItems = (): InspirationItem[] => {
    const hour = new Date().getHours();
    const progress = currentCount / dailyGoal;
    
    // Goal completed inspirations
    if (currentCount >= dailyGoal) {
      return [
        {
          id: 'celebration-1',
          icon: 'star-circle',
          title: 'Günlük Hedefinizi Tamamladınız! 🎉',
          message: 'Minnettarlığınız bugün güzelce çiçeklenmiş. İstersen daha fazla şükran ekleyebilirsiniz.',
          color: theme.colors.success,
        },
        {
          id: 'celebration-2',
          icon: 'trophy',
          title: 'Harika Bir Başarı! ✨',
          message: 'Bugünkü minnet yolculuğunuz tamamlandı. Kalbiniz şükranla dolu.',
          color: theme.colors.success,
        },
        {
          id: 'celebration-3',
          icon: 'medal',
          title: 'Mükemmel Bir Gün! 🏆',
          message: 'Minnettarlık pratiğiniz bugün doruk noktasında. Bu başarıyı kutlayın!',
          color: theme.colors.success,
        },
        {
          id: 'celebration-4',
          icon: 'crown',
          title: 'Başarı Tacı Sizin! 👑',
          message: 'Bugün minnettarlık krallığının tacını giydiniz. Ne kadar güzel bir his!',
          color: theme.colors.success,
        },
        {
          id: 'celebration-5',
          icon: 'diamond',
          title: 'Değerli Bir Kazanım! 💎',
          message: 'Her şükran bir değerli taş gibi. Bugün hazinenizi tamamladınız.',
          color: theme.colors.success,
        },
        {
          id: 'celebration-6',
          icon: 'firework',
          title: 'Büyük Kutlama Zamanı! 🎆',
          message: 'Minnettarlık hedefinize ulaştınız! Bu başarıyı içinizde hissedin.',
          color: theme.colors.success,
        },
      ];
    }

    // Progress inspirations
    if (currentCount > 0) {
      return [
        {
          id: 'progress-1',
          icon: 'heart-pulse',
          title: 'Güzel İlerliyorsunuz! 💫',
          message: 'Her şükran kalbinizi güçlendiriyor. Devam edin, hedefinize çok yakınsınız.',
          color: theme.colors.primary,
        },
        {
          id: 'progress-2',
          icon: 'sprout',
          title: 'Minnet Tohumu Filizleniyor 🌱',
          message: 'Bugün ektiğiniz minnettarlık tohumları güzelce büyüyor.',
          color: theme.colors.primary,
        },
        {
          id: 'progress-3',
          icon: 'chart-line',
          title: 'Başarılı Adımlar! 📈',
          message: `${Math.round(progress * 100)}% tamamlandı! Her şükran sizi hedefnize yaklaştırıyor.`,
          color: theme.colors.primary,
        },
        {
          id: 'progress-4',
          icon: 'triangle',
          title: 'Zirveye Doğru Yürüyorsunuz! ⛰️',
          message: 'Her şükran sizi minnettarlık zirvesine bir adım daha yaklaştırıyor.',
          color: theme.colors.secondary,
        },
        {
          id: 'progress-5',
          icon: 'rocket',
          title: 'Hızla İlerleyen Yolculuk! 🚀',
          message: 'Minnettarlık roketiniz hedefe doğru hızla ilerliyor. Ne kadar güzel!',
          color: theme.colors.tertiary,
        },
        {
          id: 'progress-6',
          icon: 'compass',
          title: 'Doğru Yolda İlerliyorsunuz! 🧭',
          message: 'Minnettarlık pusulası sizi hep doğru yöne yönlendiriyor. Devam edin!',
          color: theme.colors.primary,
        },
      ];
    }

    // Morning inspirations
    if (hour >= 5 && hour < 12) {
      return [
        {
          id: 'morning-1',
          icon: 'weather-sunny',
          title: 'Güne Şükranla Başlayın 🌅',
          message: 'Her yeni gün, yeni şükranlar keşfetmek için bir fırsattır. Bugün hangi güzellikleri fark edeceksiniz?',
          color: theme.colors.primary,
        },
        {
          id: 'morning-2',
          icon: 'flower',
          title: 'Sabahın Sihrine Açılın ✨',
          message: 'Güneşin ilk ışıkları gibi, minnettarlığınız da etrafınızı aydınlatacak.',
          color: theme.colors.secondary,
        },
        {
          id: 'morning-3',
          icon: 'coffee',
          title: 'Huzurlu Bir Başlangıç ☀️',
          message: 'Bugün için minnettar olabileceğiniz küçük anları keşfetmeye hazır mısınız?',
          color: theme.colors.tertiary,
        },
        {
          id: 'morning-4',
          icon: 'bird',
          title: 'Kuşların Şarkısıyla Uyanın 🐦',
          message: 'Doğanın sabah senfoniси size bugün ne kadar güzel şeyler olacağını fısıldıyor.',
          color: theme.colors.primary,
        },
        {
          id: 'morning-5',
          icon: 'tree',
          title: 'Yeni Başlangıçların Enerjisi 🌳',
          message: 'Ağaçlar gibi köklü ve sağlam minnettarlık duygularınızı besleyin.',
          color: theme.colors.secondary,
        },
        {
          id: 'morning-6',
          icon: 'rainbow',
          title: 'Renkli Bir Gün Başlıyor 🌈',
          message: 'Her şükran hayatınıza yeni bir renk katıyor. Bugün paleti nasıl renklendireceiz?',
          color: theme.colors.tertiary,
        },
      ];
    }

    // Afternoon inspirations  
    if (hour >= 12 && hour < 17) {
      return [
        {
          id: 'afternoon-1',
          icon: 'heart-outline',
          title: 'Günün Ortasında Bir Mola 🌞',
          message: 'Şu ana kadar yaşadığınız güzel anlar için bir şükran duygusal durumu yaşayın.',
          color: theme.colors.primary,
        },
        {
          id: 'afternoon-2',
          icon: 'butterfly',
          title: 'Anın Güzelliğini Yakalayın 🦋',
          message: 'Hayat anlık güzelliklerle dolu. Bugün hangi küçük mucizeleri gözlemliyorsunuz?',
          color: theme.colors.secondary,
        },
        {
          id: 'afternoon-3',
          icon: 'leaf',
          title: 'Doğanın Armağanları 🍃',
          message: 'Öğlen saatlerinin enerjisiyle, etrafınızdaki doğal güzellikleri fark edin.',
          color: theme.colors.tertiary,
        },
        {
          id: 'afternoon-4',
          icon: 'fountain',
          title: 'Berrak Düşünceler 💧',
          message: 'Öğlen saatlerinin berraklığında, kalbinizdeki şükran çeşmesinin sesini dinleyin.',
          color: theme.colors.primary,
        },
        {
          id: 'afternoon-5',
          icon: 'palette',
          title: 'Hayatın Renkleri 🎨',
          message: 'Gündüz ışığında, hayatınızın ne kadar renkli olduğunu görmek daha kolay.',
          color: theme.colors.secondary,
        },
        {
          id: 'afternoon-6',
          icon: 'music',
          title: 'İçinizdeki Müzik 🎵',
          message: 'Minnettarlık, kalbinizde çalan en güzel melodidir. Bugün hangi notalar var?',
          color: theme.colors.tertiary,
        },
      ];
    }

    // Evening inspirations
    if (hour >= 17 && hour < 22) {
      return [
        {
          id: 'evening-1',
          icon: 'weather-sunset',
          title: 'Günün Güzelliklerini Hatırlayın 🌆',
          message: 'Akşam saatlerinde, bugün size sevgi getiren anları düşünmek için mükemmel bir zaman.',
          color: theme.colors.primary,
        },
        {
          id: 'evening-2',
          icon: 'candle',
          title: 'Huzurlu Akşam Düşünceleri 🕯️',
          message: 'Günün yorgunluğu içinde bile minnettarlık, kalbinizde sıcaklık yaratabilir.',
          color: theme.colors.secondary,
        },
        {
          id: 'evening-3',
          icon: 'home-heart',
          title: 'Sıcak Yuva Hissi 🏠',
          message: 'Akşam sakinliğinde, size güven veren insanlar ve yerler için şükran duygularınızı hatırlayın.',
          color: theme.colors.tertiary,
        },
        {
          id: 'evening-4',
          icon: 'campfire',
          title: 'Akşam Sıcaklığı 🔥',
          message: 'Günün sona ermesiyle, içinizdeki minnettarlık ateşi daha da parlıyor.',
          color: theme.colors.primary,
        },
        {
          id: 'evening-5',
          icon: 'book-open',
          title: 'Günün Hikayesi 📖',
          message: 'Akşam saatleri, bugünün güzel sayfalarını yeniden okumak için ideal.',
          color: theme.colors.secondary,
        },
        {
          id: 'evening-6',
          icon: 'tea',
          title: 'Huzur Dolu Anlar ☕',
          message: 'Akşam çayı gibi, minnettarlık da ruhu ısıtır ve huzur verir.',
          color: theme.colors.tertiary,
        },
      ];
    }

    // Night inspirations
    return [
      {
        id: 'night-1',
        icon: 'weather-night',
        title: 'Gecenin Sessizliğinde 🌙',
        message: 'Gün sona erirken, bugün için minnettar olduğunuz anları düşünmek huzur verir.',
        color: theme.colors.primary,
      },
      {
        id: 'night-2',
        icon: 'star',
        title: 'Yıldızlar Gibi Parlayan Anılar ⭐',
        message: 'Her şükran, gecenin karanlığında parlayan bir yıldız gibidir.',
        color: theme.colors.secondary,
      },
      {
        id: 'night-3',
        icon: 'sleep',
        title: 'Huzurlu Gece Düşünceleri 😴',
        message: 'Uyku öncesi minnettarlık, ruhunuzu dinginleştirir ve güzel rüyalar getirir.',
        color: theme.colors.tertiary,
      },
      {
        id: 'night-4',
        icon: 'moon',
        title: 'Ayışığında Şükranlar 🌕',
        message: 'Ayın yumuşak ışığı gibi, minnettarlığınız da kalbinizi yumuşakça aydınlatır.',
        color: theme.colors.primary,
      },
      {
        id: 'night-5',
        icon: 'firefly',
        title: 'Ateş Böcekleri Gibi 🪲',
        message: 'Gece karanlığında, her şükran küçük bir ışık gibi umut saçar.',
        color: theme.colors.secondary,
      },
      {
        id: 'night-6',
        icon: 'owl',
        title: 'Bilgelik Saatleri 🦉',
        message: 'Gece sessizliğinde, minnettarlığın getirdiği bilgeliği hissedin.',
        color: theme.colors.tertiary,
      },
    ];
  };

  const inspirationItems = getAllInspirationItems();

  const renderInspirationItem = ({ item, index }: { item: InspirationItem; index: number }) => (
    <View style={[styles.itemContainer, { width: screenWidth }]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: currentIndex === index ? pulseAnim : 1 }] },
          ]}
        >
          <Icon 
            name={item.icon} 
            size={20} 
            color={item.color}
          />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      </View>
    </View>
  );

  const onScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  };

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
        density="comfortable"
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
          snapToInterval={screenWidth}
          snapToAlignment="center"
          decelerationRate="fast"
        />
        
        {/* Page indicators */}
        {inspirationItems.length > 1 && (
          <View style={styles.paginationContainer}>
            {inspirationItems.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: currentIndex === index 
                      ? theme.colors.primary 
                      : theme.colors.outline + '40',
                    transform: [{ scale: currentIndex === index ? 1.2 : 1 }],
                  }
                ]}
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
    },
    // Edge-to-edge inspiration card
    inspirationCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      overflow: 'hidden',
      ...getPrimaryShadow.card(theme),
    },
    itemContainer: {
      // Full width for edge-to-edge
    },
    content: {
      alignItems: 'center',
      position: 'relative',
      // Padding handled by density="comfortable"
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    textContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      letterSpacing: -0.1,
    },
    message: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      letterSpacing: 0.05,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
      // Vertical padding handled by card density
    },
    paginationDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
  });

export default DailyInspiration; 