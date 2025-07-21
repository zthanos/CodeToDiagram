# Design Document

## Overview

This design transforms the application from a single-diagram editor into a comprehensive project-based workspace with backend integration. The new architecture leverages the Solution Outline Assistant API for project and diagram persistence, implements a modular component structure, and provides a dual-pane interface with collapsible navigation and tabbed editing.

The solution involves integrating with the existing backend API, creating modular components with centralized CSS, implementing a streamlined diagram creation workflow, and maintaining all existing editor functionality while adding robust project-level management capabilities.

## Architecture

### Current Architecture Limitations
- Single-diagram editing interface limits productivity for complex projects
- localStorage-based persistence lacks reliability and cross-device access
- Monolithic MermaidRenderer component with mixed responsibilities
- Duplicated CSS across components leading to maintenance issues
- Interrupting diagram creation workflow with immediate naming requirements

### New Backend-Integrated Architecture
The new architecture transforms the application into a comprehensive workspace with the following key components:

1. **Backend Integration Layer**: Interfaces with Solution Outline Assistant API
2. **Modular Component Architecture**: Separated editor component with clean interfaces
3. **Centralized CSS Management**: Common styles moved to main.css
4. **Dual-Pane Layout**: Left navigation pane + right tabbed editor pane
5. **Streamlined Workflow**: Create diagrams immediately, name on first save

### Architecture Components Overview

```
ProjectWorkspace
├── ProjectApiService (Solution Outline Assistant API client)
├── MermaidEditorComponent (extracted, reusable editor)
├── NavigationPane (left pane)
│   ├── ProjectToolbar (project name + actions)
│   └── DiagramList (backend-loaded diagram list)
└── EditorPane (right pane)
    ├── TabManager (manages multiple editor tabs)
    └── MermaidRenderer[] (uses MermaidEditorComponent)
```

### Backend API Integration

**Solution Outline Assistant API Endpoints:**
- `POST /projects/create` - Create new projects
- `GET /projects/list` - List all projects
- `GET /projects/{project_id}/outline` - Get project with diagrams
- `POST /projects/{project_id}/diagrams/add` - Add diagram to project
- `GET /projects/{project_id}/diagrams/list` - List project diagrams
- `GET /projects/{project_id}/diagrams/{diagram_id}` - Get specific diagram
- `DELETE /projects/{project_id}/diagrams/{diagram_id}/delete` - Delete diagram

## Components and Interfaces

### 1. Backend API Service Layer

**ProjectApiService Interface:**
```typescript
interface ProjectApiService {
  // Project operations
  createProject(data: ProjectCreate): Promise<ProjectResponse>;
  listProjects(): Promise<ProjectResponse[]>;
  getProjectOutline(projectId: number): Promise<ProjectOutlineResponse>;
  
  // Diagram operations
  addDiagram(projectId: number, data: DiagramCreate): Promise<DiagramResponse>;
  listDiagrams(projectId: number): Promise<DiagramResponse[]>;
  getDiagram(projectId: number, diagramId: number): Promise<DiagramResponse>;
  deleteDiagram(projectId: number, diagramId: number): Promise<void>;
}

// API Data Models (matching backend schema)
interface ProjectCreate {
  name: string;
  description?: string;
}

interface DiagramCreate {
  title: string;
  mermaid_code: string;
  type: DiagramType; // 'Flowchart' | 'Sequence' | 'Gantt'
}

interface DiagramResponse {
  id: number;
  title: string;
  mermaid_code: string;
  type: DiagramType;
}
```

### 2. Modular Editor Component Architecture

**MermaidEditorComponent Interface:**
```typescript
interface MermaidEditorComponent {
  // Core editor functionality
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  
  // Editor configuration
  theme?: string;
  readOnly?: boolean;
  height?: string | number;
  
  // Editor state
  cursorPosition?: CursorPosition;
  scrollPosition?: ScrollPosition;
  
  // Methods
  focus(): void;
  getContent(): string;
  setContent(content: string): void;
  insertText(text: string): void;
}

// Extracted from MermaidRenderer
interface MermaidRenderer {
  // Uses MermaidEditorComponent
  editorComponent: MermaidEditorComponent;
  
  // Diagram rendering
  diagramContent: string;
  renderDiagram(): void;
  
  // Split pane management
  splitRatio: number;
  onSplitChange: (ratio: number) => void;
}
```

