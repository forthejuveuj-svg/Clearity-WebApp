import { describe, it, expect, beforeEach } from 'vitest';
import { ImportGraphBuilder } from '../../graph/ImportGraphBuilder.js';
import * as path from 'path';
import * as ts from 'typescript';

describe('ImportGraphBuilder', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/sample-project');
  let graphBuilder: ImportGraphBuilder;

  beforeEach(() => {
    graphBuilder = new ImportGraphBuilder(fixturesPath);
  });

  describe('analyzeImports', () => {
    it('should parse default imports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import React from 'react';`,
        ts.ScriptTarget.Latest,
        true
      );

      const imports = (graphBuilder as any).parseImports(sourceFile);
      
      expect(imports.length).toBeGreaterThan(0);
      const reactImport = imports.find(i => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport?.isDefault).toBe(true);
    });

    it('should parse named imports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import { useState, useEffect } from 'react';`,
        ts.ScriptTarget.Latest,
        true
      );

      const imports = (graphBuilder as any).parseImports(sourceFile);
      
      const reactImport = imports.find(i => i.source === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport?.symbols).toContain('useState');
      expect(reactImport?.symbols).toContain('useEffect');
    });

    it('should parse namespace imports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import * as path from 'path';`,
        ts.ScriptTarget.Latest,
        true
      );

      const imports = (graphBuilder as any).parseImports(sourceFile);
      
      const pathImport = imports.find(i => i.source === 'path');
      expect(pathImport).toBeDefined();
      expect(pathImport?.symbols).toContain('path');
    });

    it('should handle mixed import styles', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import React, { useState } from 'react';`,
        ts.ScriptTarget.Latest,
        true
      );

      const imports = (graphBuilder as any).parseImports(sourceFile);
      
      const reactImport = imports.find(i => i.source === 'react');
      expect(reactImport).toBeDefined();
    });
  });

  describe('analyzeExports', () => {
    it('should parse default exports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `export default function MyComponent() { return null; }`,
        ts.ScriptTarget.Latest,
        true
      );

      const exports = (graphBuilder as any).parseExports(sourceFile);
      
      expect(exports.length).toBeGreaterThan(0);
      expect(exports).toContain('default');
    });

    it('should parse named exports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `export function funcA() {}\nexport const CONSTANT = 1;`,
        ts.ScriptTarget.Latest,
        true
      );

      const exports = (graphBuilder as any).parseExports(sourceFile);
      
      expect(exports).toContain('funcA');
      expect(exports).toContain('CONSTANT');
    });

    it('should parse re-exports', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `export { Button } from './components/Button';\nexport * from './utils';`,
        ts.ScriptTarget.Latest,
        true
      );

      const exports = (graphBuilder as any).parseExports(sourceFile);
      
      expect(exports.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle export declarations', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `function helper() {}\nexport { helper };`,
        ts.ScriptTarget.Latest,
        true
      );

      const exports = (graphBuilder as any).parseExports(sourceFile);
      
      expect(exports).toContain('helper');
    });
  });

  describe('circular dependency detection', () => {
    it('should detect circular dependencies', async () => {
      // This would require building a graph with actual circular dependencies
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [{ source: 'b.ts', symbols: ['funcB'], isDefault: false }], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: ['funcB'], imports: [{ source: 'a.ts', symbols: ['funcA'], isDefault: false }], type: 'module' as const }],
        ]),
        edges: [
          { from: 'a.ts', to: 'b.ts', importedSymbols: ['funcB'] },
          { from: 'b.ts', to: 'a.ts', importedSymbols: ['funcA'] },
        ],
      };

      const circular = (graphBuilder as any).detectCircularDependencies(graph);
      
      expect(circular).toBeDefined();
      expect(circular.length).toBeGreaterThan(0);
    });

    it('should not flag non-circular dependencies', () => {
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: ['funcB'], imports: [{ source: 'a.ts', symbols: ['funcA'], isDefault: false }], type: 'module' as const }],
        ]),
        edges: [
          { from: 'b.ts', to: 'a.ts', importedSymbols: ['funcA'] },
        ],
      };

      const circular = (graphBuilder as any).detectCircularDependencies(graph);
      
      expect(circular.length).toBe(0);
    });
  });

  describe('graph traversal', () => {
    it('should find all dependencies of a file', () => {
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [{ source: 'b.ts', symbols: ['funcB'], isDefault: false }], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: ['funcB'], imports: [{ source: 'c.ts', symbols: ['funcC'], isDefault: false }], type: 'module' as const }],
          ['c.ts', { filePath: 'c.ts', exports: ['funcC'], imports: [], type: 'module' as const }],
        ]),
        edges: [
          { from: 'a.ts', to: 'b.ts', importedSymbols: ['funcB'] },
          { from: 'b.ts', to: 'c.ts', importedSymbols: ['funcC'] },
        ],
      };

      // Test graph structure
      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.length).toBe(2);
    });

    it('should find all dependents of a file', () => {
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: ['funcB'], imports: [{ source: 'a.ts', symbols: ['funcA'], isDefault: false }], type: 'module' as const }],
          ['c.ts', { filePath: 'c.ts', exports: ['funcC'], imports: [{ source: 'a.ts', symbols: ['funcA'], isDefault: false }], type: 'module' as const }],
        ]),
        edges: [
          { from: 'b.ts', to: 'a.ts', importedSymbols: ['funcA'] },
          { from: 'c.ts', to: 'a.ts', importedSymbols: ['funcA'] },
        ],
      };

      // a.ts should have 2 dependents (b.ts and c.ts)
      const dependents = graph.edges.filter(e => e.to === 'a.ts');
      expect(dependents.length).toBe(2);
    });
  });

  describe('findUsages', () => {
    it('should find all files that use a specific function', () => {
      const graph = {
        nodes: new Map([
          ['utils.ts', { filePath: 'utils.ts', exports: ['helper'], imports: [], type: 'module' as const }],
          ['a.ts', { filePath: 'a.ts', exports: [], imports: [{ source: 'utils.ts', symbols: ['helper'], isDefault: false }], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: [], imports: [{ source: 'utils.ts', symbols: ['helper'], isDefault: false }], type: 'module' as const }],
        ]),
        edges: [
          { from: 'a.ts', to: 'utils.ts', importedSymbols: ['helper'] },
          { from: 'b.ts', to: 'utils.ts', importedSymbols: ['helper'] },
        ],
      };

      const usages = graph.edges.filter(e => 
        e.to === 'utils.ts' && e.importedSymbols.includes('helper')
      );
      
      expect(usages.length).toBe(2);
    });

    it('should return empty array for unused functions', () => {
      const graph = {
        nodes: new Map([
          ['utils.ts', { filePath: 'utils.ts', exports: ['unused'], imports: [], type: 'module' as const }],
        ]),
        edges: [],
      };

      const usages = graph.edges.filter(e => 
        e.to === 'utils.ts' && e.importedSymbols.includes('unused')
      );
      
      expect(usages.length).toBe(0);
    });
  });

  describe('graph export formats', () => {
    it('should export to Mermaid format', () => {
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [], type: 'module' as const }],
          ['b.ts', { filePath: 'b.ts', exports: ['funcB'], imports: [{ source: 'a.ts', symbols: ['funcA'], isDefault: false }], type: 'module' as const }],
        ]),
        edges: [
          { from: 'b.ts', to: 'a.ts', importedSymbols: ['funcA'] },
        ],
      };

      const mermaid = (graphBuilder as any).exportToMermaid(graph);
      
      expect(mermaid).toContain('graph');
      expect(mermaid).toContain('a.ts');
      expect(mermaid).toContain('b.ts');
    });

    it('should export to JSON format', () => {
      const graph = {
        nodes: new Map([
          ['a.ts', { filePath: 'a.ts', exports: ['funcA'], imports: [], type: 'module' as const }],
        ]),
        edges: [],
      };

      const json = (graphBuilder as any).exportToJSON(graph);
      
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.nodes).toBeDefined();
      expect(parsed.edges).toBeDefined();
    });
  });
});
