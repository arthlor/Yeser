import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';

import ThemedButton from '../../components/ThemedButton';
import ThemedCard from '../../components/ThemedCard';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';
import { RootStackParamList } from '../../types/navigation';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  icon?: string;
  privacyNote?: string;
  showButton?: boolean;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    key: '1',
    title: "Yeşer'e Hoş Geldin!",
    description:
      'Minnettarlık günlüğü tutmak, pozitifliği artırmanın ve genel refahını iyileştirmenin harika bir yoludur. Her gün birkaç dakikanı ayırarak hayatındaki güzel şeylere odaklan.',
    icon: 'leaf-outline',
  },
  {
    key: '2',
    title: 'Günlük Hatırlatıcılar',
    description:
      'Düzenli olarak minnettarlık pratiği yapmak için günlük hatırlatıcılar ayarlayabilirsin. Bu sayede alışkanlık haline getirmen daha kolay olacak.',
    icon: 'notifications-outline',
  },
  {
    key: '3',
    title: '✨ Anı Pırıltıları ✨',
    description:
      'Geçmişteki güzel anılarını yeniden keşfet! Yeşer, sana zaman zaman eski kayıtlarını hatırlatarak o günkü minnettarlığını tekrar yaşamanı sağlar.',
    icon: 'sparkles-outline',
    privacyNote: 'Günlüğün sana özeldir. Gizliliğine önem veriyoruz.',
    showButton: true,
  },
];

/**
 * EnhancedOnboardingScreen displays a multi-slide onboarding experience with
 * smooth animations, pagination, and accessibility features.
 */
const EnhancedOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();

    // Subscribe to screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Initial entrance animations
  useEffect(() => {
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animations.duration?.slow || 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: theme.animations.duration?.slow || 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 1,
          duration: theme.animations.duration?.normal || 400,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateEntrance();
  }, [fadeAnim, slideAnim, dotsAnim, theme.animations.duration]);

  const handleContinueToReminderSetup = useCallback(() => {
    navigation.navigate('OnboardingReminderSetup');
  }, [navigation]);

  const handleSkip = useCallback(() => {
    // Navigate to the last slide
    if (flatListRef.current && onboardingSlides.length > 0) {
      flatListRef.current.scrollToIndex({
        index: onboardingSlides.length - 1,
        animated: true,
      });
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < onboardingSlides.length - 1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else if (currentIndex === onboardingSlides.length - 1) {
      handleContinueToReminderSetup();
    }
  }, [currentIndex, handleContinueToReminderSetup]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <Animated.View
        style={[
          styles.slide,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        accessibilityLabel={`Onboarding ekranı ${index + 1}/${onboardingSlides.length}: ${item.title}`}
        accessibilityRole="none"
      >
        {item.icon && (
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.iconBackground}>
              <Ionicons
                name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={64}
                color={theme.colors.primary}
                accessibilityLabel={`${item.title} ikonu`}
              />
            </View>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 30],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>

          <Text style={styles.description} accessibilityRole="text">
            {item.description}
          </Text>

          {item.privacyNote && (
            <ThemedCard
              variant="elevated"
              elevation="sm"
              style={styles.privacyCard}
              accessibilityLabel={item.privacyNote}
            >
              <View style={styles.privacyContent}>
                <View style={styles.privacyIconContainer}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.privacyNote}>{item.privacyNote}</Text>
              </View>
            </ThemedCard>
          )}

          {item.showButton && (
            <ThemedButton
              title="Hadi Başlayalım! 🚀"
              onPress={handleContinueToReminderSetup}
              variant="primary"
              style={styles.primaryButton}
              accessibilityLabel="Hatırlatıcı ayarlarına geç"
              accessibilityHint="Günlük hatırlatıcı ayarlarına gitmek için dokunun"
            />
          )}
        </Animated.View>
      </Animated.View>
    ),
    [handleContinueToReminderSetup, styles, theme.colors.primary, fadeAnim, slideAnim]
  );

  // Render a more accessible version for screen readers
  if (isScreenReaderEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.accessibleContent}>
          <Text style={styles.accessibleTitle}>{onboardingSlides[currentIndex].title}</Text>

          <Text style={styles.accessibleDescription}>
            {onboardingSlides[currentIndex].description}
          </Text>

          {onboardingSlides[currentIndex].privacyNote && (
            <Text style={styles.accessiblePrivacyNote}>
              {onboardingSlides[currentIndex].privacyNote}
            </Text>
          )}

          <View style={styles.accessibleNavigation}>
            {currentIndex > 0 && (
              <ThemedButton
                title="Önceki"
                onPress={handlePrevious}
                variant="secondary"
                style={styles.navigationButton}
                accessibilityLabel="Önceki ekrana git"
              />
            )}

            <ThemedButton
              title={currentIndex === onboardingSlides.length - 1 ? 'Başla' : 'Sonraki'}
              onPress={handleNext}
              variant="primary"
              style={styles.navigationButton}
              accessibilityLabel={
                currentIndex === onboardingSlides.length - 1 ? 'Başla' : 'Sonraki ekrana git'
              }
            />
          </View>

          <Text style={styles.accessiblePagination}>
            {`Sayfa ${currentIndex + 1} / ${onboardingSlides.length}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingSlides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        scrollEnabled
        bounces={false}
        decelerationRate="fast"
        accessibilityRole="scrollbar"
      />

      <Animated.View
        style={[
          styles.paginationContainer,
          {
            opacity: dotsAnim,
            transform: [
              {
                translateY: dotsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {onboardingSlides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index,
                  animated: true,
                });
              }
            }}
            style={styles.paginationDotTouchable}
            accessibilityLabel={`Sayfa ${index + 1}`}
            accessibilityRole="button"
            accessibilityHint={`${index + 1}. sayfaya git`}
          >
            <Animated.View
              style={[
                styles.paginationDot,
                currentIndex === index ? styles.paginationDotActive : styles.paginationDotInactive,
                {
                  transform: [
                    {
                      scale: currentIndex === index ? 1.2 : 1,
                    },
                  ],
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.navigationContainer,
          {
            opacity: dotsAnim,
          },
        ]}
      >
        {currentIndex < onboardingSlides.length - 1 && (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityLabel="Atla"
            accessibilityRole="button"
            accessibilityHint="Onboarding'i atla ve son sayfaya git"
          >
            <Text style={styles.skipButtonText}>Atla</Text>
          </TouchableOpacity>
        )}

        {currentIndex < onboardingSlides.length - 1 && (
          <TouchableOpacity
            onPress={handleNext}
            style={styles.nextButton}
            accessibilityLabel="Sonraki"
            accessibilityRole="button"
            accessibilityHint="Sonraki sayfaya git"
          >
            <Ionicons name="arrow-forward" size={24} color={theme.colors.onPrimary} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flatList: {
      flex: 1,
    },
    slide: {
      width: screenWidth,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.large,
      paddingBottom: theme.spacing.large * 3,
      paddingTop: theme.spacing.xl,
    },
    iconContainer: {
      marginBottom: theme.spacing.xl,
    },
    iconBackground: {
      width: 120,
      height: 120,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.lg,
      shadowColor: theme.colors.primary,
    },
    contentContainer: {
      alignItems: 'center',
      width: '100%',
      maxWidth: 400,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      fontWeight: '700',
    },
    description: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 26,
      paddingHorizontal: theme.spacing.medium,
    },
    privacyCard: {
      marginBottom: theme.spacing.xl,
      width: '90%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
    },
    privacyContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.medium,
    },
    privacyIconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.medium,
    },
    privacyNote: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
      lineHeight: 20,
    },
    primaryButton: {
      width: '80%',
      paddingVertical: theme.spacing.medium + 2,
      borderRadius: theme.borderRadius.large,
      ...theme.elevation.md,
    },
    paginationContainer: {
      position: 'absolute',
      bottom: theme.spacing.large * 2.5,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationDotTouchable: {
      padding: theme.spacing.small,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: theme.borderRadius.full,
    },
    paginationDotActive: {
      backgroundColor: theme.colors.primary,
      width: 24,
      borderRadius: theme.borderRadius.full,
    },
    paginationDotInactive: {
      backgroundColor: theme.colors.outlineVariant,
    },
    navigationContainer: {
      position: 'absolute',
      bottom: theme.spacing.large,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.large,
    },
    skipButton: {
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.borderRadius.medium,
    },
    skipButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    nextButton: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.md,
      shadowColor: theme.colors.primary,
    },
    // Accessible styles for screen readers
    accessibleContent: {
      flex: 1,
      padding: theme.spacing.large,
      justifyContent: 'center',
      alignItems: 'center',
    },
    accessibleTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      fontWeight: '700',
    },
    accessibleDescription: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      lineHeight: 24,
    },
    accessiblePrivacyNote: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      padding: theme.spacing.medium,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.medium,
    },
    accessibleNavigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: theme.spacing.large,
    },
    navigationButton: {
      flex: 1,
      marginHorizontal: theme.spacing.small,
    },
    accessiblePagination: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.large,
    },
  });

export default EnhancedOnboardingScreen;
