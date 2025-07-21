# Requirements Document

## Introduction

This feature transforms the Mermaid diagram editor from a single-diagram interface into a comprehensive project-based workspace with backend persistence. The system will use a backend API for project and diagram management instead of localStorage, implement a modular component architecture, and provide an improved user experience for managing multiple diagrams within projects.

## Requirements

### Requirement 1: Backend-Based Project Management

**User Story:** As a user working with multiple related diagrams, I want projects to be stored and managed through the Solution Outline Assistant API, so that my data is persistent, shareable, and accessible across different sessions and devices.

#### Acceptance Criteria

1. WHEN I create a new project THEN the system SHALL send a POST request to `/projects/create` with ProjectCreate schema
2. WHEN I load projects THEN the system SHALL fetch project data from `/projects/list` endpoint
3. WHEN I need project details THEN the system SHALL load project outline from `/projects/{project_id}/outline` endpoint
4. WHEN I switch between projects THEN the system SHALL load project data from the backend without using localStorage
5. WHEN the backend is unavailable THEN the system SHALL provide appropriate error handling and user feedback

### Requirement 2: Backend-Based Diagram Management

**User Story:** As a user creating and editing diagrams, I want all diagram operations to be handled through the Solution Outline Assistant API, so that my diagrams are reliably stored and can be accessed from anywhere.

#### Acceptance Criteria

1. WHEN I create a new diagram THEN the system SHALL send a POST request to `/projects/{project_id}/diagrams/add` with DiagramCreate schema (title, mermaid_code, type)
2. WHEN I load diagrams for a project THEN the system SHALL fetch diagram data from `/projects/{project_id}/diagrams/list` endpoint
3. WHEN I open a specific diagram THEN the system SHALL fetch diagram details from `/projects/{project_id}/diagrams/{diagram_id}` endpoint
4. WHEN I delete a diagram THEN the system SHALL send a DELETE request to `/projects/{project_id}/diagrams/{diagram_id}/delete` with proper confirmation
5. WHEN diagram operations fail THEN the system SHALL provide clear error messages and retry options

### Requirement 3: Modular Editor Component Architecture

**User Story:** As a developer maintaining the codebase, I want the Mermaid editor to be extracted into a smaller, reusable component that can be integrated into the MermaidRenderer, so that the code is more modular and maintainable.

#### Acceptance Criteria

1. WHEN the editor is implemented THEN it SHALL be a separate, focused component responsible only for text editing
2. WHEN the MermaidRenderer uses the editor THEN it SHALL integrate the editor component seamlessly
3. WHEN the editor component is created THEN it SHALL have a clean, well-defined interface for parent components
4. WHEN the editor is refactored THEN all existing functionality SHALL be preserved
5. WHEN the editor component is reused THEN it SHALL work consistently across different contexts

### Requirement 4: Centralized CSS Management

**User Story:** As a developer maintaining the application styles, I want common CSS to be moved to the main CSS file to eliminate duplication across components, so that styles are consistent and easier to maintain.

#### Acceptance Criteria

1. WHEN common styles are identified THEN they SHALL be moved from individual components to the main CSS file
2. WHEN styles are centralized THEN there SHALL be no duplication of CSS rules across components
3. WHEN the CSS is refactored THEN the visual appearance SHALL remain unchanged
4. WHEN new components are added THEN they SHALL use the centralized common styles
5. WHEN styles need to be updated THEN changes SHALL only need to be made in one location

### Requirement 5: Improved Diagram Creation Workflow

**User Story:** As a user creating new diagrams, I want the system to create diagrams immediately with a project association and only prompt for naming when I first save, so that I can start working right away without interruption.

#### Acceptance Criteria

1. WHEN I click "Create Diagram" THEN the system SHALL immediately create a new diagram with the current project-id in the backend
2. WHEN a new diagram is created THEN it SHALL open in a new tab with a temporary name (e.g., "Untitled Diagram")
3. WHEN I first save the diagram THEN the system SHALL prompt me to provide a name for the diagram
4. WHEN I provide a diagram name THEN the system SHALL update the diagram record in the backend
5. WHEN I start typing in a new diagram THEN I SHALL be able to work immediately without naming dialogs

### Requirement 6: Collapsible Project Navigation

**User Story:** As a user managing multiple diagrams in a project, I want a collapsible left pane that displays all diagrams in a list, so that I can easily navigate between different diagrams in my project.

#### Acceptance Criteria

