import * as React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';

// Fixed, share-safe palette. The share card renders the same on light and
// dark themes so the exported PNG looks identical for every user.
const INK = '#F8FAFC';
const INK_MUTED = 'rgba(248, 250, 252, 0.78)';
const INK_DIM = 'rgba(248, 250, 252, 0.58)';
const INK_HAIRLINE = 'rgba(248, 250, 252, 0.18)';
const INK_BADGE_BG = 'rgba(248, 250, 252, 0.10)';
const INK_BADGE_BORDER = 'rgba(248, 250, 252, 0.22)';
const INK_QUOTE = 'rgba(255, 255, 255, 0.96)';

const CARD_BASE_WIDTH = 340;

interface ThrowbackShareCardProps {
  dateLabel: string;
  statement: string;
}

interface StatementStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

const getStatementStyle = (length: number): StatementStyle => {
  if (length <= 80) {
    return { fontSize: 28, lineHeight: 38, letterSpacing: 0.1 };
  }
  if (length <= 140) {
    return { fontSize: 24, lineHeight: 34, letterSpacing: 0.1 };
  }
  if (length <= 200) {
    return { fontSize: 21, lineHeight: 30, letterSpacing: 0.15 };
  }
  if (length <= 260) {
    return { fontSize: 19, lineHeight: 28, letterSpacing: 0.15 };
  }
  if (length <= 360) {
    return { fontSize: 17, lineHeight: 25, letterSpacing: 0.2 };
  }
  if (length <= 560) {
    return { fontSize: 16, lineHeight: 24, letterSpacing: 0.15 };
  }
  if (length <= 820) {
    return { fontSize: 15, lineHeight: 23, letterSpacing: 0.1 };
  }
  return { fontSize: 14, lineHeight: 22, letterSpacing: 0 };
};

const normalizeThrowbackStatement = (value: string): string => value.replace(/\s+/g, ' ').trim();

const estimateCardHeight = (statement: string, statementStyle: StatementStyle): number => {
  const estimatedCharsPerLine = Math.max(18, Math.floor(320 / (statementStyle.fontSize * 0.54)));
  const estimatedLines = Math.max(1, Math.ceil(statement.length / estimatedCharsPerLine));
  const fixedChromeHeight = 166;
  const bodyHeight = estimatedLines * statementStyle.lineHeight + 56;
  return Math.max(425, fixedChromeHeight + bodyHeight);
};

const ThrowbackShareCard = React.forwardRef<View, ThrowbackShareCardProps>(
  ({ dateLabel, statement }, ref) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = createStyles(theme);

    const normalized = React.useMemo(() => {
      return normalizeThrowbackStatement(statement);
    }, [statement]);

    const statementStyle = React.useMemo(
      () => getStatementStyle(normalized.length),
      [normalized.length]
    );
    const cardMinHeight = React.useMemo(
      () => estimateCardHeight(normalized, statementStyle),
      [normalized, statementStyle]
    );

    const appLogo = require('@/assets/assets/icon.png');

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[styles.cardContainer, { minHeight: cardMinHeight }]}
      >
        <LinearGradient
          colors={['#0F1B2A', '#1F2540', '#2C1F3F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.header}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.eyebrow} numberOfLines={1}>
                {t('throwback.modal.shareEyebrow', { defaultValue: 'YEŞER THROWBACK' })}
              </Text>
            </View>
            <Text style={styles.date} numberOfLines={1}>
              {dateLabel}
            </Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.openQuote} accessible={false}>
              “
            </Text>
            <Text style={[styles.statement, statementStyle]} allowFontScaling={false}>
              {normalized}
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.divider} />
            <View style={styles.footerRow}>
              <View style={styles.footerBrand}>
                <View style={styles.footerMark}>
                  <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
                </View>
                <Text style={styles.brandText}>Yeşer</Text>
              </View>
              <Text style={styles.footerText} numberOfLines={1}>
                {t('throwback.modal.shareFooter', {
                  defaultValue: 'A gratitude memory worth revisiting.',
                })}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

ThrowbackShareCard.displayName = 'ThrowbackShareCard';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    cardContainer: {
      width: '100%',
      maxWidth: CARD_BASE_WIDTH,
      alignSelf: 'center',
      borderRadius: 24,
      overflow: 'hidden',
      ...getPrimaryShadow.card(theme),
    },
    card: {
      flex: 1,
      paddingTop: 22,
      paddingBottom: 20,
      paddingHorizontal: 22,
      justifyContent: 'space-between',
    },
    header: {
      gap: 10,
    },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: INK_BADGE_BG,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: INK_BADGE_BORDER,
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: INK,
    },
    eyebrow: {
      color: INK,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    date: {
      color: INK_MUTED,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 14,
    },
    openQuote: {
      color: INK_QUOTE,
      fontFamily: theme.typography.fontFamilySerifBold,
      fontSize: 56,
      lineHeight: 56,
      marginBottom: -14,
      opacity: 0.22,
    },
    statement: {
      color: INK,
      textAlign: 'left',
      fontFamily: theme.typography.fontFamilySerif || 'Lora-Regular',
      fontWeight: '500',
    },
    footer: {
      gap: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: INK_HAIRLINE,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerMark: {
      width: 26,
      height: 26,
      borderRadius: 7,
      overflow: 'hidden',
      backgroundColor: INK_BADGE_BG,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    brandText: {
      color: INK,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    footerText: {
      flexShrink: 1,
      textAlign: 'right',
      color: INK_DIM,
      fontSize: 11,
      letterSpacing: 0.1,
    },
  });

export default ThrowbackShareCard;
