# Documentation System Tests

This directory contains comprehensive tests for the automated documentation system.

## Test Structure

```
__tests__/
├── fixtures/              # Test fixtures and sample data
│   ├── sample-project/    # Sample TypeScript project for testing
│   └── existing-docs/     # Sample documentation files
├── analyzer/              # Unit tests for Code Analyzer
├── reorganizer/           # Unit tests for File Reorganizer
├── generator/             # Unit tests for Documentation Generator
├── graph/                 # Unit tests for Import Graph Builder
└── integration/           # Integration tests for full workflow
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Unit Tests

#### Code Analyzer Tests (`analyzer/CodeAnalyzer.test.ts`)
- ✅ Unused import detection (default, named, namespace imports)
- ✅ Unused function detection (exported and internal functions)
- ✅ Cyclomatic complexity calculation
- ✅ Mixed logic file detection
- ✅ Report generation (text and JSON formats)

#### File Reorganizer Tests (`reorganizer/FileReorganizer.test.ts`)
- ✅ Grouping rule matching (supabase, search, UI, hooks, utils)
- ✅ Target path generation
- ✅ Reorganization plan creation
- ✅ File splitting for mixed logic
- ✅ Dry-run mode validation

#### Documentation Generator Tests (`generator/DocumentationGenerator.test.ts`)
- ✅ Manual content extraction from existing docs
- ✅ Manual content merging with generated docs
- ✅ Documentation index generation
- ✅ Parameter extraction from TypeScript functions
- ✅ Template rendering for functions and groups

#### Import Graph Builder Tests (`graph/ImportGraphBuilder.test.ts`)
- ✅ Import parsing (default, named, namespace, mixed)
- ✅ Export parsing (default, named, re-exports)
- ✅ Circular dependency detection
- ✅ Graph traversal (dependencies and dependents)
- ✅ Usage finding for functions
- ✅ Graph export formats (Mermaid, JSON)

### Integration Tests

#### End-to-End Workflow Tests (`integration/workflow.test.ts`)
- ✅ Complete workflow: Analyze → Reorganize → Document → Validate
- ✅ Analysis results handling
- ✅ Reorganization plan generation
- ✅ Import graph building
- ✅ Circular dependency detection in sample project
- ✅ Documentation generation with manual content preservation
- ✅ Validation integration
- ✅ Error handling for invalid paths
- ✅ Report generation (text and JSON)

## Test Fixtures

### Sample Project Structure

The `fixtures/sample-project/` directory contains:

- **unused-imports.ts**: File with various unused import styles
- **unused-functions.ts**: File with unused exported and internal functions
- **mixed-logic.ts**: File with multiple unrelated entities (database, UI, utilities)
- **complex-function.ts**: Functions with known cyclomatic complexity
- **circular-a.ts** & **circular-b.ts**: Files with circular dependencies
- **import-variations.ts**: File demonstrating various import/export patterns
- **hooks/useCustomHook.ts**: Sample React hook
- **components/Button.tsx**: Sample React component
- **contexts/ThemeContext.tsx**: Sample React context

### Existing Documentation

The `fixtures/existing-docs/` directory contains:

- **sample-function.md**: Example documentation with manual content for preservation testing

## Configuration

Tests use Vitest as the test runner with the following configuration:

- **Environment**: Node.js
- **Globals**: Enabled for describe/it/expect
- **Coverage Provider**: v8
- **Coverage Reporters**: text, json, html

## Writing New Tests

When adding new tests:

1. Place unit tests in the appropriate module directory
2. Use descriptive test names that explain what is being tested
3. Follow the AAA pattern: Arrange, Act, Assert
4. Mock external dependencies when necessary
5. Keep tests focused on a single behavior
6. Add integration tests for cross-module functionality

## Test Guidelines

- Tests focus on core functional logic
- Minimal test solutions to avoid over-testing edge cases
- Real functionality validation (no mocks for making tests pass)
- Tests validate actual behavior, not implementation details
