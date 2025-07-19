# Design Document

## Overview

This design transforms the application from a single-diagram editor into a comprehensive project-based workspace. The new architecture supports multiple diagrams organized within projects, featuring a collapsible left navigation pane for project management and a tabbed right pane for editing multiple diagrams simultaneously.

The solution involves creating a new project management system, implementing a dual-pane layout with collapsible navigation, developing a tabbed editor interface, and maintaining all existing editor functionality while adding robust project-level file management capabilities.

## Architecture

### Current Architecture Limitations
- Single-diagram editing interface limits productivity for complex projects
- No project organization or workspace management capabilities
- Lack of multi-diagram navigation and management
- No support for simultaneous editing of multiple related diagrams
- Limited file organization and project-level operations

### New Project-Based Architecture
The new architecture transforms the application into a comprehensive workspace with the following key components:

1. **Project Management Layer**: Handles project creation, loading, and persistence
2. **Dual-Pane Layout**: Left navigation pane + right tabbed editor pane
3. **Navigation System**: Collapsible left pane with project toolbar and diagram list
4. **Tabbed Editor System**: Multi-tab interface for simultaneous diagram editing
5. **Enhanced File Management**: Project-scoped file operations and state management

### Architecture Components Overview

```
ProjectWorkspace
├── ProjectManager (handles project CRUD operations)
├── NavigationPane (left pane)
│   ├── ProjectToolbar (project name + actions)
│   └── DiagramList (collapsible diagram navigation)
└── EditorPane (right pane)
    ├── TabManager (manages multiple editor tabs)
    └── MermaidEditor[] (array of editor instances)
```

## Components and Interfaces

### 1. New Project-Based Layout Structure

**Current Single-Editor Structure:**
```
.app-layout
├── .app-header
└── .app-main
    └── .mermaid-editor (single editor)
        ├── .notification
        └── .split-pane
            ├── .editor-pane
            └── .diagram-pane
```

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
        │   │       ├── .add-diagram-btn
        │   │       └── .create-diagram-btn
        │   └── .diagram-list
        │       └── .diagram-item[]
        ├── .pane-splitter (resizable)
        └── .editor-pane (right, tabbed)
            ├── .tab-bar
            │   └── .editor-tab[]
            │       ├── .tab-title
            │       └── .tab-close-btn
            └── .tab-content
                └── .mermaid-editor-instance
                    ├── .editor-toolbar
                    └── .split-pane
                        ├── .code-editor
                        └── .diagram-preview
```

### 2. Core Component Interfaces

**Project Management Interface:**
```javascript
interface ProjectManager {
  // Project CRUD operations
  createProject(name: string): Promise<Project>;
  loadProject(projectId: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  
  // Project state management
  getCurrentProject(): Project | null;
  setCurrentProject(project: Project): void;
  getProjectList(): Promise<Project[]>;
}

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  diagrams: Diagram[];
  metadata: ProjectMetadata;
}

interface Diagram {
  id: string;
  name: string;
  content: string;
  filePath?: string;
  lastModified: Date;
  isModified: boolean;
}
```

**Navigation Pane Interface:**
```javascript
interface NavigationPane {
  // Visibility control
  isCollapsed: boolean;
  toggleCollapse(): void;
  
  // Project toolbar
  projectName: string;
  onCreateProject(): void;
  onAddDiagram(): void;
  onCreateDiagram(): void;
  
  // Diagram list
  diagrams: Diagram[];
  selectedDiagram: string | null;
  onDiagramSelect(diagramId: string): void;
  onDiagramRename(diagramId: string, newName: string): void;
  onDiagramDelete(diagramId: string): void;
}
```

**Tab Manager Interface:**
```javascript
interface TabManager {
  // Tab management
  openTabs: EditorTab[];
  activeTabId: string | null;
  
  // Tab operations
  openTab(diagram: Diagram): EditorTab;
  closeTab(tabId: string): void;
  switchToTab(tabId: string): void;
  closeAllTabs(): void;
  
  // Tab state
  getTabByDiagramId(diagramId: string): EditorTab | null;
  isTabModified(tabId: string): boolean;
  saveTab(tabId: string): Promise<void>;
}

interface EditorTab {
  id: string;
  diagramId: string;
  title: string;
  isModified: boolean;
  isActive: boolean;
  editorInstance: MermaidEditor;
}
```

### 3. Enhanced File Management System

**Project-Scoped File Management:**
```javascript
interface ProjectFileManager extends FileHashManager {
  // Project-level operations
  loadProjectFiles(projectId: string): Promise<Diagram[]>;
  saveProjectFiles(projectId: string, diagrams: Diagram[]): Promise<void>;
  
  // Diagram operations within project
  addExistingDiagram(projectId: string, filePath: string): Promise<Diagram>;
  createNewDiagram(projectId: string, name: string): Promise<Diagram>;
  deleteDiagram(projectId: string, diagramId: string): Promise<void>;
  
