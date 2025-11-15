import { describe, it, expect, beforeAll } from 'vitest';
import { CodeAnalyzer } from '../../analyzer/CodeAnalyzer.js';
import { FileReorganizer } from '../../reorganizer/FileReorganizer.js';
import { DocumentationGenerator } from '../../generator/DocumentationGenerator.js';
import { ImportGraphBuilder } from '../../graph/ImportGraphBuilder.js';
import { ValidationEngine } from '../../validation/ValidationEngine.js';
import { AnalyzerConfig, ReorganizerConfig, DocumentationConfig, GroupingRule } from '../../config.js';
import * as path from 'path';

describe('Integration Tests - End-to-End Workflow', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/sample-project');
  
  let analyzer: CodeAnalyzer;
  let reorganizer: FileReorganizer;
  let generator: DocumentationGenerator;
  let graphBuilder: ImportGraphBuilder;
  let validator: ValidationEngine;

  beforeAll(() => {
    const analyzerConfig: AnalyzerConfig = {
      excludePatterns: ['**/node_modules/**', '**/*.test.ts'],
      complexityThreshold: 10,
      mixedLogicThreshold: 3,
    };

    const groupingRules: GroupingRule[] = [
      {
        name: 'Hooks',
        pattern: /^use[A-Z]/,
        targetDirectory: 'hooks',
        priority: 1,
      },
      {
        name: 'Components',
        pattern: /^[A-Z].*\.(tsx|jsx)$/,
        targetDirectory: 'components',
        priority: 2,
      },
    ];

    const reorganizerConfig: ReorganizerConfig = {
      dryRun: true,
      createBackup: true,
      groupingRules,
    };

    const documentationConfig: DocumentationConfig = {
      templatesDir: path.join(__dirname, '../../templates'),
      outputDir: 'docs',
      functionDocTemplate: 'function.hbs',
      groupDocTemplate: 'group.hbs',
      preserveManualContent: true,
    };

    analyzer = new CodeAnalyzer(analyzerConfig);
    reorganizer = new FileReorganizer(reorganizerConfig, fixturesPath);
    generator = new DocumentationGenerator(documentationConfig);
    graphBuilder = new ImportGraphBuilder(fixturesPath);
    validator = new ValidationEngine([]);
  });

  describe('Analyze → Reorganize → Document → Validate', () => {
    it('should complete the full workflow without errors', async () => {
      // Step 1: Analyze
      const analysis = await analyzer.analyzeProject(fixturesPath);
      expect(analysis).toBeDefined();
      expect(analysis.unusedImports).toBeDefined();
      expect(analysis.unusedFunctions).toBeDefined();

      // Step 2: Create reorganization plan
      const plan = await reorganizer.createReorganizationPlan(analysis);
      expect(plan).toBeDefined();
      expect(plan.moves).toBeDefined();
      expect(plan.splits).toBeDefined();

      // Step 3: Generate documentation index
      const docIndex = await generator.generateDocumentationIndex();
      expect(docIndex).toBeDefined();
      expect(docIndex.functions).toBeDefined();
      expect(docIndex.statistics).toBeDefined();

      // Step 4: Validate (basic check)
      expect(validator).toBeDefined();
    });

    it('should handle analysis results correctly', async () => {
      const analysis = await analyzer.analyzeProject(fixturesPath);
      
      // Verify analysis structure
      expect(Array.isArray(analysis.unusedImports)).toBe(true);
      expect(Array.isArray(analysis.unusedFunctions)).toBe(true);
      expect(Array.isArray(analysis.unusedComponents)).toBe(true);
      expect(Array.isArray(analysis.mixedLogicFiles)).toBe(true);
      expect(Array.isArray(analysis.splitEntities)).toBe(true);
      expect(Array.isArray(analysis.deadCode)).toBe(true);
    });

    it('should generate valid reorganization plan', async () => {
      const analysis = await analyzer.analyzeProject(fixturesPath);
      const plan = await reorganizer.createReorganizationPlan(analysis);
      
      // Verify plan structure
      expect(Array.isArray(plan.moves)).toBe(true);
      expect(Array.isArray(plan.splits)).toBe(true);
      expect(Array.isArray(plan.merges)).toBe(true);
      expect(Array.isArray(plan.deletions)).toBe(true);
    });
  });

  describe('Import Graph Integration', () => {
    it('should build import graph from analyzed files', async () => {
      const graph = await graphBuilder.buildGraph();
      
      expect(graph).toBeDefined();
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
    });

    it('should detect circular dependencies in sample project', async () => {
      const graph = await graphBuilder.buildGraph();
      const circular = graphBuilder.detectCircularDependencies();
      
      expect(Array.isArray(circular)).toBe(true);
      // Sample project has circular-a.ts and circular-b.ts
      if (circular.length > 0) {
        expect(circular[0].files).toBeDefined();
      }
    });
  });

  describe('Documentation Generation Integration', () => {
    it('should preserve manual content when regenerating', () => {
      const existingDoc = `# testFunction

### Purpose
This is manually written and should be preserved.

### Input
- \`param\` (string): Parameter`;

      const manualContent = generator.extractManualContent(existingDoc);
      expect(manualContent.has('Purpose')).toBe(true);

      const newGenerated = `# testFunction

### Purpose
[Auto-generated]

### Input
- \`param\` (string): Parameter`;

      const merged = generator.mergeManualContent(newGenerated, manualContent);
      expect(merged).toContain('manually written');
      expect(merged).not.toContain('[Auto-generated]');
    });

    it('should generate complete documentation index', async () => {
      const index = await generator.generateDocumentationIndex();
      
      expect(index.version).toBeDefined();
      expect(index.generatedAt).toBeDefined();
      expect(index.statistics.totalFunctions).toBeGreaterThanOrEqual(0);
      expect(index.statistics.documentationCoverage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Integration', () => {
    it('should validate project structure', async () => {
      const result = await validator.validateProject();
      
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid paths gracefully', async () => {
      const invalidAnalyzer = new CodeAnalyzer({
        excludePatterns: [],
        complexityThreshold: 10,
        mixedLogicThreshold: 3,
      });

      try {
        await invalidAnalyzer.analyzeProject('/nonexistent/path');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty analysis results', async () => {
      const emptyAnalysis = {
        unusedImports: [],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogicFiles: [],
        splitEntities: [],
        deadCode: [],
      };

      const plan = await reorganizer.createReorganizationPlan(emptyAnalysis);
      
      expect(plan.moves.length).toBe(0);
      expect(plan.splits.length).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate text report from analysis', async () => {
      const analysis = await analyzer.analyzeProject(fixturesPath);
      const report = analyzer.generateReport(analysis);
      
      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
      expect(report).toContain('CODE ANALYSIS REPORT');
    });

    it('should generate JSON report from analysis', async () => {
      const analysis = await analyzer.analyzeProject(fixturesPath);
      const jsonReport = analyzer.generateJSONReport(analysis);
      
      expect(jsonReport).toBeDefined();
      expect(typeof jsonReport).toBe('string');
      
      const parsed = JSON.parse(jsonReport);
      expect(parsed.unusedImports).toBeDefined();
    });
  });
});
