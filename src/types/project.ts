/**
 * TypeScript interfaces for Project and Diagram data models
 * Requirements: 8.1, 8.2, 14.1
 */

// Diagram type enumeration
export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'journey';

// Cursor and scroll position interfaces
export interface CursorPosition {
  line: number;
  column: number;
}

export interface ScrollPosition {
  top: number;
  left: number;
}

export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
}

// Undo history state interface
export interface UndoHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoStack?: string[];
  redoStack?: string[];
  currentIndex?: number;
}

// Editor state interface
export interface EditorState {
  content: string;
  cursorPosition: CursorPosition;
  scrollPosition: ScrollPosition;
  selectionRange?: SelectionRange;
  undoHistory: UndoHistoryState;
}

// Diagram metadata interface
export interface DiagramMetadata {
  contentHash: string;
  size: number;
  lineCount: number;
  lastCursorPosition?: CursorPosition;
  lastScrollPosition?: ScrollPosition;
}

// Main Diagram interface
export interface Diagram {
  id: Number| null;
  title: string;
  content: string;
  type: DiagramType;
  projectId: string;
  filePath?: string;
  createdAt?: Date;
  lastModified?: Date;
  isModified?: boolean;
  metadata?: DiagramMetadata;
}

// Editor settings interface
export interface EditorSettings {
  theme: string;
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

// Project settings interface
export interface ProjectSettings {
  theme: string;
  autoSave: boolean;
  defaultDiagramType: DiagramType;
  editorSettings: EditorSettings;
}

// Workspace layout interface
export interface WorkspaceLayout {
  navigationPaneWidth: number;
  navigationPaneCollapsed: boolean;
  lastOpenedTabs: string[];
  activeTabId?: string;
}

// Project metadata interface
export interface ProjectMetadata {
  version: string;
  author?: string;
  tags: string[];
  lastOpenedDiagrams: string[];
  workspaceLayout: WorkspaceLayout;
}

// Main Project interface
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastModified: Date;
  diagrams: Diagram[];
  requirements: [],
  teams: [],
  tasks:[],
  
  settings: ProjectSettings;
  metadata: ProjectMetadata;
}

// Project reference for recent projects list
export interface ProjectReference {
  id: string;
  name: string;
  lastAccessed: Date;
  path?: string;
}