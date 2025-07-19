/**
 * WorkspaceStateManager - Centralized state management system
 * Requirements: 8.1, 13.3, 13.5
 */

import { 
  WorkspaceState, 
  WorkspaceActions,
  EditorTab,
  NavigationPaneState,
  EditorPaneState,
  ApplicationSettings,
  Notification,
  Project,
  Diagram,
  ProjectReference
} from '../types';
import { ProjectManager } from './ProjectManager';

// Action types for state management
export type WorkspaceActionType = 
  // Project actions
  | 'CREATE_PROJECT'
  | 'LOAD_PROJECT'
  | 'SAVE_PROJECT'
  | 'DELETE_PROJECT'
  | 'SET_CURRENT_PROJECT'
  | 'UPDATE_PROJECT_LIST'
  | 'ADD_RECENT_PROJECT'
  
  // Navigation actions
  | 'TOGGLE_NAVIGATION'
  | 'SET_NAVIGATION_WIDTH'
  | 'SELECT_DIAGRAM'
  | 'SET_SEARCH_QUERY'
  | 'SET_SORT_BY'
  
  // Tab actions
  | 'OPEN_TAB'
  | 'CLOSE_TAB'
  | 'SWITCH_TAB'
  | 'CLOSE_ALL_TABS'
  | 'UPDATE_TAB'
  | 'SET_TAB_MODIFIED'
  
  // Editor actions
  | 'UPDATE_DIAGRAM_CONTENT'
  | 'SAVE_DIAGRAM'
  
  // Settings actions
  | 'UPDATE_SETTINGS'
  | 'UPDATE_THEME'
  
  // Notification actions
  | 'ADD_NOTIFICATION'
  | 'REMOVE_NOTIFICATION'
  | 'CLEAR_NOTIFICATIONS'
  
  // State management actions
  | 'RESTORE_STATE'
  | 'RESET_STATE'
  | 'VALIDATE_STATE';

// Action interface
export interface WorkspaceAction {
  type: WorkspaceActionType;
  payload?: any;
  meta?: {
    timestamp: Date;
    source?: string;
    skipPersistence?: boolean;
  };
}

// State change listener type
export type StateChangeListener = (state: WorkspaceState, action: WorkspaceAction) => void;

