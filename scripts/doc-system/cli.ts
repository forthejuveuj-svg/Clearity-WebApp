#!/usr/bin/env node

/**
 * CLI Entry Point for the Automated Documentation System
 * 
 * This tool provides commands for analyzing, reorganizing, documenting,
 * and validating TypeScript/JavaScript codebases.
 */

import { Command } from 'commander';
import { loadConfig, DocSystemConfig } from './config.js';
import * as path from 'path';

const program = new Command();

program
  .name('doc-system')
  .description('Automated Documentation and Refactoring System')
  .version('1.0.0');

/**
 * Analyze command - Run code analysis to detect issues
 */
program
  .command('analyze')
  .description('Analyze codebase to detect unused code, mixed logic, and structural issues')
  .option('-p, --path <path>', 'Path to analyze', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-o, --output <output>', 'Output file for analysis report')
  .option('--json', 'Output in JSON format', false)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      
      console.log('🔍 Analyzing codebase...');
      console.log(`Target: ${targetPath}`);
      console.log(`Configuration loaded from: ${options.config || 'defaults'}`);
      console.log('');
      
      // Import CodeAnalyzer
      const { CodeAnalyzer } = await import('./analyzer/index.js');
      
      // Create analyzer and run analysis
      const analyzer = new CodeAnalyzer(config.analyzer);
      const result = await analyzer.analyzeProject(targetPath);
      
      // Generate report
      const report = options.json 
        ? analyzer.generateJSONReport(result)
        : analyzer.generateReport(result);
      
      // Output report
      if (options.output) {
        const { writeFile } = await import('fs/promises');
        await writeFile(options.output, report, 'utf-8');
        console.log(`\n📄 Report saved to: ${options.output}`);
      } else {
        console.log('\n' + report);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

/**
 * Reorganize command - Restructure files based on analysis
 */
program
  .command('reorganize')
  .description('Reorganize files into logical groups based on analysis results')
  .option('-p, --path <path>', 'Path to reorganize', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('--dry-run', 'Preview changes without applying them', true)
  .option('--no-backup', 'Skip backup creation')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      
      console.log('📁 Reorganizing codebase...');
      console.log(`Target: ${targetPath}`);
      console.log(`Dry run: ${options.dryRun}`);
      console.log(`Create backup: ${options.backup}`);
      console.log('');
      
      // Import modules
      const { CodeAnalyzer } = await import('./analyzer/index.js');
      const { FileReorganizer } = await import('./reorganizer/index.js');
      
      // First analyze to get reorganization plan
      console.log('🔍 Analyzing codebase...');
      const analyzer = new CodeAnalyzer(config.analyzer);
      const analysis = await analyzer.analyzeProject(targetPath);
      
      // Create reorganization plan
      console.log('📋 Creating reorganization plan...');
      const reorganizerConfig = {
        ...config.reorganizer,
        dryRun: options.dryRun,
        createBackup: options.backup !== false,
      };
      const reorganizer = new FileReorganizer(reorganizerConfig, targetPath);
      const plan = await reorganizer.createReorganizationPlan(analysis);
      
      // Execute plan
      console.log('🚀 Executing reorganization...');
      await reorganizer.executeReorganizationPlan(plan, options.dryRun);
      
      console.log('');
      console.log('✅ Reorganization complete!');
      
    } catch (error) {
      console.error('❌ Reorganization failed:', error);
      process.exit(1);
    }
  });

/**
 * Document command - Generate documentation for functions and groups
 */
program
  .command('document')
  .description('Generate Markdown documentation for all functions and components')
  .option('-p, --path <path>', 'Path to document', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-o, --output <output>', 'Output directory for documentation', './docs')
  .option('--incremental', 'Only update changed files', false)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      const outputPath = path.resolve(process.cwd(), options.output);
      
      console.log('📝 Generating documentation...');
      console.log(`Source: ${targetPath}`);
      console.log(`Output: ${outputPath}`);
      console.log(`Incremental: ${options.incremental}`);
      console.log('');
      
      // Import modules
      const { DocumentationGenerator } = await import('./generator/index.js');
      const { ImportGraphBuilder } = await import('./graph/index.js');
      
      // Build import graph for usage information
      console.log('🕸️  Building import graph...');
      const graphBuilder = new ImportGraphBuilder(targetPath);
      const graph = await graphBuilder.buildGraph();
      
      // Generate documentation
      console.log('📄 Generating documentation files...');
      const docConfig = {
        ...config.documentation,
        outputDir: outputPath,
      };
      const generator = new DocumentationGenerator(docConfig, targetPath);
      
      // TODO: Implement batch documentation generation
      // For now, we'll just generate the index as a placeholder
      console.log('⚠️  Batch documentation generation not yet fully implemented');
      console.log('    Individual function documentation can be generated via the API');
      
      // Generate index
      console.log('📑 Generating documentation index...');
      const functionDocs = new Map(); // Placeholder
      const groupDocs = new Map(); // Placeholder
      await generator.generateDocumentationIndex(functionDocs, groupDocs);
      
      console.log('');
      console.log(`✅ Documentation complete!`);
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      process.exit(1);
    }
  });