### 3. Project Workspace Layout Structure

**New Project Workspace Structure:**
```
.app-layout
├── .app-header
└── .app-main
    └── .project-workspace
        ├── .navigation-pane (left, collapsible)
        │   ├── .project-toolbar
        │   │   ├── .project-name
        │   │   └── .project-actions
        │   │       ├── .create-project-btn
        │   │       └── .create-diagram-btn
        │   └── .diagram-list
        │       └── .diagram-item[]
        ├── .pane-splitter (resizable)
        └── .editor-pane (right, tabbed)
            ├── .tab-bar
            │   └── .editor-tab[]
            │       ├── .tab-title
            │       ├── .tab-modified-indicator
            │       └── .tab-close-btn
            └── .tab-content
                └── .mermaid-renderer
                    └── .mermaid-editor-component
                        └── .split-pane
                            ├── .code-editor (full height)
                            └── .diagram-preview
```

### 4. Core Component Interfaces

**Project Management Interface:**
```typescript
interface ProjectManager {
  // Backend integration
  apiService: ProjectApiService;
  
  // Project operations
  createProject(name: string, description?: string): Promise<ProjectResponse>;
  loadProject(projectId: number): Promise<ProjectOutlineResponse>;
  getCurrentProject(): ProjectOutlineResponse | null;
  setCurrentProject(project: ProjectOutlineResponse): void;
  getProjectList(): Promise<ProjectResponse[]>;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  diagrams: DiagramResponse[];
}
```

**Navigation Pane Interface:**
```typescript
interface NavigationPane {
  // Visibility control
  isCollapsed: boolean;
  toggleCollapse(): void;
  
  // Project toolbar
  currentProject: ProjectResponse | null;
  onCreateProject(): void;
  onCreateDiagram(): void;
  
  // Diagram list (loaded from backend)
  diagrams: DiagramResponse[];
  selectedDiagramId: number | null;
  onDiagramSelect(diagramId: number): void;
  onDiagramDelete(diagramId: number): void;
  
  // Loading states
  isLoadingDiagrams: boolean;
  diagramsError: string | null;
}
```

**Tab Manager Interface:**
```typescript
interface TabManager {
  // Tab management
  openTabs: EditorTab[];
  activeTabId: string | null;
  
  // Tab operations
  openTab(diagram: DiagramResponse): EditorTab;
  closeTab(tabId: string): void;
  switchToTab(tabId: string): void;
  closeAllTabs(): void;
  
  // Tab state
  getTabByDiagramId(diagramId: number): EditorTab | null;
  isTabModified(tabId: string): boolean;
  saveTab(tabId: string): Promise<void>;
}

interface EditorTab {
  id: string;
  diagramId: number;
  title: string;
  isModified: boolean;
  isActive: boolean;
  isUntitled: boolean; // for new diagrams not yet named
  editorInstance: MermaidRenderer;
}
```

### 5. Centralized CSS Management

**Common Styles Structure:**
```css
/* main.css - Centralized common styles */

/* Layout utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1; }
.grid { display: grid; }

/* Spacing utilities */
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.m-2 { margin: 0.5rem; }
.gap-2 { gap: 0.5rem; }

/* Button styles */
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: var(--button-hover-bg);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Tab styles */
.tab {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  background: var(--tab-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab.active {
  background: var(--tab-active-bg);
  border-bottom-color: transparent;
}

.tab-close {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.tab-close:hover {
  background: var(--tab-close-hover-bg);
}

/* Editor height optimization */
.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-content {
  flex: 1;
  min-height: 0;
}

.codemirror-wrapper {
  height: 100%;
}

.codemirror-wrapper .cm-editor {
  height: 100%;
}
```



## Data Models

### 1. Backend API Data Models (matching Solution Outline Assistant API)
```typescript
// API Response Models
interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectOutlineResponse extends ProjectResponse {
  requirements: RequirementResponse[];
  diagrams: DiagramResponse[];
  teams: TeamResponse[];
  tasks: TaskResponse[];
}

interface DiagramResponse {
  id: number;
  title: string;
  mermaid_code: string;
  type: DiagramType; // 'Flowchart' | 'Sequence' | 'Gantt'
}

// API Request Models
interface ProjectCreate {
  name: string;
  description?: string;
}

interface DiagramCreate {
  title: string;
  mermaid_code: string;
  type: DiagramType;
}

type DiagramType = 'Flowchart' | 'Sequence' | 'Gantt';
```

