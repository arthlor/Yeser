import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useThrowback } from '@/features/throwback/hooks/useThrowback';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha, getPrimaryShadow } from '@/themes/utils';
import { formatDate as formatUtilityDate } from '@/utils/dateUtils';
import { analyticsService } from '@/services/analyticsService';
import { useTranslation } from 'react-i18next';

interface EnhancedThrowbackModalProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Enhanced ThrowbackModal using TanStack Query
 *
 * Key improvements over the original:
 * - Uses TanStack Query for automatic caching and background sync
 * - Cleaner state management with better error handling
 * - Automatic retry logic for failed requests
 * - Better loading states and optimistic updates
 * - Separation of server state (random entry) from UI state (modal visibility)
 */
const EnhancedThrowbackModal: React.FC<EnhancedThrowbackModalProps> = ({ isVisible, onClose }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t, i18n } = useTranslation();

  // Map app language to date utility locales
  const currentLanguage =
    (i18n.language === 'en' ? 'en-US' : (i18n.language as 'tr' | 'es')) || 'en-US';

  // TanStack Query hook replaces the old throwback store
  const { randomEntry, isLoading, error, hideThrowback, refreshThrowback, hasRandomEntry } =
    useThrowback();

  const [modalActuallyVisible, setModalActuallyVisible] = useState(false);

  useEffect(() => {
    if (isVisible && hasRandomEntry) {
      setModalActuallyVisible(true);

      // Track modal view
      analyticsService.logScreenView('throwback_modal');

      // Track throwback content analytics
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

    await hideThrowback(); // Clears cache and updates timestamp
    onClose();
  };

  const handleRefresh = () => {
    analyticsService.logEvent('throwback_modal_refreshed', {
      previous_entry_date: randomEntry?.entry_date || null,
      interaction_type: 'refresh_button',
    });

    refreshThrowback(); // Fetches new random entry
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

  return (
    <Modal
      animationType="fade"
      transparent
      visible={modalActuallyVisible}
      onRequestClose={handleClose}
    >
      {modalActuallyVisible && (
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                style={styles.activityIndicator}
              />
            ) : error ? (
              <>
                <Text style={styles.modalTitle}>{t('throwback.modal.errorTitle')}</Text>
                <Text style={styles.errorText}>
                  {error instanceof Error ? error.message : t('throwback.modal.unexpected')}
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleRefresh}
                  >
                    <Text style={styles.textStyleSecondary}>
                      {t('throwback.teaser.errorRetry')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={handleClose}
                  >
                    <Text style={styles.textStyle}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : randomEntry?.statements && randomEntry.statements.length > 0 ? (
              <>
                <Text style={styles.modalTitle}>{t('throwback.modal.shardTitle')}</Text>
                <ScrollView
                  style={styles.entryScrollView}
                  contentContainerStyle={styles.entryScrollContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.entryContainer}>
                    <Text style={styles.entryDate}>
                      {formatUtilityDate(randomEntry.entry_date, 'PPP', currentLanguage)}
                    </Text>
                    <Text style={styles.entryContent}>{randomEntry.statements[0]}</Text>
                  </View>
                </ScrollView>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleRefresh}
                  >
                    <Text style={styles.textStyleSecondary}>{t('throwback.modal.another')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={handleClose}
                  >
                    <Text style={styles.textStyle}>{t('throwback.modal.ok')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{t('throwback.modal.shardTitle')}</Text>
                <Text style={styles.entryContent}>{t('throwback.modal.empty')}</Text>
                <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={handleClose}>
                  <Text style={styles.textStyle}>
                    {t('common.cancel', { defaultValue: 'Tamam' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.scrim, // Using scrim for darker tint
    },
    modalView: {
      minHeight: 150,
      justifyContent: 'center',
      margin: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface, // Darker surface
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      width: '90%',
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: theme.colors.borderLight || theme.colors.outlineVariant,
      // 🌟 Beautiful primary shadow for modal
      ...getPrimaryShadow.overlay(theme),
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
      letterSpacing: -0.5,
      fontFamily: theme.typography.fontFamilySerifBold,
    },
    entryScrollView: {
      width: '100%',
      marginBottom: theme.spacing.lg,
    },
    entryScrollContentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    entryContainer: {
      padding: theme.spacing.xl,
      backgroundColor: alpha(theme.colors.background, 0.5), // Semi-transparent dark background
      borderRadius: theme.borderRadius.lg,
      width: '100%',
      borderWidth: 1,
      borderColor: alpha(theme.colors.outline, 0.1),
      // 🌟 Beautiful primary shadow for entry container
      ...getPrimaryShadow.card(theme),
    },
    entryDate: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.primary, // Highlight date with primary
      marginBottom: theme.spacing.md,
      textAlign: 'center',
      fontStyle: 'italic',
      opacity: 0.9,
    },
    entryContent: {
      fontSize: 18,
      fontWeight: '400',
      color: theme.colors.onSurface,
      textAlign: 'center',
      lineHeight: 28,
      letterSpacing: 0.2,
      fontFamily: theme.typography.fontFamilySerif, // Use serif for better journal feel
    },
    errorText: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.colors.error,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
      lineHeight: 20,
    },
    activityIndicator: {
      marginVertical: theme.spacing.lg,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
      width: '100%',
    },
    button: {
      borderRadius: theme.borderRadius.full, // Standardized pill buttons
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      minWidth: 100,
      flex: 1,
    },
    buttonClose: {
      backgroundColor: theme.colors.primary,
    },
    buttonSecondary: {
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.5),
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
    },
    textStyle: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 14, // Reduced from 15
    },
    textStyleSecondary: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 14, // Reduced from 15
    },
  });

export default EnhancedThrowbackModal;
