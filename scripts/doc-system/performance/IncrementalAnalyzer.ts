/**
 * Incremental Analyzer
 * 
 * Tracks file changes and only re-analyzes modified files
 * to improve performance for large codebases.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { AnalysisResult, FileAnalysis } from '../analyzer/types.js';

export interface FileState {
  path: string;
  hash: string;
  lastModified: number;
  analysis?: FileAnalysis;
}

export interface IncrementalState {
  version: string;
  timestamp: number;
  files: Map<string, FileState>;
  lastAnalysis?: AnalysisResult;
}

/**
 * Incremental Analyzer for tracking and analyzing only changed files
 */
export class IncrementalAnalyzer {
  private state: IncrementalState;
  private stateFile: string;

  constructor(private rootPath: string, stateDir: string = '.doc-system') {
    this.stateFile = path.join(rootPath, stateDir, 'incremental-state.json');
    this.state = {
      version: '1.0.0',
      timestamp: Date.now(),
      files: new Map(),
    };
  }

  /**
   * Load previous state from disk
   */
  async loadState(): Promise<void> {
    try {
      const content = await fs.readFile(this.stateFile, 'utf-8');
      const parsed = JSON.parse(content);

      // Convert files array back to Map
      this.state = {
        ...parsed,
        files: new Map(parsed.files || []),
      };

      console.log(
        `📂 Loaded incremental state: ${this.state.files.size} files tracked`
      );
    } catch (error) {
      // State file doesn't exist or is invalid, start fresh
      console.log('📂 No previous state found, starting fresh');
    }
  }

  /**
   * Save current state to disk
   */
  async saveState(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.stateFile);
      await fs.mkdir(dir, { recursive: true });

      // Convert Map to array for JSON serialization
      const serializable = {
        ...this.state,
        files: Array.from(this.state.files.entries()),
        timestamp: Date.now(),
      };

      await fs.writeFile(
        this.stateFile,
        JSON.stringify(serializable, null, 2),
        'utf-8'
      );

      console.log(`💾 Saved incremental state: ${this.state.files.size} files`);
    } catch (error) {
      console.error('⚠️  Failed to save incremental state:', error);
    }
  }

  /**
   * Detect which files have changed since last analysis
   */
  async detectChangedFiles(currentFiles: string[]): Promise<{
    changed: string[];
    added: string[];
    removed: string[];
    unchanged: string[];
  }> {
    const changed: string[] = [];
    const added: string[] = [];
    const unchanged: string[] = [];
    const currentFileSet = new Set(currentFiles);
    const previousFileSet = new Set(this.state.files.keys());

    // Check each current file
    for (const file of currentFiles) {
      const previousState = this.state.files.get(file);

      if (!previousState) {
        // New file
        added.push(file);
      } else {
        // Check if file has changed
        const currentHash = await this.calculateFileHash(file);
        if (currentHash !== previousState.hash) {
          changed.push(file);
        } else {
          unchanged.push(file);
        }
      }
    }

    // Find removed files
    const removed = Array.from(previousFileSet).filter(
      (file) => !currentFileSet.has(file)
    );

    return { changed, added, removed, unchanged };
  }

  /**
   * Update file state after analysis
   */
  async updateFileState(
    filePath: string,
    analysis: FileAnalysis
  ): Promise<void> {
    const hash = await this.calculateFileHash(filePath);
    const stats = await fs.stat(filePath);

    this.state.files.set(filePath, {
      path: filePath,
      hash,
      lastModified: stats.mtimeMs,
      analysis,
    });
  }

  /**
   * Get cached analysis for unchanged file
   */
  getCachedAnalysis(filePath: string): FileAnalysis | null {
    const state = this.state.files.get(filePath);
    return state?.analysis || null;
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * Remove file from state
   */
  removeFile(filePath: string): void {
    this.state.files.delete(filePath);
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.state.files.clear();
    this.state.lastAnalysis = undefined;
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    totalFiles: number;
    analyzedFiles: number;
    oldestAnalysis: number | null;
    newestAnalysis: number | null;
  } {
    const files = Array.from(this.state.files.values());
    const analyzedFiles = files.filter((f) => f.analysis).length;

    const timestamps = files
      .map((f) => f.lastModified)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);

    return {
      totalFiles: files.length,
      analyzedFiles,
      oldestAnalysis: timestamps[0] || null,
      newestAnalysis: timestamps[timestamps.length - 1] || null,
    };
  }

  /**
   * Merge incremental analysis results with previous results
   */
  mergeAnalysisResults(
    newAnalysis: Partial<AnalysisResult>,
    unchangedFiles: string[]
  ): AnalysisResult {
    const merged: AnalysisResult = {
      unusedImports: [],
      unusedFunctions: [],
      unusedComponents: [],
      mixedLogicFiles: [],
      splitEntities: [],
      deadCode: [],
    };

    // Add new analysis results
    if (newAnalysis.unusedImports) {
      merged.unusedImports.push(...newAnalysis.unusedImports);
    }
    if (newAnalysis.unusedFunctions) {
      merged.unusedFunctions.push(...newAnalysis.unusedFunctions);
    }
    if (newAnalysis.unusedComponents) {
      merged.unusedComponents.push(...newAnalysis.unusedComponents);
    }
    if (newAnalysis.mixedLogicFiles) {
      merged.mixedLogicFiles.push(...newAnalysis.mixedLogicFiles);
    }
    if (newAnalysis.splitEntities) {
      merged.splitEntities.push(...newAnalysis.splitEntities);
    }
    if (newAnalysis.deadCode) {
      merged.deadCode.push(...newAnalysis.deadCode);
    }

    // Add cached results from unchanged files
    if (this.state.lastAnalysis) {
      const unchangedSet = new Set(unchangedFiles);

      // Filter previous results to only include unchanged files
      merged.unusedImports.push(
        ...this.state.lastAnalysis.unusedImports.filter((item) =>
          unchangedSet.has(item.filePath)
        )
      );
      merged.unusedFunctions.push(
        ...this.state.lastAnalysis.unusedFunctions.filter((item) =>
          unchangedSet.has(item.filePath)
        )
      );
      merged.unusedComponents.push(
        ...this.state.lastAnalysis.unusedComponents.filter((item) =>
          unchangedSet.has(item.filePath)
        )
      );
      merged.mixedLogicFiles.push(
        ...this.state.lastAnalysis.mixedLogicFiles.filter((item) =>
          unchangedSet.has(item.filePath)
        )
      );
    }

    // Update last analysis
    this.state.lastAnalysis = merged;

    return merged;
  }

  /**
   * Check if incremental analysis is beneficial
   */
  shouldUseIncremental(
    totalFiles: number,
    changedFiles: number
  ): boolean {
    // Use incremental if less than 30% of files changed
    const changeRatio = changedFiles / totalFiles;
    return changeRatio < 0.3 && totalFiles > 10;
  }
}
