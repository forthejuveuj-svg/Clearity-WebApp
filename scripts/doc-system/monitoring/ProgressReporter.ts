/**
 * Progress Reporter
 * 
 * Provides real-time progress reporting for long-running operations
 * with support for multiple progress bars and status updates.
 */

export interface ProgressOptions {
  total: number;
  label?: string;
  showPercentage?: boolean;
  showETA?: boolean;
  showSpeed?: boolean;
  width?: number;
}

export interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  startTime: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  speed: number; // items per second
}

/**
 * Progress Reporter for tracking operation progress
 */
export class ProgressReporter {
  private current: number = 0;
  private total: number;
  private label: string;
  private startTime: number;
  private lastUpdateTime: number;
  private showPercentage: boolean;
  private showETA: boolean;
  private showSpeed: boolean;
  private width: number;
  private updateInterval: number = 100; // ms
  private lastUpdate: number = 0;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label || 'Progress';
    this.showPercentage = options.showPercentage !== false;
    this.showETA = options.showETA !== false;
    this.showSpeed = options.showSpeed !== false;
    this.width = options.width || 40;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
  }

  /**
   * Update progress
   */
  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    const now = Date.now();

    // Throttle updates to avoid excessive console writes
    if (now - this.lastUpdate < this.updateInterval && current < this.total) {
      return;
    }

    this.lastUpdate = now;
    this.render(message);
  }

  /**
   * Increment progress by one
   */
  increment(message?: string): void {
    this.update(this.current + 1, message);
  }

  /**
   * Complete progress
   */
  complete(message?: string): void {
    this.current = this.total;
    this.render(message);
    process.stdout.write('\n');
  }

  /**
   * Render progress bar
   */
  private render(message?: string): void {
    const state = this.getState();
    const bar = this.createProgressBar(state);
    const stats = this.createStatsString(state);
    const msg = message ? ` ${message}` : '';

    // Clear line and write progress
    process.stdout.write('\r\x1b[K');
    process.stdout.write(`${this.label}: ${bar} ${stats}${msg}`);
  }

  /**
   * Create progress bar string
   */
  private createProgressBar(state: ProgressState): string {
    const filled = Math.floor((state.percentage / 100) * this.width);
    const empty = this.width - filled;

    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);

    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Create statistics string
   */
  private createStatsString(state: ProgressState): string {
    const parts: string[] = [];

    // Current/Total
    parts.push(`${state.current}/${state.total}`);

    // Percentage
    if (this.showPercentage) {
      parts.push(`${state.percentage.toFixed(1)}%`);
    }

    // Speed
    if (this.showSpeed && state.speed > 0) {
      parts.push(`${state.speed.toFixed(1)}/s`);
    }

    // ETA
    if (this.showETA && state.estimatedTimeRemaining > 0) {
      const eta = this.formatTime(state.estimatedTimeRemaining);
      parts.push(`ETA: ${eta}`);
    }

    return parts.join(' | ');
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    const now = Date.now();
    const elapsedTime = now - this.startTime;
    const percentage = (this.current / this.total) * 100;
    const speed = this.current / (elapsedTime / 1000);
    const remaining = this.total - this.current;
    const estimatedTimeRemaining = remaining / speed * 1000;

    return {
      current: this.current,
      total: this.total,
      percentage,
      startTime: this.startTime,
      elapsedTime,
      estimatedTimeRemaining,
      speed,
    };
  }

  /**
   * Format time in human-readable format
   */
  private formatTime(ms: number): string {
    if (!isFinite(ms) || ms < 0) return '--:--';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Multi-progress reporter for tracking multiple operations
 */
export class MultiProgressReporter {
  private reporters: Map<string, ProgressReporter> = new Map();
  private activeReporter: string | null = null;

  /**
   * Create a new progress reporter
   */
  create(id: string, options: ProgressOptions): ProgressReporter {
    const reporter = new ProgressReporter(options);
    this.reporters.set(id, reporter);
    return reporter;
  }

  /**
   * Get reporter by ID
   */
  get(id: string): ProgressReporter | undefined {
    return this.reporters.get(id);
  }

  /**
   * Update progress for a reporter
   */
  update(id: string, current: number, message?: string): void {
    const reporter = this.reporters.get(id);
    if (reporter) {
      this.activeReporter = id;
      reporter.update(current, message);
    }
  }

  /**
   * Complete a reporter
   */
  complete(id: string, message?: string): void {
    const reporter = this.reporters.get(id);
    if (reporter) {
      reporter.complete(message);
      this.reporters.delete(id);
    }
  }

  /**
   * Complete all reporters
   */
  completeAll(): void {
    for (const [id, reporter] of this.reporters.entries()) {
      reporter.complete();
    }
    this.reporters.clear();
  }
}

/**
 * Simple spinner for indeterminate progress
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string = 'Loading...') {
    this.message = message;
  }

  /**
   * Start spinner
   */
  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
  }

  /**
   * Update spinner message
   */
  updateMessage(message: string): void {
    this.message = message;
  }

  /**
   * Stop spinner
   */
  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write('\r\x1b[K');
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  /**
   * Stop with success message
   */
  succeed(message?: string): void {
    this.stop(`✓ ${message || this.message}`);
  }

  /**
   * Stop with error message
   */
  fail(message?: string): void {
    this.stop(`✗ ${message || this.message}`);
  }

  /**
   * Stop with warning message
   */
  warn(message?: string): void {
    this.stop(`⚠ ${message || this.message}`);
  }
}
