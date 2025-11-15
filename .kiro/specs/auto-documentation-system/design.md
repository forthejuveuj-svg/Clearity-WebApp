# Design Document: Automated Documentation and Refactoring System

## Overview

The Automated Documentation and Refactoring System is a comprehensive toolset that transforms a React/TypeScript codebase into a modular, self-documenting architecture. The system consists of four main components: a Code Analyzer for detecting issues, a File Reorganizer for restructuring the codebase, a Documentation Generator for creating Markdown files, and an AI Integration Layer for enabling intelligent code understanding.

The system will be implemented as a Node.js CLI tool with multiple commands for different phases of the transformation process. It will use TypeScript's compiler API for code analysis, AST (Abstract Syntax Tree) parsing for understanding code structure, and template-based generation for creating documentation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry Point                          │
│                  (doc-system.ts)                             │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┬────────────────┐
             │              │              │              │                │
             ▼              ▼              ▼              ▼                ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Code     │  │    File    │  │    Doc     │  │   Import   │  │     AI     │
    │  Analyzer  │  │ Reorganizer│  │ Generator  │  │   Graph    │  │ Integration│
    └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘
         │               │               │               │                │
         │               │               │               │                │
         ▼               ▼               ▼               ▼                ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │                        File System & Cache                             │
    └────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

1. **Code Analyzer**: Scans TypeScript/JavaScript files using the TypeScript Compiler API to detect unused code, mixed logic, and structural issues
2. **File Reorganizer**: Moves and restructures files based on analysis results and logical grouping rules
3. **Documentation Generator**: Creates and updates Markdown documentation files using templates
4. **Import Graph Builder**: Analyzes import/export relationships to build dependency maps
5. **AI Integration Layer**: Provides RAG-compatible exports and graph-based reasoning capabilities
6. **Validation Engine**: Pre-commit hook and CI integration for ensuring documentation completeness

## Components and Interfaces

### 1. Code Analyzer Module

**Purpose**: Analyze the codebase to detect code quality issues and structural problems

**Key Classes**:

```typescript
interface AnalysisResult {
  unusedImports: UnusedImport[];
  unusedFunctions: UnusedFunction[];
  unusedComponents: UnusedComponent[];
  mixedLogicFiles: MixedLogicFile[];
  splitEntities: SplitEntity[];
  deadCode: DeadCode[];
}

interface UnusedImport {
  filePath: string;
  importName: string;
  lineNumber: number;
  importSource: string;
}

interface UnusedFunction {
  filePath: string;
  functionName: string;
  lineNumber: number;
  isExported: boolean;
  complexity: number;
}

interface MixedLogicFile {
  filePath: string;
  entities: CodeEntity[];
  suggestedSplit: SplitSuggestion[];
}

interface CodeEntity {
  name: string;
  type: 'function' | 'component' | 'class' | 'constant';
  lineStart: number;
  lineEnd: number;
  dependencies: string[];
}

class CodeAnalyzer {
  constructor(private config: AnalyzerConfig);
  
  async analyzeProject(rootPath: string): Promise<AnalysisResult>;
  async analyzeFile(filePath: string): Promise<FileAnalysis>;
  detectUnusedImports(sourceFile: ts.SourceFile): UnusedImport[];
  detectUnusedFunctions(sourceFile: ts.SourceFile): UnusedFunction[];
  detectMixedLogic(sourceFile: ts.SourceFile): MixedLogicFile | null;
  generateReport(result: AnalysisResult): string;
}
```

**Implementation Details**:
- Uses TypeScript Compiler API (`ts.createProgram()`) to parse source files
- Traverses AST to identify function declarations, imports, and exports
- Builds a usage map by tracking all identifiers and their references
- Calculates cyclomatic complexity for functions to assess refactoring priority
- Detects React components by looking for JSX return types and component naming patterns
- Identifies mixed logic by counting distinct entity types per file (threshold: 3+ unrelated entities)

### 2. File Reorganizer Module

**Purpose**: Restructure the codebase based on analysis results and logical grouping rules

**Key Classes**:

```typescript
interface ReorganizationPlan {
  moves: FileMove[];
  splits: FileSplit[];
  merges: FileMerge[];
  deletions: FileDeletion[];
}

interface FileMove {
  sourcePath: string;
  targetPath: string;
  reason: string;
  affectedImports: string[];
}

interface FileSplit {
  sourcePath: string;
  targetFiles: TargetFile[];
  reason: string;
}

interface TargetFile {
  path: string;
  content: string;
  entities: string[];
}

interface GroupingRule {
  name: string;
  pattern: RegExp;
  targetDirectory: string;
  priority: number;
}

class FileReorganizer {
  constructor(private config: ReorganizerConfig);
  
  async createReorganizationPlan(analysis: AnalysisResult): Promise<ReorganizationPlan>;
  async executeReorganizationPlan(plan: ReorganizationPlan, dryRun: boolean): Promise<void>;
  async splitFile(split: FileSplit): Promise<void>;
  async updateImports(move: FileMove): Promise<void>;
  applyGroupingRules(entities: CodeEntity[]): Map<string, CodeEntity[]>;
}
```

