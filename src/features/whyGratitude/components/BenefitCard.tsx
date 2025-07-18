import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, List, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
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

    const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);
    const animationDelay = useMemo(() => index * 100, [index]);

    const memoizedTheme = useMemo(
      () => ({ ...paperTheme, colors: { background: 'transparent' } }),
      [paperTheme]
    );

    const rippleColor = useMemo(
      () => `${activeTheme.colors.primary}20`,
      [activeTheme.colors.primary]
    );

    const gradients = useMemo(
      () => ({
        icon: [activeTheme.colors.primary, activeTheme.colors.primaryVariant] as const,
        cta: [activeTheme.colors.primary, activeTheme.colors.primaryVariant] as const,
      }),
      [activeTheme.colors.primary, activeTheme.colors.primaryVariant]
    );

    const handlePress = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const handleCtaPress = useCallback(() => {
      if (ctaPrompt && onCtaPress) {
        onCtaPress(ctaPrompt);
      }
    }, [ctaPrompt, onCtaPress]);

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
      [icon, activeTheme.colors.onPrimary, gradients.icon, styles]
    );

    return (
      <Animated.View
        entering={FadeInUp.delay(animationDelay).duration(500)}
        style={styles.cardShadowWrapper}
        testID={testID}
      >
        <Card style={styles.card}>
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
                <Text style={styles.description}>{description}</Text>
                {stat && (
                  <View style={styles.statContainer}>
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
                    <TouchableOpacity onPress={handleCtaPress}>
                      <LinearGradient colors={gradients.cta} style={styles.ctaButtonGradient}>
                        <Button
                          mode="contained"
                          style={styles.ctaButton}
                          labelStyle={styles.ctaButtonLabel}
                          contentStyle={styles.ctaButtonContent}
                          buttonColor="transparent"
                          textColor={activeTheme.colors.onPrimary}
                          icon="pencil-outline"
                        >
                          Bu Konu Hakkında Yaz
                        </Button>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </Card.Content>
            </List.Accordion>
          </View>
        </Card>
      </Animated.View>
    );
  }
);

BenefitCard.displayName = 'BenefitCard';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardShadowWrapper: {
      borderRadius: theme.borderRadius.xl,
      ...theme.elevation.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    cardContentWrapper: {
      overflow: 'hidden',
      borderRadius: theme.borderRadius.xl,
    },
    accordion: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      minHeight: 64,
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
      minHeight: 52,
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
