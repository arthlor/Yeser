import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { enUS, es, tr } from 'date-fns/locale';

import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/store/languageStore';

interface ThrowbackEntryData {
  statements: string[];
  entry_date: string;
}

interface ThrowbackTeaserProps {
  throwbackEntry: ThrowbackEntryData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  onPress?: () => void;
}

const ThrowbackTeaser: React.FC<ThrowbackTeaserProps> = React.memo(
  ({ throwbackEntry, isLoading, error, onRefresh, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const language = useLanguageStore((state) => state.language);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const formattedDate = useMemo(() => {
      if (!throwbackEntry?.entry_date) {
        return '';
      }
      const getLocale = () => {
        switch (language) {
          case 'tr':
            return tr;
          case 'es':
            return es;
          default:
            return enUS;
        }
      };
      try {
        const date = parseISO(throwbackEntry.entry_date);
        return format(date, 'd MMM yyyy', { locale: getLocale() });
      } catch {
        return throwbackEntry.entry_date;
      }
    }, [throwbackEntry?.entry_date, language]);

    // Loading state
    if (isLoading) {
      return (
        <View style={styles.container}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{t('throwback.teaser.title')}</Text>
              <Text style={styles.subtitle}>{t('throwback.teaser.loading')}</Text>
            </View>
          </View>
        </View>
      );
    }

    // Error or empty state
    if (error || !throwbackEntry) {
      return (
        <TouchableOpacity style={styles.container} onPress={onRefresh} activeOpacity={0.7}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Icon name="history" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{t('throwback.teaser.title')}</Text>
              <Text style={styles.subtitle}>{t('throwback.teaser.placeholderSubtitle')}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.outline} />
          </View>
        </TouchableOpacity>
      );
    }

    // Main content
    const statement = throwbackEntry.statements?.[0] || '';

    return (
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        {/* Header Row */}
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Icon name="history" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{t('throwback.teaser.cardTitle')}</Text>
            <Text style={styles.subtitle}>{formattedDate}</Text>
          </View>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.refreshButton}>
              <Icon name="refresh" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Quote Row */}
        <View style={styles.quoteRow}>
          <Icon
            name="format-quote-open"
            size={16}
            color={theme.colors.outline}
            style={styles.quoteIcon}
          />
          <Text style={styles.quoteText} numberOfLines={2}>
            {statement}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

ThrowbackTeaser.displayName = 'ThrowbackTeaser';

export default ThrowbackTeaser;

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden',
    },
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
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    refreshButton: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
    },
    quoteRow: {
      flexDirection: 'row',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteIcon: {
      marginTop: 2,
    },
    quoteText: {
      flex: 1,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      lineHeight: 22,
    },
  });