**Grouping Rules**:
- **Supabase Group**: Files containing `supabase`, `database`, `db` in name or imports from `@supabase/supabase-js`
- **Search Group**: Files containing `search`, `filter`, `query` in name or using search-related hooks
- **UI Group**: React components (files with JSX and component naming pattern)
- **Utils Group**: Pure functions with no React dependencies
- **Hooks Group**: Files starting with `use` and containing React hooks
- **Services Group**: Files containing API calls or external service integrations
- **Context Group**: Files containing React Context providers

**Implementation Details**:
- Generates a reorganization plan without modifying files initially
- Provides dry-run mode to preview changes
- Updates all import statements when files are moved using AST transformation
- Preserves file history in git by using `git mv` when possible
- Creates backup before executing reorganization

### 3. Documentation Generator Module

**Purpose**: Generate and maintain Markdown documentation files for functions and groups

**Key Classes**:

```typescript
interface DocumentationConfig {
  templatesDir: string;
  outputDir: string;
  functionDocTemplate: string;
  groupDocTemplate: string;
  preserveManualContent: boolean;
}

interface FunctionDocumentation {
  functionName: string;
  filePath: string;
  purpose: string;
  inputs: Parameter[];
  output: ReturnType;
  usedIn: string[];
  complexity: number;
  group: string;
}

interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

interface GroupDocumentation {
  groupName: string;
  description: string;
  technologies: string[];
  externalConnections: string[];
  functions: FunctionSummary[];
}

class DocumentationGenerator {
  constructor(private config: DocumentationConfig);
  
  async generateFunctionDoc(func: CodeEntity, analysis: FileAnalysis): Promise<string>;
  async generateGroupDoc(group: string, functions: CodeEntity[]): Promise<string>;
  async updateExistingDoc(docPath: string, updates: Partial<FunctionDocumentation>): Promise<void>;
  async generateDocumentationIndex(): Promise<DocumentationIndex>;
  extractManualContent(existingDoc: string): Map<string, string>;
  mergeManualContent(generated: string, manual: Map<string, string>): string;
}
```

**Documentation Templates**:

Function Doc Template:
```markdown
# {functionName}

**Path:** {filePath}

### Purpose
{purpose_placeholder}

### Input
{parameters_list}

### Output
{return_type}

### Used In
{usage_list}

### Complexity
{complexity_score}

### Group
{group_name}
```

Group Doc Template:
```markdown
# {groupName}

### Overview
{description_placeholder}

### Technologies
{technologies_list}

### External Connections
{connections_list}

### Associated Functions

{functions_list}
```

**Implementation Details**:
- Uses template strings with placeholder replacement
- Parses existing documentation to extract manually written sections
- Merges manual content with auto-generated content during updates
- Generates TypeScript type information from AST
- Calculates complexity scores using cyclomatic complexity algorithm
- Creates documentation files in parallel directory structure (e.g., `src/lib/utils.ts` → `docs/lib/utils.md`)

### 4. Import Graph Builder Module

**Purpose**: Build and maintain a dependency graph showing import relationships

**Key Classes**:

```typescript
interface ImportGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

interface GraphNode {
  filePath: string;
  exports: string[];
  imports: ImportInfo[];
  type: 'function' | 'component' | 'module';
}

interface GraphEdge {
  from: string;
  to: string;
  importedSymbols: string[];
}

interface ImportInfo {
  source: string;
  symbols: string[];
  isDefault: boolean;
}

class ImportGraphBuilder {
  constructor(private rootPath: string);
  
  async buildGraph(): Promise<ImportGraph>;
  async analyzeImports(filePath: string): Promise<ImportInfo[]>;
  async analyzeExports(filePath: string): Promise<string[]>;
  findUsages(functionName: string): string[];
  detectCircularDependencies(): CircularDependency[];
  exportToMermaid(): string;
  exportToJSON(): string;
}
```

**Implementation Details**:
- Parses import and export statements using TypeScript AST
- Resolves relative imports to absolute file paths
- Handles default exports, named exports, and re-exports
- Detects circular dependencies using depth-first search
- Generates Mermaid diagrams for visualization
- Exports graph in JSON format for AI consumption

### 5. AI Integration Layer Module

**Purpose**: Provide AI-friendly exports and enable RAG-based code understanding

**Key Classes**:

