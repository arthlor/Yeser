import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeStore } from '@/store/themeStore';
import type { AppTheme } from '@/themes/types';
import type { BenefitCardProps } from '@/features/whyGratitude/types';

export const BenefitCard: React.FC<BenefitCardProps> = React.memo(
  ({
    icon,
    title,
    description,
    stat,
    ctaPrompt,
    index,
    initialExpanded = false,
    testID,
    onCtaPress,
  }) => {
    const { activeTheme } = useThemeStore();
    const paperTheme = useTheme();
    const [expanded, setExpanded] = React.useState(initialExpanded);

    // ✅ PERFORMANCE FIX: Reduce animation complexity - use simpler scale animation
    const scale = useSharedValue(1);

    // ✅ PERFORMANCE FIX: Memoize all theme-dependent calculations
    const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);
    const animationDelay = useMemo(() => index * 150, [index]);

    // ✅ PERFORMANCE FIX: Memoize theme objects to prevent recreation
    const memoizedTheme = useMemo(
      () => ({ ...paperTheme, colors: { background: 'transparent' } }),
      [paperTheme]
    );

    const rippleColor = useMemo(
      () => `${activeTheme.colors.primary}15`,
      [activeTheme.colors.primary]
    );

    // ✅ PERFORMANCE FIX: Memoize gradient arrays
    const gradients = useMemo(
      () => ({
        icon: [activeTheme.colors.primary, activeTheme.colors.primaryVariant] as const,
        cta: [activeTheme.colors.primary, activeTheme.colors.primaryVariant] as const,
      }),
      [activeTheme.colors.primary, activeTheme.colors.primaryVariant]
    );

    // ✅ PERFORMANCE FIX: Simplified animation style
    const animatedCardStyle = useAnimatedStyle(
      () => ({
        transform: [{ scale: scale.value }],
      }),
      []
    );

    // ✅ PERFORMANCE FIX: Optimized event handlers
    const handlePress = useCallback(() => {
      setExpanded((prev) => !prev);

      // Simplified spring animation
      scale.value = withSpring(0.98, { duration: 100 }, () => {
        scale.value = withSpring(1, { duration: 150 });
      });
    }, [scale]);

    const handleCtaPress = useCallback(() => {
      if (ctaPrompt && onCtaPress) {
        onCtaPress(ctaPrompt);
      }
    }, [ctaPrompt, onCtaPress]);

    // ✅ PERFORMANCE FIX: Memoize icon component to prevent recreation
    const leftIconRenderer = useCallback(
      (_props: Record<string, unknown>) => (
        <View style={styles.iconContainer}>
          <LinearGradient colors={gradients.icon} style={styles.iconBackground}>
            <MaterialCommunityIcons
              name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={24}
              color={activeTheme.colors.onPrimary}
            />
          </LinearGradient>
        </View>
      ),
      [
        icon,
        activeTheme.colors.onPrimary,
        gradients.icon,
        styles.iconContainer,
        styles.iconBackground,
      ]
    );

    return (
      <View testID={testID}>
        <Animated.View
          entering={FadeInUp.delay(animationDelay).duration(700)}
          style={animatedCardStyle}
        >
          <View style={styles.cardShadowWrapper}>
            <Card
              style={styles.card}
              accessible={true}
              accessibilityLabel={`${title} kartı`}
              accessibilityHint={expanded ? 'Daraltmak için dokunun' : 'Genişletmek için dokunun'}
            >
              <View style={styles.cardContentWrapper}>
                <List.Accordion
                  title={title}
                  titleStyle={styles.title}
                  titleNumberOfLines={2}
                  left={leftIconRenderer}
                  expanded={expanded}
                  onPress={handlePress}
                  style={styles.accordion}
                  theme={memoizedTheme}
                  rippleColor={rippleColor}
                >
                  <Card.Content style={styles.content}>
                    <Text
                      style={styles.description}
                      accessibilityLabel={`Açıklama: ${description}`}
                    >
                      {description}
                    </Text>
                    {stat && (
                      <View
                        style={styles.statContainer}
                        accessible={true}
                        accessibilityLabel={`İstatistik: ${stat}`}
                      >
                        <View style={styles.statBackground}>
                          <MaterialCommunityIcons
                            name="chart-line-variant"
                            size={20}
                            color={activeTheme.colors.accent}
                            style={styles.statIcon}
                          />
                          <Text style={styles.statText}>{stat}</Text>
                        </View>
                      </View>
                    )}

                    {ctaPrompt && (
                      <View style={styles.ctaContainer}>
                        <Text style={styles.ctaPromptText}>💭 "{ctaPrompt}"</Text>
                        <LinearGradient colors={gradients.cta} style={styles.ctaButtonGradient}>
                          <Button
                            mode="contained"
                            onPress={handleCtaPress}
                            style={styles.ctaButton}
                            labelStyle={styles.ctaButtonLabel}
                            contentStyle={styles.ctaButtonContent}
                            buttonColor="transparent"
                            textColor={activeTheme.colors.onPrimary}
                            icon="pencil-outline"
                            accessibilityLabel={`Bu konu hakkında yaz: ${ctaPrompt}`}
                            accessibilityHint="Günlük yazma ekranına gider"
                          >
                            Bu Konu Hakkında Yaz
                          </Button>
                        </LinearGradient>
                      </View>
                    )}
                  </Card.Content>
                </List.Accordion>
              </View>
            </Card>
          </View>
        </Animated.View>
      </View>
    );
  }
);

BenefitCard.displayName = 'BenefitCard';

// ✅ PERFORMANCE FIX: Pure StyleSheet.create with no dynamic values
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadowWrapper: {
      // Shadow wrapper - handles shadows without overflow issues
      borderRadius: theme.borderRadius.xl,
      ...theme.elevation.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      // No overflow or shadow here to avoid conflicts
    },
    cardContentWrapper: {
      // Content wrapper - handles overflow clipping
      overflow: 'hidden',
      borderRadius: theme.borderRadius.xl,
    },
    accordion: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      minHeight: 64, // Enhanced accessibility touch target
      backgroundColor: theme.colors.surface,
    },
    iconContainer: {
      marginRight: theme.spacing.sm,
    },
    iconBackground: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.sm,
    },
    content: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    title: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      lineHeight: 22,
      flex: 1,
    },
    description: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 22,
      marginBottom: theme.spacing.md,
      opacity: 0.9,
    },
    statContainer: {
      marginTop: theme.spacing.sm,
    },
    statBackground: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.large,
      backgroundColor: `${theme.colors.accent}15`,
      minHeight: 52, // Enhanced accessibility touch target
    },
    statIcon: {
      marginRight: theme.spacing.md,
    },
    statText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.accent,
      fontWeight: '600',
      flex: 1,
      lineHeight: 20,
    },
    ctaContainer: {
      marginTop: theme.spacing.lg,
    },
    ctaPromptText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      lineHeight: 20,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      textAlign: 'center',
      opacity: 0.9,
    },
    ctaButtonGradient: {
      borderRadius: theme.borderRadius.full,
      ...theme.elevation.sm,
    },
    ctaButton: {
      borderRadius: theme.borderRadius.full,
      minHeight: 44,
    },
    ctaButtonContent: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    ctaButtonLabel: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.25,
    },
  });
