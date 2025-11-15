# Automated Documentation System

A comprehensive toolset for analyzing, reorganizing, and documenting TypeScript/JavaScript codebases.

## Features

### ✅ Code Analyzer (Implemented)

The Code Analyzer module scans your codebase to detect:

- **Unused Imports**: Identifies imported modules that are never used
- **Unused Functions**: Finds function declarations that are never called
- **Unused Components**: Detects React components that are never rendered
- **Mixed Logic Files**: Identifies files containing multiple unrelated entities
- **Split Entities**: Finds related code scattered across multiple files
- **Dead Code Analysis**: Provides impact analysis for safe code removal

#### Usage

```bash
# Analyze codebase and display report
npm run doc-system analyze -- --path ./src

# Save report to file
npm run doc-system analyze -- --path ./src --output report.txt

# Export as JSON
npm run doc-system analyze -- --path ./src --json --output report.json

# Use custom configuration
npm run doc-system analyze -- --path ./src --config .docsystemrc.json
```

#### Configuration

The analyzer can be configured via `.docsystemrc.json`:

```json
{
  "analyzer": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.test.ts"
    ],
    "complexityThreshold": 10,
    "mixedLogicThreshold": 3
  }
}
```

#### Example Output

```
═══════════════════════════════════════════════════════════
           CODE ANALYSIS REPORT
═══════════════════════════════════════════════════════════

📊 SUMMARY
─────────────────────────────────────────────────────────
Unused Imports:     0
Unused Functions:   16
Unused Components:  2
Mixed Logic Files:  52
Split Entities:     6
Total Dead Code:    18

🔍 UNUSED FUNCTIONS
─────────────────────────────────────────────────────────

📁 src/utils/projectManager.ts
   Line 32: updateProblemStatus [EXPORTED] (complexity: 1)

📁 src/components/ProjectWorkflowModal.tsx
   Line 33: ProjectWorkflowModal [EXPORTED] (complexity: 41) ⚠️ HIGH COMPLEXITY

💡 Recommendation: Review and remove unused functions, especially internal ones
   Note: Exported functions may be part of the public API
```

## Upcoming Features

### 🚧 File Reorganizer (Coming Soon)
- Restructure files based on analysis results
- Apply logical grouping rules
- Update import statements automatically
- Preserve git history

### 🚧 Documentation Generator (Coming Soon)
- Generate Markdown documentation for functions
- Create group documentation
- Maintain documentation index
- Preserve manual edits

### 🚧 Import Graph Builder (Coming Soon)
- Build dependency graphs
- Detect circular dependencies
- Visualize import relationships
- Export for AI/RAG systems

### 🚧 Validation Engine (Coming Soon)
- Pre-commit hooks
- CI/CD integration
- Documentation drift detection
- Completeness validation

## Architecture

```
scripts/doc-system/
├── analyzer/           # Code analysis module ✅
│   ├── CodeAnalyzer.ts
│   ├── types.ts
│   └── index.ts
├── reorganizer/        # File reorganization (TODO)
├── generator/          # Documentation generation (TODO)
├── graph/             # Import graph builder (TODO)
├── validation/        # Validation engine (TODO)
├── ai/                # AI integration layer (TODO)
├── cli.ts             # CLI entry point
├── config.ts          # Configuration management
└── README.md          # This file
```

## Development

### Running Tests

```bash
# Run unit tests (when implemented)
npm test

# Run with coverage
npm test -- --coverage
```

### Building

The project uses TypeScript and is executed via `tsx`. No build step is required for development.

## Requirements

- Node.js 18+
- TypeScript 5.x
- npm or yarn

## License

MIT
