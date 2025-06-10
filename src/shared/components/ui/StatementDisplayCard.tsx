import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import {
  BaseStatementCardProps,
  createSharedStyles,
  formatStatementDate,
  StatementCardWrapper,
  truncateStatement,
  useHapticFeedback,
  useResponsiveLayout,
  useStatementCardAnimations,
} from './StatementCardBase';

// 🏠 HOME/THROWBACK SPECIFIC PROPS
interface StatementDisplayCardProps extends BaseStatementCardProps {
  variant?: 'memory' | 'inspiration' | 'elegant';
  showTimestamp?: boolean;
  showQuotes?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean; // New prop for edge-to-edge layout
}

/**
 * 🏠 StatementDisplayCard - Optimized for Home/Throwback Usage
 *
 * DESIGN FOCUS:
 * - Inspirational reading experience with enhanced typography
 * - Beautiful quote styling with improved visual hierarchy
 * - Subtle animations with spring physics
 * - Edge-to-edge layout adaptability
 * - Read-only, distraction-free display
 * - Perfect for ThrowbackTeaser component
 */
const StatementDisplayCardComponent: React.FC<StatementDisplayCardProps> = ({
  statement,
  date,
  variant = 'memory',
  showTimestamp = true,
  showQuotes = true,
  numberOfLines,
  animateEntrance = true,
  onPress,
  style,
  accessibilityLabel,
  hapticFeedback = true,
  edgeToEdge = false,
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();

  // OPTIMIZED: Memoize shared styles to prevent recreation on every render
  const sharedStyles = useMemo(() => createSharedStyles(theme, layout), [theme, layout]);
  const styles = useMemo(() => createStyles(theme, sharedStyles), [theme, sharedStyles]);

  const animations = useStatementCardAnimations();
  const { triggerHaptic } = useHapticFeedback(hapticFeedback);

  // Enhanced date formatting for memories - MEMOIZED
  const { relativeTime, isRecent } = useMemo(() => formatStatementDate(date), [date]);
  const { text: displayText, isTruncated } = useMemo(
    () => truncateStatement(statement, 200),
    [statement]
  );

  // Entrance animation with improved timing - OPTIMIZED DEPENDENCIES
  useEffect(() => {
    if (animateEntrance) {
      animations.animateEntrance();
    }
  }, [animateEntrance, animations]);

  // Handle press with enhanced haptic feedback - MEMOIZED
  const handlePress = useCallback(() => {
    if (onPress) {
      triggerHaptic('selection');
      onPress();
    }
  }, [onPress, triggerHaptic]);

  // Get variant-specific styles with enhanced typography - MEMOIZED
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'inspiration':
        return {
          container: styles.inspirationContainer,
          content: styles.inspirationContent,
          statement: styles.inspirationStatement,
          footer: styles.inspirationFooter,
        };
      case 'elegant':
        return {
          container: styles.elegantContainer,
          content: styles.elegantContent,
          statement: styles.elegantStatement,
          footer: styles.elegantFooter,
        };
      case 'memory':
      default:
        return {
          container: styles.memoryContainer,
          content: styles.memoryContent,
          statement: styles.memoryStatement,
          footer: styles.memoryFooter,
        };
    }
  }, [variant, styles]);

  const CardContent = (
    <StatementCardWrapper
      animations={animations}
      style={style ? [variantStyles.container, style] : variantStyles.container}
      edgeToEdge={edgeToEdge}
    >
      <View style={variantStyles.content}>
        {/* Enhanced Quote Icon with better positioning */}
        {showQuotes && (
          <View style={styles.quoteSection}>
            <Icon
              name="format-quote-open"
              size={variant === 'inspiration' ? 28 : layout.isCompact ? 20 : 24}
              color={theme.colors.primary + (variant === 'inspiration' ? '50' : '40')}
              style={styles.quoteIcon}
            />
          </View>
        )}

        {/* Enhanced Statement Display with better typography */}
        <View style={styles.statementSection}>
          <Text
            style={variantStyles.statement}
            numberOfLines={numberOfLines}
            accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
          >
            {displayText}
          </Text>

          {/* Enhanced truncation indicator */}
          {isTruncated && (
            <View style={styles.truncationIndicator}>
              <Icon name="dots-horizontal" size={18} color={theme.colors.onSurfaceVariant + '60'} />
              <Text style={styles.truncationText}>devamını oku</Text>
            </View>
          )}
        </View>

        {/* Enhanced Memory Timestamp with better visual hierarchy */}
        {showTimestamp && date && (
          <View style={variantStyles.footer}>
            <View style={styles.timestampLine} />
            <View style={styles.timestampContainer}>
              <Icon
                name={isRecent ? 'clock-outline' : 'history'}
                size={14}
                color={theme.colors.onSurfaceVariant + (isRecent ? '90' : '70')}
              />
              <Text style={[styles.timestampText, isRecent && styles.recentTimestamp]}>
                {relativeTime}
              </Text>
            </View>
          </View>
        )}
      </View>
    </StatementCardWrapper>
  );

  // Enhanced TouchableOpacity with better feedback
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        accessibilityLabel={accessibilityLabel || `Minnet anısı: ${statement}`}
        accessibilityRole="button"
        accessibilityHint="Detayları görüntülemek için dokunun"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const StatementDisplayCard = React.memo(StatementDisplayCardComponent);