  // File system integration
  exportProject(project: Project): Promise<void>;
  importProject(filePath: string): Promise<Project>;
}
```

### 4. Responsive Layout System

**CSS Grid Layout for Project Workspace:**
```css
.project-workspace {
  display: grid;
  grid-template-columns: var(--nav-width, 300px) 1fr;
  grid-template-rows: 1fr;
  height: 100vh;
  transition: grid-template-columns 0.3s ease;
}

.project-workspace.nav-collapsed {
  --nav-width: 0px;
}

.navigation-pane {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}

.editor-pane {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
```

### 5. State Management Architecture

**Centralized State Management:**
```javascript
interface WorkspaceState {
  // Project state
  currentProject: Project | null;
  projectList: Project[];
  
  // UI state
  navigationCollapsed: boolean;
  activeTabId: string | null;
  openTabs: EditorTab[];
  
  // Editor state
  theme: string;
  editorSettings: EditorSettings;
  
  // Persistence state
  autoSaveEnabled: boolean;
  lastSaved: Date | null;
}

interface WorkspaceActions {
  // Project actions
  createProject(name: string): void;
  loadProject(projectId: string): void;
  saveCurrentProject(): void;
  
  // Navigation actions
  toggleNavigation(): void;
  selectDiagram(diagramId: string): void;
  
  // Tab actions
  openDiagram(diagram: Diagram): void;
  closeTab(tabId: string): void;
  switchTab(tabId: string): void;
  
  // Editor actions
  updateDiagramContent(diagramId: string, content: string): void;
  saveDiagram(diagramId: string): void;
}
```

## Data Models

### 1. Project Data Model
```javascript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastModified: Date;
  diagrams: Diagram[];
  settings: ProjectSettings;
  metadata: ProjectMetadata;
}

interface ProjectSettings {
  theme: string;
  autoSave: boolean;
  defaultDiagramType: string;
  editorSettings: EditorSettings;
}

interface ProjectMetadata {
  version: string;
  author?: string;
  tags: string[];
  lastOpenedDiagrams: string[];
  workspaceLayout: WorkspaceLayout;
}
```

### 2. Diagram Data Model
```javascript
interface Diagram {
  id: string;
  name: string;
  content: string;
  type: DiagramType;
  filePath?: string;
  createdAt: Date;
  lastModified: Date;
  isModified: boolean;
  metadata: DiagramMetadata;
}

interface DiagramMetadata {
  contentHash: string;
  size: number;
  lineCount: number;
  lastCursorPosition?: CursorPosition;
  lastScrollPosition?: ScrollPosition;
}

type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'journey';
```

### 3. Workspace State Model
```javascript
interface WorkspaceState {
  // Project state
  currentProject: Project | null;
  projectList: Project[];
  recentProjects: ProjectReference[];
  
  // UI state
  navigationPane: NavigationPaneState;
  editorPane: EditorPaneState;
  
  // Application state
  theme: string;
  settings: ApplicationSettings;
  notifications: Notification[];
}

interface NavigationPaneState {
  isCollapsed: boolean;
  width: number;
  selectedDiagramId: string | null;
  searchQuery: string;
  sortBy: 'name' | 'modified' | 'created';
}

