# Design Document

## Overview

This design addresses the need to fix multiple server integrations by updating existing API services and creating new ones to use the correct upsert endpoints. The current implementation has inconsistencies in how it handles create/update operations across different entities (ADRs, requirement items, teams, and systems). This design will standardize the approach using proper upsert endpoints that determine create vs update based on the presence of ID parameters.

The solution involves:
1. Updating the existing ADRApiService to use the upsert endpoint
2. Updating the existing RequirementsApiService to use the requirement items upsert endpoint
3. Updating the existing TeamsApiService to use the teams upsert endpoint
4. Creating a new SystemsApiService to handle systems upsert operations
5. Creating a new NotesApiService to handle notes upsert and CRUD operations
6. Ensuring consistent error handling and response processing across all services

## Architecture

### Current Architecture
The application currently uses separate API services for different entities:
- `ADRApiService` - Handles ADR operations with separate create/update methods
- `RequirementsApiService` - Handles requirements operations with separate create/update methods
- `TeamsApiService` - Handles team operations with separate create/update methods
- No existing systems API service
- No existing notes API service

### Target Architecture
The updated architecture will maintain the same service structure but standardize the upsert pattern:
- All services will use upsert methods that handle both create and update operations
- Consistent error handling and response processing across all services
- Unified approach to natural key handling (project_id + name for teams/systems)
- Proper handling of ID-based vs natural key-based upserts
- Comprehensive CRUD operations for notes including search and recent notes functionality

```mermaid
graph TB
    subgraph "Frontend Components"
        ADR[ADR Components]
        REQ[Requirements Components]
        TEAM[Teams Components]
        SYS[Systems Components]
        NOTE[Notes Components]
    end
    
    subgraph "API Services Layer"
        ADRS[ADRApiService]
        REQS[RequirementsApiService]
        TEAMS[TeamsApiService]
        SYSTEMS[SystemsApiService]
        NOTES[NotesApiService]
    end
    
    subgraph "Backend API Endpoints"
        ADRE[POST /api/v1/projects/{id}/adrs]
        REQE[POST /api/v1/requirement-items/upsert]
        TEAME[POST /api/v1/projects/{id}/teams]
        SYSE[POST /api/v1/projects/{id}/systems]
        NOTEE[POST /api/v1/projects/{id}/notes]
        ADRGET[GET /api/v1/projects/{id}/adrs]
        NOTEGET[GET /api/v1/projects/{id}/notes]
    end
    
    ADR --> ADRS
    REQ --> REQS
    TEAM --> TEAMS
    SYS --> SYSTEMS
    NOTE --> NOTES
    
    ADRS --> ADRE
    ADRS --> ADRGET
    REQS --> REQE
    TEAMS --> TEAME
    SYSTEMS --> SYSE
    NOTES --> NOTEE
    NOTES --> NOTEGET
```

## Components and Interfaces

### 1. Updated ADRApiService

**Methods to Update:**
- `createADR()` and `updateADR()` → Replace with `upsertADR()`
- Keep existing `listADRs()` method but ensure it uses the correct endpoint with pagination support

**Interface Changes:**
```typescript
interface UpsertADRRequest {
  title: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  consequences: string;
  alternatives: string;
  author: string;
  tags: string[];
  content: string;
  adr_id?: number; // Optional - presence determines create vs update
}

interface ADRListResponse {
  success: boolean;
  message: string;
  data: ADR[];
  timestamp: string;
  meta: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

### 2. Updated RequirementsApiService

**Methods to Update:**
- `createRequirementItem()` and `updateRequirementItem()` → Replace with `upsertRequirementItem()`

**Interface Changes:**
```typescript
interface UpsertRequirementItemRequest {
  project_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
}

// Query parameter approach for requirement items
interface UpsertRequirementItemOptions {
  item_id?: number; // Query parameter - presence determines create vs update
}
```

### 3. Updated TeamsApiService

**Methods to Update:**
- `createTeam()` and `updateTeam()` → Replace with `upsertTeam()`

**Interface Changes:**
```typescript
interface UpsertTeamRequest {
  name: string;
  role: string;
  members: string[];
  responsibilities: string[];
  project_id: string;
}
```

### 4. New SystemsApiService

**New Service Creation:**
```typescript
interface UpsertSystemRequest {
  name: string;
  description: string;
  type: 'internal' | 'external' | 'third-party';
  dependencies: string[];
  project_id: string;
}

