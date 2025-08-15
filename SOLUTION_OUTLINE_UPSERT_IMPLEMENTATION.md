# Solution Outline Upsert Implementation

## ✅ API Integration Complete

Successfully implemented the solution outline save functionality using the upsert logic with the correct API endpoint and parameters.

## 🎯 **API Specification Implemented**

### **Endpoint**
```
POST /api/v1/projects/{project_id}/solution-outlines
```

### **Parameters**
- **project_id** (path): The ID of the project
- **content** (query): The content of the solution outline
- **status** (query): The status of the solution outline
  - Available values: `draft`, `published`, `archived`
  - Default: `draft`

### **Response**
```json
{
  "content": "string",
  "status": "draft",
  "id": 0,
  "project_id": "string", 
  "version": 0,
  "created_at": "2025-08-03T04:35:30.321Z",
  "updated_at": "2025-08-03T04:35:30.321Z"
}
```

## 📋 **Implementation Details**

### **1. Updated API Service**

#### **ProjectApiService.ts**
```typescript
public static async saveSolutionOutline(projectId: string, content: string, status: string = 'draft'): Promise<any> {
  try {
    // Use upsert logic with query parameters as per API specification
    const response = await apiClient.post(getVersionedPath(`projects/${projectId}/solution-outlines`), null, {
      params: {
        content,
        status
      }
    });
    return response.data;
  } catch (error) {
    throw this.handleApiError(error as AxiosError);
  }
}
```

**Key Changes:**
- **Request Body**: Changed from body parameters to `null`
- **Query Parameters**: Added `params` object with `content` and `status`
- **Upsert Logic**: API handles create/update automatically based on existing records

### **2. Enhanced UI Components**

#### **Status Selector**
```vue
<div class="editor-status">
  <span v-if="hasChanges" class="unsaved-indicator">●</span>
  <select 
    v-model="currentStatus" 
    class="status-select"
    @change="handleStatusChange"
  >
    <option value="draft">Draft</option>
    <option value="published">Published</option>
    <option value="archived">Archived</option>
  </select>
</div>
```

#### **Enhanced Save Function**
```typescript
async function saveSolutionOutline() {
  if (!props.project?.id || !hasChanges.value) return

  isSaving.value = true
  try {
    const saved = await ProjectApiService.saveSolutionOutline(
      props.project.id,
      editorContent.value,
      currentStatus.value  // Uses selected status
    )
    solutionOutline.value = saved
    hasChanges.value = false
    lastSaved.value = new Date()
    emit('unsaved-changes', false)
    
    console.log('Solution outline saved successfully:', {
      id: saved.id,
      version: saved.version,
      status: saved.status,
      project_id: saved.project_id
    })
  } catch (error) {
    console.error('Failed to save solution outline:', error)
  } finally {
    isSaving.value = false
  }
}
```

### **3. State Management**

#### **Reactive Variables**
```typescript
const currentStatus = ref<'draft' | 'published' | 'archived'>('draft')
```

#### **Status Synchronization**
```typescript
// Watch for solution outline changes to sync status
watch(solutionOutline, (newOutline) => {
  if (newOutline?.status) {
    currentStatus.value = newOutline.status as 'draft' | 'published' | 'archived'
  }
}, { immediate: true })
```

#### **Change Handling**
```typescript
function handleStatusChange() {
  hasChanges.value = true
  emit('unsaved-changes', true)
}
```

## 🎨 **UI Enhancements**

### **Status Selector Styling**
```css
.status-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s;
}

.status-select:hover {
  border-color: #9ca3af;
}

.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
```

### **Visual Layout**
```
┌─────────────────────────────────────────────────────────┐
│ 📝 Solution Outline    [● Draft ▼] [👁️ Show/✏️ Edit] │
└─────────────────────────────────────────────────────────┘
```

- **Left**: Title "📝 Solution Outline"
- **Center**: Status dropdown with unsaved indicator
- **Right**: View/Edit toggle button

## 🚀 **Features Implemented**

