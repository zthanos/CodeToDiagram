/**
 * Main types export file
 * Exports all TypeScript interfaces for the project management system
 */

// Project and diagram types
export * from './project';

// Workspace and tab management types
export * from './workspace';

// File system integration types
export * from './filesystem';

// Requirements workspace types
export * from './requirements';

// Re-export commonly used types for convenience
export type {
  Project,
  Diagram,
  DiagramType,
  ProjectSettings,
  ProjectMetadata
} from './project';

export type {
  WorkspaceState,
  EditorTab
} from './workspace';

export type {
  StorageProvider,
  FileOperationResult
} from './filesystem';

export type {
  RequirementsDocument,
  RequirementItem,
  SystemInfo,
  TeamInfo,
  RequirementsWorkspaceState,
  RequirementsErrorType
} from './requirements';