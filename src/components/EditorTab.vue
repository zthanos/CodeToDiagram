<template>
  <div 
    class="editor-tab"
    :class="{
      'active': isActive,
      'modified': isModified,
      'pinned': isPinned,
      'dragging': isDragging
    }"
    @click="handleTabClick"
    @contextmenu="handleContextMenu"
    @mousedown="handleMouseDown"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
    :draggable="true"
    :title="tabTooltip"
  >
    <!-- Pin indicator -->
    <div v-if="isPinned" class="tab-pin-indicator" title="Pinned tab">
      📌
    </div>
    
    <!-- Tab title with modification indicator -->
    <div class="tab-title">
      <span class="tab-name">{{ title }}</span>
      <span v-if="isModified" class="modification-indicator" title="Unsaved changes">●</span>
    </div>
    
    <!-- Close button -->
    <button 
      v-if="!isPinned || showCloseOnPinned"
      class="tab-close-btn"
      @click.stop="handleCloseClick"
      @mousedown.stop
      :title="isPinned ? 'Unpin and close tab' : 'Close tab'"
    >
      ×
    </button>
    
    <!-- Context menu -->
    <div 
      v-if="showContextMenu" 
      class="tab-context-menu"
      :style="contextMenuStyle"
      @click.stop
    >
      <div class="context-menu-item" @click="handleCloseTab">
        <span class="menu-icon">×</span>
        <span>Close Tab</span>
      </div>
      <div class="context-menu-item" @click="handleCloseOtherTabs">
        <span class="menu-icon">⊗</span>
        <span>Close Other Tabs</span>
      </div>
      <div class="context-menu-item" @click="handleCloseAllTabs">
        <span class="menu-icon">⊗⊗</span>
        <span>Close All Tabs</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="handleTogglePin">
        <span class="menu-icon">{{ isPinned ? '📌' : '📍' }}</span>
        <span>{{ isPinned ? 'Unpin Tab' : 'Pin Tab' }}</span>
      </div>
      <div class="context-menu-item" @click="handleDuplicateTab">
        <span class="menu-icon">📄</span>
        <span>Duplicate Tab</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="handleCopyTabName">
        <span class="menu-icon">📋</span>
        <span>Copy Tab Name</span>
      </div>
    </div>
    
    <!-- Overlay for context menu backdrop -->
    <div 
      v-if="showContextMenu" 
      class="context-menu-backdrop"
      @click="hideContextMenu"
    ></div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'EditorTab',
  props: {
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isModified: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    showCloseOnPinned: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'click',
    'close',
    'close-others',
    'close-all',
    'toggle-pin',
    'duplicate',
    'drag-start',
    'drag-over',
    'drop',
    'context-menu'
  ],
  data() {
    return {
      showContextMenu: false,
      contextMenuPosition: { x: 0, y: 0 },
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0
    };
  },
  computed: {
    tabTooltip() {
      let tooltip = this.title;
      if (this.isModified) {
        tooltip += ' (unsaved changes)';
      }
      if (this.isPinned) {
        tooltip += ' - Pinned';
      }
      return tooltip;
    },
    contextMenuStyle() {
      return {
        left: `${this.contextMenuPosition.x}px`,
        top: `${this.contextMenuPosition.y}px`
      };
    }
  },
  mounted() {
    // Add global click listener to hide context menu
    document.addEventListener('click', this.handleGlobalClick);
    document.addEventListener('contextmenu', this.handleGlobalContextMenu);
  },
  beforeUnmount() {
    // Clean up global event listeners
    document.removeEventListener('click', this.handleGlobalClick);
    document.removeEventListener('contextmenu', this.handleGlobalContextMenu);
  },
  methods: {
    handleTabClick(event) {
      // Handle tab selection
      if (!this.showContextMenu) {
        this.$emit('click', {
          tabId: this.id,
          event
        });
      }
    },
    
    handleCloseClick(event) {
      // Handle close button click
      event.stopPropagation();
      
      // If tab is pinned and we're not showing close on pinned, unpin first
      if (this.isPinned && !this.showCloseOnPinned) {
        this.$emit('toggle-pin', this.id);
        return;
      }
      
      // Check for unsaved changes
      if (this.isModified) {
        const shouldClose = this.confirmUnsavedChanges();
        if (!shouldClose) {
          return;
        }
      }
      
      this.$emit('close', this.id);
    },
    
    handleContextMenu(event) {
      // Handle right-click context menu
      event.preventDefault();
      event.stopPropagation();
      
      // Calculate menu position
      const rect = this.$el.getBoundingClientRect();
      const menuWidth = 200; // Approximate menu width
      const menuHeight = 250; // Approximate menu height
      
      let x = event.clientX;
      let y = event.clientY;
      
      // Adjust position if menu would go off-screen
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }
      
      this.contextMenuPosition = { x, y };
      this.showContextMenu = true;
      
      this.$emit('context-menu', {
        tabId: this.id,
        position: { x, y },
        event
      });
    },
    
    handleMouseDown(event) {
      // Handle mouse down for potential drag operation
      if (this.draggable && event.button === 0) { // Left mouse button
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
      }
    },
    
    handleDragStart(event) {
      // Handle drag start
      if (!this.draggable) {
        event.preventDefault();
        return;
      }
      
      this.isDragging = true;
      
      // Set drag data
      event.dataTransfer.setData('text/plain', this.id);
      event.dataTransfer.effectAllowed = 'move';
      
      // Create drag image
      const dragImage = this.$el.cloneNode(true);
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(5deg)';
      document.body.appendChild(dragImage);
      event.dataTransfer.setDragImage(dragImage, 50, 20);
      
      // Clean up drag image after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 0);
      
      this.$emit('drag-start', {
        tabId: this.id,
        event
      });
    },
    
    handleDragOver(event) {
      // Handle drag over for drop zone
      if (this.draggable) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        this.$emit('drag-over', {
          tabId: this.id,
          event
        });
      }
    },
    
    handleDrop(event) {
      // Handle drop
      if (this.draggable) {
        event.preventDefault();
        
        const draggedTabId = event.dataTransfer.getData('text/plain');
        if (draggedTabId && draggedTabId !== this.id) {
          this.$emit('drop', {
            draggedTabId,
            targetTabId: this.id,
            event
          });
        }
      }
      
      this.isDragging = false;
    },
    
    // Context menu actions
    handleCloseTab() {
      this.hideContextMenu();
      
      if (this.isModified) {
        const shouldClose = this.confirmUnsavedChanges();
        if (!shouldClose) {
          return;
        }
      }
      
      this.$emit('close', this.id);
    },
    
    handleCloseOtherTabs() {
      this.hideContextMenu();
      this.$emit('close-others', this.id);
    },
    
    handleCloseAllTabs() {
      this.hideContextMenu();
      this.$emit('close-all');
    },
    
    handleTogglePin() {
      this.hideContextMenu();
      this.$emit('toggle-pin', this.id);
    },
    
    handleDuplicateTab() {
      this.hideContextMenu();
      this.$emit('duplicate', this.id);
    },
    
    handleCopyTabName() {
      this.hideContextMenu();
      
      // Copy tab name to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.title).then(() => {
          // Could emit a notification event here
          console.log('Tab name copied to clipboard');
        }).catch(err => {
          console.error('Failed to copy tab name:', err);
          this.fallbackCopyToClipboard(this.title);
        });
      } else {
        this.fallbackCopyToClipboard(this.title);
      }
    },
    
    // Helper methods
    hideContextMenu() {
      this.showContextMenu = false;
    },
    
    handleGlobalClick(event) {
      // Hide context menu when clicking outside
      if (this.showContextMenu && !this.$el.contains(event.target)) {
        this.hideContextMenu();
      }
    },
    
    handleGlobalContextMenu(event) {
      // Hide context menu when right-clicking outside
      if (this.showContextMenu && !this.$el.contains(event.target)) {
        this.hideContextMenu();
      }
    },
    
    confirmUnsavedChanges() {
      // Show confirmation dialog for unsaved changes
      return confirm(`The tab "${this.title}" has unsaved changes. Do you want to close it anyway?`);
    },
    
    fallbackCopyToClipboard(text) {
      // Fallback method for copying to clipboard
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('Tab name copied to clipboard (fallback method)');
      } catch (err) {
        console.error('Failed to copy tab name (fallback):', err);
      }
    }
  }
});
</script>

