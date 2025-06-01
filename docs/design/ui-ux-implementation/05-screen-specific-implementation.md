# Screen-Specific Implementation

This document provides detailed implementation guidance for enhancing specific screens in the Yeşer app.

## EnhancedEntryDetailScreen

The Entry Detail Screen displays a single gratitude entry with options to edit or delete it. The enhanced version improves the visual presentation, adds animations, and ensures proper theming integration.

### Implementation Overview

```typescript
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { deleteGratitudeEntry } from '../api/gratitudeApi';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import FadeIn from '../components/animations/FadeIn';
import SlideIn from '../components/animations/SlideIn';
import LoadingState from '../components/states/LoadingState';
import ErrorState from '../components/states/ErrorState';
import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';
import { RootStackParamList } from '../types/navigation';
import { logEvent } from '../utils/analytics';

// Define the type for the route params
type EntryDetailScreenRouteProp = RouteProp<RootStackParamList, 'EntryDetail'>;

// Define navigation prop type for navigating back or to an edit screen
type EntryDetailScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'EntryDetail'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  route: EntryDetailScreenRouteProp;
  navigation: EntryDetailScreenNavigationProp;
}

const EnhancedEntryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { entry } = route.params;

  const gratitudeItems = entry.content
    ? entry.content.split('\n').filter(item => item.trim() !== '')
    : [];

  const formattedDate = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Tarih bilgisi yok';

  // Log view event for analytics
  useEffect(() => {
    logEvent('view_entry_detail', {
      entry_id: entry.id || 'unknown',
      entry_date: entry.created_at || 'unknown',
    });
  }, [entry]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('DailyEntry', { entryToEdit: entry });
    logEvent('edit_entry_started', {
      entry_id: entry.id || 'unknown',
    });
  }, [entry, navigation]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Kaydı Sil',
      'Bu şükran kaydını silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => {
            logEvent('delete_entry_cancelled', {
              entry_id: entry.id || 'unknown',
            });
          }
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!entry.id) {
              setError('Kayıt ID bulunamadı.');
              return;
            }
            
            setIsDeleting(true);
            setError(null);
            
            try {
              await deleteGratitudeEntry(entry.id);
              
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              
              logEvent('delete_entry_success', {
                entry_id: entry.id,
              });
              
              Alert.alert('Başarılı', 'Kayıt silindi.', [
                { 
                  text: 'Tamam', 
                  onPress: () => navigation.goBack() 
                },
              ]);
            } catch (error: unknown) {
              console.error('Error deleting entry:', error);
              
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              
              let errorMessage = 'Kayıt silinirken bir hata oluştu.';
              if (
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message: unknown }).message === 'string'
              ) {
                errorMessage = (error as { message: string }).message;
              } else if (typeof error === 'string') {
                errorMessage = error;
              }
              
              setError(errorMessage);
              
              logEvent('delete_entry_error', {
                entry_id: entry.id,
                error_message: errorMessage,
              });
            }
            
            setIsDeleting(false);
          },
        },
      ],
      { cancelable: true }
    );
  }, [entry, navigation]);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // If there's an error, show the error state
  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="İşlem Hatası"
          message={error}
          onRetry={handleRetry}
          icon="alert-circle-outline"
        />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityLabel="Şükran kaydı detayları"
    >
      <SlideIn direction="top" distance={20}>
        <View style={styles.headerContainer}>
          <Text 
            style={styles.dateText}
            accessibilityRole="header"
          >
            {formattedDate}
          </Text>
        </View>
      </SlideIn>

      <FadeIn delay={150}>
        <ThemedCard 
          variant="elevated" 
          elevation="md"
          style={styles.cardContainer}
          accessibilityLabel="Şükran içeriği"
        >
          {gratitudeItems.length > 0 ? (
            gratitudeItems.map((item, index) => (
              <View 
                key={index} 
                style={styles.itemContainer}
                accessibilityLabel={`Şükran ${index + 1}: ${item}`}
              >
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.contentText}>{item}</Text>
              </View>
            ))
          ) : (
            <Text 
              style={styles.contentText}
              accessibilityLabel="İçerik bulunamadı"
            >
              {'İçerik bulunamadı.'}
            </Text>
          )}
        </ThemedCard>
      </FadeIn>

      {isDeleting ? (
        <LoadingState 
          message="Kayıt siliniyor..." 
          animate={true}
          style={styles.loadingContainer}
        />
      ) : (
        <FadeIn delay={300}>
          <View style={styles.actionsContainer}>
            <View style={styles.buttonWrapper}>
              <ThemedButton
                title="Düzenle"
                onPress={handleEdit}
                variant="secondary"
                accessibilityLabel="Şükran kaydını düzenle"
                accessibilityHint="Şükran kaydını düzenlemek için dokunun"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <ThemedButton 
                title="Sil" 
                onPress={handleDelete} 
                variant="danger"
                accessibilityLabel="Şükran kaydını sil"
                accessibilityHint="Şükran kaydını silmek için dokunun"
              />
            </View>
          </View>
        </FadeIn>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      padding: theme.spacing.medium,
      paddingBottom: theme.spacing.xlarge,
    },
    headerContainer: {
      marginBottom: theme.spacing.large,
      paddingBottom: theme.spacing.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dateText: {
      ...theme.typography.h3,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    cardContainer: {
      marginBottom: theme.spacing.large,
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.small,
    },
    bulletPoint: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      marginRight: theme.spacing.small,
      fontWeight: 'bold',
    },
    contentText: {
      ...theme.typography.body1,
      color: theme.colors.text,
      flexShrink: 1,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: theme.spacing.medium,
      paddingVertical: theme.spacing.medium,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    buttonWrapper: {
      flex: 1,
      marginHorizontal: theme.spacing.small,
    },
    loadingContainer: {
      marginTop: theme.spacing.large,
    },
  });

export default EnhancedEntryDetailScreen;
```

