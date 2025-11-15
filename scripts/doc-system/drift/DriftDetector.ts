/**
 * Drift Detector - Detects mismatches between code and documentation
 */

import * as ts from 'typescript';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { glob } from 'glob';
import { DriftReport, DriftItem, DriftSummary } from './types.js';

export class DriftDetector {
  private rootPath: string;
  private docsPath: string;

  constructor(rootPath: string, docsPath: string) {
    this.rootPath = rootPath;
    this.docsPath = docsPath;
  }

  /**
   * Detect all documentation drift in the project
   */
  async detectDrift(): Promise<DriftReport> {
    console.log('🔍 Detecting documentation drift...');

    const drifts: DriftItem[] = [];

    // Find all source files
    const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.rootPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.*', '**/*.spec.*'],
      absolute: true,
    });

    console.log(`Scanning ${sourceFiles.length} source files...`);

    // Check each source file
    for (const filePath of sourceFiles) {
      const fileDrifts = await this.detectFileDrift(filePath);
      drifts.push(...fileDrifts);
    }

    // Check for orphaned documentation (docs without source)
    const orphanedDrifts = await this.detectOrphanedDocs();
    drifts.push(...orphanedDrifts);

    // Create summary
    const summary = this.createSummary(drifts);

    const report: DriftReport = {
      generatedAt: new Date().toISOString(),
      drifts,
      summary,
    };

    this.printDriftSummary(report);

    return report;
  }

  /**
   * Detect drift for a single file
   */
  private async detectFileDrift(filePath: string): Promise<DriftItem[]> {
    const drifts: DriftItem[] = [];

    try {
      // Read source file
      const sourceContent = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract exported functions
      const exportedFunctions = this.extractExportedFunctions(sourceFile);

      // Check each function
      for (const funcName of exportedFunctions) {
        const docPath = this.getDocPath(filePath, funcName);

        // Check if documentation exists
        if (!existsSync(docPath)) {
          drifts.push({
            filePath: relative(this.rootPath, filePath),
            docPath: relative(this.rootPath, docPath),
            driftType: 'missing',
            severity: 'critical',
            details: `Function '${funcName}' is exported but has no documentation`,
            suggestedAction: `Run 'npm run doc-system document' to generate documentation`,
          });
          continue;
        }

        // Check for signature drift
        const signatureDrift = await this.checkSignatureDrift(
          filePath,
          funcName,
          docPath,
          sourceFile
        );
        if (signatureDrift) {
          drifts.push(signatureDrift);
        }

        // Check for outdated content
        const outdatedDrift = await this.checkOutdatedContent(
          filePath,
          funcName,
          docPath
        );
        if (outdatedDrift) {
          drifts.push(outdatedDrift);
        }
      }
    } catch (error) {
      console.error(`Error detecting drift in ${filePath}:`, error);
    }

    return drifts;
  }

  /**
   * Check for signature drift
   */
  private async checkSignatureDrift(
    filePath: string,
    functionName: string,
    docPath: string,
    sourceFile: ts.SourceFile
  ): Promise<DriftItem | null> {
    try {
      // Find function node
      const functionNode = this.findFunctionNode(sourceFile, functionName);
      if (!functionNode) {
        return null;
      }

      // Extract parameters and return type from source
      const sourceParams = this.extractParametersFromNode(functionNode);
      const sourceReturnType = this.extractReturnType(functionNode);

      // Read documentation
      const docContent = await readFile(docPath, 'utf-8');

      // Extract parameters and return type from documentation
      const docParams = this.extractParametersFromDoc(docContent);
      const docReturnType = this.extractReturnTypeFromDoc(docContent);

      // Compare parameters
      const paramsDiffer = !this.parametersMatch(sourceParams, docParams);
      const returnTypeDiffers = sourceReturnType !== docReturnType;

      if (paramsDiffer || returnTypeDiffers) {
        let details = `Function signature has changed:\n`;
        if (paramsDiffer) {
          details += `  Parameters: Source has (${sourceParams.join(', ')}), Doc has (${docParams.join(', ')})\n`;
        }
        if (returnTypeDiffers) {
          details += `  Return type: Source has '${sourceReturnType}', Doc has '${docReturnType}'`;
        }

        return {
          filePath: relative(this.rootPath, filePath),
          docPath: relative(this.rootPath, docPath),
          driftType: 'signature',
          severity: 'critical',
          details: details.trim(),
          suggestedAction: `Update documentation to match current signature`,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error checking signature drift for ${functionName}:`, error);
      return null;
    }
  }

  /**
   * Check for outdated content
   */
  private async checkOutdatedContent(
    filePath: string,
    functionName: string,
    docPath: string
  ): Promise<DriftItem | null> {
    try {
      const docContent = await readFile(docPath, 'utf-8');

      // Check for placeholder content
      const hasPlaceholders =
        docContent.includes('[Description needed]') ||
        docContent.includes('[Purpose not documented]') ||
        docContent.includes('TODO');

      if (hasPlaceholders) {
        return {
          filePath: relative(this.rootPath, filePath),
          docPath: relative(this.rootPath, docPath),
          driftType: 'outdated',
          severity: 'warning',
          details: `Documentation contains placeholder text that needs to be filled in`,
          suggestedAction: `Review and update documentation with actual descriptions`,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error checking outdated content for ${functionName}:`, error);
      return null;
    }
  }

  /**
   * Detect orphaned documentation (docs without source)
   */
  private async detectOrphanedDocs(): Promise<DriftItem[]> {
    const drifts: DriftItem[] = [];

    try {
      // Find all documentation files
      const docFiles = await glob('**/*.md', {
        cwd: this.docsPath,
        ignore: ['index.md', 'INDEX.md', 'groups/**', '.archived/**'],
        absolute: true,
      });

      for (const docPath of docFiles) {
        const functionName = basename(docPath, '.md');

        // Try to find corresponding source file
        const sourcePath = await this.findSourceFile(docPath, functionName);

        if (!sourcePath) {
          drifts.push({
            filePath: '',
            docPath: relative(this.rootPath, docPath),
            driftType: 'orphaned',
            severity: 'warning',
            details: `Documentation exists but source file or function not found`,
            suggestedAction: `Archive or delete this documentation file`,
          });
        }
      }
    } catch (error) {
      console.error('Error detecting orphaned docs:', error);
    }

    return drifts;
  }

  /**
   * Find source file from documentation path
   */
  private async findSourceFile(
    docPath: string,
    functionName: string
  ): Promise<string | null> {
    // Convert doc path back to source path
    const relativePath = relative(this.docsPath, docPath);
    const dirPath = dirname(relativePath);

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const sourcePath = join(this.rootPath, dirPath + ext);
      if (existsSync(sourcePath)) {
        // Verify function exists in this file
        const content = await readFile(sourcePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          sourcePath,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const functionNode = this.findFunctionNode(sourceFile, functionName);
        if (functionNode) {
          return sourcePath;
        }
      }
    }

    return null;
  }

  /**
   * Compare function signatures, parameter types, and return types
   */
  async compareSignatures(
    filePath: string,
    functionName: string,
    docPath: string
  ): Promise<{
    match: boolean;
    parametersDiffer: boolean;
    returnTypeDiffers: boolean;
    details: string;
  }> {
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
          match: false,
          parametersDiffer: false,
          returnTypeDiffers: false,
          details: 'Function not found in source',
        };
      }

      // Extract from source
      const sourceParams = this.extractParametersFromNode(functionNode);
      const sourceReturnType = this.extractReturnType(functionNode);

      // Read documentation
      const docContent = await readFile(docPath, 'utf-8');

      // Extract from documentation
      const docParams = this.extractParametersFromDoc(docContent);
      const docReturnType = this.extractReturnTypeFromDoc(docContent);

      // Compare
      const parametersDiffer = !this.parametersMatch(sourceParams, docParams);
      const returnTypeDiffers = sourceReturnType !== docReturnType;
      const match = !parametersDiffer && !returnTypeDiffers;

      let details = '';
      if (parametersDiffer) {
        details += `Parameters differ: Source (${sourceParams.join(', ')}) vs Doc (${docParams.join(', ')}). `;
      }
      if (returnTypeDiffers) {
        details += `Return type differs: Source (${sourceReturnType}) vs Doc (${docReturnType}).`;
      }

      return {
        match,
        parametersDiffer,
        returnTypeDiffers,
        details: details.trim() || 'Signatures match',
      };
    } catch (error) {
      return {
        match: false,
        parametersDiffer: false,
        returnTypeDiffers: false,
        details: `Error comparing signatures: ${error}`,
      };
    }
  }

  /**
   * Generate drift report listing all outdated documentation
   */
  async generateDriftReport(outputPath?: string): Promise<DriftReport> {
    const report = await this.detectDrift();

    if (outputPath) {
      // Write JSON report
      const jsonPath = outputPath.endsWith('.json')
        ? outputPath
        : `${outputPath}.json`;
      await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`\n📄 Drift report saved to: ${jsonPath}`);

      // Write human-readable report
      const mdPath = outputPath.replace(/\.json$/, '.md');
      const markdown = this.generateMarkdownReport(report);
      await writeFile(mdPath, markdown, 'utf-8');
      console.log(`📄 Human-readable report saved to: ${mdPath}`);
    }

    return report;
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: DriftReport): string {
    const lines: string[] = [];

    lines.push('# Documentation Drift Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Drifts:** ${report.summary.totalDrifts}`);
    lines.push(`- **Critical:** ${report.summary.criticalDrifts}`);
    lines.push(`- **Warnings:** ${report.summary.warningDrifts}`);
    lines.push(`- **Info:** ${report.summary.infoDrifts}`);
    lines.push(`- **Files Affected:** ${report.summary.filesAffected}`);
    lines.push('');

    // Group by severity
    const critical = report.drifts.filter((d) => d.severity === 'critical');
    const warnings = report.drifts.filter((d) => d.severity === 'warning');
    const info = report.drifts.filter((d) => d.severity === 'info');

    if (critical.length > 0) {
      lines.push('## Critical Issues');
      lines.push('');
      for (const drift of critical) {
        lines.push(`### ${drift.driftType.toUpperCase()}: ${drift.docPath}`);
        lines.push('');
        lines.push(`**File:** \`${drift.filePath || 'N/A'}\``);
        lines.push(`**Details:** ${drift.details}`);
        lines.push(`**Action:** ${drift.suggestedAction}`);
        lines.push('');
      }
    }

    if (warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');
      for (const drift of warnings) {
        lines.push(`### ${drift.driftType.toUpperCase()}: ${drift.docPath}`);
        lines.push('');
        lines.push(`**File:** \`${drift.filePath || 'N/A'}\``);
        lines.push(`**Details:** ${drift.details}`);
        lines.push(`**Action:** ${drift.suggestedAction}`);
        lines.push('');
      }
    }

    if (info.length > 0) {
      lines.push('## Info');
      lines.push('');
      for (const drift of info) {
        lines.push(`### ${drift.driftType.toUpperCase()}: ${drift.docPath}`);
        lines.push('');
        lines.push(`**File:** \`${drift.filePath || 'N/A'}\``);
        lines.push(`**Details:** ${drift.details}`);
        lines.push(`**Action:** ${drift.suggestedAction}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Create summary from drifts
   */
  private createSummary(drifts: DriftItem[]): DriftSummary {
    const filesAffected = new Set(
      drifts.map((d) => d.filePath).filter((f) => f !== '')
    ).size;

    return {
      totalDrifts: drifts.length,
      criticalDrifts: drifts.filter((d) => d.severity === 'critical').length,
      warningDrifts: drifts.filter((d) => d.severity === 'warning').length,
      infoDrifts: drifts.filter((d) => d.severity === 'info').length,
      filesAffected,
    };
  }

  /**
   * Print drift summary to console
   */
  private printDriftSummary(report: DriftReport): void {
    console.log('\n=== Documentation Drift Summary ===');
    console.log(`Total Drifts: ${report.summary.totalDrifts}`);
    console.log(`  Critical: ${report.summary.criticalDrifts}`);
    console.log(`  Warnings: ${report.summary.warningDrifts}`);
    console.log(`  Info: ${report.summary.infoDrifts}`);
    console.log(`Files Affected: ${report.summary.filesAffected}`);

    if (report.summary.criticalDrifts > 0) {
      console.log('\n❌ Critical issues found! Documentation is out of sync.');
    } else if (report.summary.warningDrifts > 0) {
      console.log('\n⚠️  Warnings found. Consider updating documentation.');
    } else {
      console.log('\n✅ No drift detected. Documentation is up to date!');
    }
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
   * Extract exported functions from source file
   */
  private extractExportedFunctions(sourceFile: ts.SourceFile): string[] {
    const functions: string[] = [];

    const visit = (node: ts.Node) => {
      // Exported function declaration
      if (ts.isFunctionDeclaration(node)) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );
        if (hasExport && node.name) {
          functions.push(node.name.text);
        }
      }

      // Exported variable with function
      if (ts.isVariableStatement(node)) {
        const hasExport = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        );
        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name &&
            hasExport &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer))
          ) {
            functions.push(declaration.name.text);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return functions;
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
  private extractParametersFromNode(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction
  ): string[] {
    return node.parameters.map((param) => {
      const name = param.name.getText();
      const optional = param.questionToken ? '?' : '';
      const type = param.type ? `: ${param.type.getText()}` : '';
      return `${name}${optional}${type}`;
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
   * Extract parameters from documentation
   */
  private extractParametersFromDoc(docContent: string): string[] {
    const params: string[] = [];

    // Find the Input section
    const inputMatch = docContent.match(/### Input\s*\n([\s\S]*?)(?=\n###|$)/);
    if (!inputMatch) {
      return params;
    }

    const inputSection = inputMatch[1];
    const lines = inputSection.split('\n');

    // Parse parameter lines (e.g., "- `name: string` - description")
    for (const line of lines) {
      const paramMatch = line.match(/- `([^`]+)`/);
      if (paramMatch) {
        params.push(paramMatch[1]);
      }
    }

    return params;
  }

  /**
   * Extract return type from documentation
   */
  private extractReturnTypeFromDoc(docContent: string): string {
    // Find the Output section
    const outputMatch = docContent.match(/### Output\s*\n([\s\S]*?)(?=\n###|$)/);
    if (!outputMatch) {
      return 'unknown';
    }

    const outputSection = outputMatch[1];
    const lines = outputSection.split('\n');

    // Find the line with the return type (usually in backticks)
    for (const line of lines) {
      const typeMatch = line.match(/`([^`]+)`/);
      if (typeMatch) {
        return typeMatch[1];
      }
    }

    return 'unknown';
  }

  /**
   * Compare parameters
   */
  private parametersMatch(sourceParams: string[], docParams: string[]): boolean {
    if (sourceParams.length !== docParams.length) {
      return false;
    }

    for (let i = 0; i < sourceParams.length; i++) {
      // Extract just the parameter name for comparison
      const sourceName = sourceParams[i].split(':')[0].replace('?', '').trim();
      const docName = docParams[i].split(':')[0].replace('?', '').trim();

      if (sourceName !== docName) {
        return false;
      }
    }

    return true;
  }
}
