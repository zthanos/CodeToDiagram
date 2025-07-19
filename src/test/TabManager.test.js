/**
 * TabManager test suite
 * Tests tab lifecycle management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabManager } from '../services/TabManager.ts';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock window.addEventListener
global.window = {
  addEventListener: vi.fn()
};

// Helper function to create mock diagram
function createMockDiagram(id, name, content = '', isModified = false) {
  return {
    id,
    name,
    content,
    type: 'flowchart',
    createdAt: new Date(),
    lastModified: new Date(),
    isModified,
    metadata: {
      contentHash: 'hash123',
      size: content.length,
      lineCount: content.split('\n').length,
      lastCursorPosition: { line: 0, column: 0 },
      lastScrollPosition: { top: 0, left: 0 }
    }
  };
}

describe('TabManager', () => {
  let tabManager;
  let mockEvents;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Create mock events
    mockEvents = {
      onTabCreated: vi.fn(),
      onTabClosed: vi.fn(),
      onTabSwitched: vi.fn(),
      onTabModified: vi.fn(),
      onTabOrderChanged: vi.fn()
    };

    // Reset singleton instance
    TabManager.instance = undefined;
    
    // Create new TabManager instance
    tabManager = TabManager.getInstance(
      { maxTabs: 5, autoSave: false, persistState: false },
      mockEvents
    );
  });

  afterEach(() => {
    tabManager?.cleanup();
  });

  describe('Tab Creation', () => {
    it('should create a new tab for a diagram', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram', 'graph TD\nA --> B');
      
      const tab = tabManager.openTab(diagram);
      
      expect(tab).toBeDefined();
      expect(tab.diagramId).toBe('diagram1');
      expect(tab.title).toBe('Test Diagram');
      expect(tab.isActive).toBe(true);
      expect(tab.isModified).toBe(false);
      expect(mockEvents.onTabCreated).toHaveBeenCalledWith(tab);
    });

    it('should return existing tab if diagram is already open', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      
      const tab1 = tabManager.openTab(diagram);
      const tab2 = tabManager.openTab(diagram);
      
      expect(tab1.id).toBe(tab2.id);
      expect(tabManager.getTabCount()).toBe(1);
    });

    it('should close least recently used tab when max tabs exceeded', async () => {
      // Create 5 tabs (max limit) with time delays to ensure different lastAccessed times
      const tabs = [];
      for (let i = 1; i <= 5; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        const tab = tabManager.openTab(diagram);
        tabs.push(tab);
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      expect(tabManager.getTabCount()).toBe(5);
      
      // Switch to first tab to make it more recently used than the second
      tabManager.switchToTab(tabs[0].id);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Create 6th tab - should close the second tab (least recently used)
      const diagram6 = createMockDiagram('diagram6', 'Diagram 6');
      tabManager.openTab(diagram6);
      
      expect(tabManager.getTabCount()).toBe(5);
      expect(tabManager.getTabByDiagramId('diagram1')).toBeDefined(); // Should still exist
      expect(tabManager.getTabByDiagramId('diagram2')).toBeNull(); // Should be closed
      expect(tabManager.getTabByDiagramId('diagram6')).toBeDefined();
    });

    it('should preserve pinned tabs when closing LRU tabs', async () => {
      // Create 5 tabs with time delays
      const tabs = [];
      for (let i = 1; i <= 5; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        const tab = tabManager.openTab(diagram);
        tabs.push(tab);
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Pin the first tab
      tabManager.toggleTabPin(tabs[0].id);
      
      // Switch to first tab to make it more recently used
      tabManager.switchToTab(tabs[0].id);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Create 6th tab - should close second tab (least recently used unpinned)
      const diagram6 = createMockDiagram('diagram6', 'Diagram 6');
      tabManager.openTab(diagram6);
      
      expect(tabManager.getTabByDiagramId('diagram1')).toBeDefined(); // Pinned
      expect(tabManager.getTabByDiagramId('diagram2')).toBeNull(); // Closed
    });
  });

  describe('Tab Switching', () => {
    it('should switch to specified tab', () => {
      const diagram1 = createMockDiagram('diagram1', 'Diagram 1');
      const diagram2 = createMockDiagram('diagram2', 'Diagram 2');
      
      const tab1 = tabManager.openTab(diagram1);
      const tab2 = tabManager.openTab(diagram2);
      
      expect(tabManager.getActiveTabId()).toBe(tab2.id);
      
      tabManager.switchToTab(tab1.id);
      
      expect(tabManager.getActiveTabId()).toBe(tab1.id);
      expect(tab1.isActive).toBe(true);
      expect(tab2.isActive).toBe(false);
      expect(mockEvents.onTabSwitched).toHaveBeenCalledWith(tab1.id);
    });

    it('should update tab order when switching', () => {
      const diagram1 = createMockDiagram('diagram1', 'Diagram 1');
      const diagram2 = createMockDiagram('diagram2', 'Diagram 2');
      const diagram3 = createMockDiagram('diagram3', 'Diagram 3');
      
      const tab1 = tabManager.openTab(diagram1);
      const tab2 = tabManager.openTab(diagram2);
      const tab3 = tabManager.openTab(diagram3);
      
      // Switch back to first tab
      tabManager.switchToTab(tab1.id);
      
      const tabOrder = tabManager.getTabOrder();
      expect(tabOrder[tabOrder.length - 1]).toBe(tab1.id); // Most recently used
    });

    it('should return false for invalid tab ID', () => {
      const result = tabManager.switchToTab('invalid-tab-id');
      expect(result).toBe(false);
    });
  });

  describe('Tab Closing', () => {
    it('should close specified tab', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      const result = tabManager.closeTab(tab.id);
      
      expect(result).toBe(true);
      expect(tabManager.getTab(tab.id)).toBeNull();
      expect(tabManager.getTabCount()).toBe(0);
      expect(mockEvents.onTabClosed).toHaveBeenCalledWith(tab.id);
    });

    it('should switch to next tab when closing active tab', () => {
      const diagram1 = createMockDiagram('diagram1', 'Diagram 1');
      const diagram2 = createMockDiagram('diagram2', 'Diagram 2');
      
      const tab1 = tabManager.openTab(diagram1);
      const tab2 = tabManager.openTab(diagram2);
      
      expect(tabManager.getActiveTabId()).toBe(tab2.id);
      
      tabManager.closeTab(tab2.id);
      
      expect(tabManager.getActiveTabId()).toBe(tab1.id);
    });

    it('should close all tabs', () => {
      for (let i = 1; i <= 3; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        tabManager.openTab(diagram);
      }
      
      expect(tabManager.getTabCount()).toBe(3);
      
      tabManager.closeAllTabs();
      
      expect(tabManager.getTabCount()).toBe(0);
      expect(tabManager.getActiveTabId()).toBeNull();
    });

    it('should close other tabs except specified one', () => {
      const tabs = [];
      for (let i = 1; i <= 3; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        const tab = tabManager.openTab(diagram);
        tabs.push(tab);
      }
      
      tabManager.closeOtherTabs(tabs[1].id);
      
      expect(tabManager.getTabCount()).toBe(1);
      expect(tabManager.getTab(tabs[1].id)).toBeDefined();
      expect(tabManager.getTab(tabs[0].id)).toBeNull();
      expect(tabManager.getTab(tabs[2].id)).toBeNull();
    });

    it('should return false for invalid tab ID', () => {
      const result = tabManager.closeTab('invalid-tab-id');
      expect(result).toBe(false);
    });
  });

  describe('Tab Modification Status', () => {
    it('should update tab modification status', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      expect(tab.isModified).toBe(false);
      
      tabManager.setTabModified(tab.id, true);
      
      expect(tab.isModified).toBe(true);
      expect(mockEvents.onTabModified).toHaveBeenCalledWith(tab.id, true);
    });

    it('should check if any tabs have unsaved changes', () => {
      const diagram1 = createMockDiagram('diagram1', 'Diagram 1');
      const diagram2 = createMockDiagram('diagram2', 'Diagram 2');
      
      const tab1 = tabManager.openTab(diagram1);
      const tab2 = tabManager.openTab(diagram2);
      
      expect(tabManager.hasUnsavedChanges()).toBe(false);
      
      tabManager.setTabModified(tab1.id, true);
      
      expect(tabManager.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('Tab Ordering and Pinning', () => {
    it('should reorder tabs', () => {
      const tabs = [];
      for (let i = 1; i <= 3; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        const tab = tabManager.openTab(diagram);
        tabs.push(tab);
      }
      
      const initialOrder = tabManager.getTabOrder();
      
      // Move first tab to last position
      tabManager.reorderTab(tabs[0].id, 2);
      
      const newOrder = tabManager.getTabOrder();
      expect(newOrder).not.toEqual(initialOrder);
      expect(newOrder[2]).toBe(tabs[0].id);
      expect(mockEvents.onTabOrderChanged).toHaveBeenCalled();
    });

    it('should toggle tab pin status', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      expect(tab.isPinned).toBe(false);
      
      tabManager.toggleTabPin(tab.id);
      
      expect(tab.isPinned).toBe(true);
      
      tabManager.toggleTabPin(tab.id);
      
      expect(tab.isPinned).toBe(false);
    });
  });

  describe('Editor State Management', () => {
    it('should update tab editor state', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      const newEditorState = {
        content: 'updated content',
        cursorPosition: { line: 5, column: 10 }
      };
      
      const result = tabManager.updateTabEditorState(tab.id, newEditorState);
      
      expect(result).toBe(true);
      expect(tab.editorState.content).toBe('updated content');
      expect(tab.editorState.cursorPosition.line).toBe(5);
      expect(tab.editorState.cursorPosition.column).toBe(10);
    });
  });

  describe('Tab Retrieval', () => {
    it('should get tab by diagram ID', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      const foundTab = tabManager.getTabByDiagramId('diagram1');
      
      expect(foundTab).toBeDefined();
      expect(foundTab.id).toBe(tab.id);
    });

    it('should get active tab', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      const tab = tabManager.openTab(diagram);
      
      const activeTab = tabManager.getActiveTab();
      
      expect(activeTab).toBeDefined();
      expect(activeTab.id).toBe(tab.id);
    });

    it('should get all open tabs in order', () => {
      const tabs = [];
      for (let i = 1; i <= 3; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`);
        const tab = tabManager.openTab(diagram);
        tabs.push(tab);
      }
      
      const openTabs = tabManager.getOpenTabs();
      
      expect(openTabs).toHaveLength(3);
      expect(openTabs.map(t => t.diagramId)).toEqual(['diagram1', 'diagram2', 'diagram3']);
    });
  });

  describe('Memory Management', () => {
    it('should provide memory usage statistics', () => {
      for (let i = 1; i <= 3; i++) {
        const diagram = createMockDiagram(`diagram${i}`, `Diagram ${i}`, 'some content');
        tabManager.openTab(diagram);
      }
      
      const stats = tabManager.getMemoryStats();
      
      expect(stats.tabCount).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
    });

    it('should cleanup resources', () => {
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      tabManager.openTab(diagram);
      
      // Should not throw error
      expect(() => tabManager.cleanup()).not.toThrow();
    });
  });

  describe('State Persistence', () => {
    it('should handle state persistence when enabled', () => {
      // Create new TabManager with persistence enabled
      TabManager.instance = undefined;
      const persistentTabManager = TabManager.getInstance(
        { persistState: true, autoSave: false }
      );
      
      const diagram = createMockDiagram('diagram1', 'Test Diagram');
      persistentTabManager.openTab(diagram);
      
      // Should call localStorage.setItem
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      persistentTabManager.cleanup();
    });

    it('should handle loading state from localStorage', () => {
      const mockState = {
        openTabs: [
          ['tab1', {
            id: 'tab1',
            diagramId: 'diagram1',
            title: 'Test Diagram',
            isModified: false,
            isActive: true,
            isPinned: false,
            lastAccessed: new Date().toISOString(),
            editorState: {
              content: 'test content',
              cursorPosition: { line: 0, column: 0 },
              scrollPosition: { top: 0, left: 0 },
              undoHistory: { undoStack: [], redoStack: [], currentIndex: 0 }
            }
          }]
        ],
        activeTabId: 'tab1',
        tabOrder: ['tab1'],
        timestamp: new Date().toISOString()
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockState));
      
      // Create new TabManager instance
      TabManager.instance = undefined;
      const restoredTabManager = TabManager.getInstance(
        { persistState: true, autoSave: false }
      );
      
      expect(restoredTabManager.getTabCount()).toBe(1);
      expect(restoredTabManager.getActiveTabId()).toBe('tab1');
      
      restoredTabManager.cleanup();
    });
  });
});