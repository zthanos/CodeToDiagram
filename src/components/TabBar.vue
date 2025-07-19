<template>
  <div class="tab-bar" :class="{ 'dark-theme': isDarkTheme }">
    <!-- Tab container with horizontal scrolling -->
    <div class="tab-container" ref="tabContainer">
      <div class="tab-list" ref="tabList">
        <EditorTab
          v-for="tab in tabs"
          :key="tab.id"
          :id="tab.id"
          :title="tab.title"
          :is-active="tab.isActive"
          :is-modified="tab.isModified"
          :is-pinned="tab.isPinned"
          :show-close-on-pinned="showCloseOnPinned"
          :draggable="enableTabReordering"
          @click="handleTabClick"
          @close="handleTabClose"
          @close-others="handleCloseOtherTabs"
          @close-all="handleCloseAllTabs"
          @toggle-pin="handleTogglePin"
          @duplicate="handleDuplicateTab"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drop="handleDrop"
          @context-menu="handleTabContextMenu"
        />
      </div>
    </div>
    
    <!-- Tab navigation buttons for overflow -->
    <div v-if="showScrollButtons" class="tab-navigation">
      <button 
        class="nav-btn nav-btn-left"
        :disabled="!canScrollLeft"
        @click="scrollLeft"
        title="Scroll tabs left"
      >
        ‹
      </button>
      <button 
        class="nav-btn nav-btn-right"
        :disabled="!canScrollRight"
        @click="scrollRight"
        title="Scroll tabs right"
      >
        ›
      </button>
    </div>
    
    <!-- Tab actions dropdown -->
    <div class="tab-actions">
      <button 
        class="tab-actions-btn"
        @click="toggleActionsMenu"
        :title="showActionsMenu ? 'Hide tab actions' : 'Show tab actions'"
      >
        ⋮
      </button>
      
      <!-- Actions dropdown menu -->
      <div v-if="showActionsMenu" class="actions-menu">
        <div class="actions-menu-item" @click="handleNewTab">
          <span class="menu-icon">+</span>
          <span>New Tab</span>
        </div>
        <div class="actions-menu-separator"></div>
        <div class="actions-menu-item" @click="handleCloseAllTabs">
          <span class="menu-icon">⊗</span>
          <span>Close All Tabs</span>
        </div>
        <div class="actions-menu-item" @click="handleCloseUnmodifiedTabs">
          <span class="menu-icon">⊗</span>
          <span>Close Unmodified Tabs</span>
        </div>
        <div class="actions-menu-separator"></div>
        <div class="actions-menu-item" @click="handleToggleTabReordering">
          <span class="menu-icon">↕</span>
          <span>{{ enableTabReordering ? 'Disable' : 'Enable' }} Tab Reordering</span>
        </div>
      </div>
    </div>
    
    <!-- Backdrop for actions menu -->
    <div 
      v-if="showActionsMenu" 
      class="actions-menu-backdrop"
      @click="hideActionsMenu"
    ></div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import EditorTab from './EditorTab.vue';

