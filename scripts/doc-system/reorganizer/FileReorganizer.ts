/**
 * File Reorganizer Module
 * Restructures the codebase based on analysis results and logical grouping rules
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import simpleGit, { SimpleGit } from 'simple-git';
import { ReorganizerConfig, GroupingRule } from '../config';
import { AnalysisResult, CodeEntity, MixedLogicFile } from '../analyzer/types';
import {
  ReorganizationPlan,
  FileMove,
  FileSplit,
  FileMerge,
  FileDeletion,
  TargetFile,
} from './types';

import { FileReorganizerExecutionMixin } from './FileReorganizerExecution';

export class FileReorganizer extends FileReorganizerExecutionMixin {
  protected git: SimpleGit;
  protected config: ReorganizerConfig;
  protected rootPath: string;

  constructor(
    config: ReorganizerConfig,
    rootPath: string
  ) {
    super(rootPath);
    this.config = config;
    this.rootPath = rootPath;
    this.git = simpleGit(rootPath);
  }

  /**
   * Create a reorganization plan based on analysis results
   */
  async createReorganizationPlan(
    analysis: AnalysisResult
  ): Promise<ReorganizationPlan> {
    const plan: ReorganizationPlan = {
      moves: [],
      splits: [],
      merges: [],
      deletions: [],
    };

    const moves = await this.generateFileMoves(analysis);
    plan.moves = moves;

    const splits = await this.generateFileSplits(analysis.mixedLogicFiles);
    plan.splits = splits;

    const deletions = this.generateDeletions(analysis);
    plan.deletions = deletions;

    return plan;
  }

  private async generateFileMoves(analysis: AnalysisResult): Promise<FileMove[]> {
    const moves: FileMove[] = [];
    const processedFiles = new Set<string>();

    const allFiles = new Set<string>();
    
    analysis.unusedImports.forEach((item) => allFiles.add(item.filePath));
    analysis.unusedFunctions.forEach((item) => allFiles.add(item.filePath));
    analysis.unusedComponents.forEach((item) => allFiles.add(item.filePath));
    analysis.mixedLogicFiles.forEach((item) => allFiles.add(item.filePath));

    for (const filePath of allFiles) {
      if (processedFiles.has(filePath)) continue;

      const matchedRule = this.matchGroupingRule(filePath);
      if (matchedRule) {
        const targetPath = this.generateTargetPath(filePath, matchedRule);
        
        if (targetPath !== filePath) {
          moves.push({
            sourcePath: filePath,
            targetPath,
            reason: `Matches grouping rule: ${matchedRule.name}`,
            affectedImports: [],
          });
          processedFiles.add(filePath);
        }
      }
    }

    return moves;
  }

  private matchGroupingRule(filePath: string): GroupingRule | null {
    const fileName = path.basename(filePath, path.extname(filePath));

    const sortedRules = [...this.config.groupingRules].sort(
      (a, b) => a.priority - b.priority
    );

    for (const rule of sortedRules) {
      if (rule.pattern.test(fileName)) {
        return rule;
      }

      if (rule.pattern.test(filePath)) {
        return rule;
      }
    }

    return null;
  }

  private generateTargetPath(sourcePath: string, rule: GroupingRule): string {
    const fileName = path.basename(sourcePath);
    const relativePath = path.relative(this.rootPath, sourcePath);
    
    const pathParts = relativePath.split(path.sep);
    const baseDir = pathParts[0] || 'src';
    
    return path.join(baseDir, rule.targetDirectory, fileName);
  }

  private async generateFileSplits(mixedLogicFiles: MixedLogicFile[]): Promise<FileSplit[]> {
    const splits: FileSplit[] = [];

    for (const mixedFile of mixedLogicFiles) {
      const targetFiles: TargetFile[] = [];

      for (const suggestion of mixedFile.suggestedSplit) {
        targetFiles.push({
          path: suggestion.targetFile,
          content: '',
          entities: suggestion.entities,
        });
      }

      if (targetFiles.length > 0) {
        splits.push({
          sourcePath: mixedFile.filePath,
          targetFiles,
          reason: `File contains ${mixedFile.entities.length} mixed entities`,
        });
      }
    }

    return splits;
  }

  private generateDeletions(analysis: AnalysisResult): FileDeletion[] {
    const deletions: FileDeletion[] = [];

    const deadCodeByFile = new Map<string, typeof analysis.deadCode>();
    
    for (const deadCode of analysis.deadCode) {
      if (!deadCodeByFile.has(deadCode.filePath)) {
        deadCodeByFile.set(deadCode.filePath, []);
      }
      deadCodeByFile.get(deadCode.filePath)!.push(deadCode);
    }

    for (const [filePath, deadCodeItems] of deadCodeByFile) {
      const allDead = deadCodeItems.every(
        (item) => item.type === 'function' || item.type === 'component'
      );

      if (allDead && deadCodeItems.length > 0) {
        deletions.push({
          filePath,
          reason: 'All exports are unused',
          impact: `${deadCodeItems.length} unused items`,
        });
      }
    }

    return deletions;
  }

  applyGroupingRules(entities: CodeEntity[]): Map<string, CodeEntity[]> {
    const groups = new Map<string, CodeEntity[]>();

    for (const entity of entities) {
      let matched = false;

      const sortedRules = [...this.config.groupingRules].sort(
        (a, b) => a.priority - b.priority
      );

      for (const rule of sortedRules) {
        if (rule.pattern.test(entity.name)) {
          if (!groups.has(rule.name)) {
            groups.set(rule.name, []);
          }
          groups.get(rule.name)!.push(entity);
          matched = true;
          break;
        }
      }

      if (!matched) {
        if (!groups.has('Other')) {
          groups.set('Other', []);
        }
        groups.get('Other')!.push(entity);
      }
    }

    return groups;
  }
}
