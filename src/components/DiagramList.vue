<template>
  <div class="diagram-list">
    <!-- Search and Filter Bar -->
    <div class="list-header" v-if="showSearch || showSort">
      <div class="search-container" v-if="showSearch">
        <input 
          type="text"
          v-model="searchQuery"
          placeholder="Search diagrams..."
          class="search-input"
          :aria-label="'Search diagrams'"
          @keyup.escape="clearSearch"
        >
        <button 
          v-if="searchQuery"
          class="search-clear"
          @click="clearSearch"
          aria-label="Clear search"
          title="Clear search"
        >
          ×
        </button>
      </div>
      
      <div class="sort-container" v-if="showSort">
        <select 
          v-model="sortBy"
          class="sort-select"
          aria-label="Sort diagrams by"
        >
          <option value="name">Name</option>
          <option value="modified">Last Modified</option>
          <option value="created">Created</option>
          <option value="type">Type</option>
        </select>
      </div>
    </div>

    <!-- Diagram Items -->
    <div class="diagram-items" ref="diagramItems">
      <!-- Empty State -->
      <div v-if="filteredDiagrams.length === 0" class="empty-state">
        <div v-if="diagrams.length === 0" class="no-diagrams">
          <div class="empty-icon">📊</div>
          <p class="empty-title">No diagrams yet</p>
          <p class="empty-subtitle">Create or add diagrams to get started</p>
        </div>
        <div v-else class="no-results">
          <div class="empty-icon">🔍</div>
          <p class="empty-title">No matching diagrams</p>
          <p class="empty-subtitle">Try adjusting your search</p>
          <button class="clear-search-btn" @click="clearSearch">Clear Search</button>
        </div>
      </div>

      <!-- Diagram List Items -->
      <div 
        v-for="diagram in filteredDiagrams" 
        :key="diagram.id"
        class="diagram-item"
        :class="{ 
          'active': selectedDiagramId === diagram.id,
          'modified': diagram.isModified 
        }"
        @click="selectDiagram(diagram)"
        @dblclick="openDiagram(diagram)"
        @contextmenu.prevent="showContextMenu(diagram, $event)"
        :title="getDiagramTooltip(diagram)"
        :aria-selected="selectedDiagramId === diagram.id"
        role="option"
        tabindex="0"
        @keydown="handleDiagramKeydown(diagram, $event)"
      >
        <!-- Diagram Icon -->
        <div class="diagram-icon">
          {{ getDiagramIcon(diagram.type) }}
        </div>

        <!-- Diagram Info -->
        <div class="diagram-info">
          <div class="diagram-name">
            {{ diagram.name }}
          </div>
          <div class="diagram-meta">
            <span class="diagram-type">{{ getDiagramTypeLabel(diagram.type) }}</span>
            <span class="diagram-modified">{{ formatDate(diagram.lastModified) }}</span>
          </div>
        </div>

        <!-- Diagram Status -->
        <div class="diagram-status">
          <span v-if="diagram.isModified" class="modified-indicator" title="Has unsaved changes">●</span>
          <span v-if="isOpenInTab(diagram.id)" class="open-indicator" title="Open in tab">📄</span>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div 
      v-if="contextMenu.visible"
      class="context-menu"
      :style="contextMenuStyle"
      ref="contextMenu"
      @click.stop
    >
      <button class="context-item" @click="openDiagram(contextMenu.diagram)">
        <span class="context-icon">📂</span>
        Open
      </button>
      <button class="context-item" @click="openInNewTab(contextMenu.diagram)">
        <span class="context-icon">🗂️</span>
        Open in New Tab
      </button>
      <hr class="context-divider">
      <button class="context-item" @click="renameDiagram(contextMenu.diagram)">
        <span class="context-icon">✏️</span>
        Rename
      </button>
      <button class="context-item" @click="duplicateDiagram(contextMenu.diagram)">
        <span class="context-icon">📋</span>
        Duplicate
      </button>
      <button class="context-item" @click="exportDiagram(contextMenu.diagram)">
        <span class="context-icon">📤</span>
        Export
      </button>
      <hr class="context-divider">
      <button class="context-item danger" @click="deleteDiagram(contextMenu.diagram)">
        <span class="context-icon">🗑️</span>
        Delete
      </button>
    </div>

    <!-- Rename Dialog -->
    <div v-if="renameDialog.visible" class="dialog-overlay" @click="handleRenameOverlayClick">
      <div class="dialog rename-dialog" @click.stop>
        <div class="dialog-header">
          <h3>Rename Diagram</h3>
          <button class="dialog-close" @click="closeRenameDialog" aria-label="Close dialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="diagram-name-input">Diagram Name</label>
            <input 
              id="diagram-name-input"
              type="text" 
              v-model="renameDialog.newName"
              @keyup.enter="confirmRename"
              @keyup.escape="closeRenameDialog"
              placeholder="Enter diagram name"
              maxlength="100"
              ref="renameInput"
              :class="{ 'error': renameDialog.error }"
            >
            <div v-if="renameDialog.error" class="error-message">{{ renameDialog.error }}</div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeRenameDialog">Cancel</button>
          <button 
            class="btn btn-primary" 
            @click="confirmRename"
            :disabled="!isRenameValid || renameDialog.isRenaming"
          >
            <span v-if="renameDialog.isRenaming" class="btn-spinner"></span>
            {{ renameDialog.isRenaming ? 'Renaming...' : 'Rename' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DiagramList',
  props: {
    diagrams: {
      type: Array,
      default: () => []
    },
    selectedDiagramId: {
      type: String,
      default: null
    },
    openTabIds: {
      type: Array,
      default: () => []
    },
    showSearch: {
      type: Boolean,
      default: true
    },
    showSort: {
      type: Boolean,
      default: true
    },
    enableContextMenu: {
      type: Boolean,
      default: true
    },
    enableKeyboardNavigation: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'diagram-selected',
    'diagram-opened',
    'diagram-renamed',
    'diagram-duplicated',
    'diagram-deleted',
    'diagram-exported'
  ],
  data() {
    return {
      // Search and filter state
      searchQuery: '',
      sortBy: 'name',
      
      // Context menu state
      contextMenu: {
        visible: false,
        diagram: null,
        x: 0,
        y: 0
      },
      
      // Rename dialog state
      renameDialog: {
        visible: false,
        diagram: null,
        newName: '',
        error: '',
        isRenaming: false
      },
      
      // Component state
      clickOutsideHandler: null,
      keyboardHandler: null
    }
  },
  computed: {
    filteredDiagrams() {
      let filtered = [...this.diagrams]
      
      // Apply search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim()
        filtered = filtered.filter(diagram => 
          diagram.name.toLowerCase().includes(query) ||
          (diagram.type && diagram.type.toLowerCase().includes(query)) ||
          (diagram.description && diagram.description.toLowerCase().includes(query))
        )
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        switch (this.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'modified':
            return new Date(b.lastModified) - new Date(a.lastModified)
          case 'created':
            return new Date(b.createdAt || b.lastModified) - new Date(a.createdAt || a.lastModified)
          case 'type':
            return (a.type || '').localeCompare(b.type || '')
          default:
            return 0
        }
      })
      
      return filtered
    },
    
    contextMenuStyle() {
      return {
        left: `${this.contextMenu.x}px`,
        top: `${this.contextMenu.y}px`
      }
    },
    
    isRenameValid() {
      const name = this.renameDialog.newName.trim()
      return name.length > 0 && !this.renameDialog.error
    }
  },
  watch: {
    'renameDialog.newName'(newValue) {
      this.validateDiagramName(newValue)
    },
    
    'contextMenu.visible'(isVisible) {
      if (isVisible) {
        this.setupClickOutsideHandler()
      } else {
        this.removeClickOutsideHandler()
      }
    }
  },
  mounted() {
    if (this.enableKeyboardNavigation) {
      this.setupKeyboardNavigation()
    }
  },
  
  beforeUnmount() {
    this.removeClickOutsideHandler()
    this.removeKeyboardNavigation()
  },
  
  methods: {
    // Diagram selection and opening
    selectDiagram(diagram) {
      this.$emit('diagram-selected', diagram)
    },
    
    openDiagram(diagram) {
      this.$emit('diagram-opened', diagram)
    },
    
    openInNewTab(diagram) {
      this.$emit('diagram-opened', diagram, { newTab: true })
      this.hideContextMenu()
    },
    
    // Search functionality
    clearSearch() {
      this.searchQuery = ''
    },
    
    // Context menu functionality
    showContextMenu(diagram, event) {
      if (!this.enableContextMenu) return
      
      this.contextMenu.diagram = diagram
      this.contextMenu.x = event.clientX
      this.contextMenu.y = event.clientY
      this.contextMenu.visible = true
      
      // Adjust position if menu would go off screen
      this.$nextTick(() => {
        const menu = this.$refs.contextMenu
        if (menu) {
          const rect = menu.getBoundingClientRect()
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          
          if (rect.right > viewportWidth) {
            this.contextMenu.x = viewportWidth - rect.width - 10
          }
          
          if (rect.bottom > viewportHeight) {
            this.contextMenu.y = viewportHeight - rect.height - 10
          }
        }
      })
    },
    
    hideContextMenu() {
      this.contextMenu.visible = false
      this.contextMenu.diagram = null
    },
    
    // Diagram actions
    renameDiagram(diagram) {
      this.renameDialog.diagram = diagram
      this.renameDialog.newName = diagram.name
      this.renameDialog.error = ''
      this.renameDialog.visible = true
      this.hideContextMenu()
      
      this.$nextTick(() => {
        if (this.$refs.renameInput) {
          this.$refs.renameInput.focus()
          this.$refs.renameInput.select()
        }
      })
    },
    
    closeRenameDialog() {
      this.renameDialog.visible = false
      this.renameDialog.diagram = null
      this.renameDialog.newName = ''
      this.renameDialog.error = ''
      this.renameDialog.isRenaming = false
    },
    
    async confirmRename() {
      if (!this.isRenameValid || this.renameDialog.isRenaming) {
        return
      }
      
      try {
        this.renameDialog.isRenaming = true
        
        const newName = this.renameDialog.newName.trim()
        const diagram = this.renameDialog.diagram
        
        this.$emit('diagram-renamed', diagram, newName)
        this.closeRenameDialog()
        
      } catch (error) {
        console.error('Error renaming diagram:', error)
        this.renameDialog.error = 'Failed to rename diagram. Please try again.'
      } finally {
        this.renameDialog.isRenaming = false
      }
    },
    
    validateDiagramName(name) {
      this.renameDialog.error = ''
      
      if (!name || name.trim().length === 0) {
        this.renameDialog.error = 'Diagram name is required'
        return
      }
      
      if (name.trim().length < 2) {
        this.renameDialog.error = 'Diagram name must be at least 2 characters'
        return
      }
      
      if (name.length > 100) {
        this.renameDialog.error = 'Diagram name must be less than 100 characters'
        return
      }
      
      // Check for duplicate names
      const trimmedName = name.trim()
      const existingDiagram = this.diagrams.find(d => 
        d.id !== this.renameDialog.diagram?.id && 
        d.name.toLowerCase() === trimmedName.toLowerCase()
      )
      
      if (existingDiagram) {
        this.renameDialog.error = 'A diagram with this name already exists'
        return
      }
      
      // Check for invalid characters
      const invalidChars = /[<>:"/\\|?*]/
      if (invalidChars.test(name)) {
        this.renameDialog.error = 'Diagram name contains invalid characters'
        return
      }
    },
    
    duplicateDiagram(diagram) {
      this.$emit('diagram-duplicated', diagram)
      this.hideContextMenu()
    },
    
    exportDiagram(diagram) {
      this.$emit('diagram-exported', diagram)
      this.hideContextMenu()
    },
    
    deleteDiagram(diagram) {
      const confirmed = confirm(
        `Are you sure you want to delete "${diagram.name}"? This action cannot be undone.`
      )
      
      if (confirmed) {
        this.$emit('diagram-deleted', diagram)
      }
      
      this.hideContextMenu()
    },
    
    // Utility methods
    getDiagramIcon(type) {
      const icons = {
        flowchart: '📊',
        sequence: '🔄',
        class: '🏗️',
        state: '🔀',
        er: '🗃️',
        gantt: '📅',
        pie: '🥧',
        journey: '🗺️',
        gitgraph: '🌳',
        mindmap: '🧠',
        timeline: '⏰',
        default: '📋'
      }
      
      return icons[type] || icons.default
    },
    
    getDiagramTypeLabel(type) {
      const labels = {
        flowchart: 'Flowchart',
        sequence: 'Sequence',
        class: 'Class',
        state: 'State',
        er: 'ER Diagram',
        gantt: 'Gantt',
        pie: 'Pie Chart',
        journey: 'Journey',
        gitgraph: 'Git Graph',
        mindmap: 'Mind Map',
        timeline: 'Timeline'
      }
      
      return labels[type] || 'Diagram'
    },
    
    getDiagramTooltip(diagram) {
      const parts = [
        `Name: ${diagram.name}`,
        `Type: ${this.getDiagramTypeLabel(diagram.type)}`,
        `Modified: ${this.formatDate(diagram.lastModified)}`
      ]
      
      if (diagram.isModified) {
        parts.push('Status: Modified')
      }
      
      if (this.isOpenInTab(diagram.id)) {
        parts.push('Status: Open in tab')
      }
      
      return parts.join('\n')
    },
    
    formatDate(date) {
      if (!date) return 'Unknown'
      
      const now = new Date()
      const diagramDate = new Date(date)
      const diffMs = now - diagramDate
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return diagramDate.toLocaleDateString()
    },
    
    isOpenInTab(diagramId) {
      return this.openTabIds.includes(diagramId)
    },
    
    // Event handlers
    handleRenameOverlayClick(event) {
      if (event.target === event.currentTarget) {
        this.closeRenameDialog()
      }
    },
    
    handleDiagramKeydown(diagram, event) {
      if (!this.enableKeyboardNavigation) return
      
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault()
          this.openDiagram(diagram)
          break
        case 'F2':
          event.preventDefault()
          this.renameDiagram(diagram)
          break
        case 'Delete':
          event.preventDefault()
          this.deleteDiagram(diagram)
          break
        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault()
          this.navigateWithArrows(diagram, event.key === 'ArrowUp' ? -1 : 1)
          break
      }
    },
    
    navigateWithArrows(currentDiagram, direction) {
      const currentIndex = this.filteredDiagrams.findIndex(d => d.id === currentDiagram.id)
      const newIndex = currentIndex + direction
      
      if (newIndex >= 0 && newIndex < this.filteredDiagrams.length) {
        const newDiagram = this.filteredDiagrams[newIndex]
        this.selectDiagram(newDiagram)
        
        // Focus the new item
        this.$nextTick(() => {
          const items = this.$refs.diagramItems.querySelectorAll('.diagram-item')
          if (items[newIndex]) {
            items[newIndex].focus()
          }
        })
      }
    },
    
    // Click outside handler
    setupClickOutsideHandler() {
      this.clickOutsideHandler = (event) => {
        const contextMenu = this.$refs.contextMenu
        if (contextMenu && !contextMenu.contains(event.target)) {
          this.hideContextMenu()
        }
      }
      
      document.addEventListener('click', this.clickOutsideHandler)
    },
    
    removeClickOutsideHandler() {
      if (this.clickOutsideHandler) {
        document.removeEventListener('click', this.clickOutsideHandler)
        this.clickOutsideHandler = null
      }
    },
    
    // Keyboard navigation
    setupKeyboardNavigation() {
      this.keyboardHandler = (event) => {
        // Only handle if focus is within the diagram list
        if (!this.$el.contains(event.target)) return
        
        // Ctrl/Cmd + F to focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault()
          const searchInput = this.$el.querySelector('.search-input')
          if (searchInput) {
            searchInput.focus()
          }
        }
      }
      
      document.addEventListener('keydown', this.keyboardHandler)
    },
    
    removeKeyboardNavigation() {
      if (this.keyboardHandler) {
        document.removeEventListener('keydown', this.keyboardHandler)
        this.keyboardHandler = null
      }
    }
  }
})
</script>

