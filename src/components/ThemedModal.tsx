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

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

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
  const styles = createStyles(theme, size);

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
    const content = (
      <View style={[styles.contentContainer, contentStyle]}>{children}</View>
    );

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
            <Icon
              name="close"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
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
                {footer && (
                  <View style={[styles.footer, footerStyle]}>{footer}</View>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (theme: AppTheme, size: ModalSize) => {
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
      ...theme.elevation.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceVariant,
    },
    headerSpacer: {
      flex: 1,
    },
    title: {
      flex: 1,
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
    },
    closeButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    scrollContent: {
      flexGrow: 1,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceVariant,
    },
  });
};

export default ThemedModal;
