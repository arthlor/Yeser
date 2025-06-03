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
      // Removed outer container styling - handled by parent
      width: '100%',
    },
    containerEditing: {
      backgroundColor: colors.surfaceVariant + '40',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary + '40',
      width: '100%',
    },
    contentContainer: {
      paddingVertical: 8,
      width: '100%',
    },
    textContainer: {
      width: '100%',
    },
    statementText: {
      fontSize: 16,
      color: colors.onSurface,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.1,
      paddingRight: 16, // Space for any overflow protection
    },
    tapHint: {
      marginTop: 8,
      alignSelf: 'flex-end',
    },
    tapHintText: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      fontWeight: '500',
      opacity: 0.7,
    },
    editingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    editingIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginRight: 6,
    },
    editingLabel: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputContainer: {
      position: 'relative',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.outline + '60',
      marginBottom: 12,
    },
    input: {
      fontSize: 16,
      color: colors.onSurface,
      lineHeight: 24,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 32, // Space for character count
      minHeight: 80,
      maxHeight: 160,
      textAlignVertical: 'top',
    },
    characterCount: {
      position: 'absolute',
      bottom: 8,
      right: 12,
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    characterCountText: {
      fontSize: 10,
      color: colors.onSurfaceVariant,
      fontWeight: '500',
    },
    actionsContainer: {
      backgroundColor: colors.surfaceVariant + '40',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.outline + '30',
    },
    editActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    actionButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
      flex: 1,
      maxWidth: 120, // Prevent buttons from getting too wide
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    editButton: {
      backgroundColor: colors.primaryContainer,
    },
    editButtonText: {
      color: colors.onPrimaryContainer,
    },
    deleteButton: {
      backgroundColor: colors.errorContainer,
    },
    deleteButtonText: {
      color: colors.onErrorContainer,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonText: {
      color: colors.onPrimary,
    },
    cancelButton: {
      backgroundColor: colors.tertiaryContainer,
    },
    cancelButtonText: {
      color: colors.onTertiaryContainer,
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
  const slideValue = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!isEditing) {
      setCurrentText(statementText);
    }
  }, [statementText, isEditing]);

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });

    if (isEditing || showActions) {
      Animated.parallel([
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeValue.setValue(0);
      slideValue.setValue(-20);
    }
  }, [isEditing, showActions, fadeValue, slideValue]);

  const handleSave = () => {
    if (onSave && currentText.trim()) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.98,
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
            <Text style={styles.characterCountText}>{currentText.length}/500</Text>
          </View>
        </View>
        <Animated.View
          style={[
            styles.editActionsContainer,
            {
              opacity: fadeValue,
              transform: [{ translateY: slideValue }],
            },
          ]}
        >
          {onCancelEdit && (
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.actionButton, styles.cancelButton]}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>İptal</Text>
            </TouchableOpacity>
          )}
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
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.contentContainer} onPress={toggleActions} activeOpacity={0.7}>
        <View style={styles.textContainer}>
          <Text style={styles.statementText}>{statementText}</Text>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>{showActions ? '▲ Gizle' : '▼ Seçenekler'}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {showActions && (
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeValue,
              transform: [{ translateY: slideValue }],
            },
          ]}
        >
          <View style={styles.actionButtonsRow}>
            {onPressEdit && (
              <TouchableOpacity
                onPress={() => {
                  setShowActions(false);
                  onPressEdit();
                }}
                style={[styles.actionButton, styles.editButton]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, styles.editButtonText]}>✏️ Düzenle</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={() => {
                  setShowActions(false);
                  onDelete();
                }}
                style={[styles.actionButton, styles.deleteButton]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default GratitudeStatementItem;
