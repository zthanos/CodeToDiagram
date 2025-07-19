/**
 * TabManager class for tab lifecycle management
 * Requirements: 10.1, 10.2, 10.5
 */

import { 
  EditorTab, 
  Diagram, 
  EditorState, 
  CursorPosition, 
  ScrollPosition,
  UndoHistoryState 
} from '../types';

export interface TabManagerOptions {
  maxTabs?: number;
  autoSave?: boolean;
  autoSaveInterval?: number;
  persistState?: boolean;
}

export interface TabManagerEvents {
  onTabCreated?: (tab: EditorTab) => void;
  onTabClosed?: (tabId: string) => void;
  onTabSwitched?: (tabId: string) => void;
  onTabModified?: (tabId: string, isModified: boolean) => void;
  onTabOrderChanged?: (tabOrder: string[]) => void;
}

export class TabManager {
  private static instance: TabManager;
  private openTabs: Map<string, EditorTab> = new Map();
  private activeTabId: string | null = null;
  private tabOrder: string[] = [];
  private options: Required<TabManagerOptions>;
  private events: TabManagerEvents;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private storageKey = 'tab_manager_state';

  private constructor(options: TabManagerOptions = {}, events: TabManagerEvents = {}) {
    this.options = {
      maxTabs: options.maxTabs ?? 20,
      autoSave: options.autoSave ?? true,
      autoSaveInterval: options.autoSaveInterval ?? 30000, // 30 seconds
      persistState: options.persistState ?? true
    };
    this.events = events;

    // Load persisted state
    if (this.options.persistState) {
      this.loadState();
    }

    // Setup auto-save
    if (this.options.autoSave) {
      this.setupAutoSave();
    }

    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Get singleton instance of TabManager
   */
  public static getInstance(options?: TabManagerOptions, events?: TabManagerEvents): TabManager {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager(options, events);
    }
    return TabManager.instance;
  }

