import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import GratitudeStatementItem from '@/components/GratitudeStatementItem';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

// Assuming 'statements' are an array of strings for now.
// If they are objects, this type should be adjusted.
interface DailyEntryStatementListProps {
  statements: string[]; // Adjust if statements are objects
  editingStatementIndex: number | null;
  onEditStatement: (index: number) => void;
  onSaveEditedStatement: (index: number, updatedText: string) => Promise<void>;
  onCancelEditingStatement: () => void;
  onDeleteStatement: (index: number) => void;
  flatListRef: React.RefObject<FlatList<string> | null>; // Fixed to accept null
  listHeaderComponent?: React.ReactElement | null;
  listFooterComponent?: React.ReactElement | null;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  isToday?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DailyEntryStatementList: React.FC<DailyEntryStatementListProps> = ({
  statements,
  editingStatementIndex,
  onEditStatement,
  onSaveEditedStatement,
  onCancelEditingStatement,
  onDeleteStatement,
  flatListRef,
  listHeaderComponent,
  listFooterComponent,
  onRefresh,
  isRefreshing = false,
  isToday = true,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'none',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Animation values
  const animatedValues = useRef<Animated.Value[]>([]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emptyStateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize animated values for statements
    while (animatedValues.length < statements.length) {
      animatedValues.push(new Animated.Value(0));
    }

    // Remove extra animated values
    if (animatedValues.length > statements.length) {
      animatedValues.splice(statements.length);
    }

    // Animate list entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Staggered animation for statements
    if (statements.length > 0) {
      const animations = statements.map((_, index) =>
        Animated.timing(animatedValues[index], {
          toValue: 1,
          duration: 400,
          delay: index * 80, // Reduced delay for smoother feeling
          useNativeDriver: true,
        })
      );

      Animated.parallel(animations).start();
    } else {
      // Empty state animation
      Animated.spring(emptyStateAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [statements.length, animatedValues, fadeAnim, emptyStateAnim]);

  const renderStatementItem = ({ item, index }: ListRenderItemInfo<string>) => {
    const animatedValue = animatedValues[index] || new Animated.Value(1);

    return (
      <Animated.View
        style={[
          styles.statementItemContainer,
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Statement Card with improved layout */}
        <View style={styles.statementCard}>
          {/* Header with badge and actions */}
          <View style={styles.statementHeader}>
            <View style={styles.statementBadge}>
              <Text style={styles.statementNumber}>{index + 1}</Text>
            </View>
            <View style={styles.quoteIcon}>
              <Icon name="format-quote-close" size={12} color={theme.colors.primary + '60'} />
            </View>
          </View>

          {/* Main content container with proper constraints */}
          <View style={styles.statementContentContainer}>
            <GratitudeStatementItem
              statementText={item}
              isEditing={editingStatementIndex === index}
              onPressEdit={() => {
                onEditStatement(index);
              }}
              onSave={(updatedText) => onSaveEditedStatement(index, updatedText)}
              onCancelEdit={onCancelEditingStatement}
              onDelete={() => {
                onDeleteStatement(index);
              }}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyListComponent = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: emptyStateAnim,
          transform: [
            {
              scale: emptyStateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.emptyContent}>
        {/* Animated icon with gentle pulse */}
        <Animated.View
          style={[
            styles.emptyIconContainer,
            {
              transform: [
                {
                  scale: emptyStateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon
            name={isToday ? 'heart-plus' : 'book-open-outline'}
            size={56}
            color={theme.colors.primary}
          />
        </Animated.View>

        <Text style={styles.emptyTitle}>
          {isToday ? 'İlk şükranını ekle' : 'Bu tarihte kayıt yok'}
        </Text>

        <Text style={styles.emptyDescription}>
          {isToday
            ? 'Bugün hangi güzel şeyler için minnettarsın? Aşağıdaki alandan ilk ifadeni ekleyebilirsin.'
            : 'Bu tarihte henüz bir şükran ifadesi eklememişsin. Geçmiş anılarını eklemek için aşağıdaki alanı kullanabilirsin.'}
        </Text>

        {/* Subtle decoration */}
        <View style={styles.emptyDecoration}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={[styles.decorationDot, { opacity: 0.3 + i * 0.2 }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderItemSeparator = () => <View style={styles.itemSeparator} />;

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <FlatList
        ref={flatListRef}
        data={statements}
        renderItem={renderStatementItem}
        keyExtractor={(item, index) => `statement-${index}`}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={renderEmptyListComponent}
        ItemSeparatorComponent={renderItemSeparator}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        contentContainerStyle={[
          styles.listContent,
          statements.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              progressBackgroundColor={theme.colors.surface}
            />
          ) : undefined
        }
        // Enhanced scroll performance
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 100, // Increased height for better layout
          offset: 100 * index,
          index,
        })}
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
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    emptyListContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl * 2,
    },
    statementItemContainer: {
      marginBottom: theme.spacing.md,
    },
    statementCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden', // Ensures content doesn't overflow
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    statementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    statementBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statementNumber: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.onPrimaryContainer,
      letterSpacing: 0.2,
    },
    quoteIcon: {
      opacity: 0.6,
    },
    statementContentContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      // Ensure proper width constraints to prevent overflow
      width: '100%',
      minHeight: 60, // Minimum height for consistent layout
    },
    itemSeparator: {
      height: 0, // Removed separator since we have margin
    },
    emptyContainer: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyContent: {
      alignItems: 'center',
      maxWidth: 300,
    },
    emptyIconContainer: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer + '40',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    emptyDescription: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.lg,
      letterSpacing: 0.1,
    },
    emptyDecoration: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    decorationDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
      marginHorizontal: 3,
    },
  });

export default DailyEntryStatementList;