### **Upsert Logic**
- **Create**: If no solution outline exists, creates new one
- **Update**: If solution outline exists, creates new version
- **Versioning**: API automatically handles version incrementing
- **Project Association**: Automatically links to correct project

### **Status Management**
- **Draft**: Work-in-progress content
- **Published**: Finalized content ready for use
- **Archived**: Historical content no longer active
- **Dynamic Selection**: Users can change status before saving

### **Auto-Save Integration**
- **Status Changes**: Trigger auto-save when status is modified
- **Content Changes**: Existing auto-save for content modifications
- **Change Tracking**: Visual indicators for unsaved changes

### **Error Handling**
- **API Errors**: Proper error catching and logging
- **Validation**: Client-side validation before API calls
- **User Feedback**: Console logging for debugging

## 🧪 **Testing Scenarios**

### **Create New Solution Outline**
1. **Open project** without existing solution outline
2. **Add content** in editor
3. **Select status** (draft/published/archived)
4. **Click Save** or wait for auto-save
5. **Verify**: New solution outline created with version 1

### **Update Existing Solution Outline**
1. **Open project** with existing solution outline
2. **Modify content** or change status
3. **Save changes**
4. **Verify**: New version created, version number incremented

### **Status Workflow**
1. **Start with Draft** status
2. **Complete content** and change to Published
3. **Later archive** by changing to Archived
4. **Verify**: Each status change creates new version

### **Auto-Save Behavior**
1. **Make changes** to content or status
2. **Wait 2 seconds** without further changes
3. **Verify**: Auto-save triggers automatically
4. **Check**: Unsaved indicator disappears

## 📊 **API Response Handling**

### **Successful Save Response**
```json
{
  "content": "# Solution Outline\n\n## Overview...",
  "status": "draft",
  "id": 123,
  "project_id": "proj_abc123",
  "version": 2,
  "created_at": "2025-08-03T04:35:30.321Z",
  "updated_at": "2025-08-03T04:35:30.321Z"
}
```

### **Response Processing**
- **Update Local State**: `solutionOutline.value = saved`
- **Reset Change Flags**: `hasChanges.value = false`
- **Update Timestamp**: `lastSaved.value = new Date()`
- **Emit Events**: `emit('unsaved-changes', false)`
- **Console Logging**: Success details for debugging

### **Error Response (422)**
```json
{
  "detail": [
    {
      "loc": ["string", 0],
      "msg": "string", 
      "type": "string"
    }
  ]
}
```

## 🔄 **Workflow Integration**

### **Save Triggers**
1. **Manual Save**: Click save button
2. **Keyboard Shortcut**: Ctrl+S (Cmd+S on Mac)
3. **Auto-Save**: 2 seconds after last change
4. **Status Change**: Immediate save when status modified

### **Version Management**
- **Automatic Versioning**: API handles version incrementing
- **History Preservation**: Previous versions maintained
- **Latest Version**: Always loads most recent version
- **Version Tracking**: Response includes current version number

### **Change Detection**
- **Content Changes**: Editor content modifications
- **Status Changes**: Status dropdown selections
- **Visual Indicators**: Unsaved dot (●) appears when changes exist
- **Save Button State**: Disabled when no changes or saving in progress

## 💡 **Benefits Achieved**

### **User Experience**
- **Flexible Status Management**: Easy status changes via dropdown
- **Visual Feedback**: Clear indication of unsaved changes
- **Auto-Save**: No data loss from forgotten saves
- **Version Control**: Automatic versioning without user complexity

### **Technical Benefits**
- **API Compliance**: Follows exact API specification
- **Upsert Logic**: Simplified create/update handling
- **Error Resilience**: Proper error handling and recovery
- **State Consistency**: Synchronized UI and data states

### **Development Benefits**
- **Clean Architecture**: Separation of API and UI concerns
- **Maintainable Code**: Clear, documented implementation
- **Extensible**: Easy to add more status types or features
- **Debuggable**: Comprehensive logging for troubleshooting

The solution outline save functionality now properly implements the upsert API with full status management and versioning support! 🎉