  /**
   * Create or open a tab for a diagram
   */
  public openTab(diagram: Diagram): EditorTab {
    try {
      // Check if tab already exists for this diagram
      const existingTab = this.getTabByDiagramId(diagram.id);
      if (existingTab) {
        this.switchToTab(existingTab.id);
        return existingTab;
      }

      // Check tab limit and close LRU tab if needed
      if (this.openTabs.size >= this.options.maxTabs) {
        const closed = this.closeLeastRecentlyUsedTab();
        if (!closed) {
          throw new Error('Cannot open new tab: maximum tabs reached and no unpinned tabs to close');
        }
      }

      // Create new tab
      const tabId = this.generateTabId();
      const now = new Date();

      // Create default editor state
      const defaultEditorState: EditorState = {
        content: diagram.content,
        cursorPosition: diagram.metadata.lastCursorPosition ?? { line: 0, column: 0 },
        scrollPosition: diagram.metadata.lastScrollPosition ?? { top: 0, left: 0 },
        selectionRange: undefined,
        undoHistory: {
          undoStack: [],
          redoStack: [],
          currentIndex: 0
        }
      };

      const newTab: EditorTab = {
        id: tabId,
        diagramId: diagram.id,
        title: diagram.name,
        isModified: diagram.isModified,
        isActive: false,
        isPinned: false,
        editorState: defaultEditorState,
        lastAccessed: now
      };

      // Add to collections
      this.openTabs.set(tabId, newTab);
      this.tabOrder.push(tabId);

      // Switch to new tab
      this.switchToTab(tabId);

      // Trigger event
      this.events.onTabCreated?.(newTab);

      // Persist state
      this.persistState();

      return newTab;
    } catch (error) {
      throw new Error(`Failed to open tab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close a tab by ID
   */
  public closeTab(tabId: string): boolean {
    try {
      const tab = this.openTabs.get(tabId);
      if (!tab) {
        return false;
      }

      // Check for unsaved changes
      if (tab.isModified) {
        // In a real implementation, this would show a confirmation dialog
        // For now, we'll just proceed with closing
        console.warn(`Closing tab "${tab.title}" with unsaved changes`);
      }

      // Remove from collections
      this.openTabs.delete(tabId);
      this.tabOrder = this.tabOrder.filter(id => id !== tabId);

      // Handle active tab switching
      if (this.activeTabId === tabId) {
        this.activeTabId = null;
        
        // Switch to next available tab
        if (this.tabOrder.length > 0) {
          const nextTabId = this.tabOrder[this.tabOrder.length - 1];
          this.switchToTab(nextTabId);
        }
      }

      // Trigger event
      this.events.onTabClosed?.(tabId);

      // Persist state
      this.persistState();

      return true;
    } catch (error) {
      console.error(`Failed to close tab: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Switch to a specific tab
   */
  public switchToTab(tabId: string): boolean {
    try {
      const tab = this.openTabs.get(tabId);
      if (!tab) {
        return false;
      }

      // Update previous active tab
      if (this.activeTabId) {
        const previousTab = this.openTabs.get(this.activeTabId);
        if (previousTab) {
          previousTab.isActive = false;
        }
      }

      // Update new active tab
      tab.isActive = true;
      tab.lastAccessed = new Date();
      this.activeTabId = tabId;

      // Move tab to end of order (most recently used)
      this.tabOrder = this.tabOrder.filter(id => id !== tabId);
      this.tabOrder.push(tabId);

      // Trigger event
      this.events.onTabSwitched?.(tabId);

      // Persist state
      this.persistState();

      return true;
    } catch (error) {
      console.error(`Failed to switch to tab: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Close all tabs
   */
  public closeAllTabs(): void {
    try {
      const tabIds = Array.from(this.openTabs.keys());
      
      for (const tabId of tabIds) {
        this.closeTab(tabId);
      }

      this.activeTabId = null;
      this.persistState();
    } catch (error) {
      console.error(`Failed to close all tabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close all tabs except the specified one
   */
  public closeOtherTabs(keepTabId: string): void {
    try {
      const tabIds = Array.from(this.openTabs.keys()).filter(id => id !== keepTabId);
      
      for (const tabId of tabIds) {
        this.closeTab(tabId);
      }
    } catch (error) {
      console.error(`Failed to close other tabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pin or unpin a tab
   */
  public toggleTabPin(tabId: string): boolean {
    try {
      const tab = this.openTabs.get(tabId);
      if (!tab) {
        return false;
      }

      tab.isPinned = !tab.isPinned;
      this.persistState();
      return true;
    } catch (error) {
      console.error(`Failed to toggle tab pin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Reorder tabs by moving a tab to a new position
   */
  public reorderTab(tabId: string, newIndex: number): boolean {
    try {
      const currentIndex = this.tabOrder.indexOf(tabId);
      if (currentIndex === -1 || newIndex < 0 || newIndex >= this.tabOrder.length) {
        return false;
      }

      // Remove from current position
      this.tabOrder.splice(currentIndex, 1);
      
      // Insert at new position
      this.tabOrder.splice(newIndex, 0, tabId);

      // Trigger event
      this.events.onTabOrderChanged?.(this.tabOrder.slice());

      // Persist state
      this.persistState();

      return true;
    } catch (error) {
      console.error(`Failed to reorder tab: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Update tab modification status
   */
  public setTabModified(tabId: string, isModified: boolean): boolean {
    try {
      const tab = this.openTabs.get(tabId);
      if (!tab) {
        return false;
      }

      if (tab.isModified !== isModified) {
        tab.isModified = isModified;
        this.events.onTabModified?.(tabId, isModified);
        this.persistState();
      }

      return true;
    } catch (error) {
      console.error(`Failed to set tab modified status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Update tab editor state
   */
  public updateTabEditorState(tabId: string, editorState: Partial<EditorState>): boolean {
    try {
      const tab = this.openTabs.get(tabId);
      if (!tab) {
        return false;
      }

      tab.editorState = { ...tab.editorState, ...editorState };
      tab.lastAccessed = new Date();
      
      // Auto-persist state if enabled
      if (this.options.persistState) {
        this.persistState();
      }

      return true;
    } catch (error) {
      console.error(`Failed to update tab editor state: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  // Getter methods

  /**
   * Get all open tabs in order
   */
  public getOpenTabs(): EditorTab[] {
    return this.tabOrder.map(id => this.openTabs.get(id)!).filter(Boolean);
  }

  /**
   * Get active tab
   */
  public getActiveTab(): EditorTab | null {
    return this.activeTabId ? this.openTabs.get(this.activeTabId) ?? null : null;
  }

  /**
   * Get tab by ID
   */
  public getTab(tabId: string): EditorTab | null {
    return this.openTabs.get(tabId) ?? null;
  }

  /**
   * Get tab by diagram ID
   */
  public getTabByDiagramId(diagramId: string): EditorTab | null {
    for (const tab of this.openTabs.values()) {
      if (tab.diagramId === diagramId) {
        return tab;
      }
    }
    return null;
  }

  /**
   * Check if tab is modified
   */
  public isTabModified(tabId: string): boolean {
    const tab = this.openTabs.get(tabId);
    return tab?.isModified ?? false;
  }

  /**
   * Get tab count
   */
  public getTabCount(): number {
    return this.openTabs.size;
  }

  /**
   * Get active tab ID
   */
  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Get tab order
   */
  public getTabOrder(): string[] {
    return this.tabOrder.slice();
  }

  /**
   * Check if any tabs have unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    for (const tab of this.openTabs.values()) {
      if (tab.isModified) {
        return true;
      }
    }
    return false;
  }

  // Private helper methods

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private closeLeastRecentlyUsedTab(): boolean {
    // Find the least recently used unpinned tab
    let oldestTab: EditorTab | null = null;
    let oldestTime = new Date();

    for (const tab of this.openTabs.values()) {
      if (!tab.isPinned && tab.lastAccessed < oldestTime) {
        oldestTab = tab;
        oldestTime = tab.lastAccessed;
      }
    }

    if (oldestTab) {
      return this.closeTab(oldestTab.id);
    }
    
    return false;
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.persistState();
    }, this.options.autoSaveInterval);
  }

  private persistState(): void {
    if (!this.options.persistState) {
      return;
    }

    try {
      const state = {
        openTabs: Array.from(this.openTabs.entries()),
        activeTabId: this.activeTabId,
        tabOrder: this.tabOrder,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist tab state:', error);
    }
  }

  private loadState(): void {
    try {
      const stateData = localStorage.getItem(this.storageKey);
      if (!stateData) {
        return;
      }

      const state = JSON.parse(stateData);
      
      // Restore tabs
      this.openTabs.clear();
      for (const [tabId, tabData] of state.openTabs) {
        // Convert date strings back to Date objects
        const tab: EditorTab = {
          ...tabData,
          lastAccessed: new Date(tabData.lastAccessed)
        };
        this.openTabs.set(tabId, tab);
      }

      // Restore active tab and order
      this.activeTabId = state.activeTabId;
      this.tabOrder = state.tabOrder || [];

      // Validate state consistency
      this.validateState();
    } catch (error) {
      console.warn('Failed to load tab state:', error);
      this.resetState();
    }
  }

  private validateState(): void {
    // Remove invalid tabs from order
    this.tabOrder = this.tabOrder.filter(id => this.openTabs.has(id));

    // Add missing tabs to order
    for (const tabId of this.openTabs.keys()) {
      if (!this.tabOrder.includes(tabId)) {
        this.tabOrder.push(tabId);
      }
    }

    // Validate active tab
    if (this.activeTabId && !this.openTabs.has(this.activeTabId)) {
      this.activeTabId = this.tabOrder.length > 0 ? this.tabOrder[this.tabOrder.length - 1] : null;
    }

    // Update active tab status
    for (const tab of this.openTabs.values()) {
      tab.isActive = tab.id === this.activeTabId;
    }
  }

  private resetState(): void {
    this.openTabs.clear();
    this.activeTabId = null;
    this.tabOrder = [];
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // Final state persistence
    this.persistState();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): { tabCount: number; totalSize: number; averageSize: number } {
    const tabCount = this.openTabs.size;
    let totalSize = 0;

    for (const tab of this.openTabs.values()) {
      // Estimate memory usage (rough calculation)
      totalSize += JSON.stringify(tab).length;
    }

    return {
      tabCount,
      totalSize,
      averageSize: tabCount > 0 ? totalSize / tabCount : 0
    };
  }
}