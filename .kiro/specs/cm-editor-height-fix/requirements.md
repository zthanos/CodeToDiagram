# Requirements Document

## Introduction

This version introduces a major UI/UX transformation from a single-diagram editor to a comprehensive project-based workspace. The application will support projects containing multiple diagrams, with a collapsible left pane for project navigation and a tabbed right pane for editing multiple diagrams simultaneously. This enhancement will significantly improve productivity for users working with complex diagram sets and related documentation.

## Requirements

### Requirement 1

**User Story:** As a user editing Mermaid diagrams, I want the CodeMirror editor to extend to the full height of its container, so that I can see more of my diagram code and work more efficiently.

#### Acceptance Criteria

1. WHEN the MermaidRenderer component is loaded THEN the CodeMirror editor SHALL occupy the full available height of the editor pane
2. WHEN the browser window is resized THEN the CodeMirror editor SHALL automatically adjust its height to maintain full container utilization
3. WHEN the split pane is dragged to resize THEN the CodeMirror editor SHALL maintain full height within its adjusted container

### Requirement 2

**User Story:** As a user working on different screen sizes, I want the editor height to be responsive, so that I can work effectively on both desktop and mobile devices.

#### Acceptance Criteria

1. WHEN viewing on desktop screens THEN the editor SHALL utilize the full available height minus header and status bar space
2. WHEN viewing on mobile devices THEN the editor SHALL maintain proper height proportions in responsive layout
3. WHEN switching between landscape and portrait orientations THEN the editor height SHALL adjust appropriately

### Requirement 3

**User Story:** As a user starting with an empty editor, I want the CodeMirror editor to extend to the full height even when no content is present, so that I have the full editing area available from the start.

#### Acceptance Criteria

1. WHEN the editor is empty or contains minimal content THEN the CodeMirror editor SHALL still occupy the full available height of the editor pane
2. WHEN the editor has no content THEN the editor SHALL display with full height and proper cursor positioning
3. WHEN content is added to an initially empty editor THEN the editor SHALL maintain its full height without layout shifts

### Requirement 4

**User Story:** As a user working with files, I want to see a filename bar above the editor with visual indicators for file modification status, so that I can easily track which file I'm working on and whether it has unsaved changes.

#### Acceptance Criteria

1. WHEN a file is loaded or being edited THEN a filename bar SHALL be displayed above the CodeMirror editor in the left pane
2. WHEN the file has unsaved changes THEN the filename bar SHALL display a visual indicator (such as an asterisk or dot) to show modification status
3. WHEN no file is loaded THEN the filename bar SHALL display appropriate placeholder text (such as "Untitled")
4. WHEN the filename bar is added THEN the CodeMirror editor SHALL still maintain full height within the remaining available space

### Requirement 5

**User Story:** As a user working with multiple browser instances or tabs, I want each opened file to have isolated localStorage management, so that different browser sessions don't interfere with each other's file data.

#### Acceptance Criteria

1. WHEN a user loads a file THEN the system SHALL generate a unique hashcode based on the file content or metadata to use as a localStorage key
2. WHEN multiple browser instances are open with different files THEN each SHALL maintain separate localStorage entries using their respective hashcodes
3. WHEN the same file is opened in multiple browser instances THEN they SHALL share the same localStorage key based on the file's hashcode
4. WHEN auto-save or file state is stored THEN it SHALL use the file-specific hashcode key instead of a global key

### Requirement 6

**User Story:** As a user writing Mermaid diagram code, I want the editor to have proper syntax highlighting and color scheme for Mermaid syntax, so that I can easily read and write diagram code with better visual clarity.

#### Acceptance Criteria

1. WHEN typing Mermaid diagram code THEN the editor SHALL apply appropriate syntax highlighting for Mermaid keywords, operators, and structure
2. WHEN viewing Mermaid code THEN different syntax elements SHALL be displayed in distinct colors (keywords, strings, comments, etc.)
3. WHEN the theme is changed THEN the Mermaid syntax highlighting SHALL adapt to match the selected theme's color scheme
4. WHEN syntax highlighting is applied THEN it SHALL not interfere with editor performance or existing functionality

### Requirement 7

**User Story:** As a developer maintaining the codebase, I want the height fix to be implemented without breaking existing functionality, so that all current features continue to work properly.

#### Acceptance Criteria

1. WHEN the height fix is applied THEN all existing editor functionality SHALL continue to work unchanged
2. WHEN the height fix is applied THEN the split pane resizing functionality SHALL continue to work properly
3. WHEN the height fix is applied THEN the diagram rendering pane SHALL maintain its proper dimensions and behavior

### Requirement 8

**User Story:** As a user working with multiple related diagrams, I want to organize them into projects with a dedicated workspace, so that I can manage complex diagram sets more effectively.

#### Acceptance Criteria

1. WHEN I create a new project THEN the system SHALL provide a workspace that can contain multiple diagrams
2. WHEN I work within a project THEN all diagrams SHALL be logically grouped and easily accessible
3. WHEN I switch between projects THEN the system SHALL maintain separate workspaces for each project
4. WHEN I save a project THEN all associated diagrams and project metadata SHALL be persisted together

### Requirement 9

**User Story:** As a user managing multiple diagrams in a project, I want a collapsible left pane that displays all diagrams in a list, so that I can easily navigate between different diagrams in my project.

#### Acceptance Criteria

