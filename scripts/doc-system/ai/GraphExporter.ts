/**
 * Graph Exporter - Export import graph in various formats
 */

import { ImportGraph, GraphNode } from '../graph/types.js';
import { GraphStatistics } from './types.js';

export class GraphExporter {
  private graph: ImportGraph;

  constructor(graph: ImportGraph) {
    this.graph = graph;
  }

  /**
   * Export graph as Mermaid diagram
   */
  exportToMermaid(): string {
    const lines: string[] = [];

    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('');

    // Create node IDs (sanitize file paths)
    const nodeIds = new Map<string, string>();
    let nodeCounter = 0;

    for (const [filePath] of this.graph.nodes) {
      const id = `N${nodeCounter++}`;
      nodeIds.set(filePath, id);

      // Extract filename for label
      const fileName = this.getFileName(filePath);
      lines.push(`  ${id}["${fileName}"]`);
    }

    lines.push('');

    // Add edges
    for (const edge of this.graph.edges) {
      const fromId = nodeIds.get(edge.from);
      const toId = nodeIds.get(edge.to);

      if (fromId && toId) {
        // Add label with imported symbols (limit to first 3)
        const symbols = edge.importedSymbols.slice(0, 3);
        const label = symbols.length > 0 ? symbols.join(', ') : '';
        const labelStr = label ? `|${label}|` : '';

        lines.push(`  ${fromId} -->${labelStr} ${toId}`);
      }
    }

    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Export graph as GraphML (XML format for graph databases)
   */
  exportToGraphML(): string {
    const lines: string[] = [];

    // XML header
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"'
    );
    lines.push(
      '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    );
    lines.push(
      '         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns'
    );
    lines.push(
      '         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">'
    );
    lines.push('');

    // Define attributes
    lines.push('  <!-- Node attributes -->');
    lines.push(
      '  <key id="d0" for="node" attr.name="filePath" attr.type="string"/>'
    );
    lines.push(
      '  <key id="d1" for="node" attr.name="type" attr.type="string"/>'
    );
    lines.push(
      '  <key id="d2" for="node" attr.name="exportCount" attr.type="int"/>'
    );
    lines.push(
      '  <key id="d3" for="node" attr.name="importCount" attr.type="int"/>'
    );
    lines.push('');

    // Define edge attributes
    lines.push('  <!-- Edge attributes -->');
    lines.push(
      '  <key id="e0" for="edge" attr.name="symbols" attr.type="string"/>'
    );
    lines.push('');

    // Graph element
    lines.push('  <graph id="G" edgedefault="directed">');
    lines.push('');

    // Create node IDs
    const nodeIds = new Map<string, string>();
    let nodeCounter = 0;

    // Add nodes
    lines.push('    <!-- Nodes -->');
    for (const [filePath, node] of this.graph.nodes) {
      const id = `n${nodeCounter++}`;
      nodeIds.set(filePath, id);

      lines.push(`    <node id="${id}">`);
      lines.push(
        `      <data key="d0">${this.escapeXml(filePath)}</data>`
      );
      lines.push(`      <data key="d1">${node.type}</data>`);
      lines.push(`      <data key="d2">${node.exports.length}</data>`);
      lines.push(`      <data key="d3">${node.imports.length}</data>`);
      lines.push('    </node>');
    }

    lines.push('');

    // Add edges
    lines.push('    <!-- Edges -->');
    let edgeCounter = 0;
    for (const edge of this.graph.edges) {
      const fromId = nodeIds.get(edge.from);
      const toId = nodeIds.get(edge.to);

      if (fromId && toId) {
        const edgeId = `e${edgeCounter++}`;
        const symbols = edge.importedSymbols.join(', ');

        lines.push(
          `    <edge id="${edgeId}" source="${fromId}" target="${toId}">`
        );
        lines.push(
          `      <data key="e0">${this.escapeXml(symbols)}</data>`
        );
        lines.push('    </edge>');
      }
    }

    lines.push('');
    lines.push('  </graph>');
    lines.push('</graphml>');

    return lines.join('\n');
  }

  /**
   * Export graph as JSON with full structure
   */
  exportToJSON(includeStatistics: boolean = true): string {
    const nodes: Array<{
      id: string;
      filePath: string;
      type: string;
      exports: Array<{
        name: string;
        type: string;
        isDefault: boolean;
      }>;
      imports: Array<{
        source: string;
        symbols: string[];
        isDefault: boolean;
      }>;
    }> = [];

    const edges: Array<{
      from: string;
      to: string;
      symbols: string[];
    }> = [];

    // Convert nodes
    for (const [filePath, node] of this.graph.nodes) {
      nodes.push({
        id: filePath,
        filePath,
        type: node.type,
        exports: node.exports.map((exp) => ({
          name: exp.name,
          type: exp.type,
          isDefault: exp.isDefault,
        })),
        imports: node.imports.map((imp) => ({
          source: imp.source,
          symbols: imp.symbols,
          isDefault: imp.isDefault,
        })),
      });
    }

    // Convert edges
    for (const edge of this.graph.edges) {
      edges.push({
        from: edge.from,
        to: edge.to,
        symbols: edge.importedSymbols,
      });
    }

    const result: {
      version: string;
      generatedAt: string;
      nodes: typeof nodes;
      edges: typeof edges;
      statistics?: GraphStatistics;
    } = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      nodes,
      edges,
    };

    // Add statistics if requested
    if (includeStatistics) {
      result.statistics = this.calculateStatistics();
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Calculate graph statistics
   */
  private calculateStatistics(): GraphStatistics {
    const totalNodes = this.graph.nodes.size;
    const totalEdges = this.graph.edges.length;

    // Calculate average dependencies
    let totalDeps = 0;
    for (const [, node] of this.graph.nodes) {
      totalDeps += node.imports.length;
    }
    const averageDependencies =
      totalNodes > 0 ? totalDeps / totalNodes : 0;

    // Calculate max depth
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
   * Count circular dependencies using DFS
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
   * Extract filename from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Export graph as DOT format (Graphviz)
   */
  exportToDOT(): string {
    const lines: string[] = [];

    lines.push('digraph ImportGraph {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Create node IDs
    const nodeIds = new Map<string, string>();
    let nodeCounter = 0;

    // Add nodes
    for (const [filePath, node] of this.graph.nodes) {
      const id = `n${nodeCounter++}`;
      nodeIds.set(filePath, id);

      const fileName = this.getFileName(filePath);
      const label = `${fileName}\\n(${node.exports.length} exports)`;

      // Color by type
      let color = 'lightblue';
      if (node.type === 'component') {
        color = 'lightgreen';
      } else if (node.type === 'function') {
        color = 'lightyellow';
      }

      lines.push(
        `  ${id} [label="${label}", fillcolor="${color}", style="filled,rounded"];`
      );
    }

    lines.push('');

    // Add edges
    for (const edge of this.graph.edges) {
      const fromId = nodeIds.get(edge.from);
      const toId = nodeIds.get(edge.to);

      if (fromId && toId) {
        const symbols = edge.importedSymbols.slice(0, 2).join(', ');
        const label = symbols ? ` [label="${symbols}"]` : '';
        lines.push(`  ${fromId} -> ${toId}${label};`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Export subgraph for a specific file and its dependencies
   */
  exportSubgraphMermaid(
    filePath: string,
    depth: number = 2
  ): string {
    const lines: string[] = [];
    const visited = new Set<string>();
    const nodes = new Map<string, GraphNode>();

    // Collect nodes within depth
    this.collectNodesWithinDepth(filePath, depth, 0, visited, nodes);

    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('');

    // Create node IDs
    const nodeIds = new Map<string, string>();
    let nodeCounter = 0;

    for (const [path] of nodes) {
      const id = `N${nodeCounter++}`;
      nodeIds.set(path, id);

      const fileName = this.getFileName(path);
      const style = path === filePath ? ':::highlight' : '';
      lines.push(`  ${id}["${fileName}"]${style}`);
    }

    // Add highlight style
    if (nodeIds.has(filePath)) {
      lines.push('');
      lines.push('  classDef highlight fill:#f9f,stroke:#333,stroke-width:4px');
    }

    lines.push('');

    // Add edges within the subgraph
    for (const edge of this.graph.edges) {
      if (nodes.has(edge.from) && nodes.has(edge.to)) {
        const fromId = nodeIds.get(edge.from);
        const toId = nodeIds.get(edge.to);

        if (fromId && toId) {
          lines.push(`  ${fromId} --> ${toId}`);
        }
      }
    }

    lines.push('```');

    return lines.join('\n');
  }

  /**
   * Collect nodes within specified depth
   */
  private collectNodesWithinDepth(
    filePath: string,
    maxDepth: number,
    currentDepth: number,
    visited: Set<string>,
    nodes: Map<string, GraphNode>
  ): void {
    if (visited.has(filePath) || currentDepth > maxDepth) {
      return;
    }

    visited.add(filePath);

    const node = this.graph.nodes.get(filePath);
    if (node) {
      nodes.set(filePath, node);

      // Recursively collect dependencies
      for (const imp of node.imports) {
        this.collectNodesWithinDepth(
          imp.source,
          maxDepth,
          currentDepth + 1,
          visited,
          nodes
        );
      }
    }
  }
}
