/**
 * Serialization and deserialization utilities for project data
 * Requirements: 8.4, 13.2, 13.4
 */

import { Project, Diagram, WorkspaceState } from '../types';

/**
 * Project serialization utilities
 */
export class SerializationService {
  private static readonly SCHEMA_VERSION = '1.0.0';

  /**
   * Serialize project data for storage
   */
  public static serializeProject(project: Project): string {
    try {
      const serializedData = {
        schemaVersion: this.SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          ...project,
          createdAt: project.createdAt.toISOString(),
          lastModified: project.lastModified.toISOString(),
          diagrams: project.diagrams.map(diagram => ({
            ...diagram,
            createdAt: diagram.createdAt.toISOString(),
            lastModified: diagram.lastModified.toISOString()
          }))
        }
      };

      return JSON.stringify(serializedData, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize project data from storage
   */
  public static deserializeProject(serializedData: string): Project {
    try {
      const parsedData = JSON.parse(serializedData);
      
      // Validate schema version
      if (!this.validateSchemaVersion(parsedData.schemaVersion)) {
        throw new Error(`Unsupported schema version: ${parsedData.schemaVersion}`);
      }

      const projectData = parsedData.data;
      
      // Convert ISO strings back to Date objects
      const project: Project = {
        ...projectData,
        createdAt: new Date(projectData.createdAt),
        lastModified: new Date(projectData.lastModified),
        diagrams: projectData.diagrams.map((diagram: any) => ({
          ...diagram,
          createdAt: new Date(diagram.createdAt),
          lastModified: new Date(diagram.lastModified)
        }))
      };

      // Validate deserialized project
      if (!this.validateProject(project)) {
        throw new Error('Invalid project data after deserialization');
      }

      return project;
    } catch (error) {
      throw new Error(`Failed to deserialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Serialize diagram data for storage
   */
  public static serializeDiagram(diagram: Diagram): string {
    try {
      const serializedData = {
        schemaVersion: this.SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          ...diagram,
          createdAt: diagram.createdAt.toISOString(),
          lastModified: diagram.lastModified.toISOString()
        }
      };

      return JSON.stringify(serializedData, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize diagram data from storage
   */
  public static deserializeDiagram(serializedData: string): Diagram {
    try {
      const parsedData = JSON.parse(serializedData);
      
      // Validate schema version
      if (!this.validateSchemaVersion(parsedData.schemaVersion)) {
        throw new Error(`Unsupported schema version: ${parsedData.schemaVersion}`);
      }

      const diagramData = parsedData.data;
      
      // Convert ISO strings back to Date objects
      const diagram: Diagram = {
        ...diagramData,
        createdAt: new Date(diagramData.createdAt),
        lastModified: new Date(diagramData.lastModified)
      };

      // Validate deserialized diagram
      if (!this.validateDiagram(diagram)) {
        throw new Error('Invalid diagram data after deserialization');
      }

      return diagram;
    } catch (error) {
      throw new Error(`Failed to deserialize diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Serialize workspace state for persistence
   */
  public static serializeWorkspaceState(state: WorkspaceState): string {
    try {
      const serializedData = {
        schemaVersion: this.SCHEMA_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          ...state,
          // Convert current project if it exists
          currentProject: state.currentProject ? {
            ...state.currentProject,
            createdAt: state.currentProject.createdAt.toISOString(),
            lastModified: state.currentProject.lastModified.toISOString(),
            diagrams: state.currentProject.diagrams.map(diagram => ({
              ...diagram,
              createdAt: diagram.createdAt.toISOString(),
              lastModified: diagram.lastModified.toISOString()
            }))
          } : null,
          // Convert project list
          projectList: state.projectList.map(project => ({
            ...project,
            createdAt: project.createdAt.toISOString(),
            lastModified: project.lastModified.toISOString(),
            diagrams: project.diagrams.map(diagram => ({
              ...diagram,
              createdAt: diagram.createdAt.toISOString(),
              lastModified: diagram.lastModified.toISOString()
            }))
          })),
          // Convert recent projects
          recentProjects: state.recentProjects.map(ref => ({
            ...ref,
            lastAccessed: ref.lastAccessed.toISOString()
          })),
          // Convert editor tabs
          editorPane: {
            ...state.editorPane,
            openTabs: state.editorPane.openTabs.map(tab => ({
              ...tab,
              lastAccessed: tab.lastAccessed.toISOString()
            }))
          },
          // Convert notifications
          notifications: state.notifications.map(notification => ({
            ...notification,
            timestamp: notification.timestamp.toISOString()
          }))
        }
      };

      return JSON.stringify(serializedData, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize workspace state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize workspace state from persistence
   */
  public static deserializeWorkspaceState(serializedData: string): WorkspaceState {
    try {
      const parsedData = JSON.parse(serializedData);
      
      // Validate schema version
      if (!this.validateSchemaVersion(parsedData.schemaVersion)) {
        throw new Error(`Unsupported schema version: ${parsedData.schemaVersion}`);
      }

      const stateData = parsedData.data;
      
      // Convert ISO strings back to Date objects
      const state: WorkspaceState = {
        ...stateData,
        // Convert current project if it exists
        currentProject: stateData.currentProject ? {
          ...stateData.currentProject,
          createdAt: new Date(stateData.currentProject.createdAt),
          lastModified: new Date(stateData.currentProject.lastModified),
          diagrams: stateData.currentProject.diagrams.map((diagram: any) => ({
            ...diagram,
            createdAt: new Date(diagram.createdAt),
            lastModified: new Date(diagram.lastModified)
          }))
        } : null,
        // Convert project list
        projectList: stateData.projectList.map((project: any) => ({
          ...project,
          createdAt: new Date(project.createdAt),
          lastModified: new Date(project.lastModified),
          diagrams: project.diagrams.map((diagram: any) => ({
            ...diagram,
            createdAt: new Date(diagram.createdAt),
            lastModified: new Date(diagram.lastModified)
          }))
        })),
        // Convert recent projects
        recentProjects: stateData.recentProjects.map((ref: any) => ({
          ...ref,
          lastAccessed: new Date(ref.lastAccessed)
        })),
        // Convert editor tabs
        editorPane: {
          ...stateData.editorPane,
          openTabs: stateData.editorPane.openTabs.map((tab: any) => ({
            ...tab,
            lastAccessed: new Date(tab.lastAccessed)
          }))
        },
        // Convert notifications
        notifications: stateData.notifications.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp)
        }))
      };

      return state;
    } catch (error) {
      throw new Error(`Failed to deserialize workspace state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a compressed backup of project data
   */
  public static createBackupData(project: Project): string {
    try {
      const backupData = {
        schemaVersion: this.SCHEMA_VERSION,
        backupType: 'project',
        createdAt: new Date().toISOString(),
        project: this.serializeProject(project)
      };

      return JSON.stringify(backupData, null, 2);
    } catch (error) {
      throw new Error(`Failed to create backup data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore project from backup data
   */
  public static restoreFromBackup(backupData: string): Project {
    try {
      const parsedBackup = JSON.parse(backupData);
      
      if (parsedBackup.backupType !== 'project') {
        throw new Error('Invalid backup type');
      }

      return this.deserializeProject(parsedBackup.project);
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private validation methods

  private static validateSchemaVersion(version: string): boolean {
    // For now, only support current version
    // In the future, implement migration logic for older versions
    return version === this.SCHEMA_VERSION;
  }

  private static validateProject(project: any): project is Project {
    return project &&
           typeof project.id === 'string' &&
           typeof project.name === 'string' &&
           project.createdAt instanceof Date &&
           project.lastModified instanceof Date &&
           Array.isArray(project.diagrams) &&
           project.settings &&
           project.metadata;
  }

  private static validateDiagram(diagram: any): diagram is Diagram {
    return diagram &&
           typeof diagram.id === 'string' &&
           typeof diagram.name === 'string' &&
           typeof diagram.content === 'string' &&
           diagram.createdAt instanceof Date &&
           diagram.lastModified instanceof Date &&
           diagram.metadata;
  }

  /**
   * Generate content hash for data integrity
   */
  public static generateContentHash(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate data integrity using content hash
   */
  public static validateContentHash(content: string, expectedHash: string): boolean {
    const actualHash = this.generateContentHash(content);
    return actualHash === expectedHash;
  }
}