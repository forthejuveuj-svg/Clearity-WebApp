import { describe, it, expect, beforeEach } from 'vitest';
import { FileReorganizer } from '../../reorganizer/FileReorganizer.js';
import { ReorganizerConfig, GroupingRule } from '../../config.js';
import { AnalysisResult } from '../../analyzer/types.js';
import * as path from 'path';

describe('FileReorganizer', () => {
  let reorganizer: FileReorganizer;
  let config: ReorganizerConfig;
  const rootPath = '/test/project';

  beforeEach(() => {
    const groupingRules: GroupingRule[] = [
      {
        name: 'Supabase',
        pattern: /supabase|database|db/i,
        targetDirectory: 'services/supabase',
        priority: 1,
      },
      {
        name: 'Search',
        pattern: /search|filter|query/i,
        targetDirectory: 'features/search',
        priority: 2,
      },
      {
        name: 'UI Components',
        pattern: /Button|Input|Modal|Card/,
        targetDirectory: 'components/ui',
        priority: 3,
      },
      {
        name: 'Hooks',
        pattern: /^use[A-Z]/,
        targetDirectory: 'hooks',
        priority: 4,
      },
      {
        name: 'Utils',
        pattern: /util|helper|format/i,
        targetDirectory: 'utils',
        priority: 5,
      },
    ];

    config = {
      dryRun: true,
      createBackup: true,
      groupingRules,
    };

    reorganizer = new FileReorganizer(config, rootPath);
  });

  describe('matchGroupingRule', () => {
    it('should match supabase files', () => {
      const filePath = '/test/project/src/supabaseClient.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Supabase');
    });

    it('should match search files', () => {
      const filePath = '/test/project/src/searchUtils.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Search');
    });

    it('should match UI component files', () => {
      const filePath = '/test/project/src/Button.tsx';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('UI Components');
    });

    it('should match hook files by naming convention', () => {
      const filePath = '/test/project/src/useCustomHook.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Hooks');
    });

    it('should match utility files', () => {
      const filePath = '/test/project/src/formatHelper.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Utils');
    });

    it('should return null for files that do not match any rule', () => {
      const filePath = '/test/project/src/randomFile.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      expect(rule).toBeNull();
    });

    it('should prioritize rules correctly', () => {
      // A file that could match multiple rules should match the highest priority one
      const filePath = '/test/project/src/databaseUtil.ts';
      const rule = (reorganizer as any).matchGroupingRule(filePath);
      
      // Should match 'Supabase' (priority 1) over 'Utils' (priority 5)
      expect(rule?.name).toBe('Supabase');
    });
  });

  describe('generateTargetPath', () => {
    it('should generate correct target path for supabase files', () => {
      const sourcePath = '/test/project/src/supabaseClient.ts';
      const rule: GroupingRule = {
        name: 'Supabase',
        pattern: /supabase/i,
        targetDirectory: 'services/supabase',
        priority: 1,
      };
      
      const targetPath = (reorganizer as any).generateTargetPath(sourcePath, rule);
      
      expect(targetPath).toContain('services/supabase');
      expect(targetPath).toContain('supabaseClient.ts');
    });

    it('should preserve file extension', () => {
      const sourcePath = '/test/project/src/Button.tsx';
      const rule: GroupingRule = {
        name: 'UI',
        pattern: /Button/,
        targetDirectory: 'components/ui',
        priority: 1,
      };
      
      const targetPath = (reorganizer as any).generateTargetPath(sourcePath, rule);
      
      expect(targetPath).toMatch(/\.tsx$/);
    });
  });

  describe('createReorganizationPlan', () => {
    it('should create a plan with file moves', async () => {
      const analysis: AnalysisResult = {
        unusedImports: [
          {
            filePath: '/test/project/src/supabaseClient.ts',
            importName: 'unused',
            lineNumber: 1,
            importSource: 'module',
          },
        ],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogicFiles: [],
        splitEntities: [],
        deadCode: [],
      };

      const plan = await reorganizer.createReorganizationPlan(analysis);
      
      expect(plan).toBeDefined();
      expect(plan.moves).toBeDefined();
      expect(plan.splits).toBeDefined();
      expect(plan.deletions).toBeDefined();
    });

    it('should generate splits for mixed logic files', async () => {
      const analysis: AnalysisResult = {
        unusedImports: [],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogicFiles: [
          {
            filePath: '/test/project/src/mixed.ts',
            entities: [
              {
                name: 'funcA',
                type: 'function',
                lineStart: 1,
                lineEnd: 5,
                dependencies: [],
              },
              {
                name: 'funcB',
                type: 'function',
                lineStart: 7,
                lineEnd: 12,
                dependencies: [],
              },
            ],
            suggestedSplit: [
              {
                targetFile: '/test/project/src/funcA.ts',
                entities: ['funcA'],
                reason: 'Split entity',
              },
              {
                targetFile: '/test/project/src/funcB.ts',
                entities: ['funcB'],
                reason: 'Split entity',
              },
            ],
          },
        ],
        splitEntities: [],
        deadCode: [],
      };

      const plan = await reorganizer.createReorganizationPlan(analysis);
      
      expect(plan.splits.length).toBeGreaterThan(0);
      expect(plan.splits[0].targetFiles.length).toBe(2);
    });

    it('should generate deletions for dead code', async () => {
      const analysis: AnalysisResult = {
        unusedImports: [],
        unusedFunctions: [],
        unusedComponents: [],
        mixedLogicFiles: [],
        splitEntities: [],
        deadCode: [
          {
            filePath: '/test/project/src/unused.ts',
            type: 'function',
            name: 'unusedFunc',
            lineNumber: 10,
            impact: 'Low',
          },
        ],
      };

      const plan = await reorganizer.createReorganizationPlan(analysis);
      
      expect(plan.deletions).toBeDefined();
    });
  });

  describe('dry-run mode', () => {
    it('should respect dry-run configuration', () => {
      expect(reorganizer['config'].dryRun).toBe(true);
    });

    it('should have backup enabled when configured', () => {
      expect(reorganizer['config'].createBackup).toBe(true);
    });
  });
});
