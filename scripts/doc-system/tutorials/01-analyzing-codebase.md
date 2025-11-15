# Tutorial: Analyzing an Existing Codebase

This tutorial walks you through analyzing an existing React/TypeScript codebase to identify code quality issues and opportunities for improvement.

## Prerequisites

- Node.js 18+ installed
- TypeScript project with source code
- Documentation system installed in `scripts/doc-system/`

## Step 1: Initial Setup

First, ensure the documentation system is built:

```bash
cd scripts/doc-system
npm install
npx tsc
cd ../..
```

## Step 2: Run Basic Analysis

Run the analyzer on your source directory:

```bash
node scripts/doc-system/cli.js analyze --root ./src --output analysis-report.txt
```

This will scan all TypeScript and JavaScript files in `./src` and generate a report.

**Expected output:**
```
Analyzing codebase...
Found 45 files to analyze
Analyzing: src/components/DocumentList.tsx
Analyzing: src/hooks/useDocuments.ts
...
Analysis complete!
Report saved to: analysis-report.txt
```

## Step 3: Review the Analysis Report

Open `analysis-report.txt` to see the findings:

```bash
cat analysis-report.txt
# or
code analysis-report.txt
```

The report contains several sections:

### Executive Summary
Shows high-level counts of issues:
- Unused imports: 23
- Unused functions: 7
- Unused components: 3
- Mixed logic files: 12
- Split entities: 4

### Detailed Findings

Each section provides:
- File paths and line numbers
- Specific issues found
- Impact analysis
- Recommendations

## Step 4: Understand the Findings

### Unused Imports

```
src/components/DocumentList.tsx:
  Line 3: import { useState } from 'react' - UNUSED
  Line 5: import { formatDistance } from 'date-fns' - UNUSED
```

**What this means:** These imports are declared but never used in the file.

**Action:** Safe to remove. No runtime impact.

### Unused Functions

```
1. calculateScore
   File: src/lib/utils.ts
   Line: 45-58
   Exported: Yes
   Complexity: 6
   Impact: Not used anywhere in the codebase
```

**What this means:** Function is defined and exported but never called.

**Action:** Remove if not part of public API, or document if intentionally exported for external use.

### Mixed Logic Files

```
1. src/components/DocumentList.tsx
   Entities: 5 (Component, 2 hooks, 2 helper functions)
   Complexity: High (avg 8.2)
   Issues:
   - DocumentList component (UI)
   - useDocumentFilters hook (state management)
   - fetchDocumentsWithCache function (data fetching)
   - sortDocuments function (business logic)
   - formatDocumentDate function (formatting)
```

**What this means:** File contains multiple unrelated concerns that should be separated.

**Action:** Split into focused modules (see recommendations in report).

### Split Entities

```
1. Document Search Logic
   Split across:
   - src/components/SearchBar.tsx (UI + partial logic)
   - src/hooks/useSearch.ts (state management)
   - src/lib/search.ts (core search algorithm)
   - src/services/api.ts (API calls)
```

**What this means:** Related functionality is scattered across multiple files.

**Action:** Consolidate into a cohesive module.

## Step 5: Generate JSON Report for Programmatic Access

For automation or custom tooling:

```bash
node scripts/doc-system/cli.js analyze --root ./src --format json --output analysis.json
```

This creates a machine-readable JSON file:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "filesAnalyzed": 45,
  "unusedImports": [
    {
      "filePath": "src/components/DocumentList.tsx",
      "importName": "useState",
      "lineNumber": 3,
      "importSource": "react"
    }
  ],
  "unusedFunctions": [...],
  "mixedLogicFiles": [...],
  "statistics": {
    "totalIssues": 49,
    "criticalIssues": 7,
    "warnings": 42
  }
}
```

## Step 6: Analyze Specific Directories

To analyze only specific parts of your codebase:

```bash
# Analyze only services
node scripts/doc-system/cli.js analyze --root ./src/services

# Analyze only components
node scripts/doc-system/cli.js analyze --root ./src/components

