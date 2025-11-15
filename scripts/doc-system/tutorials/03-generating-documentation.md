# Tutorial: Generating Documentation

This tutorial shows you how to generate comprehensive Markdown documentation for your entire codebase.

## Prerequisites

- Analyzed and optionally reorganized codebase
- TypeScript project with functions to document

## Overview

The documentation generator creates:
- **Function docs**: One Markdown file per function with purpose, inputs, outputs, and usage
- **Group docs**: Summary documentation for logical groups of functions
- **Documentation index**: JSON file mapping all functions to their docs

## Step 1: Generate Initial Documentation

Run the documentation generator:

```bash
node scripts/doc-system/cli.js document --root ./src --output ./docs
```

**Expected output:**
```
Generating documentation...
Analyzing source files...
Found 38 functions to document

[1/38] Generating docs for fetchDocuments...
[2/38] Generating docs for createDocument...
[3/38] Generating docs for DocumentList...
...
[38/38] Complete!

Generating group documentation...
[1/5] Generating docs for supabase group...
[2/5] Generating docs for search group...
...
[5/5] Complete!

Generating documentation index...
Index saved to: docs/index.json

Documentation generation complete!
- 38 function docs created
- 5 group docs created
- 1 index file created
- Documentation coverage: 100%
```

## Step 2: Review Generated Documentation

Check the documentation structure:

```bash
tree docs/
```

Expected structure:
```
docs/
├── services/
│   ├── supabase/
│   │   ├── client/
│   │   │   └── createClient.md
│   │   └── queries/
│   │       ├── fetchDocuments.md
│   │       ├── createDocument.md
│   │       └── updateDocument.md
│   └── search/
│       └── searchDocuments.md
├── components/
│   └── ui/
│       ├── DocumentList.md
│       └── SearchBar.md
├── hooks/
│   ├── useDocuments.md
│   └── useSearch.md
├── utils/
│   ├── date/
│   │   └── formatDate.md
│   └── validation/
│       └── validateEmail.md
├── groups/
│   ├── supabase.md
│   ├── search.md
│   ├── ui-components.md
│   ├── hooks.md
│   └── utils.md
└── index.json
```

## Step 3: Examine a Function Documentation File

Open a generated function doc:

```bash
cat docs/services/supabase/queries/fetchDocuments.md
```

You'll see:

```markdown
# fetchDocuments

**Path:** `src/services/supabase/queries/fetchDocuments.ts`

### Purpose
[TODO: Add description of what this function does and why it exists]

### Input
- `filters` (object, optional): Filter criteria for the query
  - `userId` (string, optional): Filter documents by user ID
  - `status` (string, optional): Filter by document status
- `pagination` (object, optional): Pagination parameters
  - `page` (number, optional): Page number (default: 1)
  - `pageSize` (number, optional): Items per page (default: 20)

### Output
Returns `Promise<{ data: Document[], count: number, error: Error | null }>`

### Used In
- `src/hooks/useDocuments/useDocuments.ts`
- `src/components/ui/DocumentList/DocumentList.tsx`
- `src/pages/Dashboard/Dashboard.tsx`

### Complexity
Cyclomatic Complexity: 8 (Medium)

### Group
supabase

### Dependencies
- `@supabase/supabase-js`
- `src/services/supabase/client/createClient.ts`
- `src/types/Document.ts`
```

## Step 4: Fill in Manual Content

The generator creates placeholders for manual content. Edit the files to add:

### Purpose Section

Replace the TODO with a clear description:

```markdown
### Purpose
Fetches documents from the Supabase database with optional filtering and pagination. 
This function handles authentication, constructs the appropriate query based on filter 
parameters, and returns a typed result set. It includes error handling for network 
failures and permission issues.
```

### Notes Section (Optional)

Add any important notes:

```markdown
### Notes
This function requires an authenticated Supabase session. If called without 
authentication, it will return an empty result set with an authentication error. 
Consider using the `useDocuments` hook instead of calling this function directly, 
as the hook provides caching and automatic refetching.
```

### Example Usage (Optional)

Add code examples:

```markdown
### Example Usage

\`\`\`typescript
import { fetchDocuments } from './fetchDocuments';

// Fetch all published documents
const result = await fetchDocuments({
  filters: { status: 'published' },
  pagination: { page: 1, pageSize: 10 }
});

if (result.error) {
  console.error('Failed to fetch documents:', result.error);
} else {
  console.log(\`Found \${result.count} documents\`, result.data);
}
\`\`\`
```

## Step 5: Review Group Documentation

Open a group doc:

```bash
cat docs/groups/supabase.md
```

You'll see:

```markdown
# Supabase Integration

### Overview
[TODO: Add description of this group's purpose and scope]

### Technologies
- @supabase/supabase-js

### External Connections
[TODO: List external APIs, services, or databases]

### Associated Functions

#### Client Management

- **createClient** (`src/services/supabase/client/createClient.ts`)
  - Purpose: [Auto-generated or manual]
  - Complexity: 3 (Low)
  - Used in: 12 files

#### Database Queries

- **fetchDocuments** (`src/services/supabase/queries/fetchDocuments.ts`)
  - Purpose: [Auto-generated or manual]
  - Complexity: 8 (Medium)
  - Used in: 4 files

[... more functions]
```

## Step 6: Fill in Group Documentation

Add manual content to group docs:

### Overview

```markdown
### Overview
The Supabase integration module provides a complete interface for interacting with 
the Supabase backend, including authentication, database queries, real-time 
subscriptions, and file storage. This module abstracts the Supabase client and 
provides type-safe, domain-specific functions for all backend operations.
```

### External Connections

```markdown
### External Connections
- **Supabase API**: `https://[project-id].supabase.co`
  - REST API for database operations
  - WebSocket for real-time subscriptions
  - Storage API for file operations
- **Authentication Providers**:
  - Email/Password authentication
  - OAuth providers (Google, GitHub)
```

### Additional Sections

Add custom sections as needed:

```markdown
### Error Handling
All Supabase functions follow a consistent error handling pattern:
- Return type: `{ data: T | null, error: Error | null }`
- Network errors are caught and wrapped in descriptive Error objects
- Authentication errors return specific error codes

### Performance Considerations
- Connection pooling: Supabase client reuses connections automatically
- Query optimization: All queries use indexes and avoid N+1 problems
- Caching: Consider using React Query or SWR for client-side caching

### Security Notes
- All database operations respect Row Level Security (RLS) policies
- API keys are stored in environment variables, never in code
- File uploads are validated for type and size before processing
```

## Step 7: Incremental Updates

When code changes, update only affected documentation:

```bash
node scripts/doc-system/cli.js document --incremental
```

This:
- Detects which files changed since last generation
- Updates only affected function docs
- Preserves manual content
- Updates "Used In" sections
- Regenerates the index

## Step 8: Verify Documentation Coverage

Check the documentation index:

```bash
cat docs/index.json | jq '.statistics'
```

Output:
```json
{
  "totalFunctions": 38,
  "totalGroups": 5,
  "documentedFunctions": 38,
  "documentationCoverage": 100,
  "averageComplexity": 6.2
}
```

## Step 9: Validate Documentation

Run validation to check for issues:

```bash
node scripts/doc-system/cli.js validate
```

Output:
```
Validating documentation...

Errors (3):
  ✗ docs/services/supabase/queries/fetchDocuments.md
    - Purpose section contains placeholder text

  ✗ docs/hooks/useSearch.md
    - Purpose section contains placeholder text

  ✗ docs/utils/validation/validateEmail.md
    - Purpose section contains placeholder text

Warnings (0):

Validation failed: 3 errors, 0 warnings
```

Fix the errors by filling in the purpose sections.

## Advanced Usage

### Custom Templates

Create custom documentation templates:

1. Copy default templates:
```bash
cp scripts/doc-system/templates/function-doc.md my-templates/
```

2. Modify the template:
```markdown
# {{functionName}}

**File:** `{{filePath}}`
**Author:** {{author}}
**Last Modified:** {{lastModified}}

## Description
{{purpose}}

## Parameters
{{parameters}}

## Returns
{{returnType}}

## Usage Examples
{{examples}}
```

3. Use custom templates:
```bash
node scripts/doc-system/cli.js document --templates ./my-templates
```

### Preserve Existing Documentation

If you have existing docs, preserve manual content:

```bash
node scripts/doc-system/cli.js document --preserve-manual
```

The generator:
- Extracts manual content from existing docs
- Merges it with auto-generated content
- Preserves: Purpose, Notes, Examples, Group Overview
- Updates: Input, Output, Used In, Complexity

### Generate Documentation for Specific Files

```bash
# Document only services
node scripts/doc-system/cli.js document --root ./src/services

# Document only components
node scripts/doc-system/cli.js document --root ./src/components
```

### Export Documentation Index

The index can be used for:
- Search functionality
- Documentation websites
- AI/RAG systems
- Analytics

```bash
# Pretty-print the index
cat docs/index.json | jq '.'