<style scoped>
.diagram-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* List Header */
.list-header {
  padding: 0.75rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #f8f9fa;
  flex-shrink: 0;
}

.search-container {
  position: relative;
  margin-bottom: 0.5rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  padding-right: 2rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: #fff;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #656d76;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background-color: #f3f4f6;
  color: #24292f;
}

.sort-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: #fff;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Diagram Items */
.diagram-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem 1rem;
  text-align: center;
  color: #656d76;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #24292f;
}

.empty-subtitle {
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
}

.clear-search-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

/* Diagram Item */
.diagram-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  position: relative;
}

.diagram-item:hover {
  background-color: #f3f4f6;
  border-color: #e1e4e8;
}

.diagram-item.active {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

.diagram-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.diagram-item.modified {
  border-left: 3px solid #f59e0b;
}

.diagram-icon {
  margin-right: 0.75rem;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.diagram-info {
  flex: 1;
  min-width: 0;
}

.diagram-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #24292f;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diagram-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #656d76;
}

.diagram-type {
  background-color: #e1e4e8;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-weight: 500;
}

.diagram-modified {
  flex-shrink: 0;
}

.diagram-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.modified-indicator {
  color: #f59e0b;
  font-weight: bold;
  font-size: 1rem;
}

.open-indicator {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background-color: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 0.5rem 0;
  min-width: 160px;
}

.context-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;
  transition: background-color 0.2s ease;
}