### Key Enhancements

1. **Improved Theming Integration**
   - Consistent use of theme tokens for colors, typography, spacing, and elevation
   - Proper use of semantic color tokens (e.g., `theme.colors.primary` instead of hardcoded values)
   - Typography tokens for text styling (e.g., `theme.typography.h3`)

2. **Enhanced Visual Presentation**
   - ThemedCard component for displaying entry content
   - Proper elevation and border styling
   - Improved layout with consistent spacing

3. **Animation and Transitions**
   - SlideIn animation for the header
   - FadeIn animations for the content card and action buttons
   - Staggered animations with delays for a polished feel

4. **Improved State Management**
   - Dedicated error state with ErrorState component
   - LoadingState component for the deleting state
   - Proper state transitions with animations

5. **Haptic Feedback**
   - Light impact feedback for edit action
   - Medium impact feedback for delete confirmation
   - Success/error notification feedback based on operation outcome

6. **Accessibility Improvements**
   - Proper accessibilityLabel attributes for screen readers
   - accessibilityRole attributes for semantic structure
   - accessibilityHint for additional context on interactive elements

7. **Analytics Integration**
   - Event logging for screen view
   - Event logging for user actions (edit, delete)
   - Error tracking with contextual information

8. **Error Handling**
   - Improved error presentation with ErrorState component
   - Retry functionality for error recovery
   - Proper type checking for error objects

### Usage Guidelines

To use the EnhancedEntryDetailScreen:

1. Replace the existing EntryDetailScreen with this enhanced version
2. Ensure all required components are imported and available
3. Update any navigation references to point to the new screen
4. Test the screen with various entry data to ensure proper rendering
5. Verify accessibility features with screen readers

### Testing Considerations

- Test with both light and dark themes
- Verify animations run smoothly on target devices
- Test error scenarios by mocking API failures
- Verify haptic feedback on physical devices
- Test accessibility with VoiceOver/TalkBack
- Verify analytics events are properly logged

## Additional Screens

[Additional screen implementations will be added here as they are enhanced]
