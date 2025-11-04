# Centralized Data Architecture

## Overview

The application uses a centralized data management system where all Supabase operations are handled through `supabaseClient.js`. This architecture provides consistent JWT error handling, automatic user logout on authentication failures, and efficient data caching.

## Core Components

### Global Data Store (`supabaseClient.js`)

**Data Cache:**
- `globalDataStore` - In-memory cache containing projects, knowledgeNodes, problems
- `dataSubscribers` - Array of callback functions for real-time updates
- `lastUpdated` - Timestamp of last data refresh

**Core Functions:**
- `getAllDataFromCache()` - Returns cached data instantly
- `refreshAllData(options)` - Fetches fresh data from Supabase, updates cache
- `initializeData(options)` - Loads data on first access or returns cache
- `subscribeToDataUpdates(callback)` - Registers component for data change notifications
- `clearDataCache()` - Clears all cached data (used on logout)

**Data Manipulation Functions:**
- `createProject(projectData, options)` - Creates project, updates cache
- `updateProject(projectId, updates, options)` - Updates project, syncs cache
- `createProblem(problemData, options)` - Creates problem, updates cache
- `updateProblem(problemId, updates, options)` - Updates problem, syncs cache
- `convertProblemToProject(problem, options)` - Converts problem to project

### React Integration

**useGlobalData Hook:**
- Provides React components access to cached data
- Handles JWT errors with automatic logout
- Offers `refresh()` method for force-updating data
- Subscribes to data changes for real-time UI updates

**Updated Hooks:**
- `useEntityAutocomplete` - Now uses cached data instead of direct Supabase calls
- `useAuth` - Clears data cache on logout

## JWT Error Handling

**Automatic Logout System:**
- All Supabase operations detect JWT errors using `isJWTError()`
- JWT errors trigger automatic user logout via `handleJWTError()`
- Data cache is cleared on logout to prevent stale data
- Components receive error callbacks through `onJWTError` parameter

**Error Detection Patterns:**
- JWT expired, token expired, invalid jwt, JWT malformed
- Authentication failed, Unauthorized, Invalid token

## Data Flow

**Read Operations:**
1. Component calls `useGlobalData()` or `getAllDataFromCache()`
2. Returns cached data instantly if available
3. Initializes from database if cache empty
4. JWT errors trigger automatic logout

**Write Operations:**
1. Component calls data manipulation function (e.g., `createProject`)
2. Function updates Supabase database
3. On success, updates local cache
4. Notifies all subscribers of data changes
5. JWT errors trigger automatic logout and cache clear

**Cache Management:**
1. Data loaded once on app initialization
2. Cache updated on all write operations
3. Manual refresh available via `refresh()` method
4. Cache cleared on logout or JWT errors

## Migration Benefits

- **Centralized Error Handling:** All JWT errors handled consistently
- **Performance:** Cached data provides instant access
- **Consistency:** Single source of truth for all data operations
- **Automatic Logout:** Users logged out immediately on authentication failures
- **Real-time Updates:** Components automatically update when data changes