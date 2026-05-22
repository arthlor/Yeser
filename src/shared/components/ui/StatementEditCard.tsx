import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha } from '@/themes/utils';
import { formatStatementDate, InteractiveStatementCardProps } from './StatementCardBase';
import type { MoodEmoji } from '@/types/mood.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal } from 'react-native';
import { useMoodSuggestion } from '@/features/mood/hooks/useMoodSuggestion';
import { AIMoodSuggestions } from './AIMoodSuggestions';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguageStore } from '@/store/languageStore';
import { GRATITUDE_MAX_LENGTH } from '@/constants/gratitude';
import { Attachment } from '@/schemas/gratitudeEntrySchema';
import AttachmentRail from '@/features/gratitude/components/AttachmentRail';

interface StatementEditCardProps extends Omit<InteractiveStatementCardProps, 'onSave'> {
  variant?: 'primary' | 'secondary' | 'minimal';
  showQuotes?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean;
  moodEmoji?: MoodEmoji | null;
  onChangeMood?: (mood: MoodEmoji | null) => void;
  onSave?: (statement: string, mood?: MoodEmoji | null) => Promise<void>;
  onShare?: () => void;
  showSaveHint?: boolean;
  attachments?: Attachment[];
  onRemoveAttachment?: (attachment: Attachment) => void | Promise<void>;
  compactAttachments?: boolean;
}

