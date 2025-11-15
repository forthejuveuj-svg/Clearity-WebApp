/**
 * Code Analyzer Module
 * 
 * Analyzes TypeScript/JavaScript codebases to detect:
 * - Unused imports, functions, and components
 * - Mixed logic files (multiple unrelated entities)
 * - Split entities (related code across multiple files)
 * - Dead code with impact analysis
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { AnalyzerConfig } from '../config.js';
import {
  AnalysisResult,
  FileAnalysis,
  UnusedImport,
  UnusedFunction,
  UnusedComponent,
  MixedLogicFile,
  CodeEntity,
  SplitEntity,
  DeadCode,
} from './types.js';

export class CodeAnalyzer {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private usageMap: Map<string, Set<string>> = new Map();

  constructor(private config: AnalyzerConfig) {}

  /**
   * Analyze entire project starting from root path
   */
  async analyzeProject(rootPath: string): Promise<AnalysisResult> {
    console.log(`🔍 Discovering files in ${rootPath}...`);
    
    // Discover all TypeScript/JavaScript files
    const files = await this.discoverFiles(rootPath);
    console.log(`📁 Found ${files.length} files to analyze`);

    // Create TypeScript program
    console.log('🔧 Creating TypeScript program...');
    this.program = this.createProgram(files);
    this.typeChecker = this.program.getTypeChecker();

    // Build usage map first (needed for unused detection)
    console.log('🗺️  Building usage map...');
    this.buildUsageMap();

    // Analyze each file
    console.log('📊 Analyzing files...');
    const fileAnalyses: FileAnalysis[] = [];
    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      fileAnalyses.push(analysis);
    }

    // Aggregate results
    const result: AnalysisResult = {
      unusedImports: [],
      unusedFunctions: [],
      unusedComponents: [],
      mixedLogicFiles: [],
      splitEntities: [],
      deadCode: [],
    };

    for (const analysis of fileAnalyses) {
      result.unusedImports.push(...analysis.unusedImports);
      result.unusedFunctions.push(...analysis.unusedFunctions);
      result.unusedComponents.push(...analysis.unusedComponents);
      if (analysis.mixedLogic) {
        result.mixedLogicFiles.push(analysis.mixedLogic);
      }
    }

    // Detect split entities across files
    result.splitEntities = this.detectSplitEntities(fileAnalyses);

    // Generate dead code list with impact analysis
    result.deadCode = this.generateDeadCodeList(result);

    console.log('✅ Analysis complete');
    return result;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    if (!this.program) {
      throw new Error('TypeScript program not initialized');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Could not load source file: ${filePath}`);
    }

    const unusedImports = this.detectUnusedImports(sourceFile);
    const unusedFunctions = this.detectUnusedFunctions(sourceFile);
    const unusedComponents = this.detectUnusedComponents(sourceFile);
    const entities = this.extractEntities(sourceFile);
    const mixedLogic = this.detectMixedLogic(sourceFile, entities);

    return {
      filePath,
      unusedImports,
      unusedFunctions,
      unusedComponents,
      mixedLogic,
      entities,
    };
  }

  /**
   * Discover all TypeScript/JavaScript files in the project
   */
  private async discoverFiles(rootPath: string): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ];

    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: rootPath,
        ignore: this.config.excludePatterns,
        absolute: true,
        windowsPathsNoEscape: true,
      });
      allFiles.push(...files);
    }

    // Remove duplicates and normalize paths
    return [...new Set(allFiles.map(f => path.normalize(f)))];
  }

  /**
   * Create TypeScript program for analysis
   */
  private createProgram(files: string[]): ts.Program {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
    };

    return ts.createProgram(files, compilerOptions);
  }

  /**
   * Build usage map by tracking all identifiers and their references
   */
  private buildUsageMap(): void {
    if (!this.program) return;

    this.usageMap.clear();

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      this.visitNode(sourceFile, (node) => {
        // Track identifier usage
        if (ts.isIdentifier(node)) {
          const symbol = this.typeChecker?.getSymbolAtLocation(node);
          if (symbol) {
            const name = symbol.getName();
            const filePath = sourceFile.fileName;
            
            if (!this.usageMap.has(name)) {
              this.usageMap.set(name, new Set());
            }
            this.usageMap.get(name)!.add(filePath);
          }
        }
      });
    }
  }

  /**
   * Visit all nodes in AST
   */
  private visitNode(node: ts.Node, callback: (node: ts.Node) => void): void {
    callback(node);
    ts.forEachChild(node, (child) => this.visitNode(child, callback));
  }

  /**
   * Detect unused imports by traversing import declarations and checking usage
   */
  detectUnusedImports(sourceFile: ts.SourceFile): UnusedImport[] {
    const unusedImports: UnusedImport[] = [];
    const importedNames = new Map<string, { source: string; line: number }>();
    const usedNames = new Set<string>();

    // First pass: collect all imported names
    this.visitNode(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        if (!importClause) return;

        const moduleSpecifier = node.moduleSpecifier;
        const source = ts.isStringLiteral(moduleSpecifier) 
          ? moduleSpecifier.text 
          : '';
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        // Handle default import
        if (importClause.name) {
          const name = importClause.name.text;
          importedNames.set(name, { source, line });
        }

        // Handle named imports
        if (importClause.namedBindings) {
          if (ts.isNamedImports(importClause.namedBindings)) {
            for (const element of importClause.namedBindings.elements) {
              const name = element.name.text;
              importedNames.set(name, { source, line });
            }
          }
          // Handle namespace imports (import * as name)
          else if (ts.isNamespaceImport(importClause.namedBindings)) {
            const name = importClause.namedBindings.name.text;
            importedNames.set(name, { source, line });
          }
        }
      }
    });

    // Second pass: collect all used identifiers
    this.visitNode(sourceFile, (node) => {
      // Skip import declarations themselves
      if (ts.isImportDeclaration(node)) return;

      if (ts.isIdentifier(node)) {
        usedNames.add(node.text);
      }
    });

    // Find unused imports
    for (const [name, info] of importedNames) {
      if (!usedNames.has(name)) {
        unusedImports.push({
          filePath: sourceFile.fileName,
          importName: name,
          lineNumber: info.line,
          importSource: info.source,
        });
      }
    }

    return unusedImports;
  }

  /**
   * Detect unused functions by finding function declarations and checking references
   */
  detectUnusedFunctions(sourceFile: ts.SourceFile): UnusedFunction[] {
    const unusedFunctions: UnusedFunction[] = [];
    const declaredFunctions = new Map<string, { line: number; isExported: boolean; node: ts.Node }>();

    // Collect all function declarations
    this.visitNode(sourceFile, (node) => {
      let functionName: string | undefined;
      let isExported = false;

      // Check for export modifier
      if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node);
        isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
      }

      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        functionName = node.name.text;
      }
      // Variable declarations with arrow functions or function expressions
      else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            if (
              ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer)
            ) {
              functionName = declaration.name.text;
              // Check if the variable statement is exported
              if (ts.canHaveModifiers(node)) {
                const modifiers = ts.getModifiers(node);
                isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
              }
            }
          }
        }
      }

      if (functionName) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        declaredFunctions.set(functionName, { line, isExported, node });
      }
    });

    // Check usage for each function
    for (const [name, info] of declaredFunctions) {
      const usages = this.usageMap.get(name);
      const isUsed = usages && usages.size > 1; // More than just the declaration file
      const isUsedInSameFile = this.isIdentifierUsedInFile(sourceFile, name, info.node);

      // Function is unused if:
      // 1. Not used in other files AND
      // 2. Not used in the same file (except for the declaration itself)
      if (!isUsed && !isUsedInSameFile) {
        const complexity = this.calculateComplexity(info.node);
        unusedFunctions.push({
          filePath: sourceFile.fileName,
          functionName: name,
          lineNumber: info.line,
          isExported: info.isExported,
          complexity,
        });
      }
    }

    return unusedFunctions;
  }

  /**
   * Detect unused React components by identifying components and checking imports
   */
  detectUnusedComponents(sourceFile: ts.SourceFile): UnusedComponent[] {
    const unusedComponents: UnusedComponent[] = [];
    const declaredComponents = new Map<string, { line: number; isExported: boolean; node: ts.Node }>();

    // Collect all React component declarations
    this.visitNode(sourceFile, (node) => {
      let componentName: string | undefined;
      let isExported = false;

      // Check for export modifier
      if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node);
        isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
      }

      // Function components (function declarations)
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        // Check if it's a component (starts with uppercase and returns JSX)
        if (this.isReactComponent(name, node)) {
          componentName = name;
        }
      }
      // Arrow function components
      else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            const name = declaration.name.text;
            if (
              (ts.isArrowFunction(declaration.initializer) ||
                ts.isFunctionExpression(declaration.initializer)) &&
              this.isReactComponent(name, declaration.initializer)
            ) {
              componentName = name;
              if (ts.canHaveModifiers(node)) {
                const modifiers = ts.getModifiers(node);
                isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
              }
            }
          }
        }
      }

      if (componentName) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        declaredComponents.set(componentName, { line, isExported, node });
      }
    });

    // Check usage for each component
    for (const [name, info] of declaredComponents) {
      const usages = this.usageMap.get(name);
      const isUsed = usages && usages.size > 1; // More than just the declaration file
      const isUsedInSameFile = this.isIdentifierUsedInFile(sourceFile, name, info.node);

      if (!isUsed && !isUsedInSameFile) {
        unusedComponents.push({
          filePath: sourceFile.fileName,
          componentName: name,
          lineNumber: info.line,
          isExported: info.isExported,
        });
      }
    }

    return unusedComponents;
  }

  /**
   * Check if a name represents a React component
   */
  private isReactComponent(name: string, node: ts.Node): boolean {
    // Component names start with uppercase
    if (!/^[A-Z]/.test(name)) return false;

    // Check if the function returns JSX
    let hasJsxReturn = false;
    this.visitNode(node, (child) => {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
        hasJsxReturn = true;
      }
    });

    return hasJsxReturn;
  }

  /**
   * Check if an identifier is used in the same file (excluding its declaration)
   */
  private isIdentifierUsedInFile(sourceFile: ts.SourceFile, name: string, declarationNode: ts.Node): boolean {
    let usageCount = 0;

    this.visitNode(sourceFile, (node) => {
      if (ts.isIdentifier(node) && node.text === name) {
        // Don't count the declaration itself
        if (node !== declarationNode && !this.isPartOfNode(node, declarationNode)) {
          usageCount++;
        }
      }
    });

    return usageCount > 0;
  }

  /**
   * Check if a node is part of another node
   */
  private isPartOfNode(child: ts.Node, parent: ts.Node): boolean {
    let current: ts.Node | undefined = child;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Calculate cyclomatic complexity of a function
   */
  private calculateComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    this.visitNode(node, (child) => {
      // Increment for each decision point
      if (
        ts.isIfStatement(child) ||
        ts.isConditionalExpression(child) ||
        ts.isWhileStatement(child) ||
        ts.isDoStatement(child) ||
        ts.isForStatement(child) ||
        ts.isForInStatement(child) ||
        ts.isForOfStatement(child) ||
        ts.isCaseClause(child) ||
        ts.isCatchClause(child)
      ) {
        complexity++;
      }
      // Logical operators
      else if (ts.isBinaryExpression(child)) {
        if (
          child.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          child.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
      }
    });

    return complexity;
  }

  /**
   * Extract entities (functions, components, classes, constants) from source file
   */
  private extractEntities(sourceFile: ts.SourceFile): CodeEntity[] {
    const entities: CodeEntity[] = [];

    this.visitNode(sourceFile, (node) => {
      let entity: CodeEntity | null = null;

      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const isComponent = this.isReactComponent(name, node);
        entity = {
          name,
          type: isComponent ? 'component' : 'function',
          lineStart: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          lineEnd: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
          dependencies: this.extractDependencies(node),
        };
      }
      // Variable declarations (arrow functions, constants)
      else if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer) {
            const name = declaration.name.text;
            let type: CodeEntity['type'] = 'constant';

            if (
              ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer)
            ) {
              const isComponent = this.isReactComponent(name, declaration.initializer);
              type = isComponent ? 'component' : 'function';
            }

            entity = {
              name,
              type,
              lineStart: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
              lineEnd: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
              dependencies: this.extractDependencies(declaration.initializer || node),
            };
          }
        }
      }
      // Class declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        entity = {
          name,
          type: 'class',
          lineStart: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          lineEnd: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
          dependencies: this.extractDependencies(node),
        };
      }

      if (entity) {
        entities.push(entity);
      }
    });

    return entities;
  }

  /**
   * Extract dependencies (imported identifiers used) from a node
   */
  private extractDependencies(node: ts.Node): string[] {
    const dependencies = new Set<string>();

    this.visitNode(node, (child) => {
      if (ts.isIdentifier(child)) {
        // Check if this identifier is from an import
        const symbol = this.typeChecker?.getSymbolAtLocation(child);
        if (symbol) {
          const declarations = symbol.getDeclarations();
          if (declarations && declarations.length > 0) {
            const declaration = declarations[0];
            // Check if it's from an import
            if (
              ts.isImportSpecifier(declaration) ||
              ts.isImportClause(declaration) ||
              ts.isNamespaceImport(declaration)
            ) {
              dependencies.add(child.text);
            }
          }
        }
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Detect mixed logic by identifying files with multiple unrelated entities
   */
  detectMixedLogic(sourceFile: ts.SourceFile, entities: CodeEntity[]): MixedLogicFile | null {
    // Skip if below threshold
    if (entities.length < this.config.mixedLogicThreshold) {
      return null;
    }

    // Group entities by type
    const entityGroups = new Map<string, CodeEntity[]>();
    for (const entity of entities) {
      const group = entityGroups.get(entity.type) || [];
      group.push(entity);
      entityGroups.set(entity.type, group);
    }

    // Check if entities are related by analyzing dependencies
    const relatedGroups = this.groupRelatedEntities(entities);

    // If we have multiple unrelated groups, it's mixed logic
    if (relatedGroups.length > 1) {
      const suggestedSplit = relatedGroups.map((group, index) => ({
        targetFile: this.suggestFileName(sourceFile.fileName, group, index),
        entities: group.map(e => e.name),
        reason: `Group of ${group.length} related ${group[0].type}(s)`,
      }));

      return {
        filePath: sourceFile.fileName,
        entities,
        suggestedSplit,
      };
    }

    return null;
  }

  /**
   * Group related entities based on shared dependencies
   */
  private groupRelatedEntities(entities: CodeEntity[]): CodeEntity[][] {
    if (entities.length === 0) return [];

    const groups: CodeEntity[][] = [];
    const visited = new Set<string>();

    for (const entity of entities) {
      if (visited.has(entity.name)) continue;

      const group: CodeEntity[] = [entity];
      visited.add(entity.name);

      // Find related entities
      for (const other of entities) {
        if (visited.has(other.name)) continue;

        // Check if they share dependencies or reference each other
        const hasSharedDeps = entity.dependencies.some(dep =>
          other.dependencies.includes(dep)
        );
        const referencesEachOther =
          entity.dependencies.includes(other.name) ||
          other.dependencies.includes(entity.name);

        if (hasSharedDeps || referencesEachOther) {
          group.push(other);
          visited.add(other.name);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Suggest a file name for a group of entities
   */
  private suggestFileName(originalPath: string, group: CodeEntity[], index: number): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);

    // Use the first entity name as the base
    if (group.length > 0) {
      const primaryEntity = group[0];
      const newName = primaryEntity.name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
      return path.join(dir, `${newName}${ext}`);
    }

    return path.join(dir, `${baseName}-${index + 1}${ext}`);
  }

  /**
   * Detect split entities by finding related code across multiple files
   */
  private detectSplitEntities(fileAnalyses: FileAnalysis[]): SplitEntity[] {
    const splitEntities: SplitEntity[] = [];
    const entityLocations = new Map<string, string[]>();

    // Build map of entity names to file locations
    for (const analysis of fileAnalyses) {
      for (const entity of analysis.entities) {
        const locations = entityLocations.get(entity.name) || [];
        locations.push(analysis.filePath);
        entityLocations.set(entity.name, locations);
      }
    }

    // Find entities that appear in multiple files with similar names
    const processedPrefixes = new Set<string>();

    for (const [entityName, files] of entityLocations) {
      // Extract prefix (e.g., "User" from "UserService", "UserRepository")
      const prefix = entityName.match(/^[A-Z][a-z]+/)?.[0];
      if (!prefix || processedPrefixes.has(prefix)) continue;

      // Find all entities with the same prefix
      const relatedEntities: string[] = [];
      const relatedFiles = new Set<string>();

      for (const [name, locations] of entityLocations) {
        if (name.startsWith(prefix) && name !== prefix) {
          relatedEntities.push(name);
          locations.forEach(f => relatedFiles.add(f));
        }
      }

      // If we have multiple related entities across multiple files, it might be split
      if (relatedEntities.length >= 2 && relatedFiles.size >= 2) {
        splitEntities.push({
          entityName: prefix,
          files: Array.from(relatedFiles),
          reason: `Related entities (${relatedEntities.join(', ')}) are split across multiple files`,
        });
        processedPrefixes.add(prefix);
      }
    }

    return splitEntities;
  }

  /**
   * Generate dead code list with impact analysis
   */
  private generateDeadCodeList(result: AnalysisResult): DeadCode[] {
    const deadCode: DeadCode[] = [];

    // Add unused imports
    for (const unusedImport of result.unusedImports) {
      deadCode.push({
        filePath: unusedImport.filePath,
        type: 'import',
        name: unusedImport.importName,
        lineNumber: unusedImport.lineNumber,
        impact: 'Low - Safe to remove',
      });
    }

    // Add unused functions
    for (const unusedFunc of result.unusedFunctions) {
      const impact = unusedFunc.isExported
        ? 'Medium - Exported but unused, may be part of public API'
        : 'Low - Internal function, safe to remove';
      
      deadCode.push({
        filePath: unusedFunc.filePath,
        type: 'function',
        name: unusedFunc.functionName,
        lineNumber: unusedFunc.lineNumber,
        impact,
      });
    }

    // Add unused components
    for (const unusedComp of result.unusedComponents) {
      const impact = unusedComp.isExported
        ? 'Medium - Exported but unused, may be part of public API'
        : 'Low - Internal component, safe to remove';
      
      deadCode.push({
        filePath: unusedComp.filePath,
        type: 'component',
        name: unusedComp.componentName,
        lineNumber: unusedComp.lineNumber,
        impact,
      });
    }

    return deadCode;
  }

  /**
   * Generate human-readable analysis report
   */
  generateReport(result: AnalysisResult): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('           CODE ANALYSIS REPORT');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    // Summary
    lines.push('📊 SUMMARY');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`Unused Imports:     ${result.unusedImports.length}`);
    lines.push(`Unused Functions:   ${result.unusedFunctions.length}`);
    lines.push(`Unused Components:  ${result.unusedComponents.length}`);
    lines.push(`Mixed Logic Files:  ${result.mixedLogicFiles.length}`);
    lines.push(`Split Entities:     ${result.splitEntities.length}`);
    lines.push(`Total Dead Code:    ${result.deadCode.length}`);
    lines.push('');

    // Unused Imports
    if (result.unusedImports.length > 0) {
      lines.push('🔍 UNUSED IMPORTS');
      lines.push('─────────────────────────────────────────────────────────');
      const groupedByFile = this.groupByFile(result.unusedImports);
      for (const [file, imports] of groupedByFile) {
        lines.push(`\n📁 ${this.formatPath(file)}`);
        for (const imp of imports) {
          lines.push(`   Line ${imp.lineNumber}: ${imp.importName} from "${imp.importSource}"`);
        }
      }
      lines.push('');
      lines.push('💡 Recommendation: Remove unused imports to clean up the codebase');
      lines.push('');
    }

    // Unused Functions
    if (result.unusedFunctions.length > 0) {
      lines.push('🔍 UNUSED FUNCTIONS');
      lines.push('─────────────────────────────────────────────────────────');
      const groupedByFile = this.groupByFile(result.unusedFunctions);
      for (const [file, functions] of groupedByFile) {
        lines.push(`\n📁 ${this.formatPath(file)}`);
        for (const func of functions) {
          const exportStatus = func.isExported ? '[EXPORTED]' : '[INTERNAL]';
          const complexityWarning = func.complexity > this.config.complexityThreshold ? ' ⚠️ HIGH COMPLEXITY' : '';
          lines.push(`   Line ${func.lineNumber}: ${func.functionName} ${exportStatus} (complexity: ${func.complexity})${complexityWarning}`);
        }
      }
      lines.push('');
      lines.push('💡 Recommendation: Review and remove unused functions, especially internal ones');
      lines.push('   Note: Exported functions may be part of the public API');
      lines.push('');
    }

    // Unused Components
    if (result.unusedComponents.length > 0) {
      lines.push('🔍 UNUSED COMPONENTS');
      lines.push('─────────────────────────────────────────────────────────');
      const groupedByFile = this.groupByFile(result.unusedComponents);
      for (const [file, components] of groupedByFile) {
        lines.push(`\n📁 ${this.formatPath(file)}`);
        for (const comp of components) {
          const exportStatus = comp.isExported ? '[EXPORTED]' : '[INTERNAL]';
          lines.push(`   Line ${comp.lineNumber}: ${comp.componentName} ${exportStatus}`);
        }
      }
      lines.push('');
      lines.push('💡 Recommendation: Remove unused React components to reduce bundle size');
      lines.push('');
    }

    // Mixed Logic Files
    if (result.mixedLogicFiles.length > 0) {
      lines.push('🔍 MIXED LOGIC FILES');
      lines.push('─────────────────────────────────────────────────────────');
      for (const file of result.mixedLogicFiles) {
        lines.push(`\n📁 ${this.formatPath(file.filePath)}`);
        lines.push(`   Contains ${file.entities.length} entities:`);
        
        const entityTypes = new Map<string, number>();
        for (const entity of file.entities) {
          entityTypes.set(entity.type, (entityTypes.get(entity.type) || 0) + 1);
        }
        
        for (const [type, count] of entityTypes) {
          lines.push(`   - ${count} ${type}(s)`);
        }
        
        if (file.suggestedSplit.length > 0) {
          lines.push('\n   Suggested splits:');
          for (const split of file.suggestedSplit) {
            lines.push(`   → ${this.formatPath(split.targetFile)}`);
            lines.push(`     Entities: ${split.entities.join(', ')}`);
            lines.push(`     Reason: ${split.reason}`);
          }
        }
      }
      lines.push('');
      lines.push('💡 Recommendation: Split mixed logic files into focused, single-purpose modules');
      lines.push('');
    }

    // Split Entities
    if (result.splitEntities.length > 0) {
      lines.push('🔍 SPLIT ENTITIES');
      lines.push('─────────────────────────────────────────────────────────');
      for (const entity of result.splitEntities) {
        lines.push(`\n🔗 ${entity.entityName}`);
        lines.push(`   Reason: ${entity.reason}`);
        lines.push('   Files:');
        for (const file of entity.files) {
          lines.push(`   - ${this.formatPath(file)}`);
        }
      }
      lines.push('');
      lines.push('💡 Recommendation: Consider consolidating related entities into a single module');
      lines.push('');
    }

    // Dead Code Impact Analysis
    if (result.deadCode.length > 0) {
      lines.push('🔍 DEAD CODE IMPACT ANALYSIS');
      lines.push('─────────────────────────────────────────────────────────');
      
      const lowImpact = result.deadCode.filter(d => d.impact.startsWith('Low'));
      const mediumImpact = result.deadCode.filter(d => d.impact.startsWith('Medium'));
      const highImpact = result.deadCode.filter(d => d.impact.startsWith('High'));
      
      if (lowImpact.length > 0) {
        lines.push(`\n✅ Low Impact (${lowImpact.length} items) - Safe to remove:`);
        for (const item of lowImpact.slice(0, 10)) {
          lines.push(`   ${this.formatPath(item.filePath)}:${item.lineNumber} - ${item.name}`);
        }
        if (lowImpact.length > 10) {
          lines.push(`   ... and ${lowImpact.length - 10} more`);
        }
      }
      
      if (mediumImpact.length > 0) {
        lines.push(`\n⚠️  Medium Impact (${mediumImpact.length} items) - Review before removing:`);
        for (const item of mediumImpact) {
          lines.push(`   ${this.formatPath(item.filePath)}:${item.lineNumber} - ${item.name}`);
          lines.push(`      ${item.impact}`);
        }
      }
      
      if (highImpact.length > 0) {
        lines.push(`\n🚨 High Impact (${highImpact.length} items) - Careful review required:`);
        for (const item of highImpact) {
          lines.push(`   ${this.formatPath(item.filePath)}:${item.lineNumber} - ${item.name}`);
          lines.push(`      ${item.impact}`);
        }
      }
      lines.push('');
    }

    // Footer
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('Report generated: ' + new Date().toISOString());
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Generate JSON export of analysis results
   */
  generateJSONReport(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Group items by file path
   */
  private groupByFile<T extends { filePath: string }>(items: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    for (const item of items) {
      const group = grouped.get(item.filePath) || [];
      group.push(item);
      grouped.set(item.filePath, group);
    }
    return grouped;
  }

  /**
   * Format file path for display (relative to cwd)
   */
  private formatPath(filePath: string): string {
    const cwd = process.cwd();
    const relative = path.relative(cwd, filePath);
    return relative || filePath;
  }
}
