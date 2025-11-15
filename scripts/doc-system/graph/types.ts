/**
 * Type definitions for the Import Graph Builder module
 */

export interface ImportInfo {
  source: string;
  symbols: string[];
  isDefault: boolean;
  lineNumber: number;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'function' | 'component' | 'class' | 'constant' | 'type' | 'interface';
  lineNumber: number;
}

export interface GraphNode {
  filePath: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  type: 'function' | 'component' | 'module';
}

export interface GraphEdge {
  from: string;
  to: string;
  importedSymbols: string[];
}

export interface ImportGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface CircularDependency {
  cycle: string[];
  severity: 'warning' | 'error';
}

export interface UsageInfo {
  functionName: string;
  usedIn: string[];
  isUnused: boolean;
}
