# Monitoring and Observability Module

This module provides comprehensive monitoring and observability tools for the Documentation System, including progress reporting, metrics collection, structured logging, and performance profiling.

## Components

### ProgressReporter

Provides real-time progress reporting for long-running operations.

**Features:**
- Visual progress bars
- Percentage completion
- ETA calculation
- Speed tracking (items/second)
- Multi-progress support
- Spinner for indeterminate operations

**Usage:**
```typescript
import { ProgressReporter, Spinner } from './monitoring/index.js';

// Progress bar
const progress = new ProgressReporter({
  total: 100,
  label: 'Analyzing files',
  showPercentage: true,
  showETA: true,
  showSpeed: true,
});

for (let i = 0; i < 100; i++) {
  await processFile(files[i]);
  progress.increment(`Processing ${files[i]}`);
}

progress.complete('Analysis complete!');

// Spinner for indeterminate progress
const spinner = new Spinner('Loading configuration...');
spinner.start();
await loadConfig();
spinner.succeed('Configuration loaded');
```

### MetricsCollector

Collects and aggregates metrics about operations and performance.

**Features:**
- Timing metrics with automatic calculation
- Counter metrics for tracking events
- Gauge metrics for point-in-time values
- Summary statistics
- JSON export
- Global metrics instance

**Usage:**
```typescript
import { MetricsCollector, globalMetrics } from './monitoring/index.js';

// Time an operation
globalMetrics.startTiming('file-analysis');
await analyzeFile(file);
globalMetrics.endTiming('file-analysis', true);

// Or use the time helper
await globalMetrics.time('file-analysis', async () => {
  return await analyzeFile(file);
});

// Increment counters
globalMetrics.incrementCounter('files-processed');
globalMetrics.incrementCounter('errors', { type: 'parse-error' });

// Set gauges
globalMetrics.setGauge('memory-usage', 512, 'MB');
globalMetrics.setGauge('cache-hit-rate', 0.85, '%');

// Get summary
const summary = globalMetrics.getSummary('file-analysis');
console.log(`Average duration: ${summary.averageDuration}ms`);
console.log(`Operations/sec: ${summary.operationsPerSecond}`);

// Get full report
console.log(globalMetrics.getReport());
```

### Logger

Structured logger with severity levels and context.

**Features:**
- Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Colored output
- Timestamps
- Context objects
- Error stack traces
- Log statistics
- JSON export

**Usage:**
```typescript
import { Logger, LogLevel, globalLogger } from './monitoring/index.js';

// Use global logger
globalLogger.info('Starting analysis');
globalLogger.debug('Processing file', { file: 'example.ts' });
globalLogger.warn('Cache miss', { file: 'example.ts' });
globalLogger.error('Parse error', error, { file: 'example.ts' });

// Create custom logger
const logger = new Logger({
  level: LogLevel.DEBUG,
  enableColors: true,
  enableTimestamp: true,
  enableContext: true,
});

logger.info('Custom logger message');

// Get log statistics
const stats = logger.getStats();
console.log(`Total logs: ${stats.total}`);
console.log(`Errors: ${stats.error}`);
console.log(`Warnings: ${stats.warn}`);
```

### PerformanceProfiler

Profiles code execution to identify performance bottlenecks.

**Features:**
- Hierarchical profiling
- Call tree visualization
- Hotspot identification
- Multiple calls aggregation
- Decorator support
- JSON export

**Usage:**
```typescript
import { PerformanceProfiler, globalProfiler, Profile } from './monitoring/index.js';

// Manual profiling
globalProfiler.start('analyze-project');
await analyzeProject();
globalProfiler.end('analyze-project');

// Profile async function
await globalProfiler.profile('analyze-file', async () => {
  return await analyzeFile(file);
});

// Profile sync function
const result = globalProfiler.profileSync('parse-ast', () => {
  return parseAST(source);
});

// Using decorator
class Analyzer {
  @Profile('Analyzer.analyze')
  async analyze(file: string) {
    // Method will be automatically profiled
  }
}

// Get report
console.log(globalProfiler.getReportString());

// Get hotspots
const report = globalProfiler.getReport();
for (const hotspot of report.hotspots) {
  console.log(`${hotspot.name}: ${hotspot.duration}ms (${hotspot.percentage}%)`);
}
```