```typescript
interface RAGExport {
  documents: RAGDocument[];
  metadata: RAGMetadata;
}

interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    type: 'function' | 'group' | 'component';
    filePath: string;
    group: string;
    complexity: number;
    dependencies: string[];
  };
  embedding?: number[];
}

interface RAGMetadata {
  totalDocuments: number;
  groups: string[];
  generatedAt: string;
  version: string;
}

interface GraphQuery {
  type: 'dependencies' | 'dependents' | 'path' | 'related';
  target: string;
  depth?: number;
}

class AIIntegrationLayer {
  constructor(private graph: ImportGraph, private docs: DocumentationIndex);
  
  async exportForRAG(): Promise<RAGExport>;
  async queryGraph(query: GraphQuery): Promise<GraphNode[]>;
  async findRelatedFunctions(functionName: string, similarity: number): Promise<string[]>;
  async generateEmbeddings(documents: RAGDocument[]): Promise<void>;
  exportGraphML(): string;
}
```

**Implementation Details**:
- Converts documentation to RAG-compatible format with metadata
- Provides graph query API for dependency analysis
- Generates embeddings using local or API-based models (optional)
- Exports graph in GraphML format for graph databases
- Includes semantic similarity search based on function purpose and usage

### 6. Validation Engine Module

**Purpose**: Ensure documentation completeness through pre-commit hooks and CI integration

**Key Classes**:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: 'missing_doc' | 'outdated_doc' | 'invalid_format';
  filePath: string;
  message: string;
}

interface ValidationRule {
  name: string;
  check: (file: string, doc: string) => ValidationError | null;
  severity: 'error' | 'warning';
}

class ValidationEngine {
  constructor(private rules: ValidationRule[]);
  
  async validateProject(): Promise<ValidationResult>;
  async validateFile(filePath: string): Promise<ValidationError[]>;
  async validateDocumentation(docPath: string): Promise<ValidationError[]>;
  detectDocumentationDrift(file: string, doc: string): boolean;
  installPreCommitHook(): Promise<void>;
  generateCIConfig(): string;
}
```

**Validation Rules**:
1. **Missing Documentation**: Every exported function must have a documentation file
2. **Outdated Signature**: Function signature in code must match documentation
3. **Empty Purpose**: Purpose section must contain manual content (not placeholder)
4. **Broken Links**: All "Used In" references must point to existing files
5. **Invalid Format**: Documentation must follow the standard template structure

**Implementation Details**:
- Installs Git pre-commit hook using Husky or simple shell script
- Compares function signatures between code and documentation
- Checks for placeholder text in critical sections
- Validates Markdown syntax and structure
- Generates GitHub Actions workflow for CI validation

## Data Models

### Documentation Index Structure

```typescript
interface DocumentationIndex {
  version: string;
  generatedAt: string;
  functions: FunctionIndex[];
  groups: GroupIndex[];
  statistics: IndexStatistics;
}

interface FunctionIndex {
  name: string;
  filePath: string;
  docPath: string;
  group: string;
  exported: boolean;
  complexity: number;
  dependencies: string[];
  usedBy: string[];
}

interface GroupIndex {
  name: string;
  docPath: string;
  functionCount: number;
  functions: string[];
}