StatementDisplayCard.displayName = 'StatementDisplayCard';

// 🎨 ENHANCED STYLES FOR DISPLAY CARD
const createStyles = (theme: AppTheme, sharedStyles: ReturnType<typeof createSharedStyles>) =>
  StyleSheet.create({
    // Memory Variant - Enhanced nostalgic and warm feeling
    memoryContainer: {
      ...sharedStyles.getContainerStyle('elevated'),
      backgroundColor: theme.colors.surface,
      borderLeftWidth: sharedStyles.layout.isCompact ? 3 : 4,
      borderLeftColor: theme.colors.primary + '70',
    } as ViewStyle,

    memoryContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      position: 'relative',
    } as ViewStyle,

    memoryStatement: {
      ...sharedStyles.typography.statement.primary,
      color: sharedStyles.colors.primary,
      fontStyle: 'italic',
      textAlign: 'left',
      marginBottom: sharedStyles.spacing.contentGap,
      textShadowColor: theme.colors.shadow + '05',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },

    memoryFooter: {
      marginTop: sharedStyles.spacing.contentGap,
    } as ViewStyle,

    // Inspiration Variant - Enhanced uplifting and prominent
    inspirationContainer: {
      ...sharedStyles.getContainerStyle('highlighted'),
    } as ViewStyle,

    inspirationContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('lg'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('md'),
      alignItems: 'center',
    } as ViewStyle,

    inspirationStatement: {
      ...sharedStyles.typography.statement.primary,
      fontSize: sharedStyles.layout.isCompact ? 18 : 20,
      fontWeight: '700',
      color: sharedStyles.colors.primary,
      fontStyle: 'italic',
      lineHeight: sharedStyles.layout.isCompact ? 28 : 32,
      letterSpacing: 0.5,
      textAlign: 'center',
      marginBottom: sharedStyles.spacing.contentGap + 2,
      textShadowColor: theme.colors.shadow + '15',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },

    inspirationFooter: {
      alignItems: 'center',
      marginTop: sharedStyles.spacing.contentGap + 2,
    } as ViewStyle,

    // Elegant Variant - Enhanced refined and minimal
    elegantContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    } as ViewStyle,

    elegantContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
    } as ViewStyle,

    elegantStatement: {
      ...sharedStyles.typography.statement.secondary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
      textAlign: 'left',
      marginBottom: sharedStyles.spacing.elementGap,
    },

    elegantFooter: {
      marginTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    // Enhanced Quote Section
    quoteSection: {
      position: 'absolute',
      top: -4,
      left: sharedStyles.layout.isCompact ? 0 : 2,
      zIndex: 1,
    } as ViewStyle,

    quoteIcon: {
      opacity: 0.4,
      transform: [{ scale: sharedStyles.layout.isCompact ? 1 : 1.1 }],
    },

    // Enhanced Statement Section
    statementSection: {
      flex: 1,
      paddingTop: sharedStyles.spacing.elementGap + 2,
    } as ViewStyle,

    // Enhanced Truncation Indicator
    truncationIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: sharedStyles.spacing.contentGap,
      gap: sharedStyles.spacing.elementGap / 2,
    } as ViewStyle,

    truncationText: {
      ...sharedStyles.typography.metadata.secondary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
    },

    // Enhanced Timestamp Section
    timestampLine: {
      height: 1,
      backgroundColor: theme.colors.outline + '25',
      marginBottom: sharedStyles.spacing.contentGap,
    } as ViewStyle,

    timestampContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    timestampText: {
      ...sharedStyles.typography.metadata.primary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
    },

    // Recent timestamp enhancement
    recentTimestamp: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
  });

export default StatementDisplayCard;
