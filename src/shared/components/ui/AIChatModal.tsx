import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';
import { useGratitudeChat } from '@/features/gratitude/hooks/useGratitudeChat';
import { useLanguageStore } from '@/store/languageStore';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { TFunction } from 'i18next';
import { AIUsageIndicator } from './AIUsageIndicator';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  recentEntries?: string[];
  context?: 'daily' | 'calendar' | 'streak';
  streakCount?: number;
}

const TypingIndicator = ({ modalStyles }: { modalStyles: ReturnType<typeof createStyles> }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            delay,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, [dot1, dot2, dot3]);

  return (
    <View style={modalStyles.dotContainer}>
      <Animated.View
        style={[
          modalStyles.dot,
          {
            backgroundColor: (modalStyles.dot as ViewStyle).backgroundColor || '#000',
            opacity: dot1,
            transform: [{ scale: dot1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          modalStyles.dot,
          {
            backgroundColor: (modalStyles.dot as ViewStyle).backgroundColor || '#000',
            opacity: dot2,
            transform: [{ scale: dot2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          modalStyles.dot,
          {
            backgroundColor: (modalStyles.dot as ViewStyle).backgroundColor || '#000',
            opacity: dot3,
            transform: [{ scale: dot3 }],
          },
        ]}
      />
    </View>
  );
};

const Suggestions = ({
  onSelect,
  modalStyles,
  t,
}: {
  onSelect: (text?: string) => void;

  modalStyles: ReturnType<typeof createStyles>;
  t: TFunction;
}) => {
  const suggestions = [
    { id: 'gratitude', icon: 'heart-broken-outline' },
    { id: 'find', icon: 'magnify' },
    { id: 'reflect', icon: 'mirror' },
  ];

  return (
    <View style={modalStyles.suggestionsContainer}>
      <Text style={modalStyles.suggestionsTitle}>{t('ai.chat.suggests', '✨ Suggestions')}</Text>
      <View style={modalStyles.chipsRow}>
        {suggestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={modalStyles.suggestionChip}
            onPress={() => onSelect(t(`ai.chat.suggestions.${item.id}`))}
          >
            <Icon name={item.icon} size={16} color={modalStyles.suggestionText.color} />
            <Text style={modalStyles.suggestionText}>{t(`ai.chat.suggestions.${item.id}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export const AIChatModal: React.FC<AIChatModalProps> = ({
  visible,
  onClose,
  recentEntries = [],
  context = 'daily',
  streakCount = 0,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalStyles = useMemo(() => createStyles(theme, insets), [theme, insets]);
  const language = useLanguageStore((state) => state.language);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { messages, isLoading, sendMessage, clearChat, remaining, resetInSeconds } =
    useGratitudeChat({
      language: language === 'tr' ? 'tr' : 'en',
      recentEntries,
    });

  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Animation handling
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
          // Use a slightly faster exit for better feel
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [slideAnim, backdropAnim, onClose]);

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = textOverride || inputText.trim();
      if (!text || isLoading) {
        return;
      }

      // Immediate check for limit
      if (remaining === 0) {
        setShowLimitModal(true);
        return;
      }

      setInputText('');
      hapticFeedback.light();
      await sendMessage(text);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [inputText, isLoading, sendMessage, remaining]
  );

  const handleClear = useCallback(() => {
    clearChat();
    hapticFeedback.light();
  }, [clearChat]);

  const getGreeting = useMemo(() => {
    if (context === 'streak' && streakCount > 0) {
      return t('ai.chat.context.streak', { count: streakCount });
    }
    if (context === 'daily' && recentEntries.length === 0) {
      return t('ai.chat.context.default');
    }
    return t('ai.chat.context.default');
  }, [context, streakCount, recentEntries.length, t]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View
        style={[
          modalStyles.messageBubble,
          item.role === 'user' ? modalStyles.userBubble : modalStyles.aiBubble,
        ]}
      >
        {item.role === 'assistant' && (
          <View style={modalStyles.aiAvatar}>
            <Text style={modalStyles.aiAvatarText}>🌱</Text>
          </View>
        )}
        <View
          style={[
            modalStyles.messageContent,
            item.role === 'user' ? modalStyles.userContent : modalStyles.aiContent,
          ]}
        >
          <Text
            style={[
              modalStyles.messageText,
              item.role === 'user' ? modalStyles.userText : modalStyles.aiText,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    ),
    [modalStyles]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={modalStyles.emptyState}>
        <View style={modalStyles.emptyAvatar}>
          <Text style={modalStyles.emptyAvatarText}>🌱</Text>
        </View>
        <Text style={modalStyles.emptyTitle}>{t('ai.chat.title', '💬 Yeşer AI')}</Text>
        <Text style={modalStyles.emptyText}>{getGreeting}</Text>
        <Suggestions onSelect={handleSend} modalStyles={modalStyles} t={t} />
      </View>
    ),
    [t, modalStyles, getGreeting, handleSend]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[modalStyles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.keyboardAvoidingView}
        >
          <Animated.View
            style={[
              modalStyles.sheetContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle for drag indicator */}
            <View style={modalStyles.dragHandle} />

            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.headerTitle}>{t('ai.chat.title', '💬 Yeşer AI')}</Text>
              <View style={modalStyles.headerActions}>
                <TouchableOpacity onPress={handleClear} style={modalStyles.iconButton}>
                  <Icon
                    name="delete-sweep-outline"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={modalStyles.iconButton}>
                  <Icon name="close" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(_, index) => `msg-${index}`}
              contentContainerStyle={modalStyles.messageList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              ListFooterComponent={
                isLoading ? (
                  <View style={modalStyles.loadingBubble}>
                    <View style={modalStyles.aiAvatar}>
                      <Text style={modalStyles.aiAvatarText}>🌱</Text>
                    </View>
                    <View style={[modalStyles.messageContent, modalStyles.aiContent]}>
                      <TypingIndicator modalStyles={modalStyles} />
                    </View>
                  </View>
                ) : null
              }
            />

            {/* Input */}
            <View style={modalStyles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={modalStyles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('ai.chat.placeholder', 'Share your thoughts...')}
                placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
                multiline
                maxLength={500}
                editable={!isLoading}
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                style={[
                  modalStyles.sendButton,
                  (!inputText.trim() || isLoading) && modalStyles.sendButtonDisabled,
                ]}
              >
                <Icon
                  name="arrow-up"
                  size={20}
                  color={
                    inputText.trim() && !isLoading
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Usage */}
            <View style={modalStyles.usageContainer}>
              <AIUsageIndicator remaining={remaining} resetInSeconds={resetInSeconds} showAlways />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={modalStyles.limitBackdrop}>
          <View style={modalStyles.limitSheet}>
            <Text style={modalStyles.limitTitle}>
              {t('ai.usage.limit_reached', 'Daily AI Limit Reached')}
            </Text>
            <View style={modalStyles.limitContent}>
              <Text style={modalStyles.limitMessage}>
                {t('ai.usage.limit_desc', 'You have used all your AI interactions for today.')}
              </Text>
              <AIUsageIndicator remaining={0} resetInSeconds={resetInSeconds} showAlways={true} />
            </View>
            <TouchableOpacity
              onPress={() => setShowLimitModal(false)}
              style={modalStyles.limitCloseBtn}
            >
              <Text style={modalStyles.limitCloseText}>{t('shared.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const createStyles = (theme: AppTheme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim,
    },
    sheetContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      height: '85%',
      paddingBottom: Math.max(insets.bottom, 20),
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.outline + '40',
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '10',
    },
    headerTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant + '20',
    },
    keyboardAvoidingView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    messageList: {
      padding: theme.spacing.lg,
      flexGrow: 1,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: 40,
      paddingHorizontal: theme.spacing.md,
    },
    emptyAvatar: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyAvatarText: { fontSize: 32 },
    emptyTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
    },
    emptyText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    suggestionsContainer: { width: '100%', alignItems: 'center', gap: 12, marginTop: 20 },
    suggestionsTitle: {
      ...theme.typography.labelSmall,
      opacity: 0.7,
      color: theme.colors.onSurfaceVariant,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    suggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      backgroundColor: theme.colors.surfaceVariant + '10',
    },
    suggestionText: { ...theme.typography.bodyMedium, color: theme.colors.onSurface },
    messageBubble: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end', gap: 8 },
    userBubble: { justifyContent: 'flex-end' },
    aiBubble: { justifyContent: 'flex-start' },
    aiAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiAvatarText: { fontSize: 14 },
    messageContent: { maxWidth: '80%', padding: 12, borderRadius: 20 },
    userContent: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 4,
    },
    aiContent: {
      backgroundColor: theme.colors.surfaceVariant + '50',
      borderBottomLeftRadius: 4,
    },
    messageText: { ...theme.typography.bodyMedium, lineHeight: 20 },
    userText: { color: theme.colors.onPrimary },
    aiText: { color: theme.colors.onSurface },
    loadingBubble: { flexDirection: 'row', marginLeft: 0, marginTop: 4, gap: 8 },
    inputContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      alignItems: 'flex-end',
      gap: 12,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant + '50',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 120,
      minHeight: 44,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: { backgroundColor: theme.colors.surfaceVariant },
    remainingText: {
      textAlign: 'center',
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    usageContainer: {
      alignItems: 'center',
      paddingBottom: 8,
    },
    limitBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
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
    // Typing dots
    dotContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 20,
      paddingHorizontal: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginHorizontal: 2,
    },
  });

export default AIChatModal;
