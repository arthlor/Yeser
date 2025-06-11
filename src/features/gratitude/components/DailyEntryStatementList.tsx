import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { StatementCard } from '@/shared/components/ui';
import { getPrimaryShadow } from '@/themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Assuming 'statements' are an array of strings for now.
// If they are objects, this type should be adjusted.
interface DailyEntryStatementListProps {
  statements: string[]; // Adjust if statements are objects
  isToday: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // 🚫 REMOVED: All editing props removed since this is now read-only
  // editingStatementIndex, onEdit, onDelete, onSave, onCancel removed
  // Editing is handled by the parent DailyEntryScreen component
}

// **RACE CONDITION FIX**: Separate component for individual statement animations - moved outside main component
const StatementItemWrapper: React.FC<{
  item: string;
  index: number;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}> = React.memo(({ item, index, styles, theme }) => {
  // Create individual coordinated animations for each item
  const itemAnimations = useCoordinatedAnimations();
  
  // **SIMPLIFIED STAGGER**: Use minimal animation with proper config
  useEffect(() => {
    const delay = Math.min(index * 100, 500); // Cap stagger delay
    itemAnimations.animateEntrance({ duration: 300 + delay });
  }, [index, itemAnimations]);

  return (
    <Animated.View
      style={[
        styles.statementItemContainer,
        {
          opacity: itemAnimations.fadeAnim,
          transform: [
            ...itemAnimations.combinedTransform,
            {
              translateY: itemAnimations.fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <StatementCard
        statement={item}
        variant="minimal"
        showQuotes={false}
        animateEntrance={false} // Already animated by coordinated system
        // Configuration for minimal list variant - READ-ONLY MODE
        enableInlineEdit={false} // Disabled: handled by parent screen
        maxLength={500}
        // Accessibility
        accessibilityLabel={`Minnet: ${item}`}
        hapticFeedback={false}
        style={{
          marginBottom: theme.spacing.sm,
        }}
        // 🚫 REMOVED: Edit/delete functionality to prevent conflicts
        // isEditing, onEdit, onDelete, onCancel, onSave removed
        // All editing is handled by the parent DailyEntryScreen
      />
    </Animated.View>
  );
});

StatementItemWrapper.displayName = 'StatementItemWrapper';

const DailyEntryStatementList: React.FC<DailyEntryStatementListProps> = ({
  statements,
  isToday,
  onRefresh,
  isRefreshing = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // **RACE CONDITION FIX**: Use coordinated animation system
  const animations = useCoordinatedAnimations();
  
  // Track previous statements length for staggered animations
  const previousLengthRef = useRef(statements.length);
  const animationTriggeredRef = useRef(false);

  // **RACE CONDITION FIX**: Coordinated staggered entrance animations
  const triggerStaggeredAnimations = useCallback(() => {
    if (statements.length > 0 && !animationTriggeredRef.current) {
      // Use coordinated entrance animation for the list
      animations.animateEntrance({ duration: 300 });
      animationTriggeredRef.current = true;
    }
  }, [statements.length, animations]);

  // Initialize animations when statements change
  useEffect(() => {
    const currentLength = statements.length;
    const previousLength = previousLengthRef.current;

    // Reset animation trigger when statements change significantly
    if (currentLength !== previousLength) {
      animationTriggeredRef.current = false;
      triggerStaggeredAnimations();
      previousLengthRef.current = currentLength;
    }
  }, [statements, triggerStaggeredAnimations]);

  // **RACE CONDITION FIX**: Memoized render function with coordinated animations
  const renderStatementItem = useCallback(({ item, index }: ListRenderItemInfo<string>) => {
    return (
      <StatementItemWrapper 
        item={item} 
        index={index} 
        styles={styles} 
        theme={theme} 
      />
    );
  }, [styles, theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <ThemedCard variant="outlined" style={styles.emptyCard}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconContainer}>
            <Icon
              name={isToday ? 'heart-plus-outline' : 'book-open-outline'}
              size={48}
              color={theme.colors.primary + '40'}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isToday ? 'İlk minnetini ekle!' : 'O gün henüz minnet eklemedin'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isToday
              ? 'Bugün minnettarlık hissettiğin anları yazarak güne başla.'
              : 'Bu tarihte henüz bir minnet ifadesi bulunmuyor.'}
          </Text>
        </View>
      </ThemedCard>
    </View>
  ), [isToday, styles, theme]);

  const renderSeparator = useCallback(() => <View style={styles.itemSeparator} />, [styles]);

  // **RACE CONDITION FIX**: Memoized key extractor for performance
  const keyExtractor = useCallback((item: string, index: number) => 
    `${index}-${item.slice(0, 20)}`, []
  );

  // **RACE CONDITION FIX**: Memoized item layout for performance
  const getItemLayout = useCallback((data: ArrayLike<string> | null | undefined, index: number) => ({
    length: 120, // Estimated item height
    offset: 120 * index,
    index,
  }), []);

  return (
    <Animated.View style={[styles.container, { opacity: animations.fadeAnim }]}>
      <FlatList
        data={statements}
        renderItem={renderStatementItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          ) : undefined
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        getItemLayout={getItemLayout}
      />
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.content, // Modern edge spacing
    },
    statementItemContainer: {
      marginVertical: theme.spacing.xs,
    },
    statementCard: {
      // ThemedCard handles internal padding via density
      marginHorizontal: 0, // Edge-to-edge within content area
    },
    statementHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    statementBadge: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statementNumber: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 10,
    },
    quoteIcon: {
      opacity: 0.4,
    },
    statementContentContainer: {
      flex: 1,
    },
    editingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + 'F8',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      ...getPrimaryShadow.card(theme),
    },
    editingContainer: {
      width: '100%',
      paddingHorizontal: theme.spacing.md,
    },
    itemSeparator: {
      height: theme.spacing.xs,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
    },
    emptyCard: {
      alignItems: 'center',
    },
    emptyContent: {
      alignItems: 'center',
    },
    emptyIconContainer: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '08',
    },
    emptyTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      fontWeight: '600',
    },
    emptySubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
  });

export default DailyEntryStatementList;
