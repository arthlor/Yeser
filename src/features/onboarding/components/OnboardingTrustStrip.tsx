import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

type TrustItem = {
  icon: keyof typeof Feather.glyphMap;
  labelKey: string;
};

interface OnboardingTrustStripProps {
  items?: TrustItem[];
}

const DEFAULT_ITEMS: TrustItem[] = [
  { icon: 'shield', labelKey: 'onboarding.trust.privateByDefault' },
  { icon: 'heart', labelKey: 'onboarding.trust.freeToStart' },
  { icon: 'clock', labelKey: 'onboarding.trust.twoMinutes' },
];

/**
 * Small inline row of reassurance chips. Designed to be unobtrusive but
 * visible at the point of commitment (CTA area) to reduce hesitation.
 */
export const OnboardingTrustStrip: React.FC<OnboardingTrustStripProps> = ({
  items = DEFAULT_ITEMS,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.labelKey} style={styles.chip}>
          <Feather name={item.icon} size={12} color={theme.colors.primary} />
          <Text style={styles.chipText} numberOfLines={1}>
            {t(item.labelKey)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '12',
    },
    chipText: {
      ...theme.typography.labelSmall,
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.2,
    },
  });

export default OnboardingTrustStrip;
