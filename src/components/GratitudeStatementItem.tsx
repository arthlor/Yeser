import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getThemedStyles = (colors: AppTheme['colors']) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    containerEditing: {
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 16,
      padding: 16,
      shadowColor: colors.primary, // Highlight editing state
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 2,
      borderColor: colors.primary, // Highlight editing state
    },
    contentContainer: {
      padding: 20,
    },
    textContainer: {
      flex: 1,
    },
    statementText: {
      fontSize: 17,
      color: colors.onSurface,
      lineHeight: 26,
      fontWeight: '400',
      letterSpacing: 0.2,
    },
    tapHint: {
      marginTop: 12,
      alignSelf: 'flex-end',
    },
    tapHintText: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      fontWeight: '500',
      opacity: 0.7,
    },
    editingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    editingIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    editingLabel: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputContainer: {
      position: 'relative',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.outline,
      marginBottom: 16,
    },
    input: {
      fontSize: 17,
      color: colors.onSurface,
      lineHeight: 26,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40, // Space for character count
      minHeight: 80,
      maxHeight: 200,
      textAlignVertical: 'top',
    },
    characterCount: {
      position: 'absolute',
      bottom: 12,
      right: 16,
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    characterCountText: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      fontWeight: '500',
    },
    actionsContainer: {
      backgroundColor: colors.surfaceVariant,
      borderTopWidth: 1,
      borderTopColor: colors.outline,
      padding: 16,
    },
    editActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 100,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 15,
      color: colors.onSecondaryContainer,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    editButton: {
      backgroundColor: colors.secondaryContainer,
    },
    deleteButton: {
      backgroundColor: colors.errorContainer,
    },
    deleteButtonText: { // Specific text color for delete button
      color: colors.onErrorContainer,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonText: { // Specific text color for save button
      color: colors.onPrimary,
    },
    cancelButton: {
      backgroundColor: colors.tertiaryContainer,
    },
    cancelButtonText: { // Specific text color for cancel button
      color: colors.onTertiaryContainer,
    },
    decorativeLine: {
      height: 3,
      backgroundColor: colors.primary,
      opacity: 0.1,
    },
  });

interface GratitudeStatementItemProps {
  statementText: string;
  isEditing?: boolean;
  onPressEdit?: () => void;
  onSave?: (updatedText: string) => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
}

const GratitudeStatementItem: React.FC<GratitudeStatementItemProps> = ({
  statementText,
  isEditing = false,
  onPressEdit,
  onSave,
  onCancelEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = getThemedStyles(colors);
  const placeholderTextColor = colors.onSurfaceVariant;

  const [currentText, setCurrentText] = useState(statementText);
  const [showActions, setShowActions] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!isEditing) {
      setCurrentText(statementText);
    }
  }, [statementText, isEditing]);

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });

    if (isEditing || showActions) {
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeValue.setValue(0);
      slideValue.setValue(-50);
    }
  }, [isEditing, showActions, fadeValue, slideValue]);

  const handleSave = () => {
    if (onSave && currentText.trim()) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onSave(currentText.trim());
    }
  };

  const handleCancel = () => {
    setCurrentText(statementText);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const toggleActions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowActions(!showActions);
  };

  if (isEditing) {
    return (
      <View style={styles.containerEditing}>
        <View style={styles.editingHeader}>
          <View style={styles.editingIndicator} />
          <Text style={styles.editingLabel}>Düzenleniyor</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={currentText}
            onChangeText={setCurrentText}
            multiline
            placeholder="Minnettarlık ifadenizi yazın..."
            placeholderTextColor={placeholderTextColor}
            autoFocus
            textAlignVertical="top"
            maxLength={500}
          />
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>
              {currentText.length}/500
            </Text>
          </View>
        </View>
        <Animated.View 
          style={[
            styles.editActionsContainer,
            {
              opacity: fadeValue,
              transform: [{ translateY: slideValue }]
            }
          ]}
        >
          {onSave && (
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.actionButton, styles.saveButton]}
                activeOpacity={0.8}
                disabled={!currentText.trim()}
              >
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>Kaydet</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          {onCancelEdit && (
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.actionButton, styles.cancelButton]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>İptal</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.contentContainer}
        onPress={toggleActions}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          <Text style={styles.statementText}>{statementText}</Text>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>
              {showActions ? '↑ Gizle' : '↓ Seçenekler'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showActions && (
        <Animated.View 
          style={[
            styles.actionsContainer,
            {
              opacity: fadeValue,
              transform: [{ translateY: slideValue }]
            }
          ]}
        >
          <View style={styles.actionButtonsRow}>
            {onPressEdit && (
              <TouchableOpacity
                onPress={() => {
                  // setShowActions(false); // Keep actions visible until edit mode starts
                  onPressEdit();
                }}
                style={[styles.actionButton, styles.editButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>✎ Düzenle</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={() => {
                  setShowActions(false); // Hide actions before deleting
                  onDelete();
                }}
                style={[styles.actionButton, styles.deleteButton]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
      <View style={styles.decorativeLine} />
    </View>
  );
};

export default GratitudeStatementItem;