### 2. Frontend State Models
```typescript
// Frontend workspace state (not persisted to backend)
interface WorkspaceState {
  // Current project state
  currentProject: ProjectOutlineResponse | null;
  projectList: ProjectResponse[];
  
  // UI state (local only)
  navigationPane: NavigationPaneState;
  editorPane: EditorPaneState;
  
  // Application state (local only)
  theme: string;
  settings: ApplicationSettings;
  notifications: Notification[];
}

interface NavigationPaneState {
  isCollapsed: boolean;
  width: number;
  selectedDiagramId: number | null;
  searchQuery: string;
  sortBy: 'title' | 'updated' | 'created';
}

interface EditorPaneState {
  openTabs: EditorTab[];
  activeTabId: string | null;
  tabOrder: string[];
}
```

### 3. Tab Management Model
```typescript
interface EditorTab {
  id: string; // local tab ID
  diagramId: number; // backend diagram ID
  title: string;
  isModified: boolean;
  isActive: boolean;
  isUntitled: boolean; // for new diagrams not yet saved
  editorState: EditorState;
  lastAccessed: Date;
}

interface EditorState {
  content: string;
  cursorPosition: CursorPosition;
  scrollPosition: ScrollPosition;
  selectionRange?: SelectionRange;
  undoHistory: UndoHistoryState;
}
```

### 4. Diagram Creation Workflow Model
```typescript
interface DiagramCreationWorkflow {
  // Step 1: Create diagram immediately in backend
  createDiagram(projectId: number): Promise<DiagramResponse>;
  
  // Step 2: Open in editor with temporary title
  openInEditor(diagram: DiagramResponse): EditorTab;
  
  // Step 3: Prompt for name on first save
  promptForName(): Promise<string>;
  
  // Step 4: Update diagram title in backend
  updateDiagramTitle(diagramId: number, title: string): Promise<DiagramResponse>;
}

interface UntitledDiagram extends DiagramResponse {
  isUntitled: true;
  temporaryTitle: string; // e.g., "Untitled Diagram 1"
}
```

### 5. Error Handling Models
```typescript
interface ApiError {
  status: number;
  message: string;
  details?: any;
}

interface WorkspaceError {
  type: 'api' | 'validation' | 'network' | 'unknown';
  message: string;
  action?: 'retry' | 'reload' | 'ignore';
  context?: {
    operation: string;
    projectId?: number;
    diagramId?: number;
  };
}
```

## Error Handling

### 1. Backend API Integration Errors
- **Issue**: Network failures, API timeouts, or server errors
- **Solution**: Retry mechanisms with exponential backoff and user feedback
- **Implementation**: Axios interceptors for error handling and retry logic
- **User Experience**: Loading states, error messages, and retry buttons

### 2. Project Management Errors
- **Issue**: Project creation/loading failures from backend
- **Solution**: Comprehensive validation and graceful error handling
- **Implementation**: API response validation and fallback states
- **User Experience**: Clear error messages with actionable recovery options

### 3. Diagram Operations Errors
- **Issue**: Diagram save/load failures or backend validation errors
- **Solution**: Local state preservation with sync retry mechanisms
- **Implementation**: Optimistic updates with rollback on failure
- **Recovery**: Auto-save draft state and manual retry options

### 4. Tab Management Errors
- **Issue**: Tab state corruption or memory leaks from multiple editors
- **Solution**: Proper cleanup of editor instances and state isolation
- **Implementation**: Tab lifecycle management with resource cleanup
- **Recovery**: Automatic tab recovery from local state

### 5. Navigation Pane State Errors
- **Issue**: Diagram list loading failures or UI state corruption
- **Solution**: State validation with fallback to empty state
- **Implementation**: Local UI state management with backend sync
- **Recovery**: Refresh diagram list with loading indicators

### 6. Modular Component Errors
- **Issue**: Editor component initialization or communication failures
- **Solution**: Component error boundaries and graceful degradation
- **Implementation**: Error boundaries around editor components
- **Recovery**: Component re-initialization with preserved state

## Testing Strategy

### 1. Unit Tests
- **Backend API Service**: Test ProjectApiService methods with mock API responses
- **Project Management**: Test project CRUD operations and state management
- **Tab Manager**: Test tab creation, switching, closing, and state persistence
- **Navigation Pane**: Test collapse/expand, diagram list management, and toolbar actions
- **Modular Editor Component**: Test MermaidEditorComponent integration and functionality
- **State Management**: Test workspace state transitions and action dispatching

