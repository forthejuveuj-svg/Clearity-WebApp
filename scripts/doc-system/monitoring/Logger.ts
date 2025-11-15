/**
 * Structured Logger
 * 
 * Provides structured logging with severity levels, context,
 * and formatting for better observability.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: Error;
}

export interface LoggerOptions {
  level?: LogLevel;
  enableColors?: boolean;
  enableTimestamp?: boolean;
  enableContext?: boolean;
  outputFile?: string;
}

/**
 * Structured Logger with severity levels
 */
export class Logger {
  private level: LogLevel;
  private enableColors: boolean;
  private enableTimestamp: boolean;
  private enableContext: boolean;
  private outputFile?: string;
  private logs: LogEntry[] = [];

  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.enableColors = options.enableColors !== false;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableContext = options.enableContext !== false;
    this.outputFile = options.outputFile;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Log message with level
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    // Check if level is enabled
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error,
    };

    this.logs.push(entry);

    // Format and output
    const formatted = this.format(entry);
    this.output(formatted, level);
  }

  /**
   * Format log entry
   */
  private format(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.enableTimestamp) {
      const timestamp = new Date(entry.timestamp).toISOString();
      parts.push(this.colorize(`[${timestamp}]`, this.colors.dim));
    }

    // Level
    const levelStr = this.formatLevel(entry.level);
    parts.push(levelStr);

    // Message
    parts.push(entry.message);

    // Context
    if (this.enableContext && entry.context) {
      const contextStr = JSON.stringify(entry.context);
      parts.push(this.colorize(contextStr, this.colors.dim));
    }

    // Error
    if (entry.error) {
      parts.push('\n' + this.formatError(entry.error));
    }

    return parts.join(' ');
  }

  /**
   * Format log level
   */
  private formatLevel(level: LogLevel): string {
    const labels = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO ',
      [LogLevel.WARN]: 'WARN ',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.FATAL]: 'FATAL',
    };

    const colors = {
      [LogLevel.DEBUG]: this.colors.cyan,
      [LogLevel.INFO]: this.colors.green,
      [LogLevel.WARN]: this.colors.yellow,
      [LogLevel.ERROR]: this.colors.red,
      [LogLevel.FATAL]: this.colors.magenta,
    };

    const label = labels[level];
    const color = colors[level];

    return this.colorize(`[${label}]`, color);
  }

  /**
   * Format error with stack trace
   */
  private formatError(error: Error): string {
    const lines: string[] = [];

    lines.push(this.colorize(`Error: ${error.message}`, this.colors.red));

    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1);
      for (const line of stackLines) {
        lines.push(this.colorize(`  ${line.trim()}`, this.colors.dim));
      }
    }

    return lines.join('\n');
  }

  /**
   * Colorize text
   */
  private colorize(text: string, color: string): string {
    if (!this.enableColors) {
      return text;
    }
    return `${color}${text}${this.colors.reset}`;
  }

  /**
   * Output log message
   */
  private output(message: string, level: LogLevel): void {
    // Console output
    if (level >= LogLevel.ERROR) {
      console.error(message);
    } else {
      console.log(message);
    }

    // File output (if configured)
    if (this.outputFile) {
      // TODO: Implement file output
    }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get log statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    for (const log of this.logs) {
      switch (log.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
        case LogLevel.FATAL:
          stats.fatal++;
          break;
      }
    }

    return stats;
  }
}

/**
 * Global logger instance
 */
export const globalLogger = new Logger({
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  enableContext: true,
});
