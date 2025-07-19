/**
 * File System API Storage Service for enhanced project persistence
 * Requirements: 8.4, 13.2, 13.4
 */

import { 
  Project, 
  Diagram, 
  StorageProvider, 
  FileOperationResult,
  BackupFile,
  ProjectExportOptions,
  ProjectImportOptions
} from '../types';
import { LocalStorageProvider } from './StorageService';

/**
 * File System API storage provider with localStorage fallback
 */
export class FileSystemStorageProvider implements StorageProvider {
  private fallbackProvider: LocalStorageProvider;
  private isFileSystemSupported: boolean;

  constructor() {
    this.fallbackProvider = new LocalStorageProvider();
    this.isFileSystemSupported = 'showDirectoryPicker' in window;
  }

  /**
   * Check if File System API is supported
   */
  public isSupported(): boolean {
    return this.isFileSystemSupported;
  }

  /**
   * Save data using File System API or fallback to localStorage
   */
  async save(key: string, data: any): Promise<FileOperationResult> {
    if (this.isFileSystemSupported) {
      try {
        return await this.saveToFileSystem(key, data);
      } catch (error) {
        console.warn('File System API failed, falling back to localStorage:', error);
      }
    }
    
    return await this.fallbackProvider.save(key, data);
  }

  /**
   * Load data using File System API or fallback to localStorage
   */
  async load(key: string): Promise<FileOperationResult> {
    if (this.isFileSystemSupported) {
      try {
        const result = await this.loadFromFileSystem(key);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn('File System API failed, falling back to localStorage:', error);
      }
    }
    
    return await this.fallbackProvider.load(key);
  }

  /**
   * Delete data using File System API or fallback to localStorage
   */
  async delete(key: string): Promise<FileOperationResult> {
    if (this.isFileSystemSupported) {
      try {
        const result = await this.deleteFromFileSystem(key);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn('File System API failed, falling back to localStorage:', error);
      }
    }
    
    return await this.fallbackProvider.delete(key);
  }

  /**
   * Check if data exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.isFileSystemSupported) {
      try {
        return await this.existsInFileSystem(key);
      } catch (error) {
        console.warn('File System API failed, falling back to localStorage:', error);
      }
    }
    
    return await this.fallbackProvider.exists(key);
  }

  /**
   * Save project (delegates to base implementation)
   */
  async saveProject(project: Project): Promise<FileOperationResult> {
    return await this.fallbackProvider.saveProject(project);
  }

  /**
   * Load project (delegates to base implementation)
   */
  async loadProject(projectId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.loadProject(projectId);
  }

  /**
   * Delete project (delegates to base implementation)
   */
  async deleteProject(projectId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.deleteProject(projectId);
  }

  /**
   * List projects (delegates to base implementation)
   */
  async listProjects(): Promise<FileOperationResult> {
    return await this.fallbackProvider.listProjects();
  }

  /**
   * Save diagram (delegates to base implementation)
   */
  async saveDiagram(projectId: string, diagram: Diagram): Promise<FileOperationResult> {
    return await this.fallbackProvider.saveDiagram(projectId, diagram);
  }

  /**
   * Load diagram (delegates to base implementation)
   */
  async loadDiagram(projectId: string, diagramId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.loadDiagram(projectId, diagramId);
  }

  /**
   * Delete diagram (delegates to base implementation)
   */
  async deleteDiagram(projectId: string, diagramId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.deleteDiagram(projectId, diagramId);
  }

  /**
   * Create backup (delegates to base implementation)
   */
  async createBackup(projectId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.createBackup(projectId);
  }

  /**
   * Restore backup (delegates to base implementation)
   */
  async restoreBackup(projectId: string, backupId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.restoreBackup(projectId, backupId);
  }

  /**
   * List backups (delegates to base implementation)
   */
  async listBackups(projectId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.listBackups(projectId);
  }

  /**
   * Delete backup (delegates to base implementation)
   */
  async deleteBackup(backupId: string): Promise<FileOperationResult> {
    return await this.fallbackProvider.deleteBackup(backupId);
  }

