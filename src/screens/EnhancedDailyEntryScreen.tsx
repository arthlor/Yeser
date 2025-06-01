import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp, useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack'; // Replaced by BottomTabNavigationProp
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  addGratitudeEntry,
  getGratitudeEntryByDate,
  updateGratitudeEntry,
} from '../api/gratitudeApi';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import ThemedInput from '../components/ThemedInput';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import { AppTheme } from '../themes/types';
import { MainAppTabParamList } from '../types/navigation'; // Removed RootStackParamList, added MainAppTabParamList

type DailyEntryScreenRouteProp = RouteProp<
  MainAppTabParamList,
  'DailyEntryTab'
>;

interface Props {
  route?: DailyEntryScreenRouteProp;
}

/**
 * EnhancedDailyEntryScreen provides an improved UI/UX for creating and editing gratitude entries.
 * It uses the new ThemedCard, ThemedInput, and animation components for a more polished experience.
 */
const EnhancedDailyEntryScreen: React.FC<Props> = ({ route }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [items, setItems] = useState<string[]>(['']);
  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [_focusedInputIndex, setFocusedInputIndex] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  // Navigation
  const navigation =
    useNavigation<
      BottomTabNavigationProp<MainAppTabParamList, 'DailyEntryTab'>
    >();

  // Check if we're in edit mode
  const entryToEdit = route?.params?.entryToEdit;
  const isEditMode = !!entryToEdit;
  const entryId = entryToEdit?.id;

  // Initialize with entry data if in edit mode
  useEffect(() => {
    if (isEditMode && entryToEdit) {
      setItems(entryToEdit.content ? entryToEdit.content.split('\n') : ['']);
      if (entryToEdit.entry_date) {
        const dateParts = entryToEdit.entry_date.split('-');
        if (dateParts.length === 3) {
          setEntryDate(
            new Date(
              parseInt(dateParts[0]),
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[2])
            )
          );
        } else {
          setEntryDate(new Date(entryToEdit.entry_date));
        }
      }
    }
  }, [isEditMode, entryToEdit]);

  // Handle input changes
  const handleItemChange = (text: string, index: number) => {
    const newItems = [...items];
    newItems[index] = text;
    setItems(newItems);

    // Clear error for this item if it exists
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  // Add a new gratitude item
  const addItemInput = () => {
    // Dismiss keyboard to prevent layout issues
    Keyboard.dismiss();

    setItems([...items, '']);

    // Scroll to the bottom after a short delay to ensure the new item is rendered
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Remove a gratitude item
  const removeItemInput = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);

      // Update errors if any
      if (Object.keys(errors).length > 0) {
        const newErrors: { [key: number]: string } = {};
        Object.entries(errors).forEach(([key, value]) => {
          const keyNum = parseInt(key);
          if (keyNum < index) {
            newErrors[keyNum] = value;
          } else if (keyNum > index) {
            newErrors[keyNum - 1] = value;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  // Handle date picker changes
  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || entryDate;
    setShowDatePicker(Platform.OS === 'ios');
    setEntryDate(currentDate);
  };

  // Show the date picker
  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Validate inputs before saving
  const validateInputs = () => {
    const newErrors: { [key: number]: string } = {};
    let isValid = true;

    items.forEach((item, index) => {
      if (item.trim() === '') {
        newErrors[index] = 'Bu alan boş olamaz';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Dynamically set screen title based on mode
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Şükranı Düzenle' : 'Yeni Şükran Kaydı',
    });
  }, [navigation, isEditMode]);

  // Save or update the gratitude entry
  const handleSaveEntry = async () => {
    // Validate inputs
    if (!validateInputs()) {
      // Scroll to the first error
      const firstErrorIndex = parseInt(Object.keys(errors)[0]);
      scrollViewRef.current?.scrollTo({
        y: firstErrorIndex * 120, // Approximate height of each item
        animated: true,
      });
      return;
    }

    const nonEmptyItems = items
      .map(item => item.trim())
      .filter(item => item !== '');

    if (nonEmptyItems.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az bir şükran metni girin.');
      return;
    }

    const entryText = nonEmptyItems.join('\n');
    setIsLoading(true);

    // Define isoDate here to make it accessible in the catch block for the "Edit" logic
    const isoDate = entryDate.toISOString().split('T')[0];

    let savedEntry;
    try {
      if (isEditMode && entryId) {
        // Editing an existing entry
        console.log(`Updating entry ID ${entryId} with date ${isoDate}.`);
        savedEntry = await updateGratitudeEntry(entryId, {
          content: entryText,
          entry_date: isoDate,
        });
      } else {
        // Adding a new entry (or upserting if an entry for this user/date already exists)
        console.log(`Adding/Upserting new entry for date ${isoDate}.`);
        savedEntry = await addGratitudeEntry({
          content: entryText,
          entry_date: isoDate,
        });
      }

      // Unified success handling
      if (savedEntry && savedEntry.id) {
        setSaveSuccess(true);
        if (isEditMode) {
          analyticsService.logEvent('gratitude_entry_updated', {
            entry_id: savedEntry.id,
          });
        } else {
          analyticsService.logEvent('gratitude_entry_added', {
            entry_id: savedEntry.id,
          });
        }
        // Common navigation logic after success
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        // This case implies the API call might have succeeded without returning a valid/expected entry
        console.error(
          'Save operation completed but no valid entry returned or entry has no ID.',
          savedEntry
        );
        throw new Error(
          `Şükran kaydı ${isEditMode ? 'güncellenirken' : 'kaydedilirken'} bir sorun oluştu. Kayıt detayı alınamadı.`
        );
      }
    } catch (error: unknown) {
      let errorCode: string | undefined;
      let errorMessage = `Şükran kaydı ${isEditMode ? 'güncellenirken' : 'eklenirken'} bir hata oluştu. Lütfen tekrar deneyin.`;

      if (typeof error === 'object' && error !== null) {
        if (
          'code' in error &&
          typeof (error as { code: unknown }).code === 'string'
        ) {
          errorCode = (error as { code: string }).code;
        }
        // Use the message from the error object if it's a string, otherwise keep the default
        if (
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ) {
          errorMessage = (error as { message: string }).message;
        }
      }

      if (errorCode === '23505') {
        Alert.alert(
          'Kayıt Mevcut',
          'Bu tarih için zaten bir şükran kaydınız mevcut. Mevcut kaydı düzenleyebilir veya farklı bir tarih seçebilirsiniz.',
          [
            {
              text: 'Düzenle',
              onPress: async () => {
                try {
                  setIsLoading(true);
                  const existingEntry = await getGratitudeEntryByDate(isoDate);
                  setIsLoading(false);
                  if (existingEntry) {
                    navigation.navigate('DailyEntryTab', {
                      entryToEdit: existingEntry,
                    });
                  } else {
                    Alert.alert(
                      'Hata',
                      'Düzenlenecek mevcut kayıt bulunamadı. Lütfen tekrar deneyin.'
                    );
                  }
                } catch (fetchError: unknown) {
                  setIsLoading(false);
                  let fetchErrorMessage =
                    'Mevcut kayıt getirilirken bir sorun oluştu.';
                  if (
                    typeof fetchError === 'object' &&
                    fetchError !== null &&
                    'message' in fetchError &&
                    typeof (fetchError as { message: unknown }).message ===
                      'string'
                  ) {
                    fetchErrorMessage = (fetchError as { message: string })
                      .message;
                  }
                  console.error('Error fetching entry for edit:', fetchError);
                  Alert.alert('Hata', fetchErrorMessage);
                }
              },
            },
            {
              text: 'Farklı Tarih Seç',
              style: 'cancel',
            },
          ]
        );
      } else {
        console.error(
          `Error ${isEditMode ? 'updating' : 'saving'} gratitude entry (Code: ${errorCode || 'N/A'}):`,
          error
        );
        Alert.alert('Hata', errorMessage);
      }
    }
    setIsLoading(false);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View>
        <Text style={styles.title}>
          {isEditMode ? 'Kaydı Düzenle' : 'Bugün Neler İçin Minnettarsın?'}
        </Text>
      </View>

      {/* Date Selection Card */}
      <View>
        <ThemedCard
          variant="outlined"
          contentPadding="lg"
          style={styles.dateCard}
        >
          <Text style={styles.dateLabel}>Tarih</Text>
          <TouchableOpacity onPress={showDatepicker} style={styles.dateButton}>
            <Text style={styles.dateText}>{formatDate(entryDate)}</Text>
            <Icon name="calendar" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={entryDate}
              mode="date"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </ThemedCard>
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        Bugün için neler için şükran duyuyorsun?
      </Text>

      {/* Gratitude Items */}
      {items.map((item, index) => (
        <ThemedCard
          key={index}
          variant="elevated"
          elevation="xs"
          style={styles.itemCard}
          contentPadding="none"
        >
          <ThemedInput
            value={item}
            onChangeText={text => handleItemChange(text, index)}
            placeholder={`${index + 1}. Şükran maddeniz...`}
            multiline
            numberOfLines={3}
            onFocus={() => setFocusedInputIndex(index)}
            onBlur={() => setFocusedInputIndex(null)}
            error={errors[index]}
            containerStyle={styles.inputContainer}
          />
          {items.length > 1 && (
            <TouchableOpacity
              onPress={() => removeItemInput(index)}
              style={styles.removeButton}
              accessibilityLabel="Şükran maddesini kaldır"
            >
              <Icon name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </ThemedCard>
      ))}

      {/* Add Button */}
      <TouchableOpacity onPress={addItemInput} style={styles.addButton}>
        <Icon name="plus-circle" size={24} color={theme.colors.primary} />
        <Text style={styles.addButtonText}>Şükran maddesi ekle</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        {saveSuccess ? (
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={40} color={theme.colors.success} />
            <Text style={styles.successText}>
              {isEditMode ? 'Güncellendi!' : 'Kaydedildi!'}
            </Text>
          </View>
        ) : (
          <ThemedButton
            title={isEditMode ? 'Güncelle' : 'Kaydet'}
            onPress={handleSaveEntry}
            isLoading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
            variant="primary"
            accessibilityLabel={isEditMode ? 'Güncelle' : 'Kaydet'}
            accessibilityHint={
              isEditMode
                ? 'Şükran girişini güncellemek için dokunun'
                : 'Şükran girişini kaydetmek için dokunun'
            }
          />
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    dateCard: {
      marginBottom: theme.spacing.lg,
    },
    dateLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceVariant,
    },
    dateText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    sectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    itemCard: {
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
    },
    inputContainer: {
      margin: 0,
      marginBottom: 0,
    },
    removeButton: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      zIndex: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    addButtonText: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      marginLeft: theme.spacing.xs,
    },
    saveButtonContainer: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
    },
    saveButton: {
      minWidth: 200,
    },
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
    },
    successText: {
      ...theme.typography.titleMedium,
      color: theme.colors.success,
      marginTop: theme.spacing.sm,
    },
  });

export default EnhancedDailyEntryScreen;
