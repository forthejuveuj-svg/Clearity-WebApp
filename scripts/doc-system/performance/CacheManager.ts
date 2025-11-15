/**
 * Cache Manager for Performance Optimization
 * 
 * Provides caching for TypeScript programs, AST, and analysis results
 * to avoid redundant processing of unchanged files.
 */

import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
  data: T;
  hash: string;
  timestamp: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Cache Manager for storing and retrieving cached data
 */
export class CacheManager {
  private programCache: Map<string, CacheEntry<ts.Program>> = new Map();
  private astCache: Map<string, CacheEntry<ts.SourceFile>> = new Map();
  private analysisCache: Map<string, CacheEntry<any>> = new Map();
  private fileHashCache: Map<string, string> = new Map();
  
  private stats = {
    programHits: 0,
    programMisses: 0,
    astHits: 0,
    astMisses: 0,
    analysisHits: 0,
    analysisMisses: 0,
  };

  constructor(private cacheDir?: string) {}

  /**
   * Get cached TypeScript program if available and valid
   */
  async getCachedProgram(
    files: string[],
    compilerOptions: ts.CompilerOptions
  ): Promise<ts.Program | null> {
    const cacheKey = this.generateProgramCacheKey(files, compilerOptions);
    const cached = this.programCache.get(cacheKey);

    if (!cached) {
      this.stats.programMisses++;
      return null;
    }

    // Verify all files are still unchanged
    const allValid = await this.verifyFilesUnchanged(files, cached.hash);
    if (!allValid) {
      this.programCache.delete(cacheKey);
      this.stats.programMisses++;
      return null;
    }

    this.stats.programHits++;
    return cached.data;
  }

  /**
   * Cache TypeScript program
   */
  async cacheProgram(
    files: string[],
    compilerOptions: ts.CompilerOptions,
    program: ts.Program
  ): Promise<void> {
    const cacheKey = this.generateProgramCacheKey(files, compilerOptions);
    const hash = await this.generateFilesHash(files);

    this.programCache.set(cacheKey, {
      data: program,
      hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached AST for a file if available and valid
   */
  async getCachedAST(filePath: string): Promise<ts.SourceFile | null> {
    const cached = this.astCache.get(filePath);

    if (!cached) {
      this.stats.astMisses++;
      return null;
    }

    // Verify file hasn't changed
    const currentHash = await this.getFileHash(filePath);
    if (currentHash !== cached.hash) {
      this.astCache.delete(filePath);
      this.stats.astMisses++;
      return null;
    }

    this.stats.astHits++;
    return cached.data;
  }

  /**
   * Cache AST for a file
   */
  async cacheAST(filePath: string, ast: ts.SourceFile): Promise<void> {
    const hash = await this.getFileHash(filePath);

    this.astCache.set(filePath, {
      data: ast,
      hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached analysis result for a file
   */
  async getCachedAnalysis<T>(filePath: string): Promise<T | null> {
    const cached = this.analysisCache.get(filePath);

    if (!cached) {
      this.stats.analysisMisses++;
      return null;
    }

    // Verify file hasn't changed
    const currentHash = await this.getFileHash(filePath);
    if (currentHash !== cached.hash) {
      this.analysisCache.delete(filePath);
      this.stats.analysisMisses++;
      return null;
    }

    this.stats.analysisHits++;
    return cached.data as T;
  }

  /**
   * Cache analysis result for a file
   */
  async cacheAnalysis<T>(filePath: string, analysis: T): Promise<void> {
    const hash = await this.getFileHash(filePath);

    this.analysisCache.set(filePath, {
      data: analysis,
      hash,
      timestamp: Date.now(),
    });
  }

  /**
   * Get file hash (with caching)
   */
  private async getFileHash(filePath: string): Promise<string> {
    // Check if we have a cached hash
    const cached = this.fileHashCache.get(filePath);
    if (cached) {
      return cached;
    }

    // Calculate new hash
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      this.fileHashCache.set(filePath, hash);
      return hash;
    } catch (error) {
      // File doesn't exist or can't be read
      return '';
    }
  }

  /**
   * Generate hash for multiple files
   */
  private async generateFilesHash(files: string[]): Promise<string> {
    const hashes = await Promise.all(files.map(f => this.getFileHash(f)));
    return crypto.createHash('sha256').update(hashes.join('')).digest('hex');
  }

  /**
   * Verify all files are unchanged
   */
  private async verifyFilesUnchanged(
    files: string[],
    expectedHash: string
  ): Promise<boolean> {
    const currentHash = await this.generateFilesHash(files);
    return currentHash === expectedHash;
  }

  /**
   * Generate cache key for program
   */
  private generateProgramCacheKey(
    files: string[],
    compilerOptions: ts.CompilerOptions
  ): string {
    const filesKey = files.sort().join('|');
    const optionsKey = JSON.stringify(compilerOptions);
    return crypto
      .createHash('sha256')
      .update(filesKey + optionsKey)
      .digest('hex');
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.programCache.clear();
    this.astCache.clear();
    this.analysisCache.clear();
    this.fileHashCache.clear();
  }

  /**
   * Clear cache for specific file
   */
  clearFile(filePath: string): void {
    this.astCache.delete(filePath);
    this.analysisCache.delete(filePath);
    this.fileHashCache.delete(filePath);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    program: CacheStats;
    ast: CacheStats;
    analysis: CacheStats;
  } {
    return {
      program: {
        hits: this.stats.programHits,
        misses: this.stats.programMisses,
        size: this.programCache.size,
        hitRate:
          this.stats.programHits /
          (this.stats.programHits + this.stats.programMisses || 1),
      },
      ast: {
        hits: this.stats.astHits,
        misses: this.stats.astMisses,
        size: this.astCache.size,
        hitRate:
          this.stats.astHits / (this.stats.astHits + this.stats.astMisses || 1),
      },
      analysis: {
        hits: this.stats.analysisHits,
        misses: this.stats.analysisMisses,
        size: this.analysisCache.size,
        hitRate:
          this.stats.analysisHits /
          (this.stats.analysisHits + this.stats.analysisMisses || 1),
      },
    };
  }

  /**
   * Prune old cache entries
   */
  pruneOldEntries(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();

    // Prune AST cache
    for (const [key, entry] of this.astCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.astCache.delete(key);
      }
    }

    // Prune analysis cache
    for (const [key, entry] of this.analysisCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    programCache: number;
    astCache: number;
    analysisCache: number;
    total: number;
  } {
    // Rough estimates (in MB)
    const programSize = this.programCache.size * 5; // ~5MB per program
    const astSize = this.astCache.size * 0.1; // ~100KB per AST
    const analysisSize = this.analysisCache.size * 0.05; // ~50KB per analysis

    return {
      programCache: programSize,
      astCache: astSize,
      analysisCache: analysisSize,
      total: programSize + astSize + analysisSize,
    };
  }
}
