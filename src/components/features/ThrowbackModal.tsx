import React, { useEffect, useState } from 'react'; // Correctly import useState and useEffect
import {
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
    isThrowbackVisible: isVisibleFromStore, // Renamed for clarity
    hideThrowback,
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

  // If the store says not visible AND our local state agrees, render nothing.
  if (!isVisibleFromStore && !modalActuallyVisible) {
    return null;
  }

  // If randomEntry is null but we are trying to show the modal (due to isVisibleFromStore being true),
  // we should also return null or a loader. The useEffect above should handle setting
  // modalActuallyVisible to false if randomEntry is null. This is an additional safeguard.
  if (!randomEntry && modalActuallyVisible) {
    // This case should ideally be prevented by the useEffect logic,
    // but as a safeguard, ensure modal is not shown.
    if (modalActuallyVisible) setModalActuallyVisible(false);
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalActuallyVisible} // Controlled by local state
      onRequestClose={() => {
        hideThrowback(); // This will set isVisibleFromStore to false, useEffect will update modalActuallyVisible
      }}
    >
      {/* Content is rendered only if modalActuallyVisible is true AND randomEntry is available. */}
      {modalActuallyVisible && randomEntry && (
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>✨ Bir Anı Parçacığı ✨</Text>
            <ScrollView
              style={styles.entryScrollView}
              contentContainerStyle={styles.entryScrollContentContainer}
            >
              <View style={styles.entryContainer}>
                <Text style={styles.entryDate}>
                  {formatUtilityDate(randomEntry.entry_date, 'PPP', 'tr')}
                </Text>
                <Text style={styles.entryContent}>{randomEntry.content}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={() => {
                hideThrowback(); // This will set isVisibleFromStore to false, useEffect will update modalActuallyVisible
              }}
            >
              <Text style={styles.textStyle}>Anladım!</Text>
            </TouchableOpacity>
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
      margin: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.large,
      alignItems: 'center',
      shadowColor: theme.colors.shadow || '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '90%',
      maxHeight: '80%',
    },
    modalTitle: {
      ...theme.typography.h2,
      color: theme.colors.primary,
      marginBottom: theme.spacing.medium,
      textAlign: 'center',
    },
    entryScrollView: {
      width: '100%',
      marginBottom: theme.spacing.medium,
    },
    entryScrollContentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    entryContainer: {
      padding: theme.spacing.medium,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.medium,
      width: '100%',
    },
    entryDate: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary, // Preserved from viewed file
      marginBottom: theme.spacing.small,
      textAlign: 'center',
      fontStyle: 'italic', // Preserved from viewed file
    },
    entryContent: {
      ...theme.typography.body1, // Preserved from viewed file
      color: theme.colors.text, // Preserved from viewed file
      textAlign: 'left', // Preserved from viewed file
      lineHeight: theme.typography.body1.fontSize
        ? theme.typography.body1.fontSize * 1.6
        : 24, // Preserved from viewed file
    },
    button: {
      borderRadius: theme.borderRadius.large,
      paddingVertical: theme.spacing.medium, // Preserved from viewed file
      paddingHorizontal: theme.spacing.xl, // Preserved from viewed file
      elevation: 2,
      marginTop: theme.spacing.small,
    },
    buttonClose: {
      backgroundColor: theme.colors.primary,
    },
    textStyle: {
      color: theme.colors.onPrimary, // Preserved from viewed file
      fontWeight: 'bold', // Preserved from viewed file
      textAlign: 'center',
      ...theme.typography.button, // Preserved from viewed file
    },
  });

export default ThrowbackModal;
