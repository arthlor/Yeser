import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { NetworkHealth, networkMonitorService } from '@/services/networkMonitorService';
import { logger } from '@/utils/debugConfig';

import type { AppTheme } from '@/themes/types';

interface NetworkStatusProps {
  showDetails?: boolean;
}

/**
 * 🔍 NETWORK STATUS DEBUG COMPONENT
 * Shows real-time network health for debugging simulator issues
 * Only visible in development mode
 */
const NetworkStatus: React.FC<NetworkStatusProps> = ({ showDetails = false }) => {
  const { theme } = useTheme();
  const { showSuccess } = useGlobalError();
  const [health, setHealth] = useState<NetworkHealth>(networkMonitorService.getHealth());
  const [expanded, setExpanded] = useState(showDetails);

  useEffect(() => {
    if (!__DEV__) {
      return; // Only show in development
    }

    const unsubscribe = networkMonitorService.subscribe((newHealth) => {
      setHealth(newHealth);
    });

    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    try {
      const newHealth = await networkMonitorService.checkNow();
      setHealth(newHealth);
      logger.debug('Network health refreshed manually');
    } catch (error) {
      logger.error('Failed to refresh network health', error as Error);
    }
  };

  const handleShowTroubleshooting = () => {
    const steps = networkMonitorService.getSimulatorTroubleshooting();
    logger.debug('Simulator troubleshooting steps:', { extra: { steps } });
    showSuccess(`iOS Simulator Troubleshooting:\n${steps.join('\n')}`);
  };

  // Don't render in production
  if (!__DEV__) {
    return null;
  }

  const styles = createStyles(theme);

  const getHealthColor = () => {
    if (!health.isOnline) {
      return theme.colors.error;
    }
    if (health.issues.length > 2) {
      return theme.colors.error;
    }
    if (health.issues.length > 0) {
      return theme.colors.warning;
    }
    return theme.colors.success;
  };

  const getHealthIcon = () => {
    if (!health.isOnline) {
      return 'wifi-off';
    }
    if (health.issues.length > 2) {
      return 'alert-circle';
    }
    if (health.issues.length > 0) {
      return 'alert';
    }
    return 'wifi';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Icon name={getHealthIcon()} size={16} color={getHealthColor()} />
        <Text style={[styles.title, { color: getHealthColor() }]}>
          Network {health.issues.length > 0 ? 'Issues' : 'OK'}
        </Text>
        {health.isSimulator && <Text style={styles.simulatorBadge}>SIM</Text>}
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.onSurface}
        />
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
          {/* Connection Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection Status</Text>
            <View style={styles.statusGrid}>
              <StatusItem label="Online" value={health.isOnline} theme={theme} />
              <StatusItem label="Google" value={health.canReachGoogle} theme={theme} />
              <StatusItem label="Supabase" value={health.canReachSupabase} theme={theme} />
              <StatusItem label="Type" value={health.connectionType} theme={theme} />
            </View>
          </View>

          {/* Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <Text style={styles.metricText}>
              Latency: {health.latency ? `${health.latency}ms` : 'Unknown'}
            </Text>
            <Text style={styles.metricText}>
              Last Check: {health.lastChecked.toLocaleTimeString()}
            </Text>
          </View>

          {/* Issues */}
          {health.issues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Issues</Text>
              {health.issues.map((issue, index) => (
                <Text key={index} style={styles.issueText}>
                  • {issue}
                </Text>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {health.recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {health.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendationText}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.refreshButton]}
              onPress={handleRefresh}
            >
              <Icon name="refresh" size={14} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Refresh</Text>
            </TouchableOpacity>

            {health.isSimulator && health.issues.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.helpButton]}
                onPress={handleShowTroubleshooting}
              >
                <Icon name="help-circle" size={14} color={theme.colors.warning} />
                <Text style={[styles.actionText, { color: theme.colors.warning }]}>Help</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

interface StatusItemProps {
  label: string;
  value: boolean | string;
  theme: AppTheme;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, theme }) => {
  const isBoolean = typeof value === 'boolean';
  const color = isBoolean
    ? value
      ? theme.colors.success
      : theme.colors.error
    : theme.colors.onSurface;

  const statusItemStyles = createStatusItemStyles(theme);

  return (
    <View style={statusItemStyles.container}>
      <Text style={statusItemStyles.label}>{label}:</Text>
      <Text style={[statusItemStyles.value, { color }]}>
        {isBoolean ? (value ? '✓' : '✗') : String(value)}
      </Text>
    </View>
  );
};

const createStatusItemStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 2,
    },
    label: {
      color: theme.colors.onSurface,
      fontSize: 12,
    },
    value: {
      fontSize: 12,
      fontWeight: '500',
    },
  });

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      margin: 8,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    simulatorBadge: {
      backgroundColor: theme.colors.warning,
      color: theme.colors.onWarning,
      fontSize: 10,
      fontWeight: 'bold',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 8,
    },
    details: {
      maxHeight: 300,
    },
    section: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statusGrid: {
      gap: 4,
    },
    metricText: {
      fontSize: 12,
      color: theme.colors.onSurface,
      marginVertical: 2,
    },
    issueText: {
      fontSize: 12,
      color: theme.colors.error,
      marginVertical: 1,
    },
    recommendationText: {
      fontSize: 12,
      color: theme.colors.warning,
      marginVertical: 1,
    },
    actions: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
    },
    refreshButton: {
      borderColor: theme.colors.primary,
    },
    helpButton: {
      borderColor: theme.colors.warning,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
  });

export default NetworkStatus;
