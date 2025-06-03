import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getRandomGratitudeEntry } from '@/api/gratitudeApi';
import { useTheme } from '@/providers/ThemeProvider';
import { gratitudeEntrySchema, type GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { AppTheme } from '@/themes/types';

import InspirationCard from './InspirationCard';
import ThrowbackTeaser from './ThrowbackTeaser';

interface ThrowbackEntryData {
  statements: string[];
  entry_date: string;
}

interface DiscoverySectionProps {
  currentCount: number;
  dailyGoal: number;
  onNavigateToThrowback: (entry: ThrowbackEntryData) => void;
}

const DiscoverySection: React.FC<DiscoverySectionProps> = ({
  currentCount,
  dailyGoal,
  onNavigateToThrowback,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Local state for home screen throwback display (separate from modal)
  const [homeThrowbackEntry, setHomeThrowbackEntry] = useState<ThrowbackEntryData | null>(null);
  const [homeThrowbackLoading, setHomeThrowbackLoading] = useState(false);
  const [homeThrowbackError, setHomeThrowbackError] = useState<string | null>(null);

  // Fetch past entry for home screen display
  const fetchHomeThrowback = async () => {
    setHomeThrowbackLoading(true);
    setHomeThrowbackError(null);

    try {
      const rawEntry = await getRandomGratitudeEntry();

      if (!rawEntry) {
        setHomeThrowbackEntry(null);
        setHomeThrowbackError(null); // No error, just no entries yet
        return;
      }

      const validationResult = gratitudeEntrySchema.safeParse(rawEntry);

      if (validationResult.success) {
        const entry = validationResult.data;
        setHomeThrowbackEntry({
          statements: entry.statements || [],
          entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
        });
      } else {
        console.error('Validation error in DiscoverySection:', validationResult.error);
        setHomeThrowbackError('Geçmiş kayıt formatı geçersiz');
      }
    } catch (error) {
      console.error('Error fetching home throwback:', error);
      setHomeThrowbackError('Geçmiş kayıtlar alınırken hata oluştu');
    } finally {
      setHomeThrowbackLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchHomeThrowback();
  }, []);

  const handleNavigateToThrowback = () => {
    if (homeThrowbackEntry) {
      onNavigateToThrowback(homeThrowbackEntry);
    }
  };

  const getContextualInspiration = () => {
    if (currentCount >= dailyGoal) {
      return {
        title: 'Harika İş! 🎉',
        message: 'Günlük hedefinizi tamamladınız. Minnet pratiğiniz güçleniyor!',
      };
    }

    if (currentCount > 0) {
      return {
        title: 'Devam Edin! 💪',
        message: 'Güzel bir başlangıç yaptınız. Birkaç minnet daha ekleyerek gününüzü tamamlayın.',
      };
    }

    const inspirations = [
      {
        title: 'Bugün Neye Minnet Duyabilirsiniz?',
        message: 'Küçük anlar bile büyük mutluluklar yaratabilir. Bugünden bir güzellik bulun.',
      },
      {
        title: 'Minnet Kalbi Güçlendirir',
        message: 'Her gün küçük şeyler için minnet duymak, hayata bakış açınızı değiştirir.',
      },
      {
        title: 'Bir Dakika Durun',
        message: 'Etrafınıza bakın. Hangi güzellikleri fark etmemiştiniz?',
      },
    ];

    const randomIndex = Math.floor(Math.random() * inspirations.length);
    return inspirations[randomIndex];
  };

  const inspiration = getContextualInspiration();

  return (
    <View style={styles.container}>
      {/* Past entries section */}
      {homeThrowbackEntry ? (
        <ThrowbackTeaser
          throwbackEntry={homeThrowbackEntry}
          isLoading={homeThrowbackLoading}
          error={homeThrowbackError}
          onNavigateToThrowback={handleNavigateToThrowback}
        />
      ) : homeThrowbackLoading ? (
        <View style={styles.throwbackPlaceholder}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.placeholderText}>Geçmişten bir anı yükleniyor...</Text>
        </View>
      ) : homeThrowbackError ? (
        <View style={styles.throwbackPlaceholder}>
          <View style={styles.placeholderHeader}>
            <Icon name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={styles.placeholderTitle}>Bir Sorun Oluştu</Text>
          </View>
          <Text style={styles.placeholderText}>{homeThrowbackError}</Text>
        </View>
      ) : (
        <View style={styles.throwbackPlaceholder}>
          <View style={styles.placeholderHeader}>
            <Icon name="history" size={20} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.placeholderTitle}>Geçmişten Anılar</Text>
          </View>
          <Text style={styles.placeholderText}>
            Minnet kayıtlarınız arttıkça, burada geçmişten güzel anılarınızı göreceksiniz
          </Text>
        </View>
      )}

      {/* Always show inspiration */}
      <InspirationCard title={inspiration.title} message={inspiration.message} />

      {/* Quick stats if user has made progress */}
      {currentCount > 0 && (
        <View style={styles.quickStats}>
          <Text style={styles.quickStatsTitle}>Bugünün Özeti</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentCount}</Text>
              <Text style={styles.statLabel}>Minnet</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{Math.round((currentCount / dailyGoal) * 100)}%</Text>
              <Text style={styles.statLabel}>Tamamlandı</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingBottom: theme.spacing.xl,
    },
    quickStats: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceVariant + '60',
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    },
    quickStatsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      opacity: 0.8,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.outline + '40',
      marginHorizontal: theme.spacing.lg,
    },
    throwbackPlaceholder: {
      padding: theme.spacing.lg,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    placeholderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    placeholderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
    placeholderText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      opacity: 0.8,
    },
  });

export default DiscoverySection;