interface SystemInfo {
  name: string;
  description: string;
  type: 'internal' | 'external' | 'third-party';
  dependencies: string[];
  id: number;
  project_id: string;
  created_at: string;
  updated_at: string;
}
```

### 5. New NotesApiService

**New Service Creation:**
```typescript
interface UpsertNoteRequest {
  title: string;
  description: string;
  content: string;
  tags: string[];
  note_id?: number; // Optional - presence determines create vs update
}

interface NoteInfo {
  title: string;
  description: string;
  content: string;
  tags: string[];
  id: number;
  project_id: string;
  created_at: string;
  updated_at: string;
}

interface NotesListResponse {
  success: boolean;
  message: string;
  data: NoteInfo[];
  timestamp: string;
  meta: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

**Methods to Implement:**
- `upsertNote()` - Create or update notes using note_id in request body
- `listNotes()` - Get paginated list of notes with search and sorting
- `getNote()` - Get individual note by ID
- `deleteNote()` - Delete note by ID
- `searchNotes()` - Search notes with query parameters
- `getRecentNotes()` - Get recent notes for project
- `getNotesCount()` - Get count of notes for project

## Data Models

### Common Response Structure
All API responses will follow consistent patterns:

**Success Response (200):**
```typescript
interface EntityResponse<T> {
  // Entity data with server-generated fields
  id: number;
  project_id: string;
  created_at: string;
  updated_at: string;
  // ... entity-specific fields
}
```

**Error Response (422):**
```typescript
interface ValidationErrorResponse {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}
```

### ADR-Specific Models
- Existing ADR interface remains unchanged
- Add support for paginated list responses

### Requirements-Specific Models
- Existing RequirementItem interface remains unchanged
- Query parameter approach for item_id

### Teams-Specific Models
- Existing TeamInfo interface remains unchanged
- Natural key approach using project_id + name

### Systems-Specific Models
- New SystemInfo interface to be created
- Natural key approach using project_id + name

### Notes-Specific Models
- New NoteInfo interface to be created
- ID-based upsert approach using note_id in request body
- Support for rich content and tags array
- Comprehensive CRUD operations with search capabilities

## Error Handling

### Standardized Error Processing
All services will implement consistent error handling:

1. **Network Errors** - Connection issues, timeouts
2. **Validation Errors (422)** - Field validation failures
3. **Server Errors (5xx)** - Internal server errors
4. **Client Errors (4xx)** - Authentication, authorization, not found

### Error Response Mapping
```typescript
interface ApiErrorInfo {
  type: 'network' | 'validation' | 'server' | 'client';
  message: string;
  details?: any;
  canRetry: boolean;
}
```

### Retry Logic
- Network errors: Retry with exponential backoff
- Validation errors: No retry, surface to user
- Server errors: Limited retry attempts
- Client errors: No retry for auth issues

## Testing Strategy

### Unit Testing
1. **Service Method Testing**
   - Test upsert operations with and without IDs
   - Test error handling for different response codes
   - Test request payload construction
   - Test response data mapping

2. **Integration Testing**
   - Test actual API endpoint integration
   - Test error scenarios with mock server responses
   - Test retry logic and network failure handling

3. **Component Integration Testing**
   - Test component interaction with updated services
   - Test error state handling in UI components
   - Test loading states during API operations

### Test Coverage Requirements
- Minimum 90% code coverage for all API service methods
- All error paths must be tested
- All upsert scenarios (create and update) must be tested
- Network failure and retry scenarios must be tested

### Mock Strategy
- Use axios mocking for unit tests
- Create reusable mock response factories
- Test both success and error response scenarios
- Validate request payloads and headers

## Implementation Approach

### Phase 1: Update Existing Services
1. Update ADRApiService with upsert method
2. Update RequirementsApiService with upsert method
3. Update TeamsApiService with upsert method
4. Maintain backward compatibility during transition

### Phase 2: Create New Services
1. Create SystemsApiService following established patterns
2. Create NotesApiService with comprehensive CRUD operations
3. Implement consistent error handling across new services
4. Add comprehensive test coverage for all new services

### Phase 3: Component Integration
1. Update components to use new upsert methods
2. Integrate NotesApiService into notes-related components
3. Remove old create/update method calls
4. Update error handling in components
5. Test end-to-end functionality for all integrations

### Migration Strategy
- Implement new methods alongside existing ones initially
- Update components to use new methods
- Remove deprecated methods after successful migration
- Ensure no breaking changes to existing functionality