/**
 * Memory Optimizer
 * 
 * Manages memory usage for large codebases by implementing
 * streaming, chunking, and garbage collection strategies.
 */

import * as fs from 'fs';
import * as readline from 'readline';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usagePercent: number;
}

export interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  maxHeap: number; // MB
}

/**
 * Memory Optimizer for managing memory usage
 */
export class MemoryOptimizer {
  private thresholds: MemoryThresholds;
  private checkInterval: NodeJS.Timeout | null = null;
  private onWarning?: (stats: MemoryStats) => void;
  private onCritical?: (stats: MemoryStats) => void;

  constructor(
    thresholds: Partial<MemoryThresholds> = {},
    callbacks?: {
      onWarning?: (stats: MemoryStats) => void;
      onCritical?: (stats: MemoryStats) => void;
    }
  ) {
    this.thresholds = {
      warning: thresholds.warning || 512, // 512 MB
      critical: thresholds.critical || 1024, // 1 GB
      maxHeap: thresholds.maxHeap || 2048, // 2 GB
    };

    this.onWarning = callbacks?.onWarning;
    this.onCritical = callbacks?.onCritical;
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;

    return {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
      usagePercent: (heapUsedMB / this.thresholds.maxHeap) * 100,
    };
  }

  /**
   * Check memory usage and trigger callbacks if thresholds exceeded
   */
  checkMemory(): MemoryStats {
    const stats = this.getMemoryStats();

    if (stats.heapUsed >= this.thresholds.critical) {
      if (this.onCritical) {
        this.onCritical(stats);
      }
      // Force garbage collection if available
      this.forceGarbageCollection();
    } else if (stats.heapUsed >= this.thresholds.warning) {
      if (this.onWarning) {
        this.onWarning(stats);
      }
    }

    return stats;
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, intervalMs);
  }

  /**
   * Stop monitoring memory usage
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Force garbage collection (requires --expose-gc flag)
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log('🗑️  Forced garbage collection');
    }
  }

  /**
   * Read large file in chunks to avoid loading entire file into memory
   */
  async *readFileInChunks(
    filePath: string,
    chunkSize: number = 1024 * 1024
  ): AsyncGenerator<string> {
    const stream = fs.createReadStream(filePath, {
      encoding: 'utf-8',
      highWaterMark: chunkSize,
    });

    for await (const chunk of stream) {
      yield chunk as string;
    }
  }

  /**
   * Read file line by line to minimize memory usage
   */
  async *readFileByLine(filePath: string): AsyncGenerator<string> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      yield line;
    }
  }

  /**
   * Process array in batches to control memory usage
   */
  async processBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      // Check memory after each batch
      const stats = this.checkMemory();
      if (stats.heapUsed >= this.thresholds.warning) {
        // Pause briefly to allow GC
        await this.pause(100);
      }
    }

    return results;
  }

  /**
   * Pause execution to allow garbage collection
   */
  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate optimal batch size based on available memory
   */
  calculateOptimalBatchSize(
    itemSize: number,
    targetMemoryUsage: number = 100
  ): number {
    const stats = this.getMemoryStats();
    const availableMemory = this.thresholds.warning - stats.heapUsed;
    const targetMemory = Math.min(targetMemoryUsage, availableMemory * 0.5);

    return Math.max(1, Math.floor(targetMemory / itemSize));
  }

  /**
   * Get memory usage report
   */
  getMemoryReport(): string {
    const stats = this.getMemoryStats();
    const lines: string[] = [];

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Memory Usage Report');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Heap Used:    ${stats.heapUsed.toFixed(2)} MB`);
    lines.push(`Heap Total:   ${stats.heapTotal.toFixed(2)} MB`);
    lines.push(`External:     ${stats.external.toFixed(2)} MB`);
    lines.push(`RSS:          ${stats.rss.toFixed(2)} MB`);
    lines.push(`Usage:        ${stats.usagePercent.toFixed(1)}%`);
    lines.push('');
    lines.push('Thresholds:');
    lines.push(`Warning:      ${this.thresholds.warning} MB`);
    lines.push(`Critical:     ${this.thresholds.critical} MB`);
    lines.push(`Max Heap:     ${this.thresholds.maxHeap} MB`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  /**
   * Estimate memory usage for a collection
   */
  estimateCollectionSize<T>(collection: T[]): number {
    if (collection.length === 0) return 0;

    // Sample first item to estimate size
    const sample = JSON.stringify(collection[0]);
    const itemSize = Buffer.byteLength(sample, 'utf-8') / 1024 / 1024; // MB

    return itemSize * collection.length;
  }

  /**
   * Check if operation is safe to perform given current memory
   */
  isSafeToAllocate(estimatedSizeMB: number): boolean {
    const stats = this.getMemoryStats();
    const availableMemory = this.thresholds.critical - stats.heapUsed;

    return estimatedSizeMB < availableMemory * 0.8; // Use 80% of available
  }
}

/**
 * Stream processor for handling large files without loading into memory
 */
export class StreamProcessor {
  /**
   * Process file in streaming fashion
   */
  async processFileStream<T>(
    filePath: string,
    lineProcessor: (line: string) => T | null,
    onBatch?: (batch: T[]) => Promise<void>,
    batchSize: number = 1000
  ): Promise<void> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let batch: T[] = [];

    for await (const line of rl) {
      const result = lineProcessor(line);
      if (result !== null) {
        batch.push(result);

        if (batch.length >= batchSize && onBatch) {
          await onBatch(batch);
          batch = []; // Clear batch
        }
      }
    }

    // Process remaining items
    if (batch.length > 0 && onBatch) {
      await onBatch(batch);
    }
  }

  /**
   * Count lines in file without loading entire file
   */
  async countLines(filePath: string): Promise<number> {
    let count = 0;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      count++;
    }

    return count;
  }
}