interface IndexStatistics {
  totalFunctions: number;
  totalGroups: number;
  documentedFunctions: number;
  documentationCoverage: number;
  averageComplexity: number;
}
```

### Configuration File Structure

```typescript
interface DocSystemConfig {
  analyzer: {
    excludePatterns: string[];
    complexityThreshold: number;
    mixedLogicThreshold: number;
  };
  reorganizer: {
    dryRun: boolean;
    createBackup: boolean;
    groupingRules: GroupingRule[];
  };
  documentation: {
    outputDir: string;
    templatesDir: string;
    preserveManual: boolean;
    generateIndex: boolean;
  };
  validation: {
    requirePurpose: boolean;
    checkSignatures: boolean;
    allowPlaceholders: boolean;
  };
  ai: {
    enableRAG: boolean;
    generateEmbeddings: boolean;
    embeddingModel: string;
  };
}
```

## Error Handling

### Error Categories

1. **Parse Errors**: TypeScript compilation errors, invalid syntax
   - Strategy: Log error with file path and line number, skip file, continue processing

2. **File System Errors**: Permission denied, file not found, disk full
   - Strategy: Fail fast with clear error message, rollback changes if in transaction

3. **Validation Errors**: Missing documentation, outdated signatures
   - Strategy: Collect all errors, present summary, allow user to fix or override

4. **Import Resolution Errors**: Cannot resolve import path, circular dependencies
   - Strategy: Log warning, mark as unresolved in graph, continue processing

### Error Recovery

- **Atomic Operations**: File moves and splits are wrapped in transactions
- **Backup Creation**: Automatic backup before reorganization
- **Rollback Capability**: Can revert to previous state if errors occur
- **Partial Success**: Continue processing other files if one file fails
- **Error Reporting**: Detailed error logs with stack traces and context

## Testing Strategy

### Unit Tests

**Code Analyzer Tests**:
- Test unused import detection with various import styles (default, named, namespace)
- Test unused function detection with different export patterns
- Test mixed logic detection with sample files containing multiple entities
- Test complexity calculation with known cyclomatic complexity examples

**File Reorganizer Tests**:
- Test grouping rules with sample file names and content
- Test import update logic with various import statement formats
- Test file splitting with multi-entity files
- Test dry-run mode to ensure no actual file changes

**Documentation Generator Tests**:
- Test template rendering with sample function data
- Test manual content preservation with existing documentation
- Test parameter extraction from TypeScript types
- Test documentation index generation

**Import Graph Builder Tests**:
- Test import parsing with various import syntaxes
- Test export parsing with default and named exports
- Test circular dependency detection with known circular graphs
- Test graph traversal algorithms

### Integration Tests

- Test end-to-end workflow: analyze → reorganize → document → validate
- Test pre-commit hook installation and execution
- Test documentation update when code changes
- Test RAG export generation with sample codebase

### Test Data

- Create sample TypeScript project with known issues (unused code, mixed logic)
- Include various React patterns (hooks, components, contexts)
- Include circular dependencies for testing detection
- Include existing documentation for testing preservation

### Performance Tests

- Test analysis performance with large codebase (1000+ files)
- Test documentation generation speed
- Test import graph building with deep dependency trees
- Measure memory usage during analysis

## Implementation Phases

### Phase 1: Core Analysis (Week 1-2)
- Implement Code Analyzer with TypeScript Compiler API
- Implement basic unused code detection
- Implement mixed logic detection
- Create analysis report generator

### Phase 2: File Reorganization (Week 2-3)
- Implement File Reorganizer with grouping rules
- Implement import update logic
- Implement dry-run and backup functionality
- Test with sample project

### Phase 3: Documentation Generation (Week 3-4)
- Implement Documentation Generator with templates
- Implement manual content preservation
- Implement documentation index generation
- Create CLI commands for documentation

### Phase 4: Import Graph & Validation (Week 4-5)
- Implement Import Graph Builder
- Implement circular dependency detection
- Implement Validation Engine
- Implement pre-commit hook installation

### Phase 5: AI Integration (Week 5-6)
- Implement RAG export functionality
- Implement graph query API
- Implement embedding generation (optional)
- Create integration examples

### Phase 6: Polish & Documentation (Week 6-7)
- Write comprehensive README
- Create usage examples and tutorials
- Implement CI/CD integration
- Performance optimization

## Technology Stack

- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js for command-line interface
- **Code Analysis**: TypeScript Compiler API (`typescript` package)
- **File Operations**: `fs-extra` for enhanced file system operations
- **Template Engine**: Handlebars for documentation templates
- **Markdown Parsing**: `remark` and `remark-parse` for parsing existing docs
- **Graph Visualization**: Mermaid syntax generation
- **Testing**: Vitest for unit and integration tests
- **Git Integration**: `simple-git` for Git operations
- **Configuration**: Cosmiconfig for flexible configuration loading

## Security Considerations

- **File System Access**: Validate all file paths to prevent directory traversal
- **Code Execution**: Never use `eval()` or execute generated code
- **Backup Integrity**: Verify backup creation before destructive operations
- **Git Safety**: Use `git mv` to preserve history, never force push
- **Configuration Validation**: Validate all user-provided configuration
- **Error Messages**: Avoid exposing sensitive file paths in public logs

## Performance Considerations

- **Parallel Processing**: Analyze multiple files concurrently using worker threads
- **Caching**: Cache TypeScript program and AST between operations
- **Incremental Analysis**: Only re-analyze changed files when possible
- **Memory Management**: Stream large files instead of loading entirely into memory
- **Index Optimization**: Use efficient data structures (Map, Set) for lookups
- **Lazy Loading**: Load documentation templates and configs only when needed

## Scalability

- **Large Codebases**: Tested with projects containing 1000+ files
- **Incremental Updates**: Support for updating only changed files
- **Distributed Processing**: Architecture supports future distributed analysis
- **Database Integration**: Can export to graph databases for very large projects
- **Cloud Storage**: Support for storing documentation in cloud storage (future)

## Monitoring and Observability

- **Progress Reporting**: Real-time progress updates during long operations
- **Metrics Collection**: Track analysis time, file counts, documentation coverage
- **Error Logging**: Structured logging with different severity levels
- **Performance Profiling**: Built-in profiling for identifying bottlenecks
- **Health Checks**: Validation commands to check system health
