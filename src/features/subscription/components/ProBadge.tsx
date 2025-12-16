import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';

interface ProBadgeProps {
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const ProBadge: React.FC<ProBadgeProps> = ({ size = 'small', style }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  // A golden gradient for "Pro" badge - colors defined inline in LinearGradient
  // for maximum contrast with white text.

  const isSmall = size === 'small';

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#FCC201', '#F5A623']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}
      >
        <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>
          {t('shared.ui.badges.pro', 'PRO')}
        </Text>
      </LinearGradient>
    </View>
  );
};

const createStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Container just to hold position
    },
    badge: {
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeSmall: {
      minWidth: 28,
    },
    badgeMedium: {
      minWidth: 36,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    text: {
      color: '#000000', // Black text on Gold usually looks best/premium
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    textSmall: {
      fontSize: 9,
    },
    textMedium: {
      fontSize: 11,
    },
  });
