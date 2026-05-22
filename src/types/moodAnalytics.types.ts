import type { MoodEmoji } from './mood.types';

export type MoodAnalyticsRange = '15d' | '30d' | '90d' | '5e' | '15e' | '30e';

export interface MoodNarrativeInsight {
  logical: string;
  emotional: string;
  suggestions: string[];
}

export type MoodInsightRiskLevel = 'none' | 'mild_distress' | 'high_distress' | 'crisis';

export interface HighlightedMoodInsight {
  title: string;
  description: string;
  emoji: string;
}

export interface AIInsightResponse {
  narrative: MoodNarrativeInsight | null;
  highlighted_insight: HighlightedMoodInsight | null;
  generated_at?: string;
  entry_count_at_generation?: number;
  statement_count_at_generation?: number;
  range_entry_count_at_generation?: number;
  analysis_details?: Record<string, unknown> | null;
  risk_level?: MoodInsightRiskLevel;
  source_hash?: string | null;
  is_preview_only?: boolean;
  remaining?: number;
  resetInSeconds?: number;
  error?: string;
}

export interface MoodInsightSnapshot {
  range: MoodAnalyticsRange;
  language: 'en' | 'tr' | 'es';
  highlighted_insight: HighlightedMoodInsight | null;
  narrative: MoodNarrativeInsight | null;
  generated_at: string;
  entry_count_at_generation: number;
  statement_count_at_generation?: number;
  range_entry_count_at_generation?: number;
  analysis_details?: Record<string, unknown> | null;
  risk_level?: MoodInsightRiskLevel;
  source_hash?: string | null;
  is_preview_only?: boolean;
}

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

export interface MoodAnalyticsResponse {
  range: MoodAnalyticsRange;
  generatedAt: string;
  overview: MoodAnalyticsOverview;
  moodCounts: MoodCount[];
  trend: MoodTrendPoint[];
  highlightedStatements: HighlightedStatement[];
  narrative: MoodNarrativeInsight;
  remaining?: number;
  resetInSeconds?: number;
  error?: string;
}
