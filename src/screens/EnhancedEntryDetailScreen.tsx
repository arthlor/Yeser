import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteStatement } from '../api/gratitudeApi';
import ErrorState from '../components/states/ErrorState';
import LoadingState from '../components/states/LoadingState';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';
import { RootStackParamList } from '../types/navigation';

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

/**
 * EnhancedEntryDetailScreen displays a single gratitude entry with options to edit or delete it.
 * This enhanced version includes animations, proper theming, and improved error handling.
 */
const EnhancedEntryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { entry } = route.params;

  const gratitudeItems = entry.statements || [];

  const formattedDate = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Tarih bilgisi yok';

  // Component mounted effect
  useEffect(() => {
    // We would add analytics logging here in a real implementation
  }, [entry]);

  const handleEdit = useCallback(() => {
    // No haptics or analytics in this implementation
    navigation.navigate('MainApp', {
      screen: 'DailyEntryTab',
      params: { entryToEdit: entry },
    });
  }, [entry, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Kaydı Sil',
      'Bu şükran kaydını silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!entry?.entry_date || !entry.statements) {
              setError('Kayıt bilgileri eksik veya geçersiz.');
              return;
            }

            setIsDeleting(true);
            setError(null);

            try {
              const numStatements = entry.statements.length;
              for (let i = 0; i < numStatements; i++) {
                // Always delete the first statement in the current list as indices shift
                await deleteStatement(entry.entry_date, 0);
              }
              Alert.alert('Başarılı', 'Kayıt ve tüm ifadeleri silindi.', [
                {
                  text: 'Tamam',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error: unknown) {
              console.error('Error deleting entry:', error);

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

  // Render error state if present and not in the process of deleting
  if (error && !isDeleting) {
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
      accessibilityLabel="Minnet kaydı detayları"
    >
      <View style={styles.headerContainer}>
        <Text style={styles.dateText} accessibilityRole="header">
          {formattedDate}
        </Text>
      </View>

      <ThemedCard
        variant="elevated"
        elevation="md"
        style={styles.cardContainer}
        accessibilityLabel="Minnet içeriği"
      >
        {gratitudeItems.length > 0 ? (
          gratitudeItems.map((item, index) => (
            <View
              key={index}
              style={styles.itemContainer}
              accessibilityLabel={`Minnet ${index + 1}: ${item}`}
            >
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.contentText}>{item}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.contentText} accessibilityLabel="İçerik bulunamadı">
            {'İçerik bulunamadı.'}
          </Text>
        )}
      </ThemedCard>

      {isDeleting ? (
        <LoadingState message="Kayıt siliniyor..." style={styles.loadingContainer} />
      ) : (
        <View style={styles.actionsContainer}>
          <View style={styles.buttonWrapper}>
            <ThemedButton
              title="Düzenle"
              onPress={handleEdit}
              variant="secondary"
              accessibilityLabel="Minnet kaydını düzenle"
              accessibilityHint="Minnet kaydını düzenlemek için dokunun"
            />
          </View>
          <View style={styles.buttonWrapper}>
            <ThemedButton
              title="Sil"
              onPress={handleDelete}
              variant="danger"
              accessibilityLabel="Minnet kaydını sil"
              accessibilityHint="Minnet kaydını silmek için dokunun"
            />
          </View>
        </View>
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
      paddingBottom: theme.spacing.large,
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
