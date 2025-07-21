/**
 * ProjectManager class with CRUD operations
 * Requirements: 8.1, 8.3, 13.1
 */

import {
  Project,
  Diagram,
  ProjectSettings,
  ProjectMetadata,
  DiagramType,
  EditorSettings,
  WorkspaceLayout,
  ProjectReference,
} from '../types';
import { ProjectApiService } from './ProjectApiService';


export class ProjectManager {
  private static instance: ProjectManager;
  private currentProject: Project | null = null;
  private projectList: Project[] = [];
  private recentProjects: ProjectReference[] = [];

  private constructor() {
    this.loadProjectList();
    this.loadRecentProjects();
  }

  /**
   * Get singleton instance of ProjectManager
   */
  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  /**
   * Create a new project with default settings
   */
  public async createProject(id: string, name: string, description?: string): Promise<Project> {
    try {
      // Validate project name
      if (!name || name.trim().length === 0) {
        throw new Error('Project name cannot be empty');
      }

      // Check for duplicate names
      if (this.projectList.some(p => p.name === name.trim())) {
        throw new Error(`Project with name "${name}" already exists`);
      }

      const now = new Date();

      // Create default editor settings
      const defaultEditorSettings: EditorSettings = {
        theme: 'default',
        fontSize: 14,
        lineNumbers: true,
        wordWrap: true,
        autoSave: true,
        autoSaveInterval: 30000 // 30 seconds
      };

      // Create default project settings
      const defaultSettings: ProjectSettings = {
        theme: 'default',
        autoSave: true,
        defaultDiagramType: 'flowchart',
        editorSettings: defaultEditorSettings
      };

      // Create default workspace layout
      const defaultLayout: WorkspaceLayout = {
        navigationPaneWidth: 300,
        navigationPaneCollapsed: false,
        lastOpenedTabs: [],
        activeTabId: undefined
      };

      // Create default metadata
      const defaultMetadata: ProjectMetadata = {
        version: '1.0.0',
        author: undefined,
        tags: [],
        lastOpenedDiagrams: [],
        workspaceLayout: defaultLayout
      };

      // Create new project
      const newProject: Project = {
        id: id,
        name: name.trim(),
        description: description?.trim(),
        createdAt: now,
        lastModified: now,
        diagrams: [],
        requirements: [],
        teams: [],
        tasks: [],
        settings: defaultSettings,
        metadata: defaultMetadata
      };


      // Save the project itself
      await this.saveProject(newProject);

      // Add to recent projects
      this.addToRecentProjects(newProject);

      return newProject;
    } catch (error) {
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a project by ID
   */
  public async loadProject(projectId: string): Promise<Project> {
    try {
      if (!projectId) {
        throw new Error('Project ID cannot be empty');
      }

      // Call backend to get project outline
      const project = await ProjectApiService.getProjectOutline(projectId);

      // Validate project
      if (!this.validateProject(project)) {
        throw new Error('Invalid project data from server');
      }

      // Convert date strings to Date objects
      project.createdAt = new Date(project.created_at);
      project.updatedAt = new Date(project.updated_at);

      if (project.requirements) {
        project.requirements.forEach(r => {
          r.createdAt = new Date(r.created_at);
          r.updatedAt = new Date(r.updated_at);
        });
      }

      if (project.diagrams) {
        project.diagrams.forEach(d => {
          d.createdAt = new Date(d.created_at);
          d.updatedAt = new Date(d.updated_at);
        });
      }

      // Set as current project
      this.currentProject = project;

      // Add to recent projects
      this.addToRecentProjects(project);

      return project;

    } catch (error) {
      console.error('Failed to load project:', error);
      throw new Error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  public async loadDiagram(diagramId: number): Promise<Diagram> {
    try {
      if (!diagramId) {
        throw new Error('Diagram ID cannot be empty');
      }

      if (!this.currentProject) {
        throw new Error('Project ID cannot be empty');
      }
      
      // Call backend to get project outline
      const diagram = await ProjectApiService.getDiagram(this.currentProject.id, diagramId);

      return diagram;

    } catch (error) {
      console.error('Failed to load diagram:', error);
      throw new Error(`Failed to load diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async saveDiagram(projectId: string, diagramId: Number | null, title: string, content: string): Promise<Diagram> {
    try {
      if (!diagramId) {
        return await ProjectApiService.addDiagram(projectId, title, content, "sequence");
      }
      else {
        return await ProjectApiService.updateDiagram(projectId, diagramId, title, content, "sequence");
      }
    } catch (error) {
      throw new Error(`Failed to save diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  }

  /**
   * Save a project to storage
   */
  public async saveProject(project: Project): Promise<void> {
    try {
      if (!project || !project.id) {
        throw new Error('Invalid project data');
      }

      // Validate project before saving
      if (!this.validateProject(project)) {
        throw new Error('Project validation failed');
      }

      // Update last modified timestamp
      project.lastModified = new Date();


      const savedProject = await ProjectApiService.createProject(project.id, project.name, project.description)


      this.projectList.push(project);

      // Update current project if it's the same
      if (this.currentProject?.id === project.id) {
        this.currentProject = project;
      }

    } catch (error) {
      throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a project by ID
   */
  public async deleteProject(projectId: string): Promise<void> {
    try {
      if (!projectId) {
        throw new Error('Project ID cannot be empty');
      }

      // Remove from localStorage
      localStorage.removeItem(`project_${projectId}`);

      // Remove from project list
      this.projectList = this.projectList.filter(p => p.id !== projectId);

      // Remove from recent projects
      this.recentProjects = this.recentProjects.filter(p => p.id !== projectId);

      // Clear current project if it's the deleted one
      if (this.currentProject?.id === projectId) {
        this.currentProject = null;
      }

      // Save updated lists
      await this.saveProjectList();
      await this.saveRecentProjects();

    } catch (error) {
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current project
   */
  public getCurrentProject(): Project | null {
    return this.currentProject;
  }

  /**
   * Set current project
   */
  public setCurrentProject(project: Project): void {
    this.currentProject = project;
    this.addToRecentProjects(project);
  }

  /**
   * Get list of all projects
   */
  public getProjectList(): Project[] {
    return [...this.projectList];
  }

  /**
   * Get list of recent projects
   */
  public getRecentProjects(): ProjectReference[] {
    return [...this.recentProjects];
  }

  /**
   * Add diagram to current project
   */
  public async addDiagramToProject(diagram: Diagram, projectId?: string): Promise<void> {
    const targetProject = projectId ?
      this.projectList.find(p => p.id === projectId) :
      this.currentProject;

    if (!targetProject) {
      throw new Error('No target project found');
    }

    // Check for duplicate diagram names
    if (targetProject.diagrams.some(d => d.name === diagram.name)) {
      throw new Error(`Diagram with name "${diagram.name}" already exists in project`);
    }

    targetProject.diagrams.push(diagram);
    await this.saveProject(targetProject);
  }

  /**
   * Remove diagram from project
   */
  public async removeDiagramFromProject(diagramId: string, projectId?: string): Promise<void> {
    const targetProject = projectId ?
      this.projectList.find(p => p.id === projectId) :
      this.currentProject;

    if (!targetProject) {
      throw new Error('No target project found');
    }

    targetProject.diagrams = targetProject.diagrams.filter(d => d.id !== diagramId);
    await this.saveProject(targetProject);
  }

  /**
   * Update project metadata
   */
  public async updateProjectMetadata(projectId: string, metadata: Partial<ProjectMetadata>): Promise<void> {
    const project = this.projectList.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found`);
    }

    project.metadata = { ...project.metadata, ...metadata };
    await this.saveProject(project);
  }

  // Private helper methods

  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateProject(project: any): project is Project {
    return project &&
      (typeof project.id === 'number' || typeof project.id === 'string') &&
      typeof project.name === 'string' &&
      ('description' in project) &&
      Array.isArray(project.requirements) &&
      Array.isArray(project.diagrams) &&
      Array.isArray(project.teams) &&
      Array.isArray(project.tasks);
  }


  // private async loadProjectList(): Promise<void> {
  //   try {
  //     const projectListData = localStorage.getItem('project_list');
  //     if (projectListData) {
  //       const projectIds = JSON.parse(projectListData);
  //       this.projectList = [];

  //       for (const projectId of projectIds) {
  //         try {
  //           const projectData = localStorage.getItem(`project_${projectId}`);
  //           if (projectData) {
  //             const project = JSON.parse(projectData);
  //             // Convert date strings back to Date objects
  //             project.createdAt = new Date(project.createdAt);
  //             project.lastModified = new Date(project.lastModified);
  //             project.diagrams.forEach((diagram: any) => {
  //               diagram.createdAt = new Date(diagram.createdAt);
  //               diagram.lastModified = new Date(diagram.lastModified);
  //             });
  //             this.projectList.push(project);
  //           }
  //         } catch (error) {
  //           console.warn(`Failed to load project ${projectId}:`, error);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.warn('Failed to load project list:', error);
  //     this.projectList = [];
  //   }
  // }
  public async loadProjectList(): Promise<void> {
    try {
      const projects = await ProjectApiService.listProjects();
      this.projectList = projects;
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projectList = [];
    }
    return this.projectList;
  }


  private async saveProjectList(): Promise<void> {
    try {
      const projectIds = this.projectList.map(p => p.id);
      localStorage.setItem('project_list', JSON.stringify(projectIds));
    } catch (error) {
      throw new Error(`Failed to save project list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadRecentProjects(): void {
    try {
      const recentData = localStorage.getItem('recent_projects');
      if (recentData) {
        this.recentProjects = JSON.parse(recentData).map((ref: any) => ({
          ...ref,
          lastAccessed: new Date(ref.lastAccessed)
        }));
      }
    } catch (error) {
      console.warn('Failed to load recent projects:', error);
      this.recentProjects = [];
    }
  }

  private async saveRecentProjects(): Promise<void> {
    try {
      localStorage.setItem('recent_projects', JSON.stringify(this.recentProjects));
    } catch (error) {
      console.warn('Failed to save recent projects:', error);
    }
  }

  private addToRecentProjects(project: Project): void {
    const existingIndex = this.recentProjects.findIndex(ref => ref.id === project.id);

    const projectRef: ProjectReference = {
      id: project.id,
      name: project.name,
      lastAccessed: new Date()
    };

    if (existingIndex >= 0) {
      // Update existing entry
      this.recentProjects[existingIndex] = projectRef;
    } else {
      // Add new entry
      this.recentProjects.unshift(projectRef);
    }

    // Keep only the most recent 10 projects
    this.recentProjects = this.recentProjects.slice(0, 10);

    // Save to storage
    this.saveRecentProjects();
  }
}