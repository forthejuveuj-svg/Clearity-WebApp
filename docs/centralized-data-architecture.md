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
- **Optimized:** Uses initialization flag to prevent multiple data loads
- **Optimized:** Stable function references prevent unnecessary re-renders

**Updated Hooks:**
- `useEntityAutocomplete` - Now uses cached data instead of direct Supabase calls
- `useAuth` - Clears data cache on logout, uses `useCallback` for stable function references

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
5. **Optimized:** Cache-first approach - checks cache before database calls
6. **Optimized:** Force refresh only when explicitly needed (after data mutations)

## Performance Optimizations

**Cache-First Strategy:**
- `generateMindMapJson()` checks cache before calling `initializeData()`
- Only hits database if cache is empty (`lastUpdated` is null)
- Reduces redundant API calls during component re-renders

**Stable Function References:**
- Auth functions wrapped in `useCallback` to prevent re-creation
- Prevents `useGlobalData` from re-initializing on every render
- Eliminates the refresh loop that caused excessive API calls

**Smart Refresh Logic:**
- `reloadNodes()` uses cache by default (`forceRefresh: false`)
- Force refresh only after successful data mutations (minddump, fix_nodes)
- Prevents unnecessary database calls during normal navigation

**Initialization Protection:**
- `useGlobalData` uses `useRef` to track initialization state
- Prevents multiple simultaneous data loads
- Ensures single initialization per component lifecycle

## Migration Benefits

- **Centralized Error Handling:** All JWT errors handled consistently
- **Performance:** Cached data provides instant access with minimal API calls
- **Consistency:** Single source of truth for all data operations
- **Automatic Logout:** Users logged out immediately on authentication failures
- **Real-time Updates:** Components automatically update when data changes
- **Optimized Loading:** Cache-first approach eliminates redundant database calls