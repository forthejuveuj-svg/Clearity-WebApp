/**
 * Type definitions for the Code Analyzer module
 */

export interface UnusedImport {
  filePath: string;
  importName: string;
  lineNumber: number;
  importSource: string;
}

export interface UnusedFunction {
  filePath: string;
  functionName: string;
  lineNumber: number;
  isExported: boolean;
  complexity: number;
}

export interface UnusedComponent {
  filePath: string;
  componentName: string;
  lineNumber: number;
  isExported: boolean;
}

export interface CodeEntity {
  name: string;
  type: 'function' | 'component' | 'class' | 'constant';
  lineStart: number;
  lineEnd: number;
  dependencies: string[];
}

export interface SplitSuggestion {
  targetFile: string;
  entities: string[];
  reason: string;
}

export interface MixedLogicFile {
  filePath: string;
  entities: CodeEntity[];
  suggestedSplit: SplitSuggestion[];
}

export interface SplitEntity {
  entityName: string;
  files: string[];
  reason: string;
}

export interface DeadCode {
  filePath: string;
  type: 'import' | 'function' | 'component';
  name: string;
  lineNumber: number;
  impact: string;
}

export interface AnalysisResult {
  unusedImports: UnusedImport[];
  unusedFunctions: UnusedFunction[];
  unusedComponents: UnusedComponent[];
  mixedLogicFiles: MixedLogicFile[];
  splitEntities: SplitEntity[];
  deadCode: DeadCode[];
}

export interface FileAnalysis {
  filePath: string;
  unusedImports: UnusedImport[];
  unusedFunctions: UnusedFunction[];
  unusedComponents: UnusedComponent[];
  mixedLogic: MixedLogicFile | null;
  entities: CodeEntity[];
}
