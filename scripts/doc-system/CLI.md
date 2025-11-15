# Documentation System CLI

Command-line interface for the Automated Documentation and Refactoring System.

## Installation

The CLI is available via npm script:

```bash
npm run doc-system -- <command> [options]
```

## Commands

### analyze

Analyze codebase to detect unused code, mixed logic, and structural issues.

```bash
npm run doc-system -- analyze [options]
```

**Options:**
- `-p, --path <path>` - Path to analyze (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `-o, --output <output>` - Output file for analysis report
- `--json` - Output in JSON format

**Example:**
```bash
npm run doc-system -- analyze -p ./src -o analysis-report.txt
npm run doc-system -- analyze --json -o analysis-report.json
```

### reorganize

Reorganize files into logical groups based on analysis results.

```bash
npm run doc-system -- reorganize [options]
```

**Options:**
- `-p, --path <path>` - Path to reorganize (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `--dry-run` - Preview changes without applying them (default: true)
- `--no-backup` - Skip backup creation

**Example:**
```bash
npm run doc-system -- reorganize --dry-run
npm run doc-system -- reorganize --no-dry-run
```

### document

Generate Markdown documentation for all functions and components.

```bash
npm run doc-system -- document [options]
```

**Options:**
- `-p, --path <path>` - Path to document (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `-o, --output <output>` - Output directory for documentation (default: "./docs")
- `--incremental` - Only update changed files

**Example:**
```bash
npm run doc-system -- document -p ./src -o ./docs
npm run doc-system -- document --incremental
```

### validate

Validate documentation completeness and accuracy.

```bash
npm run doc-system -- validate [options]
```

**Options:**
- `-p, --path <path>` - Path to validate (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `--strict` - Fail on warnings

**Example:**
```bash
npm run doc-system -- validate
npm run doc-system -- validate --strict
```

### graph

Build and visualize import dependency graph.

```bash
npm run doc-system -- graph [options]
```

**Options:**
- `-p, --path <path>` - Path to analyze (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `-f, --format <format>` - Output format: mermaid, json, graphml (default: "mermaid")
- `-o, --output <output>` - Output file for graph

**Example:**
```bash
npm run doc-system -- graph -f mermaid -o graph.mmd
npm run doc-system -- graph -f json -o graph.json
```

### generate-all

Run complete workflow: analyze → reorganize → document → validate.

```bash
npm run doc-system -- generate-all [options]
```

**Options:**
- `-p, --path <path>` - Path to process (default: "./src")
- `-c, --config <config>` - Path to configuration file
- `-o, --output <output>` - Output directory for documentation (default: "./docs")
- `--skip-reorganize` - Skip reorganization step
- `--incremental` - Only process changed files

**Example:**
```bash
npm run doc-system -- generate-all
npm run doc-system -- generate-all --skip-reorganize
npm run doc-system -- generate-all --incremental
```

### install

Install pre-commit hooks for documentation validation.

```bash
npm run doc-system -- install [options]
```

**Options:**
- `-c, --config <config>` - Path to configuration file

**Example:**
```bash
npm run doc-system -- install
```

### export

Export documentation in RAG-compatible format for AI systems.

```bash
npm run doc-system -- export [options]
```

**Options:**
- `-p, --path <path>` - Path to documentation (default: "./docs")
- `-c, --config <config>` - Path to configuration file
- `-o, --output <output>` - Output file for export (default: "./docs/rag-export.json")
- `--embeddings` - Generate embeddings

**Example:**
```bash
npm run doc-system -- export -o rag-export.json
npm run doc-system -- export --embeddings
```

### config

Manage configuration files.

```bash
npm run doc-system -- config [options]
```

**Options:**
- `--init` - Create a new configuration file
- `--validate` - Validate existing configuration
- `--show` - Show current configuration
- `-c, --config <config>` - Path to configuration file

**Example:**
```bash
npm run doc-system -- config --init
npm run doc-system -- config --validate
npm run doc-system -- config --show
```

## Configuration

The CLI supports multiple configuration file formats:

- `.docsystemrc.json` - JSON configuration
- `.docsystemrc.js` - JavaScript configuration
- `.docsystemrc.cjs` - CommonJS configuration
- `docsystem.config.js` - JavaScript configuration
- `docsystem.config.cjs` - CommonJS configuration
- `package.json` - Configuration in package.json under "docsystem" key

### Configuration Schema

```json
{
  "analyzer": {
    "excludePatterns": ["**/node_modules/**", "**/dist/**"],
    "complexityThreshold": 10,
    "mixedLogicThreshold": 3
  },
  "reorganizer": {
    "dryRun": true,
    "createBackup": true,
    "groupingRules": [
      {
        "name": "Supabase",
        "pattern": "supabase|database|db",
        "targetDirectory": "lib/supabase",
        "priority": 1
      }
    ]
  },
  "documentation": {
    "outputDir": "docs",
    "templatesDir": "scripts/doc-system/templates",
    "preserveManual": true,
    "generateIndex": true
  },
  "validation": {
    "requirePurpose": true,
    "checkSignatures": true,
    "allowPlaceholders": false
  },
  "ai": {
    "enableRAG": true,
    "generateEmbeddings": false,
    "embeddingModel": "text-embedding-ada-002"
  }
}
```

See `.docsystemrc.example.json` for a complete example.

## Workflow

### Basic Workflow

1. **Analyze** your codebase to identify issues:
   ```bash
   npm run doc-system -- analyze -o analysis-report.txt
   ```

2. **Review** the analysis report and decide on reorganization

3. **Reorganize** files (dry-run first):
   ```bash
   npm run doc-system -- reorganize --dry-run
   npm run doc-system -- reorganize --no-dry-run
   ```

4. **Generate** documentation:
   ```bash
   npm run doc-system -- document
   ```

5. **Validate** documentation completeness:
   ```bash
   npm run doc-system -- validate
   ```

### Quick Workflow

Run the entire workflow in one command:

```bash
npm run doc-system -- generate-all
```

### Incremental Updates

For ongoing development, use incremental mode:

```bash
npm run doc-system -- document --incremental
```

## Error Handling

The CLI includes error recovery mechanisms:

- **Continue on Error**: The `generate-all` command continues processing even if individual steps fail
- **Error Summary**: All errors are collected and reported at the end
- **Dry Run**: Use `--dry-run` to preview changes before applying them
- **Backups**: Automatic backups are created before destructive operations

## Progress Reporting

Long-running operations display progress information:

- File counts and processing status
- Step-by-step workflow progress
- Statistics and coverage metrics
- Duration and performance metrics

## Exit Codes

- `0` - Success
- `1` - Error occurred

## Examples

### Complete Documentation Generation

```bash
# Initialize configuration
npm run doc-system -- config --init

# Run full workflow
npm run doc-system -- generate-all -p ./src -o ./docs

# Validate results
npm run doc-system -- validate --strict
```

### Incremental Updates

```bash
# Update only changed files
npm run doc-system -- document --incremental

# Validate changes
npm run doc-system -- validate
```

### Graph Visualization

```bash
# Generate Mermaid diagram
npm run doc-system -- graph -f mermaid -o import-graph.mmd

# Generate JSON for analysis
npm run doc-system -- graph -f json -o import-graph.json
```

### AI Integration

```bash
# Export for RAG systems
npm run doc-system -- export -o rag-export.json

# Generate with embeddings
npm run doc-system -- export --embeddings
```

## Troubleshooting

### Configuration Not Found

If the CLI can't find your configuration:

```bash
# Specify config path explicitly
npm run doc-system -- analyze -c .docsystemrc.json

# Or create a new config
npm run doc-system -- config --init
```

### TypeScript Errors

If you encounter TypeScript compilation errors:

1. Ensure TypeScript is installed: `npm install typescript`
2. Check your tsconfig.json is valid
3. Exclude problematic files in analyzer.excludePatterns

### Permission Errors

If you encounter permission errors during reorganization:

1. Ensure you have write permissions
2. Check if files are open in other applications
3. Use `--dry-run` to preview changes first

## Support

For issues and questions:

1. Check the main README.md
2. Review the design document in `.kiro/specs/auto-documentation-system/design.md`
3. Check existing documentation in `scripts/doc-system/`
