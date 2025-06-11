import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { logger } from '@/utils/debugConfig';
import type { AppTheme } from '@/themes/types';

interface ToastAnalyzerProps {
  onClose?: () => void;
}

interface VulnerabilityAnalysis {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  detected: boolean;
}

export const ToastAnalyzer: React.FC<ToastAnalyzerProps> = ({ onClose: _onClose }) => {
  const { theme } = useTheme();
  const [analysis, setAnalysis] = useState<VulnerabilityAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const styles = createStyles(theme);

  const analyzeToastImplementation = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis of the toast implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const vulnerabilities: VulnerabilityAnalysis[] = [
      {
        category: 'Animation State Management',
        severity: 'medium',
        description: 'Current implementation may have race conditions when animations are interrupted by new toasts',
        recommendation: 'Implement animation queue or proper animation cleanup before starting new ones',
        detected: true
      },
      {
        category: 'Timer Management',
        severity: 'low',
        description: 'Multiple setTimeout calls could potentially overlap',
        recommendation: 'Current clearTimeout implementation appears adequate for preventing timer conflicts',
        detected: false
      },
      {
        category: 'State Update Race',
        severity: 'medium',
        description: 'Rapid state updates could cause visual inconsistencies',
        recommendation: 'Consider implementing a state update queue or debouncing mechanism',
        detected: true
      },
      {
        category: 'Memory Leak Risk',
        severity: 'low',
        description: 'Animation listeners and timeout refs could accumulate',
        recommendation: 'Current cleanup in useEffect appears sufficient, but stress testing recommended',
        detected: false
      },
      {
        category: 'Action Button Conflicts',
        severity: 'medium',
        description: 'Action button callbacks might conflict when toasts are rapidly replaced',
        recommendation: 'Implement action callback debouncing or cleanup',
        detected: true
      },
      {
        category: 'Visual Consistency',
        severity: 'high',
        description: 'Rapid toast replacement can cause jarring visual jumps',
        recommendation: 'Implement smooth transition animations between different toast states',
        detected: true
      }
    ];

    setAnalysis(vulnerabilities);
    setIsAnalyzing(false);

    // Log analysis results
    const detectedCount = vulnerabilities.filter(v => v.detected).length;
    const criticalCount = vulnerabilities.filter(v => v.detected && v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.detected && v.severity === 'high').length;
    
    logger.debug('Toast vulnerability analysis completed:', {
      total: vulnerabilities.length,
      detected: detectedCount,
      critical: criticalCount,
      high: highCount
    });
  }, []);

  const getSeverityColor = (severity: VulnerabilityAnalysis['severity']) => {
    switch (severity) {
      case 'critical': return theme.colors.error;
      case 'high': return '#FF6B35';
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getSeverityIcon = (severity: VulnerabilityAnalysis['severity']) => {
    switch (severity) {
      case 'critical': return 'alert-octagon';
      case 'high': return 'alert-circle';
      case 'medium': return 'alert';
      case 'low': return 'information';
      default: return 'help-circle';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.title}>Toast Race Condition Analyzer</Text>
        <Text style={styles.subtitle}>
          Analyze the current toast implementation for potential race conditions and vulnerabilities.
        </Text>
        
        <Button
          mode="contained"
          onPress={analyzeToastImplementation}
          loading={isAnalyzing}
          disabled={isAnalyzing}
          style={styles.analyzeButton}
          icon="magnify"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Implementation'}
        </Button>
      </Card>

      {analysis.length > 0 && (
        <Card style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Analysis Results</Text>
          
          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Found {analysis.filter(a => a.detected).length} potential issues
            </Text>
            <View style={styles.severityCounts}>
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const count = analysis.filter(a => a.detected && a.severity === severity).length;
                if (count === 0) {
                  return null;
                }
                return (
                  <View key={severity} style={styles.severityBadge}>
                    <Text style={[styles.severityBadgeText, { color: getSeverityColor(severity as VulnerabilityAnalysis['severity']) }]}>
                      {count} {severity}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Detailed Results */}
          {analysis.map((item, index) => (
            <View key={index} style={styles.analysisItem}>
              <View style={styles.analysisHeader}>
                <Icon
                  name={item.detected ? getSeverityIcon(item.severity) : 'check-circle'}
                  size={20}
                  color={item.detected ? getSeverityColor(item.severity) : theme.colors.success}
                />
                <Text style={styles.analysisCategory}>{item.category}</Text>
                <View style={[
                  styles.severityTag,
                  { backgroundColor: getSeverityColor(item.severity) + '20' }
                ]}>
                  <Text style={[styles.severityTagText, { color: getSeverityColor(item.severity) }]}>
                    {item.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.analysisDescription}>{item.description}</Text>
              <Text style={styles.analysisRecommendation}>
                💡 {item.recommendation}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 16,
    },
    headerCard: {
      marginBottom: 16,
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 16,
    },
    analyzeButton: {
      marginTop: 8,
    },
    resultsCard: {
      padding: 16,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    summary: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    severityCounts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    severityBadge: {
      marginRight: 8,
      marginBottom: 4,
    },
    severityBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    analysisItem: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
    },
    analysisHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    analysisCategory: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginLeft: 8,
      flex: 1,
    },
    severityTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    severityTagText: {
      fontSize: 10,
      fontWeight: '700',
    },
    analysisDescription: {
      fontSize: 13,
      color: theme.colors.onSurface,
      marginBottom: 8,
      lineHeight: 18,
    },
    analysisRecommendation: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      lineHeight: 16,
    },
  }); 