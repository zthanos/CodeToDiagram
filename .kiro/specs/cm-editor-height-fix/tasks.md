# Implementation Plan

- [x] 1. Set up backend API integration foundation
  - [x] 1.1 Create ProjectApiService class with Solution Outline Assistant API integration
    - Create ProjectApiService class with axios HTTP client
    - Implement API methods for projects: createProject, listProjects, getProjectOutline
    - Implement API methods for diagrams: addDiagram, listDiagrams, getDiagram, deleteDiagram
    - Add proper TypeScript interfaces matching backend schema (ProjectCreate, DiagramCreate, etc.)
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ] 1.2 Fix TypeScript errors and improve type safety
    - Fix Promise type issues by updating tsconfig.json to include ES2015+ lib
    - Fix type mismatches between string and number IDs in API calls
    - Add missing type exports (Requirement, Task, Team) to types/project.ts
    - Fix date property mapping between API responses and frontend models
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ] 1.3 Implement API error handling and retry mechanisms
    - Add axios interceptors for error handling and retry logic
    - Implement exponential backoff for failed requests
    - Create user-friendly error messages for different API error types
    - Add network connectivity detection and offline handling
    - _Requirements: 1.5, 2.5, 12.1, 12.3_

- [ ] 2. Extract and modularize editor component
  - [ ] 2.1 Create MermaidEditorComponent as standalone component
    - Extract CodeMirror editor functionality from existing MermaidRenderer
    - Create clean component interface with props (content, onChange, onSave, theme, height)
    - Implement editor height optimization within the component
    - Add proper component lifecycle management and cleanup
    - _Requirements: 3.1, 3.2, 3.3, 9.1, 9.4_

  - [ ] 2.2 Integrate MermaidEditorComponent back into MermaidRenderer
    - Refactor MermaidRenderer to use the new MermaidEditorComponent
    - Maintain all existing functionality (syntax highlighting, themes, split pane)
    - Ensure proper event handling and state management between components
    - Test component isolation and reusability across different contexts
    - _Requirements: 3.4, 3.5, 10.1, 10.4_

  - [ ] 2.3 Test modular editor component functionality
    - Create unit tests for MermaidEditorComponent in isolation
    - Test component props, events, and state management
    - Verify editor height optimization works correctly
    - Ensure existing MermaidRenderer functionality is preserved
    - _Requirements: 3.1, 3.2, 3.3, 9.1_

- [ ] 3. Centralize CSS management
  - [ ] 3.1 Identify and extract common CSS patterns
    - Audit existing components for duplicated CSS rules
    - Identify common layout, spacing, button, and utility patterns
    - Create comprehensive list of styles to move to main.css
    - Document CSS custom properties for theming consistency
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 3.2 Move shared styles to main.css with utility classes
    - Create utility classes for common layout patterns (flex, grid, spacing)
    - Move button styles, tab styles, and form styles to main.css
    - Implement CSS custom properties for consistent theming
    - Remove duplicated CSS from individual component files
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ] 3.3 Update components to use centralized styles
    - Refactor existing components to use new utility classes
    - Update component-specific styles to use CSS custom properties
    - Test visual consistency across all components after refactoring
    - Ensure no visual regressions from CSS centralization
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 4. Create project workspace layout
  - [x] 4.1 Build ProjectWorkspace component with dual-pane layout
    - Create ProjectWorkspace Vue component with CSS Grid layout
    - Implement collapsible left navigation pane and right editor pane
    - Add pane resizing functionality with drag splitter
    - Implement responsive design for mobile and tablet devices
    - _Requirements: 2.1, 2.2, 2.3, 11.1, 11.2_

  - [x] 4.2 Create NavigationPane component structure
    - Build NavigationPane component with collapse/expand functionality
    - Add smooth animations for pane transitions
    - Implement keyboard shortcuts for navigation pane toggle
    - Add state persistence for pane collapsed state (localStorage for UI state only)
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 4.3 Implement ProjectToolbar with backend integration
    - Create ProjectToolbar component displaying current project name from backend
    - Add "Create Project" button that calls backend API
    - Add "Create Diagram" button for streamlined diagram creation workflow
    - Implement loading states and error handling for toolbar actions
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 5. Implement navigation pane with backend data
  - [x] 5.1 Create DiagramList component with backend integration
    - Build DiagramList component that loads diagrams from backend API
    - Implement diagram selection functionality that opens tabs
    - Add loading states and error handling for diagram list
    - Create empty state display when no diagrams exist in project
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ] 5.2 Add diagram management actions via API
    - Implement diagram deletion with backend API calls and confirmation dialogs
    - Add diagram selection handling that loads diagram content from backend
    - Create error handling for failed diagram operations
    - Add optimistic updates with rollback on API failures
    - _Requirements: 2.2, 2.4, 8.2, 8.4_

  - [x] 5.3 Implement project loading and switching
    - Add project list loading from backend API
    - Implement project switching with proper state management
    - Create project loading states and error handling
    - Add project outline loading with diagrams list
    - _Requirements: 1.2, 1.3, 7.1, 7.2, 7.4_

