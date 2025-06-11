import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import type { AppTheme } from '@/themes/types';

export interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showError: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showWarning: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showInfo: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * 🎯 COORDINATED TOAST SYSTEM
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated complex Animated.parallel sequences
 * - Replaced with coordinated animation system
 * - Simplified animation approach following "Barely Noticeable, Maximum Performance"
 * - Preserved essential toast functionality for user feedback
 */

const getToastConfig = (theme: AppTheme, type: ToastState['type']) => {
  const baseConfig = {
    // Modern minimalistic approach with subtle glass-morphism effect
    backgroundColor:
      theme.name === 'dark'
        ? 'rgba(32, 35, 42, 0.95)' // Dark mode: deep charcoal with transparency
        : 'rgba(255, 255, 255, 0.95)', // Light mode: white with transparency

    borderColor: theme.colors.outline + '40', // Very subtle border
    textColor: theme.colors.onSurface,
    shadowColor: theme.name === 'dark' ? '#000000' : '#000000',
  };

  switch (type) {
    case 'success':
      return {
        ...baseConfig,
        accentColor: theme.colors.success,
        iconName: 'check-circle' as const,
        // Subtle success tint
        borderColor: theme.colors.success + '30',
      };
    case 'error':
      return {
        ...baseConfig,
        accentColor: theme.colors.error,
        iconName: 'alert-circle' as const,
        borderColor: theme.colors.error + '30',
      };
    case 'warning':
      return {
        ...baseConfig,
        accentColor: theme.colors.warning,
        iconName: 'alert' as const,
        borderColor: theme.colors.warning + '30',
      };
    case 'info':
    default:
      return {
        ...baseConfig,
        accentColor: theme.colors.primary,
        iconName: 'information' as const,
        borderColor: theme.colors.primary + '30',
      };
  }
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 4000,
  });

  // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
  const animations = useCoordinatedAnimations();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // **COORDINATED HIDE**: Simple fade out
    animations.animateFade(0, { duration: 200 });

    // Hide after animation completes
    setTimeout(() => {
      setToastState((prev) => ({ ...prev, visible: false }));
    }, 200);
  }, [animations]);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const { duration = 4000, type = 'info', action } = options;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update state
      setToastState({
        visible: true,
        message,
        type,
        duration,
        action,
      });

      // **COORDINATED SHOW**: Simple entrance animation
      animations.animateEntrance({ duration: 300 });

      // Auto hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [animations, hideToast]
  );

  const showSuccess = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'error' });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'warning' });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'info' });
    },
    [showToast]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Memoize config to prevent unnecessary re-renders
  const toastConfig = useMemo(
    () => getToastConfig(theme, toastState.type),
    [theme, toastState.type]
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: ToastContextType = useMemo(
    () => ({
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      hideToast,
    }),
    [showToast, showSuccess, showError, showWarning, showInfo, hideToast]
  );

  const styles = createStyles(theme, insets, toastConfig);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastState.visible && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: animations.entranceTransform,
              opacity: animations.fadeAnim,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.98} onPress={hideToast} style={styles.toast}>
            {/* Accent line for visual hierarchy */}
            <View style={[styles.accentLine, { backgroundColor: toastConfig.accentColor }]} />

            {/* Content container */}
            <View style={styles.content}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Icon name={toastConfig.iconName} size={18} color={toastConfig.accentColor} />
              </View>

              {/* Message */}
              <Text style={styles.message} numberOfLines={3}>
                {toastState.message}
              </Text>

              {/* Action button if provided */}
              {toastState.action && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    toastState.action?.onPress();
                    hideToast();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.actionText, { color: toastConfig.accentColor }]}>
                    {toastState.action.label}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';

const createStyles = (
  theme: AppTheme,
  insets: { top: number; bottom: number; left: number; right: number },
  config: ReturnType<typeof getToastConfig>
) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: insets.top + 8, // Respectful spacing from status bar
      left: 16,
      right: 16,
      zIndex: 9999,
    },
    toast: {
      backgroundColor: config.backgroundColor,
      borderRadius: 12, // Modern rounded corners
      borderWidth: 1,
      borderColor: config.borderColor,

      // Sophisticated shadow system
      shadowColor: config.shadowColor,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: theme.name === 'dark' ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 8, // Android elevation

      // Subtle backdrop blur effect simulation
      overflow: 'hidden',
    },
    accentLine: {
      height: 3,
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingTop: 17, // Account for accent line
    },
    iconContainer: {
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    message: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: config.textColor,
      fontWeight: '500',
      letterSpacing: -0.1,
    },
    actionButton: {
      marginLeft: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: config.accentColor + '15', // Subtle background
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
  });
