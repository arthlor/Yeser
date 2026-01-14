import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import { AIUsageIndicator } from './AIUsageIndicator';
import { useCoachPrompt } from '@/features/gratitude/hooks/useCoachPrompt';
import { useLanguageStore } from '@/store/languageStore';
import { useSubscription } from '@/hooks/useSubscription';

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
  onSelectPrompt: _onSelectPrompt,
  style,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isPro } = useSubscription();
  const language = useLanguageStore((state) => state.language);

  const { coachPrompt, isLoading, generatePrompt, remaining, resetInSeconds } = useCoachPrompt({
    language: language === 'tr' ? 'tr' : 'en',
  });

  const [selectedFocus, setSelectedFocus] = React.useState<FocusArea>('general');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showLimitModal, setShowLimitModal] = React.useState(false);

  const handleGenerate = React.useCallback(async () => {
    // Check limit before generating
    if (remaining === 0) {
      setShowLimitModal(true);
      return;
    }

    await generatePrompt(recentEntries, selectedFocus);
    setIsExpanded(true);
  }, [generatePrompt, recentEntries, selectedFocus, remaining]);

  if (!isPro) {
    return null;
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
          <Icon name="school-outline" size={20} color={theme.colors.primary} />
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
          {/* Focus Area Selector */}
          <View style={styles.focusRow}>
            {(Object.keys(FOCUS_ICONS) as FocusArea[]).map((area) => (
              <TouchableOpacity
                key={area}
                style={[styles.focusChip, selectedFocus === area && styles.focusChipActive]}
                onPress={() => setSelectedFocus(area)}
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
          </View>

          {/* Generate Button */}
          {!coachPrompt && (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleGenerate}
              disabled={isLoading}
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
            <View style={styles.promptCard}>
              <Text style={styles.promptText}>{coachPrompt}</Text>

              <View style={styles.promptActions}>
                <TouchableOpacity style={styles.refreshBtn} onPress={handleGenerate}>
                  <Icon name="refresh" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
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
    focusRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    focusChip: {
      flex: 1,
      minWidth: 48,
      maxWidth: 60,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceVariant + '50',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 2,
    },
    focusChipActive: {
      backgroundColor: theme.colors.primary,
    },
    focusLabel: {
      ...theme.typography.labelSmall,
      fontSize: 9,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
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
    promptCard: {
      backgroundColor: theme.colors.primaryContainer + '30',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    promptText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    promptActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    refreshBtn: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    remainingText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.8,
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
