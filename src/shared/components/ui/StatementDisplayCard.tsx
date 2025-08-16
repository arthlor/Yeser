import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha, blend, darken, lighten } from '@/themes/utils';
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
import { LinearGradient } from 'expo-linear-gradient';

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

  // Premium border gradient (Apple-like polish) for all variants
  const borderGradientColors = useMemo(() => {
    const isLight = theme.name === 'light';
    const primaryEdge = alpha(theme.colors.primary, isLight ? 0.6 : 0.5);
    const midBlend1 = blend(
      theme.colors.primary,
      theme.colors.secondary || theme.colors.primary,
      0.5
    );
    const midBlend2 = blend(
      theme.colors.primary,
      theme.colors.tertiary || theme.colors.primary,
      0.5
    );
    const mid1 = alpha(midBlend1, isLight ? 0.38 : 0.32);
    const mid2 = alpha(midBlend2, isLight ? 0.28 : 0.24);
    return [primaryEdge, mid1, mid2, primaryEdge] as const;
  }, [theme]);
  const borderGradientLocations = useMemo(() => [0, 0.33, 0.67, 1] as const, []);
  const borderGradientStart = useMemo(() => ({ x: 0.08, y: 0 }) as const, []);
  const borderGradientEnd = useMemo(() => ({ x: 0.92, y: 1 }) as const, []);

  // Subtle surface sheen overlay
  const surfaceGradientColors = useMemo(() => {
    const isLight = theme.name === 'light';
    const topSheen = alpha(
      lighten(theme.colors.surface, isLight ? 0.06 : 0.03),
      isLight ? 0.9 : 0.85
    );
    const bottomTint = alpha(
      blend(
        darken(theme.colors.surface, isLight ? 0.02 : 0.04),
        theme.colors.primary,
        isLight ? 0.06 : 0.04
      ),
      isLight ? 0.9 : 0.85
    );
    return [topSheen, bottomTint] as const;
  }, [theme]);
  const surfaceGradientStart = useMemo(() => ({ x: 0, y: 0 }) as const, []);
  const surfaceGradientEnd = useMemo(() => ({ x: 0, y: 1 }) as const, []);

  const animations = useStatementCardAnimations();
  const { triggerHaptic } = useHapticFeedback(hapticFeedback);

  // Enhanced date formatting for memories - MEMOIZED
  const { relativeTime, isRecent } = useMemo(() => formatStatementDate(date), [date]);
  const { text: displayText, isTruncated } = useMemo(
    () => truncateStatement(statement, 200),
    [statement]
  );
  const [expanded, setExpanded] = useState(false);

  // **SIMPLIFIED ENTRANCE**: Remove complex entrance animation
  // Following minimal animation philosophy - cards appear naturally
  useEffect(() => {
    if (animateEntrance) {
      // Simple haptic feedback for card appearance instead of animation
      triggerHaptic('light');
    }
  }, [animateEntrance, triggerHaptic]);

  // Handle press with enhanced haptic feedback - MEMOIZED
  const handlePress = useCallback(() => {
    if (onPress) {
      triggerHaptic('selection');
      onPress();
    } else if (isTruncated) {
      // Expand in place if there is no external onPress handler
      triggerHaptic('light');
      setExpanded(true);
    }
  }, [onPress, triggerHaptic, isTruncated]);

  const handleLongPress = useCallback(async () => {
    try {
      await Share.share({ message: statement });
      triggerHaptic('success');
    } catch {
      // no-op; keep quiet on cancel
    }
  }, [statement, triggerHaptic]);

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
      {/* Premium gradient border and sheen overlay */}
      <LinearGradient
        colors={borderGradientColors}
        locations={borderGradientLocations}
        style={styles.gradientBorder}
        start={borderGradientStart}
        end={borderGradientEnd}
      />
      <LinearGradient
        colors={surfaceGradientColors}
        style={styles.surfaceGradientOverlay}
        start={surfaceGradientStart}
        end={surfaceGradientEnd}
      />

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
            numberOfLines={expanded ? undefined : numberOfLines}
            accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
            selectable={!onPress}
          >
            {expanded ? statement : displayText}
          </Text>

          {/* Enhanced truncation indicator */}
          {isTruncated && !expanded && (
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
        onLongPress={handleLongPress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        accessibilityLabel={accessibilityLabel || `Minnet anısı: ${statement}`}
        accessibilityRole="button"
        accessibilityHint={
          isTruncated
            ? 'Detayları görüntülemek veya genişletmek için dokunun'
            : 'Detayları görüntülemek için dokunun'
        }
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={1} onLongPress={handleLongPress}>
      {CardContent}
    </TouchableOpacity>
  );
};

const StatementDisplayCard = React.memo(StatementDisplayCardComponent);
StatementDisplayCard.displayName = 'StatementDisplayCard';

// 🎨 ENHANCED STYLES FOR DISPLAY CARD
const createStyles = (theme: AppTheme, sharedStyles: ReturnType<typeof createSharedStyles>) =>
  StyleSheet.create({
    gradientBorder: {
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: theme.borderRadius.md + 1,
      opacity: 1,
    } as ViewStyle,
    surfaceGradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: theme.borderRadius.md,
      opacity: 0.9,
    } as ViewStyle,
    // Memory Variant - Enhanced nostalgic and warm feeling
    memoryContainer: {
      ...sharedStyles.getContainerStyle('elevated'),
      backgroundColor: theme.colors.surface,
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
      // Remove thick left accent for a cleaner look on Home throwbacks
      borderLeftWidth: 0,
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
