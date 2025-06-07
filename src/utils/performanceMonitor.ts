import { logger } from './debugConfig';

export class PerformanceMonitor {
  static measureQueryTime(queryKey: string) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      logger.debug(`Query ${queryKey} took ${duration}ms`);
    };
  }
}
