# File Reorganizer Module

The File Reorganizer module restructures the codebase based on analysis results and logical grouping rules.

## Features

### Task 3.1: Reorganization Planning Logic ✅
- Creates reorganization plans based on analysis results
- Applies grouping rules (supabase, search, ui, utils, hooks, services, contexts)
- Generates file moves, splits, merges, and deletions
- Supports priority-based rule matching

### Task 3.2: File Movement and Import Updates ✅
- Executes reorganization plans with dry-run support
- Updates import statements when files move using AST transformation
- Integrates with Git to preserve file history using `git mv`
- Handles relative and absolute import paths correctly

### Task 3.3: File Splitting Logic ✅
- Splits mixed logic files into multiple focused files
- Extracts individual entities (functions, components, classes) with dependencies
- Generates new file content with proper imports and exports
- Updates all references to split entities across the codebase

### Task 3.4: Backup and Rollback Functionality ✅
- Creates automatic backups before reorganization
- Implements rollback mechanism to restore previous state on errors
- Provides transaction-like behavior for atomic file operations
- Manages backup cleanup (keeps last N backups)

## Usage

```typescript
import { FileReorganizer } from './reorganizer';
import { DEFAULT_CONFIG } from './config';

const reorganizer = new FileReorganizer(
  DEFAULT_CONFIG.reorganizer,
  process.cwd()
);

// Create a reorganization plan
const plan = await reorganizer.createReorganizationPlan(analysisResult);

// Execute the plan (dry-run by default)
await reorganizer.executeReorganizationPlan(plan, true);

// Execute for real
await reorganizer.executeReorganizationPlan(plan, false);

// Rollback if needed
await reorganizer.rollback();
```

## Architecture

- **FileReorganizer.ts**: Main class with planning logic
- **FileReorganizerExecution.ts**: Execution methods (move, split, merge, delete)
- **types.ts**: TypeScript interfaces for reorganization operations
- **index.ts**: Module exports

## Grouping Rules

Files are organized based on these default rules (by priority):

1. **Supabase** (`lib/supabase`): Files with supabase, database, or db in name
2. **Search** (`lib/search`): Files with search, filter, or query in name
3. **Hooks** (`hooks`): Files starting with `use` (React hooks)
4. **Services** (`services`): Files with service, api, or client in name
5. **Context** (`contexts`): Files with context or provider in name
6. **UI** (`components`): Files with component or ui in name
7. **Utils** (`utils`): Files with util, helper, or common in name

## Safety Features

- **Dry-run mode**: Preview changes before applying
- **Automatic backups**: Created before any modifications
- **Git integration**: Preserves file history when possible
- **Rollback support**: Restore previous state on errors
- **Import updates**: Automatically fixes import paths
