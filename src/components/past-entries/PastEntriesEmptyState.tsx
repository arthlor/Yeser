import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

interface PastEntriesEmptyStateProps {}

/**
 * Enhanced Past Entries Empty State with Edge-to-Edge Design
 *
 * DESIGN PHILOSOPHY:
 * 1. INSPIRATION ZONE: Edge-to-edge inspiring empty state with comprehensive guidance
 * 2. VISUAL DEPTH: Enhanced shadows and elevation for modern feel
 * 3. ONBOARDING GUIDANCE: Clear step-by-step instructions and benefits
 * 4. TYPOGRAPHY HIERARCHY: Consistent with established design system
 *
 * UX ENHANCEMENTS:
 * - Edge-to-edge card design with proper spacing
 * - Enhanced illustration with sparkling effects
 * - Better visual hierarchy and guidance flow
 * - Improved motivational content and benefits showcase
 */
const PastEntriesEmptyState: React.FC<PastEntriesEmptyStateProps> = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.emptyZone}>
      <ThemedCard
        variant="outlined"
        density="comfortable"
        elevation="card"
        style={styles.emptyCard}
      >
        <View style={styles.emptyContent}>
          {/* Enhanced Illustration Container */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationBackground}>
              <Icon name="book-outline" size={72} color={theme.colors.primary + '60'} />
            </View>
            <View style={styles.sparkleContainer}>
              <Icon
                name="star-outline"
                size={20}
                color={theme.colors.primary + '40'}
                style={styles.sparkle1}
              />
              <Icon
                name="star-outline"
                size={16}
                color={theme.colors.primary + '40'}
                style={styles.sparkle2}
              />
              <Icon
                name="star-outline"
                size={14}
                color={theme.colors.primary + '40'}
                style={styles.sparkle3}
              />
              <Icon
                name="star-outline"
                size={12}
                color={theme.colors.primary + '40'}
                style={styles.sparkle4}
              />
            </View>
          </View>

          {/* Enhanced Main Content */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Minnet yolculuğuna başla</Text>
            <Text style={styles.description}>
              İlk minnet kaydını oluşturup hayatındaki güzel anları keşfetmeye başla. Her gün küçük
              mutlulukları fark etmek seni daha pozitif kılacak.
            </Text>
          </View>

          {/* Enhanced Step-by-Step Guidance */}
          <View style={styles.guidanceSection}>
            <View style={styles.guidanceHeader}>
              <Icon name="map-marker-path" size={20} color={theme.colors.primary} />
              <Text style={styles.guidanceTitle}>Nasıl Başlarım?</Text>
            </View>

            <View style={styles.stepsContainer}>
              <View style={styles.guidanceItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Günlük kayıt sayfasına git</Text>
                  <Text style={styles.stepDescription}>
                    Alt menüden "Günlük Kayıt" sekmesine dokun
                  </Text>
                </View>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.guidanceItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Minnettarlıklarını yaz</Text>
                  <Text style={styles.stepDescription}>Bugün için şükrettiğin 3 şeyi paylaş</Text>
                </View>
              </View>

              <View style={styles.stepConnector} />

              <View style={styles.guidanceItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>İlerlemeni takip et</Text>
                  <Text style={styles.stepDescription}>
                    Gelişimini izle ve günlük hedefine ulaş
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Enhanced Benefits Showcase */}
          <View style={styles.benefitsSection}>
            <View style={styles.benefitsHeader}>
              <Icon name="gift-outline" size={20} color={theme.colors.success} />
              <Text style={styles.benefitsTitle}>Faydaları</Text>
            </View>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Icon name="heart" size={16} color={theme.colors.error} />
                </View>
                <Text style={styles.benefitText}>Mutluluk artışı</Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Icon name="brain" size={16} color={theme.colors.info} />
                </View>
                <Text style={styles.benefitText}>Pozitif bakış</Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Icon name="trending-up" size={16} color={theme.colors.success} />
                </View>
                <Text style={styles.benefitText}>Kişisel gelişim</Text>
              </View>
            </View>
          </View>

          {/* Enhanced Motivation Quote */}
          <View style={styles.motivationSection}>
            <Icon name="format-quote-open" size={24} color={theme.colors.primary + '60'} />
            <Text style={styles.motivationQuote}>
              "Minnettarlık, sahip olduklarımızı{'\n'}yeterli kılan büyülü bir anahtardır."
            </Text>
            <Text style={styles.motivationAuthor}>— Oprah Winfrey</Text>
          </View>
        </View>
      </ThemedCard>

      {/* Enhanced Tip Section */}
      <View style={styles.tipSection}>
        <View style={styles.tipCard}>
          <View style={styles.tipIconContainer}>
            <Icon name="lightbulb-on" size={18} color={theme.colors.warning} />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>💡 Bilimsel Gerçek</Text>
            <Text style={styles.tipText}>
              Günde 3 minnet kaydı tutmak, 8 hafta sonunda %25 mutluluk artışı sağlar!
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-Edge Empty Zone
    emptyZone: {
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    emptyCard: {
      borderRadius: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.outline + '30',
      backgroundColor: theme.colors.surface + '80',
      ...getPrimaryShadow.card(theme),
    },
    emptyContent: {
      alignItems: 'center',
      // Padding handled by density="comfortable"
    },

    // Enhanced Illustration
    illustrationContainer: {
      position: 'relative',
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    illustrationBackground: {
      width: 140,
      height: 140,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer + '20',
      borderWidth: 3,
      borderColor: theme.colors.primary + '30',
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sparkleContainer: {
      position: 'absolute',
      width: 180,
      height: 180,
    },
    sparkle1: {
      position: 'absolute',
      top: 20,
      right: 30,
    },
    sparkle2: {
      position: 'absolute',
      bottom: 30,
      left: 25,
    },
    sparkle3: {
      position: 'absolute',
      top: 45,
      left: 15,
    },
    sparkle4: {
      position: 'absolute',
      bottom: 50,
      right: 20,
    },

    // Enhanced Header Section
    headerSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    title: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: theme.spacing.md,
    },
    description: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      letterSpacing: 0.1,
    },

    // Enhanced Guidance Section
    guidanceSection: {
      width: '100%',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    guidanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    guidanceTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    stepsContainer: {
      alignItems: 'center',
    },
    guidanceItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: 320,
      gap: theme.spacing.md,
    },
    stepBadge: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    stepText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
      fontWeight: '800',
    },
    stepContent: {
      flex: 1,
      paddingTop: theme.spacing.xs,
    },
    stepTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    stepDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    stepConnector: {
      width: 2,
      height: theme.spacing.md,
      backgroundColor: theme.colors.outline + '30',
      marginLeft: 15,
      marginVertical: theme.spacing.xs,
    },

    // Enhanced Benefits Section
    benefitsSection: {
      width: '100%',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    benefitsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    benefitsTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    benefitsList: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    benefitItem: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      flex: 1,
    },
    benefitIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    benefitText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500',
    },

    // Enhanced Motivation Section
    motivationSection: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '15',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      marginBottom: theme.spacing.lg,
    },
    motivationQuote: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 24,
      marginVertical: theme.spacing.md,
    },
    motivationAuthor: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },

    // Enhanced Tip Section
    tipSection: {
      paddingTop: theme.spacing.lg,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warningContainer + '20',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.warning + '30',
      ...getPrimaryShadow.small(theme),
    },
    tipIconContainer: {
      backgroundColor: theme.colors.warningContainer,
      borderRadius: theme.borderRadius.full,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    tipText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
      fontWeight: '500',
    },
  });

export default PastEntriesEmptyState;
