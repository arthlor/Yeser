import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useThrowback } from '@/features/throwback/hooks/useThrowback';
import ThrowbackShareCard from '@/features/throwback/components/ThrowbackShareCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha, getPrimaryShadow } from '@/themes/utils';
import { formatDate as formatUtilityDate } from '@/utils/dateUtils';
import { analyticsService } from '@/services/analyticsService';
import { useTranslation } from 'react-i18next';
import { shareThrowbackCard } from '@/features/throwback/shareThrowback';

interface EnhancedThrowbackModalProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Memory Shard modal.
 *
 * Clean, hierarchical layout:
 *  - Top row: eyebrow title + close (x) button.
 *  - Share card preview fills the center.
 *  - Primary "Share" CTA, with secondary "Another" and tertiary "Done".
 * No decorative orbs or blurs — just type, the card, and quiet dividers.
 */
const EnhancedThrowbackModal: React.FC<EnhancedThrowbackModalProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, i18n } = useTranslation();

  const currentLanguage =
    (i18n.language === 'en' ? 'en-US' : (i18n.language as 'tr' | 'es')) || 'en-US';

  const { randomEntry, isLoading, error, hideThrowback, refreshThrowback, hasRandomEntry } =
    useThrowback();

  const [modalActuallyVisible, setModalActuallyVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const formattedEntryDate = useMemo(() => {
    if (!randomEntry?.entry_date) {
      return '';
    }
    return formatUtilityDate(randomEntry.entry_date, 'PPP', currentLanguage);
  }, [currentLanguage, randomEntry?.entry_date]);

  const shareFallbackMessage = useMemo(() => {
    if (!randomEntry?.statements?.[0]) {
      return '';
    }
    return `${formattedEntryDate}\n\n"${randomEntry.statements[0]}"\n\nYeşer`;
  }, [formattedEntryDate, randomEntry?.statements]);

  useEffect(() => {
    if (isVisible && hasRandomEntry) {
      setModalActuallyVisible(true);
      analyticsService.logScreenView('throwback_modal');

      if (randomEntry) {
        analyticsService.logEvent('throwback_modal_viewed', {
          entry_date: randomEntry.entry_date,
          statements_count: randomEntry.statements?.length || 0,
          entry_age_days: Math.floor(
            (Date.now() - new Date(randomEntry.entry_date).getTime()) / (1000 * 60 * 60 * 24)
          ),
          has_content: !!(randomEntry.statements && randomEntry.statements.length > 0),
        });
      }
    } else {
      setModalActuallyVisible(false);
    }
  }, [isVisible, hasRandomEntry, randomEntry]);

  const handleClose = async () => {
    analyticsService.logEvent('throwback_modal_closed', {
      interaction_type: 'close_button',
      entry_date: randomEntry?.entry_date || null,
    });

    await hideThrowback();
    onClose();
  };

  const handleRefresh = () => {
    analyticsService.logEvent('throwback_modal_refreshed', {
      previous_entry_date: randomEntry?.entry_date || null,
      interaction_type: 'refresh_button',
    });

    refreshThrowback();
  };

  const handleShare = async () => {
    if (!randomEntry?.statements?.[0] || isSharing) {
      return;
    }

    setIsSharing(true);
    try {
      const sharedMode = await shareThrowbackCard({
        cardRef: shareCardRef,
        fallbackMessage: shareFallbackMessage,
        dialogTitle: t('throwback.modal.shareTitle', {
          defaultValue: 'Share this memory',
        }),
      });

      analyticsService.logEvent('throwback_shared', {
        share_mode: sharedMode,
        entry_date: randomEntry.entry_date,
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (!isVisible && !modalActuallyVisible) {
    return null;
  }

  if (!randomEntry && modalActuallyVisible) {
    if (modalActuallyVisible) {
      setModalActuallyVisible(false);
    }
    return null;
  }

  const hasStatement = !!randomEntry?.statements?.[0];

  return (
    <Modal
      animationType="fade"
      transparent
      visible={modalActuallyVisible}
      onRequestClose={handleClose}
    >
      {modalActuallyVisible && (
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Top bar: eyebrow + close */}
            <View style={styles.topBar}>
              <Text style={styles.eyebrow}>
                {t('throwback.modal.shardTitle', { defaultValue: 'A Memory Shard' })}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
              >
                <Icon name="close" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.stateContainer}>
                <Icon
                  name="alert-circle-outline"
                  size={28}
                  color={theme.colors.error}
                  style={styles.stateIcon}
                />
                <Text style={styles.stateTitle}>{t('throwback.modal.errorTitle')}</Text>
                <Text style={styles.stateSubtitle}>
                  {error instanceof Error ? error.message : t('throwback.modal.unexpected')}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonGhost]}
                    onPress={handleClose}
                  >
                    <Text style={styles.actionButtonGhostLabel}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleRefresh}
                  >
                    <Text style={styles.actionButtonPrimaryLabel}>
                      {t('throwback.teaser.errorRetry')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : hasStatement ? (
              <>
                <ScrollView
                  style={styles.cardScroll}
                  contentContainerStyle={styles.cardScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <ThrowbackShareCard
                    ref={shareCardRef}
                    dateLabel={formattedEntryDate}
                    statement={randomEntry!.statements![0]}
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.primaryCta, isSharing && styles.primaryCtaDisabled]}
                  onPress={() => void handleShare()}
                  disabled={isSharing}
                  accessibilityRole="button"
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                  ) : (
                    <>
                      <Icon
                        name="share-variant"
                        size={18}
                        color={theme.colors.onPrimary}
                        style={styles.primaryCtaIcon}
                      />
                      <Text style={styles.primaryCtaLabel}>
                        {t('throwback.modal.share', { defaultValue: 'Share card' })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleRefresh}
                    accessibilityRole="button"
                  >
                    <Icon
                      name="shuffle-variant"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                      style={styles.secondaryIcon}
                    />
                    <Text style={styles.secondaryLabel}>{t('throwback.modal.another')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tertiaryButton}
                    onPress={handleClose}
                    accessibilityRole="button"
                  >
                    <Text style={styles.tertiaryLabel}>{t('throwback.modal.ok')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.stateContainer}>
                <Icon
                  name="leaf-off"
                  size={28}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.stateIcon}
                />
                <Text style={styles.stateTitle}>
                  {t('throwback.modal.shardTitle', { defaultValue: 'A Memory Shard' })}
                </Text>
                <Text style={styles.stateSubtitle}>{t('throwback.modal.empty')}</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary, styles.singleAction]}
                  onPress={handleClose}
                >
                  <Text style={styles.actionButtonPrimaryLabel}>
                    {t('common.cancel', { defaultValue: 'Tamam' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    sheet: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '92%',
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
      borderRadius: theme.borderRadius.xxl || 28,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
      ...getPrimaryShadow.overlay(theme),
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 2,
      color: theme.colors.primary,
      textTransform: 'uppercase',
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.6),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    cardScroll: {
      width: '100%',
    },
    cardScrollContent: {
      paddingVertical: theme.spacing.xs,
      alignItems: 'center',
    },
    primaryCta: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      ...getPrimaryShadow.card(theme),
    },
    primaryCtaDisabled: {
      opacity: 0.7,
    },
    primaryCtaIcon: {
      marginRight: theme.spacing.sm,
    },
    primaryCtaLabel: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    secondaryRow: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    secondaryIcon: {
      marginRight: 6,
    },
    secondaryLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      fontWeight: '600',
    },
    tertiaryButton: {
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.lg,
    },
    tertiaryLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 13,
      fontWeight: '600',
    },
    stateContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
    },
    stateIcon: {
      marginBottom: theme.spacing.sm,
    },
    stateTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 4,
      fontFamily: theme.typography.fontFamilySerifBold,
    },
    stateSubtitle: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      width: '100%',
    },
    actionButton: {
      flex: 1,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonPrimary: {
      backgroundColor: theme.colors.primary,
    },
    actionButtonPrimaryLabel: {
      color: theme.colors.onPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    actionButtonGhost: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outlineVariant,
    },
    actionButtonGhostLabel: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      fontSize: 14,
    },
    singleAction: {
      width: '100%',
      flex: 0,
    },
  });

export default EnhancedThrowbackModal;
