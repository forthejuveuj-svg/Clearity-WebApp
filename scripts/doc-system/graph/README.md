# Import Graph Builder Module

The Import Graph Builder module analyzes import/export relationships in the codebase and builds a dependency graph. This graph is used to:

1. Track which files import specific functions
2. Detect circular dependencies
3. Identify unused functions
4. Update documentation with usage information

## Components

### ImportGraphBuilder

The main class that builds and maintains the import graph.

**Key Methods:**

- `buildGraph()`: Analyzes all TypeScript/JavaScript files and builds the complete import graph
- `analyzeImports(filePath)`: Parses import statements from a file
- `analyzeExports(filePath)`: Parses export statements from a file
- `findUsages(functionName)`: Finds all files that import a specific function
- `detectCircularDependencies()`: Detects circular import cycles
- `exportToMermaid()`: Exports the graph as a Mermaid diagram
- `exportToJSON()`: Exports the graph as JSON
- `getAllUsages()`: Gets usage information for all exported functions

### GraphDocumentationIntegration

Integrates the import graph with the documentation generator to automatically update documentation with usage information.

**Key Methods:**

- `updateAllDocumentationWithUsage()`: Updates all documentation files with "Used In" information
- `getUnusedFunctions()`: Returns a list of functions that are never imported
- `updateDocumentationForChangedImports(changedFiles)`: Updates documentation when imports change
- `generateCircularDependencyReport()`: Generates a report of circular dependencies
- `getUsageStatistics()`: Returns statistics about function usage

## Usage Example

```typescript
import { ImportGraphBuilder, GraphDocumentationIntegration } from './graph';
import { DocumentationGenerator } from './generator';

// Create instances
const graphBuilder = new ImportGraphBuilder('/path/to/project');
const docGenerator = new DocumentationGenerator(config, '/path/to/project');
const integration = new GraphDocumentationIntegration(
  graphBuilder,
  docGenerator,
  '/path/to/project'
);

// Build the graph
await graphBuilder.buildGraph();

// Update documentation with usage information
await integration.updateAllDocumentationWithUsage();

// Detect circular dependencies
const cycles = graphBuilder.detectCircularDependencies();
console.log(`Found ${cycles.length} circular dependencies`);

// Get unused functions
const unused = integration.getUnusedFunctions();
console.log(`Found ${unused.length} unused functions`);

// Export graph for visualization
const mermaid = graphBuilder.exportToMermaid();
console.log(mermaid);

// Get usage statistics
const stats = integration.getUsageStatistics();
console.log(`Usage rate: ${stats.usedFunctions}/${stats.totalFunctions}`);
```

## Data Structures

### ImportGraph

```typescript
interface ImportGraph {
  nodes: Map<string, GraphNode>;  // Map of file paths to nodes
  edges: GraphEdge[];              // Array of import relationships
}
```

### GraphNode

```typescript
interface GraphNode {
  filePath: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  type: 'function' | 'component' | 'module';
}
```

### GraphEdge

```typescript
interface GraphEdge {
  from: string;           // File that imports
  to: string;             // File that is imported
  importedSymbols: string[];  // Names of imported symbols
}
```

## Features

### Import Analysis

The module analyzes various import patterns:

- Default imports: `import X from 'module'`
- Named imports: `import { x, y } from 'module'`
- Namespace imports: `import * as X from 'module'`
- Mixed imports: `import X, { y } from 'module'`

### Export Analysis

The module analyzes various export patterns:

- Function exports: `export function foo() {}`
- Variable exports: `export const foo = ...`
- Class exports: `export class Foo {}`
- Type exports: `export type Foo = ...`
- Interface exports: `export interface Foo {}`
- Default exports: `export default foo`

### Circular Dependency Detection

Uses depth-first search to detect cycles in the import graph. Each cycle is reported with:

- The complete cycle path
- Severity level (warning/error)
- Normalized representation to avoid duplicates

### Usage Tracking

Tracks which files use each exported function:

- Builds a usage map from import relationships
- Identifies unused exports
- Calculates usage statistics
- Updates documentation with "Used In" sections

## Integration with Documentation

The graph builder integrates with the documentation generator to:

1. **Populate "Used In" sections**: Automatically lists all files that import each function
2. **Mark unused functions**: Identifies functions that are never imported
3. **Update on changes**: Refreshes usage information when imports change
4. **Track dependencies**: Includes dependency information in documentation index

## Performance Considerations

- Uses TypeScript Compiler API for accurate parsing
- Caches the TypeScript program for efficiency
- Uses Map data structures for O(1) lookups
- Processes files in parallel when possible
- Supports incremental updates for changed files

## Limitations

- Only tracks imports within the project (not node_modules)
- Requires valid TypeScript/JavaScript syntax
- Does not track dynamic imports (`import()`)
- Does not track require() statements (CommonJS)
