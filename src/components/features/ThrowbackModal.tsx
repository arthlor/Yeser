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

import { useTheme } from '../../providers/ThemeProvider';
import { useThrowbackStore } from '../../store/throwbackStore';
import { AppTheme } from '../../themes/types';
import { formatDate as formatUtilityDate } from '../../utils/dateUtils';

const ThrowbackModal: React.FC = () => {
  const {
    randomEntry,
    isThrowbackVisible: isVisibleFromStore,
    hideThrowback,
    isLoading,
    error,
  } = useThrowbackStore();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [modalActuallyVisible, setModalActuallyVisible] = useState(false);

  useEffect(() => {
    if (isVisibleFromStore && randomEntry) {
      setModalActuallyVisible(true);
    } else {
      setModalActuallyVisible(false);
    }
  }, [isVisibleFromStore, randomEntry]);

  if (!isVisibleFromStore && !modalActuallyVisible) {
    return null;
  }

  if (!randomEntry && modalActuallyVisible) {
    if (modalActuallyVisible) setModalActuallyVisible(false);
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={modalActuallyVisible}
      onRequestClose={() => {
        hideThrowback();
      }}
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
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={hideThrowback}
                >
                  <Text style={styles.textStyle}>Kapat</Text>
                </TouchableOpacity>
              </>
            ) : randomEntry && randomEntry.statements && randomEntry.statements.length > 0 ? (
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
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={hideThrowback}
                >
                  <Text style={styles.textStyle}>Anladım!</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>✨ Bir Anı Parçacığı ✨</Text>
                <Text style={styles.entryContent}>Görünecek bir anı bulunamadı.</Text>
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={hideThrowback}
                >
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
      backgroundColor: 'rgba(0,0,0,0.6)',
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
    button: {
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.sm,
      minWidth: 120,
    },
    buttonClose: {
      backgroundColor: theme.colors.primary,
    },
    textStyle: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
      textAlign: 'center',
      fontSize: 15,
      letterSpacing: 0.1,
    },
  });

export default ThrowbackModal;
