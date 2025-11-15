# fetchDocuments

**Path:** `src/services/supabase/queries/fetchDocuments.ts`

### Purpose

Fetches documents from the Supabase database with optional filtering and pagination. This function handles authentication, constructs the appropriate query based on filter parameters, and returns a typed result set. It includes error handling for network failures and permission issues.

### Input

- `filters` (object, optional): Filter criteria for the query
  - `userId` (string, optional): Filter documents by user ID
  - `status` (string, optional): Filter by document status ('draft' | 'published' | 'archived')
  - `tags` (string[], optional): Filter by document tags (AND logic)
  - `searchTerm` (string, optional): Full-text search term
- `pagination` (object, optional): Pagination parameters
  - `page` (number, optional): Page number (default: 1)
  - `pageSize` (number, optional): Items per page (default: 20)
- `sortBy` (object, optional): Sorting configuration
  - `field` (string): Field to sort by ('created_at' | 'updated_at' | 'title')
  - `order` ('asc' | 'desc'): Sort order (default: 'desc')

### Output

Returns `Promise<{ data: Document[], count: number, error: Error | null }>`

- `data`: Array of Document objects matching the query
- `count`: Total number of matching documents (for pagination)
- `error`: Error object if the query failed, null otherwise

### Used In

- `src/hooks/useDocuments/useDocuments.ts` - Main document fetching hook
- `src/components/ui/DocumentList/DocumentList.tsx` - Document list component
- `src/pages/Dashboard/Dashboard.tsx` - Dashboard page
- `src/services/search/searchDocuments.ts` - Search service wrapper

### Complexity

Cyclomatic Complexity: 8 (Medium)

### Group

supabase

### Dependencies

- `@supabase/supabase-js` - Supabase client library
- `src/services/supabase/client/createClient.ts` - Supabase client instance
- `src/types/Document.ts` - Document type definitions

### Notes

This function requires an authenticated Supabase session. If called without authentication, it will return an empty result set with an authentication error. Consider using the `useDocuments` hook instead of calling this function directly, as the hook provides caching and automatic refetching.

### Example Usage

```typescript
import { fetchDocuments } from './fetchDocuments';

// Fetch all published documents
const result = await fetchDocuments({
  filters: { status: 'published' },
  pagination: { page: 1, pageSize: 10 },
  sortBy: { field: 'created_at', order: 'desc' }
});

if (result.error) {
  console.error('Failed to fetch documents:', result.error);
} else {
  console.log(`Found ${result.count} documents`, result.data);
}
```
