/**
 * AI Integration Layer - Provides RAG exports and graph-based reasoning capabilities
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { createHash } from 'crypto';
import { ImportGraph, GraphNode } from '../graph/types.js';
import {
  RAGDocument,
  RAGExport,
  RAGMetadata,
  GraphQuery,
  GraphQueryResult,
  GraphStatistics,
} from './types.js';
import { GraphExporter } from './GraphExporter.js';
import { EmbeddingGenerator, SimilarityResult } from './EmbeddingGenerator.js';

export class AIIntegrationLayer {
  private graph: ImportGraph;
  private docsDir: string;
  private rootPath: string;
  private graphExporter: GraphExporter;
  private embeddingGenerator?: EmbeddingGenerator;

  constructor(
    graph: ImportGraph,
    docsDir: string,
    rootPath: string,
    embeddingConfig?: {
      model: string;
      cacheDir: string;
      apiKey?: string;
    }
  ) {
    this.graph = graph;
    this.docsDir = docsDir;
    this.rootPath = rootPath;
    this.graphExporter = new GraphExporter(graph);

    // Initialize embedding generator if config provided
    if (embeddingConfig) {
      this.embeddingGenerator = new EmbeddingGenerator(
        embeddingConfig.model,
        embeddingConfig.cacheDir,
        embeddingConfig.apiKey
      );
    }
  }

  /**
   * Export documentation in RAG-compatible format
   */
  async exportForRAG(): Promise<RAGExport> {
    console.log('🤖 Generating RAG export...');

    const documents: RAGDocument[] = [];
    const groups = new Set<string>();
    const documentTypes = {
      function: 0,
      group: 0,
      component: 0,
    };

    // Process all markdown files in docs directory
    await this.processDirectory(
      this.docsDir,
      documents,
      groups,
      documentTypes
    );

    // Create metadata
    const metadata: RAGMetadata = {
      totalDocuments: documents.length,
      groups: Array.from(groups),
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      documentTypes,
    };

    console.log(
      `✅ Generated ${documents.length} RAG documents across ${groups.size} groups`
    );

    return {
      documents,
      metadata,
    };
  }

  /**
   * Recursively process directory to find documentation files
   */
  private async processDirectory(
    dirPath: string,
    documents: RAGDocument[],
    groups: Set<string>,
    documentTypes: { function: number; group: number; component: number }
  ): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively process subdirectories
          await this.processDirectory(
            fullPath,
            documents,
            groups,
            documentTypes
          );
        } else if (entry.isFile() && extname(entry.name) === '.md') {
          // Skip index files
          if (entry.name.toLowerCase() === 'index.md') {
            continue;
          }

          // Process markdown file
          const doc = await this.processMarkdownFile(fullPath);
          if (doc) {
            documents.push(doc);
            groups.add(doc.metadata.group);
            documentTypes[doc.metadata.type]++;
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not process directory ${dirPath}:`, error);
    }
  }

  /**
   * Process a single markdown file into a RAG document
   */
  private async processMarkdownFile(
    filePath: string
  ): Promise<RAGDocument | null> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Parse metadata from markdown content
      const metadata = this.parseMarkdownMetadata(content, filePath);

      if (!metadata) {
        return null;
      }

      // Generate unique ID
      const id = this.generateDocumentId(filePath, metadata.functionName);

      // Get dependencies from import graph
      const dependencies = this.getDependencies(metadata.filePath);

      // Get usage information
      const usedIn = this.getUsedIn(metadata.functionName || '');

      return {
        id,
        content,
        metadata: {
          ...metadata,
          dependencies,
          usedIn,
        },
      };
    } catch (error) {
      console.warn(`Warning: Could not process file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse metadata from markdown content
   */
  private parseMarkdownMetadata(
    content: string,
    docPath: string
  ): Omit<RAGDocument['metadata'], 'dependencies' | 'usedIn'> | null {
    const lines = content.split('\n');

    // Determine document type based on location or content
    const isGroupDoc = docPath.includes('/groups/');
    let type: 'function' | 'group' | 'component' = isGroupDoc
      ? 'group'
      : 'function';

    // Extract function/group name from title (first # heading)
    let functionName: string | undefined;
    let group = 'Ungrouped';
    let filePath = '';
    let complexity: number | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Extract title
      if (line.startsWith('# ') && !functionName) {
        functionName = line.substring(2).trim();
      }

      // Extract file path
      if (line.startsWith('**Path:**')) {
        filePath = line
          .substring('**Path:**'.length)
          .trim()
          .replace(/`/g, '');
      }

      // Extract group
      if (line.startsWith('**Group:**') || line === '## Group') {
        // Look for the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#')) {
            group = nextLine.replace(/^-\s*/, '').replace(/`/g, '');
            break;
          }
        }
      }

      // Extract complexity
      if (line.startsWith('**Complexity:**') || line === '## Complexity') {
        // Look for the next non-empty line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('#')) {
            const match = nextLine.match(/\d+/);
            if (match) {
              complexity = parseInt(match[0], 10);
            }
            break;
          }
        }
      }

      // Detect if it's a component (contains JSX or React patterns)
      if (
        line.includes('React') ||
        line.includes('Component') ||
        line.includes('JSX')
      ) {
        type = 'component';
      }
    }

    if (!functionName) {
      return null;
    }

    return {
      type,
      filePath,
      group,
      complexity,
      functionName: isGroupDoc ? undefined : functionName,
    };
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(filePath: string, functionName?: string): string {
    const relativePath = relative(this.rootPath, filePath);
    const input = functionName
      ? `${relativePath}:${functionName}`
      : relativePath;
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * Get dependencies for a file from import graph
   */
  private getDependencies(filePath: string): string[] {
    const node = this.graph.nodes.get(filePath);
    if (!node) {
      return [];
    }

    return node.imports.map((imp) => imp.source);
  }

  /**
   * Get files that use a specific function
   */
  private getUsedIn(functionName: string): string[] {
    const usedIn: string[] = [];

    for (const [filePath, node] of this.graph.nodes) {
      for (const imp of node.imports) {
        if (imp.symbols.includes(functionName)) {
          usedIn.push(filePath);
        }
      }
    }

    return usedIn;
  }

  /**
   * Query the import graph
   */
  async queryGraph(query: GraphQuery): Promise<GraphQueryResult> {
    console.log(
      `🔍 Querying graph: ${query.type} for ${query.target} (depth: ${query.depth || 'unlimited'})`
    );

    const nodes: string[] = [];
    const edges: Array<{ from: string; to: string }> = [];
    const visited = new Set<string>();

    switch (query.type) {
      case 'dependencies':
        this.findDependencies(
          query.target,
          nodes,
          edges,
          visited,
          query.depth || Infinity,
          0
        );
        break;

      case 'dependents':
        this.findDependents(
          query.target,
          nodes,
          edges,
          visited,
          query.depth || Infinity,
          0
        );
        break;

      case 'path':
        // Find shortest path between two nodes (target should be "from:to")
        const [from, to] = query.target.split(':');
        if (from && to) {
          this.findPath(from, to, nodes, edges);
        }
        break;

      case 'related':
        // Find related files (files that share dependencies or dependents)
        this.findRelated(query.target, nodes, edges, visited);
        break;
    }

    return {
      nodes,
      edges,
      metadata: {
        queryType: query.type,
        target: query.target,
        depth: query.depth || -1,
        resultCount: nodes.length,
      },
    };
  }

  /**
   * Find all dependencies of a file (depth-first search)
   */
  private findDependencies(
    filePath: string,
    nodes: string[],
    edges: Array<{ from: string; to: string }>,
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): void {
    if (visited.has(filePath) || currentDepth > maxDepth) {
      return;
    }

    visited.add(filePath);
    nodes.push(filePath);

    const node = this.graph.nodes.get(filePath);
    if (!node) {
      return;
    }

    for (const imp of node.imports) {
      edges.push({ from: filePath, to: imp.source });

      if (!visited.has(imp.source)) {
        this.findDependencies(
          imp.source,
          nodes,
          edges,
          visited,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }

  /**
   * Find all dependents of a file (reverse dependencies)
   */
  private findDependents(
    filePath: string,
    nodes: string[],
    edges: Array<{ from: string; to: string }>,
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): void {
    if (visited.has(filePath) || currentDepth > maxDepth) {
      return;
    }

    visited.add(filePath);
    nodes.push(filePath);

    // Find all files that import this file
    for (const [otherPath, node] of this.graph.nodes) {
      for (const imp of node.imports) {
        if (imp.source === filePath) {
          edges.push({ from: otherPath, to: filePath });

          if (!visited.has(otherPath)) {
            this.findDependents(
              otherPath,
              nodes,
              edges,
              visited,
              maxDepth,
              currentDepth + 1
            );
          }
        }
      }
    }
  }

  /**
   * Find shortest path between two files using BFS
   */
  private findPath(
    from: string,
    to: string,
    nodes: string[],
    edges: Array<{ from: string; to: string }>
  ): void {
    const queue: Array<{ path: string[]; current: string }> = [
      { path: [from], current: from },
    ];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { path, current } = queue.shift()!;

      if (current === to) {
        // Found path
        nodes.push(...path);
        for (let i = 0; i < path.length - 1; i++) {
          edges.push({ from: path[i], to: path[i + 1] });
        }
        return;
      }

      const node = this.graph.nodes.get(current);
      if (!node) {
        continue;
      }

      for (const imp of node.imports) {
        if (!visited.has(imp.source)) {
          visited.add(imp.source);
          queue.push({
            path: [...path, imp.source],
            current: imp.source,
          });
        }
      }
    }

    // No path found
    console.warn(`No path found from ${from} to ${to}`);
  }

  /**
   * Find related files (files that share dependencies or dependents)
   */
  private findRelated(
    filePath: string,
    nodes: string[],
    edges: Array<{ from: string; to: string }>,
    visited: Set<string>
  ): void {
    const node = this.graph.nodes.get(filePath);
    if (!node) {
      return;
    }

    nodes.push(filePath);
    visited.add(filePath);

    // Get direct dependencies
    const dependencies = new Set(node.imports.map((imp) => imp.source));

    // Find files that share dependencies
    for (const [otherPath, otherNode] of this.graph.nodes) {
      if (otherPath === filePath || visited.has(otherPath)) {
        continue;
      }

      // Check if they share dependencies
      let sharedDeps = 0;
      for (const imp of otherNode.imports) {
        if (dependencies.has(imp.source)) {
          sharedDeps++;
        }
      }

      // If they share at least 2 dependencies, consider them related
      if (sharedDeps >= 2) {
        nodes.push(otherPath);
        visited.add(otherPath);
        edges.push({ from: filePath, to: otherPath });
      }
    }
  }

  /**
   * Initialize embedding generator
   */
  async initializeEmbeddings(): Promise<void> {
    if (!this.embeddingGenerator) {
      console.warn('⚠️  Embedding generator not configured');
      return;
    }

    await this.embeddingGenerator.initialize();
  }

  /**
   * Generate embeddings for all documents
   */
  async generateEmbeddings(documents: RAGDocument[]): Promise<void> {
    if (!this.embeddingGenerator) {
      console.warn(
        '⚠️  Embedding generator not configured, skipping embedding generation'
      );
      return;
    }

    await this.embeddingGenerator.generateEmbeddings(documents);
  }

  /**
   * Find related functions based on semantic similarity
   */
  async findRelatedFunctions(
    functionName: string,
    documents: RAGDocument[],
    similarity: number = 0.7,
    topK: number = 10
  ): Promise<SimilarityResult[]> {
    console.log(
      `🔍 Finding functions related to ${functionName} (similarity >= ${similarity})`
    );

    if (!this.embeddingGenerator) {
      console.warn(
        '⚠️  Semantic similarity search requires embeddings (not configured)'
      );
      return [];
    }

    // Find the target function's document
    const targetDoc = documents.find(
      (doc) => doc.metadata.functionName === functionName
    );

    if (!targetDoc || !targetDoc.embedding) {
      console.warn(`Function ${functionName} not found or has no embedding`);
      return [];
    }

    // Find similar documents
    const results = await this.embeddingGenerator.findSimilar(
      targetDoc.embedding,
      documents,
      topK,
      similarity
    );

    // Filter out the target function itself
    return results.filter((r) => r.document.metadata.functionName !== functionName);
  }

  /**
   * Semantic search across all documentation
   */
  async semanticSearch(
    query: string,
    documents: RAGDocument[],
    topK: number = 10,
    minSimilarity: number = 0.5
  ): Promise<SimilarityResult[]> {
    console.log(`🔍 Semantic search: "${query}"`);

    if (!this.embeddingGenerator) {
      console.warn(
        '⚠️  Semantic search requires embeddings (not configured)'
      );
      return [];
    }

    return await this.embeddingGenerator.findSimilar(
      query,
      documents,
      topK,
      minSimilarity
    );
  }

  /**
   * Get embedding cache statistics
   */
  getEmbeddingStats(): {
    size: number;
    model: string;
    cacheDir: string;
  } | null {
    if (!this.embeddingGenerator) {
      return null;
    }

    return this.embeddingGenerator.getCacheStats();
  }

  /**
   * Clear embedding cache
   */
  async clearEmbeddingCache(): Promise<void> {
    if (!this.embeddingGenerator) {
      console.warn('⚠️  Embedding generator not configured');
      return;
    }

    await this.embeddingGenerator.clearCache();
  }

  /**
   * Get graph statistics
   */
  getGraphStatistics(): GraphStatistics {
    const totalNodes = this.graph.nodes.size;
    const totalEdges = this.graph.edges.length;

    // Calculate average dependencies
    let totalDeps = 0;
    for (const [, node] of this.graph.nodes) {
      totalDeps += node.imports.length;
    }
    const averageDependencies =
      totalNodes > 0 ? totalDeps / totalNodes : 0;

    // Calculate max depth (longest dependency chain)
    let maxDepth = 0;
    for (const [filePath] of this.graph.nodes) {
      const depth = this.calculateDepth(filePath, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    // Count circular dependencies
    const circularDependencies = this.countCircularDependencies();

    return {
      totalNodes,
      totalEdges,
      averageDependencies: Math.round(averageDependencies * 10) / 10,
      maxDepth,
      circularDependencies,
    };
  }

  /**
   * Calculate depth of dependency chain
   */
  private calculateDepth(filePath: string, visited: Set<string>): number {
    if (visited.has(filePath)) {
      return 0; // Circular dependency
    }

    visited.add(filePath);

    const node = this.graph.nodes.get(filePath);
    if (!node || node.imports.length === 0) {
      return 0;
    }

    let maxChildDepth = 0;
    for (const imp of node.imports) {
      const depth = this.calculateDepth(imp.source, new Set(visited));
      maxChildDepth = Math.max(maxChildDepth, depth);
    }

    return maxChildDepth + 1;
  }

  /**
   * Count circular dependencies
   */
  private countCircularDependencies(): number {
    let count = 0;
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (filePath: string): boolean => {
      visited.add(filePath);
      recursionStack.add(filePath);

      const node = this.graph.nodes.get(filePath);
      if (node) {
        for (const imp of node.imports) {
          if (!visited.has(imp.source)) {
            if (hasCycle(imp.source)) {
              return true;
            }
          } else if (recursionStack.has(imp.source)) {
            count++;
            return true;
          }
        }
      }

      recursionStack.delete(filePath);
      return false;
    };

    for (const [filePath] of this.graph.nodes) {
      if (!visited.has(filePath)) {
        hasCycle(filePath);
      }
    }

    return count;
  }

  /**
   * Export graph as Mermaid diagram
   */
  exportToMermaid(): string {
    return this.graphExporter.exportToMermaid();
  }

  /**
   * Export graph as GraphML (for graph databases)
   */
  exportToGraphML(): string {
    return this.graphExporter.exportToGraphML();
  }

  /**
   * Export graph as JSON with full structure
   */
  exportToJSON(includeStatistics: boolean = true): string {
    return this.graphExporter.exportToJSON(includeStatistics);
  }

  /**
   * Export graph as DOT format (Graphviz)
   */
  exportToDOT(): string {
    return this.graphExporter.exportToDOT();
  }

  /**
   * Export subgraph for a specific file
   */
  exportSubgraphMermaid(filePath: string, depth: number = 2): string {
    return this.graphExporter.exportSubgraphMermaid(filePath, depth);
  }
}
