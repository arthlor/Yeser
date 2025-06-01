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

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

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

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
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

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <View
        style={styles.slide}
        accessibilityLabel={`Onboarding ekranı ${index + 1}/${onboardingSlides.length}: ${item.title}`}
        accessibilityRole="none"
      >
        {item.icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={80}
              color={theme.colors.primary}
              accessibilityLabel={`${item.title} ikonu`}
            />
          </View>
        )}

        <Text style={styles.title} accessibilityRole="header">
          {item.title}
        </Text>

        <Text style={styles.description} accessibilityRole="text">
          {item.description}
        </Text>

        {item.privacyNote && (
          <ThemedCard
            variant="outlined"
            style={styles.privacyCard}
            accessibilityLabel={item.privacyNote}
          >
            <View style={styles.privacyContent}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={theme.colors.primary}
                style={styles.privacyIcon}
              />
              <Text style={styles.privacyNote}>{item.privacyNote}</Text>
            </View>
          </ThemedCard>
        )}

        {item.showButton && (
          <ThemedButton
            title="Hadi Başlayalım!"
            onPress={handleContinueToReminderSetup}
            variant="primary"
            style={styles.button}
            accessibilityLabel="Hatırlatıcı ayarlarına geç"
            accessibilityHint="Günlük hatırlatıcı ayarlarına gitmek için dokunun"
          />
        )}
      </View>
    ),
    [handleContinueToReminderSetup, styles, theme.colors.primary]
  );

  // Render a more accessible version for screen readers
  if (isScreenReaderEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.accessibleContent}>
          <Text style={styles.accessibleTitle}>
            {onboardingSlides[currentIndex].title}
          </Text>

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
              title={
                currentIndex === onboardingSlides.length - 1
                  ? 'Başla'
                  : 'Sonraki'
              }
              onPress={handleNext}
              variant="primary"
              style={styles.navigationButton}
              accessibilityLabel={
                currentIndex === onboardingSlides.length - 1
                  ? 'Başla'
                  : 'Sonraki ekrana git'
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
        keyExtractor={item => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        scrollEnabled={true}
        bounces={false}
        decelerationRate="fast"
        accessibilityRole="scrollbar"
      />

      <View style={styles.paginationContainer}>
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
            accessibilityLabel={`Sayfa ${index + 1}`}
            accessibilityRole="button"
            accessibilityHint={`${index + 1}. sayfaya git`}
          >
            <Animated.View
              style={[
                styles.paginationDot,
                currentIndex === index
                  ? styles.paginationDotActive
                  : styles.paginationDotInactive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.navigationContainer}>
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
            <Ionicons
              name="arrow-forward"
              size={24}
              color={theme.colors.onPrimary}
            />
          </TouchableOpacity>
        )}
      </View>
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
      paddingBottom: theme.spacing.large * 2,
      paddingTop: theme.spacing.large,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.large,
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
    },
    description: {
      ...theme.typography.body1,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      lineHeight: theme.typography.body1.lineHeight
        ? theme.typography.body1.lineHeight * 1.5
        : 24,
    },
    privacyCard: {
      marginTop: theme.spacing.medium,
      marginBottom: theme.spacing.large,
      width: '90%',
      padding: theme.spacing.small,
    },
    privacyContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    privacyIcon: {
      marginRight: theme.spacing.small,
    },
    privacyNote: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    button: {
      marginTop: theme.spacing.large,
      width: '80%',
      alignSelf: 'center',
    },
    paginationContainer: {
      position: 'absolute',
      bottom: theme.spacing.large * 2,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginHorizontal: theme.spacing.xs,
      marginVertical: theme.spacing.small,
    },
    paginationDotActive: {
      backgroundColor: theme.colors.primary,
      transform: [{ scale: 1.2 }],
    },
    paginationDotInactive: {
      backgroundColor: theme.colors.border,
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
      padding: theme.spacing.small,
    },
    skipButtonText: {
      ...theme.typography.button,
      color: theme.colors.textSecondary,
    },
    nextButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    // Accessible styles for screen readers
    accessibleContent: {
      flex: 1,
      padding: theme.spacing.large,
      justifyContent: 'center',
      alignItems: 'center',
    },
    accessibleTitle: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
    },
    accessibleDescription: {
      ...theme.typography.body1,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
    },
    accessiblePrivacyNote: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      padding: theme.spacing.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.large,
    },
  });

export default EnhancedOnboardingScreen;
