/**
 * Validation Engine - Ensures documentation completeness and accuracy
 */

import * as ts from 'typescript';
import { readFile, access } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import { existsSync } from 'fs';
import { glob } from 'glob';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  ValidationContext,
  ValidationSummary,
  DocumentationDrift,
} from './types.js';
import { DriftDetector } from '../drift/DriftDetector.js';

export class ValidationEngine {
  private rootPath: string;
  private docsPath: string;
  private rules: ValidationRule[];
  private driftDetector: DriftDetector;

  constructor(rootPath: string, docsPath: string) {
    this.rootPath = rootPath;
    this.docsPath = docsPath;
    this.rules = this.initializeRules();
    this.driftDetector = new DriftDetector(rootPath, docsPath);
  }

  /**
   * Initialize validation rules
   */
  private initializeRules(): ValidationRule[] {
    return [
      {
        name: 'missing-documentation',
        description: 'Check for exported functions without documentation',
        check: this.checkMissingDocumentation.bind(this),
        severity: 'error',
        enabled: true,
      },
      {
        name: 'outdated-signature',
        description: 'Check for function signatures that do not match documentation',
        check: this.checkOutdatedSignature.bind(this),
        severity: 'error',
        enabled: true,
      },
      {
        name: 'empty-purpose',
        description: 'Check for empty or placeholder purpose sections',
        check: this.checkEmptyPurpose.bind(this),
        severity: 'warning',
        enabled: true,
      },
      {
        name: 'broken-references',
        description: 'Check for broken "Used In" references',
        check: this.checkBrokenReferences.bind(this),
        severity: 'warning',
        enabled: true,
      },
    ];
  }

  /**
   * Validate entire project
   */
  async validateProject(): Promise<ValidationResult> {
    console.log('Starting project validation...');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Find all TypeScript/JavaScript files
    const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.rootPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.*', '**/*.spec.*'],
      absolute: true,
    });

    console.log(`Found ${sourceFiles.length} source files to validate`);

    // Validate each file
    for (const filePath of sourceFiles) {
      const fileErrors = await this.validateFile(filePath);
      errors.push(...fileErrors);
    }

    // Run drift detection
    console.log('\nRunning drift detection...');
    const driftReport = await this.driftDetector.detectDrift();
    
    // Convert drift items to validation errors
    for (const drift of driftReport.drifts) {
      const severity = drift.severity === 'critical' ? 'error' : 'warning';
      errors.push({
        type: drift.driftType === 'signature' ? 'outdated_doc' : 
              drift.driftType === 'missing' ? 'missing_doc' : 'invalid_format',
        filePath: drift.filePath || drift.docPath,
        message: `${drift.details} - ${drift.suggestedAction}`,
        severity,
      });
    }

    // Separate errors and warnings
    const actualErrors = errors.filter((e) => e.severity === 'error');
    const actualWarnings = errors.filter((e) => e.severity === 'warning');

    // Create summary
    const filesWithErrors = new Set(actualErrors.map((e) => e.filePath)).size;
    const filesWithWarnings = new Set(actualWarnings.map((e) => e.filePath)).size;

    const summary: ValidationSummary = {
      totalFiles: sourceFiles.length,
      validFiles: sourceFiles.length - filesWithErrors - filesWithWarnings,
      filesWithErrors,
      filesWithWarnings,
      errorCount: actualErrors.length,
      warningCount: actualWarnings.length,
    };

    const result: ValidationResult = {
      valid: actualErrors.length === 0,
      errors: actualErrors,
      warnings: actualWarnings,
      summary,
    };

    this.printValidationSummary(result);

    return result;
  }

  /**
   * Validate a single file
   */
  async validateFile(filePath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Read source file
      const sourceContent = await readFile(filePath, 'utf-8');

      // Parse TypeScript
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract exported functions
      const exportedFunctions = this.extractExportedFunctions(sourceFile);

      // Validate each exported function
      for (const funcName of exportedFunctions) {
        // Find function node
        const functionNode = this.findFunctionNode(sourceFile, funcName);
        if (!functionNode) continue;

        const docPath = this.getDocPath(filePath, funcName);

        let docContent: string | undefined = undefined;
        if (existsSync(docPath)) {
          docContent = await readFile(docPath, 'utf-8');
        }

        const context: ValidationContext = {
          filePath,
          docPath,
          sourceContent,
          docContent,
          rootPath: this.rootPath,
        };

        // Run all enabled rules
        for (const rule of this.rules) {
          if (rule.enabled) {
            const ruleErrors = await rule.check(context);
            errors.push(...ruleErrors);
          }
        }
      }
    } catch (error) {
      console.error(`Error validating file ${filePath}:`, error);
    }

    return errors;
  }

