<template>
  <div class="project-workspace" :class="{ 'nav-collapsed': navigationCollapsed }">
    <!-- Navigation Pane (Left) -->
    <div class="navigation-pane" v-show="!navigationCollapsed">
      <div class="project-toolbar">
        <div class="project-name">
          {{ currentProject?.name || 'No Project' }}
        </div>
        <div class="project-actions">
          <button class="toolbar-btn" @click="createProject" title="Create New Project">
            📁 New Project
          </button>
          <button v-if="currentProject" class="toolbar-btn" @click="addDiagram" title="Add Existing Diagram">
            📄 Add Diagram
          </button>
          <button v-if="currentProject" class="toolbar-btn" @click="createDiagram" title="Create New Diagram">
            ➕ New Diagram
          </button>

        </div>
      </div>

      <div v-if="!currentProject" class="available-projects">
        <h4>Available Projects</h4>
        <ul>
          <li v-for="project in availableProjects" :key="project.id" @click="selectProject(project.id)">
            {{ project.name }} - {{ project.description }}
          </li>
        </ul>
      </div>
      <div class="diagram-list">
        <div v-if="!currentProject" class="empty-state">
          <p>Create a project to get started</p>
        </div>
        <div v-else-if="currentProject.diagrams.length === 0" class="empty-state">
          <p>No diagrams in this project</p>
          <p>Add or create diagrams to begin</p>
        </div>
        <div v-else>
          <div v-for="diagram in currentProject.diagrams" :key="diagram.id" class="diagram-item"
            :class="{ active: selectedDiagramId === diagram.id }" @click="selectDiagram(diagram.id)">
            <span class="diagram-icon">📊</span>
            <span class="diagram-name">{{ diagram.title }}</span>
            <span v-if="diagram.isModified" class="modified-indicator">●</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pane Splitter -->
    <div class="pane-splitter" @mousedown="startSplitterDrag" v-show="!navigationCollapsed">
      <div class="splitter-handle"></div>
    </div>

    <!-- Editor Pane (Right) -->
    <div class="editor-pane">
      <!-- Navigation Toggle Button -->
      <div class="nav-toggle">
        <button class="nav-toggle-btn" @click="toggleNavigation"
          :title="navigationCollapsed ? 'Show Navigation' : 'Hide Navigation'">
          {{ navigationCollapsed ? '▶' : '◀' }}
        </button>
      </div>

      <!-- Tab Bar -->
      <div class="tab-bar" v-if="openTabs.length > 0">
        <div v-for="tab in openTabs" :key="tab.id" class="editor-tab" :class="{ active: activeTabId === tab.id }"
          @click="switchToTab(tab.id)">
          <span class="tab-title">{{ tab.title }}</span>
          <span v-if="tab.isModified" class="tab-modified">●</span>
          <button class="tab-close" @click.stop="closeTab(tab.id)">×</button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <div v-if="openTabs.length === 0" class="empty-editor-state">
          <div class="empty-message">
            <h3>Welcome to Code To Diagram</h3>
            <p>Create a project and add diagrams to get started</p>
          </div>
        </div>
        <div v-else>
          <!-- Active Editor Instance -->
          <MermaidRenderer v-for="tab in openTabs" :key="tab.id" v-show="activeTabId === tab.id" :theme="theme"
            :initial-content="tab.content" @update:theme="$emit('update:theme', $event)"
            @content-changed="handleContentChanged(tab.id, $event)" ref="editorInstances" />
        </div>
      </div>
    </div>

  </div>

</template>

<script>
import { ref } from 'vue'
import { defineComponent } from 'vue'
import MermaidRenderer from './MermaidRenderer.vue'
import SideDrawer from './SideDrawer.vue'

const drawerOpen = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')