interface EditorPaneState {
  openTabs: EditorTab[];
  activeTabId: string | null;
  tabOrder: string[];
  splitView: boolean;
}
```

### 4. Tab Management Model
```javascript
interface EditorTab {
  id: string;
  diagramId: string;
  title: string;
  isModified: boolean;
  isActive: boolean;
  isPinned: boolean;
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

### 5. File System Integration Model
```javascript
interface ProjectFileSystem {
  projectPath: string;
  diagramFiles: Map<string, DiagramFile>;
  projectFile: ProjectConfigFile;
  backupFiles: BackupFile[];
}

interface DiagramFile {
  id: string;
  fileName: string;
  filePath: string;
  fileHandle?: FileSystemFileHandle;
  lastSynced: Date;
  syncStatus: 'synced' | 'modified' | 'conflict' | 'error';
}
```

## Error Handling

### 1. Project Management Errors
- **Issue**: Project creation/loading failures
- **Solution**: Comprehensive validation and error recovery
- **Implementation**: Backup project states and rollback mechanisms
- **User Experience**: Clear error messages with recovery options

### 2. Tab Management Errors
- **Issue**: Tab state corruption or memory leaks from multiple editors
- **Solution**: Proper cleanup of editor instances and state isolation
- **Implementation**: Tab lifecycle management with resource cleanup
- **Recovery**: Automatic tab recovery from saved state

### 3. File System Integration Errors
- **Issue**: File access permissions, disk space, or file corruption
- **Solution**: Graceful degradation to localStorage with user notification
- **Implementation**: Multi-tier storage strategy (File System API → localStorage → memory)
- **Recovery**: Automatic backup and restore mechanisms

### 4. Navigation Pane State Errors
- **Issue**: Collapsed state persistence or diagram list corruption
- **Solution**: State validation and default fallbacks
- **Implementation**: Robust state serialization with version compatibility
- **Recovery**: Reset to default layout with user confirmation

### 5. Multi-Tab Editor Synchronization Errors
- **Issue**: Concurrent editing conflicts or state desynchronization
- **Solution**: Event-driven state management with conflict resolution
- **Implementation**: Centralized state store with action dispatching
- **Recovery**: Last-write-wins with user notification of conflicts

### 6. Project Import/Export Errors
- **Issue**: Malformed project files or version incompatibility
- **Solution**: Schema validation and migration utilities
- **Implementation**: Versioned project format with backward compatibility
- **Recovery**: Partial import with error reporting for failed items

## Testing Strategy

### 1. Unit Tests
- **Project Management**: Test project CRUD operations, validation, and state management
- **Tab Manager**: Test tab creation, switching, closing, and state persistence
- **Navigation Pane**: Test collapse/expand, diagram list management, and toolbar actions
- **File System Integration**: Test project import/export, diagram file operations
- **State Management**: Test workspace state transitions and action dispatching

### 2. Integration Tests
- **Project Workspace Flow**: Test complete project creation → diagram addition → editing workflow
- **Multi-Tab Editing**: Test simultaneous editing of multiple diagrams with state isolation
- **Navigation Integration**: Test diagram selection from navigation pane opening correct tabs
- **File Operations**: Test add existing diagram and create new diagram workflows
- **Theme and Settings**: Test theme changes affecting all open editors consistently

### 3. User Experience Tests
- **Workflow Efficiency**: Test common user workflows (create project, add diagrams, edit, save)
- **Tab Management UX**: Test tab switching, closing, and recovery scenarios
- **Navigation UX**: Test collapsible pane behavior and diagram list interactions
- **Error Recovery**: Test user experience during error scenarios with clear messaging
- **Responsive Design**: Test workspace behavior on different screen sizes and orientations

### 4. Performance Tests
- **Memory Management**: Test memory usage with multiple open tabs and large projects
- **Tab Switching Performance**: Test responsiveness when switching between many tabs
- **Project Loading Performance**: Test loading time for projects with many diagrams
- **Editor Instance Management**: Test proper cleanup and resource management
- **State Persistence Performance**: Test save/restore performance for complex workspace states

### 5. Browser Compatibility Tests
- **CSS Grid Layout**: Test project workspace layout across browsers
- **File System API**: Test project import/export with fallback behaviors
- **localStorage Limits**: Test project data storage with quota management
- **Multi-Tab Memory**: Test browser memory handling with multiple editor instances

## Implementation Approach

### Phase 1: Project Management Foundation
1. Create Project and Diagram data models with TypeScript interfaces
2. Implement ProjectManager class with CRUD operations
3. Design project storage schema (localStorage + File System API)
4. Create project validation and migration utilities
5. Test project creation, loading, and persistence

### Phase 2: Workspace Layout Transformation
1. Replace single MermaidRenderer with ProjectWorkspace component
2. Implement CSS Grid layout for dual-pane interface
3. Create collapsible NavigationPane component
4. Implement responsive design for mobile/tablet support
5. Test layout behavior and pane resizing

### Phase 3: Navigation Pane Implementation
1. Create ProjectToolbar component with project name and action buttons
2. Implement DiagramList component with search and sorting
3. Add diagram management actions (rename, delete, duplicate)
4. Implement collapse/expand functionality with state persistence
5. Test navigation interactions and state management

### Phase 4: Tabbed Editor System
1. Create TabManager class for tab lifecycle management
2. Implement EditorTab component with close buttons
3. Create tab switching logic with state preservation
4. Implement tab persistence and recovery
5. Test multi-tab editing and memory management

### Phase 5: File Operations Integration
1. Implement "Add Diagram" functionality for existing files
2. Create "Create Diagram" workflow with filename prompts
3. Integrate File System API for project import/export
4. Add drag-and-drop support for adding diagrams
5. Test file operations and error handling

### Phase 6: State Management and Persistence
1. Implement centralized WorkspaceState management
2. Create action dispatchers for all user interactions
3. Add auto-save functionality for projects and diagrams
4. Implement workspace state persistence and restoration
5. Test state synchronization and conflict resolution

### Phase 7: Enhanced Editor Features
1. Maintain existing Mermaid syntax highlighting and themes
2. Integrate editor toolbar within each tab
3. Preserve existing height calculation and responsive behavior
4. Add project-scoped editor settings
5. Test editor functionality within tabbed interface

### Phase 8: Integration and Polish
1. Integrate all components into cohesive workspace
2. Implement comprehensive error handling and user feedback
3. Add loading states and progress indicators
4. Optimize performance for multiple editors
5. Comprehensive testing across all requirements

### Phase 9: Migration and Backward Compatibility
1. Create migration utility for existing single-diagram data
2. Implement backward compatibility for existing localStorage data
3. Add import functionality for legacy diagram files
4. Test migration scenarios and data preservation
5. Document migration process for users

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