- [x] 6. Build tabbed editor system
  - [x] 6.1 Create TabManager class for tab lifecycle management
    - Implement TabManager class with tab creation, switching, and closing logic
    - Add tab state management with editor state preservation
    - Create tab memory management and proper cleanup
    - Implement tab ordering and active tab management
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 6.2 Build EditorTab component with modification indicators
    - Create EditorTab component with title, modification indicator, and close button
    - Implement tab switching logic and active state visual feedback
    - Add unsaved changes warnings when closing modified tabs
    - Create tab context menu for additional actions
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 4.5_

  - [x] 6.3 Integrate backend-loaded diagrams into tabs
    - Load diagram content from backend API when opening tabs
    - Implement tab opening from navigation pane diagram selection
    - Add tab deduplication (don't open same diagram twice)
    - Create tab state persistence for editor state (cursor, scroll position)
    - _Requirements: 3.1, 3.2, 3.5, 7.3_

- [ ] 7. Implement streamlined diagram creation workflow
  - [ ] 7.1 Integrate diagram creation with backend API
    - Update existing createDiagram() method to use backend API instead of local creation
    - Modify diagram creation to call ProjectApiService.addDiagram() with project ID
    - Ensure new diagrams are immediately persisted to backend with temporary titles
    - Update diagram list refresh after successful creation
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.3_

  - [ ] 7.2 Implement name-on-first-save workflow
    - Modify current immediate naming prompt to name-on-first-save approach
    - Create naming dialog that appears on first save attempt for untitled diagrams
    - Update diagram title in backend when user provides name via API
    - Handle naming conflicts and validation errors with backend
    - Update tab title and navigation pane after successful naming
    - _Requirements: 5.4, 5.5, 6.2, 6.5, 6.6_

  - [ ] 7.3 Add diagram saving with backend persistence
    - Implement diagram content saving using backend API (update existing diagrams)
    - Add backend API method for updating diagram content (PUT/PATCH endpoint)
    - Integrate save functionality with existing MermaidRenderer save operations
    - Add auto-save capabilities that persist to backend
    - Create save status indicators in tabs and UI
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 8.3_

- [ ] 8. Implement state management and backend synchronization
  - [ ] 8.1 Create centralized WorkspaceState management
    - Define WorkspaceState interface for all application state
    - Implement state management with actions and reducers pattern
    - Add state validation and error recovery mechanisms
    - Create state persistence for UI state only (not backend data)
    - _Requirements: 7.1, 7.2, 7.5, 8.1, 8.2_

  - [ ] 8.2 Add optimistic updates with backend synchronization
    - Implement optimistic updates for better user experience
    - Add rollback mechanisms for failed backend operations
    - Create conflict resolution for concurrent operations
    - Add loading states and progress indicators for backend operations
    - _Requirements: 1.5, 2.5, 8.3, 8.4, 12.4_

  - [ ] 8.3 Implement comprehensive error handling
    - Add error boundaries around major components
    - Create user-friendly error messages for different failure types
    - Implement retry mechanisms for recoverable errors
    - Add error logging and reporting for debugging
    - _Requirements: 1.5, 2.5, 7.4, 12.1, 12.3_

- [ ] 9. Enhance editor features and integration
  - [ ] 9.1 Maintain existing editor functionality within tabs
    - Preserve all existing MermaidRenderer functionality in tabbed interface
    - Ensure syntax highlighting works correctly within tabs
    - Maintain theme switching across all open tabs
    - Keep existing height calculation and responsive behavior
    - _Requirements: 9.1, 9.2, 9.4, 10.1, 10.4_

  - [ ] 9.2 Add enhanced editor features
    - Implement proper syntax highlighting for Mermaid syntax
    - Add file status indicators (modified, saved, error states)
    - Create proper placeholder text for empty editors
    - Ensure syntax highlighting doesn't interfere with performance
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 9.3 Implement responsive design and compatibility
    - Ensure workspace layout works on desktop and mobile devices
    - Add responsive breakpoints and mobile-friendly interactions
    - Test cross-browser compatibility and performance
    - Maintain existing functionality across all supported devices
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 10. Final integration and testing
  - [ ] 10.1 Integrate all components into cohesive workspace
    - Connect all components with proper data flow and state management
    - Test complete user workflows from project creation to diagram editing
    - Ensure proper error handling and recovery across all components
    - Validate all requirements are met with integrated solution
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1_

  - [ ] 10.2 Add comprehensive testing and validation
    - Create unit tests for all new components and API integration
    - Implement integration tests for complete backend workflows
    - Add performance tests for multi-tab scenarios and API calls
    - Create end-to-end tests for user workflows
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1, 7.1, 8.1_

  - [ ] 10.3 Performance optimization and polish
    - Optimize API call patterns and caching strategies
    - Implement efficient tab switching and memory management
    - Add loading states and progress indicators throughout the application
    - Perform final cross-browser compatibility testing
    - _Requirements: 9.1, 9.2, 9.4, 11.1, 11.2, 12.4_