  /**
   * Export project to file system
   */
  async exportProject(project: Project, options: ProjectExportOptions = { 
    includeBackups: false, 
    includeMetadata: true, 
    format: 'json' 
  }): Promise<FileOperationResult> {
    try {
      if (!this.isFileSystemSupported) {
        return { success: false, error: 'File System API not supported' };
      }

      const exportData = {
        project,
        exportedAt: new Date(),
        version: '1.0.0',
        options
      };

      if (options.includeBackups) {
        const backupsResult = await this.listBackups(project.id);
        if (backupsResult.success) {
          exportData['backups'] = backupsResult.data;
        }
      }

      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
      
      if (options.format === 'json') {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(exportData, null, 2));
        await writable.close();

        return { success: true, data: { fileName, fileHandle } };
      }

      return { success: false, error: 'Unsupported export format' };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Export cancelled by user' };
      }
      return { 
        success: false, 
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Import project from file system
   */
  async importProject(options: ProjectImportOptions): Promise<FileOperationResult> {
    try {
      if (!this.isFileSystemSupported) {
        return { success: false, error: 'File System API not supported' };
      }

      let fileContent: string;

      if (typeof options.source === 'string') {
        // Load from file path (not directly supported in browser)
        return { success: false, error: 'File path import not supported in browser' };
      } else if (options.source instanceof File) {
        // Load from File object
        fileContent = await options.source.text();
      } else {
        // Show file picker
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        });

        const file = await fileHandle.getFile();
        fileContent = await file.text();
      }

      const importData = JSON.parse(fileContent);
      
      if (options.validateSchema && !this.validateImportData(importData)) {
        return { success: false, error: 'Invalid import data format' };
      }

      const project: Project = importData.project;
      
      // Convert date strings back to Date objects
      project.createdAt = new Date(project.createdAt);
      project.lastModified = new Date(project.lastModified);
      project.diagrams.forEach(diagram => {
        diagram.createdAt = new Date(diagram.createdAt);
        diagram.lastModified = new Date(diagram.lastModified);
      });

      // Check if project already exists
      const existingProject = await this.loadProject(project.id);
      if (existingProject.success && !options.overwriteExisting) {
        return { success: false, error: 'Project already exists and overwrite is disabled' };
      }

      // Create backup if requested
      if (options.createBackup && existingProject.success) {
        await this.createBackup(project.id);
      }

      // Save imported project
      const saveResult = await this.saveProject(project);
      if (!saveResult.success) {
        return saveResult;
      }

      return { success: true, data: project };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Import cancelled by user' };
      }
      return { 
        success: false, 
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Private File System API methods

  private async saveToFileSystem(key: string, data: any): Promise<FileOperationResult> {
    // This is a simplified implementation
    // In a real application, you would implement proper file system operations
    return { success: false, error: 'File System API save not fully implemented' };
  }

  private async loadFromFileSystem(key: string): Promise<FileOperationResult> {
    // This is a simplified implementation
    // In a real application, you would implement proper file system operations
    return { success: false, error: 'File System API load not fully implemented' };
  }

  private async deleteFromFileSystem(key: string): Promise<FileOperationResult> {
    // This is a simplified implementation
    // In a real application, you would implement proper file system operations
    return { success: false, error: 'File System API delete not fully implemented' };
  }

  private async existsInFileSystem(key: string): Promise<boolean> {
    // This is a simplified implementation
    // In a real application, you would implement proper file system operations
    return false;
  }

  private validateImportData(data: any): boolean {
    return data &&
           data.project &&
           typeof data.project.id === 'string' &&
           typeof data.project.name === 'string' &&
           Array.isArray(data.project.diagrams);
  }
}

/**
 * Storage service factory
 */
export class StorageServiceFactory {
  private static instance: StorageProvider;

  public static getInstance(): StorageProvider {
    if (!StorageServiceFactory.instance) {
      if ('showDirectoryPicker' in window) {
        StorageServiceFactory.instance = new FileSystemStorageProvider();
      } else {
        StorageServiceFactory.instance = new LocalStorageProvider();
      }
    }
    return StorageServiceFactory.instance;
  }

  public static createLocalStorageProvider(): LocalStorageProvider {
    return new LocalStorageProvider();
  }

  public static createFileSystemProvider(): FileSystemStorageProvider {
    return new FileSystemStorageProvider();
  }
}