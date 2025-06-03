import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { AppTheme } from '@/themes/types';

interface PastEntryItemProps {
  entry: GratitudeEntry;
  index: number;
  onPress: (entry: GratitudeEntry) => void;
}

const PastEntryItem: React.FC<PastEntryItemProps> = ({ entry, index, onPress }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const entryDate = entry.entry_date ? new Date(entry.entry_date) : new Date();
  const isRecent = index < 3;
  const statementCount = entry.statements?.length || 0;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    return formatDate(date);
  };

  const getDisplayContent = () => {
    if (!entry.statements || entry.statements.length === 0) {
      return 'Henüz bir şükran kaydı eklenmemiş.';
    }

    let content = entry.statements[0];
    if (content.length > 120) {
      content = content.substring(0, 120) + '...';
    }
    return content;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          onPress(entry);
        }}
        style={[styles.card, isRecent && styles.recentCard]}
        activeOpacity={0.6}
        accessibilityLabel={`Şükran kaydı: ${getRelativeDate(entryDate)}`}
        accessibilityHint="Detayları görüntülemek için dokunun"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dateSection}>
            <Text style={[styles.relativeDate, isRecent && styles.recentText]}>
              {getRelativeDate(entryDate)}
            </Text>
            <Text style={styles.fullDate}>{formatDate(entryDate)}</Text>
          </View>

          <View style={styles.headerActions}>
            {isRecent && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>YENİ</Text>
              </View>
            )}
            <Icon
              name="chevron-right"
              size={18}
              color={theme.colors.onSurfaceVariant}
              style={styles.chevronIcon}
            />
          </View>
        </View>

        {/* Content */}
        <Text style={styles.content} numberOfLines={3}>
          {getDisplayContent()}
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <Icon name="format-list-bulleted" size={14} color={theme.colors.primary} />
            <Text style={styles.statementCount}>
              {statementCount} {statementCount === 1 ? 'madde' : 'madde'}
            </Text>
          </View>

          <View style={styles.categoryTag}>
            <Icon name="heart" size={12} color={theme.colors.primary} />
            <Text style={styles.categoryText}>Minnet</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    recentCard: {
      borderColor: theme.colors.primary + '50',
      backgroundColor: theme.colors.primaryContainer + '15',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    dateSection: {
      flex: 1,
    },
    relativeDate: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      letterSpacing: -0.1,
      marginBottom: 2,
    },
    recentText: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    fullDate: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.1,
      opacity: 0.8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    newBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    newBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
    },
    chevronIcon: {
      opacity: 0.5,
    },
    content: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.colors.onSurface,
      lineHeight: 22,
      marginBottom: theme.spacing.lg,
      letterSpacing: 0.05,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    statementCount: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
      letterSpacing: 0.1,
    },
    categoryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '60',
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      gap: 4,
    },
    categoryText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.onPrimaryContainer,
      letterSpacing: 0.2,
    },
  });

export default PastEntryItem;
