/**
 * Integration between Import Graph Builder and Documentation Generator
 * 
 * This module provides utilities to update documentation with usage information
 * from the import graph.
 */

import { ImportGraphBuilder } from './ImportGraphBuilder';
import { DocumentationGenerator } from '../generator/DocumentationGenerator';
import { relative } from 'path';

export class GraphDocumentationIntegration {
  constructor(
    private graphBuilder: ImportGraphBuilder,
    private docGenerator: DocumentationGenerator,
    private rootPath: string
  ) {}

  /**
   * Update all documentation with usage information from the import graph
   */
  async updateAllDocumentationWithUsage(): Promise<void> {
    console.log('Building import graph...');
    const graph = await this.graphBuilder.buildGraph();
    
    console.log('Extracting usage information...');
    const usageMap = this.buildUsageMap();
    
    console.log('Updating documentation...');
    await this.docGenerator.batchUpdateUsageInformation(usageMap);
    
    console.log('Documentation updated with usage information');
  }

  /**
   * Build a map of function names to their usage information
   */
  private buildUsageMap(): Map<string, { filePath: string; usedIn: string[] }> {
    const usageMap = new Map<string, { filePath: string; usedIn: string[] }>();
    const graph = this.graphBuilder.getGraph();

    // For each node (file) in the graph
    for (const [filePath, node] of graph.nodes) {
      // For each export in the file
      for (const exportInfo of node.exports) {
        const functionName = exportInfo.name;
        
        // Find all files that import this function
        const usedIn = this.graphBuilder.findUsages(functionName);
        
        // Convert to relative paths
        const relativeUsedIn = usedIn.map(path => relative(this.rootPath, path));
        
        usageMap.set(functionName, {
          filePath,
          usedIn: relativeUsedIn
        });
      }
    }

    return usageMap;
  }

  /**
   * Get unused functions from the import graph
   */
  getUnusedFunctions(): Array<{ name: string; filePath: string }> {
    const graph = this.graphBuilder.getGraph();
    const unused: Array<{ name: string; filePath: string }> = [];

    for (const [filePath, node] of graph.nodes) {
      for (const exportInfo of node.exports) {
        const usages = this.graphBuilder.findUsages(exportInfo.name);
        
        if (usages.length === 0) {
          unused.push({
            name: exportInfo.name,
            filePath: relative(this.rootPath, filePath)
          });
        }
      }
    }

    return unused;
  }

  /**
   * Update documentation when import relationships change
   */
  async updateDocumentationForChangedImports(changedFiles: string[]): Promise<void> {
    console.log(`Updating documentation for ${changedFiles.length} changed files...`);
    
    // Rebuild the graph
    await this.graphBuilder.buildGraph();
    
    // Find all functions affected by the changes
    const affectedFunctions = this.findAffectedFunctions(changedFiles);
    
    // Update documentation for affected functions
    const usageMap = this.buildUsageMap();
    
    for (const functionName of affectedFunctions) {
      const info = usageMap.get(functionName);
      if (info) {
        await this.docGenerator.updateDocumentationWithUsage(
          functionName,
          info.filePath,
          info.usedIn
        );
      }
    }
    
    console.log(`Updated documentation for ${affectedFunctions.size} functions`);
  }

  /**
   * Find all functions affected by file changes
   */
  private findAffectedFunctions(changedFiles: string[]): Set<string> {
    const affected = new Set<string>();
    const graph = this.graphBuilder.getGraph();

    for (const changedFile of changedFiles) {
      // Get the node for this file
      const node = graph.nodes.get(changedFile);
      if (!node) continue;

      // Add all exports from this file
      for (const exportInfo of node.exports) {
        affected.add(exportInfo.name);
      }

      // Add all functions that import from this file
      const edges = graph.edges.filter(e => e.to === changedFile);
      for (const edge of edges) {
        const importingNode = graph.nodes.get(edge.from);
        if (importingNode) {
          for (const exportInfo of importingNode.exports) {
            affected.add(exportInfo.name);
          }
        }
      }
    }

    return affected;
  }

  /**
   * Generate a report of circular dependencies
   */
  generateCircularDependencyReport(): string {
    const cycles = this.graphBuilder.detectCircularDependencies();
    
    if (cycles.length === 0) {
      return 'No circular dependencies detected.';
    }

    const lines: string[] = [];
    lines.push(`# Circular Dependencies Report`);
    lines.push('');
    lines.push(`Found ${cycles.length} circular ${cycles.length === 1 ? 'dependency' : 'dependencies'}:`);
    lines.push('');

    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      lines.push(`## Cycle ${i + 1} (${cycle.severity})`);
      lines.push('');
      
      for (let j = 0; j < cycle.cycle.length; j++) {
        const file = relative(this.rootPath, cycle.cycle[j]);
        if (j < cycle.cycle.length - 1) {
          lines.push(`${j + 1}. \`${file}\``);
          lines.push(`   ↓`);
        } else {
          lines.push(`${j + 1}. \`${file}\` (back to start)`);
        }
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export usage statistics
   */
  getUsageStatistics(): {
    totalFunctions: number;
    usedFunctions: number;
    unusedFunctions: number;
    averageUsageCount: number;
  } {
    const allUsages = this.graphBuilder.getAllUsages();
    
    const totalFunctions = allUsages.length;
    const unusedFunctions = allUsages.filter(u => u.isUnused).length;
    const usedFunctions = totalFunctions - unusedFunctions;
    
    const totalUsageCount = allUsages.reduce((sum, u) => sum + u.usedIn.length, 0);
    const averageUsageCount = totalFunctions > 0 ? totalUsageCount / totalFunctions : 0;

    return {
      totalFunctions,
      usedFunctions,
      unusedFunctions,
      averageUsageCount: Math.round(averageUsageCount * 10) / 10
    };
  }
}
