import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import { AIUsageIndicator } from './AIUsageIndicator';
import { useCoachPrompt } from '@/features/gratitude/hooks/useCoachPrompt';
import { useLanguageStore } from '@/store/languageStore';
import { useSubscription } from '@/hooks/useSubscription';
import { hapticFeedback } from '@/utils/hapticFeedback';

type FocusArea = 'relationships' | 'growth' | 'nature' | 'health' | 'achievements' | 'general';

const FOCUS_ICONS: Record<FocusArea, string> = {
  relationships: 'heart-outline',
  growth: 'trending-up',
  nature: 'leaf',
  health: 'heart-pulse',
  achievements: 'trophy-outline',
  general: 'lightbulb-outline',
};

interface AICoachPromptProps {
  recentEntries?: string[];
  onSelectPrompt?: (prompt: string) => void;
  style?: ViewStyle;
}

/**
 * AI Coach Prompt component that generates personalized gratitude prompts.
 * PRO only - displays a collapsible card with focus areas.
 */
export const AICoachPrompt: React.FC<AICoachPromptProps> = ({
  recentEntries = [],
  onSelectPrompt,
  style,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isPro, checkGate } = useSubscription();
  const language = useLanguageStore((state) => state.language);

  const { coachPrompt, isLoading, generatePrompt, remaining, resetInSeconds } = useCoachPrompt({
    language,
  });

  const [selectedFocus, setSelectedFocus] = React.useState<FocusArea>('general');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showLimitModal, setShowLimitModal] = React.useState(false);

  const promptFadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (coachPrompt) {
      promptFadeAnim.setValue(0);
      Animated.timing(promptFadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [coachPrompt, promptFadeAnim]);

  const handleGenerate = React.useCallback(async () => {
    // Check limit before generating
    if (remaining === 0) {
      setShowLimitModal(true);
      return;
    }

    hapticFeedback.light();
    await generatePrompt(recentEntries, selectedFocus);
    setIsExpanded(true);
  }, [generatePrompt, recentEntries, selectedFocus, remaining]);

  const handleSelectPrompt = React.useCallback(() => {
    if (coachPrompt && onSelectPrompt) {
      hapticFeedback.medium();
      onSelectPrompt(coachPrompt);
    }
  }, [coachPrompt, onSelectPrompt]);

  const handleUnlock = React.useCallback(() => {
    checkGate('ai_coach_prompt');
  }, [checkGate]);

  if (!isPro) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.lockedWrapper, style]}
        onPress={handleUnlock}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('subscription.locked.aiCoach.title', 'Unlock AI Coach')}
        accessibilityHint={t('subscription.locked.aiCoach.cta', 'Go Premium')}
      >
        <LinearGradient
          colors={[theme.colors.primaryContainer, theme.colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lockedGradient}
        >
          <View style={styles.lockedHeader}>
            <View style={styles.lockedIconCircle}>
              <Icon name="lock-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.lockedTitleBlock}>
              <Text style={styles.lockedTitle}>
                {t('subscription.locked.aiCoach.title', 'Unlock AI Coach')}
              </Text>
              <Text style={styles.lockedSubtitle}>
                {t(
                  'subscription.locked.aiCoach.subtitle',
                  'Personalized prompts and guidance to deepen your practice.'
                )}
              </Text>
            </View>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>{t('shared.ui.badges.pro', 'PRO')}</Text>
            </View>
          </View>

          <View style={styles.lockedCtaRow}>
            <View style={styles.lockedCtaPill}>
              <Text style={styles.lockedCtaText}>
                {t('subscription.locked.aiCoach.cta', 'Go Premium')}
              </Text>
              <Icon name="arrow-right" size={16} color={theme.colors.onPrimary} />
            </View>
          </View>

          <View style={styles.lockedGlow} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="creation" size={20} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>{t('ai.coach.title', '🌱 AI Coach')}</Text>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {/* Focus Area Selector - Horizontal Swipeable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.focusRow}
            style={styles.focusScroll}
          >
            {(Object.keys(FOCUS_ICONS) as FocusArea[]).map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.focusChip, selectedFocus === area && styles.focusChipActive]}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedFocus(area);
                }}
              >
                <Icon
                  name={FOCUS_ICONS[area]}
                  size={16}
                  color={
                    selectedFocus === area ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[styles.focusLabel, selectedFocus === area && styles.focusLabelActive]}
                  numberOfLines={1}
                >
                  {t(`ai.coach.focusAreas.${area}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Generate Button */}
          {!coachPrompt && (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerate}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                  <Text style={styles.generateBtnText}>{t('ai.coach.loading', 'Thinking...')}</Text>
                </>
              ) : (
                <>
                  <Icon name="auto-fix" size={18} color={theme.colors.onPrimary} />
                  <Text style={styles.generateBtnText}>
                    {t('ai.coach.generatePrompt', 'Get Personalized Prompt')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Generated Prompt */}
          {coachPrompt && (
            <Animated.View style={[styles.promptCardContainer, { opacity: promptFadeAnim }]}>
              <TouchableOpacity
                style={styles.promptCard}
                onPress={handleSelectPrompt}
                activeOpacity={0.8}
              >
                <View style={styles.quoteIconContainer}>
                  <Icon name="format-quote-open" size={24} color={theme.colors.primary + '20'} />
                </View>
                <Text style={styles.promptText}>{coachPrompt}</Text>

                <View style={styles.promptDivider} />

                <View style={styles.promptFooterRow}>
                  <TouchableOpacity
                    style={styles.usePromptBtn}
                    onPress={handleSelectPrompt}
                    activeOpacity={0.7}
                  >
                    <Icon name="creation" size={14} color={theme.colors.onPrimary} />
                    <Text style={styles.usePromptText}>
                      {t('ai.coach.usePrompt', 'Use this prompt')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={handleGenerate}
                    activeOpacity={0.7}
                  >
                    <Icon name="refresh" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Usage indicator */}
          <View style={styles.remainingContainer}>
            <AIUsageIndicator remaining={remaining} resetInSeconds={resetInSeconds} showAlways />
          </View>
        </View>
      )}

      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.limitBackdrop}>
          <View style={styles.limitSheet}>
            <Text style={styles.limitTitle}>
              {t('ai.usage.limit_reached', 'Daily AI Limit Reached')}
            </Text>
            <View style={styles.limitContent}>
              <Text style={styles.limitMessage}>
                {t('ai.usage.limit_desc', 'You have used all your AI interactions for today.')}
              </Text>
              <AIUsageIndicator remaining={0} resetInSeconds={resetInSeconds} showAlways={true} />
            </View>
            <TouchableOpacity onPress={() => setShowLimitModal(false)} style={styles.limitCloseBtn}>
              <Text style={styles.limitCloseText}>{t('shared.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden',
    },
    lockedWrapper: {
      borderColor: theme.colors.primary + '30',
    },
    lockedGradient: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    lockedHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    lockedIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '1A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockedTitleBlock: {
      flex: 1,
      gap: 2,
    },
    lockedTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    lockedSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    lockedBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    lockedBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    lockedCtaRow: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    lockedCtaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lockedCtaText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
      fontWeight: '700',
    },
    lockedGlow: {
      position: 'absolute',
      right: -30,
      top: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primary + '12',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    focusScroll: {
      marginHorizontal: -theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    focusRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingRight: theme.spacing.md * 2,
    },
    focusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm - 2,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderWidth: 1,
      borderColor: theme.colors.outline + '10',
      gap: 6,
    },
    focusChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    focusLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    focusLabelActive: {
      color: theme.colors.onPrimary,
    },
    generateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    generateBtnText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    promptCardContainer: {
      marginTop: theme.spacing.sm,
    },
    promptCard: {
      backgroundColor: theme.colors.primaryContainer + '15',
      borderRadius: theme.borderRadius.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      padding: theme.spacing.md,
      position: 'relative',
    },
    quoteIconContainer: {
      position: 'absolute',
      top: 6,
      left: 6,
    },
    promptText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      lineHeight: 22,
      paddingLeft: 12,
      paddingTop: 4,
    },
    promptDivider: {
      height: 1,
      backgroundColor: theme.colors.outline + '10',
      marginVertical: theme.spacing.sm,
    },
    promptFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    usePromptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.borderRadius.full,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    usePromptText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    refreshBtn: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    remainingContainer: {
      alignItems: 'center',
      paddingTop: 8,
    },
    limitBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    limitSheet: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      width: '90%',
      maxWidth: 340,
      alignSelf: 'center',
      alignItems: 'center',
    },
    limitTitle: {
      ...theme.typography.titleMedium,
      marginBottom: theme.spacing.sm,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    limitContent: {
      alignItems: 'center',
      width: '100%',
      gap: theme.spacing.md,
    },
    limitMessage: {
      ...theme.typography.bodyMedium,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.md,
    },
    limitCloseBtn: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.borderRadius.full,
    },
    limitCloseText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSecondaryContainer,
    },
  });

export default AICoachPrompt;