.context-item:hover {
  background-color: #f6f8fa;
}

.context-item.danger {
  color: #dc2626;
}

.context-item.danger:hover {
  background-color: #fef2f2;
}

.context-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.context-divider {
  border: none;
  border-top: 1px solid #e1e4e8;
  margin: 0.5rem 0;
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.dialog {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #24292f;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #656d76;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: #f3f4f6;
  color: #24292f;
}

.dialog-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #24292f;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.error {
  border-color: #dc2626;
}

.error-message {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #dc2626;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f6f8fa;
  border: 1px solid #d1d9e0;
  color: #24292f;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.btn-primary {
  background-color: #2563eb;
  border: 1px solid #2563eb;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
  border-color: #1d4ed8;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */

/* Mobile (max 767px) */
@media (max-width: 767px) {
  .list-header {
    padding: 0.5rem;
  }
  
  .diagram-item {
    padding: 0.5rem;
  }
  
  .diagram-name {
    font-size: 0.8rem;
  }
  
  .diagram-meta {
    font-size: 0.7rem;
  }
  
  .diagram-type {
    padding: 0.1rem 0.3rem;
  }
  
  .context-menu {
    min-width: 140px;
  }
  
  .context-item {
    padding: 0.6rem 0.75rem;
  }
  
  .dialog {
    margin: 1rem;
    max-width: calc(100vw - 2rem);
  }
  
  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Small mobile (max 480px) */
@media (max-width: 480px) {
  .empty-icon {
    font-size: 2.5rem;
  }
  
  .empty-title {
    font-size: 1rem;
  }
  
  .empty-subtitle {
    font-size: 0.8rem;
  }
  
  .diagram-icon {
    font-size: 1.1rem;
    margin-right: 0.5rem;
  }
  
  .diagram-status {
    margin-left: 0.25rem;
  }
  
  .dialog-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .list-header {
    background-color: #1f2937;
    border-bottom-color: #374151;
  }
  
  .search-input,
  .sort-select {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .search-input:focus,
  .sort-select:focus {
    border-color: #3b82f6;
  }
  
  .search-clear {
    color: #9ca3af;
  }
  
  .search-clear:hover {
    background-color: #4b5563;
    color: #f9fafb;
  }
  
  .empty-title {
    color: #f9fafb;
  }
  
  .empty-state {
    color: #9ca3af;
  }
  
  .clear-search-btn {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .clear-search-btn:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }
  
  .diagram-item:hover {
    background-color: #374151;
    border-color: #4b5563;
  }
  
  .diagram-item.active {
    background-color: #1e40af;
    border-color: #3b82f6;
  }
  
  .diagram-name {
    color: #f9fafb;
  }
  
  .diagram-meta {
    color: #9ca3af;
  }
  
  .diagram-type {
    background-color: #4b5563;
    color: #f9fafb;
  }
  
  .context-menu {
    background-color: #1f2937;
    border-color: #374151;
  }
  
  .context-item {
    color: #f9fafb;
  }
  
  .context-item:hover {
    background-color: #374151;
  }
  
  .context-divider {
    border-top-color: #374151;
  }
  
  .dialog {
    background-color: #1f2937;
  }
  
  .dialog-header h3 {
    color: #f9fafb;
  }
  
  .dialog-close {
    color: #9ca3af;
  }
  
  .dialog-close:hover {
    background-color: #374151;
    color: #f9fafb;
  }
  
  .form-group label {
    color: #f9fafb;
  }
  
  .form-group input {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .form-group input:focus {
    border-color: #3b82f6;
  }
  
  .btn-secondary {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #4b5563;
    border-color: #6b7280;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .diagram-item,
  .context-item,
  .search-clear,
  .clear-search-btn,
  .dialog-close,
  .btn,
  .btn-spinner {
    transition: none;
    animation: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .list-header {
    border-bottom-color: #000;
  }
  
  .search-input,
  .sort-select,
  .diagram-item,
  .context-menu,
  .dialog {
    border-color: #000;
  }
  
  .form-group input {
    border-color: #000;
  }
}

/* Scrollbar styling */
.diagram-items::-webkit-scrollbar {
  width: 6px;
}

.diagram-items::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.diagram-items::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.diagram-items::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Focus visible for better keyboard navigation */
.diagram-item:focus-visible,
.search-input:focus-visible,
.sort-select:focus-visible,
.context-item:focus-visible,
.clear-search-btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>