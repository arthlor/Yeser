import type { MoodEmoji } from './mood.types';

export type MoodAnalyticsRange = '7d' | '30d' | '90d' | '365d';

export interface MoodCount {
  mood: MoodEmoji;
  count: number;
  percentage: number;
}

export interface MoodTrendPoint {
  date: string;
  entryCount: number;
  dominantMood: MoodEmoji | null;
  moodCounts: Record<MoodEmoji, number>;
}

export interface HighlightedStatement {
  entryDate: string;
  statement: string;
  mood: MoodEmoji;
  weight: number;
}

export interface MoodBalanceScore {
  value: number; // 0-100 scale
  label: 'imbalanced' | 'neutral' | 'balanced';
}

export interface MoodAnalyticsOverview {
  totalEntries: number;
  analyzedStatements: number;
  dominantMood: MoodEmoji | null;
  balanceScore: MoodBalanceScore;
}

export interface MoodNarrativeInsight {
  logical: string;
  emotional: string;
  suggestions: string[];
}

export interface MoodAnalyticsResponse {
  range: MoodAnalyticsRange;
  generatedAt: string;
  overview: MoodAnalyticsOverview;
  moodCounts: MoodCount[];
  trend: MoodTrendPoint[];
  highlightedStatements: HighlightedStatement[];
  narrative: MoodNarrativeInsight;
}