/**
 * Validate command - Check documentation completeness
 */
program
  .command('validate')
  .description('Validate documentation completeness and accuracy')
  .option('-p, --path <path>', 'Path to validate', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-d, --docs <docs>', 'Path to documentation', './docs')
  .option('--strict', 'Fail on warnings', false)
  .option('--json', 'Output results in JSON format', false)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      const docsPath = path.resolve(process.cwd(), options.docs);
      
      if (!options.json) {
        console.log('✅ Validating documentation...');
        console.log(`Source: ${targetPath}`);
        console.log(`Docs: ${docsPath}`);
        console.log(`Strict mode: ${options.strict}`);
        console.log('');
      }
      
      // Import ValidationEngine
      const { ValidationEngine } = await import('./validation/index.js');
      
      // Create validator and run validation
      const validator = new ValidationEngine(targetPath, docsPath);
      const result = await validator.validateProject();
      
      // Output in JSON format if requested
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      }
      
      // Exit with error code if validation failed
      if (!result.valid) {
        process.exit(1);
      }
      
      // In strict mode, also fail on warnings
      if (options.strict && result.warnings.length > 0) {
        if (!options.json) {
          console.log('\n⚠️  Strict mode: Failing due to warnings');
        }
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

/**
 * Graph command - Visualize import graph
 */
program
  .command('graph')
  .description('Build and visualize import dependency graph')
  .option('-p, --path <path>', 'Path to analyze', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-f, --format <format>', 'Output format (mermaid, json, graphml)', 'mermaid')
  .option('-o, --output <output>', 'Output file for graph')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      
      console.log('🕸️  Building import graph...');
      console.log(`Target: ${targetPath}`);
      console.log(`Format: ${options.format}`);
      console.log('');
      
      // Import graph builder
      const { ImportGraphBuilder } = await import('./graph/index.js');
      
      // Build graph
      console.log('📊 Analyzing imports and exports...');
      const graphBuilder = new ImportGraphBuilder(targetPath);
      const graph = await graphBuilder.buildGraph();
      
      // Detect circular dependencies
      console.log('🔄 Detecting circular dependencies...');
      const circularDeps = graphBuilder.detectCircularDependencies();
      
      if (circularDeps.length > 0) {
        console.log(`⚠️  Found ${circularDeps.length} circular dependencies`);
      }
      
      // Export in requested format
      let output: string;
      switch (options.format) {
        case 'mermaid':
          output = graphBuilder.exportToMermaid();
          break;
        case 'json':
          output = graphBuilder.exportToJSON();
          break;
        case 'graphml':
          console.log('⚠️  GraphML export not yet implemented');
          output = graphBuilder.exportToJSON(); // Fallback to JSON
          break;
        default:
          throw new Error(`Unknown format: ${options.format}`);
      }
      
      // Save or display output
      if (options.output) {
        const { writeFile } = await import('fs/promises');
        await writeFile(options.output, output, 'utf-8');
        console.log(`\n📄 Graph saved to: ${options.output}`);
      } else {
        console.log('\n' + output);
      }
      
      console.log('');
      console.log(`✅ Graph complete! ${graph.nodes.size} nodes, ${graph.edges.length} edges`);
      
    } catch (error) {
      console.error('❌ Graph generation failed:', error);
      process.exit(1);
    }
  });

/**
 * Generate-all command - Run full workflow
 */
