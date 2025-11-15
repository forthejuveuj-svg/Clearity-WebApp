# Documentation Generator Module

The Documentation Generator module creates and maintains Markdown documentation files for functions and logical groups in the codebase.

## Features

- **Function Documentation**: Generates detailed documentation for individual functions including:
  - Purpose and description
  - Input parameters with types
  - Return type and description
  - Usage locations
  - Complexity score
  - Group membership

- **Group Documentation**: Creates summary documentation for logical groups including:
  - Overview and description
  - Technologies used
  - External connections
  - List of associated functions
  - Statistics (function count, average complexity)

- **Manual Content Preservation**: Preserves manually written content when regenerating documentation

- **Documentation Index**: Generates both JSON and human-readable indexes of all documentation

## Usage

### Basic Usage

```typescript
import { DocumentationGenerator } from './generator/DocumentationGenerator.js';
import { DEFAULT_CONFIG } from './config.js';

const generator = new DocumentationGenerator(
  DEFAULT_CONFIG.documentation,
  process.cwd()
);

// Generate function documentation
await generator.generateFunctionDoc(
  entity,
  filePath,
  sourceFile,
  'MyGroup'
);

// Generate group documentation
await generator.generateGroupDoc(
  'MyGroup',
  functionSummaries,
  'Description of the group',
  ['React', 'TypeScript'],
  ['Supabase', 'External API']
);

// Generate documentation index
await generator.generateDocumentationIndex(
  functionDocs,
  groupDocs
);
```

### Templates

The generator uses Handlebars templates located in `scripts/doc-system/templates/`:

- `function.hbs`: Template for function documentation
- `group.hbs`: Template for group documentation

### Manual Content Preservation

When regenerating documentation, the generator:

1. Reads existing documentation files
2. Extracts manually written sections (non-placeholder content)
3. Merges manual content with newly generated content
4. Preserves manual edits while updating auto-generated sections

Sections that are preserved:
- Purpose descriptions
- Return value descriptions
- Group overviews
- Technologies lists
- External connections lists

### Documentation Index

The generator creates two index files:

1. **index.json**: Machine-readable JSON format containing:
   - All functions with metadata
   - All groups with function lists
   - Statistics (coverage, complexity, counts)

2. **INDEX.md**: Human-readable Markdown format with:
   - Statistics summary
   - Groups with function lists
   - Complete function table

## Configuration

Configure the generator through `DocumentationConfig`:

```typescript
interface DocumentationConfig {
  outputDir: string;           // Where to write documentation files
  templatesDir: string;        // Location of Handlebars templates
  preserveManual: boolean;     // Whether to preserve manual edits
  generateIndex: boolean;      // Whether to generate index files
}
```

## Output Structure

```
docs/
├── index.json                 # JSON index
├── INDEX.md                   # Human-readable index
├── groups/                    # Group documentation
│   ├── supabase.md
│   ├── search.md
│   └── ui.md
└── src/                       # Function documentation (mirrors source structure)
    ├── lib/
    │   ├── utils/
    │   │   └── myFunction.md
    │   └── supabase/
    │       └── client.md
    └── components/
        └── MyComponent.md
```

## API Reference

### DocumentationGenerator

#### `generateFunctionDoc(entity, filePath, sourceFile, group?)`

Generates documentation for a single function.

**Parameters:**
- `entity`: CodeEntity - The function entity from code analysis
- `filePath`: string - Path to the source file
- `sourceFile`: ts.SourceFile - TypeScript AST source file
- `group`: string (optional) - Logical group name

**Returns:** Promise<string> - Path to generated documentation file

#### `generateGroupDoc(groupName, functions, description?, technologies?, externalConnections?)`

Generates documentation for a logical group.

**Parameters:**
- `groupName`: string - Name of the group
- `functions`: FunctionSummary[] - List of functions in the group
- `description`: string (optional) - Group description
- `technologies`: string[] (optional) - Technologies used
- `externalConnections`: string[] (optional) - External services

**Returns:** Promise<string> - Path to generated documentation file

#### `generateDocumentationIndex(functionDocs, groupDocs)`

Generates documentation index files.

**Parameters:**
- `functionDocs`: Map<string, FunctionDocumentation> - All function documentation
- `groupDocs`: Map<string, string> - All group documentation paths

**Returns:** Promise<void>

#### `extractManualContent(docPath)`

Extracts manually written content from existing documentation.

**Parameters:**
- `docPath`: string - Path to existing documentation file

**Returns:** Promise<ManualContent> - Extracted manual sections

#### `mergeManualContent(generated, manual)`

Merges manual content with generated content.

**Parameters:**
- `generated`: string - Newly generated documentation
- `manual`: ManualContent - Manually written sections

**Returns:** string - Merged documentation

#### `updateExistingDoc(docPath, newDoc)`

Updates existing documentation while preserving manual edits.

**Parameters:**
- `docPath`: string - Path to documentation file
- `newDoc`: FunctionDocumentation | GroupDocumentation - New documentation data

**Returns:** Promise<void>

## Complexity Calculation

The generator calculates cyclomatic complexity by counting:
- Decision points (if, switch, for, while, etc.)
- Logical operators (&&, ||)
- Base complexity of 1

Complexity interpretation:
- **1-5**: Low complexity ✓
- **6-10**: Moderate complexity ℹ️
- **11+**: High complexity ⚠️ (consider refactoring)

## Examples

See the templates directory for example output formats.
