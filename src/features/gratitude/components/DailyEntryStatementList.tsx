import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { StatementCard } from '@/shared/components/ui';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useEffect, useRef } from 'react';
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
  editingStatementIndex: number | null;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSave: (index: number, text: string) => void;
  onCancel: () => void;
  isToday: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const DailyEntryStatementList: React.FC<DailyEntryStatementListProps> = ({
  statements,
  editingStatementIndex,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  isToday,
  onRefresh,
  isRefreshing = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Create animated values for each statement
  const animatedValuesRef = useRef<Animated.Value[]>([]);

  // Initialize or adjust animated values based on statements length
  useEffect(() => {
    // Ensure we have animated values for all statements
    while (animatedValuesRef.current.length < statements.length) {
      animatedValuesRef.current.push(new Animated.Value(0));
    }

    // Remove excess animated values if statements decreased
    if (animatedValuesRef.current.length > statements.length) {
      animatedValuesRef.current = animatedValuesRef.current.slice(0, statements.length);
    }

    // Stagger animations for new statements
    const animations = animatedValuesRef.current.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100, // Stagger effect
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [statements]);

  const renderStatementItem = ({ item, index }: ListRenderItemInfo<string>) => {
    const animatedValue = animatedValuesRef.current[index] || new Animated.Value(1);

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
          animateEntrance={false} // Already animated by parent
          
          // Interactive features
          isEditing={editingStatementIndex === index}
          onEdit={() => onEdit(index)}
          onDelete={() => onDelete(index)}
          onCancel={onCancel}
          onSave={async (updatedText: string) => onSave(index, updatedText)}
          
          // Configuration for minimal list variant
          enableSwipeActions={false}
          enableLongPress={false}
          enableInlineEdit={true}
          enableQuickActions={true}
          
          // Visual configuration
          showActionOverlay={false}
          actionPosition="bottom"
          confirmDelete={false} // Parent handles confirmation
          maxLength={500}
          
          // Accessibility
          accessibilityLabel={`Şükran ${index + 1}: ${item}`}
          hapticFeedback={false}
          
          style={{
            marginBottom: theme.spacing.sm,
          }}
        />
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
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
            {isToday ? 'İlk şükranını ekle!' : 'O gün henüz şükran eklemedin'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isToday
              ? 'Bugün minnettarlık hissettiğin anları yazarak güne başla.'
              : 'Bu tarihte henüz bir şükran ifadesi bulunmuyor.'}
          </Text>
        </View>
      </ThemedCard>
    </View>
  );

  const renderSeparator = () => <View style={styles.itemSeparator} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={statements}
        renderItem={renderStatementItem}
        keyExtractor={(item, index) => `${index}-${item.slice(0, 20)}`}
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
        getItemLayout={(data, index) => ({
          length: 120, // Estimated item height
          offset: 120 * index,
          index,
        })}
      />
    </View>
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
