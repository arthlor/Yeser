import React from 'react';
import {
  FlatList,
  FlatListProps,
  Platform,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

export interface ListItemProps {
  id: string;
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export type ThemedListProps<T extends ListItemProps> = Omit<
  FlatListProps<T>,
  'renderItem' | 'data'
> & {
  items: T[];
  variant?: 'default' | 'compact' | 'card';
  showDividers?: boolean;
  itemStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  emptyText?: string;
  onItemPress?: (item: T) => void;
};

/**
 * ThemedList is a reusable list component that applies consistent theming
 * and supports different variants, dividers, and customization options.
 *
 * @example
 * ```tsx
 * <ThemedList
 *   items={[
 *     { id: '1', title: 'Item 1', subtitle: 'Description', leftIcon: 'leaf' },
 *     { id: '2', title: 'Item 2', rightIcon: 'chevron-right' },
 *   ]}
 *   variant="card"
 *   showDividers={true}
 *   onItemPress={(item) => console.log('Pressed:', item.title)}
 * />
 * ```
 */
const ThemedList = <T extends ListItemProps>({
  items,
  variant = 'default',
  showDividers = true,
  itemStyle,
  titleStyle,
  subtitleStyle,
  emptyText = 'No items to display',
  onItemPress,
  ...rest
}: ThemedListProps<T>) => {
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme, variant), [theme, variant]);

  const renderItem = ({ item }: { item: T }) => {
    const handlePress = () => {
      if (item.onPress) {
        item.onPress();
      } else if (onItemPress) {
        onItemPress(item);
      }
    };

    const hasOnPress = item.onPress || onItemPress;

    const ItemContainer: React.ComponentType<TouchableOpacityProps | ViewProps> = hasOnPress
      ? TouchableOpacity
      : View;

    return (
      <ItemContainer
        style={[styles.item, itemStyle]}
        onPress={hasOnPress ? handlePress : undefined}
        accessibilityLabel={item.accessibilityLabel || item.title}
        accessibilityHint={item.accessibilityHint}
        accessibilityRole={hasOnPress ? 'button' : 'none'}
        testID={item.testID}
      >
        {item.leftIcon && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={item.leftIcon}
              size={24}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}

        <View style={styles.textContainer}>
          <Text style={[styles.title, titleStyle]} numberOfLines={2} accessibilityRole="text">
            {item.title}
          </Text>

          {item.subtitle && (
            <Text
              style={[styles.subtitle, subtitleStyle]}
              numberOfLines={2}
              accessibilityRole="text"
            >
              {item.subtitle}
            </Text>
          )}
        </View>

        {item.rightIcon && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={item.rightIcon}
              size={20}
              color={theme.colors.textSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}
      </ItemContainer>
    );
  };

  const renderDivider = () => <View style={styles.divider} />;

  const EmptyState = ({ message }: { message: string }) => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={showDividers ? renderDivider : null}
      ListEmptyComponent={<EmptyState message={emptyText} />}
      {...rest}
    />
  );
};

const createStyles = (theme: AppTheme, variant: 'default' | 'compact' | 'card') => {
  // Adjust padding based on variant
  const itemPadding = variant === 'compact' ? theme.spacing.small : theme.spacing.medium;

  // Adjust background and border based on variant
  const itemBackground = variant === 'card' ? theme.colors.surface : 'transparent';

  const itemBorderRadius = variant === 'card' ? theme.borderRadius.medium : 0;

  const itemMargin = variant === 'card' ? theme.spacing.small / 2 : 0;

  const itemElevation = variant === 'card' ? 2 : 0;

  return StyleSheet.create({
    listContent: {
      paddingVertical: theme.spacing.small / 4,
      flexGrow: 1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: itemPadding,
      backgroundColor: itemBackground,
      borderRadius: itemBorderRadius,
      margin: itemMargin,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: itemElevation },
          shadowOpacity: itemElevation > 0 ? 0.1 : 0,
          shadowRadius: itemElevation,
        },
        android: {
          elevation: itemElevation,
        },
      }),
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      marginBottom: theme.spacing.small / 4,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    iconContainer: {
      marginHorizontal: theme.spacing.small,
      justifyContent: 'center',
      alignItems: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.surfaceVariant,
      marginVertical: theme.spacing.small / 4,
    },
    emptyContainer: {
      padding: theme.spacing.large,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
};

export default ThemedList;
