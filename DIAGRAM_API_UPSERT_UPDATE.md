# Diagram API Upsert Implementation

## Overview
Updated the diagram API to use a unified upsert endpoint that handles both creating new diagrams and updating existing ones, following the backend implementation pattern.

## Backend API Specification

The backend provides a unified upsert endpoint:

**Endpoint:** `POST /api/v1/projects/{project_id}/diagrams`

**Request Body:**
```json
{
  "title": "string",
  "mermaid_code": "string", 
  "type": "string",
  "id": 0,                    // Optional: Include for updates
  "project_id": "string"
}
```

**Upsert Logic:**
- If `id` is provided: Try to find existing diagram → UPDATE if found, CREATE if not found
- If `id` is not provided: CREATE new diagram

## Implementation Changes

### 1. API Service Updates (`src/services/ProjectApiService.ts`)

#### New Unified Method
```typescript
/**
 * Upsert diagram (create or update) using the unified endpoint
 */
public static async upsertDiagram(
  projectId: string, 
  title: string, 
  mermaid_code: string, 
  type: string, 
  diagramId?: number
): Promise<Diagram> {
  const requestData: any = {
    title,
    mermaid_code,
    type,
    project_id: projectId
  };

  // Include diagram ID if provided (for updates)
  if (diagramId !== undefined && diagramId !== null) {
    requestData.id = diagramId;
  }

  const response = await apiClient.post<Diagram>(
    getVersionedPath(`projects/${projectId}/diagrams`), 
    requestData
  );
  return this.mapToDiagram(response.data, projectId);
}
```

#### Backward Compatibility Wrappers
```typescript
/**
 * Add a new diagram (wrapper for upsert without ID)
 */
public static async addDiagram(projectId: string, title: string, mermaid_code: string, type: string): Promise<Diagram> {
  return this.upsertDiagram(projectId, title, mermaid_code, type);
}

/**
 * Update an existing diagram (wrapper for upsert with ID)
 */
public static async updateDiagram(projectId: string, diagramId: number, title: string, mermaid_code: string, type: string): Promise<Diagram> {
  return this.upsertDiagram(projectId, title, mermaid_code, type, diagramId);
}
```

### 2. Project Manager Updates (`src/services/ProjectManager.ts`)

#### Simplified Save Logic
```typescript
public async saveDiagram(projectId: string, diagramId: number | null, title: string, content: string, type: string = "flowchart"): Promise<Diagram> {
  try {
    // Use the unified upsert endpoint
    const savedDiagram = await ProjectApiService.upsertDiagram(
      projectId, 
      title, 
      content, 
      type, 
      diagramId || undefined
    );
    
    // ... rest of the method remains the same
  }
}
```

**Before:** Complex if/else logic to choose between add/update
**After:** Single upsert call that handles both cases

## API Endpoint Changes

### Before (Multiple Endpoints)
- `POST /api/v1/projects/{id}/diagrams/add` - Add new diagram
- `PUT /api/v1/projects/{id}/diagrams/{diagramId}` - Update existing diagram

### After (Unified Endpoint)
- `POST /api/v1/projects/{id}/diagrams` - Create or update diagram (upsert)

## Request Examples

### Creating a New Diagram
```json
POST /api/v1/projects/proj123/diagrams
{
  "title": "User Flow Diagram",
  "mermaid_code": "graph TD\n  A[Start] --> B[End]",
  "type": "flowchart",
  "project_id": "proj123"
}
```

### Updating an Existing Diagram
```json
POST /api/v1/projects/proj123/diagrams
{
  "title": "Updated User Flow Diagram",
  "mermaid_code": "graph TD\n  A[Start] --> B[Process] --> C[End]",
  "type": "flowchart",
  "id": 42,
  "project_id": "proj123"
}
```

## Benefits

### 1. **Simplified API Surface**
- Single endpoint instead of two
- Consistent POST method for all diagram operations
- Reduced complexity in client code

### 2. **Backend Alignment**
- Matches the actual backend implementation
- Leverages server-side upsert logic
- Eliminates client-side decision making

### 3. **Improved Reliability**
- Server handles edge cases (ID exists but diagram doesn't)
- Atomic operations on the backend
- Consistent error handling

### 4. **Backward Compatibility**
- Existing `addDiagram` and `updateDiagram` methods still work
- No breaking changes for existing code
- Gradual migration possible

### 5. **Future-Proof**
- Easier to extend with additional fields
- Consistent pattern for other resources
- Simplified testing and documentation

## Migration Guide

### For New Code
Use the new `upsertDiagram` method directly:

```typescript
// Creating new diagram
const newDiagram = await ProjectApiService.upsertDiagram(
  projectId, 
  title, 
  content, 
  type
);

// Updating existing diagram
const updatedDiagram = await ProjectApiService.upsertDiagram(
  projectId, 
  title, 
  content, 
  type, 
  diagramId
);
```

### For Existing Code
No changes required - existing methods still work:

```typescript
// These still work (now use upsert internally)
await ProjectApiService.addDiagram(projectId, title, content, type);
await ProjectApiService.updateDiagram(projectId, diagramId, title, content, type);
```

## Testing Considerations

### Test Cases to Verify

1. **Create New Diagram**
   - Call upsert without ID
   - Verify diagram is created
   - Check response contains new ID

2. **Update Existing Diagram**
   - Call upsert with existing ID
   - Verify diagram is updated
   - Check response contains same ID

3. **Update Non-Existent Diagram**
   - Call upsert with non-existent ID
   - Verify server behavior (create or error)
   - Handle response appropriately

4. **Backward Compatibility**
   - Test existing `addDiagram` method
   - Test existing `updateDiagram` method
   - Verify same results as direct upsert calls

5. **Error Handling**
   - Invalid project ID
   - Malformed diagram data
   - Network failures

### Example Test
```typescript
describe('Diagram Upsert API', () => {
  it('should create new diagram when no ID provided', async () => {
    const result = await ProjectApiService.upsertDiagram(
      'proj123', 
      'Test Diagram', 
      'graph TD\n  A --> B', 
      'flowchart'
    );
    
    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test Diagram');
  });

  it('should update existing diagram when ID provided', async () => {
    const result = await ProjectApiService.upsertDiagram(
      'proj123', 
      'Updated Diagram', 
      'graph TD\n  A --> B --> C', 
      'flowchart',
      42
    );
    
    expect(result.id).toBe(42);
    expect(result.title).toBe('Updated Diagram');
  });
});
```

## Documentation Updates

Updated all documentation files to reflect the new unified endpoint:

- `README.md` - API endpoint documentation
- `PROJECT_CODE_FIELD_IMPLEMENTATION.md` - Implementation details
- `API_VERSIONING_IMPLEMENTATION.md` - Versioning documentation

## Conclusion

The diagram API now uses a unified upsert endpoint that:
- Simplifies the API surface area
- Aligns with backend implementation
- Maintains backward compatibility
- Improves reliability and consistency
- Follows RESTful principles better

This change makes the diagram management more robust and easier to use while maintaining full compatibility with existing code.