import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  KeyboardAvoidingView,
  Dimensions,
  StatusBar,
} from 'react-native';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGratitudeStore } from '@/store/gratitudeStore';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import { ZodError } from 'zod';
import GratitudeInputBar from '@/components/GratitudeInputBar';
import GratitudeStatementItem from '@/components/GratitudeStatementItem';
import DailyEntryHero from '@/components/daily-entries/DailyEntryHero';
import DailyEntryDatePicker from '@/components/daily-entries/DailyEntryDatePicker';
import DailyEntryStatementList from '@/components/daily-entries/DailyEntryStatementList';
import ThemedCard from '@/components/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { MainAppTabParamList } from '@/types/navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type DailyEntryScreenRouteProp = RouteProp<
  MainAppTabParamList,
  'DailyEntryTab'
>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const flatListRef = useRef<FlatList<string>>(null);
  const navigation = useNavigation<
    BottomTabNavigationProp<
      MainAppTabParamList,
      'DailyEntryTab'
    >
  >();
  const routeParams = useRoute<DailyEntryScreenRouteProp>().params;

  const {
    entries,
    isLoading: isStoreLoading,
    error: storeError,
    fetchEntry,
    addStatement: storeAddStatement,
    updateStatement: storeUpdateStatement,
    removeStatement: storeRemoveStatement,
  } = useGratitudeStore();

  const [editingStatementIndex, setEditingStatementIndex] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statementInputError, setStatementInputError] = useState<string | null>(null);

  const dateString = entryDate.toISOString().split('T')[0];
  const currentEntry = entries[dateString];
  const statements = currentEntry?.statements || [];
  const currentEntryId = currentEntry?.id || null;

  // Calculate if it's today
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateString === today;

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  useEffect(() => {
    const initialDateString = routeParams?.initialDate;
    if (initialDateString) {
      const dateParts = initialDateString.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          setEntryDate(newDate);
        }
      }
    }
  }, [routeParams]);

  useEffect(() => {
    fetchEntry(entryDate.toISOString().split('T')[0]);
  }, [entryDate, fetchEntry]);

  useEffect(() => {
    if (storeError) {
      Alert.alert('Hata', storeError || 'Bir şeyler ters gitti.');
      useGratitudeStore.setState({ error: null });
    }
  }, [storeError]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const handleAddStatement = async (newStatementText: string) => {
    const validationResult = gratitudeStatementSchema.safeParse(newStatementText);

    if (!validationResult.success) {
      const errorMessage = (validationResult.error as ZodError).errors[0]?.message || 'Geçersiz ifade.';
      setStatementInputError(errorMessage);
      // Alert.alert('Geçersiz İfade', errorMessage); // Optionally keep alert or rely on UI error display
      return;
    }

    setStatementInputError(null); // Clear any previous error
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const result = await storeAddStatement(dateString, validationResult.data);
    if (result) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  };

  const handleEditStatement = (index: number) => {
    setEditingStatementIndex(index);
  };

  const handleSaveEditedStatement = async (index: number, updatedText: string) => {
    const validationResult = gratitudeStatementSchema.safeParse(updatedText);

    if (!validationResult.success) {
      const errorMessage = (validationResult.error as ZodError).errors[0]?.message || 'Geçersiz ifade.';
      Alert.alert('Geçersiz İfade', errorMessage); // For now, use Alert for editing errors
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await storeUpdateStatement(dateString, index, validationResult.data);
    setEditingStatementIndex(null);
  };

  const handleCancelEditingStatement = () => {
    setEditingStatementIndex(null);
  };

  const handleDeleteStatement = (index: number) => {
    Alert.alert(
      'İfadeyi Sil',
      'Bu şükran ifadesini silmek istediğinizden emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, Sil',
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await storeRemoveStatement(dateString, index);
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.colors.background} barStyle="dark-content" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <DailyEntryHero isToday={isToday} statementCount={statements.length} />
        <DailyEntryDatePicker entryDate={entryDate} onPressChangeDate={() => setShowDatePicker(true)} />
        <DailyEntryStatementList
          flatListRef={flatListRef}
          statements={statements}
          editingStatementIndex={editingStatementIndex}
          onEditStatement={handleEditStatement}
          onSaveEditedStatement={handleSaveEditedStatement}
          onCancelEditingStatement={handleCancelEditingStatement}
          onDeleteStatement={handleDeleteStatement}
        />
        
        {showDatePicker && (
          <DateTimePicker
            value={entryDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
          />
        )}
        
        <GratitudeInputBar onSubmit={handleAddStatement} error={statementInputError} />
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: theme.spacing.xxl + 60, // Extra space for input bar
  },
  listContentContainerEmpty: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },

  // Statement Items
  statementWrapper: {
    marginBottom: theme.spacing.sm,
  },
  itemSeparator: {
    height: theme.spacing.xs,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    minHeight: screenHeight * 0.4,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${theme.colors.textSecondary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  },
});

export default EnhancedDailyEntryScreen;