  /**
   * Rule: Check for missing documentation
   */
  private async checkMissingDocumentation(
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Extract function name from context
    const functionName = context.docPath
      ? basename(context.docPath, '.md')
      : null;

    if (!functionName) {
      return errors;
    }

    // Check if documentation exists
    if (!context.docContent) {
      errors.push({
        type: 'missing_doc',
        filePath: context.filePath,
        message: `Missing documentation for exported function '${functionName}'. Run 'npm run doc-system document' to generate documentation.`,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Rule: Check for outdated function signatures
   */
  private async checkOutdatedSignature(
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!context.docContent) {
      return errors;
    }

    const functionName = context.docPath
      ? basename(context.docPath, '.md')
      : null;

    if (!functionName) {
      return errors;
    }

    // Find function in source
    const sourceFile = ts.createSourceFile(
      context.filePath,
      context.sourceContent!,
      ts.ScriptTarget.Latest,
      true
    );

    const functionNode = this.findFunctionNode(sourceFile, functionName);
    if (!functionNode) {
      return errors;
    }

    // Extract parameters from source
    const sourceParams = this.extractParametersFromNode(functionNode);

    // Extract parameters from documentation
    const docParams = this.extractParametersFromDoc(context.docContent);

    // Compare parameters
    if (!this.parametersMatch(sourceParams, docParams)) {
      errors.push({
        type: 'outdated_doc',
        filePath: context.filePath,
        message: `Function signature for '${functionName}' does not match documentation. Expected parameters: ${sourceParams.join(', ')}, but documentation shows: ${docParams.join(', ')}`,
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Rule: Check for empty purpose sections
   */
  private async checkEmptyPurpose(
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!context.docContent) {
      return errors;
    }

    // Check if Purpose section is empty or contains placeholder text
    const purposeMatch = context.docContent.match(/### Purpose\s*\n\s*([^\n#]+)/);
    if (!purposeMatch || purposeMatch[1].trim() === '' || 
        purposeMatch[1].includes('TODO') || 
        purposeMatch[1].includes('placeholder')) {
      const functionName = context.docPath
        ? basename(context.docPath, '.md')
        : 'unknown';

      errors.push({
        type: 'empty_purpose',
        filePath: context.filePath,
        message: `Documentation for '${functionName}' has an empty or placeholder Purpose section`,
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Rule: Check for broken "Used In" references
   */
  private async checkBrokenReferences(
    context: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!context.docContent) {
      return errors;
    }

    // Extract "Used In" references
    const usedInMatch = context.docContent.match(/### Used In\s*\n([\s\S]*?)(?=\n###|$)/);
    if (!usedInMatch) {
      return errors;
    }

    const usedInSection = usedInMatch[1];
    const fileReferences = usedInSection.match(/- `([^`]+)`/g);

    if (!fileReferences) {
      return errors;
    }

    const functionName = context.docPath
      ? basename(context.docPath, '.md')
      : 'unknown';

    // Check each reference
    for (const ref of fileReferences) {
      const filePath = ref.match(/`([^`]+)`/)?.[1];
      if (!filePath) continue;

      const absolutePath = join(this.rootPath, filePath);
      if (!existsSync(absolutePath)) {
        errors.push({
          type: 'broken_reference',
          filePath: context.filePath,
          message: `Documentation for '${functionName}' references non-existent file: ${filePath}`,
          severity: 'warning',
        });
      }
    }

    return errors;
  }

  /**
   * Detect documentation drift
   */
  async detectDocumentationDrift(
    filePath: string,
    docPath: string
  ): Promise<DocumentationDrift[]> {
    const drifts: DocumentationDrift[] = [];

    try {
      // Check if both files exist
      if (!existsSync(filePath)) {
        drifts.push({
          filePath,
          docPath,
          driftType: 'orphaned',
          details: 'Documentation exists but source file is missing',
        });
        return drifts;
      }

      if (!existsSync(docPath)) {
        drifts.push({
          filePath,
          docPath,
          driftType: 'missing',
          details: 'Source file exists but documentation is missing',
        });
        return drifts;
      }

      // Read both files
      const sourceContent = await readFile(filePath, 'utf-8');
      const docContent = await readFile(docPath, 'utf-8');

      const functionName = basename(docPath, '.md');

      // Parse source
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.Latest,
        true
      );

      const functionNode = this.findFunctionNode(sourceFile, functionName);
      if (!functionNode) {
        drifts.push({
          filePath,
          docPath,
          driftType: 'outdated',
          details: `Function '${functionName}' not found in source file`,
        });
        return drifts;
      }

      // Compare signatures
      const sourceParams = this.extractParametersFromNode(functionNode);
      const docParams = this.extractParametersFromDoc(docContent);

      if (!this.parametersMatch(sourceParams, docParams)) {
        drifts.push({
          filePath,
          docPath,
          driftType: 'signature',
          details: `Function signature has changed. Source: ${sourceParams.join(', ')}, Doc: ${docParams.join(', ')}`,
        });
      }
    } catch (error) {
      console.error(`Error detecting drift for ${filePath}:`, error);
    }

    return drifts;
  }

  /**
   * Get documentation path for a function
   */
  private getDocPath(filePath: string, functionName: string): string {
    const relativePath = relative(this.rootPath, filePath);
    const docRelativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    return join(this.docsPath, docRelativePath, `${functionName}.md`);
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

      // Export assignment
      if (ts.isExportAssignment(node)) {
        if (ts.isIdentifier(node.expression)) {
          functions.push(node.expression.text);
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
        const paramName = paramMatch[1];
        params.push(paramName);
      }
    }

    return params;
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

  /**
   * Validate only changed files (for pre-commit hook)
   */
  async validateChangedFiles(changedFiles: string[]): Promise<ValidationResult> {
    console.log(`Validating ${changedFiles.length} changed files...`);

    const errors: ValidationError[] = [];

    // Filter to only TypeScript/JavaScript files
    const sourceFiles = changedFiles.filter((file) =>
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !file.includes('node_modules') &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    );

    console.log(`Found ${sourceFiles.length} source files to validate`);

    // Validate each file
    for (const filePath of sourceFiles) {
      const absolutePath = join(this.rootPath, filePath);
      if (existsSync(absolutePath)) {
        const fileErrors = await this.validateFile(absolutePath);
        errors.push(...fileErrors);
      }
    }

    // Separate errors and warnings
    const actualErrors = errors.filter((e) => e.severity === 'error');
    const actualWarnings = errors.filter((e) => e.severity === 'warning');

    // Create summary
    const filesWithErrors = new Set(actualErrors.map((e) => e.filePath)).size;
    const filesWithWarnings = new Set(actualWarnings.map((e) => e.filePath)).size;

    const summary: ValidationSummary = {
      totalFiles: sourceFiles.length,
      validFiles: sourceFiles.length - filesWithErrors - filesWithWarnings,
      filesWithErrors,
      filesWithWarnings,
      errorCount: actualErrors.length,
      warningCount: actualWarnings.length,
    };

    const result: ValidationResult = {
      valid: actualErrors.length === 0,
      errors: actualErrors,
      warnings: actualWarnings,
      summary,
    };

    return result;
  }

  /**
   * Install pre-commit hook
   */
  async installPreCommitHook(): Promise<void> {
    const { writeFile, mkdir, chmod } = await import('fs/promises');
    const { existsSync } = await import('fs');

    console.log('Installing pre-commit hook...');

    // Create .git/hooks directory if it doesn't exist
    const hooksDir = join(this.rootPath, '.git', 'hooks');
    if (!existsSync(hooksDir)) {
      await mkdir(hooksDir, { recursive: true });
    }

    // Create pre-commit hook script
    const hookPath = join(hooksDir, 'pre-commit');
    const hookScript = this.generatePreCommitScript();

    await writeFile(hookPath, hookScript, 'utf-8');

    // Make the hook executable (Unix-like systems)
    if (process.platform !== 'win32') {
      await chmod(hookPath, 0o755);
    }

    console.log(`✅ Pre-commit hook installed at: ${hookPath}`);
    console.log('The hook will validate documentation before each commit.');
  }

  /**
   * Generate pre-commit hook script
   */
  private generatePreCommitScript(): string {
    return `#!/bin/sh
#
# Pre-commit hook for documentation validation
# Generated by doc-system
#

echo "🔍 Validating documentation..."

# Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ No files to validate"
  exit 0
fi

# Create temporary file with changed files list
TEMP_FILE=$(mktemp)
echo "$CHANGED_FILES" > "$TEMP_FILE"

# Run validation on changed files
node -e "
const { ValidationEngine } = require('./scripts/doc-system/validation/ValidationEngine.js');
const { readFileSync } = require('fs');

async function validate() {
  try {
    const changedFiles = readFileSync('$TEMP_FILE', 'utf-8')
      .split('\\n')
      .filter(f => f.trim() !== '');
    
    const validator = new ValidationEngine(process.cwd(), './docs');
    const result = await validator.validateChangedFiles(changedFiles);
    
    if (!result.valid) {
      console.log('\\n❌ Documentation validation failed!');
      console.log('\\nPlease fix the following issues before committing:\\n');
      
      for (const error of result.errors) {
        console.log(\`  [\${error.type}] \${error.filePath}\`);
        console.log(\`    \${error.message}\\n\`);
      }
      
      console.log('To generate missing documentation, run:');
      console.log('  npm run doc-system document\\n');
      
      process.exit(1);
    }
    
    if (result.warnings.length > 0) {
      console.log('\\n⚠️  Documentation warnings (commit allowed):\\n');
      for (const warning of result.warnings) {
        console.log(\`  [\${warning.type}] \${warning.filePath}\`);
        console.log(\`    \${warning.message}\\n\`);
      }
    }
    
    console.log('✅ Documentation validation passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  }
}

validate();
"

VALIDATION_EXIT_CODE=$?

# Clean up temporary file
rm -f "$TEMP_FILE"

# Exit with validation result
exit $VALIDATION_EXIT_CODE
`;
  }

  /**
   * Uninstall pre-commit hook
   */
  async uninstallPreCommitHook(): Promise<void> {
    const { unlink } = await import('fs/promises');
    const { existsSync } = await import('fs');

    const hookPath = join(this.rootPath, '.git', 'hooks', 'pre-commit');

    if (existsSync(hookPath)) {
      await unlink(hookPath);
      console.log('✅ Pre-commit hook uninstalled');
    } else {
      console.log('⚠️  No pre-commit hook found');
    }
  }

  /**
   * Generate GitHub Actions workflow
   */
  async generateGitHubActionsWorkflow(outputPath?: string): Promise<string> {
    const workflow = `name: Documentation Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Validate documentation
      run: npm run doc-system validate
      
    - name: Generate documentation coverage report
      if: always()
      run: |
        echo "## Documentation Coverage Report" >> $GITHUB_STEP_SUMMARY
        npm run doc-system validate --json > validation-result.json || true
        node -e "
          const fs = require('fs');
          try {
            const result = JSON.parse(fs.readFileSync('validation-result.json', 'utf-8'));
            const coverage = ((result.summary.validFiles / result.summary.totalFiles) * 100).toFixed(2);
            console.log(\\\`Coverage: \\\${coverage}%\\\`);
            console.log(\\\`Valid Files: \\\${result.summary.validFiles}/\\\${result.summary.totalFiles}\\\`);
            console.log(\\\`Errors: \\\${result.summary.errorCount}\\\`);
            console.log(\\\`Warnings: \\\${result.summary.warningCount}\\\`);
          } catch (e) {
            console.log('Failed to parse validation results');
          }
        " >> $GITHUB_STEP_SUMMARY
        
    - name: Upload validation results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: validation-results
        path: validation-result.json
        retention-days: 30
`;

    if (outputPath) {
      const { writeFile, mkdir } = await import('fs/promises');
      const { dirname } = await import('path');
      
      // Create directory if it doesn't exist
      await mkdir(dirname(outputPath), { recursive: true });
      
      // Write workflow file
      await writeFile(outputPath, workflow, 'utf-8');
      console.log(`✅ GitHub Actions workflow created at: ${outputPath}`);
    }

    return workflow;
  }

  /**
   * Generate GitLab CI configuration
   */
  async generateGitLabCIConfig(outputPath?: string): Promise<string> {
    const config = `# Documentation Validation Pipeline

stages:
  - validate

validate-documentation:
  stage: validate
  image: node:18
  
  before_script:
    - npm ci
    
  script:
    - npm run doc-system validate
    - npm run doc-system validate --json > validation-result.json || true
    
  after_script:
    - |
      if [ -f validation-result.json ]; then
        node -e "
          const fs = require('fs');
          try {
            const result = JSON.parse(fs.readFileSync('validation-result.json', 'utf-8'));
            const coverage = ((result.summary.validFiles / result.summary.totalFiles) * 100).toFixed(2);
            console.log('Documentation Coverage: ' + coverage + '%');
            console.log('Valid Files: ' + result.summary.validFiles + '/' + result.summary.totalFiles);
            console.log('Errors: ' + result.summary.errorCount);
            console.log('Warnings: ' + result.summary.warningCount);
          } catch (e) {
            console.log('Failed to parse validation results');
          }
        "
      fi
    
  artifacts:
    when: always
    paths:
      - validation-result.json
    expire_in: 30 days
    
  only:
    - main
    - develop
    - merge_requests
`;

    if (outputPath) {
      const { writeFile } = await import('fs/promises');
      await writeFile(outputPath, config, 'utf-8');
      console.log(`✅ GitLab CI configuration created at: ${outputPath}`);
    }

    return config;
  }

  /**
   * Generate CircleCI configuration
   */
  async generateCircleCIConfig(outputPath?: string): Promise<string> {
    const config = `version: 2.1

orbs:
  node: circleci/node@5.0

jobs:
  validate-documentation:
    docker:
      - image: cimg/node:18.0
    
    steps:
      - checkout
      
      - node/install-packages:
          pkg-manager: npm
          
      - run:
          name: Validate Documentation
          command: npm run doc-system validate
          
      - run:
          name: Generate Coverage Report
          command: |
            npm run doc-system validate --json > validation-result.json || true
            node -e "
              const fs = require('fs');
              try {
                const result = JSON.parse(fs.readFileSync('validation-result.json', 'utf-8'));
                const coverage = ((result.summary.validFiles / result.summary.totalFiles) * 100).toFixed(2);
                console.log('Documentation Coverage: ' + coverage + '%');
                console.log('Valid Files: ' + result.summary.validFiles + '/' + result.summary.totalFiles);
                console.log('Errors: ' + result.summary.errorCount);
                console.log('Warnings: ' + result.summary.warningCount);
              } catch (e) {
                console.log('Failed to parse validation results');
              }
            "
          when: always
          
      - store_artifacts:
          path: validation-result.json
          destination: validation-results

workflows:
  version: 2
  validate:
    jobs:
      - validate-documentation:
          filters:
            branches:
              only:
                - main
                - develop
`;

    if (outputPath) {
      const { writeFile, mkdir } = await import('fs/promises');
      const { dirname } = await import('path');
      
      // Create directory if it doesn't exist
      await mkdir(dirname(outputPath), { recursive: true });
      
      // Write config file
      await writeFile(outputPath, config, 'utf-8');
      console.log(`✅ CircleCI configuration created at: ${outputPath}`);
    }

    return config;
  }

  /**
   * Generate CI configuration for specified platform
   */
  async generateCIConfig(
    platform: 'github' | 'gitlab' | 'circleci',
    outputPath?: string
  ): Promise<string> {
    switch (platform) {
      case 'github':
        return this.generateGitHubActionsWorkflow(
          outputPath || join(this.rootPath, '.github', 'workflows', 'validate-docs.yml')
        );
      case 'gitlab':
        return this.generateGitLabCIConfig(
          outputPath || join(this.rootPath, '.gitlab-ci.yml')
        );
      case 'circleci':
        return this.generateCircleCIConfig(
          outputPath || join(this.rootPath, '.circleci', 'config.yml')
        );
      default:
        throw new Error(`Unknown CI platform: ${platform}`);
    }
  }

  /**
   * Print validation summary
   */
  private printValidationSummary(result: ValidationResult): void {
    console.log('\n=== Validation Summary ===');
    console.log(`Total Files: ${result.summary.totalFiles}`);
    console.log(`Valid Files: ${result.summary.validFiles}`);
    console.log(`Files with Errors: ${result.summary.filesWithErrors}`);
    console.log(`Files with Warnings: ${result.summary.filesWithWarnings}`);
    console.log(`Total Errors: ${result.summary.errorCount}`);
    console.log(`Total Warnings: ${result.summary.warningCount}`);
    console.log(`\nValidation ${result.valid ? 'PASSED' : 'FAILED'}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      for (const error of result.errors) {
        console.log(`[${error.type}] ${error.filePath}`);
        console.log(`  ${error.message}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\n=== Warnings ===');
      for (const warning of result.warnings) {
        console.log(`[${warning.type}] ${warning.filePath}`);
        console.log(`  ${warning.message}`);
      }
    }
  }
}
