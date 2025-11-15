/**
 * Import Graph Builder
 * 
 * Builds and maintains a dependency graph showing import relationships
 * between files in the codebase.
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  ImportGraph,
  GraphNode,
  GraphEdge,
  ImportInfo,
  ExportInfo,
  CircularDependency,
  UsageInfo
} from './types';

export class ImportGraphBuilder {
  private graph: ImportGraph;
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;

  constructor(private rootPath: string) {
    this.graph = {
      nodes: new Map<string, GraphNode>(),
      edges: []
    };
  }

  /**
   * Get the current import graph
   */
  getGraph(): ImportGraph {
    return this.graph;
  }

  /**
   * Build the complete import graph for the project
   */
  async buildGraph(): Promise<ImportGraph> {
    // Find all TypeScript/JavaScript files
    const files = await this.findSourceFiles(this.rootPath);

    // Create TypeScript program for analysis
    this.program = ts.createProgram(files, {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true
    });

    this.typeChecker = this.program.getTypeChecker();

    // Analyze each file
    for (const filePath of files) {
      await this.analyzeFile(filePath);
    }

    return this.graph;
  }

  /**
   * Find all TypeScript and JavaScript source files
   */
  private async findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, dist, and hidden directories
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && 
            entry.name !== 'node_modules' && 
            entry.name !== 'dist' &&
            entry.name !== 'build') {
          files.push(...await this.findSourceFiles(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Analyze a single file and add it to the graph
   */
  private async analyzeFile(filePath: string): Promise<void> {
    if (!this.program) {
      throw new Error('TypeScript program not initialized');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return;
    }

    // Analyze imports and exports
    const imports = await this.analyzeImports(filePath);
    const exports = await this.analyzeExports(filePath);

    // Determine node type
    const nodeType = this.determineNodeType(sourceFile);

    // Create graph node
    const node: GraphNode = {
      filePath,
      exports,
      imports,
      type: nodeType
    };

    this.graph.nodes.set(filePath, node);

    // Create edges for imports
    for (const importInfo of imports) {
      const resolvedPath = this.resolveImportPath(filePath, importInfo.source);
      if (resolvedPath) {
        this.graph.edges.push({
          from: filePath,
          to: resolvedPath,
          importedSymbols: importInfo.symbols
        });
      }
    }
  }

  /**
   * Determine the type of a node based on its content
   */
  private determineNodeType(sourceFile: ts.SourceFile): 'function' | 'component' | 'module' {
    let hasComponent = false;
    let hasFunction = false;

    const visit = (node: ts.Node) => {
      // Check for React components
      if (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) {
        const name = node.name?.getText(sourceFile);
        if (name && /^[A-Z]/.test(name)) {
          hasComponent = true;
        } else if (name) {
          hasFunction = true;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (hasComponent) return 'component';
    if (hasFunction) return 'function';
    return 'module';
  }

  /**
   * Resolve a relative import path to an absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      let resolved = path.resolve(dir, importPath);

      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
          return withExt;
        }
      }

      // Try index files
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    // For absolute imports (node_modules, etc.), we don't track them
    return null;
  }

  /**
   * Analyze import statements in a file
   */
  async analyzeImports(filePath: string): Promise<ImportInfo[]> {
    if (!this.program) {
      throw new Error('TypeScript program not initialized');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      // Handle import declarations: import { x, y } from 'module'
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const source = moduleSpecifier.text;
          const symbols: string[] = [];
          let isDefault = false;

          if (node.importClause) {
            // Default import: import X from 'module'
            if (node.importClause.name) {
              symbols.push(node.importClause.name.text);
              isDefault = true;
            }

            // Named imports: import { x, y } from 'module'
            if (node.importClause.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                for (const element of node.importClause.namedBindings.elements) {
                  symbols.push(element.name.text);
                }
              }
              // Namespace import: import * as X from 'module'
              else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                symbols.push(node.importClause.namedBindings.name.text);
              }
            }
          }

          imports.push({
            source,
            symbols,
            isDefault,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Analyze export statements in a file
   */
  async analyzeExports(filePath: string): Promise<ExportInfo[]> {
    if (!this.program) {
      throw new Error('TypeScript program not initialized');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node) => {
      // Export function declaration: export function foo() {}
      if (ts.isFunctionDeclaration(node) && this.hasExportModifier(node)) {
        const name = node.name?.text;
        if (name) {
          exports.push({
            name,
            isDefault: this.hasDefaultModifier(node),
            type: 'function',
            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }

      // Export variable declaration: export const foo = ...
      if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            const name = declaration.name.text;
            const type = this.determineExportType(declaration);
            exports.push({
              name,
              isDefault: false,
              type,
              lineNumber: sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1
            });
          }
        }
      }

      // Export class declaration: export class Foo {}
      if (ts.isClassDeclaration(node) && this.hasExportModifier(node)) {
        const name = node.name?.text;
        if (name) {
          exports.push({
            name,
            isDefault: this.hasDefaultModifier(node),
            type: 'class',
            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }

      // Export type/interface: export type Foo = ..., export interface Foo {}
      if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && 
          this.hasExportModifier(node)) {
        const name = node.name.text;
        exports.push({
          name,
          isDefault: false,
          type: ts.isTypeAliasDeclaration(node) ? 'type' : 'interface',
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }

      // Export default: export default foo
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        const name = this.getExportDefaultName(node.expression);
        if (name) {
          exports.push({
            name,
            isDefault: true,
            type: 'constant',
            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * Check if a node has an export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;
    return modifiers.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Check if a node has a default modifier
   */
  private hasDefaultModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return false;
    return modifiers.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword);
  }

  /**
   * Determine the type of an export from a variable declaration
   */
  private determineExportType(declaration: ts.VariableDeclaration): ExportInfo['type'] {
    if (declaration.initializer) {
      // Check for arrow function or function expression
      if (ts.isArrowFunction(declaration.initializer) || 
          ts.isFunctionExpression(declaration.initializer)) {
        // Check if it's a React component (starts with capital letter)
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text)) {
          return 'component';
        }
        return 'function';
      }

      // Check for class expression
      if (ts.isClassExpression(declaration.initializer)) {
        return 'class';
      }
    }

    return 'constant';
  }

  /**
   * Get the name of a default export
   */
  private getExportDefaultName(expression: ts.Expression): string | null {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      return 'default';
    }
    if (ts.isClassExpression(expression)) {
      return expression.name?.text || 'default';
    }
    return 'default';
  }

  /**
   * Find all files that use a specific function
   */
  findUsages(functionName: string): string[] {
    const usages: string[] = [];

    for (const [filePath, node] of this.graph.nodes) {
      for (const importInfo of node.imports) {
        if (importInfo.symbols.includes(functionName)) {
          usages.push(filePath);
          break;
        }
      }
    }

    return usages;
  }

  /**
   * Detect circular dependencies in the import graph
   */
  detectCircularDependencies(): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (filePath: string, path: string[]): void => {
      visited.add(filePath);
      recursionStack.add(filePath);
      path.push(filePath);

      // Find all edges from this file
      const edges = this.graph.edges.filter(e => e.from === filePath);

      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          dfs(edge.to, [...path]);
        } else if (recursionStack.has(edge.to)) {
          // Found a cycle
          const cycleStart = path.indexOf(edge.to);
          const cycle = [...path.slice(cycleStart), edge.to];
          
          // Normalize cycle to avoid duplicates
          const normalized = this.normalizeCycle(cycle);
          if (!cycles.some(c => this.cyclesEqual(c.cycle, normalized))) {
            cycles.push({
              cycle: normalized,
              severity: 'warning'
            });
          }
        }
      }

      recursionStack.delete(filePath);
    };

    for (const filePath of this.graph.nodes.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    return cycles;
  }

  /**
   * Normalize a cycle to start with the lexicographically smallest path
   */
  private normalizeCycle(cycle: string[]): string[] {
    if (cycle.length === 0) return cycle;

    const minIndex = cycle.reduce((minIdx, path, idx, arr) => 
      path < arr[minIdx] ? idx : minIdx, 0);

    return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
  }

  /**
   * Check if two cycles are equal
   */
  private cyclesEqual(cycle1: string[], cycle2: string[]): boolean {
    if (cycle1.length !== cycle2.length) return false;
    return cycle1.every((path, idx) => path === cycle2[idx]);
  }

  /**
   * Export the graph in Mermaid diagram format
   */
  exportToMermaid(): string {
    let mermaid = 'graph TD\n';

    // Add nodes
    const nodeIds = new Map<string, string>();
    let nodeCounter = 0;

    for (const [filePath] of this.graph.nodes) {
      const nodeId = `N${nodeCounter++}`;
      const fileName = path.basename(filePath);
      nodeIds.set(filePath, nodeId);
      mermaid += `  ${nodeId}["${fileName}"]\n`;
    }

    // Add edges
    for (const edge of this.graph.edges) {
      const fromId = nodeIds.get(edge.from);
      const toId = nodeIds.get(edge.to);
      if (fromId && toId) {
        const label = edge.importedSymbols.length > 0 
          ? edge.importedSymbols.join(', ') 
          : '';
        mermaid += `  ${fromId} -->|${label}| ${toId}\n`;
      }
    }

    return mermaid;
  }

  /**
   * Export the graph in JSON format
   */
  exportToJSON(): string {
    const jsonGraph = {
      nodes: Array.from(this.graph.nodes.entries()).map(([filePath, node]) => ({
        filePath,
        exports: node.exports,
        imports: node.imports,
        type: node.type
      })),
      edges: this.graph.edges,
      statistics: {
        totalNodes: this.graph.nodes.size,
        totalEdges: this.graph.edges.length,
        circularDependencies: this.detectCircularDependencies().length
      }
    };

    return JSON.stringify(jsonGraph, null, 2);
  }

  /**
   * Get usage information for all functions
   */
  getAllUsages(): UsageInfo[] {
    const usageMap = new Map<string, Set<string>>();

    // Build usage map from edges
    for (const edge of this.graph.edges) {
      for (const symbol of edge.importedSymbols) {
        if (!usageMap.has(symbol)) {
          usageMap.set(symbol, new Set());
        }
        usageMap.get(symbol)!.add(edge.from);
      }
    }

    // Create usage info for all exported functions
    const usages: UsageInfo[] = [];
    for (const [filePath, node] of this.graph.nodes) {
      for (const exportInfo of node.exports) {
        const usedIn = Array.from(usageMap.get(exportInfo.name) || []);
        usages.push({
          functionName: exportInfo.name,
          usedIn,
          isUnused: usedIn.length === 0
        });
      }
    }

    return usages;
  }
}
