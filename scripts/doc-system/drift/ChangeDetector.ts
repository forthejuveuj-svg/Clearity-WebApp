/**
 * Change Detector - Monitors code changes and identifies affected documentation
 */

import { watch, FSWatcher } from 'chokidar';
import { relative, join, basename, dirname } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as ts from 'typescript';
import {
  FileChange,
  AffectedDocumentation,
  ChangeDetectionResult,
  WatcherConfig,
} from './types.js';

export class ChangeDetector {
  private rootPath: string;
  private docsPath: string;
  private ignorePatterns: string[];
  private debounceMs: number;
  private watcher: FSWatcher | null = null;
  private changeQueue: Map<string, FileChange> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(config: WatcherConfig) {
    this.rootPath = config.rootPath;
    this.docsPath = config.docsPath;
    this.ignorePatterns = config.ignorePatterns;
    this.debounceMs = config.debounceMs;
  }

  /**
   * Start watching for file changes
   */
  startWatching(
    onChange: (result: ChangeDetectionResult) => void | Promise<void>
  ): void {
    console.log('Starting file watcher...');

    this.watcher = watch('**/*.{ts,tsx,js,jsx}', {
      cwd: this.rootPath,
      ignored: this.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => this.handleFileChange(path, 'added', onChange))
      .on('change', (path) => this.handleFileChange(path, 'modified', onChange))
      .on('unlink', (path) => this.handleFileChange(path, 'deleted', onChange));

    console.log('✅ File watcher started');
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('✅ File watcher stopped');
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handle file change event
   */
  private handleFileChange(
    path: string,
    changeType: 'added' | 'modified' | 'deleted',
    onChange: (result: ChangeDetectionResult) => void | Promise<void>
  ): void {
    const absolutePath = join(this.rootPath, path);

    // Add to change queue
    this.changeQueue.set(absolutePath, {
      filePath: absolutePath,
      changeType,
      timestamp: new Date(),
    });

    // Debounce processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.processChangeQueue(onChange);
    }, this.debounceMs);
  }

  /**
   * Process queued changes
   */
  private async processChangeQueue(
    onChange: (result: ChangeDetectionResult) => void | Promise<void>
  ): Promise<void> {
    if (this.changeQueue.size === 0) {
      return;
    }

    const changes = Array.from(this.changeQueue.values());
    this.changeQueue.clear();

    console.log(`\n📝 Processing ${changes.length} file change(s)...`);

    const result = await this.detectAffectedDocumentation(changes);

    // Call the onChange callback
    await onChange(result);
  }

  /**
   * Detect changes from git diff
   */
  async detectChangesFromGit(
    sinceCommit?: string
  ): Promise<ChangeDetectionResult> {
    const { simpleGit } = await import('simple-git');
    const git = simpleGit(this.rootPath);

    try {
      // Get diff
      const diffSummary = await git.diffSummary(sinceCommit ? [sinceCommit] : []);

      const changes: FileChange[] = [];

      // Process changed files
      for (const file of diffSummary.files) {
        // Only process TypeScript/JavaScript files
        if (!/\.(ts|tsx|js|jsx)$/.test(file.file)) {
          continue;
        }

        const absolutePath = join(this.rootPath, file.file);

        // Determine change type
        let changeType: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
        if (file.binary) {
          continue; // Skip binary files
        }

        // Check git status for more accurate change type
        const status = await git.status();
        const fileStatus = status.files.find((f) => f.path === file.file);

        if (fileStatus) {
          if (fileStatus.working_dir === 'D' || fileStatus.index === 'D') {
            changeType = 'deleted';
          } else if (fileStatus.working_dir === 'A' || fileStatus.index === 'A') {
            changeType = 'added';
          } else if (fileStatus.working_dir === 'R' || fileStatus.index === 'R') {
            changeType = 'renamed';
          }
        }

        changes.push({
          filePath: absolutePath,
          changeType,
          timestamp: new Date(),
        });
      }

      return await this.detectAffectedDocumentation(changes);
    } catch (error) {
      console.error('Error detecting changes from git:', error);
      return {
        changes: [],
        affectedDocs: [],
        summary: {
          totalChanges: 0,
          docsToUpdate: 0,
          docsToCreate: 0,
          docsToDelete: 0,
        },
      };
    }
  }

