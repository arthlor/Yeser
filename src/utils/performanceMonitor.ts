import { logger } from './debugConfig';
import { analyticsService } from '@/services/analyticsService';
import { PerformanceProfiler } from './performanceProfiler';

/**
 * 🚀 Phase 5: Magic Link Performance Monitor
 *
 * Comprehensive performance monitoring and alerting system for
 * magic link optimizations with real-time metrics and improvement tracking.
 */

export interface PerformanceComparison {
  baseline: {
    avg: number;
    p95: number;
    count: number;
  };
  optimized: {
    avg: number;
    p95: number;
    count: number;
  };
  improvement: {
    avgMs: number;
    avgPercent: number;
    p95Ms: number;
    p95Percent: number;
  };
}

export class MagicLinkPerformanceMonitor {
  private static performanceAlerts: Array<{
    timestamp: number;
    type: 'improvement' | 'degradation' | 'milestone';
    message: string;
    metrics: Record<string, number | string>;
  }> = [];

  /**
   * Log and analyze magic link performance improvements
   */
  static logOptimizationImpact(): void {
    const baseline = PerformanceProfiler.getStats('magic_link_immediate_total');
    const optimizedV1 = PerformanceProfiler.getStats('magic_link_optimized_v1');
    const optimizedV2 = PerformanceProfiler.getStats('magic_link_single_atomic');

    if (baseline) {
      // Compare baseline to V1 optimization
      if (optimizedV1) {
        const comparison = this.calculateImprovement(baseline, optimizedV1);
        if (comparison) {
          this.reportPerformanceImprovement('v1', comparison);
        }
      }

      // Compare baseline to V2 optimization
      if (optimizedV2) {
        const comparison = this.calculateImprovement(baseline, optimizedV2);
        if (comparison) {
          this.reportPerformanceImprovement('v2', comparison);
        }
      }

      // Compare V1 to V2 if both exist
      if (optimizedV1 && optimizedV2) {
        const v1toV2 = this.calculateImprovement(optimizedV1, optimizedV2);
        if (v1toV2) {
          this.reportPerformanceImprovement('v1_to_v2', v1toV2);
        }
      }
    }

    // Report overall performance summary
    this.generatePerformanceReport();
  }

  /**
   * Calculate performance improvement between two measurements
   */
  private static calculateImprovement(
    baseline: ReturnType<typeof PerformanceProfiler.getStats>,
    optimized: ReturnType<typeof PerformanceProfiler.getStats>
  ): PerformanceComparison | null {
    if (!baseline || !optimized) {
      return null;
    }

    const avgImprovement = baseline.avg - optimized.avg;
    const avgImprovementPercent = (avgImprovement / baseline.avg) * 100;
    const p95Improvement = baseline.p95 - optimized.p95;
    const p95ImprovementPercent = (p95Improvement / baseline.p95) * 100;

    return {
      baseline: {
        avg: baseline.avg,
        p95: baseline.p95,
        count: baseline.count,
      },
      optimized: {
        avg: optimized.avg,
        p95: optimized.p95,
        count: optimized.count,
      },
      improvement: {
        avgMs: avgImprovement,
        avgPercent: avgImprovementPercent,
        p95Ms: p95Improvement,
        p95Percent: p95ImprovementPercent,
      },
    };
  }

  /**
   * Report performance improvement with analytics tracking
   */
  private static reportPerformanceImprovement(
    version: 'v1' | 'v2' | 'v1_to_v2',
    comparison: PerformanceComparison
  ): void {
    const improvementData = {
      version,
      avgImprovementMs: comparison.improvement.avgMs,
      avgImprovementPercent: comparison.improvement.avgPercent,
      p95ImprovementMs: comparison.improvement.p95Ms,
      p95ImprovementPercent: comparison.improvement.p95Percent,
      baselineSamples: comparison.baseline.count,
      optimizedSamples: comparison.optimized.count,
    };

    logger.info(`Magic Link Performance Improvement (${version.toUpperCase()}):`, {
      avgImprovement: `${comparison.improvement.avgMs.toFixed(2)}ms (${comparison.improvement.avgPercent.toFixed(1)}%)`,
      p95Improvement: `${comparison.improvement.p95Ms.toFixed(2)}ms (${comparison.improvement.p95Percent.toFixed(1)}%)`,
      samples: {
        baseline: comparison.baseline.count,
        optimized: comparison.optimized.count,
      },
    });

    // Track significant improvements
    if (comparison.improvement.avgPercent > 10) {
      this.performanceAlerts.push({
        timestamp: Date.now(),
        type: 'improvement',
        message: `${version.toUpperCase()} optimization achieved ${comparison.improvement.avgPercent.toFixed(1)}% average improvement`,
        metrics: improvementData,
      });

      analyticsService.logEvent('magic_link_performance_milestone', {
        ...improvementData,
        milestone_type: 'significant_improvement',
      });
    }

    // Track performance milestones
    if (comparison.improvement.avgPercent > 50) {
      analyticsService.logEvent('magic_link_performance_milestone', {
        ...improvementData,
        milestone_type: 'major_improvement',
      });
    }

    analyticsService.logEvent('magic_link_performance_improvement', improvementData);
  }

