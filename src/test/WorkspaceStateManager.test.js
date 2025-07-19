/**
 * Tests for WorkspaceStateManager
 * Requirements: 8.1, 13.3, 13.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock ProjectManager
vi.mock('../services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: vi.fn(() => ({
      createProject: vi.fn(),
      loadProject: vi.fn(),
      saveProject: vi.fn(),
      deleteProject: vi.fn(),
      getCurrentProject: vi.fn(),
      setCurrentProject: vi.fn(),
      getProjectList: vi.fn(() => []),
      getRecentProjects: vi.fn(() => [])
    }))
  }
}));

describe('WorkspaceStateManager', () => {
  let stateManager;
  let mockProjectManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset singleton instance for clean tests
    WorkspaceStateManager.instance = null;
    
    // Get fresh instance
    stateManager = WorkspaceStateManager.getInstance();
    mockProjectManager = stateManager.projectManager;
  });

  afterEach(() => {
    if (stateManager) {
      stateManager.destroy();
    }
    // Reset singleton instance after each test
    WorkspaceStateManager.instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WorkspaceStateManager.getInstance();
      const instance2 = WorkspaceStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state structure', () => {
      const state = stateManager.getState();
      
      expect(state).toHaveProperty('currentProject', null);
      expect(state).toHaveProperty('projectList', []);
      expect(state).toHaveProperty('recentProjects', []);
      expect(state).toHaveProperty('navigationPane');
      expect(state).toHaveProperty('editorPane');
      expect(state).toHaveProperty('theme', 'default');
      expect(state).toHaveProperty('settings');
      expect(state).toHaveProperty('notifications', []);
    });

    it('should have correct navigation pane initial state', () => {
      const state = stateManager.getState();
      
      expect(state.navigationPane).toEqual({
        isCollapsed: false,
        width: 300,
        selectedDiagramId: null,
        searchQuery: '',
        sortBy: 'name'
      });
    });

    it('should have correct editor pane initial state', () => {
      const state = stateManager.getState();
      
      expect(state.editorPane).toEqual({
        openTabs: [],
        activeTabId: null,
        tabOrder: [],
        splitView: false
      });
    });

    it('should have correct default settings', () => {
      const state = stateManager.getState();
      
      expect(state.settings).toEqual({
        theme: 'default',
        autoSave: true,
        autoSaveInterval: 30000,
        maxRecentProjects: 10,
        enableNotifications: true,
        debugMode: false
      });
    });
  });

  describe('State Subscription', () => {
    it('should allow subscribing to state changes', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Trigger a state change
      stateManager.toggleNavigation();
      
      expect(listener).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'TOGGLE_NAVIGATION' })
      );
      
      // Unsubscribe and verify no more calls
      unsubscribe();
      listener.mockClear();
      stateManager.toggleNavigation();
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      stateManager.subscribe(listener1);
      stateManager.subscribe(listener2);
      
      stateManager.toggleNavigation();
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Navigation Actions', () => {
    it('should toggle navigation pane', () => {
      const initialState = stateManager.getState();
      expect(initialState.navigationPane.isCollapsed).toBe(false);
      
      stateManager.toggleNavigation();
      
      const newState = stateManager.getState();
      expect(newState.navigationPane.isCollapsed).toBe(true);
      
      stateManager.toggleNavigation();
      
      const finalState = stateManager.getState();
      expect(finalState.navigationPane.isCollapsed).toBe(false);
    });

    it('should select diagram', () => {
      const diagramId = 'test-diagram-id';
      
      stateManager.selectDiagram(diagramId);
      
      const state = stateManager.getState();
      expect(state.navigationPane.selectedDiagramId).toBe(diagramId);
    });
  });

  describe('Tab Management', () => {
    const mockDiagram = {
      id: 'diagram-1',
      name: 'Test Diagram',
      content: 'graph TD\n  A --> B',
      type: 'flowchart',
      createdAt: new Date(),
      lastModified: new Date(),
      isModified: false,
      metadata: {
        contentHash: 'hash123',
        size: 100,
        lineCount: 2
      }
    };

    it('should open a new tab for diagram', () => {
      stateManager.openDiagram(mockDiagram);
      
      const state = stateManager.getState();
      expect(state.editorPane.openTabs).toHaveLength(1);
      expect(state.editorPane.openTabs[0]).toMatchObject({
        diagramId: mockDiagram.id,
        title: mockDiagram.name,
        isModified: false,
        isActive: true,
        isPinned: false
      });
      expect(state.editorPane.activeTabId).toBe(state.editorPane.openTabs[0].id);
    });

    it('should switch to existing tab instead of creating duplicate', () => {
      stateManager.openDiagram(mockDiagram);
      const firstState = stateManager.getState();
      const firstTabId = firstState.editorPane.openTabs[0].id;
      
      // Try to open the same diagram again
      stateManager.openDiagram(mockDiagram);
      
      const secondState = stateManager.getState();
      expect(secondState.editorPane.openTabs).toHaveLength(1);
      expect(secondState.editorPane.activeTabId).toBe(firstTabId);
    });

    it('should close tab', () => {
      stateManager.openDiagram(mockDiagram);
      const state = stateManager.getState();
      const tabId = state.editorPane.openTabs[0].id;
      
      stateManager.closeTab(tabId);
      
      const newState = stateManager.getState();
      expect(newState.editorPane.openTabs).toHaveLength(0);
      expect(newState.editorPane.activeTabId).toBe(null);
    });

    it('should switch active tab when closing current active tab', () => {
      const mockDiagram2 = { ...mockDiagram, id: 'diagram-2', name: 'Test Diagram 2' };
      
      stateManager.openDiagram(mockDiagram);
      stateManager.openDiagram(mockDiagram2);
      
      const state = stateManager.getState();
      expect(state.editorPane.openTabs).toHaveLength(2);
      
      const activeTabId = state.editorPane.activeTabId;
      stateManager.closeTab(activeTabId);
      
      const newState = stateManager.getState();
      expect(newState.editorPane.openTabs).toHaveLength(1);
      expect(newState.editorPane.activeTabId).not.toBe(activeTabId);
      expect(newState.editorPane.activeTabId).not.toBe(null);
    });

    it('should close all tabs', () => {
      const mockDiagram2 = { ...mockDiagram, id: 'diagram-2', name: 'Test Diagram 2' };
      
      stateManager.openDiagram(mockDiagram);
      stateManager.openDiagram(mockDiagram2);
      
      stateManager.closeAllTabs();
      
      const state = stateManager.getState();
      expect(state.editorPane.openTabs).toHaveLength(0);
      expect(state.editorPane.activeTabId).toBe(null);
      expect(state.editorPane.tabOrder).toHaveLength(0);
    });

    it('should switch between tabs', () => {
      const mockDiagram2 = { ...mockDiagram, id: 'diagram-2', name: 'Test Diagram 2' };
      
      stateManager.openDiagram(mockDiagram);
      stateManager.openDiagram(mockDiagram2);
      
      const state = stateManager.getState();
      const firstTabId = state.editorPane.openTabs.find(tab => tab.diagramId === mockDiagram.id).id;
      const secondTabId = state.editorPane.openTabs.find(tab => tab.diagramId === mockDiagram2.id).id;
      
      expect(state.editorPane.activeTabId).toBe(secondTabId);
      
      stateManager.switchTab(firstTabId);
      
      const newState = stateManager.getState();
      expect(newState.editorPane.activeTabId).toBe(firstTabId);
      expect(newState.editorPane.openTabs.find(tab => tab.id === firstTabId).isActive).toBe(true);
      expect(newState.editorPane.openTabs.find(tab => tab.id === secondTabId).isActive).toBe(false);
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      const newSettings = {
        autoSave: false,
        autoSaveInterval: 60000
      };
      
      stateManager.updateSettings(newSettings);
      
      const state = stateManager.getState();
      expect(state.settings.autoSave).toBe(false);
      expect(state.settings.autoSaveInterval).toBe(60000);
      expect(state.settings.theme).toBe('default'); // Should preserve other settings
    });

    it('should update theme', () => {
      stateManager.updateTheme('dark');
      
      const state = stateManager.getState();
      expect(state.theme).toBe('dark');
      expect(state.settings.theme).toBe('dark');
    });
  });

  describe('Notification Management', () => {
    it('should add notification', () => {
      const notification = {
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test message'
      };
      
      stateManager.addNotification(notification);
      
      const state = stateManager.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]).toMatchObject(notification);
      expect(state.notifications[0]).toHaveProperty('id');
      expect(state.notifications[0]).toHaveProperty('timestamp');
    });

    it('should remove notification', () => {
      const notification = {
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test message'
      };
      
      stateManager.addNotification(notification);
      const state = stateManager.getState();
      const notificationId = state.notifications.find(n => n.title === 'Test Notification')?.id;
      
      if (notificationId) {
        stateManager.removeNotification(notificationId);
      }
      
      const newState = stateManager.getState();
      const testNotifications = newState.notifications.filter(n => n.title === 'Test Notification');
      expect(testNotifications).toHaveLength(0);
    });

    it('should auto-remove notification with duration', (done) => {
      const notification = {
        type: 'info',
        title: 'Auto Remove Test',
        message: 'This is a test message',
        autoClose: true,
        duration: 100
      };
      
      stateManager.addNotification(notification);
      
      const state = stateManager.getState();
      const autoRemoveNotifications = state.notifications.filter(n => n.title === 'Auto Remove Test');
      expect(autoRemoveNotifications).toHaveLength(1);
      
      setTimeout(() => {
        const newState = stateManager.getState();
        const remainingAutoRemoveNotifications = newState.notifications.filter(n => n.title === 'Auto Remove Test');
        expect(remainingAutoRemoveNotifications).toHaveLength(0);
        done();
      }, 150);
    });
  });

  describe('State Validation', () => {
    it('should validate state structure', () => {
      const state = stateManager.getState();
      
      // Test that state has all required properties
      expect(state).toHaveProperty('currentProject');
      expect(state).toHaveProperty('projectList');
      expect(state).toHaveProperty('recentProjects');
      expect(state).toHaveProperty('navigationPane');
      expect(state).toHaveProperty('editorPane');
      expect(state).toHaveProperty('theme');
      expect(state).toHaveProperty('settings');
      expect(state).toHaveProperty('notifications');
      
      // Test navigation pane structure
      expect(state.navigationPane).toHaveProperty('isCollapsed');
      expect(state.navigationPane).toHaveProperty('width');
      expect(state.navigationPane).toHaveProperty('selectedDiagramId');
      expect(state.navigationPane).toHaveProperty('searchQuery');
      expect(state.navigationPane).toHaveProperty('sortBy');
      
      // Test editor pane structure
      expect(state.editorPane).toHaveProperty('openTabs');
      expect(state.editorPane).toHaveProperty('activeTabId');
      expect(state.editorPane).toHaveProperty('tabOrder');
      expect(state.editorPane).toHaveProperty('splitView');
    });

    it('should handle invalid actions gracefully', () => {
      const listener = vi.fn();
      stateManager.subscribe(listener);
      
      // Try to dispatch invalid action
      stateManager.dispatch({ type: '', payload: {} });
      
      // Should have called listeners with error notification, not the invalid action
      expect(listener).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: 'ADD_NOTIFICATION' })
      );
    });
  });

  describe('State Persistence', () => {
    it('should persist state to localStorage', () => {
      stateManager.toggleNavigation();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'workspace_state',
        expect.any(String)
      );
    });

    it('should restore state from localStorage', () => {
      const savedState = {
        navigationPane: {
          isCollapsed: true,
          width: 250,
          selectedDiagramId: null,
          searchQuery: '',
          sortBy: 'name'
        },
        editorPane: {
          openTabs: [],
          activeTabId: null,
          tabOrder: [],
          splitView: false
        },
        theme: 'dark',
        settings: {
          theme: 'dark',
          autoSave: false,
          autoSaveInterval: 60000,
          maxRecentProjects: 5,
          enableNotifications: false,
          debugMode: true
        },
        currentProject: null,
        projectList: [],
        recentProjects: [],
        notifications: []
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
      
      stateManager.restoreState();
      
      const state = stateManager.getState();
      expect(state.navigationPane.isCollapsed).toBe(true);
      expect(state.navigationPane.width).toBe(250);
      expect(state.theme).toBe('dark');
      expect(state.settings.autoSave).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw error
      expect(() => stateManager.restoreState()).not.toThrow();
      
      // Should maintain default state
      const state = stateManager.getState();
      expect(state.navigationPane.isCollapsed).toBe(false);
      expect(state.theme).toBe('default');
    });
  });

  describe('State Reset', () => {
    it('should reset state to initial values', () => {
      // Make some changes
      stateManager.toggleNavigation();
      stateManager.updateTheme('dark');
      stateManager.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test message'
      });
      
      // Verify changes were made
      let state = stateManager.getState();
      expect(state.navigationPane.isCollapsed).toBe(true);
      expect(state.theme).toBe('dark');
      expect(state.notifications).toHaveLength(1);
      
      // Reset state
      stateManager.resetState();
      
      // Verify state is back to initial values
      state = stateManager.getState();
      expect(state.navigationPane.isCollapsed).toBe(false);
      expect(state.theme).toBe('default');
      expect(state.notifications).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      stateManager.subscribe(errorListener);
      stateManager.subscribe(normalListener);
      
      // Should not throw error and should still call other listeners
      expect(() => stateManager.toggleNavigation()).not.toThrow();
      expect(normalListener).toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw error
      expect(() => stateManager.toggleNavigation()).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on destroy', () => {
      const listener = vi.fn();
      stateManager.subscribe(listener);
      
      stateManager.destroy();
      
      // Should not call listeners after destroy
      stateManager.toggleNavigation();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});