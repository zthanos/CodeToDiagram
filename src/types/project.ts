/**
 * TypeScript interfaces for Project and Diagram data models
 * Requirements: 8.1, 8.2, 14.1
 */

import { ADR } from "./adr";
import { Note } from "./notes"

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
  id: number | null;
  title: string;
  content: string;
  type: DiagramType;
  projectId: string;
  filePath?: string;
  createdAt?: Date;
  lastModified?: Date;
  isModified?: boolean;
  metadata?: DiagramMetadata;
  
  // API response fields (for mapping)
  created_at?: string;
  updated_at?: string;
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
  code: string;
  state?: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  lastModified: Date;
  diagrams: Diagram[];
  requirements: Requirement[];
  solution_outline?: SolutionOutline | null;
  requirements_outline?: RequirementsOutline | null;
  teams: Team[];
  tasks: Task[];
  adrs: ADR[];
  notes: Note[];
  
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  
  // API response fields (for mapping)
  created_at?: string;
  updated_at?: string;
}

export interface SolutionOutline{
  content: string;
  status: string;
  latest_version: number;
}

export interface RequirementsOutline{
  content: string;
  status: string;
  latest_version: number;
}


// Requirement interface
export interface Requirement {
  id: number;
  description: string;
  category: 'Functional' | 'Non-Functional';
  source?: 'uploaded' | 'manual';
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

// File upload interface
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string | ArrayBuffer;
  uploadedAt: Date;
}

// Task interface
export interface Task {
  id: number;
  description: string;
  assigned_to_team_id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

// Team interface
export interface Team {
  id: number;
  name: string;
  members?: string;
  createdAt?: Date;
  updatedAt?: Date;
  created_at?: string;
  updated_at?: string;
}

// Navigation state types for workspace sections
export type WorkspaceSection = 'requirements' | 'diagrams' | 'teams' | 'tasks' | 'notes' | 'solution-outline';

export interface NavigationState {
  activeSection: WorkspaceSection;
  sectionHistory: WorkspaceSection[];
  lastVisited: Record<WorkspaceSection, Date>;
}

// Project reference for recent projects list
export interface ProjectReference {
  id: string;
  name: string;
  lastAccessed: Date;
  path?: string;
}