1. WHEN I open a project THEN a left pane SHALL display showing all diagrams fetched from the backend
2. WHEN I want to save screen space THEN I SHALL be able to collapse the left pane to hide the diagram list
3. WHEN the left pane is collapsed THEN I SHALL be able to expand it again to show the diagram list
4. WHEN I click on a diagram in the list THEN that diagram SHALL be loaded from the backend and opened in the editor
5. WHEN no diagrams exist in the project THEN the left pane SHALL display an appropriate empty state message

### Requirement 7: Tabbed Multi-Diagram Editing

**User Story:** As a user working with multiple diagrams simultaneously, I want each diagram to open in a separate tab in the right pane, so that I can quickly switch between different diagrams without losing my work.

#### Acceptance Criteria

1. WHEN I select a diagram from the left pane THEN it SHALL be loaded from the backend and opened in a new tab
2. WHEN I select a diagram that is already open THEN the system SHALL navigate to the existing tab instead of creating a duplicate
3. WHEN I have multiple tabs open THEN each tab SHALL display the diagram name and modification status
4. WHEN I click on a tab THEN that diagram SHALL become the active editor
5. WHEN I switch between tabs THEN each diagram SHALL maintain its editor state (cursor position, scroll position, undo history)

### Requirement 8: Tab Management with Backend Integration

**User Story:** As a user working with multiple open diagrams, I want each tab to have a close button and proper save handling, so that I can manage my workspace efficiently while ensuring data is saved to the backend.

#### Acceptance Criteria

1. WHEN a diagram is open in a tab THEN the tab SHALL display a close button (×)
2. WHEN I click the close button on a tab THEN that diagram SHALL be closed and removed from the tab bar
3. WHEN I close a tab with unsaved changes THEN the system SHALL prompt me to save changes to the backend or discard them
4. WHEN I close the last open tab THEN the right pane SHALL display an appropriate empty state
5. WHEN I close a tab THEN the system SHALL automatically switch to another open tab if available

### Requirement 9: Project Management Toolbar

**User Story:** As a user managing projects, I want a toolbar at the top of the left pane that shows the current project name and provides actions for project management, so that I can easily identify my current project and perform project-level operations.

#### Acceptance Criteria

1. WHEN I have a project open THEN the left pane toolbar SHALL display the current project name loaded from the backend
2. WHEN no project is open THEN the toolbar SHALL display appropriate placeholder text
3. WHEN I want to create a new project THEN the toolbar SHALL provide a "Create Project" action that creates the project via backend API
4. WHEN I want to create new diagrams in the current project THEN the toolbar SHALL provide a "Create Diagram" action
5. WHEN I interact with project actions THEN all operations SHALL be performed through backend API calls

### Requirement 10: Editor Height Optimization

**User Story:** As a user editing Mermaid diagrams, I want the CodeMirror editor to extend to the full height of its container, so that I can see more of my diagram code and work more efficiently.

#### Acceptance Criteria

1. WHEN the editor component is displayed THEN the CodeMirror editor SHALL occupy the full available height of the editor pane
2. WHEN the browser window is resized THEN the CodeMirror editor SHALL automatically adjust its height
3. WHEN the split pane is dragged to resize THEN the CodeMirror editor SHALL maintain full height within its container
4. WHEN the editor is empty THEN it SHALL still occupy the full available height with proper cursor positioning

### Requirement 11: Enhanced Editor Features

**User Story:** As a user writing Mermaid diagram code, I want the editor to have proper syntax highlighting and file status indicators, so that I can work more effectively with better visual feedback.

#### Acceptance Criteria

1. WHEN typing Mermaid code THEN the editor component SHALL apply appropriate syntax highlighting for Mermaid syntax
2. WHEN a diagram has unsaved changes THEN the tab SHALL display a visual indicator (asterisk or dot)
3. WHEN no diagram is loaded THEN the tab SHALL display appropriate placeholder text
4. WHEN syntax highlighting is applied THEN it SHALL not interfere with editor performance or functionality

### Requirement 12: Responsive Design and Error Handling

**User Story:** As a user working on different devices and network conditions, I want the workspace to be responsive and handle backend errors gracefully, so that I can work effectively regardless of technical constraints.

#### Acceptance Criteria

1. WHEN viewing on desktop screens THEN the workspace SHALL utilize available space efficiently
2. WHEN viewing on mobile devices THEN the layout SHALL adapt appropriately for smaller screens
3. WHEN backend requests fail THEN the system SHALL provide clear error messages and retry options
4. WHEN the network is unavailable THEN the system SHALL indicate the connection status and allow offline editing where possible