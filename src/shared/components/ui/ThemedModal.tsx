import React from 'react';
import {
  DimensionValue,
  GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { unifiedShadows } from '../../../themes/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ThemedModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Title of the modal
   */
  title?: string;
  /**
   * Function to call when the modal is requested to be closed
   */
  onClose: () => void;
  /**
   * Content to display in the modal
   */
  children: React.ReactNode;
  /**
   * Size of the modal
   * @default 'md'
   */
  size?: ModalSize;
  /**
   * Density of the modal content spacing
   * @default 'standard'
   */
  density?: 'compact' | 'standard' | 'comfortable';
  /**
   * Whether to close the modal when clicking outside
   * @default true
   */
  closeOnBackdropPress?: boolean;
  /**
   * Whether to show a close button in the header
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Custom header component to replace the default header
   */
  customHeader?: React.ReactNode;
  /**
   * Custom footer component
   */
  footer?: React.ReactNode;
  /**
   * Whether to avoid keyboard
   * @default true
   */
  avoidKeyboard?: boolean;
  /**
   * Whether content should be scrollable
   * @default true
   */
  scrollable?: boolean;
  /**
   * Additional style for the modal container
   */
  containerStyle?: ViewStyle;
  /**
   * Additional style for the modal content
   */
  contentStyle?: ViewStyle;
  /**
   * Additional style for the modal header
   */
  headerStyle?: ViewStyle;
  /**
   * Additional style for the modal title
   */
  titleStyle?: TextStyle;
  /**
   * Additional style for the modal footer
   */
  footerStyle?: ViewStyle;
  /**
   * Accessibility label for the close button
   */
  closeButtonAccessibilityLabel?: string;
}

/**
 * A themed modal component that provides consistent styling and behavior
 * across the application. Supports different sizes, custom headers/footers,
 * and keyboard avoiding behavior.
 */
const ThemedModal: React.FC<ThemedModalProps> = ({
  visible,
  title,
  onClose,
  children,
  size = 'md',
  density = 'standard',
  closeOnBackdropPress = true,
  showCloseButton = true,
  customHeader,
  footer,
  avoidKeyboard = true,
  scrollable = true,
  containerStyle,
  contentStyle,
  headerStyle,
  titleStyle,
  footerStyle,
  closeButtonAccessibilityLabel = 'Kapat',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, size, density);

  // Handle backdrop press
  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  // Prevent press events from propagating to the backdrop
  const handleModalPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
  };

  // Render the modal content
  const renderContent = () => {
    const content = <View style={[styles.contentContainer, contentStyle]}>{children}</View>;

    if (scrollable) {
      return (
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      );
    }

    return content;
  };

  // Render the modal header
  const renderHeader = () => {
    if (customHeader) {
      return customHeader;
    }

    if (!title && !showCloseButton) {
      return null;
    }

    return (
      <View style={[styles.header, headerStyle]}>
        {title ? (
          <Text style={[styles.title, titleStyle]} numberOfLines={2}>
            {title}
          </Text>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        {showCloseButton && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
            accessibilityLabel={closeButtonAccessibilityLabel}
            accessibilityRole="button"
          >
            <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      animationType="none"
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={handleModalPress}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoidingView}
              enabled={avoidKeyboard}
            >
              <View style={[styles.container, containerStyle]}>
                {renderHeader()}
                {renderContent()}
                {footer && <View style={[styles.footer, footerStyle]}>{footer}</View>}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (
  theme: AppTheme,
  size: ModalSize,
  density: 'compact' | 'standard' | 'comfortable'
) => {
  // Calculate modal width based on size
  let modalWidth: DimensionValue = '80%';
  let maxHeight: DimensionValue = '70%';

  switch (size) {
    case 'sm':
      modalWidth = '70%';
      maxHeight = '50%';
      break;
    case 'md':
      modalWidth = '85%';
      maxHeight = '70%';
      break;
    case 'lg':
      modalWidth = '90%';
      maxHeight = '80%';
      break;
    case 'full':
      modalWidth = '95%';
      maxHeight = '90%';
      break;
  }

  // Modern spacing based on density
  const getSpacing = () => {
    switch (density) {
      case 'compact':
        return {
          horizontal: theme.spacing.sm, // 8px
          vertical: theme.spacing.xs, // 4px
          closeButton: theme.spacing.xxs, // 2px
        };
      case 'comfortable':
        return {
          horizontal: theme.spacing.xl, // 32px
          vertical: theme.spacing.lg, // 24px
          closeButton: theme.spacing.sm, // 8px
        };
      case 'standard':
      default:
        return {
          horizontal: theme.spacing.md, // 16px modern standard
          vertical: theme.spacing.sm, // 8px
          closeButton: theme.spacing.xs, // 4px
        };
    }
  };

  const spacing = getSpacing();

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    keyboardAvoidingView: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      width: modalWidth,
      maxHeight,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      // 🌟 Beautiful unified shadow for modal overlay
      ...unifiedShadows(theme).overlay,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.horizontal,
      paddingVertical: spacing.vertical,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceVariant,
    },
    headerSpacer: {
      flex: 1,
    },
    title: {
      flex: 1,
      fontFamily: 'Lora-Medium', // Serif for modal titles - consistent journal hierarchy
      fontSize: theme.typography.titleLarge.fontSize,
      fontWeight: '600', // Adjusted for serif readability
      lineHeight: theme.typography.titleLarge.lineHeight,
      letterSpacing: theme.typography.titleLarge.letterSpacing,
      color: theme.colors.onSurface,
    },
    closeButton: {
      padding: spacing.closeButton,
      marginLeft: theme.spacing.sm,
    },
    contentContainer: {
      paddingHorizontal: spacing.horizontal,
      paddingVertical: spacing.vertical,
    },
    scrollContent: {
      flexGrow: 1,
    },
    footer: {
      paddingHorizontal: spacing.horizontal,
      paddingVertical: spacing.vertical,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceVariant,
    },
  });
};

export default ThemedModal;