### 2. Integration Tests
- **Backend Integration Flow**: Test complete API integration from project creation to diagram editing
- **Project Workspace Flow**: Test complete project creation → diagram addition → editing workflow
- **Multi-Tab Editing**: Test simultaneous editing of multiple diagrams with state isolation
- **Navigation Integration**: Test diagram selection from navigation pane opening correct tabs
- **Diagram Creation Workflow**: Test immediate creation with naming on first save
- **Theme and Settings**: Test theme changes affecting all open editors consistently

### 3. User Experience Tests
- **Workflow Efficiency**: Test common user workflows (create project, add diagrams, edit, save)
- **Tab Management UX**: Test tab switching, closing, and recovery scenarios
- **Navigation UX**: Test collapsible pane behavior and diagram list interactions
- **Error Recovery**: Test user experience during API error scenarios with clear messaging
- **Responsive Design**: Test workspace behavior on different screen sizes and orientations

### 4. Performance Tests
- **API Response Performance**: Test loading time for projects and diagrams from backend
- **Memory Management**: Test memory usage with multiple open tabs and large projects
- **Tab Switching Performance**: Test responsiveness when switching between many tabs
- **Editor Instance Management**: Test proper cleanup and resource management
- **Component Rendering Performance**: Test modular component rendering and re-rendering

### 5. Backend Integration Tests
- **API Error Handling**: Test various API error scenarios and recovery mechanisms
- **Network Failure Recovery**: Test offline behavior and reconnection handling
- **Data Synchronization**: Test data consistency between frontend and backend
- **Concurrent Operations**: Test handling of simultaneous API operations

## Implementation Approach

### Phase 1: Backend API Integration Foundation
1. Create ProjectApiService class with Solution Outline Assistant API integration
2. Implement API data models matching backend schema (ProjectCreate, DiagramCreate, etc.)
3. Set up error handling and retry mechanisms for API calls
4. Create API response validation and type safety
5. Test all API endpoints with mock data

### Phase 2: Modular Editor Component Extraction
1. Extract MermaidEditorComponent from existing MermaidRenderer
2. Create clean component interface with props and events
3. Implement editor height optimization within the component
4. Test component isolation and reusability
5. Integrate component back into MermaidRenderer

### Phase 3: Centralized CSS Management
1. Identify common CSS patterns across existing components
2. Move shared styles to main.css with utility classes
3. Remove duplicated CSS from individual components
4. Implement CSS custom properties for theming
5. Test visual consistency across all components

### Phase 4: Project Workspace Layout
1. Create ProjectWorkspace component with dual-pane layout
2. Implement CSS Grid layout for responsive design
3. Create collapsible NavigationPane component
4. Implement pane resizing and state persistence
5. Test layout behavior across different screen sizes

### Phase 5: Navigation Pane Implementation
1. Create ProjectToolbar with backend-integrated project operations
2. Implement DiagramList component with backend data loading
3. Add diagram management actions using API calls
4. Implement collapse/expand functionality with local state
5. Test navigation interactions and API integration

### Phase 6: Tabbed Editor System
1. Create TabManager class for tab lifecycle management
2. Implement EditorTab component with close buttons and modification indicators
3. Create tab switching logic with editor state preservation
4. Implement tab persistence using local storage for UI state only
5. Test multi-tab editing and memory management

### Phase 7: Streamlined Diagram Creation Workflow
1. Implement immediate diagram creation via backend API
2. Create temporary naming system for new diagrams
3. Implement name-on-first-save workflow with dialog
4. Add diagram title update functionality via API
5. Test complete creation workflow from click to save

### Phase 8: State Management and Backend Sync
1. Implement centralized WorkspaceState management
2. Create action dispatchers for all user interactions
3. Add optimistic updates with backend synchronization
4. Implement error handling and rollback mechanisms
5. Test state consistency and conflict resolution

### Phase 9: Integration and Polish
1. Integrate all components into cohesive workspace
2. Implement comprehensive error handling and user feedback
3. Add loading states and progress indicators for API calls
4. Optimize performance for multiple editors and API calls
5. Comprehensive testing across all requirements

## Performance Considerations