program
  .command('generate-all')
  .description('Run complete workflow: analyze → reorganize → document → validate')
  .option('-p, --path <path>', 'Path to process', './src')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-o, --output <output>', 'Output directory for documentation', './docs')
  .option('--skip-reorganize', 'Skip reorganization step', false)
  .option('--incremental', 'Only process changed files', false)
  .action(async (options) => {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      const config = await loadConfig(options.config);
      const targetPath = path.resolve(process.cwd(), options.path);
      const outputPath = path.resolve(process.cwd(), options.output);
      
      console.log('🚀 Running complete documentation workflow...');
      console.log(`Target: ${targetPath}`);
      console.log(`Output: ${outputPath}`);
      console.log(`Incremental: ${options.incremental}`);
      console.log('');
      
      // Import all modules
      const { CodeAnalyzer } = await import('./analyzer/index.js');
      const { FileReorganizer } = await import('./reorganizer/index.js');
      const { DocumentationGenerator } = await import('./generator/index.js');
      const { ImportGraphBuilder } = await import('./graph/index.js');
      
      // Step 1: Analysis
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 1/4: 🔍 Analyzing codebase...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      let analysis;
      try {
        const analyzer = new CodeAnalyzer(config.analyzer);
        analysis = await analyzer.analyzeProject(targetPath);
        
        console.log(`✓ Found ${analysis.unusedImports.length} unused imports`);
        console.log(`✓ Found ${analysis.unusedFunctions.length} unused functions`);
        console.log(`✓ Found ${analysis.mixedLogicFiles.length} files with mixed logic`);
        console.log('');
      } catch (error) {
        const errorMsg = `Analysis failed: ${error}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
        console.log('⚠️  Continuing with remaining steps...\n');
      }
      
      // Step 2: Reorganization (optional)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (!options.skipReorganize && analysis) {
        console.log('Step 2/4: 📁 Reorganizing files...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
          const reorganizerConfig = {
            ...config.reorganizer,
            dryRun: false,
            createBackup: true,
          };
          const reorganizer = new FileReorganizer(reorganizerConfig, targetPath);
          const plan = await reorganizer.createReorganizationPlan(analysis);
          await reorganizer.executeReorganizationPlan(plan, false);
          
          console.log(`✓ Moved ${plan.moves.length} files`);
          console.log(`✓ Split ${plan.splits.length} files`);
          console.log('');
        } catch (error) {
          const errorMsg = `Reorganization failed: ${error}`;
          errors.push(errorMsg);
          console.error(`✗ ${errorMsg}`);
          console.log('⚠️  Continuing with remaining steps...\n');
        }
      } else {
        console.log('Step 2/4: ⏭️  Skipped (--skip-reorganize or analysis failed)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
      }
      
      // Step 3: Documentation Generation
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 3/4: 📝 Generating documentation...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      try {
        // Build import graph
        console.log('  → Building import graph...');
        const graphBuilder = new ImportGraphBuilder(targetPath);
        const graph = await graphBuilder.buildGraph();
        console.log(`    ✓ Analyzed ${graph.nodes.size} files`);
        
        // Generate documentation
        console.log('  → Generating documentation files...');
        const docConfig = {
          ...config.documentation,
          outputDir: outputPath,
        };
        const generator = new DocumentationGenerator(docConfig, targetPath);
        
        // TODO: Implement batch documentation generation
        console.log('    ⚠️  Batch generation not yet fully implemented');
        
        // Generate index
        console.log('  → Creating documentation index...');
        const functionDocs = new Map(); // Placeholder
        const groupDocs = new Map(); // Placeholder
        await generator.generateDocumentationIndex(functionDocs, groupDocs);
        
        console.log(`✓ Documentation structure created`);
        console.log('');
      } catch (error) {
        const errorMsg = `Documentation generation failed: ${error}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
        console.log('⚠️  Continuing with remaining steps...\n');
      }
      
      // Step 4: Validation
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 4/4: ✅ Validating documentation...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      try {
        const { ValidationEngine } = await import('./validation/index.js');
        const validator = new ValidationEngine(targetPath, outputPath);
        const validationResult = await validator.validateProject();
        
        if (validationResult.valid) {
          console.log('✓ All documentation is valid');
        } else {
          console.log(`⚠️  Found ${validationResult.errors.length} validation errors`);
          errors.push(`Validation found ${validationResult.errors.length} errors`);
        }
        console.log('');
      } catch (error) {
        const errorMsg = `Validation failed: ${error}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
        console.log('');
      }
      
      // Summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Workflow Summary');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Duration: ${duration}s`);
      console.log(`Errors: ${errors.length}`);
      
      if (errors.length > 0) {
        console.log('\n⚠️  Workflow completed with errors:');
        errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`);
        });
        process.exit(1);
      } else {
        console.log('\n✨ Workflow completed successfully!');
      }
      
    } catch (error) {
      console.error('❌ Workflow failed:', error);
      process.exit(1);
    }
  });

/**
 * Install command - Install pre-commit hooks
 */
program
  .command('install')
  .description('Install pre-commit hooks for documentation validation')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-p, --path <path>', 'Project root path', '.')
  .option('-d, --docs <docs>', 'Path to documentation', './docs')
  .option('--uninstall', 'Uninstall pre-commit hook', false)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const rootPath = path.resolve(process.cwd(), options.path);
      const docsPath = path.resolve(process.cwd(), options.docs);
      
      // Import ValidationEngine
      const { ValidationEngine } = await import('./validation/index.js');
      const validator = new ValidationEngine(rootPath, docsPath);
      
      if (options.uninstall) {
        console.log('🔧 Uninstalling pre-commit hook...');
        await validator.uninstallPreCommitHook();
      } else {
        console.log('🔧 Installing pre-commit hook...');
        await validator.installPreCommitHook();
        
        console.log('\n📝 The pre-commit hook will:');
        console.log('  • Validate documentation for changed files');
        console.log('  • Block commits if critical documentation is missing');
        console.log('  • Show warnings but allow commits for non-critical issues');
        console.log('\nTo bypass the hook (not recommended), use: git commit --no-verify');
      }
      
    } catch (error) {
      console.error('❌ Installation failed:', error);
      process.exit(1);
    }
  });

/**
 * CI command - Generate CI configuration files
 */
program
  .command('ci')
  .description('Generate CI configuration for documentation validation')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-p, --path <path>', 'Project root path', '.')
  .option('-d, --docs <docs>', 'Path to documentation', './docs')
  .option('--platform <platform>', 'CI platform (github, gitlab, circleci)', 'github')
  .option('-o, --output <output>', 'Output path for CI configuration')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const rootPath = path.resolve(process.cwd(), options.path);
      const docsPath = path.resolve(process.cwd(), options.docs);
      
      console.log(`🔧 Generating ${options.platform} CI configuration...`);
      
      // Import ValidationEngine
      const { ValidationEngine } = await import('./validation/index.js');
      const validator = new ValidationEngine(rootPath, docsPath);
      
      // Generate CI config
      const outputPath = options.output ? path.resolve(process.cwd(), options.output) : undefined;
      await validator.generateCIConfig(options.platform, outputPath);
      
      console.log('\n📝 The CI workflow will:');
      console.log('  • Run on push and pull requests');
      console.log('  • Validate all documentation');
      console.log('  • Generate coverage reports');
      console.log('  • Fail the build if documentation is missing');
      console.log('\nCommit the generated file to enable CI validation.');
      
    } catch (error) {
      console.error('❌ CI configuration generation failed:', error);
      process.exit(1);
    }
  });

/**
 * Export command - Export documentation for AI/RAG systems
 */
program
  .command('export')
  .description('Export documentation in RAG-compatible format')
  .option('-p, --path <path>', 'Path to documentation', './docs')
  .option('-c, --config <config>', 'Path to configuration file')
  .option('-o, --output <output>', 'Output file for export', './docs/rag-export.json')
  .option('--embeddings', 'Generate embeddings', false)
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);
      const docsPath = path.resolve(process.cwd(), options.path);
      const outputPath = path.resolve(process.cwd(), options.output);
      
      console.log('📤 Exporting documentation for AI/RAG...');
      console.log(`Source: ${docsPath}`);
      console.log(`Output: ${outputPath}`);
      console.log(`Generate embeddings: ${options.embeddings}`);
      
      // TODO: Implement AI integration layer
      console.log('⚠️  Export module not yet implemented');
      console.log('This will be implemented in task 8');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      process.exit(1);
    }
  });

/**
 * Config command - Manage configuration files
 */
program
  .command('config')
  .description('Manage configuration files')
  .option('--init', 'Create a new configuration file')
  .option('--validate', 'Validate existing configuration')
  .option('--show', 'Show current configuration')
  .option('-c, --config <config>', 'Path to configuration file')
  .action(async (options) => {
    try {
      if (options.init) {
        // Create new configuration file
        const { writeFile } = await import('fs/promises');
        const { DEFAULT_CONFIG } = await import('./config.js');
        
        const configPath = '.docsystemrc.json';
        const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
        
        await writeFile(configPath, configContent, 'utf-8');
        console.log(`✅ Created configuration file: ${configPath}`);
        console.log('You can now customize the configuration to your needs.');
        
      } else if (options.validate) {
        // Validate configuration
        console.log('🔍 Validating configuration...');
        const config = await loadConfig(options.config);
        console.log('✅ Configuration is valid!');
        
      } else if (options.show) {
        // Show current configuration
        console.log('📋 Current configuration:');
        const config = await loadConfig(options.config);
        console.log(JSON.stringify(config, null, 2));
        
      } else {
        console.log('Please specify an option: --init, --validate, or --show');
        console.log('Run "doc-system config --help" for more information');
      }
      
    } catch (error) {
      console.error('❌ Config command failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
