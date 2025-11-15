/**
 * Type definitions for the Documentation Generator module
 */

export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

export interface FunctionDocumentation {
  functionName: string;
  filePath: string;
  purpose: string;
  parameters: Parameter[];
  returnType: string;
  returnDescription: string;
  usedIn: string[];
  complexity: number;
  group: string;
}

export interface FunctionSummary {
  name: string;
  path: string;
  purpose: string;
  complexity?: number;
}

export interface GroupDocumentation {
  groupName: string;
  description: string;
  technologies: string[];
  externalConnections: string[];
  functions: FunctionSummary[];
  functionCount: number;
  averageComplexity?: number;
}

export interface DocumentationIndex {
  version: string;
  generatedAt: string;
  functions: FunctionIndex[];
  groups: GroupIndex[];
  statistics: IndexStatistics;
}

export interface FunctionIndex {
  name: string;
  filePath: string;
  docPath: string;
  group: string;
  exported: boolean;
  complexity: number;
  dependencies: string[];
  usedBy: string[];
}

export interface GroupIndex {
  name: string;
  docPath: string;
  functionCount: number;
  functions: string[];
}

export interface IndexStatistics {
  totalFunctions: number;
  totalGroups: number;
  documentedFunctions: number;
  documentationCoverage: number;
  averageComplexity: number;
}

export interface ManualContent {
  sections: Map<string, string>;
}
