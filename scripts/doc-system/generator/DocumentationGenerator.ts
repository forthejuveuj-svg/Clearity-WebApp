/**
 * Documentation Generator - Creates and maintains Markdown documentation files
 */

import * as ts from 'typescript';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join, relative } from 'path';
import { existsSync } from 'fs';
import { DocumentationConfig } from '../config.js';
import { CodeEntity, FileAnalysis } from '../analyzer/types.js';
import {
  FunctionDocumentation,
  GroupDocumentation,
  Parameter,
  FunctionSummary,
  ManualContent,
} from './types.js';
import { TemplateRenderer } from '../templates/TemplateRenderer.js';

export class DocumentationGenerator {
  private config: DocumentationConfig;
  private templateRenderer: TemplateRenderer;
  private rootPath: string;

  constructor(config: DocumentationConfig, rootPath: string) {
    this.config = config;
    this.rootPath = rootPath;
    this.templateRenderer = new TemplateRenderer(config.templatesDir);
  }

  /**
   * Generate documentation for a function
   */
  async generateFunctionDoc(
    entity: CodeEntity,
    filePath: string,
    sourceFile: ts.SourceFile,
    group?: string,
    usedIn?: string[]
  ): Promise<string> {
    // Extract function information from AST
    const functionNode = this.findFunctionNode(sourceFile, entity.name);
    if (!functionNode) {
      throw new Error(`Function ${entity.name} not found in ${filePath}`);
    }

    // Extract parameters
    const parameters = this.extractParameters(functionNode);

    // Extract return type
    const returnType = this.extractReturnType(functionNode);

    // Calculate complexity
    const complexity = this.calculateComplexity(functionNode);

    // Create documentation object
    const doc: FunctionDocumentation = {
      functionName: entity.name,
      filePath: relative(this.rootPath, filePath),
      purpose: '',
      parameters,
      returnType,
      returnDescription: '',
      usedIn: usedIn || [],
      complexity,
      group: group || '',
    };

    // Check if documentation already exists
    const docPath = this.getDocPath(filePath, entity.name);
    if (existsSync(docPath) && this.config.preserveManual) {
      const manualContent = await this.extractManualContent(docPath);
      doc.purpose = manualContent.sections.get('Purpose') || '';
      doc.returnDescription =
        manualContent.sections.get('Output') || '';
    }

    // Render template
    const markdown = await this.templateRenderer.render('function', doc);

    // Write documentation file
    await this.writeDocFile(docPath, markdown);

    return docPath;
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
      // Function declaration
      if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
        result = node;
        return;
      }

      // Variable declaration with arrow function or function expression
      if (ts.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === functionName &&
            declaration.initializer
          ) {
            if (
              ts.isArrowFunction(declaration.initializer) ||
              ts.isFunctionExpression(declaration.initializer)
            ) {
              result = declaration.initializer;
              return;
            }
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
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
  ): Parameter[] {
    const parameters: Parameter[] = [];

    for (const param of node.parameters) {
      const name = param.name.getText();
      const optional = !!param.questionToken;
      const type = param.type ? param.type.getText() : 'any';

      parameters.push({
        name,
        type,
        optional,
        description: '',
      });
    }

    return parameters;
  }

