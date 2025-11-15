# Automated Documentation and Refactoring System

A comprehensive toolset that transforms React/TypeScript codebases into modular, self-documenting architectures. This system analyzes code, detects issues, reorganizes files into logical groups, and generates comprehensive Markdown documentation for every function and component.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Configuration](#configuration)
- [Documentation Format](#documentation-format)
- [Workflow](#workflow)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

### Code Analysis
- **Unused Code Detection**: Identifies unused imports, functions, and components
- **Mixed Logic Detection**: Finds files with multiple unrelated entities
- **Complexity Analysis**: Calculates cyclomatic complexity for prioritization
- **Circular Dependency Detection**: Identifies problematic import cycles

### File Reorganization
- **Logical Grouping**: Organizes code by domain (supabase, search, ui, utils, hooks)
- **Automated Splitting**: Separates mixed logic files into focused modules
- **Import Updates**: Automatically updates all import statements
- **Git Integration**: Preserves file history using `git mv`

### Documentation Generation
- **Function Documentation**: Creates detailed Markdown files for each function
- **Group Documentation**: Generates summary docs for logical groups
- **Manual Content Preservation**: Keeps manually written sections during updates
- **Documentation Index**: Maintains JSON index of all documentation

### Import Graph Analysis
- **Dependency Mapping**: Builds complete import/export relationship graph
- **Usage Tracking**: Shows where each function is used
- **Graph Visualization**: Exports to Mermaid diagrams and GraphML

### AI Integration
- **RAG Export**: Formats documentation for Retrieval-Augmented Generation
- **Graph Queries**: Provides API for dependency analysis
- **Semantic Search**: Enables AI-powered code understanding

### Validation & Automation
- **Pre-commit Hooks**: Validates documentation before commits
- **CI Integration**: Fails builds on missing documentation
- **Drift Detection**: Identifies outdated documentation
- **Auto-updates**: Updates docs when code changes


## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git (for file reorganization with history preservation)
- TypeScript project

### Install Dependencies

```bash
npm install --save-dev typescript commander fs-extra @types/node
```

### Install the Documentation System

1. Copy the `scripts/doc-system/` directory to your project
2. Install dependencies (if not already installed)
3. Create a configuration file (optional)

```bash
# Copy the system to your project
cp -r scripts/doc-system /path/to/your/project/scripts/

# Install dependencies
cd /path/to/your/project
npm install

# Create configuration file
cp scripts/doc-system/.docsystemrc.example.json .docsystemrc.json
```

### Build the CLI

```bash
# Compile TypeScript
npx tsc -p scripts/doc-system/tsconfig.json

# Or use the build script
npm run build:doc-system
```

## Quick Start

### 1. Analyze Your Codebase

```bash
node scripts/doc-system/cli.js analyze --output analysis-report.txt
```

This will scan your codebase and generate a report showing:
- Unused imports, functions, and components
- Files with mixed logic
- Split entities that should be consolidated
- Circular dependencies

### 2. Review the Analysis Report

Open `analysis-report.txt` and review the findings. The report includes:
- Executive summary with counts
- Detailed list of issues with file paths and line numbers
- Recommendations for cleanup and refactoring

### 3. Generate Documentation

```bash
node scripts/doc-system/cli.js document --output docs/
```

This will:
- Create a Markdown file for each function
- Generate group documentation for logical modules
- Create a documentation index (JSON)
- Preserve any existing manual content

### 4. Validate Documentation

```bash
node scripts/doc-system/cli.js validate
```

This checks for:
- Missing documentation for exported functions
- Outdated function signatures
- Empty purpose sections
- Broken references

### 5. Set Up Pre-commit Hook (Optional)

```bash
node scripts/doc-system/cli.js install-hook
```

This installs a Git pre-commit hook that validates documentation before each commit.


## CLI Commands

### `analyze`

Analyzes the codebase and generates a report of issues.

```bash
node scripts/doc-system/cli.js analyze [options]
```

**Options:**
- `--root <path>` - Root directory to analyze (default: `./src`)
- `--output <file>` - Output file for report (default: `analysis-report.txt`)
- `--format <type>` - Report format: `text` or `json` (default: `text`)
- `--exclude <patterns>` - Comma-separated glob patterns to exclude
- `--complexity-threshold <n>` - Complexity threshold for warnings (default: 10)

**Examples:**

```bash
# Analyze with default settings
node scripts/doc-system/cli.js analyze

# Analyze specific directory with JSON output
node scripts/doc-system/cli.js analyze --root ./src/services --format json

# Exclude test files and node_modules
node scripts/doc-system/cli.js analyze --exclude "**/*.test.ts,**/node_modules/**"
```

### `reorganize`

Reorganizes files based on analysis results and grouping rules.

```bash
node scripts/doc-system/cli.js reorganize [options]
```

**Options:**
- `--root <path>` - Root directory to reorganize (default: `./src`)
- `--dry-run` - Preview changes without modifying files
- `--backup` - Create backup before reorganization (default: true)
- `--git-mv` - Use `git mv` to preserve history (default: true)
- `--plan <file>` - Load reorganization plan from file

**Examples:**

```bash
# Preview reorganization (no changes)
node scripts/doc-system/cli.js reorganize --dry-run

# Execute reorganization with backup
node scripts/doc-system/cli.js reorganize --backup

# Reorganize without git integration
node scripts/doc-system/cli.js reorganize --git-mv false
```

### `document`

Generates documentation for all functions and components.

```bash
node scripts/doc-system/cli.js document [options]
```

**Options:**
- `--root <path>` - Root directory to document (default: `./src`)
- `--output <path>` - Output directory for docs (default: `./docs`)
- `--templates <path>` - Custom templates directory
- `--preserve-manual` - Preserve manually written content (default: true)
- `--generate-index` - Generate documentation index (default: true)
- `--incremental` - Only update changed files

**Examples:**

```bash
# Generate all documentation
node scripts/doc-system/cli.js document

# Generate with custom output directory
node scripts/doc-system/cli.js document --output ./documentation

# Incremental update (only changed files)
node scripts/doc-system/cli.js document --incremental
```

### `validate`

Validates documentation completeness and accuracy.

```bash
node scripts/doc-system/cli.js validate [options]
```

**Options:**
- `--root <path>` - Root directory to validate (default: `./src`)
- `--docs <path>` - Documentation directory (default: `./docs`)
- `--strict` - Fail on warnings (default: false)
- `--fix` - Automatically fix issues when possible

**Examples:**

```bash
# Validate all documentation
node scripts/doc-system/cli.js validate

# Strict validation (fail on warnings)
node scripts/doc-system/cli.js validate --strict

# Validate and auto-fix issues
node scripts/doc-system/cli.js validate --fix
```

### `graph`

Builds and exports the import dependency graph.

```bash
node scripts/doc-system/cli.js graph [options]
```

**Options:**
- `--root <path>` - Root directory to analyze (default: `./src`)
- `--output <file>` - Output file for graph
- `--format <type>` - Export format: `json`, `mermaid`, or `graphml`
- `--visualize` - Generate HTML visualization

**Examples:**

```bash
# Export graph as JSON
node scripts/doc-system/cli.js graph --format json --output graph.json

# Generate Mermaid diagram
node scripts/doc-system/cli.js graph --format mermaid --output graph.mmd

# Create interactive visualization
node scripts/doc-system/cli.js graph --visualize
```

### `rag-export`

Exports documentation in RAG-compatible format for AI tools.

```bash
node scripts/doc-system/cli.js rag-export [options]
```

**Options:**
- `--docs <path>` - Documentation directory (default: `./docs`)
- `--output <file>` - Output file (default: `rag-export.json`)
- `--embeddings` - Generate embeddings (requires API key)
- `--model <name>` - Embedding model to use

**Examples:**

```bash
# Export for RAG
node scripts/doc-system/cli.js rag-export

# Export with embeddings
node scripts/doc-system/cli.js rag-export --embeddings --model text-embedding-ada-002
```

### `install-hook`

Installs Git pre-commit hook for documentation validation.

```bash
node scripts/doc-system/cli.js install-hook [options]
```

**Options:**
- `--force` - Overwrite existing hook

**Examples:**

```bash
# Install pre-commit hook
node scripts/doc-system/cli.js install-hook

# Force install (overwrite existing)
node scripts/doc-system/cli.js install-hook --force
```

### `generate-all`

Runs the complete workflow: analyze → reorganize → document → validate.

```bash
node scripts/doc-system/cli.js generate-all [options]
```

**Options:**
- `--root <path>` - Root directory (default: `./src`)
- `--output <path>` - Documentation output directory (default: `./docs`)
- `--dry-run` - Preview changes without modifying files
- `--skip-reorganize` - Skip file reorganization step

**Examples:**

```bash
# Run complete workflow
node scripts/doc-system/cli.js generate-all

# Preview complete workflow
node scripts/doc-system/cli.js generate-all --dry-run

# Generate docs without reorganizing
node scripts/doc-system/cli.js generate-all --skip-reorganize
```


## Configuration

The documentation system can be configured using a `.docsystemrc.json` file in your project root, or through a `docSystem` key in `package.json`.

### Configuration File Example

```json
{
  "analyzer": {
    "rootDir": "./src",
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/node_modules/**",
      "**/__tests__/**"
    ],
    "complexityThreshold": 10,
    "mixedLogicThreshold": 3
  },
  "reorganizer": {
    "dryRun": false,
    "createBackup": true,
    "useGitMv": true,
    "groupingRules": [
      {
        "name": "supabase",
        "pattern": "supabase|database|db",
        "targetDirectory": "services/supabase",
        "priority": 1
      },
      {
        "name": "search",
        "pattern": "search|filter|query",
        "targetDirectory": "services/search",
        "priority": 2
      },
      {
        "name": "ui",
        "pattern": "component|ui",
        "targetDirectory": "components/ui",
        "priority": 3
      }
    ]
  },
  "documentation": {
    "outputDir": "./docs",
    "templatesDir": "./scripts/doc-system/templates",
    "preserveManual": true,
    "generateIndex": true,
    "functionDocTemplate": "function-doc.md",
    "groupDocTemplate": "group-doc.md"
  },
  "validation": {
    "requirePurpose": true,
    "checkSignatures": true,
    "allowPlaceholders": false,
    "strictMode": false
  },
  "ai": {
    "enableRAG": true,
    "generateEmbeddings": false,
    "embeddingModel": "text-embedding-ada-002",
    "embeddingProvider": "openai"
  },
  "graph": {
    "includeNodeModules": false,
    "detectCircular": true,
    "maxDepth": 10
  }
}
```

### Configuration Options

#### Analyzer Options

- `rootDir` (string): Root directory to analyze (default: `./src`)
- `excludePatterns` (string[]): Glob patterns to exclude from analysis
- `complexityThreshold` (number): Cyclomatic complexity threshold for warnings (default: 10)
- `mixedLogicThreshold` (number): Number of entities before file is considered "mixed" (default: 3)

#### Reorganizer Options

- `dryRun` (boolean): Preview changes without modifying files (default: false)
- `createBackup` (boolean): Create backup before reorganization (default: true)
- `useGitMv` (boolean): Use `git mv` to preserve history (default: true)
- `groupingRules` (array): Custom grouping rules for file organization

#### Documentation Options

- `outputDir` (string): Output directory for documentation (default: `./docs`)
- `templatesDir` (string): Directory containing custom templates
- `preserveManual` (boolean): Preserve manually written content (default: true)
- `generateIndex` (boolean): Generate documentation index (default: true)
- `functionDocTemplate` (string): Template file for function documentation
- `groupDocTemplate` (string): Template file for group documentation

#### Validation Options

- `requirePurpose` (boolean): Require non-empty purpose sections (default: true)
- `checkSignatures` (boolean): Validate function signatures match code (default: true)
- `allowPlaceholders` (boolean): Allow placeholder text in documentation (default: false)
- `strictMode` (boolean): Fail on warnings (default: false)

#### AI Integration Options

- `enableRAG` (boolean): Enable RAG export functionality (default: true)
- `generateEmbeddings` (boolean): Generate embeddings for semantic search (default: false)
- `embeddingModel` (string): Model to use for embeddings
- `embeddingProvider` (string): Provider for embeddings (openai, cohere, local)

#### Graph Options

- `includeNodeModules` (boolean): Include node_modules in graph (default: false)
- `detectCircular` (boolean): Detect circular dependencies (default: true)
- `maxDepth` (number): Maximum depth for graph traversal (default: 10)


## Documentation Format

### Function Documentation Template

Each function gets its own Markdown file with the following structure:

```markdown
# functionName

**Path:** `src/path/to/function.ts`

### Purpose
[Manual description of what the function does and why it exists]

### Input
- `param1` (type): Description
- `param2` (type, optional): Description

### Output
Returns `type`: Description of return value

### Used In
- `src/path/to/file1.ts` - Context of usage
- `src/path/to/file2.ts` - Context of usage

### Complexity
Cyclomatic Complexity: X (Low/Medium/High)

### Group
group-name

### Dependencies
- External packages used
- Internal modules imported

### Notes
[Manual notes, warnings, or additional context]

### Example Usage
[Manual code examples]
```

### Group Documentation Template

Logical groups get summary documentation:

```markdown
# Group Name

### Overview
[Manual description of the group's purpose and scope]

### Technologies
- Technology 1
- Technology 2

### External Connections
- API endpoints
- External services

### Associated Functions

#### Subgroup Name

- **functionName** (`path/to/file.ts`)
  - Purpose: Brief description
  - Complexity: X
  - Used in: Y files

[... more functions]

### Error Handling
[Manual description of error handling patterns]

### Performance Considerations
[Manual notes on performance]

### Security Notes
[Manual security considerations]

### Testing
[Manual testing guidelines]

### Related Groups
- Other related groups
```

### Documentation Index

The system generates a JSON index for programmatic access:

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "functions": [
    {
      "name": "functionName",
      "filePath": "src/path/to/file.ts",
      "docPath": "docs/path/to/file.md",
      "group": "group-name",
      "exported": true,
      "complexity": 5,
      "dependencies": ["dep1", "dep2"],
      "usedBy": ["file1", "file2"]
    }
  ],
  "groups": [
    {
      "name": "group-name",
      "docPath": "docs/groups/group-name.md",
      "functionCount": 10,
      "functions": ["func1", "func2"]
    }
  ],
  "statistics": {
    "totalFunctions": 100,
    "documentedFunctions": 95,
    "documentationCoverage": 95,
    "averageComplexity": 6.2
  }
}
```


## Workflow

### Recommended Workflow for New Projects

1. **Initial Analysis**
   ```bash
   node scripts/doc-system/cli.js analyze --output initial-analysis.txt
   ```
   Review the report to understand current code quality issues.

2. **Clean Up Unused Code**
   Manually remove unused imports, functions, and components identified in the analysis.

3. **Preview Reorganization**
   ```bash
   node scripts/doc-system/cli.js reorganize --dry-run
   ```
   Review the proposed file structure changes.

4. **Execute Reorganization**
   ```bash
   node scripts/doc-system/cli.js reorganize --backup
   ```
   Reorganize files with automatic backup.

5. **Generate Documentation**
   ```bash
   node scripts/doc-system/cli.js document
   ```
   Create initial documentation for all functions.

6. **Fill in Manual Content**
   Edit the generated Markdown files to add:
   - Purpose descriptions
   - Usage examples
   - Notes and warnings
   - Group overviews

7. **Validate Documentation**
   ```bash
   node scripts/doc-system/cli.js validate
   ```
   Check for missing or incomplete documentation.

8. **Install Pre-commit Hook**
   ```bash
   node scripts/doc-system/cli.js install-hook
   ```
   Ensure documentation stays up-to-date.

9. **Set Up CI Integration**
   Add documentation validation to your CI pipeline.

### Workflow for Existing Projects

For projects with existing documentation:

1. **Analyze Current State**
   ```bash
   node scripts/doc-system/cli.js analyze
   ```

2. **Generate Documentation (Incremental)**
   ```bash
   node scripts/doc-system/cli.js document --incremental --preserve-manual
   ```
   This will preserve existing manual content.

3. **Validate and Fix**
   ```bash
   node scripts/doc-system/cli.js validate --fix
   ```

4. **Set Up Automation**
   ```bash
   node scripts/doc-system/cli.js install-hook
   ```

### Daily Development Workflow

Once set up, the system works automatically:

1. **Write Code**: Create or modify functions as usual
2. **Pre-commit Hook**: Validates documentation before commit
3. **Fix Issues**: If validation fails, update documentation
4. **Commit**: Documentation and code committed together
5. **CI Validation**: CI checks documentation completeness

### Updating Documentation

When code changes:

```bash
# Detect what changed
node scripts/doc-system/cli.js validate

# Update specific files
node scripts/doc-system/cli.js document --incremental

# Or regenerate everything
node scripts/doc-system/cli.js document
```

The system automatically:
- Updates function signatures
- Updates "Used In" sections
- Preserves manual content
- Detects drift


## Examples

### Example: Before and After

**Before Cleanup:**
```
src/
├── components/
│   ├── DocumentList.tsx    # Mixed: UI + logic + queries
│   └── SearchBar.tsx        # Mixed: UI + state + filters
└── lib/
    └── utils.ts             # Mixed: Various unrelated utilities
```

**After Reorganization:**
```
src/
├── components/
│   └── ui/
│       ├── DocumentList/
│       │   ├── DocumentList.tsx
│       │   └── DocumentList.md
│       └── SearchBar/
│           ├── SearchBar.tsx
│           └── SearchBar.md
├── services/
│   ├── supabase/
│   │   └── queries/
│   │       ├── fetchDocuments.ts
│   │       └── fetchDocuments.md
│   └── search/
│       ├── searchDocuments.ts
│       └── searchDocuments.md
└── utils/
    ├── date/
    │   ├── formatDate.ts
    │   └── formatDate.md
    └── validation/
        ├── validateEmail.ts
        └── validateEmail.md
```

### Example: Generated Function Documentation

See `scripts/doc-system/examples/function-doc-example.md` for a complete example.

### Example: Generated Group Documentation

See `scripts/doc-system/examples/group-doc-example.md` for a complete example.

### Example: Analysis Report

See `scripts/doc-system/examples/analyzer-report.txt` for a complete example.

### Example: Documentation Index

See `scripts/doc-system/examples/documentation-index.json` for a complete example.


## Troubleshooting

### Common Issues

#### Issue: "Cannot find module 'typescript'"

**Solution:**
```bash
npm install --save-dev typescript
```

Make sure TypeScript is installed as a dev dependency.

---

#### Issue: "Permission denied" when installing pre-commit hook

**Solution:**
```bash
chmod +x .git/hooks/pre-commit
```

Or run the install command with elevated permissions.

---

#### Issue: Analysis takes too long on large codebases

**Solution:**
1. Exclude unnecessary directories:
   ```bash
   node scripts/doc-system/cli.js analyze --exclude "**/node_modules/**,**/dist/**"
   ```

2. Use incremental mode:
   ```bash
   node scripts/doc-system/cli.js document --incremental
   ```

3. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" node scripts/doc-system/cli.js analyze
   ```

---

#### Issue: Import paths break after reorganization

**Solution:**
The system should automatically update imports. If they're broken:

1. Check if `--git-mv` was used (preserves history but may cause issues)
2. Run without `--git-mv`:
   ```bash
   node scripts/doc-system/cli.js reorganize --git-mv false
   ```

3. Manually fix imports or use your IDE's refactoring tools

---

#### Issue: Documentation validation fails on valid code

**Solution:**
1. Check if the function signature changed but docs weren't updated
2. Regenerate documentation:
   ```bash
   node scripts/doc-system/cli.js document --incremental
   ```

3. Use `--fix` flag to auto-fix:
   ```bash
   node scripts/doc-system/cli.js validate --fix
   ```

---

#### Issue: Pre-commit hook blocks all commits

**Solution:**
1. Temporarily bypass the hook:
   ```bash
   git commit --no-verify -m "message"
   ```

2. Fix documentation issues:
   ```bash
   node scripts/doc-system/cli.js validate
   node scripts/doc-system/cli.js document --incremental
   ```

3. Uninstall hook if needed:
   ```bash
   rm .git/hooks/pre-commit
   ```

---

#### Issue: Circular dependency warnings

**Solution:**
Circular dependencies indicate architectural issues. To fix:

1. Review the circular dependency path in the analysis report
2. Refactor code to break the cycle:
   - Extract shared code to a separate module
   - Use dependency injection
   - Restructure imports

3. Suppress warnings (not recommended):
   ```json
   {
     "graph": {
       "detectCircular": false
     }
   }
   ```

---

#### Issue: Manual content gets overwritten

**Solution:**
Ensure `preserveManual` is enabled:

```json
{
  "documentation": {
    "preserveManual": true
  }
}
```

The system preserves content in these sections:
- Purpose
- Notes
- Example Usage
- Group Overview

Auto-generated sections (Input, Output, Used In) are always updated.

---

#### Issue: RAG export fails with embeddings

**Solution:**
1. Check API key is set:
   ```bash
   export OPENAI_API_KEY="your-key"
   ```

2. Use without embeddings:
   ```bash
   node scripts/doc-system/cli.js rag-export
   ```

3. Check rate limits and retry

---

#### Issue: TypeScript compilation errors

**Solution:**
1. Ensure TypeScript version compatibility:
   ```bash
   npm install --save-dev typescript@^5.0.0
   ```

2. Check `tsconfig.json` settings
3. Exclude problematic files in configuration

---

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review the detailed module READMEs in `scripts/doc-system/*/README.md`
3. Enable debug logging:
   ```bash
   DEBUG=doc-system:* node scripts/doc-system/cli.js analyze
   ```

4. Create a minimal reproduction and file an issue


## Contributing

We welcome contributions to the Automated Documentation System! Here's how you can help:

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/doc-system.git
   cd doc-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

### Project Structure

```
scripts/doc-system/
├── analyzer/           # Code analysis module
├── reorganizer/        # File reorganization module
├── generator/          # Documentation generation module
├── graph/              # Import graph builder
├── validation/         # Validation engine
├── ai/                 # AI integration layer
├── drift/              # Drift detection
├── templates/          # Documentation templates
├── examples/           # Example outputs
├── cli.ts              # CLI entry point
└── config.ts           # Configuration management
```

### Contribution Guidelines

#### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Add JSDoc comments for public APIs
- Write descriptive commit messages

#### Testing

- Write unit tests for new features
- Ensure all tests pass before submitting PR
- Add integration tests for complex workflows
- Test with real-world codebases

#### Documentation

- Update README for new features
- Add examples for new CLI commands
- Document configuration options
- Update troubleshooting section

#### Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git commit -m "feat: add new feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if applicable
   - Test results

5. Address review feedback

#### Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

Examples:
```
feat: add support for JSX analysis
fix: resolve circular dependency detection bug
docs: update configuration examples
```

### Areas for Contribution

#### High Priority

- [ ] Support for JavaScript (non-TypeScript) projects
- [ ] Performance optimization for large codebases
- [ ] Better error messages and recovery
- [ ] More grouping rule templates
- [ ] VSCode extension

#### Medium Priority

- [ ] Support for other languages (Python, Go, etc.)
- [ ] Interactive CLI with prompts
- [ ] Web-based documentation viewer
- [ ] Automated refactoring suggestions
- [ ] Integration with popular documentation tools

#### Low Priority

- [ ] Custom template engine support
- [ ] Plugin system for extensibility
- [ ] Cloud storage integration
- [ ] Team collaboration features
- [ ] Analytics and metrics dashboard

### Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Minimal steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - Node.js version
   - TypeScript version
   - Operating system
   - Project size (number of files)
6. **Logs**: Relevant error messages or logs
7. **Sample Code**: Minimal reproduction if possible

### Requesting Features

For feature requests, please include:

1. **Use Case**: Why you need this feature
2. **Proposed Solution**: How you envision it working
3. **Alternatives**: Other solutions you've considered
4. **Examples**: Similar features in other tools

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the issue, not the person
- Help others learn and grow

### License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## License

MIT License

Copyright (c) 2024 Documentation System Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Acknowledgments

- TypeScript team for the excellent Compiler API
- Commander.js for CLI framework
- All contributors and users of this project

---

## Support

- **Documentation**: See module-specific READMEs in `scripts/doc-system/*/README.md`
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@example.com

---

**Happy Documenting! 📚**
