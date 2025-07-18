# Requirements Document

## Introduction

The CodeMirror editor (cm-editor) in the MermaidRenderer component is not extending to the full available height within its container. This creates a poor user experience where the editor appears truncated or doesn't utilize the available vertical space effectively, making it difficult for users to work with larger diagrams or see more content at once.

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