function handleCreate() {
  if (newProjectName.value.trim()) {
    console.log('Creating project:', newProjectName.value, newProjectDescription.value)
    drawerOpen.value = false
    newProjectName.value = ''
    newProjectDescription.value = ''
  } else {
    alert('Project name cannot be empty')
  }
}
export default defineComponent({
  name: 'ProjectWorkspace',
  components: {
    MermaidRenderer
  },
  props: {
    theme: {
      type: String,
      default: 'default'
    }
  },
  emits: ['update:theme'],
  data() {
    return {
      // Navigation state
      navigationCollapsed: false,
      navigationWidth: 300,

      // Project state
      currentProject: null,
      selectedDiagramId: null,

      // Tab management
      openTabs: [],
      activeTabId: null,
      tabCounter: 0,

      // Splitter state
      splitterDragging: false,
      splitterStartX: 0,
      splitterStartWidth: 300,

      // Workspace state
      workspaceInitialized: false,

      // Performance optimization timers
      resizeDebounceTimer: null,
      windowResizeHandler: null,
      availableProjects: []
    }
  },
  computed: {
    navigationPaneStyle() {
      return {
        width: this.navigationCollapsed ? '0px' : `${this.navigationWidth}px`
      }
    }
  },
  mounted() {
    this.initializeWorkspace()
    this.fetchAvailableProjects()
    this.setupEventListeners()
  },
  beforeUnmount() {
    this.cleanupEventListeners()
  },
  methods: {
    async fetchAvailableProjects() {
      try {
        const projectManager = await import('../services/ProjectManager');
        const manager = projectManager.ProjectManager.getInstance();
        const projects = await manager.loadProjectList();

        console.log("Projects:", projects)
        this.availableProjects = projects;
      } catch (error) {
        console.error('Failed to load available projects:', error);
      }
    },
    async selectProject(projectId) {
      try {
        const projectManager = await import('../services/ProjectManager');
        const manager = projectManager.ProjectManager.getInstance();
        const project = await manager.loadProject(projectId);
        await this.switchToProject(project);
      } catch (error) {
        console.error('Failed to load project:', error);
      }
    },
    // Workspace initialization
    initializeWorkspace() {
      try {
        // Restore workspace state from localStorage
        // this.restoreWorkspaceState()

        // Initialize with a default project for now
        // This will be replaced with proper project management in later tasks
        this.currentProject = null

        // Apply initial CSS custom properties
        this.updateCSSCustomProperty('--nav-width', `${this.navigationWidth}px`)
        this.updateCSSCustomProperty('--splitter-width', this.navigationCollapsed ? '0px' : '4px')

        this.workspaceInitialized = true
        console.log('ProjectWorkspace initialized successfully')
      } catch (error) {
        console.error('Error initializing workspace:', error)
      }
    },

    // Navigation methods
    toggleNavigation() {
      this.navigationCollapsed = !this.navigationCollapsed

      // Update CSS custom properties for smooth transitions
      this.updateCSSCustomProperty('--nav-width', this.navigationCollapsed ? '0px' : `${this.navigationWidth}px`)
      this.updateCSSCustomProperty('--splitter-width', this.navigationCollapsed ? '0px' : '4px')

      // Persist the navigation state
      this.persistWorkspaceState()

      this.$nextTick(() => {
        // Trigger resize for active editor after transition
        this.resizeActiveEditor()
      })
    },

    // Project management methods (stubs for now)
    async createProject() {
      try {
        // Show project creation dialog
        const projectData = await this.showCreateProjectDialog();

        if (!projectData) {
          return; // User cancelled
        }

        // Validate project name
        const validationResult = this.validateProjectName(projectData.name);
        if (!validationResult.isValid) {
          this.showNotification('error', 'Invalid Name', validationResult.message);
          return;
        }

        // Create new project using ProjectManager
        const projectManager = await import('../services/ProjectManager');
        const manager = projectManager.ProjectManager.getInstance();

        const newProject = await manager.createProject(projectData.id, projectData.name, projectData.description);

        // Switch to the new project
        await this.switchToProject(newProject);

        // Show success notification
        this.showNotification('success', 'Project Created',
          `"${newProject.name}" has been created and is now active`);

      } catch (error) {
        console.error('Error creating project:', error);
        this.showNotification('error', 'Creation Failed',
          error.message || 'Failed to create project');
      }
    },

    showCreateProjectDialog() {
      return new Promise((resolve) => {
        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.className = 'create-dialog-overlay';
        dialog.innerHTML = `
          <div class="create-dialog">
            <h3>Create New Project</h3>
            <div class="form-group">
              <label for="project-id">Project Id:</label>
              <input 
                type="text" 
                id="project-id" 
                class="project-name-input" 
                placeholder="Enter project id..."
                maxlength="100"
              />
              <div class="input-hint">
                Valid characters: letters, numbers, spaces, hyphens, and underscores
              </div>
            </div>            
            <div class="form-group">
              <label for="project-name">Project Name:</label>
              <input 
                type="text" 
                id="project-name" 
                class="project-name-input" 
                placeholder="Enter project name..."
                maxlength="100"
              />
              <div class="input-hint">
                Valid characters: letters, numbers, spaces, hyphens, and underscores
              </div>
            </div>
            <div class="form-group">
              <label for="project-description">Description (optional):</label>
              <textarea 
                id="project-description" 
                class="project-description-input" 
                placeholder="Enter project description..."
                maxlength="500"
                rows="3"
              ></textarea>
              <div class="input-hint">
                Brief description of your project (max 500 characters)
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn-cancel" data-action="cancel">Cancel</button>
              <button class="btn-create" data-action="create">Create Project</button>
            </div>
          </div>
        `;
        const idInput = dialog.querySelector('#project-id');
        const nameInput = dialog.querySelector('#project-name');
        const descriptionInput = dialog.querySelector('#project-description');
        const createBtn = dialog.querySelector('.btn-create');
        const cancelBtn = dialog.querySelector('.btn-cancel');

        // Handle input validation
        nameInput.addEventListener('input', () => {
          const value = nameInput.value.trim();
          const validation = this.validateProjectName(value);

          createBtn.disabled = !validation.isValid;

          // Update hint with validation message
          const hint = dialog.querySelector('.input-hint');
          if (value && !validation.isValid) {
            hint.textContent = validation.message;
            hint.className = 'input-hint error';
          } else {
            hint.textContent = 'Valid characters: letters, numbers, spaces, hyphens, and underscores';
            hint.className = 'input-hint';
          }
        });

        // Handle form submission
        const handleSubmit = () => {
          const id = idInput.value.trim();
          const name = nameInput.value.trim();
          const description = descriptionInput.value.trim();

          if (name && this.validateProjectName(name).isValid) {
            document.body.removeChild(dialog);
            resolve({
              id,
              name,
              description: description || undefined
            });
          }
        };

        // Handle enter key in name input
        idInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });        

        // Handle enter key in name input
        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });

        // Handle escape key in description
        descriptionInput.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });

        // Handle button clicks
        createBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(dialog);
          resolve(null);
        });

        // Handle overlay click
        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });

        // Add to DOM and focus input
        document.body.appendChild(dialog);
        idInput.focus();
      });
    },

    validateProjectName(name) {
      if (!name || name.trim().length === 0) {
        return { isValid: false, message: 'Project name cannot be empty' };
      }

      const trimmedName = name.trim();

      if (trimmedName.length > 100) {
        return { isValid: false, message: 'Project name cannot exceed 100 characters' };
      }

      // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
      const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validNameRegex.test(trimmedName)) {
        return { isValid: false, message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' };
      }

      // Check for reserved names
      const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
      if (reservedNames.includes(trimmedName.toLowerCase())) {
        return { isValid: false, message: 'This name is reserved and cannot be used' };
      }

      return { isValid: true, message: '' };
    },

    // async switchToProject(project) {
    //   try {
    //     // Close all current tabs
    //     this.closeAllTabs();

    //     // Clear current selection
    //     this.selectedDiagramId = null;

    //     // Set new current project
    //     this.currentProject = project;

    //     // Update navigation pane to show new project
    //     this.$nextTick(() => {
    //       // Restore workspace layout if available
    //       if (project.metadata?.workspaceLayout) {
    //         const layout = project.metadata.workspaceLayout;

    //         // Restore navigation pane width
    //         if (layout.navigationPaneWidth) {
    //           this.navigationWidth = layout.navigationPaneWidth;
    //           this.updateCSSCustomProperty('--nav-width', `${layout.navigationPaneWidth}px`);
    //         }

    //         // Restore navigation pane collapsed state
    //         if (typeof layout.navigationPaneCollapsed === 'boolean') {
    //           this.navigationCollapsed = layout.navigationPaneCollapsed;
    //         }

    //         // Restore previously opened tabs
    //         if (layout.lastOpenedTabs && layout.lastOpenedTabs.length > 0) {
    //           this.restoreProjectTabs(layout.lastOpenedTabs, layout.activeTabId);
    //         }
    //       }

    //       // Persist workspace state
    //       this.persistWorkspaceState();
    //     });

    //     // Update ProjectManager current project
    //     const projectManager = await import('../services/ProjectManager');
    //     const manager = projectManager.ProjectManager.getInstance();
    //     manager.setCurrentProject(project);

    //   } catch (error) {
    //     console.error('Error switching to project:', error);
    //     throw error;
    //   }
    // },
    async switchToProject(project) {
      try {
        const projectManager = await import('../services/ProjectManager');
        const manager = projectManager.ProjectManager.getInstance();

        // Load full project outline from backend
        const fullProject = await manager.loadProject(project.id);

        // Close all current tabs
        this.closeAllTabs();

        // Clear current selection
        this.selectedDiagramId = null;

        // Set new current project (with full data)
        this.currentProject = fullProject;

        // Update navigation pane and workspace layout
        this.$nextTick(() => {
          const layout = fullProject.metadata?.workspaceLayout;

          if (layout?.navigationPaneWidth) {
            this.navigationWidth = layout.navigationPaneWidth;
            this.updateCSSCustomProperty('--nav-width', `${layout.navigationPaneWidth}px`);
          }

          if (typeof layout?.navigationPaneCollapsed === 'boolean') {
            this.navigationCollapsed = layout.navigationPaneCollapsed;
          }

          if (layout?.lastOpenedTabs?.length > 0) {
            this.restoreProjectTabs(layout.lastOpenedTabs, layout.activeTabId);
          }

          // Persist workspace state
          this.persistWorkspaceState();
        });

        // Update ProjectManager current project
        manager.setCurrentProject(fullProject);

      } catch (error) {
        console.error('Error switching to project:', error);
        throw error;
      }
    },

    async restoreProjectTabs(tabDiagramIds, activeTabId) {
      try {
        for (const diagramId of tabDiagramIds) {
          const diagram = this.currentProject?.diagrams.find(d => d.id === diagramId);
          if (diagram) {
            this.openDiagramInTab(diagram);
          }
        }

        // Set active tab if specified
        if (activeTabId) {
          const activeTab = this.openTabs.find(t => t.id === activeTabId);
          if (activeTab) {
            this.switchToTab(activeTab.id);
          }
        }
      } catch (error) {
        console.warn('Error restoring project tabs:', error);
      }
    },

    closeAllTabs() {
      // Close all tabs without prompting (project switch scenario)
      this.openTabs = [];
      this.activeTabId = null;
    },

    async addDiagram() {
      if (!this.currentProject) {
        this.showNotification('error', 'No Project', 'Please create or load a project first');
        return;
      }

      try {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.mmd,.md,.txt';
        fileInput.multiple = true;

        // Handle file selection
        fileInput.onchange = async (event) => {
          const files = event.target.files;
          if (!files || files.length === 0) return;

          await this.processSelectedFiles(Array.from(files));
        };

        // Trigger file picker
        fileInput.click();
      } catch (error) {
        console.error('Error opening file picker:', error);
        this.showNotification('error', 'File Picker Error', 'Failed to open file picker');
      }
    },

    async processSelectedFiles(files) {
      const results = [];
      const conflicts = [];

      for (const file of files) {
        try {
          // Validate file type
          if (!this.isValidDiagramFile(file)) {
            results.push({
              fileName: file.name,
              status: 'error',
              message: 'Invalid file type. Only .mmd, .md, and .txt files are supported.'
            });
            continue;
          }

          // Read file content
          const content = await this.readFileContent(file);

          // Generate diagram name from filename
          const diagramName = this.generateDiagramName(file.name);

          // Check for naming conflicts
          if (this.currentProject.diagrams.some(d => d.name === diagramName)) {
            conflicts.push({
              file,
              content,
              originalName: diagramName,
              suggestedName: this.generateUniqueFileName(diagramName)
            });
            continue;
          }

          // Create and add diagram
          const diagram = await this.createDiagramFromFile(file, content, diagramName);
          await this.addDiagramToCurrentProject(diagram);

          // Open in new tab
          this.openDiagramInTab(diagram);

          results.push({
            fileName: file.name,
            status: 'success',
            message: 'Diagram added successfully'
          });

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          results.push({
            fileName: file.name,
            status: 'error',
            message: error.message || 'Failed to process file'
          });
        }
      }

      // Handle conflicts if any
      if (conflicts.length > 0) {
        await this.handleNamingConflicts(conflicts);
      }

      // Show results summary
      this.showFileProcessingResults(results);
    },

    async handleNamingConflicts(conflicts) {
      for (const conflict of conflicts) {
        const resolution = await this.showNamingConflictDialog(
          conflict.originalName,
          conflict.suggestedName
        );

        if (resolution.action === 'rename') {
          try {
            const diagram = await this.createDiagramFromFile(
              conflict.file,
              conflict.content,
              resolution.newName
            );
            await this.addDiagramToCurrentProject(diagram);
            this.openDiagramInTab(diagram);
          } catch (error) {
            console.error('Error resolving naming conflict:', error);
            this.showNotification('error', 'Conflict Resolution Failed', error.message);
          }
        } else if (resolution.action === 'replace') {
          try {
            // Find and replace existing diagram
            const existingDiagram = this.currentProject.diagrams.find(
              d => d.name === conflict.originalName
            );
            if (existingDiagram) {
              existingDiagram.content = conflict.content;
              existingDiagram.lastModified = new Date();
              existingDiagram.isModified = true;

              // Update project
              await this.saveCurrentProject();

              // Update open tab if exists
              const existingTab = this.openTabs.find(t => t.diagramId === existingDiagram.id);
              if (existingTab) {
                existingTab.content = conflict.content;
                existingTab.isModified = true;
              }
            }
          } catch (error) {
            console.error('Error replacing diagram:', error);
            this.showNotification('error', 'Replace Failed', error.message);
          }
        }
        // If action is 'skip', do nothing
      }
    },

    showNamingConflictDialog(originalName, suggestedName) {
      return new Promise((resolve) => {
        const message = `A diagram named "${originalName}" already exists.\n\nWhat would you like to do?`;

        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.className = 'conflict-dialog-overlay';
        dialog.innerHTML = `
          <div class="conflict-dialog">
            <h3>Naming Conflict</h3>
            <p>${message}</p>
            <div class="conflict-options">
              <button class="btn-rename" data-action="rename">Rename to "${suggestedName}"</button>
              <button class="btn-replace" data-action="replace">Replace existing</button>
              <button class="btn-skip" data-action="skip">Skip this file</button>
            </div>
          </div>
        `;

        // Add event listeners
        dialog.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          if (action) {
            document.body.removeChild(dialog);
            resolve({
              action,
              newName: action === 'rename' ? suggestedName : originalName
            });
          }
        });

        // Add to DOM
        document.body.appendChild(dialog);
      });
    },

    isValidDiagramFile(file) {
      const validExtensions = ['.mmd', '.md', '.txt'];
      const fileName = file.name.toLowerCase();
      return validExtensions.some(ext => fileName.endsWith(ext));
    },

    readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    },

    generateDiagramName(fileName) {
      // Remove extension and clean up name
      return fileName.replace(/\.(mmd|md|txt)$/i, '').trim();
    },

    generateUniqueFileName(baseName) {
      let counter = 1;
      let newName = `${baseName} (${counter})`;

      while (this.currentProject.diagrams.some(d => d.name === newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
      }

      return newName;
    },

    async createDiagramFromFile(file, content, diagramName) {
      const now = new Date();

      // Detect diagram type from content
      const diagramType = this.detectDiagramType(content);

      // Generate content hash
      const contentHash = this.generateContentHash(content);

      return {
        id: this.generateDiagramId(),
        name: diagramName,
        content: content,
        type: diagramType,
        filePath: file.name, // Store original filename
        createdAt: now,
        lastModified: now,
        isModified: false,
        metadata: {
          contentHash,
          size: content.length,
          lineCount: content.split('\n').length,
          lastCursorPosition: { line: 0, column: 0 },
          lastScrollPosition: { top: 0, left: 0 }
        }
      };
    },

    detectDiagramType(content) {
      const firstLine = content.trim().split('\n')[0].toLowerCase();

      if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'flowchart';
      if (firstLine.includes('sequencediagram')) return 'sequence';
      if (firstLine.includes('classdiagram')) return 'class';
      if (firstLine.includes('statediagram')) return 'state';
      if (firstLine.includes('erdiagram')) return 'er';
      if (firstLine.includes('gantt')) return 'gantt';
      if (firstLine.includes('pie')) return 'pie';
      if (firstLine.includes('journey')) return 'journey';

      // Default to flowchart
      return 'flowchart';
    },

    generateContentHash(content) {
      // Simple hash function for content
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(36);
    },

    generateDiagramId() {
      return `diagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    async addDiagramToCurrentProject(diagram) {
      if (!this.currentProject) {
        throw new Error('No current project');
      }

      // Add diagram to project
      this.currentProject.diagrams.push(diagram);
      this.currentProject.lastModified = new Date();

      // Save project
      await this.saveCurrentProject();
    },

    async saveCurrentProject() {
      if (!this.currentProject) return;

      try {
        const projectManager = await import('../services/ProjectManager');
        const manager = projectManager.ProjectManager.getInstance();
        await manager.saveProject(this.currentProject);
      } catch (error) {
        console.error('Error saving project:', error);
        throw error;
      }
    },

    showFileProcessingResults(results) {
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      if (successCount > 0 && errorCount === 0) {
        this.showNotification('success', 'Files Added',
          `Successfully added ${successCount} diagram${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0 && errorCount > 0) {
        this.showNotification('warning', 'Partial Success',
          `Added ${successCount} diagrams, ${errorCount} failed`);
      } else if (errorCount > 0) {
        this.showNotification('error', 'Import Failed',
          `Failed to add ${errorCount} diagram${errorCount > 1 ? 's' : ''}`);
      }
    },

    showNotification(type, title, message) {
      // Simple notification system - could be enhanced with a proper notification component
      const notification = {
        type,
        title,
        message,
        timestamp: new Date()
      };

      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

      // Show browser notification if available
      if (type === 'error') {
        alert(`${title}: ${message}`);
      }
    },

    async createDiagram() {
      if (!this.currentProject) {
        this.showNotification('error', 'No Project', 'Please create or load a project first');
        return;
      }

      try {
        // Show filename prompt dialog
        const diagramName = await this.showCreateDiagramDialog();

        if (!diagramName) {
          return; // User cancelled
        }

        // Validate filename
        const validationResult = this.validateDiagramName(diagramName);
        if (!validationResult.isValid) {
          this.showNotification('error', 'Invalid Name', validationResult.message);
          return;
        }

        // Check for naming conflicts
        if (this.currentProject.diagrams.some(d => d.name === diagramName)) {
          const shouldReplace = await this.showReplaceConfirmDialog(diagramName);
          if (!shouldReplace) {
            return;
          }

          // Remove existing diagram
          await this.removeDiagramFromProject(diagramName);
        }

        // Create new diagram with default content
        const newDiagram = this.createNewDiagram(diagramName);

        // Add to current project
        await this.addDiagramToCurrentProject(newDiagram);

        // Open in new tab
        this.openDiagramInTab(newDiagram);

        // Show success notification
        this.showNotification('success', 'Diagram Created',
          `"${diagramName}" has been created and opened for editing`);

      } catch (error) {
        console.error('Error creating diagram:', error);
        this.showNotification('error', 'Creation Failed',
          error.message || 'Failed to create diagram');
      }
    },

    showCreateDiagramDialog() {
      return new Promise((resolve) => {
        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.className = 'create-dialog-overlay';
        dialog.innerHTML = `
          <div class="create-dialog">
            <h3>Create New Diagram</h3>
            <div class="form-group">
              <label for="diagram-name">Diagram Name:</label>
              <input 
                type="text" 
                id="diagram-name" 
                class="diagram-name-input" 
                placeholder="Enter diagram name..."
                maxlength="100"
              />
              <div class="input-hint">
                Valid characters: letters, numbers, spaces, hyphens, and underscores
              </div>
            </div>
            <div class="dialog-actions">
              <button class="btn-cancel" data-action="cancel">Cancel</button>
              <button class="btn-create" data-action="create">Create Diagram</button>
            </div>
          </div>
        `;

        const input = dialog.querySelector('#diagram-name');
        const createBtn = dialog.querySelector('.btn-create');
        const cancelBtn = dialog.querySelector('.btn-cancel');

        // Handle input validation
        input.addEventListener('input', () => {
          const value = input.value.trim();
          const validation = this.validateDiagramName(value);

          createBtn.disabled = !validation.isValid;

          // Update hint with validation message
          const hint = dialog.querySelector('.input-hint');
          if (value && !validation.isValid) {
            hint.textContent = validation.message;
            hint.className = 'input-hint error';
          } else {
            hint.textContent = 'Valid characters: letters, numbers, spaces, hyphens, and underscores';
            hint.className = 'input-hint';
          }
        });

        // Handle form submission
        const handleSubmit = () => {
          const value = input.value.trim();
          if (value && this.validateDiagramName(value).isValid) {
            document.body.removeChild(dialog);
            resolve(value);
          }
        };

        // Handle enter key
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });

        // Handle button clicks
        createBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(dialog);
          resolve(null);
        });

        // Handle overlay click
        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) {
            document.body.removeChild(dialog);
            resolve(null);
          }
        });

        // Add to DOM and focus input
        document.body.appendChild(dialog);
        input.focus();
      });
    },

    validateDiagramName(name) {
      if (!name || name.trim().length === 0) {
        return { isValid: false, message: 'Diagram name cannot be empty' };
      }

      const trimmedName = name.trim();

      if (trimmedName.length > 100) {
        return { isValid: false, message: 'Diagram name cannot exceed 100 characters' };
      }

      // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
      const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validNameRegex.test(trimmedName)) {
        return { isValid: false, message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' };
      }

      // Check for reserved names
      const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
      if (reservedNames.includes(trimmedName.toLowerCase())) {
        return { isValid: false, message: 'This name is reserved and cannot be used' };
      }

      return { isValid: true, message: '' };
    },

    showReplaceConfirmDialog(diagramName) {
      return new Promise((resolve) => {
        const shouldReplace = confirm(
          `A diagram named "${diagramName}" already exists.\n\nDo you want to replace it?`
        );
        resolve(shouldReplace);
      });
    },

    createNewDiagram(name) {
      const now = new Date();
      const defaultContent = this.getDefaultDiagramContent();
      const contentHash = this.generateContentHash(defaultContent);

      return {
        id: this.generateDiagramId(),
        name: name.trim(),
        content: defaultContent,
        type: this.currentProject.settings.defaultDiagramType || 'flowchart',
        createdAt: now,
        lastModified: now,
        isModified: false,
        metadata: {
          contentHash,
          size: defaultContent.length,
          lineCount: defaultContent.split('\n').length,
          lastCursorPosition: { line: 0, column: 0 },
          lastScrollPosition: { top: 0, left: 0 }
        }
      };
    },

    getDefaultDiagramContent() {
      const defaultType = this.currentProject?.settings?.defaultDiagramType || 'flowchart';

      const templates = {
        flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,

        sequence: `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great!`,

        class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    Animal <|-- Dog`,

        state: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,

        er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,

        gantt: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d`,

        pie: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,

        journey: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me`
      };

      return templates[defaultType] || templates.flowchart;
    },

    async removeDiagramFromProject(diagramName) {
      if (!this.currentProject) return;

      const diagramIndex = this.currentProject.diagrams.findIndex(d => d.name === diagramName);
      if (diagramIndex >= 0) {
        const diagram = this.currentProject.diagrams[diagramIndex];

        // Close any open tabs for this diagram
        const openTab = this.openTabs.find(t => t.diagramId === diagram.id);
        if (openTab) {
          this.closeTab(openTab.id);
        }

        // Remove from project
        this.currentProject.diagrams.splice(diagramIndex, 1);
        this.currentProject.lastModified = new Date();

        // Save project
        await this.saveCurrentProject();
      }
    },

    // Diagram selection
    selectDiagram(diagramId) {
      this.selectedDiagramId = diagramId
      const diagram = this.currentProject?.diagrams.find(d => d.id === diagramId)
      if (diagram) {
        this.openDiagramInTab(diagram)
      }
    },

    // Tab management
    openDiagramInTab(diagram) {
      // Check if tab already exists
      const existingTab = this.openTabs.find(tab => tab.diagramId === diagram.id)
      if (existingTab) {
        this.switchToTab(existingTab.id)
        return
      }

      // Create new tab
      const newTab = {
        id: `tab-${++this.tabCounter}`,
        diagramId: diagram.id,
        title: diagram.title,
        content: diagram.mermaid_code || '',
        isModified: false
      }

      this.openTabs.push(newTab)
      this.switchToTab(newTab.id)
    },

    switchToTab(tabId) {
      this.activeTabId = tabId
      this.$nextTick(() => {
        this.resizeActiveEditor()
      })
    },

    closeTab(tabId) {
      const tabIndex = this.openTabs.findIndex(tab => tab.id === tabId)
      if (tabIndex === -1) return

      const tab = this.openTabs[tabIndex]

      // TODO: Check for unsaved changes and prompt user
      if (tab.isModified) {
        const shouldClose = confirm(`"${tab.title}" has unsaved changes. Close anyway?`)
        if (!shouldClose) return
      }

      // Remove tab
      this.openTabs.splice(tabIndex, 1)

      // Switch to another tab if this was active
      if (this.activeTabId === tabId) {
        if (this.openTabs.length > 0) {
          // Switch to the previous tab or first available
          const newActiveIndex = Math.max(0, tabIndex - 1)
          this.activeTabId = this.openTabs[newActiveIndex]?.id || null
        } else {
          this.activeTabId = null
        }
      }
    },

    // Content change handling
    handleContentChanged(tabId, newContent) {
      const tab = this.openTabs.find(t => t.id === tabId)
      if (tab) {
        tab.content = newContent
        tab.isModified = true

        // Update diagram in project
        if (this.currentProject) {
          const diagram = this.currentProject.diagrams.find(d => d.id === tab.diagramId)
          if (diagram) {
            diagram.content = newContent
            diagram.isModified = true
            diagram.lastModified = new Date()
          }
        }
      }
    },

    // Enhanced splitter functionality with constraints and persistence
    startSplitterDrag(event) {
      if (this.navigationCollapsed) return

      // Prevent dragging if already in progress
      if (this.splitterDragging) return

      this.splitterDragging = true
      this.splitterStartX = event.clientX
      this.splitterStartWidth = this.navigationWidth

      // Add visual feedback
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.body.classList.add('splitter-dragging')

      // Add event listeners with passive: false for preventDefault
      document.addEventListener('mousemove', this.handleSplitterDrag, { passive: false })
      document.addEventListener('mouseup', this.stopSplitterDrag, { passive: false })

      // Handle edge cases - escape key to cancel drag
      document.addEventListener('keydown', this.handleSplitterKeydown)

      // Prevent text selection and other default behaviors
      event.preventDefault()
      event.stopPropagation()

      // Add visual indicator to splitter
      if (this.$el) {
        const splitter = this.$el.querySelector('.pane-splitter')
        if (splitter) {
          splitter.classList.add('dragging')
        }
      }
    },

    handleSplitterDrag(event) {
      if (!this.splitterDragging) return

      const deltaX = event.clientX - this.splitterStartX
      const containerWidth = this.$el?.offsetWidth || window.innerWidth

      // Enhanced constraints with responsive breakpoints
      const minWidth = this.getMinNavigationWidth()
      const maxWidth = this.getMaxNavigationWidth(containerWidth)

      // Calculate new width with smooth constraints
      let newWidth = this.splitterStartWidth + deltaX

      // Apply constraints with snap zones
      if (newWidth < minWidth + 20) {
        newWidth = minWidth // Snap to minimum
      } else if (newWidth > maxWidth - 20) {
        newWidth = maxWidth // Snap to maximum
      } else {
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      }

      // Only update if width actually changed (performance optimization)
      if (Math.abs(this.navigationWidth - newWidth) > 1) {
        this.navigationWidth = newWidth
        this.updateCSSCustomProperty('--nav-width', `${newWidth}px`)

        // Debounced editor resize to improve performance
        this.debouncedResizeActiveEditor()
      }

      event.preventDefault()
    },

    stopSplitterDrag(event) {
      if (!this.splitterDragging) return

      this.splitterDragging = false

      // Remove visual feedback
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.classList.remove('splitter-dragging')

      // Remove event listeners
      document.removeEventListener('mousemove', this.handleSplitterDrag)
      document.removeEventListener('mouseup', this.stopSplitterDrag)
      document.removeEventListener('keydown', this.handleSplitterKeydown)

      // Remove visual indicator from splitter
      if (this.$el) {
        const splitter = this.$el.querySelector('.pane-splitter')
        if (splitter) {
          splitter.classList.remove('dragging')
        }
      }

      // Persist the new width
      this.persistWorkspaceState()

      // Final editor resize
      this.$nextTick(() => {
        this.resizeActiveEditor()
      })

      if (event) {
        event.preventDefault()
      }
    },

    // Handle escape key during splitter drag
    handleSplitterKeydown(event) {
      if (event.key === 'Escape' && this.splitterDragging) {
        // Cancel drag and restore original width
        this.navigationWidth = this.splitterStartWidth
        this.updateCSSCustomProperty('--nav-width', `${this.splitterStartWidth}px`)
        this.stopSplitterDrag()
        event.preventDefault()
      }
    },

    // Get minimum navigation width based on screen size
    getMinNavigationWidth() {
      const screenWidth = window.innerWidth
      if (screenWidth < 768) return 180 // Mobile
      if (screenWidth < 992) return 200 // Tablet
      return 220 // Desktop
    },

    // Get maximum navigation width based on container size
    getMaxNavigationWidth(containerWidth) {
      const screenWidth = window.innerWidth
      let maxPercentage = 0.6 // Default 60%

      if (screenWidth < 768) maxPercentage = 0.8 // Mobile: 80%
      else if (screenWidth < 992) maxPercentage = 0.7 // Tablet: 70%

      const absoluteMax = screenWidth < 768 ? 320 : (screenWidth < 1200 ? 500 : 600)
      return Math.min(absoluteMax, containerWidth * maxPercentage)
    },

    // Update CSS custom property for smooth transitions
    updateCSSCustomProperty(property, value) {
      if (this.$el) {
        this.$el.style.setProperty(property, value)
      }
    },

    // Debounced resize function for better performance
    debouncedResizeActiveEditor() {
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer)
      }

      this.resizeDebounceTimer = setTimeout(() => {
        this.resizeActiveEditor()
      }, 16) // ~60fps
    },

    // Persist workspace state to localStorage
    persistWorkspaceState() {
      try {
        const workspaceState = {
          navigationWidth: this.navigationWidth,
          navigationCollapsed: this.navigationCollapsed,
          lastSaved: new Date().toISOString()
        }

        localStorage.setItem('projectWorkspaceState', JSON.stringify(workspaceState))
      } catch (error) {
        console.warn('Failed to persist workspace state:', error)
      }
    },

    // Restore workspace state from localStorage
    restoreWorkspaceState() {
      try {
        const savedState = localStorage.getItem('projectWorkspaceState')
        if (savedState) {
          const state = JSON.parse(savedState)

          // Validate and apply saved state
          if (state.navigationWidth && state.navigationWidth >= 200 && state.navigationWidth <= 600) {
            this.navigationWidth = state.navigationWidth
            this.updateCSSCustomProperty('--nav-width', `${state.navigationWidth}px`)
          }

          if (typeof state.navigationCollapsed === 'boolean') {
            this.navigationCollapsed = state.navigationCollapsed
          }

          console.log('Workspace state restored successfully')
        }
      } catch (error) {
        console.warn('Failed to restore workspace state:', error)
      }
    },

    // Editor resize helper
    resizeActiveEditor() {
      // Trigger resize for the active editor instance
      const activeEditor = this.$refs.editorInstances?.find((editor, index) => {
        const tab = this.openTabs[index]
        return tab && tab.id === this.activeTabId
      })

      if (activeEditor && activeEditor.recalculateEditorHeight) {
        activeEditor.recalculateEditorHeight()
      }
    },

    // Event listeners
    setupEventListeners() {
      // Window resize handler
      this.windowResizeHandler = () => {
        this.$nextTick(() => {
          this.resizeActiveEditor()
        })
      }
      window.addEventListener('resize', this.windowResizeHandler)
    },

    cleanupEventListeners() {
      if (this.windowResizeHandler) {
        window.removeEventListener('resize', this.windowResizeHandler)
      }

      // Clean up splitter event listeners if still active
      document.removeEventListener('mousemove', this.handleSplitterDrag)
      document.removeEventListener('mouseup', this.stopSplitterDrag)

      // Clean up timers
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer)
        this.resizeDebounceTimer = null
      }

      // Clean up any remaining body styles
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }
})
</script>

<style scoped>
.project-workspace {
  display: grid;
  grid-template-columns: var(--nav-width, 300px) auto 1fr;
  grid-template-rows: 1fr;
  height: 100%;
  width: 100%;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --nav-width: 300px;
  --splitter-width: 4px;
}

.project-workspace.nav-collapsed {
  --nav-width: 0px;
  --splitter-width: 0px;
  grid-template-columns: 0px 0px 1fr;
}

/* Navigation Pane */
.navigation-pane {
  grid-column: 1;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-right: 1px solid #e1e4e8;
  overflow: hidden;
  min-width: 200px;
  max-width: 600px;
}

.project-toolbar {
  padding: 1rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #fff;
}

.project-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: #24292f;
}

.project-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toolbar-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.toolbar-btn:active {
  background-color: #e1e4e8;
}

/* Diagram List */
.diagram-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

available-projects {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #656d76;
}

.empty-state p {
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.diagram-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.diagram-item:hover {
  background-color: #f3f4f6;
}

.diagram-item.active {
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
}

.diagram-icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.diagram-name {
  flex: 1;
  font-size: 0.875rem;
  color: #24292f;
}

.modified-indicator {
  color: #f59e0b;
  font-weight: bold;
  margin-left: 0.25rem;
}

/* Pane Splitter */
.pane-splitter {
  grid-column: 2;
  width: var(--splitter-width, 4px);
  background-color: #e1e4e8;
  cursor: col-resize;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}

.project-workspace.nav-collapsed .pane-splitter {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.pane-splitter:hover {
  background-color: #c9d1d9;
}

.pane-splitter.dragging {
  background-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.splitter-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background-color: #8b949e;
  border-radius: 1px;
  transition: opacity 0.3s ease, background-color 0.2s ease;
}

.pane-splitter.dragging .splitter-handle {
  background-color: #ffffff;
  height: 60px;
}

.project-workspace.nav-collapsed .splitter-handle {
  opacity: 0;
}

/* Editor Pane */
.editor-pane {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #fff;
}

.nav-toggle {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
}

.nav-toggle-btn {
  padding: 0.5rem;
  border: 1px solid #d1d9e0;
  border-radius: 4px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  transition: all 0.2s ease;
}

.nav-toggle-btn:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background-color: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  overflow-x: auto;
  padding-left: 3rem;
  /* Space for nav toggle */
}

.editor-tab {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-right: 1px solid #e1e4e8;
  background-color: #f6f8fa;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
  min-width: 120px;
}

.editor-tab:hover {
  background-color: #f3f4f6;
}

.editor-tab.active {
  background-color: #fff;
  border-bottom: 2px solid #3b82f6;
}

.tab-title {
  flex: 1;
  font-size: 0.875rem;
  color: #24292f;
  margin-right: 0.5rem;
}

.tab-modified {
  color: #f59e0b;
  font-weight: bold;
  margin-right: 0.5rem;
}

.tab-close {
  background: none;
  border: none;
  color: #656d76;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.tab-close:hover {
  background-color: #f3f4f6;
  color: #24292f;
}

/* Tab Content */
.tab-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.empty-editor-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #f8f9fa;
}

.empty-message {
  text-align: center;
  color: #656d76;
}

.empty-message h3 {
  margin: 0 0 1rem 0;
  color: #24292f;
}

.empty-message p {
  margin: 0;
  font-size: 0.875rem;
}

/* Responsive Design */

/* Large Desktop (1200px+) */
@media (min-width: 1200px) {
  .project-workspace {
    --nav-width: 350px;
  }

  .navigation-pane {
    min-width: 250px;
    max-width: 500px;
  }

  .project-toolbar {
    padding: 1.25rem;
  }

  .project-name {
    font-size: 1.2rem;
  }
}

/* Desktop (992px - 1199px) */
@media (min-width: 992px) and (max-width: 1199px) {
  .project-workspace {
    --nav-width: 320px;
  }

  .navigation-pane {
    min-width: 220px;
    max-width: 450px;
  }
}

/* Tablet Landscape (768px - 991px) */
@media (min-width: 768px) and (max-width: 991px) {
  .project-workspace {
    --nav-width: 280px;
  }

  .navigation-pane {
    min-width: 200px;
    max-width: 400px;
  }

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

  .editor-tab {
    min-width: 110px;
    padding: 0.6rem 0.8rem;
  }

  .tab-title {
    font-size: 0.8rem;
  }
}

/* Tablet Portrait (576px - 767px) */
@media (max-width: 767px) {
  .project-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .project-workspace.nav-collapsed {
    grid-template-rows: 0fr 1fr;
  }

  .navigation-pane {
    grid-column: 1;
    grid-row: 1;
    max-height: 45vh;
    min-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e1e4e8;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .project-workspace.nav-collapsed .navigation-pane {
    max-height: 0;
    min-height: 0;
    opacity: 0;
    transform: translateY(-10px);
  }

  .pane-splitter {
    display: none;
  }

  .editor-pane {
    grid-column: 1;
    grid-row: 2;
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
  }

  .tab-bar {
    padding-left: 1rem;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .tab-bar::-webkit-scrollbar {
    height: 3px;
  }

  .tab-bar::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .tab-bar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .nav-toggle {
    position: relative;
    top: auto;
    left: auto;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: center;
  }

  .nav-toggle-btn {
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    border-radius: 6px;
  }

  .editor-tab {
    min-width: 110px;
    padding: 0.6rem 0.8rem;
  }

  .diagram-list {
    max-height: calc(45vh - 120px);
    overflow-y: auto;
  }
}

/* Mobile Landscape (481px - 575px) */
@media (max-width: 575px) and (orientation: landscape) {
  .project-workspace {
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr;
  }

  .project-workspace.nav-collapsed {
    grid-template-columns: 0fr 1fr;
  }

  .navigation-pane {
    grid-column: 1;
    grid-row: 1;
    max-height: 100vh;
    min-height: auto;
    width: 250px;
    border-right: 1px solid #e1e4e8;
    border-bottom: none;
  }

  .project-workspace.nav-collapsed .navigation-pane {
    width: 0;
    max-height: 100vh;
    transform: translateX(-10px);
  }

  .editor-pane {
    grid-column: 2;
    grid-row: 1;
  }

  .nav-toggle {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    margin-bottom: 0;
  }

  .nav-toggle-btn {
    padding: 0.4rem;
    font-size: 0.7rem;
  }

  .tab-bar {
    padding-left: 2.5rem;
  }
}

/* Mobile Portrait (320px - 480px) */
@media (max-width: 480px) {
  .project-toolbar {
    padding: 0.75rem;
  }

  .project-name {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .toolbar-btn {
    font-size: 0.7rem;
    padding: 0.35rem 0.4rem;
  }

  .diagram-item {
    padding: 0.5rem;
    margin-bottom: 0.2rem;
  }

  .diagram-name {
    font-size: 0.8rem;
  }

  .editor-tab {
    min-width: 90px;
    padding: 0.5rem 0.6rem;
  }

  .tab-title {
    font-size: 0.75rem;
  }

  .empty-message h3 {
    font-size: 1.1rem;
  }

  .empty-message p {
    font-size: 0.8rem;
  }

  .nav-toggle-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.7rem;
  }
}

/* Extra Small Mobile (max 319px) */
@media (max-width: 319px) {
  .project-toolbar {
    padding: 0.5rem;
  }

  .project-name {
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
  }

  .toolbar-btn {
    font-size: 0.65rem;
    padding: 0.3rem 0.35rem;
  }

  .editor-tab {
    min-width: 80px;
    padding: 0.4rem 0.5rem;
  }

  .tab-title {
    font-size: 0.7rem;
  }

  .diagram-item {
    padding: 0.4rem;
  }

  .diagram-name {
    font-size: 0.75rem;
  }
}

/* High DPI / Retina Display Adjustments */
@media (-webkit-min-device-pixel-ratio: 2),
(min-resolution: 192dpi) {
  .splitter-handle {
    width: 1px;
  }

  .pane-splitter {
    width: 2px;
  }

  .project-workspace {
    --splitter-width: 2px;
  }
}

/* Global splitter dragging state */
:global(body.splitter-dragging) {
  cursor: col-resize !important;
  user-select: none !important;
}

:global(body.splitter-dragging *) {
  cursor: col-resize !important;
  user-select: none !important;
}

/* Reduced Motion Preferences */
@media (prefers-reduced-motion: reduce) {

  .project-workspace,
  .navigation-pane,
  .pane-splitter,
  .splitter-handle,
  .toolbar-btn,
  .diagram-item,
  .editor-tab,
  .tab-close,
  .nav-toggle-btn {
    transition: none;
  }
}

/* Dialog Styles */
.conflict-dialog-overlay,
.create-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.conflict-dialog,
.create-dialog {
  background-color: #fff;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.conflict-dialog h3,
.create-dialog h3 {
  margin: 0 0 1rem 0;
  color: #24292f;
  font-size: 1.25rem;
}

.conflict-dialog p {
  margin: 0 0 1.5rem 0;
  color: #656d76;
  line-height: 1.5;
  white-space: pre-line;
}

.conflict-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.conflict-options button {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.conflict-options button:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.conflict-options .btn-rename {
  background-color: #0969da;
  color: #fff;
  border-color: #0969da;
}

.conflict-options .btn-rename:hover {
  background-color: #0860ca;
  border-color: #0860ca;
}

.conflict-options .btn-replace {
  background-color: #cf222e;
  color: #fff;
  border-color: #cf222e;
}

.conflict-options .btn-replace:hover {
  background-color: #a40e26;
  border-color: #a40e26;
}

/* Create Dialog Specific Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #24292f;
  font-weight: 600;
  font-size: 0.875rem;
}

.diagram-name-input,
.project-name-input,
.project-description-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: #fff;
  color: #24292f;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.diagram-name-input:focus,
.project-name-input:focus,
.project-description-input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.project-description-input {
  resize: vertical;
  min-height: 80px;
}

.input-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #656d76;
  line-height: 1.4;
}

.input-hint.error {
  color: #cf222e;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.dialog-actions button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  background-color: #f6f8fa;
  color: #24292f;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.dialog-actions button:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.dialog-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-actions button:disabled:hover {
  background-color: #f6f8fa;
  border-color: #d1d9e0;
}

.dialog-actions .btn-create {
  background-color: #0969da;
  color: #fff;
  border-color: #0969da;
}

.dialog-actions .btn-create:hover:not(:disabled) {
  background-color: #0860ca;
  border-color: #0860ca;
}

.dialog-actions .btn-cancel {
  background-color: #f6f8fa;
  color: #24292f;
  border-color: #d1d9e0;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .conflict-dialog {
    background-color: #1f2937;
    color: #f9fafb;
  }

  .conflict-dialog h3 {
    color: #f9fafb;
  }

  .conflict-dialog p {
    color: #d1d5db;
  }

  .conflict-options button {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .conflict-options button:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }

  .navigation-pane {
    background-color: #1f2937;
    border-right-color: #374151;
  }

  .project-toolbar {
    background-color: #111827;
    border-bottom-color: #374151;
  }

  .project-name {
    color: #f9fafb;
  }

  .toolbar-btn {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .toolbar-btn:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }

  .empty-state {
    color: #9ca3af;
  }

  .diagram-item {
    color: #f9fafb;
  }

  .diagram-item:hover {
    background-color: #374151;
  }

  .diagram-item.active {
    background-color: #1e40af;
    border-color: #3b82f6;
  }

  .pane-splitter {
    background-color: #374151;
  }

  .pane-splitter:hover {
    background-color: #4b5563;
  }

  .splitter-handle {
    background-color: #6b7280;
  }

  .editor-pane {
    background-color: #111827;
  }

  .nav-toggle-btn {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .nav-toggle-btn:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }

  .tab-bar {
    background-color: #1f2937;
    border-bottom-color: #374151;
  }

  .editor-tab {
    background-color: #1f2937;
    border-right-color: #374151;
    color: #f9fafb;
  }

  .editor-tab:hover {
    background-color: #374151;
  }

  .editor-tab.active {
    background-color: #111827;
  }

  .tab-close {
    color: #9ca3af;
  }

  .tab-close:hover {
    background-color: #374151;
    color: #f9fafb;
  }

  .empty-editor-state {
    background-color: #1f2937;
  }

  .empty-message {
    color: #9ca3af;
  }

  .empty-message h3 {
    color: #f9fafb;
  }
}

html,
body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  position: relative;
}

#app {
  height: 100%;
  width: 100%;
  position: relative;
}

.create-dialog-overlay,
.conflict-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  /* make sure it's above everything */
}
</style>