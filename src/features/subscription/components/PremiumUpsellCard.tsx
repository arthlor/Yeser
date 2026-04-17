import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { presentNativePaywall } from '@/features/subscription/presentPaywall';

interface Props {
  style?: ViewStyle;
}

export const PremiumUpsellCard: React.FC<Props> = ({ style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  const handlePress = () => {
    void presentNativePaywall('settings_upsell');
  };

  const isDarkTheme = theme.name === 'dark';

  // Refined mode-aware aesthetics
  const premiumGradient: [string, string] = isDarkTheme
    ? ['#1C1E26', '#0F1116'] // Deep Obsidian/Charcoal
    : ['#FFFFFF', '#F9F6F0']; // Soft Ivory/Paper

  const goldAccent = '#D4AF37'; // Classic Gold
  const goldLight = isDarkTheme ? '#FCE38A' : '#B8860B';
  const textPrimary = isDarkTheme ? '#FFFFFF' : '#1A1D24';
  const textSecondary = isDarkTheme ? '#A0A0A0' : '#5C6370';

  const features = [
    { key: 'unlimited', label: t('subscription.upsell.features.unlimited') },
    { key: 'past', label: t('subscription.upsell.features.past') },
    { key: 'insights', label: t('subscription.upsell.features.insights') },
    { key: 'export', label: t('subscription.upsell.features.export') },
    { key: 'prompts', label: t('subscription.upsell.features.prompts') },
    { key: 'aiCoach', label: t('subscription.upsell.features.aiCoach') },
    { key: 'aiChat', label: t('subscription.upsell.features.aiChat') },
    { key: 'moodEditing', label: t('subscription.upsell.features.moodEditing') },
  ];

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={[styles.container, style]}>
      <LinearGradient
        colors={premiumGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: goldAccent + (isDarkTheme ? '20' : '10') },
              ]}
            >
              <Icon name="crown" size={20} color={goldAccent} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: textPrimary }]}>
                {t('subscription.upsell.title', 'Upgrade to Premium')}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {t('subscription.upsell.subtitle', 'Unlock the full potential')}
              </Text>
            </View>
          </View>

          <View style={styles.featureGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={14} color={goldAccent} style={styles.checkIcon} />
                <Text style={[styles.featureText, { color: textSecondary }]}>{feature.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.ctaText, { color: goldLight }]}>
              {t('subscription.locked.aiCoach.cta', 'See Benefits')}
            </Text>
            <Icon name="chevron-right" size={18} color={goldLight} />
          </View>
        </View>

        {/* Subtle Decorative Elements */}
        <View style={[styles.glow, { backgroundColor: goldAccent }]} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      ...getPrimaryShadow.medium(theme),
      borderWidth: 1,
      borderColor: theme.name === 'dark' ? '#D4AF37' + '1A' : '#D4AF37' + '33',
    },
    gradient: {
      padding: theme.spacing.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    content: {
      zIndex: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.3,
      fontFamily: theme.typography.fontFamilyBold,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      opacity: 0.8,
    },
    featureGrid: {
      flexDirection: 'column',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start', // Align icon with the first line of text
      width: '100%',
      marginBottom: 2,
    },
    checkIcon: {
      marginRight: 8,
      marginTop: 2, // Slightly offset icon for better alignment with text
    },
    featureText: {
      fontSize: 13, // Slightly increased for better readability
      fontWeight: '500',
      flex: 1,
      lineHeight: 18,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.xs,
    },
    ctaText: {
      fontSize: 14,
      fontWeight: '700',
      marginRight: 4,
    },
    glow: {
      position: 'absolute',
      top: -100,
      right: -100,
      width: 200,
      height: 200,
      borderRadius: 100,
      opacity: theme.name === 'dark' ? 0.05 : 0.03,
      zIndex: 1,
    },
  });
