import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';

const insightCardArtwork = require('@/assets/assets/card.png');

interface InsightTeaserCardProps {
  title: string;
  description: string;
  promise: string;
  ctaLabel: string;
  onPress: () => void;
  emoji?: string | null;
  meta?: string | null;
  isLoading?: boolean;
  lockedLabel?: string | null;
  onDismiss?: () => void;
  compact?: boolean;
  variant?: 'default' | 'reference';
}

const InsightTeaserCard: React.FC<InsightTeaserCardProps> = ({
  title,
  description,
  promise,
  ctaLabel,
  onPress,
  emoji,
  meta,
  isLoading = false,
  lockedLabel,
  onDismiss,
  compact = false,
  variant = 'default',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const isReference = variant === 'reference';

  if (isReference) {
    return (
      <View style={styles.referenceWrap}>
        <View style={styles.referenceAmbientGlow} />

        <TouchableOpacity
          activeOpacity={0.96}
          onPress={onPress}
          disabled={isLoading}
          style={styles.referenceCard}
        >
          <LinearGradient
            colors={
              theme.name === 'dark'
                ? [theme.colors.surface, '#1E293B', '#0F172A']
                : ['#FFFFFF', '#FDFBF7', '#F6F1EA']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Decorative Backglows */}
          <View pointerEvents="none" style={styles.refDecorativeBlob1} />
          <View pointerEvents="none" style={styles.refDecorativeBlob2} />

          {/* Hero Artwork Section */}
          <View style={styles.referenceHeroSection}>
            <View style={styles.referenceArtworkWrapper}>
              <Image
                source={insightCardArtwork}
                resizeMode="cover"
                style={styles.referenceArtwork}
              />
              <LinearGradient
                colors={
                  theme.name === 'dark'
                    ? ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.6)']
                    : ['rgba(255,255,255,0)', 'rgba(246,241,234,0.4)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            {/* Overlaid Top Row */}
            <View style={styles.referenceTopRowOverlay}>
              <View style={styles.referenceChipsRow}>
                <View style={styles.referenceEyebrowChip}>
                  <View style={styles.referenceEyebrowDot} />
                  <Text style={styles.referenceEyebrowText}>
                    {t('mood.analysis.label', 'INSIGHTS')}
                  </Text>
                </View>
                {lockedLabel ? (
                  <View style={styles.referenceLockedChip}>
                    <Icon name="lock-outline" size={12} color={theme.colors.primary} />
                    <Text style={styles.referenceLockedText}>{lockedLabel}</Text>
                  </View>
                ) : null}
              </View>

              {onDismiss ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close', 'Close')}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  onPress={onDismiss}
                  style={styles.referenceDismissButton}
                >
                  <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.referenceBodyContent}>
            <View style={styles.referenceTitleRow}>
              <Text style={styles.referenceEmoji}>{emoji || '✨'}</Text>
              <Text style={styles.referenceTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>

            <Text style={styles.referenceDescription} numberOfLines={3}>
              {description}
            </Text>

            <View style={styles.referenceFooterRow}>
              <View style={styles.referenceMetaArea}>
                {meta ? (
                  <View style={styles.referenceMetaRow}>
                    <Icon name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.referenceMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.referenceMetaRow}>
                    <Icon name="flash" size={14} color={theme.colors.primary} />
                    <Text style={styles.referenceMetaMuted}>{t('mood.analysis.subtitle')}</Text>
                  </View>
                )}
              </View>

              <View style={styles.referenceCtaContainer}>
                <View style={styles.referenceCtaChip}>
                  <Text style={styles.referenceCtaLabel}>
                    {isLoading
                      ? t('mood.analysis.status.analyzingTitle', 'Preparing your insight')
                      : ctaLabel}
                  </Text>
                  <Icon
                    name={isLoading ? 'progress-clock' : 'arrow-top-right'}
                    size={16}
                    color={theme.colors.onPrimary}
                  />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.ambientGlow} />

      <View style={styles.card}>
        <LinearGradient
          colors={[
            theme.colors.surface + 'F7',
            theme.colors.surface + 'FB',
            theme.colors.background + 'FB',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />

        <View style={styles.topRow}>
          <View style={styles.chipsRow}>
            <View style={styles.eyebrowChip}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>{t('mood.analysis.label', 'INSIGHTS')}</Text>
            </View>
            {lockedLabel ? (
              <View style={styles.lockedChip}>
                <Icon name="lock-outline" size={12} color={theme.colors.primary} />
                <Text style={styles.lockedText}>{lockedLabel}</Text>
              </View>
            ) : null}
          </View>

          {onDismiss ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={onDismiss}
              style={styles.dismissButton}
            >
              <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.storyRow}>
          <View style={styles.orbFrame}>
            <LinearGradient
              colors={[theme.colors.primary + '52', theme.colors.primary + '16']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbGradient}
            >
              <Text style={styles.emojiText}>{emoji || '✨'}</Text>
            </LinearGradient>
          </View>

          <View style={styles.copyColumn}>
            <Text style={styles.title} numberOfLines={compact ? 2 : undefined}>
              {title}
            </Text>
            <Text style={styles.promise}>{promise}</Text>
            <Text style={styles.description} numberOfLines={compact ? 3 : undefined}>
              {description}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.metaArea}>
            {meta ? (
              <View style={styles.metaRow}>
                <Icon
                  name="clock-time-four-outline"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              </View>
            ) : (
              <View style={styles.metaRow}>
                <Icon name="flash" size={14} color={theme.colors.primary} />
                <Text style={styles.metaMuted} numberOfLines={1}>
                  {t('mood.analysis.subtitle')}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ busy: isLoading, disabled: isLoading }}
            activeOpacity={0.9}
            onPress={onPress}
            disabled={isLoading}
            style={styles.ctaTouchable}
          >
            <View style={styles.ctaChip}>
              <Text style={styles.ctaLabel}>
                {isLoading
                  ? t('mood.analysis.status.analyzingTitle', 'Preparing your insight')
                  : ctaLabel}
              </Text>
              <Icon
                name={isLoading ? 'progress-clock' : 'arrow-top-right'}
                size={compact ? 14 : 15}
                color={theme.colors.primary}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme'], compact: boolean) => {
  const referenceRadius = compact ? 24 : 30;

  return StyleSheet.create({
    referenceWrap: {
      position: 'relative',
      borderRadius: referenceRadius,
      marginBottom: compact ? 16 : 24,
    },
    referenceAmbientGlow: {
      position: 'absolute',
      top: -5,
      left: -5,
      right: -5,
      bottom: -5,
      borderRadius: referenceRadius + 4,
      backgroundColor: theme.colors.primary + '0A',
      opacity: 0.8,
    },
    referenceCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: referenceRadius,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.2,
      borderColor: theme.colors.outline + '14',
      shadowColor: '#000',
      shadowOpacity: theme.name === 'dark' ? 0.4 : 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    referenceHeroSection: {
      height: compact ? 180 : 220,
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    },
    referenceArtworkWrapper: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surfaceVariant,
    },
    referenceArtwork: {
      width: '100%',
      height: '100%',
      opacity: 0.95,
    },
    referenceTopRowOverlay: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    },
    referenceChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    referenceEyebrowChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.name === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    referenceEyebrowDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    referenceEyebrowText: {
      ...theme.typography.labelSmall,
      color: theme.name === 'dark' ? '#FFFFFF' : theme.colors.primary,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    referenceLockedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.name === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: theme.name === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
    },
    referenceLockedText: {
      ...theme.typography.labelSmall,
      fontSize: 9,
      letterSpacing: 0.5,
      color: theme.name === 'dark' ? '#FFFFFF' : theme.colors.primary,
      fontWeight: '800',
    },
    referenceDismissButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.name === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    referenceBodyContent: {
      padding: compact ? 20 : 24,
      paddingTop: compact ? 16 : 20,
      gap: 12,
    },
    refDecorativeBlob1: {
      position: 'absolute',
      top: '40%',
      right: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.colors.primary + '08',
    },
    refDecorativeBlob2: {
      position: 'absolute',
      bottom: -30,
      left: -20,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.colors.secondary + '05',
    },
    referenceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    },
    referenceEmoji: {
      fontSize: compact ? 24 : 28,
    },
    referenceTitle: {
      flex: 1,
      ...(compact ? theme.typography.titleLarge : theme.typography.headlineSmall),
      color: theme.colors.onSurface,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      lineHeight: compact ? 30 : 36,
      letterSpacing: -0.5,
    },
    referenceDescription: {
      ...(compact ? theme.typography.bodySmall : theme.typography.bodyMedium),
      color: theme.colors.onSurfaceVariant,
      lineHeight: compact ? 20 : 24,
      opacity: 0.85,
      marginBottom: 12,
    },
    referenceFooterRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '18',
      gap: compact ? 12 : 16,
    },
    referenceMetaArea: {
      flex: 1,
      marginRight: compact ? 8 : 12,
    },
    referenceMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    referenceMeta: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    referenceMetaMuted: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      opacity: 0.8,
      fontWeight: '600',
    },
    referenceCtaContainer: {
      flexShrink: 0,
      minWidth: compact ? 110 : 130,
    },
    referenceCtaChip: {
      minHeight: compact ? 40 : 44,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: compact ? 14 : 18,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    referenceCtaLabel: {
      ...(compact ? theme.typography.labelMedium : theme.typography.labelLarge),
      color: theme.colors.onPrimary,
      fontWeight: '800',
      letterSpacing: 0.3,
      flexShrink: 1,
    },
    wrap: {
      position: 'relative',
      borderRadius: compact ? 24 : theme.borderRadius.xxl,
    },
    ambientGlow: {
      position: 'absolute',
      top: -6,
      left: -6,
      right: -6,
      bottom: -6,
      borderRadius: compact ? 28 : 36,
      backgroundColor: theme.colors.primary + '0D',
      opacity: 0.7,
    },
    card: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: compact ? 24 : 32,
      padding: compact ? theme.spacing.md : theme.spacing.lg,
      gap: compact ? theme.spacing.sm : theme.spacing.md,
      backgroundColor: theme.colors.surface + 'F2',
      borderWidth: 1,
      borderColor: theme.colors.outline + '24',
      shadowColor: theme.colors.background,
      shadowOpacity: 0.28,
      shadowRadius: compact ? 16 : 22,
      shadowOffset: { width: 0, height: compact ? 8 : 12 },
      elevation: compact ? 6 : 10,
    },
    glow: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: theme.colors.primary + '14',
    },
    glowTop: {
      width: compact ? 120 : 170,
      height: compact ? 120 : 170,
      top: compact ? -65 : -90,
      right: compact ? -35 : -45,
    },
    glowBottom: {
      width: compact ? 100 : 140,
      height: compact ? 100 : 140,
      bottom: compact ? -60 : -78,
      left: compact ? -24 : -28,
      backgroundColor: theme.colors.accent + '0D',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    eyebrowChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary + '14',
      borderRadius: theme.borderRadius.full || 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.colors.primary + '2A',
    },
    eyebrowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    eyebrowText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    lockedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.full || 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.colors.primary + '26',
    },
    lockedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    dismissButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: theme.colors.onSurface + '0C',
      borderWidth: 1,
      borderColor: theme.colors.outline + '1F',
    },
    storyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: compact ? theme.spacing.sm : theme.spacing.md,
    },
    orbFrame: {
      width: compact ? 48 : 58,
      height: compact ? 48 : 58,
      borderRadius: compact ? 24 : 29,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.colors.primary + '1F',
      backgroundColor: theme.colors.primary + '0A',
    },
    orbGradient: {
      width: '100%',
      height: '100%',
      borderRadius: compact ? 24 : 29,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: {
      fontSize: compact ? 22 : 28,
    },
    copyColumn: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...(compact ? theme.typography.titleMedium : theme.typography.titleLarge),
      color: theme.colors.onBackground,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      lineHeight: compact ? 27 : 33,
      letterSpacing: -0.2,
    },
    promise: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary + 'D6',
      fontStyle: 'italic',
      lineHeight: 19,
    },
    description: {
      ...(compact ? theme.typography.bodySmall : theme.typography.bodyMedium),
      color: theme.colors.onSurface,
      lineHeight: compact ? 20 : 23,
      opacity: 0.88,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginTop: compact ? theme.spacing.xs : theme.spacing.sm,
      paddingTop: compact ? theme.spacing.sm : theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '18',
    },
    metaArea: {
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    meta: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
    },
    metaMuted: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.9,
      flexShrink: 1,
    },
    ctaTouchable: {
      alignSelf: 'flex-end',
    },
    ctaChip: {
      minHeight: compact ? 34 : 36,
      borderRadius: theme.borderRadius.full || 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: compact ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.primary + '16',
      borderWidth: 1,
      borderColor: theme.colors.primary + '32',
    },
    ctaLabel: {
      ...(compact ? theme.typography.labelMedium : theme.typography.bodySmall),
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
};

export default InsightTeaserCard;
