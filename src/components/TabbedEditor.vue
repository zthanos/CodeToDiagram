<template>
  <div class="tabbed-editor" :class="{ 'dark-theme': isDarkTheme }">
    <!-- Tab Bar -->
    <TabBar :tabs="displayTabs" :active-tab-id="activeTabId" :theme="theme" :show-close-on-pinned="showCloseOnPinned"
      :max-visible-tabs="maxVisibleTabs" @tab-click="handleTabClick" @tab-close="handleTabClose"
      @tab-close-others="handleTabCloseOthers" @tab-close-all="handleTabCloseAll" @tab-toggle-pin="handleTabTogglePin"
      @tab-duplicate="handleTabDuplicate" @tab-reorder="handleTabReorder" @new-tab="handleNewTab"
      @close-unmodified-tabs="handleCloseUnmodifiedTabs" />

    <!-- Tab Content Area -->
    <div class="tab-content-area">
      <!-- Empty State -->
      <div v-if="openTabs.length === 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">📝</div>
          <h3>No tabs open</h3>
          <p>Open a diagram to start editing</p>
        </div>
      </div>

      <!-- Editor Instances -->
      <div v-else class="editor-instances">
        <div v-for="tab in openTabs" :key="tab.id" class="editor-instance" :class="{ 'active': tab.id === activeTabId }"
          v-show="tab.id === activeTabId">
          <MermaidRenderer :ref="el => setEditorRef(tab.id, el)" :theme="theme"
            :initial-content="tab.editorState.content" :initial-cursor-position="tab.editorState.cursorPosition"
            :initial-scroll-position="tab.editorState.scrollPosition" @update:theme="$emit('update:theme', $event)"
            @content-changed="handleContentChanged(tab.id, $event)"
            @cursor-changed="handleCursorChanged(tab.id, $event)" @scroll-changed="handleScrollChanged(tab.id, $event)"
            @editor-ready="handleEditorReady(tab.id, $event)" />
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading editor...</div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import TabBar from './TabBar.vue';
import MermaidRenderer from './MermaidRenderer.vue';
import { TabManager } from '../services/TabManager.ts';