export default defineComponent({
  name: 'TabBar',
  components: {
    EditorTab
  },
  props: {
    tabs: {
      type: Array,
      required: true,
      default: () => []
    },
    activeTabId: {
      type: String,
      default: null
    },
    theme: {
      type: String,
      default: 'default'
    },
    showCloseOnPinned: {
      type: Boolean,
      default: false
    },
    maxVisibleTabs: {
      type: Number,
      default: 10
    }
  },
  emits: [
    'tab-click',
    'tab-close',
    'tab-close-others',
    'tab-close-all',
    'tab-toggle-pin',
    'tab-duplicate',
    'tab-reorder',
    'new-tab',
    'close-unmodified-tabs'
  ],
  data() {
    return {
      showScrollButtons: false,
      canScrollLeft: false,
      canScrollRight: false,
      showActionsMenu: false,
      enableTabReordering: true,
      draggedTabId: null,
      dropIndicatorPosition: null
    };
  },
  computed: {
    isDarkTheme() {
      return this.theme === 'dark';
    }
  },
  mounted() {
    // Initialize scroll detection
    this.updateScrollState();
    
    // Add resize listener to update scroll state
    window.addEventListener('resize', this.handleResize);
    
    // Add global click listener for actions menu
    document.addEventListener('click', this.handleGlobalClick);
    
    // Set up ResizeObserver for tab container
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateScrollState();
      });
      this.resizeObserver.observe(this.$refs.tabContainer);
    }
  },
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('click', this.handleGlobalClick);
    
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  watch: {
    tabs: {
      handler() {
        this.$nextTick(() => {
          this.updateScrollState();
          this.scrollToActiveTab();
        });
      },
      deep: true
    },
    activeTabId() {
      this.$nextTick(() => {
        this.scrollToActiveTab();
      });
    }
  },
  methods: {
    // Tab event handlers
    handleTabClick(event) {
      this.$emit('tab-click', event);
    },
    
    handleTabClose(tabId) {
      this.$emit('tab-close', tabId);
    },
    
    handleCloseOtherTabs(tabId) {
      this.$emit('tab-close-others', tabId);
    },
    
    handleCloseAllTabs() {
      this.hideActionsMenu();
      this.$emit('tab-close-all');
    },
    
    handleTogglePin(tabId) {
      this.$emit('tab-toggle-pin', tabId);
    },
    
    handleDuplicateTab(tabId) {
      this.$emit('tab-duplicate', tabId);
    },
    
    handleTabContextMenu(event) {
      // Context menu is handled by individual tabs
      console.log('Tab context menu:', event);
    },
    
    // Drag and drop handlers
    handleDragStart(event) {
      if (!this.enableTabReordering) return;
      
      this.draggedTabId = event.tabId;
      console.log('Drag started:', event.tabId);
    },
    
    handleDragOver(event) {
      if (!this.enableTabReordering || !this.draggedTabId) return;
      
      event.event.preventDefault();
      // Visual feedback could be added here
    },
    
    handleDrop(event) {
      if (!this.enableTabReordering) return;
      
      const { draggedTabId, targetTabId } = event;
      
      if (draggedTabId && targetTabId && draggedTabId !== targetTabId) {
        // Find indices
        const draggedIndex = this.tabs.findIndex(tab => tab.id === draggedTabId);
        const targetIndex = this.tabs.findIndex(tab => tab.id === targetTabId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          this.$emit('tab-reorder', {
            tabId: draggedTabId,
            fromIndex: draggedIndex,
            toIndex: targetIndex
          });
        }
      }
      
      this.draggedTabId = null;
    },
    
    // Scroll functionality
    updateScrollState() {
      const container = this.$refs.tabContainer;
      const list = this.$refs.tabList;
      
      if (!container || !list) return;
      
      const containerWidth = container.clientWidth;
      const listWidth = list.scrollWidth;
      
      this.showScrollButtons = listWidth > containerWidth;
      this.canScrollLeft = container.scrollLeft > 0;
      this.canScrollRight = container.scrollLeft < (listWidth - containerWidth);
    },
    
    scrollLeft() {
      const container = this.$refs.tabContainer;
      if (container) {
        container.scrollBy({ left: -120, behavior: 'smooth' });
        setTimeout(() => this.updateScrollState(), 300);
      }
    },
    
    scrollRight() {
      const container = this.$refs.tabContainer;
      if (container) {
        container.scrollBy({ left: 120, behavior: 'smooth' });
        setTimeout(() => this.updateScrollState(), 300);
      }
    },
    
    scrollToActiveTab() {
      const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
      if (!activeTab) return;
      
      const container = this.$refs.tabContainer;
      const tabElements = this.$refs.tabList?.children;
      
      if (!container || !tabElements) return;
      
      const activeIndex = this.tabs.findIndex(tab => tab.id === this.activeTabId);
      const activeElement = tabElements[activeIndex];
      
      if (activeElement) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeElement.getBoundingClientRect();
        
        // Check if tab is fully visible
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          // Scroll to make tab visible
          const scrollLeft = activeElement.offsetLeft - (container.clientWidth / 2) + (activeElement.clientWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
          
          setTimeout(() => this.updateScrollState(), 300);
        }
      }
    },
    
    // Actions menu
    toggleActionsMenu() {
      this.showActionsMenu = !this.showActionsMenu;
    },
    
    hideActionsMenu() {
      this.showActionsMenu = false;
    },
    
    handleNewTab() {
      this.hideActionsMenu();
      this.$emit('new-tab');
    },
    
    handleCloseUnmodifiedTabs() {
      this.hideActionsMenu();
      this.$emit('close-unmodified-tabs');
    },
    
    handleToggleTabReordering() {
      this.hideActionsMenu();
      this.enableTabReordering = !this.enableTabReordering;
    },
    
    // Event handlers
    handleResize() {
      this.updateScrollState();
    },
    
    handleGlobalClick(event) {
      // Hide actions menu when clicking outside
      if (this.showActionsMenu && !this.$el.contains(event.target)) {
        this.hideActionsMenu();
      }
    }
  }
});
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  border-bottom: 1px solid #ddd;
  height: 40px;
  min-height: 40px;
  position: relative;
  overflow: hidden;
}

