# Tutorial: Reorganizing Files

This tutorial shows you how to reorganize your codebase into a logical, modular structure using the file reorganizer.

## Prerequisites

- Completed analysis of your codebase (Tutorial 01)
- Git repository (recommended for history preservation)
- Backup of your code (safety first!)

## Overview

The file reorganizer:
- Groups related files by domain (supabase, search, ui, utils, hooks)
- Splits mixed logic files into focused modules
- Updates all import statements automatically
- Preserves Git history when possible

## Step 1: Preview the Reorganization

Always start with a dry run to see what changes will be made:

```bash
node scripts/doc-system/cli.js reorganize --root ./src --dry-run
```

**Expected output:**
```
Reorganization Plan (DRY RUN - no changes will be made)
========================================================

File Moves (15):
  src/lib/supabase.ts → src/services/supabase/client.ts
  src/hooks/useSupabase.ts → src/hooks/useSupabase/useSupabase.ts
  ...

File Splits (3):
  src/components/DocumentList.tsx → 
    - src/components/ui/DocumentList/DocumentList.tsx
    - src/hooks/useDocumentFilters/useDocumentFilters.ts
    - src/services/supabase/queries/fetchDocuments.ts
  ...

Import Updates (47 files affected):
  src/pages/Dashboard.tsx: 3 imports to update
  src/components/SearchBar.tsx: 2 imports to update
  ...

Total changes: 65 operations
```

## Step 2: Review the Proposed Changes

Examine the plan carefully:

### File Moves

```
src/lib/supabase.ts → src/services/supabase/client.ts
```

**Why:** Groups Supabase-related code in a dedicated directory.

### File Splits

```
src/components/DocumentList.tsx →
  - src/components/ui/DocumentList/DocumentList.tsx (component)
  - src/hooks/useDocumentFilters/useDocumentFilters.ts (hook)
  - src/services/supabase/queries/fetchDocuments.ts (query)
```

**Why:** Separates UI, state management, and data fetching concerns.

### Import Updates

```
// Before
import { createClient } from '../lib/supabase';

// After
import { createClient } from '../services/supabase/client';
```

**Why:** Imports are automatically updated to match new file locations.

## Step 3: Customize Grouping Rules (Optional)

Create a `.docsystemrc.json` file to customize how files are grouped:

```json
{
  "reorganizer": {
    "groupingRules": [
      {
        "name": "supabase",
        "pattern": "supabase|database|db",
        "targetDirectory": "services/supabase",
        "priority": 1
      },
      {
        "name": "api",
        "pattern": "api|fetch|request",
        "targetDirectory": "services/api",
        "priority": 2
      },
      {
        "name": "ui",
        "pattern": "component|ui",
        "targetDirectory": "components/ui",
        "priority": 3
      }
    ]
  }
}
```

**Priority:** Lower numbers = higher priority. If a file matches multiple rules, the highest priority wins.

## Step 4: Create a Backup

Before making changes, create a backup:

```bash
# Manual backup
cp -r src src-backup

# Or let the tool create one
node scripts/doc-system/cli.js reorganize --backup
```

The tool creates a timestamped backup: `src-backup-2024-01-15-103000/`

## Step 5: Execute the Reorganization

Once you're satisfied with the plan:

```bash
node scripts/doc-system/cli.js reorganize --root ./src --backup
```

**Expected output:**
```
Creating backup: src-backup-2024-01-15-103000/
Backup created successfully

Executing reorganization...
[1/65] Moving src/lib/supabase.ts → src/services/supabase/client.ts
[2/65] Splitting src/components/DocumentList.tsx...
[3/65] Updating imports in src/pages/Dashboard.tsx...
...
[65/65] Complete!

Reorganization complete!
- 15 files moved
- 3 files split into 9 new files
- 47 files updated with new imports
- 0 errors

Next steps:
1. Review the changes
2. Run tests to ensure nothing broke
3. Commit the changes
```

## Step 6: Verify the Changes

Check that everything works:

### 1. Check File Structure

```bash
tree src/
```

Expected structure:
```
src/
├── components/
│   └── ui/
│       ├── DocumentList/
│       │   └── DocumentList.tsx
│       └── SearchBar/
│           └── SearchBar.tsx
├── hooks/
│   ├── useDocuments/
│   │   └── useDocuments.ts
│   └── useSearch/
│       └── useSearch.ts
├── services/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── queries/
│   │       ├── fetchDocuments.ts
│   │       └── createDocument.ts
│   └── search/
│       └── searchDocuments.ts
└── utils/
    ├── date/
    │   └── formatDate.ts
    └── validation/
        └── validateEmail.ts
```

### 2. Check Imports

Open a few files and verify imports are correct:

```typescript
// src/pages/Dashboard.tsx
import { DocumentList } from '../components/ui/DocumentList/DocumentList';
import { useDocuments } from '../hooks/useDocuments/useDocuments';
import { fetchDocuments } from '../services/supabase/queries/fetchDocuments';
```

### 3. Run TypeScript Compiler

```bash
npx tsc --noEmit
```

Should complete without errors.

### 4. Run Tests

```bash
npm test
```

All tests should pass.

### 5. Run the Application

```bash
npm run dev
```

Application should start and function normally.

## Step 7: Review Git Changes

If using Git with `--git-mv`:

```bash
git status
```

You'll see:
- Renamed files (preserves history)
- Modified files (import updates)
- New files (from splits)

```bash
# View changes
git diff

# View file history (preserved)
git log --follow src/services/supabase/client.ts
```

## Step 8: Commit the Changes

```bash
git add .
git commit -m "refactor: reorganize codebase into modular structure

- Group Supabase code in services/supabase/
- Group UI components in components/ui/
- Split mixed logic files into focused modules
- Update all import statements
"
```

## Advanced Usage

### Reorganize Specific Directories Only

```bash
# Only reorganize services
node scripts/doc-system/cli.js reorganize --root ./src/services

# Only reorganize components
node scripts/doc-system/cli.js reorganize --root ./src/components
```

### Use Custom Reorganization Plan

Create a custom plan file:

```json
{
  "moves": [
    {
      "sourcePath": "src/lib/utils.ts",
      "targetPath": "src/utils/general.ts",
      "reason": "Better naming"
    }
  ],
  "splits": [
    {
      "sourcePath": "src/lib/helpers.ts",
      "targetFiles": [
        {
          "path": "src/utils/date/formatDate.ts",
          "entities": ["formatDate", "parseDate"]
        },
        {
          "path": "src/utils/string/capitalize.ts",
          "entities": ["capitalize", "truncate"]
        }
      ]
    }
  ]
}
```

Apply the plan:

```bash
node scripts/doc-system/cli.js reorganize --plan custom-plan.json
```

### Disable Git Integration

If not using Git or want standard file operations:

```bash
node scripts/doc-system/cli.js reorganize --git-mv false
```

## Common Scenarios

### Scenario 1: Splitting a Large Utility File

**Before:**
```typescript
// src/lib/utils.ts (200 lines)
export function formatDate(date: Date): string { ... }
export function parseDate(str: string): Date { ... }
export function validateEmail(email: string): boolean { ... }
export function capitalize(str: string): string { ... }
```

**After reorganization:**
```
src/utils/
├── date/
│   ├── formatDate.ts
│   └── parseDate.ts
├── validation/
│   └── validateEmail.ts
└── string/
    └── capitalize.ts
```

### Scenario 2: Extracting Logic from Components

**Before:**
```typescript
// src/components/DocumentList.tsx (150 lines)
export function DocumentList() {
  // Component logic
  // Data fetching logic
  // Filtering logic
  // Sorting logic
}
```

**After reorganization:**
```
src/
├── components/ui/DocumentList/
│   └── DocumentList.tsx (50 lines - UI only)
├── hooks/useDocuments/
│   └── useDocuments.ts (40 lines - state)
└── services/supabase/queries/
    └── fetchDocuments.ts (30 lines - data)
```

### Scenario 3: Consolidating Split Entities

**Before:**
```
src/
├── components/SearchBar.tsx (partial search logic)
├── hooks/useSearch.ts (search state)
├── lib/search.ts (search algorithm)
└── services/api.ts (search API calls)
```

**After reorganization:**
```
src/
├── components/ui/SearchBar/
│   └── SearchBar.tsx (UI only)
├── hooks/useSearch/
│   └── useSearch.ts (state only)
└── services/search/
    └── searchDocuments.ts (all search logic)
```

## Rollback if Needed

If something goes wrong:

### Option 1: Restore from Backup

```bash
rm -rf src
mv src-backup-2024-01-15-103000 src
```

### Option 2: Git Reset

```bash
git reset --hard HEAD
```

### Option 3: Git Revert

```bash
git revert HEAD
```

## Best Practices

1. **Always dry-run first**: Preview changes before applying
2. **Create backups**: Safety net for unexpected issues
3. **Test thoroughly**: Run tests after reorganization
4. **Commit incrementally**: Don't mix reorganization with other changes
5. **Review imports**: Spot-check a few files manually
6. **Update documentation**: Reflect new structure in docs
7. **Communicate with team**: Coordinate large refactorings

## Troubleshooting

### Issue: Import paths are broken

**Cause:** Relative imports may need adjustment

**Solution:**
```bash
# Re-run with import updates
node scripts/doc-system/cli.js reorganize --update-imports
```

### Issue: Tests fail after reorganization

**Cause:** Test imports or mocks may need updates

**Solution:** Update test files manually or exclude from reorganization:
```bash
node scripts/doc-system/cli.js reorganize --exclude "**/*.test.ts"
```

### Issue: Git history is lost

**Cause:** Used standard file operations instead of `git mv`

**Solution:** Next time, use `--git-mv` flag (default)

### Issue: Too many changes at once

**Cause:** Reorganizing entire codebase

**Solution:** Reorganize incrementally:
```bash
# Step 1: Services only
node scripts/doc-system/cli.js reorganize --root ./src/services

# Step 2: Components only
node scripts/doc-system/cli.js reorganize --root ./src/components

# Step 3: Utils only
node scripts/doc-system/cli.js reorganize --root ./src/utils
```

## Summary

You've learned how to:
- ✅ Preview reorganization changes with dry-run
- ✅ Customize grouping rules
- ✅ Execute file reorganization safely
- ✅ Verify changes and test
- ✅ Handle common scenarios
- ✅ Rollback if needed

Next: [Tutorial 03: Generating Documentation](./03-generating-documentation.md)
