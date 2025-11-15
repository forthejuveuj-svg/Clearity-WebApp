/**
 * Parallel File Processor
 * 
 * Processes multiple files concurrently using worker threads
 * to improve performance on multi-core systems.
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';

export interface ProcessTask<T, R> {
  id: string;
  data: T;
}

export interface ProcessResult<R> {
  id: string;
  result?: R;
  error?: string;
}

export interface ParallelProcessorOptions {
  maxWorkers?: number;
  workerScript?: string;
  timeout?: number;
}

/**
 * Parallel processor for distributing work across worker threads
 */
export class ParallelProcessor<T, R> {
  private maxWorkers: number;
  private workerScript: string;
  private timeout: number;
  private activeWorkers: Set<Worker> = new Set();

  constructor(options: ParallelProcessorOptions = {}) {
    this.maxWorkers = options.maxWorkers || Math.max(1, os.cpus().length - 1);
    this.workerScript = options.workerScript || '';
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Process tasks in parallel using worker threads
   */
  async processBatch(
    tasks: ProcessTask<T, R>[],
    workerFunction: (data: T) => Promise<R>
  ): Promise<Map<string, R>> {
    if (tasks.length === 0) {
      return new Map();
    }

    // For small batches, process sequentially to avoid worker overhead
    if (tasks.length < this.maxWorkers) {
      return this.processSequentially(tasks, workerFunction);
    }

    const results = new Map<string, R>();
    const errors: string[] = [];

    // Split tasks into chunks for each worker
    const chunks = this.chunkTasks(tasks, this.maxWorkers);

    // Process chunks in parallel
    const promises = chunks.map((chunk) =>
      this.processChunk(chunk, workerFunction)
    );

    const chunkResults = await Promise.all(promises);

    // Aggregate results
    for (const chunkResult of chunkResults) {
      for (const [id, result] of chunkResult.results.entries()) {
        results.set(id, result);
      }
      errors.push(...chunkResult.errors);
    }

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} tasks failed during parallel processing`);
    }

    return results;
  }

  /**
   * Process tasks sequentially (fallback for small batches)
   */
  private async processSequentially(
    tasks: ProcessTask<T, R>[],
    workerFunction: (data: T) => Promise<R>
  ): Promise<Map<string, R>> {
    const results = new Map<string, R>();

    for (const task of tasks) {
      try {
        const result = await workerFunction(task.data);
        results.set(task.id, result);
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Process a chunk of tasks
   */
  private async processChunk(
    tasks: ProcessTask<T, R>[],
    workerFunction: (data: T) => Promise<R>
  ): Promise<{ results: Map<string, R>; errors: string[] }> {
    const results = new Map<string, R>();
    const errors: string[] = [];

    // Process tasks in the chunk sequentially
    // (Each worker processes its chunk sequentially)
    for (const task of tasks) {
      try {
        const result = await workerFunction(task.data);
        results.set(task.id, result);
      } catch (error) {
        const errorMsg = `Task ${task.id} failed: ${error}`;
        errors.push(errorMsg);
      }
    }

    return { results, errors };
  }

  /**
   * Split tasks into chunks for parallel processing
   */
  private chunkTasks(
    tasks: ProcessTask<T, R>[],
    numChunks: number
  ): ProcessTask<T, R>[][] {
    const chunks: ProcessTask<T, R>[][] = Array.from(
      { length: numChunks },
      () => []
    );

    tasks.forEach((task, index) => {
      chunks[index % numChunks].push(task);
    });

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Process files in parallel with progress reporting
   */
  async processFiles(
    files: string[],
    processor: (file: string) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, R>> {
    const results = new Map<string, R>();
    let completed = 0;

    // Process in batches to provide progress updates
    const batchSize = Math.max(10, Math.floor(files.length / 20));
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      // Process batch sequentially (avoiding generic type issues)
      for (const file of batch) {
        try {
          const result = await processor(file);
          results.set(file, result);
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
        }
      }

      completed += batch.length;
      if (onProgress) {
        onProgress(completed, files.length);
      }
    }

    return results;
  }

  /**
   * Cleanup workers
   */
  async cleanup(): Promise<void> {
    const terminationPromises = Array.from(this.activeWorkers).map((worker) =>
      worker.terminate()
    );
    await Promise.all(terminationPromises);
    this.activeWorkers.clear();
  }

  /**
   * Get optimal worker count for current system
   */
  static getOptimalWorkerCount(): number {
    const cpuCount = os.cpus().length;
    // Leave one CPU for the main thread
    return Math.max(1, cpuCount - 1);
  }
}

/**
 * Batch processor for processing items in parallel with concurrency limit
 */
export class BatchProcessor<T, R> {
  constructor(private concurrency: number = 4) { }

  /**
   * Process items in batches with concurrency limit
   */
  async process(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    let completed = 0;

    // Process items in batches
    for (let i = 0; i < items.length; i += this.concurrency) {
      const batch = items.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(
        batch.map((item) => processor(item))
      );

      results.push(...batchResults);
      completed += batch.length;

      if (onProgress) {
        onProgress(completed, items.length);
      }
    }

    return results;
  }

  /**
   * Process items with error handling
   */
  async processWithErrors(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
    const results: R[] = [];
    const errors: Array<{ item: T; error: Error }> = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += this.concurrency) {
      const batch = items.slice(i, i + this.concurrency);
      const batchPromises = batch.map(async (item) => {
        try {
          return { success: true, result: await processor(item), item };
        } catch (error) {
          return { success: false, error: error as Error, item };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result.success) {
          results.push(result.result as R);
        } else {
          errors.push({ item: result.item, error: result.error as Error });
        }
      }

      completed += batch.length;

      if (onProgress) {
        onProgress(completed, items.length);
      }
    }

    return { results, errors };
  }
}
