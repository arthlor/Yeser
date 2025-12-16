import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface DonutChartItem {
  value: number;
  label: string;
  color?: string;
}

interface DonutChartProps {
  data: DonutChartItem[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

// Predefined color palette for mood chart
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#eab308', // Yellow
];

/**
 * DonutChart - A simple SVG-based donut chart for mood distribution
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 160,
  strokeWidth = 24,
  centerLabel,
  centerValue,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Calculate total and filter out zero values
  const filteredData = data.filter((item) => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return null;
  }

  // SVG circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate segments with gaps
  const gapAngle = 0.02; // Small gap between segments
  let cumulativeOffset = 0;

  const segments = filteredData.map((item, index) => {
    const percentage = item.value / total;
    const segmentLength = (percentage - gapAngle) * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += percentage * circumference;

    return {
      ...item,
      percentage,
      segmentLength,
      offset,
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {segments.map((segment, index) => (
            <Circle
              key={`segment-${index}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.segmentLength} ${circumference}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="round"
              fill="transparent"
            />
          ))}
        </G>
      </Svg>

      {/* Center content */}
      {(centerLabel || centerValue) && (
        <View style={[styles.centerContent, { width: size, height: size }]}>
          {centerValue && <Text style={styles.centerValue}>{centerValue}</Text>}
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerContent: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerValue: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    centerLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
  });

export default DonutChart;
