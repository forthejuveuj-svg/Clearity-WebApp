/**
 * Type definitions for AI Integration Layer
 */

export interface RAGDocument {
  id: string;
  content: string;
  metadata: RAGDocumentMetadata;
  embedding?: number[];
}

export interface RAGDocumentMetadata {
  type: 'function' | 'group' | 'component';
  filePath: string;
  group: string;
  complexity?: number;
  dependencies: string[];
  functionName?: string;
  usedIn?: string[];
}

export interface RAGExport {
  documents: RAGDocument[];
  metadata: RAGMetadata;
}

export interface RAGMetadata {
  totalDocuments: number;
  groups: string[];
  generatedAt: string;
  version: string;
  documentTypes: {
    function: number;
    group: number;
    component: number;
  };
}

export interface GraphQuery {
  type: 'dependencies' | 'dependents' | 'path' | 'related';
  target: string;
  depth?: number;
}

export interface GraphQueryResult {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  metadata: {
    queryType: string;
    target: string;
    depth: number;
    resultCount: number;
  };
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  averageDependencies: number;
  maxDepth: number;
  circularDependencies: number;
}