### 1. Multi-Tab Editor Performance
- **Memory Management**: Implement lazy loading for inactive tabs to reduce memory footprint
- **Editor Instance Pooling**: Reuse CodeMirror instances when possible to avoid creation overhead
- **State Serialization**: Optimize tab state persistence to minimize storage operations
- **Resource Cleanup**: Ensure proper disposal of editor instances when tabs are closed

### 2. Project Loading Performance
- **Incremental Loading**: Load project metadata first, then diagrams on-demand
- **Caching Strategy**: Cache frequently accessed projects and diagrams in memory
- **Background Processing**: Load large projects asynchronously with progress indicators
- **Lazy Diagram Loading**: Only load diagram content when tabs are activated

### 3. Navigation Pane Performance
- **Virtual Scrolling**: Implement virtual scrolling for projects with many diagrams
- **Search Optimization**: Debounce search queries and implement efficient filtering
- **State Updates**: Minimize re-renders by using efficient state update patterns
- **Collapse Animation**: Use CSS transforms for smooth collapse/expand animations

### 4. File System Integration Performance
- **Batch Operations**: Group multiple file operations to reduce I/O overhead
- **Background Sync**: Perform file synchronization in background workers when possible
- **Compression**: Compress project data for storage and transfer operations
- **Incremental Saves**: Only save changed diagrams rather than entire projects

### 5. State Management Performance
- **Action Batching**: Batch related state updates to minimize re-renders
- **Selective Updates**: Use granular state updates to avoid unnecessary component re-renders
- **Memoization**: Cache computed values and expensive operations
- **Event Debouncing**: Debounce high-frequency events like typing and scrolling

### 6. Responsive Layout Performance
- **CSS Grid Optimization**: Use efficient CSS Grid properties for layout calculations
- **Resize Handling**: Debounce window resize events and optimize layout recalculations
- **Mobile Optimization**: Implement touch-friendly interactions with proper event handling
- **Animation Performance**: Use hardware-accelerated CSS animations for smooth transitions

## Security Considerations

### 1. Project Data Security
- **Data Validation**: Validate all project and diagram data before storage/processing
- **Schema Validation**: Implement strict schema validation for project import/export
- **Content Sanitization**: Sanitize user-generated content (project names, diagram names, content)
- **Access Control**: Implement proper access controls for project operations
- **Data Integrity**: Use checksums and validation to ensure project data integrity

### 2. Multi-Tab Security
- **State Isolation**: Ensure proper isolation between different editor tab states
- **Memory Protection**: Prevent memory leaks that could expose sensitive diagram content
- **Cross-Tab Communication**: Secure any communication between multiple editor instances
- **Resource Limits**: Implement limits to prevent resource exhaustion attacks

### 3. File System Integration Security
- **Path Validation**: Validate and sanitize all file paths to prevent directory traversal
- **Permission Checks**: Verify file system permissions before operations
- **File Type Validation**: Validate file types and extensions for security
- **Size Limits**: Implement file size limits to prevent storage exhaustion
- **Malicious Content**: Scan imported files for potentially malicious content

### 4. Project Import/Export Security
- **Format Validation**: Strictly validate project file formats and structure
- **Content Filtering**: Filter potentially dangerous content during import
- **Version Compatibility**: Ensure secure handling of different project versions
- **Backup Integrity**: Verify backup file integrity before restoration
- **Export Sanitization**: Sanitize exported data to prevent information leakage

### 5. State Management Security
- **State Validation**: Validate workspace state before persistence and restoration
- **Sensitive Data**: Ensure sensitive information is not stored in persistent state
- **State Tampering**: Protect against malicious state modification
- **Session Security**: Implement secure session management for workspace state

### 6. Navigation and UI Security
- **Input Validation**: Validate all user inputs in navigation and toolbar components
- **XSS Prevention**: Prevent cross-site scripting in dynamic content rendering
- **Event Handling**: Secure event handling to prevent malicious event injection
- **UI State Protection**: Protect UI state from manipulation that could cause security issues

### 7. localStorage and Browser Storage Security
- **Data Encryption**: Consider encrypting sensitive project data in localStorage
- **Storage Quotas**: Handle storage quota limits securely without data loss
- **Cross-Origin Protection**: Ensure proper origin isolation for stored data
- **Data Cleanup**: Implement secure data cleanup when projects are deleted
- **Backup Security**: Secure handling of backup data and recovery processes