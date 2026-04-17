import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface ActionCardsProps {
  currentCount: number;
  dailyGoal: number;
  onNavigateToEntry: () => void;
  onNavigateToPastEntries: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToWhyGratitude: () => void;
}

interface ActionRowProps {
  icon: string;
  iconBgColor: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showDivider?: boolean;
  accessibilityLabel?: string;
}

const ActionRow: React.FC<ActionRowProps> = React.memo(
  ({
    icon,
    iconBgColor,
    iconColor,
    title,
    subtitle,
    onPress,
    showDivider = true,
    accessibilityLabel,
  }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createRowStyles(theme), [theme]);

    return (
      <>
        <TouchableOpacity
          style={styles.row}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || (subtitle ? `${title}. ${subtitle}` : title)}
        >
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <Icon name="chevron-right" size={20} color={theme.colors.outline} />
        </TouchableOpacity>
        {showDivider && <View style={styles.divider} />}
      </>
    );
  }
);

ActionRow.displayName = 'ActionRow';

const ActionCards: React.FC<ActionCardsProps> = React.memo(
  ({
    currentCount,
    dailyGoal,
    onNavigateToEntry,
    onNavigateToPastEntries,
    onNavigateToCalendar,
    onNavigateToWhyGratitude,
  }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { t } = useTranslation();

    const showPrimaryAction = currentCount < dailyGoal;
    const primaryTitle =
      currentCount === 0 ? t('home.actions.start.title') : t('home.actions.progress.title');
    const primarySubtitle =
      currentCount === 0
        ? t('home.actions.start.subtitle')
        : t('home.actions.progress.subtitle', { remaining: dailyGoal - currentCount });

    return (
      <View style={styles.container}>
        {/* Primary Action - Continue/Start */}
        {showPrimaryAction && (
          <ActionRow
            icon={currentCount === 0 ? 'plus-circle' : 'heart-plus'}
            iconBgColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            title={primaryTitle}
            subtitle={primarySubtitle}
            onPress={onNavigateToEntry}
            accessibilityLabel={t('home.actions.start.a11y', {
              defaultValue: '{{title}}. {{subtitle}}',
              title: primaryTitle,
              subtitle: primarySubtitle,
            })}
          />
        )}

        {/* Past Entries */}
        <ActionRow
          icon="history"
          iconBgColor={theme.colors.primary + '15'}
          iconColor={theme.colors.primary}
          title={t('home.actions.past.title')}
          subtitle={t('home.actions.past.subtitle')}
          onPress={onNavigateToPastEntries}
          accessibilityLabel={t('home.actions.past.a11y', {
            defaultValue: '{{title}}. {{subtitle}}',
            title: t('home.actions.past.title'),
            subtitle: t('home.actions.past.subtitle'),
          })}
        />

        {/* Calendar */}
        <ActionRow
          icon="calendar-month"
          iconBgColor={theme.colors.secondary + '15'}
          iconColor={theme.colors.secondary}
          title={t('home.actions.calendar.title')}
          subtitle={t('home.actions.calendar.subtitle')}
          onPress={onNavigateToCalendar}
          accessibilityLabel={t('home.actions.calendar.a11y', {
            defaultValue: '{{title}}. {{subtitle}}',
            title: t('home.actions.calendar.title'),
            subtitle: t('home.actions.calendar.subtitle'),
          })}
        />

        {/* Why Gratitude */}
        <ActionRow
          icon="heart-outline"
          iconBgColor={theme.colors.tertiary + '15'}
          iconColor={theme.colors.tertiary}
          title={t('home.actions.why.title')}
          subtitle={t('home.actions.why.subtitle')}
          onPress={onNavigateToWhyGratitude}
          showDivider={false}
          accessibilityLabel={t('home.actions.why.a11y', {
            defaultValue: '{{title}}. {{subtitle}}',
            title: t('home.actions.why.title'),
            subtitle: t('home.actions.why.subtitle'),
          })}
        />
      </View>
    );
  }
);

ActionCards.displayName = 'ActionCards';

export default ActionCards;

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1.2,
      borderColor: theme.colors.outline + '14',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: theme.name === 'dark' ? 0.35 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  });

const createRowStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 3,
      opacity: 0.8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm, // Align with text
    },
  });
