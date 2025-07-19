/**
 * TypeScript interfaces for File System Integration
 * Requirements: 8.4, 13.2, 13.4
 */

import { Project, Diagram } from './project';

// File system file handle interface
export interface DiagramFile {
  id: string;
  fileName: string;
  filePath: string;
  fileHandle?: FileSystemFileHandle;
  lastSynced: Date;
  syncStatus: 'synced' | 'modified' | 'conflict' | 'error';
}

// Project configuration file interface
export interface ProjectConfigFile {
  projectId: string;
  configPath: string;
  lastModified: Date;
  version: string;
}

// Backup file interface
export interface BackupFile {
  id: string;
  projectId: string;
  backupPath: string;
  createdAt: Date;
  size: number;
  type: 'auto' | 'manual';
}

// Project file system interface
export interface ProjectFileSystem {
  projectPath: string;
  diagramFiles: Map<string, DiagramFile>;
  projectFile: ProjectConfigFile;
  backupFiles: BackupFile[];
}

// File operation result interface
export interface FileOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Project import/export interfaces
export interface ProjectExportOptions {
  includeBackups: boolean;
  includeMetadata: boolean;
  format: 'json' | 'zip';
  destination?: string;
}

export interface ProjectImportOptions {
  validateSchema: boolean;
  createBackup: boolean;
  overwriteExisting: boolean;
  source: string | File;
}

// Storage provider interface
export interface StorageProvider {
  // Basic operations
  save(key: string, data: any): Promise<FileOperationResult>;
  load(key: string): Promise<FileOperationResult>;
  delete(key: string): Promise<FileOperationResult>;
  exists(key: string): Promise<boolean>;
  
  // Project operations
  saveProject(project: Project): Promise<FileOperationResult>;
  loadProject(projectId: string): Promise<FileOperationResult>;
  deleteProject(projectId: string): Promise<FileOperationResult>;
  listProjects(): Promise<FileOperationResult>;
  
  // Diagram operations
  saveDiagram(projectId: string, diagram: Diagram): Promise<FileOperationResult>;
  loadDiagram(projectId: string, diagramId: string): Promise<FileOperationResult>;
  deleteDiagram(projectId: string, diagramId: string): Promise<FileOperationResult>;
  
  // Backup operations
  createBackup(projectId: string): Promise<FileOperationResult>;
  restoreBackup(projectId: string, backupId: string): Promise<FileOperationResult>;
  listBackups(projectId: string): Promise<FileOperationResult>;
  deleteBackup(backupId: string): Promise<FileOperationResult>;
}

// File hash manager interface (for existing functionality)
export interface FileHashManager {
  generateHash(content: string): string;
  getStorageKey(hash: string): string;
  validateHash(content: string, expectedHash: string): boolean;
}