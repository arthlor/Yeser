import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { RootStackParamList } from '@/types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  style?: ViewStyle;
}

export const PremiumUpsellCard: React.FC<Props> = ({ style }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const highlightedFeatures = new Set(['prompts', 'moodEditing']);

  const handlePress = () => {
    navigation.navigate('PaywallModal', { source: 'settings_upsell' });
  };

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={[styles.container, style]}>
      <LinearGradient
        // Dark premium gradient background
        colors={[theme.colors.primary, theme.colors.primaryVariant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Icon
              name="crown"
              size={28}
              color={theme.colors.accent || '#FFD700'}
              style={styles.icon}
            />
            <Text style={styles.title}>{t('subscription.upsell.title', 'Upgrade to Premium')}</Text>
          </View>

          <Text style={styles.subtitle}>
            {t('subscription.upsell.subtitle', 'Unlock the full potential:')}
          </Text>

          <View style={styles.featureList}>
            {[
              { key: 'unlimited', label: t('subscription.upsell.features.unlimited') },
              { key: 'past', label: t('subscription.upsell.features.past') },
              { key: 'insights', label: t('subscription.upsell.features.insights') },
              { key: 'export', label: t('subscription.upsell.features.export') },
              { key: 'prompts', label: t('subscription.upsell.features.prompts') },
              { key: 'aiCoach', label: t('subscription.upsell.features.aiCoach') },
              { key: 'aiChat', label: t('subscription.upsell.features.aiChat') },
              { key: 'moodEditing', label: t('subscription.upsell.features.moodEditing') },
            ].map((feature, index) => {
              const isHighlight = highlightedFeatures.has(feature.key);
              return (
                <View key={index} style={styles.featureItem}>
                  <Icon
                    name={isHighlight ? 'star-four-points' : 'check-circle'}
                    size={16}
                    color={theme.colors.accent || '#FFD700'}
                    style={styles.checkIcon}
                  />
                  <Text style={[styles.featureText, isHighlight && styles.featureTextHighlight]}>
                    {feature.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.ctaRow}>
            <View style={styles.arrowContainer}>
              <Icon name="arrow-right" size={24} color={theme.colors.onPrimary} />
            </View>
          </View>
        </View>

        {/* Decorative Circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
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
      marginBottom: theme.spacing.sm,
    },
    icon: {
      marginRight: theme.spacing.sm,
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.onPrimary + 'E6', // 0.9 opacity
      marginBottom: theme.spacing.md,
      fontWeight: '600',
    },
    featureList: {
      marginTop: theme.spacing.xs,
      gap: 8,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkIcon: {
      marginRight: 8,
      marginTop: 1,
    },
    featureText: {
      fontSize: 14,
      color: theme.colors.onPrimary + 'F2', // 0.95 opacity
      fontWeight: '500',
      lineHeight: 20,
    },
    featureTextHighlight: {
      fontWeight: '700',
      color: theme.colors.onPrimary,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.md,
    },
    arrowContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.onPrimary + '33', // 0.2 opacity
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Decorative
    circle1: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.onPrimary + '1A', // 0.1 opacity
      zIndex: 1,
    },
    circle2: {
      position: 'absolute',
      bottom: -50,
      left: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.colors.onPrimary + '0D', // 0.05 opacity
      zIndex: 1,
    },
  });