<style scoped>
.editor-tab {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-width: 120px;
  max-width: 200px;
  height: 36px;
  margin-right: 2px;
}

.editor-tab:hover {
  background-color: #e8e8e8;
  border-color: #ccc;
}

.editor-tab.active {
  background-color: #fff;
  border-color: #007acc;
  border-bottom: 1px solid #fff;
  z-index: 1;
}

.editor-tab.modified {
  font-style: italic;
}

.editor-tab.pinned {
  background-color: #f0f8ff;
  border-color: #87ceeb;
}

.editor-tab.pinned.active {
  background-color: #fff;
  border-color: #007acc;
}

.editor-tab.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.tab-pin-indicator {
  font-size: 10px;
  margin-right: 4px;
  opacity: 0.7;
}

.tab-title {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.tab-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.2;
}

.modification-indicator {
  color: #ff6b35;
  font-weight: bold;
  margin-left: 4px;
  font-size: 12px;
  line-height: 1;
}

.tab-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 6px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #666;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.tab-close-btn:hover {
  background-color: #ff4444;
  color: white;
}

.tab-close-btn:active {
  transform: scale(0.9);
}

/* Context Menu Styles */
.tab-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
  font-size: 13px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.context-menu-item:hover {
  background-color: #f0f0f0;
}

