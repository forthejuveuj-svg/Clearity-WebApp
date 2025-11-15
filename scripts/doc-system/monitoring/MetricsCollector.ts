/**
 * Metrics Collector
 * 
 * Collects and aggregates metrics about analysis operations,
 * file processing, and system performance.
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimingMetric {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

export interface CounterMetric {
  name: string;
  count: number;
  tags?: Record<string, string>;
}

export interface MetricsSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  operationsPerSecond: number;
}

/**
 * Metrics Collector for tracking operation metrics
 */
export class MetricsCollector {
  private timings: TimingMetric[] = [];
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, Metric> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTiming(operation: string): void {
    this.startTimes.set(operation, Date.now());
  }

  /**
   * End timing an operation
   */
  endTiming(operation: string, success: boolean = true, error?: string): void {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.timings.push({
      operation,
      duration,
      startTime,
      endTime,
      success,
      error,
    });

    this.startTimes.delete(operation);
  }

  /**
   * Time an async operation
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startTiming(operation);
    try {
      const result = await fn();
      this.endTiming(operation, true);
      return result;
    } catch (error) {
      this.endTiming(operation, false, String(error));
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, tags?: Record<string, string>): void {
    const key = this.getCounterKey(name, tags);
    const existing = this.counters.get(key);

    if (existing) {
      existing.count++;
    } else {
      this.counters.set(key, { name, count: 1, tags });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(
    name: string,
    value: number,
    unit: string = '',
    tags?: Record<string, string>
  ): void {
    const key = this.getCounterKey(name, tags);
    this.gauges.set(key, {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.getCounterKey(name, tags);
    return this.counters.get(key)?.count || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, tags?: Record<string, string>): number | undefined {
    const key = this.getCounterKey(name, tags);
    return this.gauges.get(key)?.value;
  }

  /**
   * Get all timings for an operation
   */
  getTimings(operation?: string): TimingMetric[] {
    if (operation) {
      return this.timings.filter((t) => t.operation === operation);
    }
    return this.timings;
  }

  /**
   * Get summary statistics for an operation
   */
  getSummary(operation?: string): MetricsSummary {
    const timings = this.getTimings(operation);

    if (timings.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationsPerSecond: 0,
      };
    }

    const durations = timings.map((t) => t.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const successfulOperations = timings.filter((t) => t.success).length;
    const failedOperations = timings.length - successfulOperations;

    const firstStart = Math.min(...timings.map((t) => t.startTime));
    const lastEnd = Math.max(...timings.map((t) => t.endTime));
    const totalTime = (lastEnd - firstStart) / 1000; // seconds

    return {
      totalOperations: timings.length,
      successfulOperations,
      failedOperations,
      totalDuration,
      averageDuration: totalDuration / timings.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      operationsPerSecond: totalTime > 0 ? timings.length / totalTime : 0,
    };
  }

  /**
   * Get all metrics as a report
   */
  getReport(): string {
    const lines: string[] = [];

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Metrics Report');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');

    // Timing metrics
    const operations = [...new Set(this.timings.map((t) => t.operation))];
    if (operations.length > 0) {
      lines.push('⏱️  Timing Metrics:');
      lines.push('');

      for (const operation of operations) {
        const summary = this.getSummary(operation);
        lines.push(`  ${operation}:`);
        lines.push(`    Total Operations: ${summary.totalOperations}`);
        lines.push(`    Successful: ${summary.successfulOperations}`);
        lines.push(`    Failed: ${summary.failedOperations}`);
        lines.push(
          `    Average Duration: ${summary.averageDuration.toFixed(2)}ms`
        );
        lines.push(`    Min Duration: ${summary.minDuration.toFixed(2)}ms`);
        lines.push(`    Max Duration: ${summary.maxDuration.toFixed(2)}ms`);
        lines.push(
          `    Operations/sec: ${summary.operationsPerSecond.toFixed(2)}`
        );
        lines.push('');
      }
    }

    // Counter metrics
    if (this.counters.size > 0) {
      lines.push('🔢 Counter Metrics:');
      lines.push('');

      for (const [key, counter] of this.counters.entries()) {
        const tags = counter.tags
          ? ` (${Object.entries(counter.tags)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')})`
          : '';
        lines.push(`  ${counter.name}${tags}: ${counter.count}`);
      }
      lines.push('');
    }

    // Gauge metrics
    if (this.gauges.size > 0) {
      lines.push('📊 Gauge Metrics:');
      lines.push('');

      for (const [key, gauge] of this.gauges.entries()) {
        const tags = gauge.tags
          ? ` (${Object.entries(gauge.tags)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')})`
          : '';
        const unit = gauge.unit ? ` ${gauge.unit}` : '';
        lines.push(`  ${gauge.name}${tags}: ${gauge.value}${unit}`);
      }
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        timings: this.timings,
        counters: Array.from(this.counters.values()),
        gauges: Array.from(this.gauges.values()),
        summary: this.getSummary(),
      },
      null,
      2
    );
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.timings = [];
    this.counters.clear();
    this.gauges.clear();
    this.startTimes.clear();
  }

  /**
   * Get counter key with tags
   */
  private getCounterKey(
    name: string,
    tags?: Record<string, string>
  ): string {
    if (!tags) return name;

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${tagString}}`;
  }
}

/**
 * Global metrics collector instance
 */
export const globalMetrics = new MetricsCollector();
