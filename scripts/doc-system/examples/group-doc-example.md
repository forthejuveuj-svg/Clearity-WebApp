# Supabase Integration

### Overview

The Supabase integration module provides a complete interface for interacting with the Supabase backend, including authentication, database queries, real-time subscriptions, and file storage. This module abstracts the Supabase client and provides type-safe, domain-specific functions for all backend operations.

The module is organized into four main areas:
- **Client**: Supabase client initialization and configuration
- **Queries**: Database query functions for CRUD operations
- **Auth**: Authentication and user management functions
- **Storage**: File upload and retrieval functions

### Technologies

- **Supabase Client Library** (`@supabase/supabase-js`): Official Supabase JavaScript client
- **PostgreSQL**: Backend database (via Supabase)
- **Row Level Security (RLS)**: Database-level authorization
- **Real-time Subscriptions**: WebSocket-based live updates

### External Connections

- **Supabase API**: `https://[project-id].supabase.co`
  - REST API for database operations
  - WebSocket for real-time subscriptions
  - Storage API for file operations
- **Authentication Providers**:
  - Email/Password authentication
  - OAuth providers (Google, GitHub)

### Associated Functions

#### Client Management

- **createClient** (`src/services/supabase/client/createClient.ts`)
  - Purpose: Creates and configures the Supabase client instance
  - Complexity: 3 (Low)
  - Used in: All Supabase functions

- **getSession** (`src/services/supabase/client/getSession.ts`)
  - Purpose: Retrieves the current user session
  - Complexity: 2 (Low)
  - Used in: Auth hooks, protected routes

#### Database Queries

- **fetchDocuments** (`src/services/supabase/queries/fetchDocuments.ts`)
  - Purpose: Fetches documents with filtering and pagination
  - Complexity: 8 (Medium)
  - Used in: useDocuments hook, DocumentList component

- **createDocument** (`src/services/supabase/queries/createDocument.ts`)
  - Purpose: Creates a new document in the database
  - Complexity: 5 (Low)
  - Used in: Document editor, import functions

- **updateDocument** (`src/services/supabase/queries/updateDocument.ts`)
  - Purpose: Updates an existing document
  - Complexity: 6 (Medium)
  - Used in: Document editor, auto-save functionality

- **deleteDocument** (`src/services/supabase/queries/deleteDocument.ts`)
  - Purpose: Soft-deletes a document (marks as archived)
  - Complexity: 4 (Low)
  - Used in: Document actions, bulk operations

- **subscribeToDocuments** (`src/services/supabase/queries/subscribeToDocuments.ts`)
  - Purpose: Sets up real-time subscription for document changes
  - Complexity: 7 (Medium)
  - Used in: useDocuments hook, collaborative editing

#### Authentication

- **signIn** (`src/services/supabase/auth/signIn.ts`)
  - Purpose: Authenticates user with email and password
  - Complexity: 4 (Low)
  - Used in: Login page, auth forms

- **signOut** (`src/services/supabase/auth/signOut.ts`)
  - Purpose: Signs out the current user
  - Complexity: 2 (Low)
  - Used in: Logout button, session management

- **signUp** (`src/services/supabase/auth/signUp.ts`)
  - Purpose: Registers a new user account
  - Complexity: 5 (Low)
  - Used in: Registration page

- **resetPassword** (`src/services/supabase/auth/resetPassword.ts`)
  - Purpose: Initiates password reset flow
  - Complexity: 3 (Low)
  - Used in: Password reset page

#### Storage

- **uploadFile** (`src/services/supabase/storage/uploadFile.ts`)
  - Purpose: Uploads a file to Supabase storage
  - Complexity: 6 (Medium)
  - Used in: File upload components, document attachments

- **downloadFile** (`src/services/supabase/storage/downloadFile.ts`)
  - Purpose: Downloads a file from Supabase storage
  - Complexity: 4 (Low)
  - Used in: File preview, download buttons

### Error Handling

All Supabase functions follow a consistent error handling pattern:
- Return type: `{ data: T | null, error: Error | null }`
- Network errors are caught and wrapped in descriptive Error objects
- Authentication errors return specific error codes
- Database constraint violations are mapped to user-friendly messages

### Performance Considerations

- **Connection Pooling**: Supabase client reuses connections automatically
- **Query Optimization**: All queries use indexes and avoid N+1 problems
- **Caching**: Consider using React Query or SWR for client-side caching
- **Real-time Subscriptions**: Limit subscriptions to necessary data only

### Security Notes

- All database operations respect Row Level Security (RLS) policies
- API keys are stored in environment variables, never in code
- File uploads are validated for type and size before processing
- Authentication tokens are stored securely in httpOnly cookies

### Testing

- Unit tests: Mock Supabase client using `@supabase/supabase-js` test utilities
- Integration tests: Use Supabase local development environment
- E2E tests: Use test database with seeded data

### Related Groups

- **hooks**: React hooks that consume Supabase functions
- **contexts**: Auth context that manages Supabase session
- **utils**: Validation utilities used in Supabase functions