.tab-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.tab-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.tab-list {
  display: flex;
  align-items: center;
  height: 100%;
  min-width: min-content;
  padding: 0 4px;
}

/* Tab navigation buttons */
.tab-navigation {
  display: flex;
  align-items: center;
  border-left: 1px solid #ddd;
  padding: 0 4px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.15s ease;
}

.nav-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
  color: #333;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn:active:not(:disabled) {
  transform: scale(0.9);
}

/* Tab actions */
.tab-actions {
  position: relative;
  border-left: 1px solid #ddd;
  padding: 0 4px;
}

.tab-actions-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.15s ease;
}

.tab-actions-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

.tab-actions-btn:active {
  transform: scale(0.9);
}

/* Actions menu */
.actions-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  padding: 4px 0;
  font-size: 13px;
  margin-top: 2px;
}

.actions-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.actions-menu-item:hover {
  background-color: #f0f0f0;
}

.menu-icon {
  width: 16px;
  margin-right: 8px;
  text-align: center;
  font-size: 12px;
}

.actions-menu-separator {
  height: 1px;
  background-color: #eee;
  margin: 4px 0;
}

.actions-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

/* Dark theme */
.tab-bar.dark-theme {
  background-color: #2d2d30;
  border-bottom-color: #3e3e42;
}

.tab-bar.dark-theme .tab-navigation {
  border-left-color: #3e3e42;
}

.tab-bar.dark-theme .tab-actions {
  border-left-color: #3e3e42;
}

.tab-bar.dark-theme .nav-btn,
.tab-bar.dark-theme .tab-actions-btn {
  color: #cccccc;
}

.tab-bar.dark-theme .nav-btn:hover:not(:disabled),
.tab-bar.dark-theme .tab-actions-btn:hover {
  background-color: #3e3e42;
  color: #ffffff;
}

.tab-bar.dark-theme .actions-menu {
  background: #2d2d30;
  border-color: #3e3e42;
  color: #cccccc;
}

.tab-bar.dark-theme .actions-menu-item:hover {
  background-color: #3e3e42;
}

.tab-bar.dark-theme .actions-menu-separator {
  background-color: #3e3e42;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .tab-bar {
    height: 36px;
    min-height: 36px;
  }
  
  .nav-btn,
  .tab-actions-btn {
    width: 20px;
    height: 20px;
    font-size: 14px;
  }
  
  .actions-menu {
    min-width: 180px;
    font-size: 12px;
  }
  
  .actions-menu-item {
    padding: 6px 10px;
  }
}

/* Accessibility */
.nav-btn:focus,
.tab-actions-btn:focus {
  outline: 2px solid #007acc;
  outline-offset: 1px;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .tab-bar {
    border-bottom-width: 2px;
  }
  
  .tab-navigation,
  .tab-actions {
    border-left-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .nav-btn,
  .tab-actions-btn,
  .actions-menu-item {
    transition: none;
  }
  
  .tab-container {
    scroll-behavior: auto !important;
  }
}

/* Scrollbar styling for browsers that support it */
.tab-container {
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
}

.tab-container::-webkit-scrollbar {
  height: 4px;
}

.tab-container::-webkit-scrollbar-track {
  background: transparent;
}

.tab-container::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 2px;
}

.tab-container::-webkit-scrollbar-thumb:hover {
  background-color: #999;
}
</style>