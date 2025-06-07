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

  // TanStack Query hook replaces the old throwback store
  const { randomEntry, isLoading, error, hideThrowback, refreshThrowback, hasRandomEntry } =
    useThrowback();

  const [modalActuallyVisible, setModalActuallyVisible] = useState(false);

  useEffect(() => {
    if (isVisible && hasRandomEntry) {
      setModalActuallyVisible(true);
    } else {
      setModalActuallyVisible(false);
    }
  }, [isVisible, hasRandomEntry]);

  const handleClose = async () => {
    await hideThrowback(); // Clears cache and updates timestamp
    onClose();
  };

  const handleRefresh = () => {
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
                <Text style={styles.modalTitle}>Bir Hata Oluştu</Text>
                <Text style={styles.errorText}>
                  {error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu'}
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleRefresh}
                  >
                    <Text style={styles.textStyleSecondary}>Tekrar Dene</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={handleClose}
                  >
                    <Text style={styles.textStyle}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : randomEntry?.statements && randomEntry.statements.length > 0 ? (
              <>
                <Text style={styles.modalTitle}>✨ Bir Anı Parçacığı ✨</Text>
                <ScrollView
                  style={styles.entryScrollView}
                  contentContainerStyle={styles.entryScrollContentContainer}
                >
                  <View style={styles.entryContainer}>
                    <Text style={styles.entryDate}>
                      {formatUtilityDate(randomEntry.entry_date, 'PPP', 'tr')}
                    </Text>
                    <Text style={styles.entryContent}>{randomEntry.statements[0]}</Text>
                  </View>
                </ScrollView>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleRefresh}
                  >
                    <Text style={styles.textStyleSecondary}>Başka Anı</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonClose]}
                    onPress={handleClose}
                  >
                    <Text style={styles.textStyle}>Anladım!</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>✨ Bir Anı Parçacığı ✨</Text>
                <Text style={styles.entryContent}>Görünecek bir anı bulunamadı.</Text>
                <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={handleClose}>
                  <Text style={styles.textStyle}>Kapat</Text>
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
      backgroundColor: alpha(theme.colors.onSurface, 0.6),
    },
    modalView: {
      minHeight: 150,
      justifyContent: 'center',
      margin: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      width: '90%',
      maxHeight: '80%',
      // 🌟 Beautiful primary shadow for modal
      ...getPrimaryShadow.overlay(theme),
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
      letterSpacing: -0.2,
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
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      width: '100%',
      // 🌟 Beautiful primary shadow for entry container
      ...getPrimaryShadow.card(theme),
    },
    entryDate: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      fontStyle: 'italic',
      opacity: 0.8,
    },
    entryContent: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 24,
      letterSpacing: 0.1,
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
    },
    button: {
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minWidth: 120,
      flex: 1,
    },
    buttonClose: {
      backgroundColor: theme.colors.primary,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    textStyle: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 15,
    },
    textStyleSecondary: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 15,
    },
  });

export default EnhancedThrowbackModal;
