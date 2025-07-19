<template>
  <div class="project-toolbar">
    <!-- Project Name Display -->
    <div class="project-info">
      <div class="project-name" :title="projectName || 'No project selected'">
        <span class="project-icon">📁</span>
        <span class="project-title">{{ displayProjectName }}</span>
        <span v-if="isProjectModified" class="modified-indicator" title="Project has unsaved changes">●</span>
      </div>
      <div v-if="projectDescription" class="project-description" :title="projectDescription">
        {{ truncatedDescription }}
      </div>
    </div>

    <!-- Project Actions -->
    <div class="project-actions">
      <!-- Create Project Button -->
      <button 
        class="toolbar-btn create-project-btn"
        @click="handleCreateProject"
        :disabled="isLoading"
        title="Create a new project"
        aria-label="Create new project"
      >
        <span class="btn-icon">📁</span>
        <span class="btn-text">New Project</span>
      </button>

      <!-- Add Diagram Button -->
      <button 
        class="toolbar-btn add-diagram-btn"
        @click="handleAddDiagram"
        :disabled="!hasActiveProject || isLoading"
        title="Add existing diagram file to project"
        aria-label="Add existing diagram"
      >
        <span class="btn-icon">📄</span>
        <span class="btn-text">Add Diagram</span>
      </button>

      <!-- Create Diagram Button -->
      <button 
        class="toolbar-btn create-diagram-btn"
        @click="handleCreateDiagram"
        :disabled="!hasActiveProject || isLoading"
        title="Create a new diagram in project"
        aria-label="Create new diagram"
      >
        <span class="btn-icon">➕</span>
        <span class="btn-text">New Diagram</span>
      </button>

      <!-- More Actions Dropdown (for future expansion) -->
      <div class="more-actions-dropdown" v-if="showMoreActions">
        <button 
          class="toolbar-btn more-actions-btn"
          @click="toggleMoreActions"
          :aria-expanded="moreActionsOpen"
          aria-label="More project actions"
          title="More project actions"
        >
          <span class="btn-icon">⋯</span>
        </button>
        
        <div class="dropdown-menu" v-show="moreActionsOpen" ref="dropdownMenu">
          <button class="dropdown-item" @click="handleProjectSettings">
            <span class="dropdown-icon">⚙️</span>
            Project Settings
          </button>
          <button class="dropdown-item" @click="handleExportProject">
            <span class="dropdown-icon">📤</span>
            Export Project
          </button>
          <button class="dropdown-item" @click="handleImportProject">
            <span class="dropdown-icon">📥</span>
            Import Project
          </button>
          <hr class="dropdown-divider">
          <button class="dropdown-item danger" @click="handleDeleteProject">
            <span class="dropdown-icon">🗑️</span>
            Delete Project
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-indicator">
      <div class="loading-spinner"></div>
    </div>

    <!-- Create Project Dialog -->
    <div v-if="showCreateProjectDialog" class="dialog-overlay" @click="handleDialogOverlayClick">
      <div class="dialog create-project-dialog" @click.stop>
        <div class="dialog-header">
          <h3>Create New Project</h3>
          <button class="dialog-close" @click="closeCreateProjectDialog" aria-label="Close dialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="project-name-input">Project Name</label>
            <input 
              id="project-name-input"
              type="text" 
              v-model="newProjectName"
              @keyup.enter="confirmCreateProject"
              @keyup.escape="closeCreateProjectDialog"
              placeholder="Enter project name"
              maxlength="100"
              ref="projectNameInput"
              :class="{ 'error': projectNameError }"
            >
            <div v-if="projectNameError" class="error-message">{{ projectNameError }}</div>
          </div>
          <div class="form-group">
            <label for="project-description-input">Description (Optional)</label>
            <textarea 
              id="project-description-input"
              v-model="newProjectDescription"
              placeholder="Enter project description"
              maxlength="500"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeCreateProjectDialog">Cancel</button>
          <button 
            class="btn btn-primary" 
            @click="confirmCreateProject"
            :disabled="!isProjectNameValid || isCreatingProject"
          >
            <span v-if="isCreatingProject" class="btn-spinner"></span>
            {{ isCreatingProject ? 'Creating...' : 'Create Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ProjectToolbar',
  props: {
    projectName: {
      type: String,
      default: ''
    },
    projectDescription: {
      type: String,
      default: ''
    },
    isProjectModified: {
      type: Boolean,
      default: false
    },
    hasActiveProject: {
      type: Boolean,
      default: false
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    showMoreActions: {
      type: Boolean,
      default: true
    },
    maxProjectNameLength: {
      type: Number,
      default: 30
    },
    maxDescriptionLength: {
      type: Number,
      default: 50
    }
  },
  emits: [
    'create-project',
    'add-diagram', 
    'create-diagram',
    'project-settings',
    'export-project',
    'import-project',
    'delete-project'
  ],
  data() {
    return {
      // Dialog state
      showCreateProjectDialog: false,
      newProjectName: '',
      newProjectDescription: '',
      projectNameError: '',
      isCreatingProject: false,
      
      // Dropdown state
      moreActionsOpen: false,
      
      // Component state
      clickOutsideHandler: null
    }
  },
  computed: {
    displayProjectName() {
      if (!this.projectName) {
        return 'No Project'
      }
      
      if (this.projectName.length <= this.maxProjectNameLength) {
        return this.projectName
      }
      
      return this.projectName.substring(0, this.maxProjectNameLength - 3) + '...'
    },
    
    truncatedDescription() {
      if (!this.projectDescription) {
        return ''
      }
      
      if (this.projectDescription.length <= this.maxDescriptionLength) {
        return this.projectDescription
      }
      
      return this.projectDescription.substring(0, this.maxDescriptionLength - 3) + '...'
    },
    
    isProjectNameValid() {
      return this.newProjectName.trim().length > 0 && !this.projectNameError
    }
  },
  watch: {
    newProjectName(newValue) {
      this.validateProjectName(newValue)
    },
    
    moreActionsOpen(isOpen) {
      if (isOpen) {
        this.setupClickOutsideHandler()
      } else {
        this.removeClickOutsideHandler()
      }
    }
  },
  mounted() {
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts()
  },
  
  beforeUnmount() {
    this.removeClickOutsideHandler()
    this.removeKeyboardShortcuts()
  },
  
  methods: {
    // Project creation methods
    handleCreateProject() {
      this.showCreateProjectDialog = true
      this.newProjectName = ''
      this.newProjectDescription = ''
      this.projectNameError = ''
      
      // Focus the input after dialog opens
      this.$nextTick(() => {
        if (this.$refs.projectNameInput) {
          this.$refs.projectNameInput.focus()
        }
      })
    },
    
    closeCreateProjectDialog() {
      this.showCreateProjectDialog = false
      this.newProjectName = ''
      this.newProjectDescription = ''
      this.projectNameError = ''
      this.isCreatingProject = false
    },
    
    async confirmCreateProject() {
      if (!this.isProjectNameValid || this.isCreatingProject) {
        return
      }
      
      try {
        this.isCreatingProject = true
        
        const projectData = {
          name: this.newProjectName.trim(),
          description: this.newProjectDescription.trim() || undefined
        }
        
        // Emit create project event
        this.$emit('create-project', projectData)
        
        // Close dialog after successful creation
        this.closeCreateProjectDialog()
        
      } catch (error) {
        console.error('Error creating project:', error)
        this.projectNameError = 'Failed to create project. Please try again.'
      } finally {
        this.isCreatingProject = false
      }
    },
    
    validateProjectName(name) {
      this.projectNameError = ''
      
      if (!name || name.trim().length === 0) {
        this.projectNameError = 'Project name is required'
        return
      }
      
      if (name.trim().length < 2) {
        this.projectNameError = 'Project name must be at least 2 characters'
        return
      }
      
      if (name.length > 100) {
        this.projectNameError = 'Project name must be less than 100 characters'
        return
      }
      
      // Check for invalid characters
      const invalidChars = /[<>:"/\\|?*]/
      if (invalidChars.test(name)) {
        this.projectNameError = 'Project name contains invalid characters'
        return
      }
    },
    
    handleDialogOverlayClick(event) {
      // Close dialog when clicking outside
      if (event.target === event.currentTarget) {
        this.closeCreateProjectDialog()
      }
    },
    
    // Diagram action methods
    handleAddDiagram() {
      if (!this.hasActiveProject || this.isLoading) {
        return
      }
      
      this.$emit('add-diagram')
    },
    
    handleCreateDiagram() {
      if (!this.hasActiveProject || this.isLoading) {
        return
      }
      
      this.$emit('create-diagram')
    },
    
    // More actions dropdown methods
    toggleMoreActions() {
      this.moreActionsOpen = !this.moreActionsOpen
    },
    
    handleProjectSettings() {
      this.moreActionsOpen = false
      this.$emit('project-settings')
    },
    
    handleExportProject() {
      this.moreActionsOpen = false
      this.$emit('export-project')
    },
    
    handleImportProject() {
      this.moreActionsOpen = false
      this.$emit('import-project')
    },
    
    handleDeleteProject() {
      this.moreActionsOpen = false
      
      // Show confirmation dialog
      const confirmed = confirm(
        `Are you sure you want to delete the project "${this.projectName}"? This action cannot be undone.`
      )
      
      if (confirmed) {
        this.$emit('delete-project')
      }
    },
    
    // Click outside handler for dropdown
    setupClickOutsideHandler() {
      this.clickOutsideHandler = (event) => {
        const dropdown = this.$refs.dropdownMenu
        const button = this.$el.querySelector('.more-actions-btn')
        
        if (dropdown && button && 
            !dropdown.contains(event.target) && 
            !button.contains(event.target)) {
          this.moreActionsOpen = false
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
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
      this.keyboardHandler = (event) => {
        // Ctrl/Cmd + N for new project
        if ((event.ctrlKey || event.metaKey) && event.key === 'n' && !event.shiftKey) {
          event.preventDefault()
          this.handleCreateProject()
          return
        }
        
        // Ctrl/Cmd + Shift + N for new diagram
        if ((event.ctrlKey || event.metaKey) && event.key === 'N' && event.shiftKey) {
          event.preventDefault()
          if (this.hasActiveProject) {
            this.handleCreateDiagram()
          }
          return
        }
        
        // Ctrl/Cmd + O for add diagram
        if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
          event.preventDefault()
          if (this.hasActiveProject) {
            this.handleAddDiagram()
          }
          return
        }
      }
      
      document.addEventListener('keydown', this.keyboardHandler)
    },
    
    removeKeyboardShortcuts() {
      if (this.keyboardHandler) {
        document.removeEventListener('keydown', this.keyboardHandler)
        this.keyboardHandler = null
      }
    }
  }
})
</script>

<style scoped>
.project-toolbar {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #e1e4e8;
  position: relative;
}

/* Project Info */
.project-info {
  margin-bottom: 0.75rem;
}

.project-name {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: #24292f;
  margin-bottom: 0.25rem;
}

.project-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.project-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-indicator {
  color: #f59e0b;
  font-weight: bold;
  margin-left: 0.5rem;
  font-size: 1.2rem;
}

.project-description {
  font-size: 0.875rem;
  color: #656d76;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Project Actions */
.project-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.toolbar-btn:active:not(:disabled) {
  background-color: #e1e4e8;
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.btn-text {
  flex: 1;
  font-weight: 500;
}

/* Specific button styles */
.create-project-btn {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.create-project-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
  border-color: #1d4ed8;
}

.add-diagram-btn {
  background-color: #059669;
  border-color: #059669;
  color: #fff;
}

.add-diagram-btn:hover:not(:disabled) {
  background-color: #047857;
  border-color: #047857;
}

.create-diagram-btn {
  background-color: #7c3aed;
  border-color: #7c3aed;
  color: #fff;
}

.create-diagram-btn:hover:not(:disabled) {
  background-color: #6d28d9;
  border-color: #6d28d9;
}

/* More Actions Dropdown */
.more-actions-dropdown {
  position: relative;
}

.more-actions-btn {
  justify-content: center;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 0.5rem 0;
  margin-top: 0.25rem;
}

.dropdown-item {
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

.dropdown-item:hover {
  background-color: #f6f8fa;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background-color: #fef2f2;
}

.dropdown-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.dropdown-divider {
  border: none;
  border-top: 1px solid #e1e4e8;
  margin: 0.5rem 0;
}

/* Loading Indicator */
.loading-indicator {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e1e4e8;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  max-width: 500px;
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

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
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

/* Responsive Design */

/* Tablet (768px - 991px) */
@media (min-width: 768px) and (max-width: 991px) {
  .project-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .toolbar-btn {
    flex: 1;
    min-width: 0;
    font-size: 0.8rem;
    padding: 0.45rem 0.6rem;
  }
  
  .btn-text {
    display: none;
  }
  
  .toolbar-btn {
    justify-content: center;
  }
}

/* Mobile (max 767px) */
@media (max-width: 767px) {
  .project-toolbar {
    padding: 0.75rem;
  }
  
  .project-name {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .project-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .toolbar-btn {
    flex: 1;
    min-width: 0;
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
    justify-content: center;
  }
  
  .btn-text {
    display: none;
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
  .project-toolbar {
    padding: 0.5rem;
  }
  
  .project-name {
    font-size: 0.9rem;
  }
  
  .toolbar-btn {
    font-size: 0.7rem;
    padding: 0.35rem 0.4rem;
  }
  
  .btn-icon {
    margin-right: 0;
    font-size: 0.9rem;
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
  .project-toolbar {
    background-color: #111827;
    border-bottom-color: #374151;
  }
  
  .project-name {
    color: #f9fafb;
  }
  
  .project-description {
    color: #9ca3af;
  }
  
  .toolbar-btn {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .toolbar-btn:hover:not(:disabled) {
    background-color: #4b5563;
    border-color: #6b7280;
  }
  
  .dropdown-menu {
    background-color: #1f2937;
    border-color: #374151;
  }
  
  .dropdown-item {
    color: #f9fafb;
  }
  
  .dropdown-item:hover {
    background-color: #374151;
  }
  
  .dropdown-divider {
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
  
  .form-group input,
  .form-group textarea {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .form-group input:focus,
  .form-group textarea:focus {
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
  .toolbar-btn,
  .dropdown-item,
  .dialog-close,
  .btn,
  .loading-spinner,
  .btn-spinner {
    transition: none;
    animation: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .project-toolbar {
    border-bottom-color: #000;
  }
  
  .toolbar-btn,
  .dropdown-menu,
  .dialog {
    border-color: #000;
  }
  
  .form-group input,
  .form-group textarea {
    border-color: #000;
  }
}
</style>