  /**
   * Detect which documentation files are affected by code changes
   */
  async detectAffectedDocumentation(
    changes: FileChange[]
  ): Promise<ChangeDetectionResult> {
    const affectedDocs: AffectedDocumentation[] = [];

    for (const change of changes) {
      const docs = await this.findAffectedDocs(change);
      affectedDocs.push(...docs);
    }

    // Create summary
    const summary = {
      totalChanges: changes.length,
      docsToUpdate: affectedDocs.filter((d) => d.changeType === 'update_required')
        .length,
      docsToCreate: affectedDocs.filter((d) => d.changeType === 'create_required')
        .length,
      docsToDelete: affectedDocs.filter((d) => d.changeType === 'delete_required')
        .length,
    };

    return {
      changes,
      affectedDocs,
      summary,
    };
  }

  /**
   * Find documentation files affected by a single file change
   */
  private async findAffectedDocs(
    change: FileChange
  ): Promise<AffectedDocumentation[]> {
    const affected: AffectedDocumentation[] = [];

    try {
      if (change.changeType === 'deleted') {
        // Find all documentation for this file and mark for deletion
        const docs = await this.findDocsForFile(change.filePath);
        for (const docPath of docs) {
          affected.push({
            docPath,
            reason: `Source file deleted: ${relative(this.rootPath, change.filePath)}`,
            changeType: 'delete_required',
            affectedSections: ['all'],
          });
        }
      } else if (change.changeType === 'added') {
        // Check if file has exported functions that need documentation
        const functions = await this.extractExportedFunctions(change.filePath);
        for (const funcName of functions) {
          const docPath = this.getDocPath(change.filePath, funcName);
          if (!existsSync(docPath)) {
            affected.push({
              docPath,
              reason: `New exported function: ${funcName}`,
              changeType: 'create_required',
              affectedSections: ['all'],
            });
          }
        }
      } else if (change.changeType === 'modified') {
        // Check for signature changes, renamed functions, etc.
        const functions = await this.extractExportedFunctions(change.filePath);

        for (const funcName of functions) {
          const docPath = this.getDocPath(change.filePath, funcName);

          if (!existsSync(docPath)) {
            // New function added to existing file
            affected.push({
              docPath,
              reason: `New exported function: ${funcName}`,
              changeType: 'create_required',
              affectedSections: ['all'],
            });
          } else {
            // Check if signature changed
            const hasSignatureChange = await this.checkSignatureChange(
              change.filePath,
              funcName,
              docPath
            );

            if (hasSignatureChange) {
              affected.push({
                docPath,
                reason: `Function signature changed: ${funcName}`,
                changeType: 'update_required',
                affectedSections: ['Input', 'Output'],
              });
            }
          }
        }

        // Check for deleted functions (docs exist but function doesn't)
        const existingDocs = await this.findDocsForFile(change.filePath);
        for (const docPath of existingDocs) {
          const funcName = basename(docPath, '.md');
          if (!functions.includes(funcName)) {
            affected.push({
              docPath,
              reason: `Function removed from source: ${funcName}`,
              changeType: 'delete_required',
              affectedSections: ['all'],
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error finding affected docs for ${change.filePath}:`, error);
    }

    return affected;
  }

  /**
   * Find all documentation files for a source file
   */
  private async findDocsForFile(filePath: string): Promise<string[]> {
    const { glob } = await import('glob');
    const relativePath = relative(this.rootPath, filePath);
    const docDir = join(
      this.docsPath,
      dirname(relativePath),
      basename(relativePath, '.ts')
    );

    if (!existsSync(docDir)) {
      return [];
    }

    const docs = await glob('*.md', {
      cwd: docDir,
      absolute: true,
    });

    return docs;
  }

  /**
   * Extract exported functions from a file
   */
  private async extractExportedFunctions(filePath: string): Promise<string[]> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const functions: string[] = [];

      const visit = (node: ts.Node) => {
        // Exported function declaration
        if (ts.isFunctionDeclaration(node)) {
          const hasExport = node.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword
          );
          if (hasExport && node.name) {
            functions.push(node.name.text);
          }
        }

        // Exported variable with function
        if (ts.isVariableStatement(node)) {
          const hasExport = node.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword
          );
          for (const declaration of node.declarationList.declarations) {
            if (
              ts.isIdentifier(declaration.name) &&
              declaration.name &&
              hasExport &&
              declaration.initializer &&
              (ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer))
            ) {
              functions.push(declaration.name.text);
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      return functions;
    } catch (error) {
      console.error(`Error extracting functions from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Check if function signature has changed
   */
  private async checkSignatureChange(
    filePath: string,
    functionName: string,
    docPath: string
  ): Promise<boolean> {
    try {
      // Read source file
      const sourceContent = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Find function node
      const functionNode = this.findFunctionNode(sourceFile, functionName);
      if (!functionNode) {
        return false;
      }

      // Extract parameters from source
      const sourceParams = this.extractParametersFromNode(functionNode);

      // Read documentation
      const docContent = await readFile(docPath, 'utf-8');

      // Extract parameters from documentation
      const docParams = this.extractParametersFromDoc(docContent);

      // Compare parameters
      return !this.parametersMatch(sourceParams, docParams);
    } catch (error) {
      console.error(
        `Error checking signature change for ${functionName}:`,
        error
      );
      return false;
    }
  }

  /**
   * Find function node in AST
   */
  private findFunctionNode(
    sourceFile: ts.SourceFile,
    functionName: string
  ): ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null {
    let result: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        if (node.name && node.name.text === functionName) {
          result = node;
          return;
        }
      }

      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === functionName &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          ) {
            result = declaration.initializer;
            return;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return result;
  }

  /**
   * Extract parameters from function node
   */
  private extractParametersFromNode(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
  ): string[] {
    return node.parameters.map((param) => {
      const name = param.name.getText();
      const optional = param.questionToken ? '?' : '';
      const type = param.type ? `: ${param.type.getText()}` : '';
      return `${name}${optional}${type}`;
    });
  }

  /**
   * Extract parameters from documentation
   */
  private extractParametersFromDoc(docContent: string): string[] {
    const params: string[] = [];

    // Find the Input section
    const inputMatch = docContent.match(/### Input\s*\n([\s\S]*?)(?=\n###|$)/);
    if (!inputMatch) {
      return params;
    }

    const inputSection = inputMatch[1];
    const lines = inputSection.split('\n');

    // Parse parameter lines (e.g., "- `name: string` - description")
    for (const line of lines) {
      const paramMatch = line.match(/- `([^`]+)`/);
      if (paramMatch) {
        params.push(paramMatch[1]);
      }
    }

    return params;
  }

  /**
   * Compare parameters
   */
  private parametersMatch(sourceParams: string[], docParams: string[]): boolean {
    if (sourceParams.length !== docParams.length) {
      return false;
    }

    for (let i = 0; i < sourceParams.length; i++) {
      // Extract just the parameter name for comparison
      const sourceName = sourceParams[i].split(':')[0].replace('?', '').trim();
      const docName = docParams[i].split(':')[0].replace('?', '').trim();

      if (sourceName !== docName) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get documentation path for a function
   */
  private getDocPath(filePath: string, functionName: string): string {
    const relativePath = relative(this.rootPath, filePath);
    const docRelativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    return join(this.docsPath, dirname(docRelativePath), `${functionName}.md`);
  }

  /**
   * Generate list of potentially outdated documentation
   */
  async generateOutdatedDocsList(
    changes: FileChange[]
  ): Promise<AffectedDocumentation[]> {
    const result = await this.detectAffectedDocumentation(changes);
    return result.affectedDocs.filter(
      (doc) => doc.changeType === 'update_required'
    );
  }
}