.menu-icon {
  width: 16px;
  margin-right: 8px;
  text-align: center;
  font-size: 12px;
}

.context-menu-separator {
  height: 1px;
  background-color: #eee;
  margin: 4px 0;
}

.context-menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

/* Dark theme support */
.editor-tab.dark-theme {
  background-color: #2d2d30;
  border-color: #3e3e42;
  color: #cccccc;
}

.editor-tab.dark-theme:hover {
  background-color: #3e3e42;
  border-color: #007acc;
}

.editor-tab.dark-theme.active {
  background-color: #1e1e1e;
  border-color: #007acc;
  border-bottom: 1px solid #1e1e1e;
}

.editor-tab.dark-theme.pinned {
  background-color: #2a2d3a;
  border-color: #4a90e2;
}

.editor-tab.dark-theme .tab-close-btn {
  color: #cccccc;
}

.editor-tab.dark-theme .tab-close-btn:hover {
  background-color: #ff4444;
  color: white;
}

.editor-tab.dark-theme .tab-context-menu {
  background: #2d2d30;
  border-color: #3e3e42;
  color: #cccccc;
}

.editor-tab.dark-theme .context-menu-item:hover {
  background-color: #3e3e42;
}

.editor-tab.dark-theme .context-menu-separator {
  background-color: #3e3e42;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .editor-tab {
    min-width: 100px;
    max-width: 150px;
    padding: 6px 8px;
    height: 32px;
  }
  
  .tab-name {
    font-size: 12px;
  }
  
  .tab-close-btn {
    width: 16px;
    height: 16px;
    font-size: 12px;
  }
  
  .tab-context-menu {
    min-width: 160px;
    font-size: 12px;
  }
  
  .context-menu-item {
    padding: 6px 10px;
  }
}

/* Animation for tab transitions */
.editor-tab {
  animation: tabSlideIn 0.2s ease-out;
}

@keyframes tabSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Focus styles for accessibility */
.editor-tab:focus {
  outline: 2px solid #007acc;
  outline-offset: -2px;
}

.tab-close-btn:focus {
  outline: 1px solid #007acc;
  outline-offset: 1px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .editor-tab {
    border-width: 2px;
  }
  
  .editor-tab.active {
    border-width: 3px;
  }
  
  .modification-indicator {
    font-weight: 900;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .editor-tab,
  .tab-close-btn,
  .context-menu-item {
    transition: none;
  }
  
  .editor-tab {
    animation: none;
  }
}
</style>