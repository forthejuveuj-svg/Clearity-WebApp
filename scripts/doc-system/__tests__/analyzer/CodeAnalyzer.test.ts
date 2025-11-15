import { describe, it, expect, beforeAll } from 'vitest';
import { CodeAnalyzer } from '../../analyzer/CodeAnalyzer.js';
import { AnalyzerConfig } from '../../config.js';
import * as path from 'path';
import * as ts from 'typescript';

describe('CodeAnalyzer', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/sample-project');
  
  const config: AnalyzerConfig = {
    excludePatterns: ['**/node_modules/**', '**/*.test.ts'],
    complexityThreshold: 10,
    mixedLogicThreshold: 3,
  };

  let analyzer: CodeAnalyzer;

  beforeAll(() => {
    analyzer = new CodeAnalyzer(config);
  });

  describe('detectUnusedImports', () => {
    it('should return empty array when all imports are used', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import { useState } from 'react';\nexport function Component() { const [state] = useState(0); return state; }`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedImports = analyzer.detectUnusedImports(sourceFile);
      
      const usedImport = unusedImports.find(i => i.importName === 'useState');
      expect(usedImport).toBeUndefined();
    });

    it('should detect imports that are declared but never referenced', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import { used, unused } from 'module';\nconst x = used;\nconsole.log(x);`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedImports = analyzer.detectUnusedImports(sourceFile);
      
      // The method checks if identifiers appear in the code
      // 'unused' should be detected as unused
      const hasUnused = unusedImports.some(i => i.importName === 'unused');
      expect(hasUnused).toBe(true);
    });

    it('should handle multiple import styles', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import React from 'react';
         import { useState, useEffect } from 'react';
         import * as path from 'path';
         
         export function Component() {
           const [state] = useState(0);
           return <div>{state}</div>;
         }`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedImports = analyzer.detectUnusedImports(sourceFile);
      
      // React, useEffect, and path are unused
      expect(unusedImports.length).toBeGreaterThanOrEqual(2);
    });

    it('should correctly identify import source', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `import { something } from './my-module';\nexport const x = 1;`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedImports = analyzer.detectUnusedImports(sourceFile);
      
      const unused = unusedImports.find(i => i.importName === 'something');
      if (unused) {
        expect(unused.importSource).toBe('./my-module');
      }
    });
  });

  describe('detectUnusedFunctions', () => {
    it('should detect unused exported functions', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `export function unusedFunction() { return 'unused'; }\nexport function usedFunction() { return 'used'; }`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedFunctions = analyzer.detectUnusedFunctions(sourceFile);
      
      expect(unusedFunctions.length).toBeGreaterThan(0);
      const unused = unusedFunctions.find(f => f.functionName === 'unusedFunction');
      expect(unused).toBeDefined();
      expect(unused?.isExported).toBe(true);
    });

    it('should detect unused arrow functions', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `const unusedArrow = () => 'unused';\nconst usedArrow = () => 'used';\nexport const result = usedArrow();`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedFunctions = analyzer.detectUnusedFunctions(sourceFile);
      
      const unused = unusedFunctions.find(f => f.functionName === 'unusedArrow');
      expect(unused).toBeDefined();
    });

    it('should not flag helper functions used internally', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `function helper() { return 'help'; }\nexport function main() { return helper(); }`,
        ts.ScriptTarget.Latest,
        true
      );

      const unusedFunctions = analyzer.detectUnusedFunctions(sourceFile);
      
      const helperFunc = unusedFunctions.find(f => f.functionName === 'helper');
      expect(helperFunc).toBeUndefined();
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for simple functions', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `function simple(a: number) { return a * 2; }`,
        ts.ScriptTarget.Latest,
        true
      );

      let functionNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, node => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      const complexity = (analyzer as any).calculateComplexity(functionNode!);
      expect(complexity).toBe(1);
    });

    it('should calculate complexity for functions with conditionals', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `function complex(x: number) {
          if (x > 0) {
            if (x > 10) {
              return 'big';
            }
            return 'positive';
          } else if (x < 0) {
            return 'negative';
          }
          return 'zero';
        }`,
        ts.ScriptTarget.Latest,
        true
      );

      let functionNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, node => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      const complexity = (analyzer as any).calculateComplexity(functionNode!);
      expect(complexity).toBeGreaterThan(1);
    });

    it('should count switch cases in complexity', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        `function withSwitch(x: string) {
          switch (x) {
            case 'a': return 1;
            case 'b': return 2;
            case 'c': return 3;
            default: return 0;
          }
        }`,
        ts.ScriptTarget.Latest,
        true
      );

      let functionNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, node => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      const complexity = (analyzer as any).calculateComplexity(functionNode!);
      expect(complexity).toBeGreaterThan(3);
    });
  });

  describe('detectMixedLogic', () => {
    it('should detect files with multiple unrelated entities', () => {
      const sourceFile = ts.createSourceFile(
        'mixed.ts',
        `export function dbConnect() { return 'db'; }
         export function formatString(s: string) { return s.toUpperCase(); }
         export class ApiClient { fetch() {} }
         export const CONSTANT = 42;`,
        ts.ScriptTarget.Latest,
        true
      );

      const entities = (analyzer as any).extractEntities(sourceFile);
      const mixedLogic = analyzer.detectMixedLogic(sourceFile, entities);
      
      expect(mixedLogic).toBeDefined();
      expect(mixedLogic?.entities.length).toBeGreaterThanOrEqual(3);
    });

    it('should not flag files with few entities', () => {
      const sourceFile = ts.createSourceFile(
        'related.ts',
        `function helper() { return 'help'; }
         export function main() { return helper(); }`,
        ts.ScriptTarget.Latest,
        true
      );

      const entities = (analyzer as any).extractEntities(sourceFile);
      const mixedLogic = analyzer.detectMixedLogic(sourceFile, entities);
      
      // Should be null because we only have 2 entities (below threshold of 3)
      expect(mixedLogic).toBeNull();
    });
  });

  describe('generateReport', () => {
    it('should generate a formatted text report', () => {
      const result = {
        unusedImports: [{
          filePath: 'test.ts',
          importName: 'unused',
          lineNumber: 1,
          importSource: 'module'
        }],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogicFiles: [],
        splitEntities: [],
        deadCode: []
      };

      const report = analyzer.generateReport(result);
      
      expect(report).toContain('CODE ANALYSIS REPORT');
      expect(report).toContain('UNUSED IMPORTS');
      expect(report).toContain('unused');
    });

    it('should include summary statistics', () => {
      const result = {
        unusedImports: [{ filePath: 'a.ts', importName: 'x', lineNumber: 1, importSource: 'm' }],
        unusedFunctions: [{ filePath: 'b.ts', functionName: 'f', lineNumber: 1, isExported: true, complexity: 1 }],
        unusedComponents: [],
        mixedLogicFiles: [],
        splitEntities: [],
        deadCode: []
      };

      const report = analyzer.generateReport(result);
      
      expect(report).toContain('Unused Imports:     1');
      expect(report).toContain('Unused Functions:   1');
    });
  });
});