const StatementEditCard: React.FC<StatementEditCardProps> = ({
  statement,
  date,
  showQuotes = true,
  numberOfLines,
  onPress,
  style,
  isEditing = false,
  isLoading = false,
  onEdit,
  onDelete,
  onCancel,
  onSave,
  onShare,
  maxLength = GRATITUDE_MAX_LENGTH,
  moodEmoji,
  onChangeMood,
  attachments,
  onRemoveAttachment,
  compactAttachments,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isPro } = useSubscription();
  const language = useLanguageStore((state) => state.language);

  const [localStatement, setLocalStatement] = useState(statement);
  const [localMood, setLocalMood] = useState<MoodEmoji | null>(moodEmoji ?? null);
  const [showActions, setShowActions] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const emojiAnim = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);

  // AI Mood Suggestion hook (only for PRO users)
  const {
    suggestedMoods,
    primaryMood: suggestedPrimaryMood,
    remaining: aiRemaining,
    resetInSeconds: aiResetInSeconds,
    isLoading: aiLoading,
    suggestMood,
    clearSuggestions,
  } = useMoodSuggestion({ language });

  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  useEffect(() => {
    setLocalMood(moodEmoji ?? null);
  }, [moodEmoji]);

  const { relativeTime } = formatStatementDate(date);

  const handleSave = useCallback(async () => {
    if (!localStatement.trim()) {
      return;
    }
    try {
      // backward compatibility for onSave that doesn't accept mood yet
      await onSave?.(localStatement.trim(), localMood);
    } catch {
      // Error handled by parent
    }
  }, [localStatement, localMood, onSave]);

  const toggleEmoji = useCallback(() => {
    if (emojiOpen) {
      Animated.timing(emojiAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setEmojiOpen(false)
      );
    } else {
      setEmojiOpen(true);
      Animated.timing(emojiAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [emojiOpen, emojiAnim]);

  const handleSelectMood = useCallback(
    (mood: MoodEmoji | null) => {
      if (onChangeMood) {
        onChangeMood(mood);
      } else {
        setLocalMood(mood);
      }
      // Automatically close modal after selection if it's not null (or keep open? InputBar closes?)
      // InputBar toggles.
      if (emojiOpen) {
        Animated.timing(emojiAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setEmojiOpen(false)
        );
      }
    },
    [emojiOpen, emojiAnim, onChangeMood]
  );

  const handleCancel = useCallback(() => {
    setLocalStatement(statement);
    onCancel?.();
  }, [statement, onCancel]);

  const handleDelete = useCallback(() => {
    Alert.alert(t('shared.statement.confirmDeleteAction'), t('shared.statement.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('shared.statement.deleteButton'), style: 'destructive', onPress: onDelete },
    ]);
  }, [onDelete, t]);

  const isDirty =
    localStatement.trim() !== (statement ?? '').trim() || localMood !== (moodEmoji ?? null);

  // Editing mode
  if (isEditing) {
    return (
      <View style={[styles.container, style]}>
        {/* Edit Header */}
        <View style={styles.editHeader}>
          <View style={styles.editIconContainer}>
            <Icon name="pencil" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.editTitle}>{t('shared.statement.editingLabel')}</Text>
          <View style={styles.spacer} />
          {/* Mood Selector Button in Header */}
          <TouchableOpacity
            onPress={toggleEmoji}
            style={[styles.moodSelectorButton, localMood ? styles.moodSelectorActive : null]}
          >
            {localMood ? (
              <Text style={styles.moodSelectorEmoji}>{localMood}</Text>
            ) : (
              <Icon name="emoticon-outline" size={20} color={theme.colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        </View>

        {/* Text Input */}
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={localStatement}
          onChangeText={(text) => {
            setLocalStatement(text);
            // Trigger AI mood suggestion for PRO users
            if (isPro) {
              suggestMood(text);
            }
          }}
          multiline
          maxLength={maxLength}
          placeholder={t('shared.statement.edit.placeholder')}
          placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
          autoFocus
          selectionColor={theme.colors.primary}
          textAlignVertical="top"
        />

        {/* AI Mood Suggestions (PRO only) */}
        {isPro && (suggestedMoods.length > 0 || aiLoading) && (
          <AIMoodSuggestions
            suggestedMoods={suggestedMoods}
            primaryMood={suggestedPrimaryMood}
            remaining={aiRemaining}
            resetInSeconds={aiResetInSeconds}
            isLoading={aiLoading}
            onSelectMood={(mood) => {
              if (onChangeMood) {
                onChangeMood(mood);
              } else {
                setLocalMood(mood);
              }
              clearSuggestions();
            }}
          />
        )}

        {/* Character Count */}
        <Text style={styles.charCount}>
          {localStatement.length}/{maxLength}
        </Text>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <View style={styles.attachmentContainer}>
            <AttachmentRail
              attachments={attachments}
              onRemove={onRemoveAttachment}
              compact={compactAttachments}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.editActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
            <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={!isDirty}
          >
            <Icon name="check" size={18} color={theme.colors.onPrimary} />
            <Text style={styles.saveText}>{t('shared.statement.save')}</Text>
          </TouchableOpacity>
        </View>

        {/* EMOJI MODAL (Inline implementation to keep component self-contained) */}
        <Modal visible={emojiOpen} transparent animationType="none" onRequestClose={toggleEmoji}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={toggleEmoji}>
            <Animated.View
              style={[
                styles.emojiSheet,
                {
                  transform: [
                    {
                      translateY: emojiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.emojiHandle} />
              <Text style={styles.emojiTitle}>
                {t('gratitude.input.moods.primary', 'How does this make you feel?')}
              </Text>

              <View style={styles.emojiGrid}>
                {MOOD_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleSelectMood(emoji)}
                    style={[styles.emojiItem, localMood === emoji && styles.emojiItemActive]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => handleSelectMood(null)} style={styles.clearMoodBtn}>
                <Text style={styles.clearMoodText}>
                  {t('gratitude.input.moods.clear', 'Clear mood')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // Reading mode
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        {showQuotes && (
          <View style={styles.quoteIconContainer}>
            <Icon name="format-quote-open" size={14} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.spacer} />

        <View style={styles.spacer} />
      </View>

      {/* Actions Row (shown when menu is active) */}
      {showActions && (
        <View style={styles.actionsRow}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActions(false);
                onEdit();
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <Icon name="pencil-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.actionText}>{t('shared.statement.editButton')}</Text>
            </TouchableOpacity>
          )}

          {/* Share Button */}
          {onShare && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActions(false);
                onShare();
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  {
                    backgroundColor:
                      theme.colors.secondaryContainer ||
                      theme.colors.tertiaryContainer ||
                      theme.colors.primaryContainer,
                  },
                ]}
              >
                <Icon
                  name="share-variant-outline"
                  size={18}
                  color={theme.colors.secondary || theme.colors.primary}
                />
              </View>
              <Text style={styles.actionText}>
                {t('throwback.modal.share', { defaultValue: 'Share' })}
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setShowActions(false);
                handleDelete();
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <Icon name="trash-can-outline" size={18} color={theme.colors.error} />
              </View>
              <Text style={[styles.actionText, { color: theme.colors.error }]}>
                {t('shared.statement.deleteButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Statement Text */}
      <Text style={styles.statementText} numberOfLines={numberOfLines}>
        {statement}
      </Text>

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <View style={styles.attachmentContainer}>
          <AttachmentRail
            attachments={attachments}
            onRemove={onRemoveAttachment}
            compact={compactAttachments}
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dateRow}>
          <Icon name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.dateText}>{relativeTime}</Text>
          {moodEmoji && <Text style={styles.moodEmojiCompact}>{moodEmoji}</Text>}
        </View>

        {/* Inline Actions (SVG-style Icons) */}
        <View style={styles.inlineActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.inlineActionBtn} activeOpacity={0.6}>
              <Icon name="pencil-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity onPress={onShare} style={styles.inlineActionBtn} activeOpacity={0.6}>
              <Icon
                name="share-variant-outline"
                size={20}
                color={theme.colors.secondary || theme.colors.primary}
              />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.inlineActionBtn}
              activeOpacity={0.6}
            >
              <Icon name="trash-can-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Icon name="loading" size={24} color={theme.colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    quoteIconContainer: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spacer: {
      flex: 1,
    },
    menuButton: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.full,
    },
    actionIconContainer: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    statementText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      lineHeight: 26,
    },
    attachmentContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    dateText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    moodEmojiCompact: {
      fontSize: 16,
      marginLeft: theme.spacing.xs,
    },
    inlineActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    inlineActionBtn: {
      padding: 4,
    },
    moodEmoji: {
      fontSize: 18,
    },
    // Edit mode styles
    editHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    editIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    textInput: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginHorizontal: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant + '30',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: 'top',
    },
    charCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'right',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    editActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
    },
    cancelText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.surface + 'CC',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    moodSelectorButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant + '40',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.surface,
    },
    moodSelectorActive: {
      backgroundColor: theme.colors.primaryContainer,
      borderColor: theme.colors.primary,
    },
    moodSelectorEmoji: {
      fontSize: 18,
    },
    // Emoji Sheet Styles (Copied/Adapted from GratitudeInputBar)
    modalBackdrop: {
      flex: 1,
      backgroundColor: alpha(theme.colors.scrim, 0.4),
      justifyContent: 'flex-end',
    },
    emojiSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    emojiHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.outline + '40',
      alignSelf: 'center',
      borderRadius: 2,
      marginBottom: theme.spacing.lg,
    },
    emojiTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    emojiItem: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.full,
    },
    emojiItemActive: {
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    emojiText: {
      fontSize: 24,
    },
    clearMoodBtn: {
      marginTop: theme.spacing.lg,
      alignItems: 'center',
    },
    clearMoodText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default React.memo(StatementEditCard);