# Extract specific information
cat docs/index.json | jq '.functions[] | select(.complexity > 10)'
```

## Documentation Workflow

### Initial Setup (One-time)

1. Generate all documentation
2. Fill in purpose sections
3. Add examples where helpful
4. Review and commit

### Ongoing Maintenance

1. Code changes trigger validation (pre-commit hook)
2. Update affected documentation
3. Commit code and docs together

### Periodic Review

1. Check documentation coverage
2. Update outdated examples
3. Add missing notes
4. Improve group overviews

## Best Practices

1. **Write clear purposes**: Explain what and why, not how
2. **Add examples**: Show common use cases
3. **Document edge cases**: Note important limitations
4. **Keep it current**: Update docs when code changes
5. **Use consistent style**: Follow the template structure
6. **Link related docs**: Reference related functions
7. **Include context**: Explain when to use vs alternatives

## Common Patterns

### Pattern: Documenting React Hooks

```markdown
# useDocuments

### Purpose
Custom React hook that manages document fetching, caching, and real-time updates. 
Provides a simple interface for components to access documents without managing 
state or subscriptions directly.

### Input
- `filters` (object, optional): Filter criteria
- `options` (object, optional): Hook options
  - `enabled` (boolean): Whether to fetch immediately (default: true)
  - `refetchInterval` (number): Auto-refetch interval in ms

### Output
Returns object with:
- `documents` (Document[]): Array of documents
- `isLoading` (boolean): Loading state
- `error` (Error | null): Error if fetch failed
- `refetch` (() => void): Function to manually refetch

### Example Usage
\`\`\`typescript
function DocumentList() {
  const { documents, isLoading, error } = useDocuments({
    filters: { status: 'published' }
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <List items={documents} />;
}
\`\`\`
```

### Pattern: Documenting Utility Functions

```markdown
# formatDate

### Purpose
Formats a Date object into a human-readable string using the specified format. 
Handles timezone conversion and locale-specific formatting.

### Input
- `date` (Date): Date to format
- `format` (string, optional): Format string (default: 'MMM dd, yyyy')
- `options` (object, optional): Formatting options
  - `locale` (string): Locale code (default: 'en-US')
  - `timezone` (string): Timezone (default: user's timezone)

### Output
Returns `string`: Formatted date string

### Example Usage
\`\`\`typescript
const date = new Date('2024-01-15');
formatDate(date); // "Jan 15, 2024"
formatDate(date, 'yyyy-MM-dd'); // "2024-01-15"
formatDate(date, 'PPP', { locale: 'fr-FR' }); // "15 janvier 2024"
\`\`\`

### Notes
Uses date-fns internally. See date-fns documentation for format string options.
```

### Pattern: Documenting API Functions

```markdown
# fetchDocuments

### Purpose
Fetches documents from the Supabase database with filtering, pagination, and sorting. 
Handles authentication, error cases, and returns typed results.

### Input
- `filters` (object, optional): Query filters
- `pagination` (object, optional): Pagination params
- `sortBy` (object, optional): Sort configuration

### Output
Returns `Promise<{ data: Document[], count: number, error: Error | null }>`

### Error Handling
- Network errors: Returns error with message
- Auth errors: Returns 401 error
- Permission errors: Returns 403 error
- Not found: Returns empty array with count 0

### Example Usage
\`\`\`typescript
const result = await fetchDocuments({
  filters: { status: 'published', userId: '123' },
  pagination: { page: 1, pageSize: 20 },
  sortBy: { field: 'created_at', order: 'desc' }
});

if (result.error) {
  handleError(result.error);
} else {
  console.log(\`Found \${result.count} documents\`);
  displayDocuments(result.data);
}
\`\`\`
```

## Troubleshooting

### Issue: Documentation not generated for some functions

**Cause:** Functions may not be exported or detected

**Solution:** Ensure functions are exported:
```typescript
export function myFunction() { ... }
```

### Issue: "Used In" section is empty

**Cause:** Import graph not built or function not imported anywhere

**Solution:** Run graph builder first:
```bash
node scripts/doc-system/cli.js graph
node scripts/doc-system/cli.js document
```

### Issue: Manual content gets overwritten

**Cause:** `--preserve-manual` not enabled

**Solution:** Always use preserve flag:
```bash
node scripts/doc-system/cli.js document --preserve-manual
```

### Issue: Documentation out of sync with code

**Cause:** Code changed but docs not updated

**Solution:** Run incremental update:
```bash
node scripts/doc-system/cli.js document --incremental
```

## Summary

You've learned how to:
- ✅ Generate documentation for all functions
- ✅ Fill in manual content effectively
- ✅ Create group documentation
- ✅ Use incremental updates
- ✅ Validate documentation
- ✅ Follow best practices

Next: [Tutorial 04: Setting Up Pre-commit Hooks](./04-precommit-hooks.md)
