/**
 * Storage Service for project data persistence
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

/**
 * LocalStorage-based storage provider
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly PROJECT_PREFIX = 'project_';
  private readonly DIAGRAM_PREFIX = 'diagram_';
  private readonly BACKUP_PREFIX = 'backup_';
  private readonly PROJECT_LIST_KEY = 'project_list';
  private readonly BACKUP_LIST_KEY = 'backup_list';

  /**
   * Save data to localStorage
   */
  async save(key: string, data: any): Promise<FileOperationResult> {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Load data from localStorage
   */
  async load(key: string): Promise<FileOperationResult> {
    try {
      const data = localStorage.getItem(key);
      if (data === null) {
        return { success: false, error: 'Data not found' };
      }
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete data from localStorage
   */
  async delete(key: string): Promise<FileOperationResult> {
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if data exists in localStorage
   */
  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Save project to storage
   */
  async saveProject(project: Project): Promise<FileOperationResult> {
    try {
      // Validate project data
      if (!this.validateProject(project)) {
        return { success: false, error: 'Invalid project data' };
      }

      // Save project data
      const projectKey = `${this.PROJECT_PREFIX}${project.id}`;
      const saveResult = await this.save(projectKey, project);
      
      if (!saveResult.success) {
        return saveResult;
      }

      // Update project list
      await this.updateProjectList(project.id);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Load project from storage
   */
  async loadProject(projectId: string): Promise<FileOperationResult> {
    try {
      const projectKey = `${this.PROJECT_PREFIX}${projectId}`;
      const loadResult = await this.load(projectKey);
      
      if (!loadResult.success) {
        return loadResult;
      }

      const project = loadResult.data;
      
      // Convert date strings back to Date objects
      project.createdAt = new Date(project.createdAt);
      project.lastModified = new Date(project.lastModified);
      project.diagrams.forEach((diagram: any) => {
        diagram.createdAt = new Date(diagram.createdAt);
        diagram.lastModified = new Date(diagram.lastModified);
      });

      return { success: true, data: project };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete project from storage
   */
  async deleteProject(projectId: string): Promise<FileOperationResult> {
    try {
      const projectKey = `${this.PROJECT_PREFIX}${projectId}`;
      
      // Delete project data
      const deleteResult = await this.delete(projectKey);
      if (!deleteResult.success) {
        return deleteResult;
      }

      // Remove from project list
      await this.removeFromProjectList(projectId);

      // Delete associated diagrams
      const project = await this.loadProject(projectId);
      if (project.success && project.data) {
        for (const diagram of project.data.diagrams) {
          await this.deleteDiagram(projectId, diagram.id);
        }
      }

      // Delete associated backups
      await this.deleteProjectBackups(projectId);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<FileOperationResult> {
    try {
      const listResult = await this.load(this.PROJECT_LIST_KEY);
      if (!listResult.success) {
        return { success: true, data: [] }; // Return empty list if no projects exist
      }

      const projectIds = listResult.data;
      const projects: Project[] = [];

      for (const projectId of projectIds) {
        const projectResult = await this.loadProject(projectId);
        if (projectResult.success) {
          projects.push(projectResult.data);
        }
      }

      return { success: true, data: projects };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Save diagram to storage
   */
  async saveDiagram(projectId: string, diagram: Diagram): Promise<FileOperationResult> {
    try {
      const diagramKey = `${this.DIAGRAM_PREFIX}${projectId}_${diagram.id}`;
      return await this.save(diagramKey, diagram);
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to save diagram: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Load diagram from storage
   */
  async loadDiagram(projectId: string, diagramId: string): Promise<FileOperationResult> {
    try {
      const diagramKey = `${this.DIAGRAM_PREFIX}${projectId}_${diagramId}`;
      const loadResult = await this.load(diagramKey);
      
      if (loadResult.success && loadResult.data) {
        // Convert date strings back to Date objects
        loadResult.data.createdAt = new Date(loadResult.data.createdAt);
        loadResult.data.lastModified = new Date(loadResult.data.lastModified);
      }
      
      return loadResult;
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load diagram: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete diagram from storage
   */
  async deleteDiagram(projectId: string, diagramId: string): Promise<FileOperationResult> {
    try {
      const diagramKey = `${this.DIAGRAM_PREFIX}${projectId}_${diagramId}`;
      return await this.delete(diagramKey);
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete diagram: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Create backup of project
   */
  async createBackup(projectId: string): Promise<FileOperationResult> {
    try {
      const projectResult = await this.loadProject(projectId);
      if (!projectResult.success) {
        return projectResult;
      }

      const backupId = `backup_${projectId}_${Date.now()}`;
      const backupKey = `${this.BACKUP_PREFIX}${backupId}`;
      
      const backup: BackupFile = {
        id: backupId,
        projectId: projectId,
        backupPath: backupKey,
        createdAt: new Date(),
        size: JSON.stringify(projectResult.data).length,
        type: 'auto'
      };

      // Save backup data
      const saveResult = await this.save(backupKey, projectResult.data);
      if (!saveResult.success) {
        return saveResult;
      }

      // Update backup list
      await this.updateBackupList(backup);

      return { success: true, data: backup };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Restore project from backup
   */
  async restoreBackup(projectId: string, backupId: string): Promise<FileOperationResult> {
    try {
      const backupKey = `${this.BACKUP_PREFIX}${backupId}`;
      const backupResult = await this.load(backupKey);
      
      if (!backupResult.success) {
        return backupResult;
      }

      // Restore project data
      return await this.saveProject(backupResult.data);
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * List backups for a project
   */
  async listBackups(projectId: string): Promise<FileOperationResult> {
    try {
      const listResult = await this.load(this.BACKUP_LIST_KEY);
      if (!listResult.success) {
        return { success: true, data: [] };
      }

      const allBackups: BackupFile[] = listResult.data.map((backup: any) => ({
        ...backup,
        createdAt: new Date(backup.createdAt)
      }));

      const projectBackups = allBackups.filter(backup => backup.projectId === projectId);
      
      return { success: true, data: projectBackups };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<FileOperationResult> {
    try {
      const backupKey = `${this.BACKUP_PREFIX}${backupId}`;
      
      // Delete backup data
      const deleteResult = await this.delete(backupKey);
      if (!deleteResult.success) {
        return deleteResult;
      }

      // Remove from backup list
      await this.removeFromBackupList(backupId);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Private helper methods

  private validateProject(project: any): project is Project {
    return project &&
           typeof project.id === 'string' &&
           typeof project.name === 'string' &&
           Array.isArray(project.diagrams) &&
           project.settings &&
           project.metadata;
  }

  private async updateProjectList(projectId: string): Promise<void> {
    const listResult = await this.load(this.PROJECT_LIST_KEY);
    let projectIds: string[] = listResult.success ? listResult.data : [];
    
    if (!projectIds.includes(projectId)) {
      projectIds.push(projectId);
      await this.save(this.PROJECT_LIST_KEY, projectIds);
    }
  }

  private async removeFromProjectList(projectId: string): Promise<void> {
    const listResult = await this.load(this.PROJECT_LIST_KEY);
    if (listResult.success) {
      const projectIds: string[] = listResult.data.filter((id: string) => id !== projectId);
      await this.save(this.PROJECT_LIST_KEY, projectIds);
    }
  }

  private async updateBackupList(backup: BackupFile): Promise<void> {
    const listResult = await this.load(this.BACKUP_LIST_KEY);
    let backups: BackupFile[] = listResult.success ? listResult.data : [];
    
    backups.push(backup);
    
    // Keep only the most recent 50 backups
    backups = backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);
    
    await this.save(this.BACKUP_LIST_KEY, backups);
  }

  private async removeFromBackupList(backupId: string): Promise<void> {
    const listResult = await this.load(this.BACKUP_LIST_KEY);
    if (listResult.success) {
      const backups: BackupFile[] = listResult.data.filter((backup: BackupFile) => backup.id !== backupId);
      await this.save(this.BACKUP_LIST_KEY, backups);
    }
  }

  private async deleteProjectBackups(projectId: string): Promise<void> {
    const backupsResult = await this.listBackups(projectId);
    if (backupsResult.success) {
      for (const backup of backupsResult.data) {
        await this.deleteBackup(backup.id);
      }
    }
  }
}