// State validation result
export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkspaceStateManager implements WorkspaceActions {
  public static instance: WorkspaceStateManager; // For testing
  private state: WorkspaceState;
  private listeners: StateChangeListener[] = [];
  private projectManager: ProjectManager;
  private persistenceEnabled: boolean = true;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.projectManager = ProjectManager.getInstance();
    this.state = this.createInitialState();
    this.setupAutoSave();
  }

  /**
   * Get singleton instance of WorkspaceStateManager
   */
  public static getInstance(): WorkspaceStateManager {
    if (!WorkspaceStateManager.instance) {
      WorkspaceStateManager.instance = new WorkspaceStateManager();
    }
    return WorkspaceStateManager.instance;
  }

  /**
   * Get current workspace state (read-only)
   */
  public getState(): Readonly<WorkspaceState> {
    return { ...this.state };
  }

  /***
   * Get available projects
   */
  public async refreshProjectList(): Promise<void> {
    try {
      const projects = await this.projectManager.loadProjectList();
      this.dispatch({
        type: 'UPDATE_PROJECT_LIST',
        payload: { projectList: projects }
      });
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Failed to Load Projects',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }
  




  /**
   * Subscribe to state changes
   */
  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Dispatch an action to update state
   */
  public dispatch(action: WorkspaceAction): void {
    try {
      // Add metadata if not present
      if (!action.meta) {
        action.meta = {
          timestamp: new Date(),
          source: 'user'
        };
      }

      // Validate action
      if (!this.validateAction(action)) {
        throw new Error(`Invalid action: ${action.type}`);
      }

      // Apply action to state
      const newState = this.reducer(this.state, action);
      
      // Validate new state
      const validation = this.validateState(newState);
      if (!validation.isValid) {
        throw new Error(`State validation failed: ${validation.errors.join(', ')}`);
      }

      // Update state
      const previousState = this.state;
      this.state = newState;

      // Notify listeners
      this.notifyListeners(action);

      // Persist state if enabled and not skipped
      if (this.persistenceEnabled && !action.meta.skipPersistence) {
        this.persistState();
      }

    } catch (error) {
      console.error('Failed to dispatch action:', error);
      this.addNotification({
        type: 'error',
        title: 'State Update Error',
        message: `Failed to update workspace state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoClose: true,
        duration: 5000
      });
    }
  }

  // Project Actions Implementation

  public async createProject(name: string): Promise<void> {
    try {
      const project = await this.projectManager.createProject(name);
      this.dispatch({
        type: 'CREATE_PROJECT',
        payload: { project }
      });
      
      this.addNotification({
        type: 'success',
        title: 'Project Created',
        message: `Project "${name}" created successfully`,
        autoClose: true,
        duration: 3000
      });
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Project Creation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }

  public async loadProject(projectId: string): Promise<void> {
    try {
      const project = await this.projectManager.loadProject(projectId);
      this.dispatch({
        type: 'LOAD_PROJECT',
        payload: { project }
      });
      
      this.addNotification({
        type: 'success',
        title: 'Project Loaded',
        message: `Project "${project.name}" loaded successfully`,
        autoClose: true,
        duration: 3000
      });
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Project Load Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }

  public async saveCurrentProject(): Promise<void> {
    try {
      if (!this.state.currentProject) {
        throw new Error('No current project to save');
      }

      await this.projectManager.saveProject(this.state.currentProject);
      this.dispatch({
        type: 'SAVE_PROJECT',
        payload: { projectId: this.state.currentProject.id }
      });
      
      this.addNotification({
        type: 'success',
        title: 'Project Saved',
        message: `Project "${this.state.currentProject.name}" saved successfully`,
        autoClose: true,
        duration: 3000
      });
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Project Save Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }

  public async deleteProject(projectId: string): Promise<void> {
    try {
      await this.projectManager.deleteProject(projectId);
      this.dispatch({
        type: 'DELETE_PROJECT',
        payload: { projectId }
      });
      
      this.addNotification({
        type: 'success',
        title: 'Project Deleted',
        message: 'Project deleted successfully',
        autoClose: true,
        duration: 3000
      });
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Project Deletion Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }

  // Navigation Actions Implementation

  public toggleNavigation(): void {
    this.dispatch({
      type: 'TOGGLE_NAVIGATION'
    });
  }

  public selectDiagram(diagramId: string): void {
    this.dispatch({
      type: 'SELECT_DIAGRAM',
      payload: { diagramId }
    });
  }

  // Tab Actions Implementation

  public openDiagram(diagram: Diagram): void {
    this.dispatch({
      type: 'OPEN_TAB',
      payload: { diagram }
    });
  }

  public closeTab(tabId: string): void {
    this.dispatch({
      type: 'CLOSE_TAB',
      payload: { tabId }
    });
  }

  public switchTab(tabId: string): void {
    this.dispatch({
      type: 'SWITCH_TAB',
      payload: { tabId }
    });
  }

  public closeAllTabs(): void {
    this.dispatch({
      type: 'CLOSE_ALL_TABS'
    });
  }

  // Editor Actions Implementation

  public updateDiagramContent(diagramId: string, content: string): void {
    this.dispatch({
      type: 'UPDATE_DIAGRAM_CONTENT',
      payload: { diagramId, content }
    });
  }

  public async saveDiagram(diagramId: string): Promise<void> {
    try {
      this.dispatch({
        type: 'SAVE_DIAGRAM',
        payload: { diagramId }
      });
      
      // Save the current project to persist diagram changes
      if (this.state.currentProject) {
        await this.projectManager.saveProject(this.state.currentProject);
      }
    } catch (error) {
      this.addNotification({
        type: 'error',
        title: 'Diagram Save Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoClose: true,
        duration: 5000
      });
      throw error;
    }
  }

  // Settings Actions Implementation

  public updateSettings(settings: Partial<ApplicationSettings>): void {
    this.dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { settings }
    });
  }

  public updateTheme(theme: string): void {
    this.dispatch({
      type: 'UPDATE_THEME',
      payload: { theme }
    });
  }

  // Notification Management

  public addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const fullNotification: Notification = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date()
    };

    this.dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { notification: fullNotification }
    });

    // Auto-remove notification if specified
    if (notification.autoClose && notification.duration) {
      setTimeout(() => {
        this.removeNotification(fullNotification.id);
      }, notification.duration);
    }
  }

  public removeNotification(notificationId: string): void {
    this.dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: { notificationId }
    });
  }

  // State Management Methods

  public restoreState(): void {
    try {
      const savedState = this.loadPersistedState();
      if (savedState) {
        this.dispatch({
          type: 'RESTORE_STATE',
          payload: { state: savedState },
          meta: { timestamp: new Date(), skipPersistence: true }
        });
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
      this.addNotification({
        type: 'warning',
        title: 'State Restoration Failed',
        message: 'Using default workspace state',
        autoClose: true,
        duration: 5000
      });
    }
  }

  public resetState(): void {
    this.dispatch({
      type: 'RESET_STATE'
    });
  }

  // Private Methods

  private createInitialState(): WorkspaceState {
    const defaultNavigationPane: NavigationPaneState = {
      isCollapsed: false,
      width: 300,
      selectedDiagramId: null,
      searchQuery: '',
      sortBy: 'name'
    };

    const defaultEditorPane: EditorPaneState = {
      openTabs: [],
      activeTabId: null,
      tabOrder: [],
      splitView: false
    };

    const defaultSettings: ApplicationSettings = {
      theme: 'default',
      autoSave: true,
      autoSaveInterval: 30000,
      maxRecentProjects: 10,
      enableNotifications: true,
      debugMode: false
    };

    return {
      currentProject: null,
      projectList: [],
      recentProjects: [],
      navigationPane: defaultNavigationPane,
      editorPane: defaultEditorPane,
      theme: 'default',
      settings: defaultSettings,
      notifications: []
    };
  }

  private reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
    switch (action.type) {
      case 'CREATE_PROJECT':
      case 'LOAD_PROJECT':
        return {
          ...state,
          currentProject: action.payload.project,
          projectList: this.updateProjectInList(state.projectList, action.payload.project),
          recentProjects: this.addToRecentProjects(state.recentProjects, action.payload.project)
        };

      case 'DELETE_PROJECT':
        return {
          ...state,
          currentProject: state.currentProject?.id === action.payload.projectId ? null : state.currentProject,
          projectList: state.projectList.filter(p => p.id !== action.payload.projectId),
          recentProjects: state.recentProjects.filter(p => p.id !== action.payload.projectId)
        };

      case 'TOGGLE_NAVIGATION':
        return {
          ...state,
          navigationPane: {
            ...state.navigationPane,
            isCollapsed: !state.navigationPane.isCollapsed
          }
        };

      case 'SELECT_DIAGRAM':
        return {
          ...state,
          navigationPane: {
            ...state.navigationPane,
            selectedDiagramId: action.payload.diagramId
          }
        };

      case 'OPEN_TAB':
        return this.handleOpenTab(state, action.payload.diagram);

      case 'CLOSE_TAB':
        return this.handleCloseTab(state, action.payload.tabId);

      case 'SWITCH_TAB':
        return this.handleSwitchTab(state, action.payload.tabId);

      case 'CLOSE_ALL_TABS':
        return {
          ...state,
          editorPane: {
            ...state.editorPane,
            openTabs: [],
            activeTabId: null,
            tabOrder: []
          }
        };

      case 'UPDATE_DIAGRAM_CONTENT':
        return this.handleUpdateDiagramContent(state, action.payload.diagramId, action.payload.content);

      case 'UPDATE_SETTINGS':
        return {
          ...state,
          settings: {
            ...state.settings,
            ...action.payload.settings
          }
        };

      case 'UPDATE_THEME':
        return {
          ...state,
          theme: action.payload.theme,
          settings: {
            ...state.settings,
            theme: action.payload.theme
          }
        };

      case 'ADD_NOTIFICATION':
        return {
          ...state,
          notifications: [...state.notifications, action.payload.notification]
        };

      case 'REMOVE_NOTIFICATION':
        return {
          ...state,
          notifications: state.notifications.filter(n => n.id !== action.payload.notificationId)
        };

      case 'CLEAR_NOTIFICATIONS':
        return {
          ...state,
          notifications: []
        };

      case 'RESTORE_STATE':
        return this.mergeRestoredState(state, action.payload.state);

      case 'RESET_STATE':
        return this.createInitialState();

      default:
        return state;
    }
  }

  private handleOpenTab(state: WorkspaceState, diagram: Diagram): WorkspaceState {
    // Check if tab already exists
    const existingTab = state.editorPane.openTabs.find(tab => tab.diagramId === diagram.id);
    
    if (existingTab) {
      // Switch to existing tab
      return this.handleSwitchTab(state, existingTab.id);
    }

    // Create new tab
    const newTab: EditorTab = {
      id: this.generateTabId(),
      diagramId: diagram.id,
      title: diagram.name,
      isModified: false,
      isActive: true,
      isPinned: false,
      editorState: {
        content: diagram.content,
        cursorPosition: { line: 0, column: 0 },
        scrollPosition: { top: 0, left: 0 },
        undoHistory: { canUndo: false, canRedo: false }
      },
      lastAccessed: new Date()
    };

    // Deactivate other tabs
    const updatedTabs = state.editorPane.openTabs.map(tab => ({
      ...tab,
      isActive: false
    }));

    return {
      ...state,
      editorPane: {
        ...state.editorPane,
        openTabs: [...updatedTabs, newTab],
        activeTabId: newTab.id,
        tabOrder: [...state.editorPane.tabOrder, newTab.id]
      }
    };
  }

  private handleCloseTab(state: WorkspaceState, tabId: string): WorkspaceState {
    const tabToClose = state.editorPane.openTabs.find(tab => tab.id === tabId);
    if (!tabToClose) {
      return state;
    }

    const remainingTabs = state.editorPane.openTabs.filter(tab => tab.id !== tabId);
    const updatedTabOrder = state.editorPane.tabOrder.filter(id => id !== tabId);

    let newActiveTabId = state.editorPane.activeTabId;

    // If closing the active tab, switch to another tab
    if (tabToClose.isActive && remainingTabs.length > 0) {
      // Find the next tab in order
      const currentIndex = state.editorPane.tabOrder.indexOf(tabId);
      const nextIndex = currentIndex < updatedTabOrder.length ? currentIndex : currentIndex - 1;
      newActiveTabId = nextIndex >= 0 ? updatedTabOrder[nextIndex] : remainingTabs[0].id;
    } else if (remainingTabs.length === 0) {
      newActiveTabId = null;
    }

    // Update active state for remaining tabs
    const updatedTabs = remainingTabs.map(tab => ({
      ...tab,
      isActive: tab.id === newActiveTabId
    }));

    return {
      ...state,
      editorPane: {
        ...state.editorPane,
        openTabs: updatedTabs,
        activeTabId: newActiveTabId,
        tabOrder: updatedTabOrder
      }
    };
  }

  private handleSwitchTab(state: WorkspaceState, tabId: string): WorkspaceState {
    const targetTab = state.editorPane.openTabs.find(tab => tab.id === tabId);
    if (!targetTab) {
      return state;
    }

    const updatedTabs = state.editorPane.openTabs.map(tab => ({
      ...tab,
      isActive: tab.id === tabId,
      lastAccessed: tab.id === tabId ? new Date() : tab.lastAccessed
    }));

    return {
      ...state,
      editorPane: {
        ...state.editorPane,
        openTabs: updatedTabs,
        activeTabId: tabId
      }
    };
  }

  private handleUpdateDiagramContent(state: WorkspaceState, diagramId: string, content: string): WorkspaceState {
    // Update diagram in current project
    let updatedProject = state.currentProject;
    if (updatedProject) {
      const diagramIndex = updatedProject.diagrams.findIndex(d => d.id === diagramId);
      if (diagramIndex >= 0) {
        const updatedDiagrams = [...updatedProject.diagrams];
        updatedDiagrams[diagramIndex] = {
          ...updatedDiagrams[diagramIndex],
          content,
          isModified: true,
          lastModified: new Date()
        };
        updatedProject = {
          ...updatedProject,
          diagrams: updatedDiagrams,
          lastModified: new Date()
        };
      }
    }

    // Update tab state
    const updatedTabs = state.editorPane.openTabs.map(tab => {
      if (tab.diagramId === diagramId) {
        return {
          ...tab,
          isModified: true,
          editorState: {
            ...tab.editorState,
            content
          }
        };
      }
      return tab;
    });

    return {
      ...state,
      currentProject: updatedProject,
      editorPane: {
        ...state.editorPane,
        openTabs: updatedTabs
      }
    };
  }

  private updateProjectInList(projectList: Project[], project: Project): Project[] {
    const existingIndex = projectList.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      const updated = [...projectList];
      updated[existingIndex] = project;
      return updated;
    }
    return [...projectList, project];
  }

  private addToRecentProjects(recentProjects: ProjectReference[], project: Project): ProjectReference[] {
    const projectRef: ProjectReference = {
      id: project.id,
      name: project.name,
      lastAccessed: new Date()
    };

    const existingIndex = recentProjects.findIndex(ref => ref.id === project.id);
    let updated = [...recentProjects];

    if (existingIndex >= 0) {
      updated[existingIndex] = projectRef;
    } else {
      updated.unshift(projectRef);
    }

    return updated.slice(0, 10); // Keep only 10 most recent
  }

  private mergeRestoredState(currentState: WorkspaceState, restoredState: Partial<WorkspaceState>): WorkspaceState {
    return {
      ...currentState,
      ...restoredState,
      // Always preserve current notifications
      notifications: currentState.notifications
    };
  }

  private validateAction(action: WorkspaceAction): boolean {
    return action && typeof action.type === 'string' && action.type.length > 0;
  }

  private validateState(state: WorkspaceState): StateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required properties
    if (!state.navigationPane) {
      errors.push('navigationPane is required');
    }
    if (!state.editorPane) {
      errors.push('editorPane is required');
    }
    if (!state.settings) {
      errors.push('settings is required');
    }
    if (!Array.isArray(state.notifications)) {
      errors.push('notifications must be an array');
    }

    // Validate navigation pane
    if (state.navigationPane) {
      if (typeof state.navigationPane.isCollapsed !== 'boolean') {
        errors.push('navigationPane.isCollapsed must be boolean');
      }
      if (typeof state.navigationPane.width !== 'number' || state.navigationPane.width < 0) {
        errors.push('navigationPane.width must be a positive number');
      }
    }

    // Validate editor pane
    if (state.editorPane) {
      if (!Array.isArray(state.editorPane.openTabs)) {
        errors.push('editorPane.openTabs must be an array');
      }
      if (state.editorPane.activeTabId && !state.editorPane.openTabs.some(tab => tab.id === state.editorPane.activeTabId)) {
        warnings.push('activeTabId does not match any open tab');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private notifyListeners(action: WorkspaceAction): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, action);
      } catch (error) {
        console.error('State change listener error:', error);
      }
    });
  }

  private persistState(): void {
    try {
      const stateToSave = {
        ...this.state,
        // Don't persist notifications
        notifications: []
      };
      localStorage.setItem('workspace_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  private loadPersistedState(): Partial<WorkspaceState> | null {
    try {
      const savedState = localStorage.getItem('workspace_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Convert date strings back to Date objects
        if (parsed.recentProjects) {
          parsed.recentProjects = parsed.recentProjects.map((ref: any) => ({
            ...ref,
            lastAccessed: new Date(ref.lastAccessed)
          }));
        }
        
        if (parsed.editorPane?.openTabs) {
          parsed.editorPane.openTabs = parsed.editorPane.openTabs.map((tab: any) => ({
            ...tab,
            lastAccessed: new Date(tab.lastAccessed)
          }));
        }

        return parsed;
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
    return null;
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.state.settings.autoSave && this.state.currentProject) {
        this.saveCurrentProject().catch(error => {
          console.error('Auto-save failed:', error);
        });
      }
    }, this.state.settings.autoSaveInterval);
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup method
  public destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.listeners = [];
  }
}