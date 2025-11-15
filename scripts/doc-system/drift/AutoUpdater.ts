/**
 * Auto Updater - Automatically updates documentation when code changes
 */

import * as ts from 'typescript';
import { readFile, writeFile, unlink, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { DocumentationGenerator } from '../generator/DocumentationGenerator.js';
import { DocumentationConfig } from '../config.js';
import { FileChange, AffectedDocumentation, AutoUpdateResult } from './types.js';

export class AutoUpdater {
  private rootPath: string;
  private docsPath: string;
  private docGenerator: DocumentationGenerator;

  constructor(
    rootPath: string,
    docsPath: string,
    docConfig: DocumentationConfig
  ) {
    this.rootPath = rootPath;
    this.docsPath = docsPath;
    this.docGenerator = new DocumentationGenerator(docConfig, rootPath);
  }

  /**
   * Auto-update documentation based on code changes
   */
  async autoUpdateDocumentation(
    changes: FileChange[],
    affectedDocs: AffectedDocumentation[]
  ): Promise<AutoUpdateResult[]> {
    const results: AutoUpdateResult[] = [];

    console.log(`\n🔄 Auto-updating ${affectedDocs.length} documentation file(s)...`);

    for (const affected of affectedDocs) {
      try {
        let result: AutoUpdateResult;

        if (affected.changeType === 'update_required') {
          result = await this.updateDocumentation(affected);
        } else if (affected.changeType === 'delete_required') {
          result = await this.deleteDocumentation(affected);
        } else if (affected.changeType === 'create_required') {
          result = await this.createDocumentation(affected);
        } else {
          continue;
        }

        results.push(result);
      } catch (error) {
        console.error(`Failed to update ${affected.docPath}:`, error);
        results.push({
          filePath: '',
          docPath: affected.docPath,
          updateType: 'signature',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Print summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`\n✅ Successfully updated: ${successful}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }

    return results;
  }

  /**
   * Update existing documentation
   */
  private async updateDocumentation(
    affected: AffectedDocumentation
  ): Promise<AutoUpdateResult> {
    const docPath = affected.docPath;
    const functionName = basename(docPath, '.md');

    // Find the source file
    const filePath = await this.findSourceFile(docPath);
    if (!filePath) {
      return {
        filePath: '',
        docPath,
        updateType: 'signature',
        success: false,
        error: 'Source file not found',
      };
    }

    try {
      // Read source file
      const sourceContent = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Find function node
      const functionNode = this.findFunctionNode(sourceFile, functionName);
      if (!functionNode) {
        return {
          filePath,
          docPath,
          updateType: 'signature',
          success: false,
          error: 'Function not found in source',
        };
      }

      // Extract manual content before updating
      const manualContent = await this.docGenerator.extractManualContent(docPath);
      const preservedSections = Array.from(manualContent.sections.keys());

      // Update Input section if signature changed
      if (affected.affectedSections.includes('Input')) {
        await this.updateInputSection(docPath, functionNode);
      }

      // Update Output section if return type changed
      if (affected.affectedSections.includes('Output')) {
        await this.updateOutputSection(docPath, functionNode);
      }

      console.log(`  ✓ Updated ${relative(this.rootPath, docPath)}`);

      return {
        filePath,
        docPath,
        updateType: 'signature',
        success: true,
        preservedContent: preservedSections,
      };
    } catch (error) {
      return {
        filePath,
        docPath,
        updateType: 'signature',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update Input section when function signature changes
   */
  private async updateInputSection(
    docPath: string,
    functionNode:
      | ts.FunctionDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression
  ): Promise<void> {
    // Read existing documentation
    const content = await readFile(docPath, 'utf-8');

    // Extract parameters from function
    const parameters = this.extractParameters(functionNode);

    // Generate new Input section
    let newInputSection: string;
    if (parameters.length === 0) {
      newInputSection = '\n_No parameters_\n';
    } else {
      newInputSection =
        '\n' +
        parameters
          .map((param) => {
            const optional = param.optional ? ' (optional)' : '';
            return `- \`${param.name}${param.optional ? '?' : ''}: ${param.type}\`${optional} - ${param.description || '[Description needed]'}`;
          })
          .join('\n') +
        '\n';
    }

    // Replace Input section
    const inputRegex = /### Input\s*\n([\s\S]*?)(?=\n###|$)/;
    const updatedContent = content.replace(
      inputRegex,
      `### Input${newInputSection}`
    );

    // Write back
    await writeFile(docPath, updatedContent, 'utf-8');
  }

  /**
   * Update Output section when return type changes
   */
  private async updateOutputSection(
    docPath: string,
    functionNode:
      | ts.FunctionDeclaration
      | ts.ArrowFunction
      | ts.FunctionExpression
  ): Promise<void> {
    // Read existing documentation
    const content = await readFile(docPath, 'utf-8');

    // Extract return type from function
    const returnType = this.extractReturnType(functionNode);

    // Try to preserve manual description
    const outputMatch = content.match(/### Output\s*\n([\s\S]*?)(?=\n###|$)/);
    let description = '';
    if (outputMatch) {
      // Extract description after the type
      const outputContent = outputMatch[1];
      const lines = outputContent.split('\n');
      for (const line of lines) {
        if (
          !line.includes('`') &&
          line.trim() !== '' &&
          !line.includes('[Description needed]')
        ) {
          description = line.trim();
          break;
        }
      }
    }

    // Generate new Output section
    const newOutputSection = `\n\`${returnType}\`\n\n${description || '[Description needed]'}\n`;

    // Replace Output section
    const outputRegex = /### Output\s*\n([\s\S]*?)(?=\n###|$)/;
    const updatedContent = content.replace(
      outputRegex,
      `### Output${newOutputSection}`
    );

    // Write back
    await writeFile(docPath, updatedContent, 'utf-8');
  }

  /**
   * Update all references when function is renamed
   */
  async updateReferencesOnRename(
    oldName: string,
    newName: string,
    filePath: string
  ): Promise<AutoUpdateResult> {
    try {
      // Get old and new doc paths
      const oldDocPath = this.getDocPath(filePath, oldName);
      const newDocPath = this.getDocPath(filePath, newName);

      if (!existsSync(oldDocPath)) {
        return {
          filePath,
          docPath: oldDocPath,
          updateType: 'rename',
          success: false,
          error: 'Old documentation not found',
        };
      }

      // Read documentation
      let content = await readFile(oldDocPath, 'utf-8');

      // Update function name in title
      content = content.replace(
        new RegExp(`^# ${oldName}`, 'm'),
        `# ${newName}`
      );

      // Update any references to the old name
      content = content.replace(
        new RegExp(`\`${oldName}\``, 'g'),
        `\`${newName}\``
      );

      // Write to new location
      await writeFile(newDocPath, content, 'utf-8');

      // Delete old documentation
      await unlink(oldDocPath);

      // Update all group documentation that references this function
      await this.updateGroupReferences(oldName, newName, filePath);

      console.log(`  ✓ Renamed ${oldName} → ${newName}`);

      return {
        filePath,
        docPath: newDocPath,
        updateType: 'rename',
        success: true,
      };
    } catch (error) {
      return {
        filePath,
        docPath: this.getDocPath(filePath, oldName),
        updateType: 'rename',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update group documentation references
   */
  private async updateGroupReferences(
    oldName: string,
    newName: string,
    filePath: string
  ): Promise<void> {
    const { glob } = await import('glob');

    // Find all group documentation files
    const groupDocs = await glob('groups/*.md', {
      cwd: this.docsPath,
      absolute: true,
    });

    for (const groupDocPath of groupDocs) {
      try {
        let content = await readFile(groupDocPath, 'utf-8');

        // Check if this group references the old function name
        if (content.includes(oldName)) {
          // Update references
          content = content.replace(
            new RegExp(`\\b${oldName}\\b`, 'g'),
            newName
          );

          await writeFile(groupDocPath, content, 'utf-8');
        }
      } catch (error) {
        console.error(`Failed to update group doc ${groupDocPath}:`, error);
      }
    }
  }

  /**
   * Remove or archive documentation when function is deleted
   */
  private async deleteDocumentation(
    affected: AffectedDocumentation
  ): Promise<AutoUpdateResult> {
    const docPath = affected.docPath;

    try {
      if (!existsSync(docPath)) {
        return {
          filePath: '',
          docPath,
          updateType: 'delete',
          success: true, // Already deleted
        };
      }

      // Archive instead of delete (move to .archived folder)
      const archivePath = this.getArchivePath(docPath);
      const archiveDir = dirname(archivePath);

      // Ensure archive directory exists
      const { mkdir } = await import('fs/promises');
      await mkdir(archiveDir, { recursive: true });

      // Move to archive
      await rename(docPath, archivePath);

      console.log(`  ✓ Archived ${relative(this.rootPath, docPath)}`);

      return {
        filePath: '',
        docPath,
        updateType: 'delete',
        success: true,
      };
    } catch (error) {
      return {
        filePath: '',
        docPath,
        updateType: 'delete',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create new documentation
   */
  private async createDocumentation(
    affected: AffectedDocumentation
  ): Promise<AutoUpdateResult> {
    const docPath = affected.docPath;
    const functionName = basename(docPath, '.md');

    // Find the source file
    const filePath = await this.findSourceFile(docPath);
    if (!filePath) {
      return {
        filePath: '',
        docPath,
        updateType: 'create',
        success: false,
        error: 'Source file not found',
      };
    }

    try {
      // Read source file
      const sourceContent = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Find function node
      const functionNode = this.findFunctionNode(sourceFile, functionName);
      if (!functionNode) {
        return {
          filePath,
          docPath,
          updateType: 'create',
          success: false,
          error: 'Function not found in source',
        };
      }

      // Create entity object
      const entity = {
        name: functionName,
        type: 'function' as const,
        lineStart: sourceFile.getLineAndCharacterOfPosition(functionNode.getStart()).line,
        lineEnd: sourceFile.getLineAndCharacterOfPosition(functionNode.getEnd()).line,
        dependencies: [],
      };

      // Generate documentation
      await this.docGenerator.generateFunctionDoc(
        entity,
        filePath,
        sourceFile
      );

      console.log(`  ✓ Created ${relative(this.rootPath, docPath)}`);

      return {
        filePath,
        docPath,
        updateType: 'create',
        success: true,
      };
    } catch (error) {
      return {
        filePath,
        docPath,
        updateType: 'create',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Find source file from documentation path
   */
  private async findSourceFile(docPath: string): Promise<string | null> {
    // Convert doc path back to source path
    const relativePath = relative(this.docsPath, docPath);
    const dirPath = dirname(relativePath);
    const functionName = basename(relativePath, '.md');

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const sourcePath = join(this.rootPath, dirPath + ext);
      if (existsSync(sourcePath)) {
        // Verify function exists in this file
        const content = await readFile(sourcePath, 'utf-8');
        if (content.includes(functionName)) {
          return sourcePath;
        }
      }
    }

    return null;
  }

  /**
   * Get archive path for a documentation file
   */
  private getArchivePath(docPath: string): string {
    const relativePath = relative(this.docsPath, docPath);
    return join(this.docsPath, '.archived', relativePath);
  }

  /**
   * Get documentation path for a function
   */
  private getDocPath(filePath: string, functionName: string): string {
    const relativePath = relative(this.rootPath, filePath);
    const docRelativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    return join(this.docsPath, dirname(docRelativePath), `${functionName}.md`);
  }

  /**
   * Find function node in AST
   */
  private findFunctionNode(
    sourceFile: ts.SourceFile,
    functionName: string
  ): ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null {
    let result: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        if (node.name && node.name.text === functionName) {
          result = node;
          return;
        }
      }

      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === functionName &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          ) {
            result = declaration.initializer;
            return;
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return result;
  }

  /**
   * Extract parameters from function node
   */
  private extractParameters(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
  ): Array<{ name: string; type: string; optional: boolean; description: string }> {
    return node.parameters.map((param) => {
      const name = param.name.getText();
      const optional = !!param.questionToken;
      const type = param.type ? param.type.getText() : 'any';

      return {
        name,
        type,
        optional,
        description: '',
      };
    });
  }

  /**
   * Extract return type from function node
   */
  private extractReturnType(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
  ): string {
    if (node.type) {
      return node.type.getText();
    }

    // Try to infer from return statements
    let returnType = 'void';
    const visit = (n: ts.Node) => {
      if (ts.isReturnStatement(n) && n.expression) {
        returnType = 'unknown';
      }
      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return returnType;
  }

  /**
   * Preserve manual content during automatic updates
   */
  async preserveManualContent(
    docPath: string,
    updatedContent: string
  ): Promise<string> {
    if (!existsSync(docPath)) {
      return updatedContent;
    }

    // Extract manual content from existing doc
    const manualContent = await this.docGenerator.extractManualContent(docPath);

    // Merge with updated content
    return this.docGenerator.mergeManualContent(updatedContent, manualContent);
  }
}
