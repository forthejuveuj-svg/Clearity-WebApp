# Documentation Drift Prevention Module

This module provides comprehensive tools for preventing documentation drift - the state when code changes but documentation remains outdated.

## Components

### 1. ChangeDetector

Monitors code changes and identifies which documentation files are affected.

**Features:**
- File watcher for real-time change detection
- Git integration for detecting changes since a commit
- Identifies affected documentation based on code changes
- Debounced processing to handle rapid changes

**Usage:**
```typescript
import { ChangeDetector } from './drift/ChangeDetector.js';

const detector = new ChangeDetector({
  rootPath: process.cwd(),
  docsPath: './docs',
  ignorePatterns: ['node_modules/**', 'dist/**'],
  debounceMs: 1000,
});

// Start watching for changes
detector.startWatching(async (result) => {
  console.log(`Detected ${result.changes.length} changes`);
  console.log(`Affected docs: ${result.affectedDocs.length}`);
});

// Or detect changes from git
const result = await detector.detectChangesFromGit('HEAD~1');
```

### 2. AutoUpdater

Automatically updates documentation when code changes are detected.

**Features:**
- Auto-update Input section when function signature changes
- Auto-update all references when function is renamed
- Remove or archive documentation when function is deleted
- Preserve manual content during automatic updates

**Usage:**
```typescript
import { AutoUpdater } from './drift/AutoUpdater.js';

const updater = new AutoUpdater(
  process.cwd(),
  './docs',
  docConfig
);

// Auto-update based on detected changes
const results = await updater.autoUpdateDocumentation(
  changes,
  affectedDocs
);

// Update references when function is renamed
await updater.updateReferencesOnRename(
  'oldFunctionName',
  'newFunctionName',
  './src/utils.ts'
);
```

### 3. DriftDetector

Detects mismatches between code and documentation.

**Features:**
- Compare function signatures, parameter types, and return types
- Detect missing documentation for exported functions
- Detect orphaned documentation (docs without source)
- Generate comprehensive drift reports

**Usage:**
```typescript
import { DriftDetector } from './drift/DriftDetector.js';

const detector = new DriftDetector(
  process.cwd(),
  './docs'
);

// Detect all drift
const report = await detector.detectDrift();

// Generate drift report
await detector.generateDriftReport('./drift-report.json');

// Compare specific signatures
const comparison = await detector.compareSignatures(
  './src/utils.ts',
  'myFunction',
  './docs/utils/myFunction.md'
);
```

## Workflow Integration

### Real-time Monitoring

```typescript
import { ChangeDetector, AutoUpdater } from './drift/index.js';

const detector = new ChangeDetector(config);
const updater = new AutoUpdater(rootPath, docsPath, docConfig);

detector.startWatching(async (result) => {
  // Automatically update affected documentation
  await updater.autoUpdateDocumentation(
    result.changes,
    result.affectedDocs
  );
});
```

### Pre-commit Hook

The drift detection is integrated into the validation engine and runs automatically in the pre-commit hook:

```bash
# Install pre-commit hook
npm run doc-system validate -- --install-hook

# The hook will:
# 1. Detect changed files
# 2. Check for documentation drift
# 3. Block commit if critical drift is found
# 4. Allow commit with warnings
```

### CI/CD Integration

Drift detection is included in the CI validation workflow:

```yaml
- name: Validate documentation
  run: npm run doc-system validate
  
# This will:
# - Run all validation rules
# - Detect documentation drift
# - Fail build if critical issues found
```

## Drift Types

### 1. Signature Drift (Critical)
Function signature has changed but documentation hasn't been updated.

**Example:**
```typescript
// Code changed from:
function greet(name: string): string

// To:
function greet(name: string, age: number): string

// But documentation still shows only one parameter
```

**Action:** Update Input and Output sections in documentation

### 2. Missing Documentation (Critical)
Exported function exists but has no documentation.

**Example:**
```typescript
// New exported function added
export function newFeature() { ... }

// But no documentation file exists
```

**Action:** Generate documentation using `npm run doc-system document`

### 3. Orphaned Documentation (Warning)
Documentation exists but source file or function not found.

**Example:**
```markdown
# docs/utils/oldFunction.md exists

# But function was deleted from source
```

**Action:** Archive or delete the documentation file

### 4. Outdated Content (Warning)
Documentation contains placeholder text that needs to be filled in.

**Example:**
```markdown
### Purpose
[Description needed]
```

**Action:** Review and update with actual descriptions

### 5. Renamed Function (Info)
Function was renamed but documentation references old name.

**Example:**
```typescript
// Function renamed from getUserData to fetchUserData
```

**Action:** Update all references in documentation

## Configuration

The drift prevention module uses the same configuration as the main doc-system:

```json
{
  "drift": {
    "autoUpdate": true,
    "watchMode": false,
    "debounceMs": 1000,
    "archiveDeleted": true
  }
}
```

## Best Practices

1. **Enable Auto-update**: Let the system automatically update Input/Output sections
2. **Review Changes**: Always review auto-generated updates before committing
3. **Run Drift Detection**: Run `npm run doc-system drift` regularly
4. **Fix Critical Issues**: Address signature drift immediately
5. **Archive, Don't Delete**: Archive orphaned docs instead of deleting them

## Commands

```bash
# Detect drift
npm run doc-system drift

# Generate drift report
npm run doc-system drift --report drift-report.json

# Watch for changes and auto-update
npm run doc-system drift --watch

# Compare specific function
npm run doc-system drift --compare src/utils.ts:myFunction
```

## Requirements Addressed

This module addresses the following requirements from the spec:

- **Requirement 9.1**: File watcher to detect code changes and identify affected documentation
- **Requirement 9.2**: Auto-update Input section when function signature changes
- **Requirement 9.3**: Auto-update all references when function is renamed
- **Requirement 9.4**: Remove or archive documentation when function is deleted
- **Requirement 9.5**: Detect mismatches between code and documentation
- **Requirement 9.6**: Compare function signatures, parameter types, and return types
- **Requirement 9.7**: Generate drift report listing all outdated documentation
- **Requirement 9.7**: Fail CI build if critical documentation is missing or outdated

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Code Changes                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   ChangeDetector      │
         │  - File watcher       │
         │  - Git integration    │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Affected Docs List   │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  AutoUpdater  │         │DriftDetector │
│ - Update docs │         │ - Find drift │
│ - Preserve    │         │ - Generate   │
│   manual      │         │   reports    │
└───────────────┘         └──────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  ValidationEngine     │
         │  - Pre-commit hook    │
         │  - CI integration     │
         └───────────────────────┘
```

## Error Handling

The module handles various error scenarios:

- **Source file not found**: Marks documentation as orphaned
- **Function not found**: Suggests archiving documentation
- **Parse errors**: Logs error and continues with other files
- **File system errors**: Provides clear error messages
- **Git errors**: Falls back to file system scanning

## Performance

- **Debouncing**: Prevents excessive processing during rapid changes
- **Incremental**: Only processes changed files
- **Parallel**: Processes multiple files concurrently
- **Caching**: Caches AST parsing results

## Future Enhancements

- Semantic diff detection (not just signature changes)
- AI-powered content update suggestions
- Integration with version control for tracking drift over time
- Dashboard for visualizing drift trends
- Automated PR creation for drift fixes