export default defineComponent({
  name: 'TabbedEditor',
  components: {
    TabBar,
    MermaidRenderer
  },
  props: {
    theme: {
      type: String,
      default: 'default'
    },
    diagrams: {
      type: Array,
      default: () => []
    },
    activeDiagramId: {
      type: String,
      default: null
    },
    showCloseOnPinned: {
      type: Boolean,
      default: false
    },
    maxVisibleTabs: {
      type: Number,
      default: 10
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    autoSaveInterval: {
      type: Number,
      default: 30000
    }
  },
  emits: [
    'update:theme',
    'diagram-content-changed',
    'diagram-cursor-changed',
    'diagram-scroll-changed',
    'tab-opened',
    'tab-closed',
    'tab-switched',
    'new-diagram-requested'
  ],
  data() {
    return {
      tabManager: null,
      openTabs: [],
      activeTabId: null,
      editorRefs: new Map(),
      isLoading: false,
      initializationComplete: false
    };
  },
  computed: {
    isDarkTheme() {
      return this.theme === 'dark';
    },

    displayTabs() {
      return this.openTabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        isActive: tab.isActive,
        isModified: tab.isModified,
        isPinned: tab.isPinned
      }));
    }
  },
  watch: {
    diagrams: {
      handler(newDiagrams, oldDiagrams) {
        if (this.initializationComplete) {
          this.handleDiagramsChanged(newDiagrams, oldDiagrams);
        }
      },
      deep: true
    },

    activeDiagramId(newId, oldId) {
      if (newId && newId !== oldId) {
        this.openDiagramTab(newId);
      }
    },

    theme() {
      // Theme changes are handled by individual MermaidRenderer instances
      this.$nextTick(() => {
        this.refreshActiveEditor();
      });
    }
  },
  async mounted() {
    await this.initializeTabManager();
    await this.initializeFromProps();
    this.initializationComplete = true;
  },
  beforeUnmount() {
    this.cleanup();
  },
  methods: {
    // Initialization
    async initializeTabManager() {
      try {
        const tabManagerOptions = {
          maxTabs: 20,
          autoSave: this.autoSave,
          autoSaveInterval: this.autoSaveInterval,
          persistState: true
        };

        const tabManagerEvents = {
          onTabCreated: this.handleTabManagerTabCreated,
          onTabClosed: this.handleTabManagerTabClosed,
          onTabSwitched: this.handleTabManagerTabSwitched,
          onTabModified: this.handleTabManagerTabModified,
          onTabOrderChanged: this.handleTabManagerTabOrderChanged
        };

        this.tabManager = TabManager.getInstance(tabManagerOptions, tabManagerEvents);

        // Sync initial state
        this.syncTabManagerState();

        console.log('TabManager initialized successfully');
      } catch (error) {
        console.error('Failed to initialize TabManager:', error);
      }
    },

    async initializeFromProps() {
      // Open tabs for existing diagrams if any
      if (this.diagrams.length > 0) {
        for (const diagram of this.diagrams) {
          if (diagram.id === this.activeDiagramId) {
            await this.openDiagramTab(diagram.id);
          }
        }
      }
    },

    syncTabManagerState() {
      if (!this.tabManager) return;

      this.openTabs = this.tabManager.getOpenTabs();
      this.activeTabId = this.tabManager.getActiveTabId();
    },

    // Diagram Management
    async openDiagramTab(diagramId) {
      const diagram = this.diagrams.find(d => d.id === diagramId);
      if (!diagram) {
        console.warn(`Diagram with ID ${diagramId} not found`);
        return;
      }

      try {
        this.isLoading = true;

        // Open tab using TabManager
        const tab = this.tabManager.openTab(diagram);

        // Sync state
        this.syncTabManagerState();

        // Emit event
        this.$emit('tab-opened', {
          tabId: tab.id,
          diagramId: diagram.id
        });

        // Wait for next tick to ensure DOM is updated
        await this.$nextTick();

        // Initialize editor if needed
        await this.ensureEditorInitialized(tab.id);

      } catch (error) {
        console.error('Failed to open diagram tab:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async ensureEditorInitialized(tabId) {
      const editorRef = this.editorRefs.get(tabId);
      if (editorRef && editorRef.initCodeMirror) {
        try {
          await editorRef.initCodeMirror();
        } catch (error) {
          console.error(`Failed to initialize editor for tab ${tabId}:`, error);
        }
      }
    },

    // Tab Event Handlers
    handleTabClick(event) {
      const { tabId } = event;
      this.switchToTab(tabId);
    },

    handleTabClose(tabId) {
      this.closeTab(tabId);
    },

    handleTabCloseOthers(tabId) {
      if (this.tabManager) {
        this.tabManager.closeOtherTabs(tabId);
        this.syncTabManagerState();
      }
    },

    handleTabCloseAll() {
      if (this.tabManager) {
        this.tabManager.closeAllTabs();
        this.syncTabManagerState();
      }
    },

    handleTabTogglePin(tabId) {
      if (this.tabManager) {
        this.tabManager.toggleTabPin(tabId);
        this.syncTabManagerState();
      }
    },

    handleTabDuplicate(tabId) {
      const tab = this.tabManager?.getTab(tabId);
      if (tab) {
        // Find the original diagram
        const diagram = this.diagrams.find(d => d.id === tab.diagramId);
        if (diagram) {
          // Request creation of a duplicate diagram
          this.$emit('new-diagram-requested', {
            basedOn: diagram,
            name: `${diagram.name} (Copy)`
          });
        }
      }
    },

    handleTabReorder(event) {
      const { tabId, fromIndex, toIndex } = event;
      if (this.tabManager) {
        this.tabManager.reorderTab(tabId, toIndex);
        this.syncTabManagerState();
      }
    },

    handleNewTab() {
      this.$emit('new-diagram-requested', {
        name: 'New Diagram'
      });
    },

    handleCloseUnmodifiedTabs() {
      if (!this.tabManager) return;

      const tabsToClose = this.openTabs.filter(tab => !tab.isModified && !tab.isPinned);
      for (const tab of tabsToClose) {
        this.tabManager.closeTab(tab.id);
      }
      this.syncTabManagerState();
    },

    // Tab Management
    switchToTab(tabId) {
      if (this.tabManager) {
        this.tabManager.switchToTab(tabId);
        this.syncTabManagerState();

        this.$emit('tab-switched', {
          tabId,
          diagramId: this.getTabDiagramId(tabId)
        });

        // Refresh editor after switching
        this.$nextTick(() => {
          this.refreshActiveEditor();
        });
      }
    },

    closeTab(tabId) {
      if (this.tabManager) {
        const tab = this.tabManager.getTab(tabId);
        const diagramId = tab?.diagramId;

        if (this.tabManager.closeTab(tabId)) {
          // Clean up editor ref
          this.editorRefs.delete(tabId);

          // Sync state
          this.syncTabManagerState();

          // Emit event
          this.$emit('tab-closed', {
            tabId,
            diagramId
          });
        }
      }
    },

    // Content Change Handlers
    handleContentChanged(tabId, content) {
      if (this.tabManager) {
        // Update tab editor state
        this.tabManager.updateTabEditorState(tabId, { content });

        // Mark tab as modified
        this.tabManager.setTabModified(tabId, true);

        // Sync state
        this.syncTabManagerState();

        // Emit diagram content change
        const diagramId = this.getTabDiagramId(tabId);
        if (diagramId) {
          this.$emit('diagram-content-changed', {
            diagramId,
            content,
            tabId
          });
        }
      }
    },

    handleCursorChanged(tabId, cursorPosition) {
      if (this.tabManager) {
        this.tabManager.updateTabEditorState(tabId, { cursorPosition });

        const diagramId = this.getTabDiagramId(tabId);
        if (diagramId) {
          this.$emit('diagram-cursor-changed', {
            diagramId,
            cursorPosition,
            tabId
          });
        }
      }
    },

    handleScrollChanged(tabId, scrollPosition) {
      if (this.tabManager) {
        this.tabManager.updateTabEditorState(tabId, { scrollPosition });

        const diagramId = this.getTabDiagramId(tabId);
        if (diagramId) {
          this.$emit('diagram-scroll-changed', {
            diagramId,
            scrollPosition,
            tabId
          });
        }
      }
    },

    handleEditorReady(tabId, editorInstance) {
      console.log(`Editor ready for tab ${tabId}`);
      // Editor is ready, can perform additional setup if needed
    },

    // TabManager Event Handlers
    handleTabManagerTabCreated(tab) {
      console.log('Tab created:', tab.id);
    },

    handleTabManagerTabClosed(tabId) {
      console.log('Tab closed:', tabId);
    },

    handleTabManagerTabSwitched(tabId) {
      console.log('Tab switched:', tabId);
    },

    handleTabManagerTabModified(tabId, isModified) {
      console.log(`Tab ${tabId} modified:`, isModified);
    },

    handleTabManagerTabOrderChanged(tabOrder) {
      console.log('Tab order changed:', tabOrder);
    },

    // Diagram Changes Handler
    handleDiagramsChanged(newDiagrams, oldDiagrams) {
      // Handle diagram updates, additions, and removals
      const newIds = new Set(newDiagrams.map(d => d.id));
      const oldIds = new Set((oldDiagrams || []).map(d => d.id));

      // Close tabs for removed diagrams
      for (const oldId of oldIds) {
        if (!newIds.has(oldId)) {
          const tab = this.openTabs.find(t => t.diagramId === oldId);
          if (tab) {
            this.closeTab(tab.id);
          }
        }
      }

      // Update content for existing tabs
      for (const diagram of newDiagrams) {
        const tab = this.openTabs.find(t => t.diagramId === diagram.id);
        if (tab && tab.editorState.content !== diagram.content) {
          // Update tab content if it differs
          this.tabManager?.updateTabEditorState(tab.id, {
            content: diagram.content
          });

          // Update editor content
          const editorRef = this.editorRefs.get(tab.id);
          if (editorRef && editorRef.setContent) {
            editorRef.setContent(diagram.content);
          }
        }
      }

      this.syncTabManagerState();
    },

    // Helper Methods
    getTabDiagramId(tabId) {
      const tab = this.openTabs.find(t => t.id === tabId);
      return tab?.diagramId || null;
    },

    setEditorRef(tabId, el) {
      if (el) {
        this.editorRefs.set(tabId, el);
      } else {
        this.editorRefs.delete(tabId);
      }
    },

    refreshActiveEditor() {
      if (this.activeTabId) {
        const editorRef = this.editorRefs.get(this.activeTabId);
        if (editorRef && editorRef.recalculateEditorHeight) {
          editorRef.recalculateEditorHeight();
        }
      }
    },

    // Public API Methods
    openDiagram(diagram) {
      return this.openDiagramTab(diagram.id);
    },

    closeDiagram(diagramId) {
      const tab = this.openTabs.find(t => t.diagramId === diagramId);
      if (tab) {
        this.closeTab(tab.id);
      }
    },

    switchToDiagram(diagramId) {
      const tab = this.openTabs.find(t => t.diagramId === diagramId);
      if (tab) {
        this.switchToTab(tab.id);
      } else {
        // Open the diagram if not already open
        this.openDiagramTab(diagramId);
      }
    },

    getActiveEditor() {
      if (this.activeTabId) {
        return this.editorRefs.get(this.activeTabId);
      }
      return null;
    },

    getAllEditors() {
      return Array.from(this.editorRefs.values());
    },

    hasUnsavedChanges() {
      return this.tabManager?.hasUnsavedChanges() || false;
    },

    // Cleanup
    cleanup() {
      if (this.tabManager) {
        this.tabManager.cleanup();
      }

      this.editorRefs.clear();
    }
  }
});
</script>

