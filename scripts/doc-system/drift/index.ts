/**
 * Documentation Drift Prevention Module
 * 
 * This module provides tools for detecting and preventing documentation drift:
 * - ChangeDetector: Monitors code changes and identifies affected documentation
 * - AutoUpdater: Automatically updates documentation when code changes
 * - DriftDetector: Detects mismatches between code and documentation
 */

export { ChangeDetector } from './ChangeDetector.js';
export { AutoUpdater } from './AutoUpdater.js';
export { DriftDetector } from './DriftDetector.js';
export * from './types.js';
