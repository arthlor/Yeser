import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
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
  flatListRef: React.RefObject<FlatList<string> | null>; // Adjust if statements are objects
  listHeaderComponent?: React.ReactElement | null;
}

const DailyEntryStatementList: React.FC<DailyEntryStatementListProps> = ({
  statements,
  editingStatementIndex,
  onEditStatement,
  onSaveEditedStatement,
  onCancelEditingStatement,
  onDeleteStatement,
  flatListRef,
  listHeaderComponent,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const renderStatementItem = ({ item, index }: ListRenderItemInfo<string>) => (
    <GratitudeStatementItem
      statementText={item}
      isEditing={editingStatementIndex === index}
      onPressEdit={() => onEditStatement(index)}
      onSave={(updatedText) => onSaveEditedStatement(index, updatedText)}
      onCancelEdit={onCancelEditingStatement}
      onDelete={() => onDeleteStatement(index)}
    />
  );

  const renderEmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="thought-bubble-outline" size={60} color={theme.colors.disabled} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>Henüz Bir Şey Yok</Text>
      <Text style={styles.emptyDescription}>
        Yukarıdaki alandan ilk şükran ifadeni ekleyerek başlayabilirsin.
      </Text>
    </View>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={statements}
      renderItem={renderStatementItem}
      keyExtractor={(_, index) => index.toString()}
      ListHeaderComponent={listHeaderComponent}
      ListEmptyComponent={renderEmptyListComponent}
      contentContainerStyle={statements.length === 0 ? styles.emptyListContentContainer : styles.listContentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    listContentContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xxl * 2, // Extra padding for FAB and input bar
    },
    emptyListContentContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg, // Adjust as needed
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
      marginTop: theme.spacing.xl, // Give some space from header
    },
    emptyIcon: {
      marginBottom: theme.spacing.lg,
      opacity: 0.7,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyDescription: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 280,
      fontFamily: theme.typography.fontFamilyRegular,
    },
  });

export default DailyEntryStatementList;