<style scoped>
.tabbed-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #ffffff;
  position: relative;
}

.tab-content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #f8f9fa;
}

.empty-content {
  text-align: center;
  color: #6c757d;
  max-width: 300px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #495057;
}

.empty-content p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.editor-instances {
  height: 100%;
  width: 100%;
  position: relative;
}

.editor-instance {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.editor-instance.active {
  z-index: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-text {
  color: #6c757d;
  font-size: 0.875rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Dark theme */
.tabbed-editor.dark-theme {
  background-color: #1e1e1e;
}

.tabbed-editor.dark-theme .empty-state {
  background-color: #2d2d30;
}

.tabbed-editor.dark-theme .empty-content {
  color: #cccccc;
}

.tabbed-editor.dark-theme .empty-content h3 {
  color: #ffffff;
}

.tabbed-editor.dark-theme .loading-overlay {
  background-color: rgba(30, 30, 30, 0.8);
}

.tabbed-editor.dark-theme .loading-spinner {
  border-color: #3e3e42;
  border-top-color: #007acc;
}

.tabbed-editor.dark-theme .loading-text {
  color: #cccccc;
}

/* Responsive design */
@media (max-width: 768px) {
  .empty-icon {
    font-size: 2.5rem;
  }

  .empty-content h3 {
    font-size: 1.1rem;
  }

  .empty-content p {
    font-size: 0.8rem;
  }

  .loading-spinner {
    width: 28px;
    height: 28px;
    border-width: 2px;
  }

  .loading-text {
    font-size: 0.8rem;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .empty-state {
    border: 2px solid #000000;
  }

  .loading-overlay {
    border: 2px solid #000000;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
}

/* Print styles */
@media print {
  .loading-overlay {
    display: none;
  }
}
</style>