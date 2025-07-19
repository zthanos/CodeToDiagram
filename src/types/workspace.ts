/**
 * TypeScript interfaces for Workspace and Tab management
 * Requirements: 8.1, 8.2, 14.1
 */

import { Project, Diagram, EditorState } from './project';

// Editor tab interface
export interface EditorTab {
  id: string;
  diagramId: string;
  title: string;
  isModified: boolean;
  isActive: boolean;
  isPinned: boolean;
  editorState: EditorState;
  lastAccessed: Date;
}

// Navigation pane state interface
export interface NavigationPaneState {
  isCollapsed: boolean;
  width: number;
  selectedDiagramId: string | null;
  searchQuery: string;
  sortBy: 'name' | 'modified' | 'created';
}

// Editor pane state interface
export interface EditorPaneState {
  openTabs: EditorTab[];
  activeTabId: string | null;
  tabOrder: string[];
  splitView: boolean;
}

// Application notification interface
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

// Application settings interface
export interface ApplicationSettings {
  theme: string;
  autoSave: boolean;
  autoSaveInterval: number;
  maxRecentProjects: number;
  enableNotifications: boolean;
  debugMode: boolean;
}

// Main workspace state interface
export interface WorkspaceState {
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

// Project reference interface (re-exported for convenience)
export interface ProjectReference {
  id: string;
  name: string;
  lastAccessed: Date;
  path?: string;
}

// Workspace actions interface
export interface WorkspaceActions {
  // Project actions
  createProject(name: string): Promise<void>;
  loadProject(projectId: string): Promise<void>;
  saveCurrentProject(): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  
  // Navigation actions
  toggleNavigation(): void;
  selectDiagram(diagramId: string): void;
  
  // Tab actions
  openDiagram(diagram: Diagram): void;
  closeTab(tabId: string): void;
  switchTab(tabId: string): void;
  closeAllTabs(): void;
  
  // Editor actions
  updateDiagramContent(diagramId: string, content: string): void;
  saveDiagram(diagramId: string): Promise<void>;
  
  // Settings actions
  updateSettings(settings: Partial<ApplicationSettings>): void;
  updateTheme(theme: string): void;
}