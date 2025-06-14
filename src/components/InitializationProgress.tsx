import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeStore } from '@/store/themeStore';
import type { InitializationStage } from '@/services/ServiceManager';

interface InitializationProgressProps {
  stage: InitializationStage;
  progress: number;
  isComplete: boolean;
  isError: boolean;
  error: Error | null;
  databaseReady: boolean;
  visible?: boolean;
}

/**
 * Debug component to show cold start initialization progress
 * Only visible in development or when explicitly enabled
 */
export const InitializationProgress: React.FC<InitializationProgressProps> = ({
  stage,
  progress,
  isComplete,
  isError,
  error,
  databaseReady,
  visible = __DEV__, // Only show in development by default
}) => {
  const { activeTheme } = useThemeStore();

  if (!visible) {
    return null;
  }

  const getStageDescription = (currentStage: InitializationStage): string => {
    switch (currentStage) {
      case 1:
        return 'UI Ready';
      case 2:
        return 'Core Services + Database';
      case 3:
        return 'Background Services';
      case 4:
        return 'Optimizations';
      default:
        return 'Initializing...';
    }
  };

  const getStatusColor = () => {
    if (isError) {
      return activeTheme.colors.error;
    }
    if (isComplete) {
      return activeTheme.colors.primary;
    }
    return activeTheme.colors.onSurface;
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: activeTheme.colors.onSurface }]}>
          Cold Start Progress
        </Text>
        <Text style={[styles.percentage, { color: getStatusColor() }]}>{progress}%</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: `${activeTheme.colors.outline}20` }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: getStatusColor(),
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <View style={styles.details}>
        <Text style={[styles.stage, { color: activeTheme.colors.onSurface }]}>
          Stage {stage}: {getStageDescription(stage)}
        </Text>

        <Text style={[styles.status, { color: activeTheme.colors.outline }]}>
          Database: {databaseReady ? '✅ Ready' : '⏳ Loading'}
        </Text>

        {isError && error && (
          <Text style={[styles.error, { color: activeTheme.colors.error }]}>
            Error: {error.message}
          </Text>
        )}

        {isComplete && (
          <Text style={[styles.complete, { color: activeTheme.colors.primary }]}>
            ✅ Initialization Complete
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    padding: 16,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  details: {
    gap: 4,
  },
  stage: {
    fontSize: 12,
    fontWeight: '500',
  },
  status: {
    fontSize: 11,
  },
  error: {
    fontSize: 11,
    fontWeight: '500',
  },
  complete: {
    fontSize: 11,
    fontWeight: '500',
  },
});
