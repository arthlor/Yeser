import { logger } from './debugConfig';

export interface PerformanceMeasurement {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceProfiler {
  private static measurements = new Map<string, PerformanceMeasurement[]>();
  private static isEnabled = __DEV__ || process.env.EXPO_PUBLIC_PERFORMANCE_PROFILING === 'true';

  static startTimer(operation: string, metadata?: Record<string, unknown>): () => number {
    if (!this.isEnabled) {
      return () => 0;
    }

    const startTime = performance.now();
    const timestamp = Date.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMeasurement(operation, duration, timestamp, metadata);
      return duration;
    };
  }

  static recordMeasurement(
    operation: string,
    duration: number,
    timestamp: number = Date.now(),
    metadata?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) {
      return;
    }

    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }

    const measurements = this.measurements.get(operation);
    if (measurements) {
      measurements.push({
        operation,
        duration,
        timestamp,
        metadata,
      });

      // Keep only last 100 measurements per operation
      if (measurements.length > 100) {
        measurements.shift();
      }
    }
  }

  static getStats(operation: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const durations = measurements.map((m) => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: durations.reduce((a, b) => a + b, 0) / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  static getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const [operation] of this.measurements) {
      stats[operation] = this.getStats(operation);
    }

    return stats;
  }

  static clearMeasurements(operation?: string): void {
    if (operation) {
      this.measurements.delete(operation);
    } else {
      this.measurements.clear();
    }
  }

  static logPerformanceReport(): void {
    if (!this.isEnabled) {
      return;
    }

    const allStats = this.getAllStats();

    logger.info('Performance Report:', allStats);

    // Log specific magic link performance
    const magicLinkStats = this.getStats('magic_link_total');
    if (magicLinkStats) {
      logger.info('Magic Link Performance:', {
        avgTime: `${magicLinkStats.avg.toFixed(2)}ms`,
        p95Time: `${magicLinkStats.p95.toFixed(2)}ms`,
        samples: magicLinkStats.count,
      });
    }
  }
}