1. WHEN I open a project THEN a left pane SHALL display showing all diagrams in the project as a list
2. WHEN I want to save screen space THEN I SHALL be able to collapse the left pane to hide the diagram list
3. WHEN the left pane is collapsed THEN I SHALL be able to expand it again to show the diagram list
4. WHEN I click on a diagram in the list THEN that diagram SHALL open in the editor on the right side
5. WHEN no diagrams exist in the project THEN the left pane SHALL display an appropriate empty state message

### Requirement 10

**User Story:** As a user working with multiple diagrams simultaneously, I want each diagram to open in a separate tab in the right pane, so that I can quickly switch between different diagrams without losing my work.

#### Acceptance Criteria

1. WHEN I select a diagram from the left pane THEN it SHALL open in a new tab in the right pane
2. WHEN I select a diagram that is already open THEN the system SHALL navigate to the existing tab instead of creating a duplicate
3. WHEN I have multiple tabs open THEN each tab SHALL display the diagram name and modification status
4. WHEN I click on a tab THEN that diagram SHALL become the active editor
5. WHEN I switch between tabs THEN each diagram SHALL maintain its editor state (cursor position, scroll position, undo history)

### Requirement 11

**User Story:** As a user working with multiple open diagrams, I want each tab to have a close button, so that I can close diagrams I'm no longer actively editing to keep my workspace organized.

#### Acceptance Criteria

1. WHEN a diagram is open in a tab THEN the tab SHALL display a close button (×)
2. WHEN I click the close button on a tab THEN that diagram SHALL be closed and removed from the tab bar
3. WHEN I close a tab with unsaved changes THEN the system SHALL prompt me to save or discard changes
4. WHEN I close the last open tab THEN the right pane SHALL display an appropriate empty state
5. WHEN I close a tab THEN the system SHALL automatically switch to another open tab if available

### Requirement 12

**User Story:** As a user managing projects, I want a toolbar at the top of the left pane that shows the current project name and provides actions for project management, so that I can easily identify my current project and perform project-level operations.

#### Acceptance Criteria

1. WHEN I have a project open THEN the left pane toolbar SHALL display the current project name prominently
2. WHEN no project is open THEN the toolbar SHALL display appropriate placeholder text
3. WHEN I want to create a new project THEN the toolbar SHALL provide a "Create Project" action
4. WHEN I want to add existing diagrams to the current project THEN the toolbar SHALL provide an "Add Diagram" action
5. WHEN I want to create new diagrams in the current project THEN the toolbar SHALL provide a "Create Diagram" action
6. WHEN I interact with project actions THEN the system SHALL provide appropriate dialogs or interfaces for project management

### Requirement 15

**User Story:** As a user working within a project, I want to be able to add existing diagram files to my project, so that I can incorporate previously created diagrams into my current workspace.

#### Acceptance Criteria

1. WHEN I click the "Add Diagram" button THEN the system SHALL open a file picker dialog to select existing diagram files
2. WHEN I select one or more diagram files THEN they SHALL be added to the current project and appear in the diagram list
3. WHEN I add a diagram file THEN it SHALL be copied or linked to the project workspace appropriately
4. WHEN adding a diagram with the same name as an existing diagram THEN the system SHALL handle naming conflicts (rename, replace, or cancel options)
5. WHEN a diagram is successfully added THEN it SHALL automatically open in a new tab for immediate editing

### Requirement 16

**User Story:** As a user working within a project, I want to be able to create new empty diagrams directly in my project, so that I can start fresh diagrams without leaving my project workspace.

#### Acceptance Criteria

1. WHEN I click the "Create Diagram" button THEN the system SHALL prompt me to enter a filename for the new diagram
2. WHEN I provide a valid filename THEN the system SHALL create an empty diagram file in the current project
3. WHEN the new diagram is created THEN it SHALL automatically open in a new tab with an empty editor ready for input
4. WHEN I create a diagram with a name that already exists THEN the system SHALL prompt for a different name or offer to append a number/suffix
5. WHEN the new diagram is created and opened THEN it SHALL be immediately available in the project's diagram list
6. WHEN I start typing in the new empty editor THEN the diagram SHALL be marked as modified and ready for saving to the project

### Requirement 13

**User Story:** As a user working with diagram projects, I want to be able to load a complete project with all its associated diagrams, so that I can resume work on complex projects with all related files intact.

#### Acceptance Criteria

1. WHEN I load a project THEN the system SHALL load all diagrams associated with that project
2. WHEN a project is loaded THEN all diagrams SHALL appear in the left pane diagram list
3. WHEN I load a project THEN the system SHALL restore the project's previous state (open tabs, active diagram, etc.)
4. WHEN loading a project fails THEN the system SHALL provide clear error messages and fallback options
5. WHEN I load a different project THEN the current project SHALL be properly closed and its state saved

### Requirement 14

**User Story:** As a user creating and managing diagrams within projects, I want the system to maintain proper file associations and metadata, so that each diagram retains its identity and properties within the project context.

#### Acceptance Criteria

1. WHEN I create a new diagram in a project THEN it SHALL be automatically associated with that project
2. WHEN I rename a diagram THEN the change SHALL be reflected in the project structure and diagram list
3. WHEN I move or copy diagrams between projects THEN the system SHALL maintain proper file associations
4. WHEN I delete a diagram from a project THEN it SHALL be removed from the project but with confirmation to prevent accidental loss
5. WHEN diagrams have metadata (creation date, last modified, etc.) THEN this information SHALL be preserved and displayed appropriately