# Analyze with exclusions
node scripts/doc-system/cli.js analyze --exclude "**/*.test.ts,**/*.spec.ts"
```

## Step 7: Adjust Complexity Threshold

If you want to focus on high-complexity functions:

```bash
node scripts/doc-system/cli.js analyze --complexity-threshold 15
```

This will only flag functions with cyclomatic complexity > 15.

## Step 8: Interpret Complexity Scores

Complexity scores indicate how difficult code is to understand and test:

- **1-5**: Low complexity (simple, easy to test)
- **6-10**: Medium complexity (moderate, manageable)
- **11-20**: High complexity (complex, needs refactoring)
- **20+**: Very high complexity (critical, refactor immediately)

## Step 9: Create an Action Plan

Based on the analysis, prioritize fixes:

### Priority 1: Quick Wins (Low Risk, High Impact)
1. Remove all unused imports (automated)
2. Remove unused functions (after verification)
3. Remove unused components

**Estimated time:** 2-4 hours

### Priority 2: Structural Improvements (Medium Risk, High Impact)
1. Split mixed logic files
2. Consolidate split entities
3. Reduce high-complexity functions

**Estimated time:** 1-2 weeks

### Priority 3: Documentation (Low Risk, High Value)
1. Generate documentation for all functions
2. Add manual descriptions
3. Set up validation

**Estimated time:** 1 week

## Step 10: Track Progress

Re-run analysis periodically to track improvements:

```bash
# Initial analysis
node scripts/doc-system/cli.js analyze --output analysis-before.txt

# After cleanup
node scripts/doc-system/cli.js analyze --output analysis-after.txt

# Compare
diff analysis-before.txt analysis-after.txt
```

## Common Patterns and Solutions

### Pattern: Barrel Files with Unused Exports

**Issue:**
```typescript
// src/utils/index.ts
export { formatDate } from './formatDate';
export { parseDate } from './parseDate';  // UNUSED
export { validateDate } from './validateDate';  // UNUSED
```

**Solution:** Remove unused exports or keep them if this is a public API.

### Pattern: Leftover Development Code

**Issue:**
```typescript
// Debug function left in production code
function debugLog(message: string) {
  console.log('[DEBUG]', message);
}
```

**Solution:** Remove debug code or move to development-only utilities.

### Pattern: Premature Abstraction

**Issue:**
```typescript
// Generic utility used only once
function mapAndFilter<T, U>(
  items: T[],
  mapper: (item: T) => U,
  filter: (item: U) => boolean
): U[] {
  return items.map(mapper).filter(filter);
}
```

**Solution:** Inline the function or wait until it's needed in multiple places.

## Next Steps

After analyzing your codebase:

1. **Clean up unused code** (see tutorial 02)
2. **Reorganize files** (see tutorial 03)
3. **Generate documentation** (see tutorial 04)
4. **Set up validation** (see tutorial 05)

## Tips and Best Practices

1. **Run analysis regularly**: Make it part of your code review process
2. **Don't over-optimize**: Focus on high-impact issues first
3. **Involve the team**: Discuss findings and agree on priorities
4. **Automate cleanup**: Use tools to remove unused imports automatically
5. **Track metrics**: Monitor complexity and coverage over time

## Troubleshooting

### Analysis is slow

**Solution:** Exclude unnecessary directories:
```bash
node scripts/doc-system/cli.js analyze --exclude "**/node_modules/**,**/dist/**,**/*.test.ts"
```

### False positives for unused code

**Solution:** Check if code is:
- Used in tests (excluded by default)
- Part of public API (intentionally exported)
- Used dynamically (string-based imports)

### TypeScript errors during analysis

**Solution:** Ensure your `tsconfig.json` is valid and TypeScript is installed:
```bash
npm install --save-dev typescript
npx tsc --noEmit
```

## Summary

You've learned how to:
- ✅ Run code analysis on your codebase
- ✅ Interpret analysis reports
- ✅ Identify different types of issues
- ✅ Create an action plan for improvements
- ✅ Track progress over time

Next: [Tutorial 02: Reorganizing Files](./02-reorganizing-files.md)
