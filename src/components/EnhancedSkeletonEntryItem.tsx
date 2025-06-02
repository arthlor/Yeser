import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';
import ThemedCard from './ThemedCard';

const SHIMMER_DURATION = 1500; // ms
const SHIMMER_WIDTH_PERCENTAGE = 0.5; // 50% of the card's width

/**
 * EnhancedSkeletonEntryItem provides an improved loading placeholder
 * for gratitude entry items with smoother animations and proper theming.
 */
const EnhancedSkeletonEntryItem: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [cardWidth, setCardWidth] = React.useState(0);

  const placeholderBackgroundColor = theme.colors.surfaceVariant;

  // Shimmer gradient colors - make them subtle
  const shimmerGradientColors = [
    placeholderBackgroundColor, // Start with the base color (transparent part of shimmer)
    theme.colors.surfaceVariant, // A slightly lighter, more opaque color for the shimmer highlight
    placeholderBackgroundColor, // End with the base color (transparent part of shimmer)
  ] as const;

  useEffect(() => {
    if (cardWidth === 0) return; // Don't start animation until width is known

    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: SHIMMER_DURATION,
        easing: Easing.linear,
        useNativeDriver: true, // Important for performance
      })
    );
    animation.start();
    return () => {
      animation.stop();
      animatedValue.setValue(0); // Reset on unmount
    };
  }, [animatedValue, cardWidth]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    // Shimmer moves from just off-screen left to just off-screen right
    // The shimmer itself has a width (e.g., SHIMMER_WIDTH_PERCENTAGE * cardWidth)
    // It needs to travel its own width + the card's width
    outputRange: [-cardWidth * SHIMMER_WIDTH_PERCENTAGE, cardWidth],
  });

  return (
    <ThemedCard
      variant="elevated"
      elevation="sm"
      contentPadding="md"
      style={styles.card}
      accessibilityLabel="Loading entry" // Accessibility improvement
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && cardWidth === 0) { // Set only once or if it changes significantly
          setCardWidth(width);
        }
      }}
    >
      <View style={styles.itemContainer}>
        {/* Placeholders - these remain static */}
        <View style={styles.headerContainer}>
          <View style={[styles.datePlaceholder, { backgroundColor: placeholderBackgroundColor }]} />
          <View style={[styles.iconPlaceholder, { backgroundColor: placeholderBackgroundColor }]} />
        </View>
        <View style={[styles.linePlaceholder, styles.line1, { backgroundColor: placeholderBackgroundColor }]} />
        <View style={[styles.linePlaceholder, styles.line2, { backgroundColor: placeholderBackgroundColor }]} />
        <View style={styles.footerContainer}>
          <View style={[styles.countPlaceholder, { backgroundColor: placeholderBackgroundColor }]} />
        </View>

        {/* Shimmer Overlay - only render if cardWidth is known */}
        {cardWidth > 0 && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                width: cardWidth * SHIMMER_WIDTH_PERCENTAGE,
                transform: [{ translateX }],
              },
            ]}
          >
            <LinearGradient
              colors={shimmerGradientColors}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0.5 }} // Gradient runs horizontally
              end={{ x: 1, y: 0.5 }}
            />
          </Animated.View>
        )}
      </View>
    </ThemedCard>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
      overflow: 'hidden', // Crucial for containing the shimmer
    },
    itemContainer: {
      width: '100%',
      // backgroundColor: theme.colors.surface, // Optional: if placeholders need to contrast more
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    datePlaceholder: {
      width: '40%',
      height: theme.typography.titleMedium.fontSize ?? 20, // Provide fallback
      borderRadius: theme.borderRadius.sm,
    },
    iconPlaceholder: {
      width: 20,
      height: 20,
      borderRadius: 10, // Make it a circle
    },
    linePlaceholder: {
      // width: '100%', // Set individually for variance
      height: theme.typography.bodyMedium.fontSize ?? 16, // Provide fallback
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    line1: {
      width: '95%',
    },
    line2: {
      width: '75%',
    },
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.xs,
    },
    countPlaceholder: {
      width: '20%',
      height: theme.typography.labelSmall.fontSize ?? 12, // Provide fallback
      borderRadius: theme.borderRadius.sm,
    },
    // Shimmer styles
    shimmerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0, // Makes it full height
      // Width is set dynamically
      opacity: 0.6, // Adjust opacity for subtlety
    },
  });

export default EnhancedSkeletonEntryItem;