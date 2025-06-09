import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedButton from '@/shared/components/ui/ThemedButton';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getThemedStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Removed outer container styling - handled by parent
      width: '100%',
    },
    containerEditing: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      width: '100%',
      ...getPrimaryShadow.card(theme),
    },
    contentContainer: {
      paddingVertical: theme.spacing.sm,
      width: '100%',
    },
    textContainer: {
      width: '100%',
    },
    statementText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.1,
      paddingRight: theme.spacing.md, // Space for any overflow protection
    },
    tapHint: {
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-end',
    },
    tapHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      opacity: 0.7,
    },
    editingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.md,
    },
    editingIndicator: {
      width: 8,
      height: 8,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      marginRight: theme.spacing.sm,
    },
    editingLabel: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    inputContainer: {
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      ...getPrimaryShadow.small(theme),
    },
    input: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 28,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: 'top',
    },
    characterCount: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.borderRadius.sm,
    },
    characterCountText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    actionsContainer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
    },
    editActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    buttonWrapper: {
      flex: 1,
      minWidth: 100,
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
  const styles = getThemedStyles(theme);
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
          <View style={styles.actionButtonsRow}>
            {onCancelEdit && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title="İptal"
                  onPress={handleCancel}
                  variant="secondary"
                  size="compact"
                />
              </View>
            )}
            {onDelete && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title="Sil"
                  onPress={() => {
                    if (onDelete) {
                      onDelete();
                    }
                  }}
                  variant="outline"
                  size="compact"
                />
              </View>
            )}
            {onSave && (
              <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleValue }] }]}>
                <ThemedButton
                  title="Kaydet"
                  onPress={handleSave}
                  variant="primary"
                  size="compact"
                  disabled={!currentText.trim()}
                />
              </Animated.View>
            )}
          </View>
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
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title="✏️ Düzenle"
                  onPress={() => {
                    setShowActions(false);
                    onPressEdit();
                  }}
                  variant="secondary"
                  size="compact"
                />
              </View>
            )}
            {onDelete && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title="🗑️ Sil"
                  onPress={() => {
                    setShowActions(false);
                    onDelete();
                  }}
                  variant="outline"
                  size="compact"
                />
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default GratitudeStatementItem;
