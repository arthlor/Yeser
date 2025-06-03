import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  StatusBar,
  UIManager,
  View,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZodError } from 'zod';

import DailyEntryHero from '@/components/daily-entries/DailyEntryHero';
import DailyEntryPrompt from '@/components/daily-entries/DailyEntryPrompt';
import DailyEntryStatementList from '@/components/daily-entries/DailyEntryStatementList';
import GratitudeInputBar from '@/components/GratitudeInputBar';
import { useTheme } from '@/providers/ThemeProvider';
import { gratitudeStatementSchema } from '@/schemas/gratitudeSchema';
import { useGratitudeStore } from '@/store/gratitudeStore';
import { useProfileStore } from '@/store/profileStore';
import { AppTheme } from '@/themes/types';
import { MainAppTabParamList } from '@/types/navigation';

// Added for varied prompts
import usePromptStore from '@/store/promptStore';

import DailyEntryDatePicker from '../components/daily-entries/DailyEntryDatePicker';

import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type DailyEntryScreenRouteProp = RouteProp<MainAppTabParamList, 'DailyEntryTab'>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const { theme, colorMode } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<string>>(null);
  const navigation = useNavigation<BottomTabNavigationProp<MainAppTabParamList, 'DailyEntryTab'>>();
  const routeParams = useRoute<DailyEntryScreenRouteProp>().params || {};

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced animations
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(1)).current;

  // Hooks for varied prompts and profile data
  const { useVariedPrompts, daily_gratitude_goal } = useProfileStore();
  const {
    currentPrompt,
    loading: promptLoading,
    error: promptError,
    fetchNewPrompt,
    resetToDefaultPrompt,
  } = usePromptStore();

  const dateString = entryDate.toISOString().split('T')[0];
  const currentEntry = entries[dateString];
  const statements = currentEntry?.statements || [];
  const dailyGoal = daily_gratitude_goal ?? 3; // Default to 3 for minimalism

  // Calculate if it's today
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateString === today;

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  // Entrance animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  // Effect for fetching/resetting varied prompt based on date and preference
  useEffect(() => {
    if (isToday && useVariedPrompts) {
      if (!currentPrompt && !promptLoading && !promptError) {
        fetchNewPrompt();
      }
    } else {
      if (currentPrompt) {
        resetToDefaultPrompt();
      }
    }
  }, [
    isToday,
    useVariedPrompts,
    fetchNewPrompt,
    resetToDefaultPrompt,
    currentPrompt,
    promptLoading,
    promptError,
  ]);

  // Enhanced keyboard handling
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const { height } = event.endCoordinates;
        setKeyboardHeight(height);

        Animated.timing(keyboardHeightAnim, {
          toValue: height,
          duration: Platform.OS === 'ios' ? event.duration || 250 : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardHeight(0);

        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration || 250 : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardHeightAnim]);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Smooth transition animation when changing dates
      Animated.sequence([
        Animated.timing(listOpacity, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setEntryDate(selectedDate);
    }
  };

  const handlePrevDay = () => {
    const prevDay = new Date(entryDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setEntryDate(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(entryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (nextDay < tomorrow) {
      setEntryDate(nextDay);
    }
  };

  const handleAddStatement = async (newStatementText: string) => {
    const validationResult = gratitudeStatementSchema.safeParse(newStatementText);

    if (!validationResult.success) {
      const errorMessage =
        (validationResult.error as ZodError).errors[0]?.message || 'Geçersiz ifade.';
      setStatementInputError(errorMessage);
      return;
    }

    setStatementInputError(null);
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });

    const result = await storeAddStatement(dateString, validationResult.data);
    if (result) {
      // Smooth scroll to new item
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleEditStatement = (index: number) => {
    setEditingStatementIndex(index);
  };

  const handleSaveEditedStatement = async (index: number, updatedText: string) => {
    const validationResult = gratitudeStatementSchema.safeParse(updatedText);

    if (!validationResult.success) {
      const errorMessage =
        (validationResult.error as ZodError).errors[0]?.message || 'Geçersiz ifade.';
      Alert.alert('Geçersiz İfade', errorMessage);
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
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          onPress: async () => {
            LayoutAnimation.configureNext({
              duration: 300,
              delete: { type: 'easeInEaseOut', property: 'opacity' },
              update: { type: 'easeInEaseOut' },
            });
            await storeRemoveStatement(dateString, index);
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEntry(dateString);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
      />

      <Animated.View style={[styles.mainContainer, { opacity: fadeAnim }]}>
        {/* Compact Header with Date Picker */}
        <View style={styles.headerContainer}>
          <DailyEntryDatePicker
            entryDate={entryDate}
            onPressChangeDate={() => {
              setShowDatePicker(true);
            }}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
          />
        </View>

        {/* Main Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Statement List with enhanced animations */}
          <Animated.View style={[styles.listContainer, { opacity: listOpacity }]}>
            <DailyEntryStatementList
              flatListRef={flatListRef}
              statements={statements}
              editingStatementIndex={editingStatementIndex}
              onEditStatement={handleEditStatement}
              onSaveEditedStatement={handleSaveEditedStatement}
              onCancelEditingStatement={handleCancelEditingStatement}
              onDeleteStatement={handleDeleteStatement}
              isToday={isToday}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              listHeaderComponent={
                <View style={styles.listHeader}>
                  {/* Compact Hero Section */}
                  <DailyEntryHero
                    isToday={isToday}
                    statementCount={statements.length}
                    dailyGoal={dailyGoal}
                  />
                </View>
              }
              listFooterComponent={
                <View style={styles.listFooter}>
                  {/* Daily Prompt */}
                  <DailyEntryPrompt
                    promptText={currentPrompt?.prompt_text_tr ?? null}
                    isLoading={promptLoading}
                    error={promptError}
                    isToday={isToday}
                    useVariedPrompts={useVariedPrompts ?? false}
                    onRefreshPrompt={fetchNewPrompt}
                  />
                  {/* Safe area for input */}
                  <View style={{ height: 100 + insets.bottom }} />
                </View>
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          </Animated.View>

          {/* Enhanced Input Bar with better positioning */}
          <Animated.View
            style={[
              styles.inputBarContainer,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [
                  {
                    translateY: keyboardHeightAnim.interpolate({
                      inputRange: [0, 300],
                      outputRange: [0, -keyboardHeight],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <GratitudeInputBar
              onSubmit={handleAddStatement}
              error={statementInputError}
              placeholder={isToday ? 'Bugün neye minnettarsın?' : 'O gün neye minnettardın?'}
            />
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={entryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()} // Prevent future dates
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    mainContainer: {
      flex: 1,
    },
    headerContainer: {
      paddingTop: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    listHeader: {
      paddingBottom: theme.spacing.sm,
    },
    listFooter: {
      paddingTop: theme.spacing.md,
    },
    inputBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '30',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
  });

export default EnhancedDailyEntryScreen;
