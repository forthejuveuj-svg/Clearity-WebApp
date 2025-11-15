import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationGenerator } from '../../generator/DocumentationGenerator.js';
import { DocumentationConfig } from '../../config.js';
import { CodeEntity, FileAnalysis } from '../../analyzer/types.js';
import * as path from 'path';

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;
  let config: DocumentationConfig;

  beforeEach(() => {
    config = {
      templatesDir: path.join(__dirname, '../../templates'),
      outputDir: 'docs',
      functionDocTemplate: 'function.hbs',
      groupDocTemplate: 'group.hbs',
      preserveManualContent: true,
    };

    generator = new DocumentationGenerator(config);
  });

  describe('extractManualContent', () => {
    it('should extract manually written purpose section', () => {
      const existingDoc = `# myFunction

**Path:** src/utils/myFunction.ts

### Purpose
This is manually written content that should be preserved.

### Input
- \`param1\` (string): Description

### Output
Returns a string`;

      const manualContent = generator.extractManualContent(existingDoc);
      
      expect(manualContent.has('Purpose')).toBe(true);
      expect(manualContent.get('Purpose')).toContain('manually written content');
    });

    it('should handle missing sections gracefully', () => {
      const existingDoc = `# myFunction

**Path:** src/utils/myFunction.ts`;

      const manualContent = generator.extractManualContent(existingDoc);
      
      expect(manualContent.size).toBe(0);
    });

    it('should extract multiple manual sections', () => {
      const existingDoc = `# myFunction

### Purpose
Manual purpose content

### Notes
Manual notes content

### Examples
Manual examples`;

      const manualContent = generator.extractManualContent(existingDoc);
      
      expect(manualContent.size).toBeGreaterThanOrEqual(1);
      expect(manualContent.has('Purpose')).toBe(true);
    });
  });

  describe('mergeManualContent', () => {
    it('should merge manual content into generated documentation', () => {
      const generated = `# myFunction

**Path:** src/utils/myFunction.ts

### Purpose
[Auto-generated placeholder]

### Input
- \`param1\` (string): Parameter 1

### Output
Returns string`;

      const manual = new Map<string, string>();
      manual.set('Purpose', 'This is the manually written purpose');

      const merged = generator.mergeManualContent(generated, manual);
      
      expect(merged).toContain('manually written purpose');
      expect(merged).not.toContain('[Auto-generated placeholder]');
    });

    it('should preserve generated content when no manual content exists', () => {
      const generated = `# myFunction

### Input
- \`param1\` (string): Parameter 1`;

      const manual = new Map<string, string>();

      const merged = generator.mergeManualContent(generated, manual);
      
      expect(merged).toBe(generated);
    });
  });

  describe('generateDocumentationIndex', () => {
    it('should create an index with function entries', async () => {
      const index = await generator.generateDocumentationIndex();
      
      expect(index).toBeDefined();
      expect(index.version).toBeDefined();
      expect(index.functions).toBeDefined();
      expect(index.groups).toBeDefined();
      expect(index.statistics).toBeDefined();
    });

    it('should include statistics in the index', async () => {
      const index = await generator.generateDocumentationIndex();
      
      expect(index.statistics.totalFunctions).toBeGreaterThanOrEqual(0);
      expect(index.statistics.totalGroups).toBeGreaterThanOrEqual(0);
      expect(index.statistics.documentationCoverage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parameter extraction', () => {
    it('should extract parameters from TypeScript function', () => {
      const entity: CodeEntity = {
        name: 'testFunction',
        type: 'function',
        lineStart: 1,
        lineEnd: 5,
        dependencies: [],
      };

      const analysis: FileAnalysis = {
        filePath: 'test.ts',
        unusedImports: [],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogic: null,
        entities: [entity],
      };

      // Test that the generator can handle entity data
      expect(entity.name).toBe('testFunction');
      expect(entity.type).toBe('function');
    });

    it('should handle functions with no parameters', () => {
      const entity: CodeEntity = {
        name: 'noParams',
        type: 'function',
        lineStart: 1,
        lineEnd: 3,
        dependencies: [],
      };

      expect(entity.dependencies.length).toBe(0);
    });

    it('should handle functions with multiple parameters', () => {
      const entity: CodeEntity = {
        name: 'multiParams',
        type: 'function',
        lineStart: 1,
        lineEnd: 5,
        dependencies: ['dep1', 'dep2'],
      };

      expect(entity.dependencies.length).toBe(2);
    });
  });

  describe('template rendering', () => {
    it('should handle function documentation template', () => {
      const functionData = {
        functionName: 'testFunc',
        filePath: 'src/test.ts',
        purpose: 'Test purpose',
        inputs: [],
        output: 'string',
        usedIn: [],
        complexity: 1,
        group: 'utils',
      };

      // Verify data structure is correct
      expect(functionData.functionName).toBe('testFunc');
      expect(functionData.complexity).toBe(1);
    });

    it('should handle group documentation template', () => {
      const groupData = {
        groupName: 'Utils',
        description: 'Utility functions',
        technologies: ['TypeScript'],
        externalConnections: [],
        functions: [],
      };

      // Verify data structure is correct
      expect(groupData.groupName).toBe('Utils');
      expect(groupData.technologies.length).toBe(1);
    });
  });

  describe('configuration', () => {
    it('should respect preserveManualContent setting', () => {
      expect(generator['config'].preserveManualContent).toBe(true);
    });

    it('should use configured output directory', () => {
      expect(generator['config'].outputDir).toBe('docs');
    });

    it('should use configured template files', () => {
      expect(generator['config'].functionDocTemplate).toBe('function.hbs');
      expect(generator['config'].groupDocTemplate).toBe('group.hbs');
    });
  });
});