  /**
   * Extract return type from function node
   */
  private extractReturnType(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
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
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression
  ): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node) => {
      // Decision points
      if (
        ts.isIfStatement(n) ||
        ts.isConditionalExpression(n) ||
        ts.isForStatement(n) ||
        ts.isForInStatement(n) ||
        ts.isForOfStatement(n) ||
        ts.isWhileStatement(n) ||
        ts.isDoStatement(n) ||
        ts.isCaseClause(n) ||
        ts.isCatchClause(n)
      ) {
        complexity++;
      }

      // Logical operators
      if (ts.isBinaryExpression(n)) {
        if (
          n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
      }

      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    return complexity;
  }

  /**
   * Get documentation file path for a source file
   */
  private getDocPath(filePath: string, functionName: string): string {
    const relativePath = relative(this.rootPath, filePath);
    const docRelativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    const docPath = join(
      this.config.outputDir,
      docRelativePath,
      `${functionName}.md`
    );
    return docPath;
  }

  /**
   * Write documentation file
   */
  private async writeDocFile(docPath: string, content: string): Promise<void> {
    // Ensure directory exists
    const dir = dirname(docPath);
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(docPath, content, 'utf-8');
  }

  /**
   * Extract manual content from existing documentation
   */
  async extractManualContent(docPath: string): Promise<ManualContent> {
    const sections = new Map<string, string>();

    try {
      const content = await readFile(docPath, 'utf-8');
      const lines = content.split('\n');

      let currentSection = '';
      let sectionContent: string[] = [];
      let inCodeBlock = false;

      for (const line of lines) {
        // Track code blocks to avoid treating headers inside them as sections
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
        }

        // Check if line is a section header (not in code block)
        if (!inCodeBlock && line.startsWith('## ')) {
          // Save previous section
          if (currentSection && sectionContent.length > 0) {
            const text = sectionContent.join('\n').trim();
            // Only save if it's manually written content
            if (this.isManualContent(text)) {
              sections.set(currentSection, text);
            }
          }

          // Start new section
          currentSection = line.substring(3).trim();
          sectionContent = [];
        } else if (currentSection) {
          sectionContent.push(line);
        }
      }

      // Save last section
      if (currentSection && sectionContent.length > 0) {
        const text = sectionContent.join('\n').trim();
        if (this.isManualContent(text)) {
          sections.set(currentSection, text);
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read
      console.warn(`Could not read existing documentation: ${docPath}`);
    }

    return { sections };
  }

  /**
   * Check if content is manually written (not auto-generated placeholder)
   */
  private isManualContent(text: string): boolean {
    // List of placeholder patterns
    const placeholders = [
      '[Describe',
      '_[',
      '_No parameters_',
      '_This function is not currently used in the codebase_',
      '_Ungrouped_',
      '_No functions in this group_',
      '[List the key technologies',
      '[List any external services',
      '[Purpose not documented]',
    ];

    // Check if text contains any placeholder
    for (const placeholder of placeholders) {
      if (text.includes(placeholder)) {
        return false;
      }
    }

    // Check if text is empty or only whitespace
    if (!text || text.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Merge manual content with generated content
   */
  mergeManualContent(generated: string, manual: ManualContent): string {
    let result = generated;

    // Replace sections with manual content
    for (const [section, content] of manual.sections) {
      // Escape special regex characters in section name
      const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match the section and its content until the next section or end
      const sectionRegex = new RegExp(
        `(## ${escapedSection}\\n)([\\s\\S]*?)(?=\\n## |$)`,
        'g'
      );
      
      // Replace with manual content, preserving the section header
      result = result.replace(sectionRegex, `$1\n${content}\n`);
    }

    return result;
  }

  /**
   * Update existing documentation with new auto-generated content while preserving manual edits
   */
  async updateExistingDoc(
    docPath: string,
    newDoc: FunctionDocumentation | GroupDocumentation
  ): Promise<void> {
    // Extract manual content from existing doc
    const manualContent = await this.extractManualContent(docPath);

    // Determine template type
    const isFunctionDoc = 'functionName' in newDoc;
    const templateName = isFunctionDoc ? 'function' : 'group';

    // Generate new content
    const generated = await this.templateRenderer.render(templateName, newDoc);

    // Merge manual content
    const merged = this.mergeManualContent(generated, manualContent);

    // Write updated documentation
    await this.writeDocFile(docPath, merged);
  }

  /**
   * Generate documentation for a logical group
   */
  async generateGroupDoc(
    groupName: string,
    functions: FunctionSummary[],
    description?: string,
    technologies?: string[],
    externalConnections?: string[]
  ): Promise<string> {
    // Calculate statistics
    const functionCount = functions.length;
    const complexities = functions
      .map((f) => f.complexity)
      .filter((c): c is number => c !== undefined);
    const averageComplexity =
      complexities.length > 0
        ? complexities.reduce((a, b) => a + b, 0) / complexities.length
        : undefined;

    // Create group documentation object
    const doc: GroupDocumentation = {
      groupName,
      description: description || '',
      technologies: technologies || [],
      externalConnections: externalConnections || [],
      functions,
      functionCount,
      averageComplexity: averageComplexity
        ? Math.round(averageComplexity * 10) / 10
        : undefined,
    };

    // Check if documentation already exists
    const docPath = this.getGroupDocPath(groupName);
    if (existsSync(docPath) && this.config.preserveManual) {
      const manualContent = await this.extractManualContent(docPath);
      doc.description = manualContent.sections.get('Overview') || '';
      
      // Extract technologies if manually written
      const techSection = manualContent.sections.get('Technologies');
      if (techSection) {
        doc.technologies = this.parseListSection(techSection);
      }
      
      // Extract external connections if manually written
      const connSection = manualContent.sections.get('External Connections');
      if (connSection) {
        doc.externalConnections = this.parseListSection(connSection);
      }
    }

    // Render template
    const markdown = await this.templateRenderer.render('group', doc);

    // Write documentation file
    await this.writeDocFile(docPath, markdown);

    return docPath;
  }

  /**
   * Parse a list section from markdown
   */
  private parseListSection(content: string): string[] {
    const items: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        items.push(trimmed.substring(2));
      }
    }

    return items;
  }

  /**
   * Get documentation file path for a group
   */
  private getGroupDocPath(groupName: string): string {
    const sanitizedName = groupName.toLowerCase().replace(/\s+/g, '-');
    return join(this.config.outputDir, 'groups', `${sanitizedName}.md`);
  }

  /**
   * Aggregate functions by group
   */
  async aggregateFunctionsByGroup(
    functionDocs: Map<string, FunctionDocumentation>
  ): Promise<Map<string, FunctionSummary[]>> {
    const groupMap = new Map<string, FunctionSummary[]>();

    for (const [, doc] of functionDocs) {
      const group = doc.group || 'Ungrouped';

      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }

      groupMap.get(group)!.push({
        name: doc.functionName,
        path: doc.filePath,
        purpose: doc.purpose,
        complexity: doc.complexity,
      });
    }

    return groupMap;
  }

  /**
   * Generate all group documentation
   */
  async generateAllGroupDocs(
    functionDocs: Map<string, FunctionDocumentation>
  ): Promise<string[]> {
    const groupMap = await this.aggregateFunctionsByGroup(functionDocs);
    const docPaths: string[] = [];

    for (const [groupName, functions] of groupMap) {
      const docPath = await this.generateGroupDoc(groupName, functions);
      docPaths.push(docPath);
    }

    return docPaths;
  }

  /**
   * Generate documentation index
   */
  async generateDocumentationIndex(
    functionDocs: Map<string, FunctionDocumentation>,
    groupDocs: Map<string, string>
  ): Promise<void> {
    const functions: import('./types.js').FunctionIndex[] = [];
    const groups: import('./types.js').GroupIndex[] = [];

    // Build function index
    for (const [filePath, doc] of functionDocs) {
      const docPath = this.getDocPath(filePath, doc.functionName);
      
      functions.push({
        name: doc.functionName,
        filePath: doc.filePath,
        docPath: relative(this.rootPath, docPath),
        group: doc.group || 'Ungrouped',
        exported: true, // TODO: Track this from analysis
        complexity: doc.complexity,
        dependencies: [], // TODO: Get from import graph
        usedBy: doc.usedIn,
      });
    }

    // Build group index
    const groupMap = await this.aggregateFunctionsByGroup(functionDocs);
    for (const [groupName, groupFunctions] of groupMap) {
      const docPath = this.getGroupDocPath(groupName);
      
      groups.push({
        name: groupName,
        docPath: relative(this.rootPath, docPath),
        functionCount: groupFunctions.length,
        functions: groupFunctions.map((f) => f.name),
      });
    }

    // Calculate statistics
    const totalFunctions = functions.length;
    const totalGroups = groups.length;
    const documentedFunctions = functions.filter((f) => {
      const docPath = join(this.rootPath, f.docPath);
      return existsSync(docPath);
    }).length;
    const documentationCoverage =
      totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 0;
    const averageComplexity =
      totalFunctions > 0
        ? functions.reduce((sum, f) => sum + f.complexity, 0) / totalFunctions
        : 0;

    // Create index object
    const index: import('./types.js').DocumentationIndex = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      functions,
      groups,
      statistics: {
        totalFunctions,
        totalGroups,
        documentedFunctions,
        documentationCoverage: Math.round(documentationCoverage * 10) / 10,
        averageComplexity: Math.round(averageComplexity * 10) / 10,
      },
    };

    // Write JSON index
    const jsonPath = join(this.config.outputDir, 'index.json');
    await this.writeDocFile(jsonPath, JSON.stringify(index, null, 2));

    // Write human-readable index
    const readablePath = join(this.config.outputDir, 'INDEX.md');
    const readableContent = this.generateReadableIndex(index);
    await this.writeDocFile(readablePath, readableContent);

    console.log(`Documentation index generated at ${jsonPath}`);
    console.log(`Human-readable index generated at ${readablePath}`);
  }

  /**
   * Update documentation with usage information from import graph
   */
  async updateDocumentationWithUsage(
    functionName: string,
    filePath: string,
    usedIn: string[]
  ): Promise<void> {
    const docPath = this.getDocPath(filePath, functionName);
    
    if (!existsSync(docPath)) {
      console.warn(`Documentation not found for ${functionName} at ${docPath}`);
      return;
    }

    try {
      // Read existing documentation
      const content = await readFile(docPath, 'utf-8');
      
      // Update the "Used In" section
      const updatedContent = this.updateUsedInSection(content, usedIn);
      
      // Write back
      await writeFile(docPath, updatedContent, 'utf-8');
    } catch (error) {
      console.error(`Failed to update documentation for ${functionName}:`, error);
    }
  }

  /**
   * Update the "Used In" section of documentation
   */
  private updateUsedInSection(content: string, usedIn: string[]): string {
    // Find the "Used In" section
    const usedInRegex = /## Used In\n([\s\S]*?)(?=\n## |$)/;
    
    let newUsedInContent: string;
    if (usedIn.length === 0) {
      newUsedInContent = '\n_This function is not currently used in the codebase._\n';
    } else {
      newUsedInContent = '\n' + usedIn.map(file => `- \`${file}\``).join('\n') + '\n';
    }
    
    // Replace the section
    if (usedInRegex.test(content)) {
      return content.replace(usedInRegex, `## Used In${newUsedInContent}`);
    } else {
      // Section doesn't exist, append it
      return content + `\n## Used In${newUsedInContent}`;
    }
  }

  /**
   * Batch update all documentation with usage information
   */
  async batchUpdateUsageInformation(
    usageMap: Map<string, { filePath: string; usedIn: string[] }>
  ): Promise<void> {
    console.log(`Updating usage information for ${usageMap.size} functions...`);
    
    let updated = 0;
    let failed = 0;
    
    for (const [functionName, info] of usageMap) {
      try {
        await this.updateDocumentationWithUsage(
          functionName,
          info.filePath,
          info.usedIn
        );
        updated++;
      } catch (error) {
        console.error(`Failed to update ${functionName}:`, error);
        failed++;
      }
    }
    
    console.log(`Updated ${updated} documentation files, ${failed} failed`);
  }

  /**
   * Mark unused functions in documentation
   */
  async markUnusedFunctions(unusedFunctions: string[]): Promise<void> {
    console.log(`Marking ${unusedFunctions.length} unused functions...`);
    
    for (const functionName of unusedFunctions) {
      // Find all documentation files that might contain this function
      // This is a simplified approach - in practice, you'd need the file path
      console.log(`Function ${functionName} is unused`);
    }
  }

  /**
   * Generate human-readable index
   */
  private generateReadableIndex(
    index: import('./types.js').DocumentationIndex
  ): string {
    const lines: string[] = [];

    lines.push('# Documentation Index');
    lines.push('');
    lines.push(`**Generated:** ${new Date(index.generatedAt).toLocaleString()}`);
    lines.push(`**Version:** ${index.version}`);
    lines.push('');

    // Statistics
    lines.push('## Statistics');
    lines.push('');
    lines.push(`- **Total Functions:** ${index.statistics.totalFunctions}`);
    lines.push(`- **Total Groups:** ${index.statistics.totalGroups}`);
    lines.push(
      `- **Documented Functions:** ${index.statistics.documentedFunctions}`
    );
    lines.push(
      `- **Documentation Coverage:** ${index.statistics.documentationCoverage}%`
    );
    lines.push(
      `- **Average Complexity:** ${index.statistics.averageComplexity}`
    );
    lines.push('');

    // Groups
    lines.push('## Groups');
    lines.push('');
    for (const group of index.groups) {
      lines.push(`### ${group.name}`);
      lines.push('');
      lines.push(`**Documentation:** [${group.docPath}](${group.docPath})`);
      lines.push(`**Function Count:** ${group.functionCount}`);
      lines.push('');
      lines.push('**Functions:**');
      for (const funcName of group.functions) {
        const func = index.functions.find((f) => f.name === funcName);
        if (func) {
          lines.push(
            `- [${funcName}](${func.docPath}) (Complexity: ${func.complexity})`
          );
        }
      }
      lines.push('');
    }

    // All Functions
    lines.push('## All Functions');
    lines.push('');
    lines.push('| Function | File | Group | Complexity | Documentation |');
    lines.push('|----------|------|-------|------------|---------------|');
    for (const func of index.functions) {
      lines.push(
        `| ${func.name} | \`${func.filePath}\` | ${func.group} | ${func.complexity} | [📄](${func.docPath}) |`
      );
    }
    lines.push('');

    return lines.join('\n');
  }
}
