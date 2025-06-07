import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, List, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeStore } from '@/store/themeStore';
import type { AppTheme } from '@/themes/types';
import type { BenefitCardProps } from '@/features/whyGratitude/types';

export const BenefitCard: React.FC<BenefitCardProps> = React.memo(
  ({ icon, title, description, stat, index, initialExpanded = false, testID }) => {
    const { activeTheme } = useThemeStore();
    const paperTheme = useTheme();
    const [expanded, setExpanded] = React.useState(initialExpanded);

    // Memoize expensive calculations
    const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);
    const animationDelay = useMemo(() => index * 100, [index]);
    const rippleColor = useMemo(
      () => `${activeTheme.colors.primary}20`,
      [activeTheme.colors.primary]
    );

    // Memoize event handlers
    const handlePress = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const leftIconRenderer = useCallback(
      (props: Record<string, unknown>) => (
        <List.Icon {...props} icon={icon} color={activeTheme.colors.primary} />
      ),
      [icon, activeTheme.colors.primary]
    );

    return (
      <Animated.View entering={FadeInUp.delay(animationDelay).duration(600)} testID={testID}>
        <Card
          style={styles.card}
          accessible={true}
          accessibilityLabel={`${title} kartı`}
          accessibilityHint={expanded ? 'Daraltmak için dokunun' : 'Genişletmek için dokunun'}
        >
          <List.Accordion
            title={title}
            titleStyle={[styles.title, { color: activeTheme.colors.text }]}
            left={leftIconRenderer}
            expanded={expanded}
            onPress={handlePress}
            style={styles.accordion}
            theme={{ ...paperTheme, colors: { background: 'transparent' } }}
            rippleColor={rippleColor}
          >
            <Card.Content style={styles.content}>
              <Text style={styles.description} accessibilityLabel={`Açıklama: ${description}`}>
                {description}
              </Text>
              {stat && (
                <View
                  style={styles.statContainer}
                  accessible={true}
                  accessibilityLabel={`İstatistik: ${stat}`}
                >
                  <List.Icon
                    icon="chart-line-variant"
                    color={activeTheme.colors.accent}
                    style={styles.statIcon}
                  />
                  <Text style={styles.statText}>{stat}</Text>
                </View>
              )}
            </Card.Content>
          </List.Accordion>
        </Card>
      </Animated.View>
    );
  }
);

BenefitCard.displayName = 'BenefitCard';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      marginVertical: theme.spacing.sm,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderRadius: theme.borderRadius.large,
    },
    accordion: {
      paddingVertical: 0,
      minHeight: 56, // Accessibility touch target
    },
    content: {
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontWeight: 'bold',
      fontSize: 16,
      lineHeight: 24,
    },
    description: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      paddingTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    statContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      backgroundColor: `${theme.colors.accent}1A`,
      padding: theme.spacing.sm,
      marginHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      minHeight: 44, // Accessibility touch target
    },
    statIcon: {
      margin: 0,
      marginRight: theme.spacing.sm,
    },
    statText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.accent,
      fontWeight: '600',
      flex: 1,
    },
  });