  /**
   * Generate comprehensive performance report
   */
  private static generatePerformanceReport(): void {
    const allStats = PerformanceProfiler.getAllStats();
    const magicLinkStats = Object.entries(allStats).filter(([key]) => key.includes('magic_link'));

    if (magicLinkStats.length === 0) {
      return;
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalOperations: magicLinkStats.reduce((sum, [, stats]) => sum + (stats?.count || 0), 0),
      operations: magicLinkStats.reduce(
        (acc, [operation, stats]) => {
          if (stats) {
            acc[operation] = {
              count: stats.count,
              avgTime: `${stats.avg.toFixed(2)}ms`,
              p95Time: `${stats.p95.toFixed(2)}ms`,
              minTime: `${stats.min.toFixed(2)}ms`,
              maxTime: `${stats.max.toFixed(2)}ms`,
            };
          }
          return acc;
        },
        {} as Record<string, unknown>
      ),
      alerts: this.performanceAlerts.slice(-10), // Last 10 alerts
    };

    logger.info('Magic Link Performance Report:', report);

    // Log performance summary for production monitoring
    analyticsService.logEvent('magic_link_performance_report', {
      total_operations: report.totalOperations,
      unique_operation_types: magicLinkStats.length,
      alert_count: this.performanceAlerts.length,
    });
  }

  /**
   * Monitor for performance regressions
   */
  static checkForRegressions(): void {
    const currentStats = PerformanceProfiler.getAllStats();

    Object.entries(currentStats).forEach(([operation, stats]) => {
      if (!stats || !operation.includes('magic_link')) {
        return;
      }

      // Alert on unusually slow operations (P95 > 1000ms for non-API operations)
      if (!operation.includes('api') && stats.p95 > 1000) {
        this.performanceAlerts.push({
          timestamp: Date.now(),
          type: 'degradation',
          message: `Performance regression detected in ${operation}: P95 = ${stats.p95.toFixed(2)}ms`,
          metrics: { operation, p95: stats.p95, avg: stats.avg, count: stats.count },
        });

        analyticsService.logEvent('magic_link_performance_regression', {
          operation,
          p95_time: stats.p95,
          avg_time: stats.avg,
          sample_count: stats.count,
        });
      }
    });
  }

  /**
   * Get current performance status for debugging
   */
  static getPerformanceStatus(): {
    isMonitoring: boolean;
    totalMeasurements: number;
    recentAlerts: Array<{ type: string; message: string; timestamp: number }>;
    currentOptimizations: string[];
  } {
    const allStats = PerformanceProfiler.getAllStats();
    const magicLinkOperations = Object.keys(allStats).filter((key) => key.includes('magic_link'));

    return {
      isMonitoring: magicLinkOperations.length > 0,
      totalMeasurements: Object.values(allStats).reduce(
        (sum, stats) => sum + (stats?.count || 0),
        0
      ),
      recentAlerts: this.performanceAlerts.slice(-5).map((alert) => ({
        type: alert.type,
        message: alert.message,
        timestamp: alert.timestamp,
      })),
      currentOptimizations: magicLinkOperations.filter((op) => op.includes('optimized')),
    };
  }

  /**
   * Clear performance data (for testing/reset)
   */
  static reset(): void {
    this.performanceAlerts = [];
    PerformanceProfiler.clearMeasurements();
    logger.debug('Magic Link Performance Monitor reset');
  }

  /**
   * Start periodic performance monitoring
   */
  static startPeriodicMonitoring(intervalMs: number = 60000): () => void {
    const interval = setInterval(() => {
      this.checkForRegressions();
      this.logOptimizationImpact();
    }, intervalMs);

    logger.debug('Magic Link Performance Monitor started', { intervalMs });

    return () => {
      clearInterval(interval);
      logger.debug('Magic Link Performance Monitor stopped');
    };
  }
}