## Integration Example

Complete example integrating all monitoring components:

```typescript
import {
  ProgressReporter,
  globalMetrics,
  globalLogger,
  globalProfiler,
  LogLevel,
} from './monitoring/index.js';

async function analyzeCodebase(files: string[]) {
  // Set up logging
  globalLogger.setLevel(LogLevel.INFO);
  
  // Start profiling
  globalProfiler.start('analyze-codebase');
  
  // Create progress reporter
  const progress = new ProgressReporter({
    total: files.length,
    label: 'Analyzing files',
    showETA: true,
  });
  
  globalLogger.info('Starting codebase analysis', {
    fileCount: files.length,
  });
  
  // Process files
  for (const file of files) {
    try {
      await globalMetrics.time('file-analysis', async () => {
        await globalProfiler.profile('analyze-file', async () => {
          await analyzeFile(file);
        });
      });
      
      globalMetrics.incrementCounter('files-analyzed');
      progress.increment();
      
    } catch (error) {
      globalLogger.error('Failed to analyze file', error as Error, { file });
      globalMetrics.incrementCounter('analysis-errors');
    }
  }
  
  progress.complete('Analysis complete!');
  globalProfiler.end('analyze-codebase');
  
  // Report results
  console.log('\n' + globalMetrics.getReport());
  console.log('\n' + globalProfiler.getReportString());
  
  const stats = globalLogger.getStats();
  if (stats.error > 0) {
    globalLogger.warn(`Analysis completed with ${stats.error} errors`);
  }
}
```

## CLI Integration

The monitoring tools are integrated into CLI commands:

```bash
# Enable debug logging
doc-system analyze --log-level debug

# Show progress
doc-system analyze --progress

# Enable profiling
doc-system analyze --profile

# Export metrics
doc-system analyze --metrics-output metrics.json

# Verbose mode (all monitoring enabled)
doc-system analyze --verbose
```

## Configuration

Add monitoring settings to `.docsystemrc.json`:

```json
{
  "monitoring": {
    "logLevel": "info",
    "enableProgress": true,
    "enableMetrics": true,
    "enableProfiling": false,
    "metricsOutput": "metrics.json",
    "logOutput": "doc-system.log"
  }
}
```

## Best Practices

1. **Use Appropriate Log Levels**
   - DEBUG: Detailed diagnostic information
   - INFO: General informational messages
   - WARN: Warning messages for potential issues
   - ERROR: Error messages for failures
   - FATAL: Critical errors requiring immediate attention

2. **Profile Strategically**
   - Enable profiling only when investigating performance issues
   - Profile at appropriate granularity (not too fine, not too coarse)
   - Use profiling in development, disable in production

3. **Track Key Metrics**
   - File processing rate
   - Cache hit rates
   - Memory usage
   - Error rates
   - Operation durations

4. **Provide User Feedback**
   - Show progress for operations > 5 seconds
   - Display ETA for long operations
   - Report errors clearly with context
   - Summarize results at completion

## Performance Impact

The monitoring tools are designed to have minimal performance impact:

- **Progress Reporter**: < 1% overhead
- **Metrics Collector**: < 2% overhead
- **Logger**: < 1% overhead (INFO level)
- **Profiler**: 5-10% overhead (disable in production)

## Troubleshooting

### Progress Bar Not Updating
- Check update interval (default 100ms)
- Ensure operations are async
- Verify total count is correct

### Missing Metrics
- Check if operation completed successfully
- Verify timing start/end calls match
- Check metric names for typos

### Log File Not Created
- Verify output path is writable
- Check disk space
- Ensure directory exists

### Profile Data Incomplete
- Verify start/end calls are balanced
- Check for exceptions interrupting profiling
- Ensure profiler is enabled
