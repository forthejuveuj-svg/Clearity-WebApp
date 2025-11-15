/**
 * File Reorganizer Execution Methods
 * Contains methods for executing reorganization plans
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileMove, FileSplit, FileMerge, FileDeletion, ReorganizationPlan } from './types';

export class FileReorganizerExecutionMixin {
  protected git: any;
  protected config: any;
  protected rootPath: string;
  protected backupPath: string | null = null;
  protected operationLog: Array<{ type: string; details: any }> = [];

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async executeReorganizationPlan(
    plan: ReorganizationPlan,
    dryRun: boolean
  ): Promise<void> {
    if (dryRun) {
      console.log('=== DRY RUN MODE ===');
      this.printPlan(plan);
      return;
    }

    console.log('Executing reorganization plan...');

    if (this.config.createBackup) {
      await this.createBackup();
    }

    try {
      for (const move of plan.moves) {
        await this.executeFileMove(move);
        this.operationLog.push({ type: 'move', details: move });
      }

      for (const split of plan.splits) {
        await this.executeSplit(split);
        this.operationLog.push({ type: 'split', details: split });
      }

      for (const merge of plan.merges) {
        await this.executeMerge(merge);
        this.operationLog.push({ type: 'merge', details: merge });
      }

      for (const deletion of plan.deletions) {
        await this.executeDeletion(deletion);
        this.operationLog.push({ type: 'delete', details: deletion });
      }

      console.log('Reorganization complete!');
      
      if (this.backupPath) {
        console.log(`Backup created at: ${this.backupPath}`);
        console.log('You can safely delete the backup if everything looks good.');
      }
    } catch (error) {
      console.error('Error during reorganization:', error);
      
      if (this.backupPath) {
        console.log('Attempting to rollback changes...');
        await this.rollback();
      }
      
      throw error;
    }
  }

  private async executeFileMove(move: FileMove): Promise<void> {
    const sourcePath = path.resolve(this.rootPath, move.sourcePath);
    const targetPath = path.resolve(this.rootPath, move.targetPath);

    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });

    const isGitRepo = await this.isGitRepository();
    const isTracked = isGitRepo ? await this.isFileTracked(move.sourcePath) : false;

    if (isTracked) {
      await this.git.mv(move.sourcePath, move.targetPath);
      console.log(`Git moved: ${move.sourcePath} -> ${move.targetPath}`);
    } else {
      await fs.rename(sourcePath, targetPath);
      console.log(`Moved: ${move.sourcePath} -> ${move.targetPath}`);
    }

    await this.updateImportsForMove(move);
  }

  async updateImports(move: FileMove): Promise<void> {
    await this.updateImportsForMove(move);
  }

  private async updateImportsForMove(move: FileMove): Promise<void> {
    const allFiles = await this.findAllSourceFiles();

    for (const filePath of allFiles) {
      if (filePath === move.sourcePath || filePath === move.targetPath) {
        continue;
      }

      await this.updateImportsInFile(filePath, move);
    }
  }

  private async updateImportsInFile(filePath: string, move: FileMove): Promise<void> {
    const fullPath = path.resolve(this.rootPath, filePath);
    const sourceCode = await fs.readFile(fullPath, 'utf-8');

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    let modified = false;
    const updates: { start: number; end: number; newText: string }[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          
          const resolvedImport = this.resolveImportPath(filePath, importPath);
          
          if (this.isSameFile(resolvedImport, move.sourcePath)) {
            const newImportPath = this.calculateRelativeImport(filePath, move.targetPath);

            updates.push({
              start: moduleSpecifier.getStart(sourceFile) + 1,
              end: moduleSpecifier.getEnd() - 1,
              newText: newImportPath,
            });
            modified = true;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (modified) {
      let updatedCode = sourceCode;
      updates.sort((a, b) => b.start - a.start);

      for (const update of updates) {
        updatedCode =
          updatedCode.substring(0, update.start) +
          update.newText +
          updatedCode.substring(update.end);
      }

      await fs.writeFile(fullPath, updatedCode, 'utf-8');
      console.log(`Updated imports in: ${filePath}`);
    }
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.join(fromDir, importPath);
      return this.normalizeFilePath(resolved);
    }
    return importPath;
  }

  private calculateRelativeImport(fromFile: string, toFile: string): string {
    const fromDir = path.dirname(fromFile);
    let relativePath = path.relative(fromDir, toFile);
    
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath.split(path.sep).join('/');
  }

  private isSameFile(path1: string, path2: string): boolean {
    const normalized1 = this.normalizeFilePath(path1);
    const normalized2 = this.normalizeFilePath(path2);
    
    const withoutExt1 = normalized1.replace(/\.(ts|tsx|js|jsx)$/, '');
    const withoutExt2 = normalized2.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    return withoutExt1 === withoutExt2;
  }

  private normalizeFilePath(filePath: string): string {
    return path.normalize(filePath).split(path.sep).join('/');
  }

  protected async findAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.rootPath, fullPath);
        
        if (this.isExcluded(relativePath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && this.isSourceFile(entry.name)) {
          files.push(relativePath);
        }
      }
    };
    
    await walk(this.rootPath);
    return files;
  }

  private isExcluded(filePath: string): boolean {
    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
    ];
    
    return excludePatterns.some((pattern) => {
      const regex = new RegExp(
        pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
      );
      return regex.test(filePath);
    });
  }

  private isSourceFile(fileName: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  private async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  private async isFileTracked(filePath: string): Promise<boolean> {
    try {
      const result = await this.git.raw(['ls-files', filePath]);
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async executeSplit(split: FileSplit): Promise<void> {
    console.log(`Splitting file: ${split.sourcePath}`);
    
    const sourcePath = path.resolve(this.rootPath, split.sourcePath);
    const sourceCode = await fs.readFile(sourcePath, 'utf-8');
    
    const sourceFile = ts.createSourceFile(
      split.sourcePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    for (const targetFile of split.targetFiles) {
      await this.createSplitFile(sourceFile, sourceCode, targetFile, split.sourcePath);
    }
    
    console.log(`Split ${split.sourcePath} into ${split.targetFiles.length} files`);
  }

  async splitFile(split: FileSplit): Promise<void> {
    await this.executeSplit(split);
  }

  private async createSplitFile(
    sourceFile: ts.SourceFile,
    sourceCode: string,
    targetFile: any,
    sourcePath: string
  ): Promise<void> {
    const targetPath = path.resolve(this.rootPath, targetFile.path);
    
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    const extractedContent = this.extractEntities(sourceFile, sourceCode, targetFile.entities);
    
    const imports = this.generateImportsForSplit(
      sourceFile,
      targetFile.entities,
      sourcePath,
      targetFile.path
    );
    
    const fileContent = imports + '\n\n' + extractedContent;
    
    await fs.writeFile(targetPath, fileContent, 'utf-8');
    console.log(`Created: ${targetFile.path}`);
    
    await this.updateReferencesForSplit(targetFile.entities, sourcePath, targetFile.path);
  }

  private extractEntities(
    sourceFile: ts.SourceFile,
    sourceCode: string,
    entityNames: string[]
  ): string {
    const extractedParts: string[] = [];
    const entitySet = new Set(entityNames);
    
    const visit = (node: ts.Node): void => {
      let shouldExtract = false;
      let entityName = '';
      
      if (ts.isFunctionDeclaration(node) && node.name) {
        entityName = node.name.text;
        shouldExtract = entitySet.has(entityName);
      } else if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration && ts.isIdentifier(declaration.name)) {
          entityName = declaration.name.text;
          shouldExtract = entitySet.has(entityName);
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        entityName = node.name.text;
        shouldExtract = entitySet.has(entityName);
      } else if (
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name
      ) {
        entityName = node.name.text;
        shouldExtract = entitySet.has(entityName);
      }
      
      if (shouldExtract) {
        const start = node.getFullStart();
        const end = node.getEnd();
        const text = sourceCode.substring(start, end).trim();
        extractedParts.push(text);
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    return extractedParts.join('\n\n');
  }

  private generateImportsForSplit(
    sourceFile: ts.SourceFile,
    entityNames: string[],
    sourcePath: string,
    targetPath: string
  ): string {
    const existingImports: string[] = [];
    const entitySet = new Set(entityNames);
    const usedIdentifiers = new Set<string>();
    
    const visit = (node: ts.Node, inTargetEntity: boolean = false): void => {
      let currentInTarget = inTargetEntity;
      
      if (
        (ts.isFunctionDeclaration(node) && node.name && entitySet.has(node.name.text)) ||
        (ts.isVariableStatement(node) &&
          node.declarationList.declarations[0] &&
          ts.isIdentifier(node.declarationList.declarations[0].name) &&
          entitySet.has(node.declarationList.declarations[0].name.text)) ||
        (ts.isClassDeclaration(node) && node.name && entitySet.has(node.name.text))
      ) {
        currentInTarget = true;
      }
      
      if (currentInTarget && ts.isIdentifier(node)) {
        usedIdentifiers.add(node.text);
      }
      
      ts.forEachChild(node, (child) => visit(child, currentInTarget));
    };
    
    visit(sourceFile);
    
    sourceFile.statements.forEach((statement) => {
      if (ts.isImportDeclaration(statement)) {
        const importText = statement.getText(sourceFile);
        
        if (statement.importClause) {
          let isUsed = false;
          
          if (statement.importClause.name) {
            const importName = statement.importClause.name.text;
            if (usedIdentifiers.has(importName)) {
              isUsed = true;
            }
          }
          
          if (statement.importClause.namedBindings) {
            if (ts.isNamedImports(statement.importClause.namedBindings)) {
              statement.importClause.namedBindings.elements.forEach((element) => {
                const importName = element.name.text;
                if (usedIdentifiers.has(importName)) {
                  isUsed = true;
                }
              });
            }
          }
          
          if (isUsed) {
            existingImports.push(importText);
          }
        }
      }
    });
    
    return existingImports.join('\n');
  }

  private async updateReferencesForSplit(
    entityNames: string[],
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const allFiles = await this.findAllSourceFiles();
    
    for (const filePath of allFiles) {
      if (filePath === oldPath || filePath === newPath) {
        continue;
      }
      
      await this.updateReferencesInFile(filePath, entityNames, oldPath, newPath);
    }
  }

  private async updateReferencesInFile(
    filePath: string,
    entityNames: string[],
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const fullPath = path.resolve(this.rootPath, filePath);
    const sourceCode = await fs.readFile(fullPath, 'utf-8');
    
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    let modified = false;
    const updates: { start: number; end: number; newText: string }[] = [];
    
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          const resolvedImport = this.resolveImportPath(filePath, importPath);
          
          if (this.isSameFile(resolvedImport, oldPath)) {
            let importsMovedEntity = false;
            
            if (node.importClause?.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach((element) => {
                  if (entityNames.includes(element.name.text)) {
                    importsMovedEntity = true;
                  }
                });
              }
            }
            
            if (importsMovedEntity) {
              const newImportPath = this.calculateRelativeImport(filePath, newPath);
              
              updates.push({
                start: moduleSpecifier.getStart(sourceFile) + 1,
                end: moduleSpecifier.getEnd() - 1,
                newText: newImportPath,
              });
              modified = true;
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    
    if (modified) {
      let updatedCode = sourceCode;
      updates.sort((a, b) => b.start - a.start);
      
      for (const update of updates) {
        updatedCode =
          updatedCode.substring(0, update.start) +
          update.newText +
          updatedCode.substring(update.end);
      }
      
      await fs.writeFile(fullPath, updatedCode, 'utf-8');
      console.log(`Updated references in: ${filePath}`);
    }
  }

  private async executeMerge(merge: FileMerge): Promise<void> {
    console.log(`Merge operation: ${merge.sourcePaths.join(', ')} -> ${merge.targetPath}`);
  }

  private async executeDeletion(deletion: FileDeletion): Promise<void> {
    const fullPath = path.resolve(this.rootPath, deletion.filePath);
    
    try {
      await fs.unlink(fullPath);
      console.log(`Deleted: ${deletion.filePath} (${deletion.reason})`);
    } catch (error) {
      console.error(`Failed to delete ${deletion.filePath}:`, error);
    }
  }

  private printPlan(plan: ReorganizationPlan): void {
    console.log('\n=== File Moves ===');
    if (plan.moves.length === 0) {
      console.log('None');
    } else {
      plan.moves.forEach((move) => {
        console.log(`${move.sourcePath} -> ${move.targetPath}`);
        console.log(`  Reason: ${move.reason}`);
      });
    }

    console.log('\n=== File Splits ===');
    if (plan.splits.length === 0) {
      console.log('None');
    } else {
      plan.splits.forEach((split) => {
        console.log(`${split.sourcePath} -> ${split.targetFiles.length} files`);
        console.log(`  Reason: ${split.reason}`);
        split.targetFiles.forEach((target) => {
          console.log(`    - ${target.path} (${target.entities.join(', ')})`);
        });
      });
    }

    console.log('\n=== File Merges ===');
    if (plan.merges.length === 0) {
      console.log('None');
    } else {
      plan.merges.forEach((merge) => {
        console.log(`${merge.sourcePaths.join(', ')} -> ${merge.targetPath}`);
        console.log(`  Reason: ${merge.reason}`);
      });
    }

    console.log('\n=== File Deletions ===');
    if (plan.deletions.length === 0) {
      console.log('None');
    } else {
      plan.deletions.forEach((deletion) => {
        console.log(`${deletion.filePath}`);
        console.log(`  Reason: ${deletion.reason}`);
        console.log(`  Impact: ${deletion.impact}`);
      });
    }
  }

  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.rootPath, '.doc-system-backups');
    this.backupPath = path.join(backupDir, `backup-${timestamp}`);
    
    console.log(`Creating backup at: ${this.backupPath}`);
    
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(this.backupPath, { recursive: true });
    
    await this.copyDirectory(this.rootPath, this.backupPath, [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.doc-system-backups',
    ]);
    
    const logPath = path.join(this.backupPath, 'operation-log.json');
    await fs.writeFile(
      logPath,
      JSON.stringify({ timestamp, operations: [] }, null, 2),
      'utf-8'
    );
    
    console.log('Backup created successfully');
  }

  private async copyDirectory(
    source: string,
    destination: string,
    excludeDirs: string[] = []
  ): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (excludeDirs.includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath, excludeDirs);
      } else if (entry.isFile()) {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  async rollback(): Promise<void> {
    if (!this.backupPath) {
      throw new Error('No backup available for rollback');
    }
    
    console.log(`Rolling back to backup: ${this.backupPath}`);
    
    try {
      await this.restoreFromBackup(this.backupPath, this.rootPath);
      
      console.log('Rollback completed successfully');
      
      await this.deleteDirectory(this.backupPath);
      this.backupPath = null;
      this.operationLog = [];
    } catch (error) {
      console.error('Error during rollback:', error);
      console.error(`Manual restoration may be required from: ${this.backupPath}`);
      throw error;
    }
  }

  private async restoreFromBackup(backupPath: string, targetPath: string): Promise<void> {
    const entries = await fs.readdir(backupPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const backupItemPath = path.join(backupPath, entry.name);
      const targetItemPath = path.join(targetPath, entry.name);
      
      if (entry.name === 'operation-log.json') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await fs.mkdir(targetItemPath, { recursive: true });
        await this.restoreFromBackup(backupItemPath, targetItemPath);
      } else if (entry.isFile()) {
        await fs.copyFile(backupItemPath, targetItemPath);
      }
    }
  }

  private async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete directory ${dirPath}:`, error);
    }
  }

  getBackupPath(): string | null {
    return this.backupPath;
  }

  getOperationLog(): Array<{ type: string; details: any }> {
    return [...this.operationLog];
  }

  async cleanupOldBackups(keepCount: number = 5): Promise<void> {
    const backupDir = path.join(this.rootPath, '.doc-system-backups');
    
    try {
      const entries = await fs.readdir(backupDir, { withFileTypes: true });
      const backups = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
        .map((entry) => ({
          name: entry.name,
          path: path.join(backupDir, entry.name),
        }))
        .sort((a, b) => b.name.localeCompare(a.name));
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        for (const backup of toDelete) {
          console.log(`Deleting old backup: ${backup.name}`);
          await this.deleteDirectory(backup.path);
        }
      }
    } catch (error) {
      console.warn('Could not clean up old backups:', error);
    }
  }
}
