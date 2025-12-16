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

  const handlePress = () => {
    navigation.navigate('PaywallModal', { source: 'settings_upsell' });
  };

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={[styles.container, style]}>
      <LinearGradient
        // Dark premium gradient background
        colors={[theme.colors.primary, '#4A3AFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Icon name="crown" size={28} color="#FFD700" style={styles.icon} />
            <Text style={styles.title}>{t('subscription.upsell.title', 'Upgrade to Premium')}</Text>
          </View>

          <Text style={styles.subtitle}>
            {t('subscription.upsell.subtitle', 'Unlock the full potential:')}
          </Text>

          <View style={styles.featureList}>
            {[
              t('subscription.upsell.features.unlimited', 'Unlimited daily entries'),
              t('subscription.upsell.features.past', 'Add entries for past dates'),
              t('subscription.upsell.features.insights', 'Advanced mood analytics'),
              t('subscription.upsell.features.export', 'Export data to PDF'),
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#FFD700" style={styles.checkIcon} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <View style={styles.arrowContainer}>
              <Icon name="arrow-right" size={24} color="#FFF" />
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
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
      color: 'rgba(255, 255, 255, 0.95)',
      fontWeight: '500',
      lineHeight: 20,
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
      backgroundColor: 'rgba(255,255,255,0.2)',
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
      backgroundColor: 'rgba(255,255,255,0.1)',
      zIndex: 1,
    },
    circle2: {
      position: 'absolute',
      bottom: -50,
      left: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(255,255,255,0.05)',
      zIndex: 1,
    },
  });
