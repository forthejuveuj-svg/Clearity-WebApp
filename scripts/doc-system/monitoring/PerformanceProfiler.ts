/**
 * Performance Profiler
 * 
 * Profiles code execution to identify performance bottlenecks
 * and optimization opportunities.
 */

export interface ProfileEntry {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  calls: number;
  children: ProfileEntry[];
  parent?: ProfileEntry;
}

export interface ProfileReport {
  totalDuration: number;
  entries: ProfileEntry[];
  hotspots: Array<{
    name: string;
    duration: number;
    percentage: number;
    calls: number;
  }>;
}

/**
 * Performance Profiler for identifying bottlenecks
 */
export class PerformanceProfiler {
  private entries: Map<string, ProfileEntry> = new Map();
  private stack: ProfileEntry[] = [];
  private enabled: boolean = true;

  /**
   * Start profiling a section
   */
  start(name: string): void {
    if (!this.enabled) return;

    const entry: ProfileEntry = {
      name,
      duration: 0,
      startTime: performance.now(),
      endTime: 0,
      calls: 1,
      children: [],
    };

    // Link to parent if exists
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1];
      entry.parent = parent;
      parent.children.push(entry);
    }

    this.stack.push(entry);
  }

  /**
   * End profiling a section
   */
  end(name: string): void {
    if (!this.enabled) return;

    if (this.stack.length === 0) {
      console.warn(`No matching start for: ${name}`);
      return;
    }

    const entry = this.stack.pop()!;

    if (entry.name !== name) {
      console.warn(
        `Mismatched profile end: expected ${entry.name}, got ${name}`
      );
      this.stack.push(entry); // Put it back
      return;
    }

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;

    // Store or merge with existing entry
    const existing = this.entries.get(name);
    if (existing) {
      existing.calls++;
      existing.duration += entry.duration;
      // Merge children
      for (const child of entry.children) {
        const existingChild = existing.children.find(
          (c) => c.name === child.name
        );
        if (existingChild) {
          existingChild.calls++;
          existingChild.duration += child.duration;
        } else {
          existing.children.push(child);
        }
      }
    } else {
      this.entries.set(name, entry);
    }
  }

  /**
   * Profile an async function
   */
  async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * Profile a sync function
   */
  profileSync<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      return fn();
    } finally {
      this.end(name);
    }
  }

  /**
   * Get profile report
   */
  getReport(): ProfileReport {
    const entries = Array.from(this.entries.values());
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);

    // Find hotspots (top 10 by duration)
    const hotspots = entries
      .map((e) => ({
        name: e.name,
        duration: e.duration,
        percentage: (e.duration / totalDuration) * 100,
        calls: e.calls,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalDuration,
      entries,
      hotspots,
    };
  }

  /**
   * Get formatted report string
   */
  getReportString(): string {
    const report = this.getReport();
    const lines: string[] = [];

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Performance Profile Report');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(`Total Duration: ${report.totalDuration.toFixed(2)}ms`);
    lines.push('');

    if (report.hotspots.length > 0) {
      lines.push('🔥 Hotspots (Top 10):');
      lines.push('');

      for (let i = 0; i < report.hotspots.length; i++) {
        const hotspot = report.hotspots[i];
        const bar = this.createBar(hotspot.percentage, 30);
        lines.push(
          `${i + 1}. ${hotspot.name} (${hotspot.calls} calls)`
        );
        lines.push(
          `   ${bar} ${hotspot.duration.toFixed(2)}ms (${hotspot.percentage.toFixed(1)}%)`
        );
        lines.push('');
      }
    }

    // Show call tree for top entry
    if (report.entries.length > 0) {
      const topEntry = report.entries
        .filter((e) => !e.parent)
        .sort((a, b) => b.duration - a.duration)[0];

      if (topEntry) {
        lines.push('📊 Call Tree (Top Entry):');
        lines.push('');
        this.appendCallTree(lines, topEntry, 0);
      }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
  }

  /**
   * Append call tree to lines
   */
  private appendCallTree(
    lines: string[],
    entry: ProfileEntry,
    depth: number
  ): void {
    const indent = '  '.repeat(depth);
    const avgDuration = entry.duration / entry.calls;

    lines.push(
      `${indent}${entry.name}: ${entry.duration.toFixed(2)}ms (${entry.calls} calls, avg: ${avgDuration.toFixed(2)}ms)`
    );

    // Sort children by duration
    const sortedChildren = [...entry.children].sort(
      (a, b) => b.duration - a.duration
    );

    for (const child of sortedChildren) {
      this.appendCallTree(lines, child, depth + 1);
    }
  }

  /**
   * Create progress bar
   */
  private createBar(percentage: number, width: number): string {
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Clear all profile data
   */
  clear(): void {
    this.entries.clear();
    this.stack = [];
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export profile data as JSON
   */
  exportJSON(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get entry by name
   */
  getEntry(name: string): ProfileEntry | undefined {
    return this.entries.get(name);
  }

  /**
   * Get all entries
   */
  getAllEntries(): ProfileEntry[] {
    return Array.from(this.entries.values());
  }
}

/**
 * Global profiler instance
 */
export const globalProfiler = new PerformanceProfiler();

/**
 * Decorator for profiling methods
 */
export function Profile(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const profileName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return await globalProfiler.profile(profileName, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
