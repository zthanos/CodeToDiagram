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
          <button v-if="currentProject" class="toolbar-btn" @click="createDiagram" title="Create New Diagram">
            ➕ New Diagram
          </button>

        </div>
      </div>

      <div v-if="!currentProject" class="available-projects">
        <h4>Available Projects</h4>
        <div v-if="isLoadingProjects">
          <SkeletonLoader type="list" :count="3" />
        </div>
        <div v-else-if="availableProjects.length === 0" class="empty-state">
          <p>No projects available</p>
          <p>Create a new project to get started</p>
        </div>
        <ul v-else>
          <li v-for="project in availableProjects" :key="project.id" @click="selectProject(project.id)">
            {{ project.name }} - {{ project.description }}
          </li>
        </ul>
      </div>
      <div class="diagram-list">
        <div v-if="!currentProject" class="empty-state">
          <p>Create a project to get started</p>
        </div>
        <div v-else-if="loading.isLoading && currentProject.diagrams.length === 0" class="loading-state">
          <SkeletonLoader type="list" :count="2" />
        </div>
        <div v-else-if="currentProject.diagrams.length === 0" class="empty-state">
          <p>No diagrams in this project</p>
          <p>Add or create diagrams to begin</p>
        </div>
        <div v-else>
          <div v-for="diagram in currentProject.diagrams" :key="diagram.id || diagram.title" class="diagram-item"
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
        <div v-for="tab in openTabs" :key="tab.id" class="editor-tab" :class="{
          active: activeTabId === tab.id,
          'has-changes': tab.isModified
        }" @click="switchToTab(tab.id)">
          <span class="tab-title">{{ tab.title }}</span>
          <span class="tab-status-indicator">
            <span v-if="tab.isModified" class="status-modified" title="Unsaved changes">●</span>
            <span v-else class="status-saved" title="Saved">✓</span>
          </span>
          <button class="tab-close" @click.stop="closeTab(tab.id)"
            :title="tab.isModified ? 'Close (unsaved changes)' : 'Close'">×</button>
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
        <div v-else style="height: 100%;">
          <!-- Active Editor Instance -->
          <MermaidRenderer v-for="tab in openTabs" :key="tab.id" v-show="activeTabId === tab.id" :theme="theme"
            :diagram-id="tab.diagramId" @update:theme="$emit('update:theme', $event)"
            @content-changed="handleContentChanged(tab.id, $event)" ref="editorInstances"
            @request-save="openSaveDialog" />


          <SaveDiagramDialog ref="saveDialogRef" :projectId="currentProject?.id || ''" :diagramId="selectedDiagramId"
            :content="pendingSaveContent" @saved="handleDiagramSaved" @cancelled="showCreateDialog = false" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import MermaidRenderer from './MermaidRenderer.vue'
import SaveDiagramDialog from './SaveDiagramDialog.vue'
import { Project, Diagram } from '../types'
import NotificationService from '../services/NotificationService'
import { useDialog } from '../composables/useDialog'
import { useLoading } from '../composables/useLoading'
import { useComponentErrorHandling } from '../composables/useErrorHandling'

import SkeletonLoader from './SkeletonLoader.vue'


interface Tab {
  id: string
  diagramId: number | null
  title: string
  isModified: boolean
  content: string
  isUntitled?: boolean // for new diagrams not yet saved with proper names
  isInitialLoad?: boolean // to prevent marking as modified during initial load
}

const props = defineProps<{ theme: string }>()
const emit = defineEmits(['update:theme'])
const root = ref<HTMLElement | null>(null)
const navigationCollapsed = ref(false)
const navigationWidth = ref(300)
const currentProject = ref<Project | null>(null)
const selectedDiagramId = ref<number | null>(null)
const openTabs = ref<Tab[]>([])
const activeTabId = ref<string | null>(null)
const availableProjects = ref<Project[]>([])
const isLoadingProjects = ref(false)
const pendingSaveContent = ref('')
const showCreateDialog = ref(false)
const tabCounter = ref(0)
const nameInput = ref("")
const saveDialogRef = ref(null)
const dialog = useDialog()
const loading = useLoading('workspace')
const errorHandler = useComponentErrorHandling('ProjectWorkspace')



onMounted(() => {
  initializeWorkspace()
  fetchAvailableProjects()
  setupBeforeUnloadHandler()
})

onBeforeUnmount(() => {
  cleanupEventListeners()
  removeBeforeUnloadHandler()
})

function initializeWorkspace() {
  NotificationService.info('Workspace', 'Initializing workspace...')
}

async function fetchAvailableProjects() {
  try {
    console.log('Fetching available projects...')

    // Set loading state for projects
    isLoadingProjects.value = true

    const projectManager = await import('../services/ProjectManager')
    const manager = projectManager.ProjectManager.getInstance()

    console.log('Loading project list from backend...')
    await manager.loadProjectList()

    const projects = manager.getProjectList()
    console.log('Projects loaded from manager:', projects)

    availableProjects.value = projects
    console.log('availableProjects.value updated:', availableProjects.value)

    if (availableProjects.value.length > 0) {
      NotificationService.success('Projects Loaded', `Found ${availableProjects.value.length} available projects`)
    } else {
      console.log('No projects found')
      NotificationService.info('No Projects', 'No projects found. Create a new project to get started.')
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    NotificationService.error('Load Failed', 'Failed to load available projects')
  } finally {
    // Always clear loading state
    isLoadingProjects.value = false
    console.log('Loading state cleared, isLoadingProjects:', isLoadingProjects.value)
  }
}

function cleanupEventListeners() {
  // Cleanup complete - no notification needed for internal operations
}

function updateCSSCustomProperty(property: string, value: string) {
  if (root.value) {
    root.value.style.setProperty(property, value)
  }
}

function handleContentChanged(tabId: string, newContent: string) {
  console.log('handleContentChanged called for tab:', tabId, 'content length:', newContent.length)
  const tab = openTabs.value.find(t => t.id === tabId)
  if (tab) {
    console.log('Tab found:', tab.title, 'diagramId:', tab.diagramId)
    tab.content = newContent
    
    // Don't mark as modified if this is the initial load
    if (tab.isInitialLoad) {
      console.log('Initial load detected, not marking as modified')
      tab.isInitialLoad = false // Clear the flag after first content change
    } else {
      tab.isModified = true
    }
    // No auto-save - only manual save when user explicitly saves
  }
}

function toggleNavigation() {
  navigationCollapsed.value = !navigationCollapsed.value
  updateCSSCustomProperty('--nav-width', navigationCollapsed.value ? '0px' : `${navigationWidth.value}px`)
  nextTick(() => {
    // Editor resize handled automatically - no notification needed
  })
}

function switchToTab(tabId: string) {
  activeTabId.value = tabId
  nextTick(() => {
    // Editor resize handled automatically - no notification needed
  })
}

async function closeTab(tabId: string) {
  const tab = openTabs.value.find(t => t.id === tabId)
  if (!tab) return

  // Check for unsaved changes
  if (tab.isModified) {
    const shouldClose = await dialog.confirm(
      'Unsaved Changes',
      `"${tab.title}" has unsaved changes. Do you want to close it anyway?`,
      'warning'
    )

    if (!shouldClose) {
      return // User cancelled closing
    }
  }

  // No auto-save cleanup needed since we removed auto-save

  // Remove tab
  const index = openTabs.value.findIndex(t => t.id === tabId)
  if (index !== -1) {
    openTabs.value.splice(index, 1)
    if (activeTabId.value === tabId) {
      activeTabId.value = openTabs.value.length ? openTabs.value[0].id : null
    }
  }
}

async function selectProject(projectId: string) {
  await errorHandler.withErrorHandling(async () => {
    await loading.withLoading(async () => {
      const projectManager = await import('../services/ProjectManager');
      const manager = projectManager.ProjectManager.getInstance();
      const project = await manager.loadProject(projectId);
      await switchToProject(project);
      NotificationService.success('Project Loaded', `Successfully loaded project "${project.name}"`)
    }, 'Loading project...')
  }, 'select_project')
}

async function switchToProject(project: any) {
  try {
    const projectManager = await import('../services/ProjectManager');
    const manager = projectManager.ProjectManager.getInstance();

    // Load full project outline from backend
    const fullProject = await manager.loadProject(project.id);

    // Close all current tabs
    closeAllTabs();

    // Clear current selection
    selectedDiagramId.value = null;

    // Set new current project (with full data)
    currentProject.value = fullProject;

    // Update navigation pane and workspace layout
    nextTick(() => {
      const layout = fullProject.metadata?.workspaceLayout;

      if (layout?.navigationPaneWidth) {
        navigationWidth.value = layout.navigationPaneWidth;
        updateCSSCustomProperty('--nav-width', `${layout.navigationPaneWidth}px`);
      }

      if (typeof layout?.navigationPaneCollapsed === 'boolean') {
        navigationCollapsed.value = layout.navigationPaneCollapsed;
      }

      if (layout?.lastOpenedTabs?.length > 0) {
        restoreProjectTabs(layout.lastOpenedTabs, layout.activeTabId);
      }

    });

    // Update ProjectManager current project
    manager.setCurrentProject(fullProject);

  } catch (error) {
    NotificationService.error('Switch Failed', 'Failed to switch to project', {
      actions: [{
        label: 'Retry',
        action: () => switchToProject(project),
        style: 'primary'
      }]
    })
    throw error;
  }
}

async function restoreProjectTabs(tabDiagramIds: any, activeTabId: any) {
  try {
    for (const diagramId of tabDiagramIds) {
      const diagram = currentProject.value?.diagrams.find(d => d.id === diagramId);
      if (diagram) {
        openDiagramInTab(diagram);
      }
    }

    // Set active tab if specified
    if (activeTabId) {
      const activeTab = openTabs.value.find(t => t.id === activeTabId);
      if (activeTab) {
        switchToTab(activeTab.id);
      }
    }
  } catch (error) {
    NotificationService.warning('Tab Restore', 'Some tabs could not be restored from previous session')
  }
}

function selectDiagram(diagramId: number | null) {
  selectedDiagramId.value = diagramId
  const diagram = currentProject.value?.diagrams.find(d => d.id === diagramId)
  if (diagram) {
    openDiagramInTab(diagram)
  }
}
function openDiagramInTab(diagram: Diagram) {
  // Check if tab already exists
  const existingTab = openTabs.value.find(tab => tab.diagramId === diagram.id);
  if (existingTab) {
    switchToTab(existingTab.id);
    return;
  }

  // Increment tabCounter safely
  tabCounter.value++;

  // Check if this is an untitled diagram
  const isUntitled = diagram.title.startsWith('Untitled Diagram');

  // Clean diagram content to remove problematic comments that break Mermaid parsing
  let cleanContent = diagram.content || '';
  if (cleanContent.includes('// Start creating your diagram here')) {
    cleanContent = cleanContent.replace('// Start creating your diagram here\n', '');
    console.log('Cleaned diagram content by removing problematic comment');
  }

  // Create new tab
  const newTab: Tab = {
    id: `tab-${tabCounter.value}`,
    diagramId: diagram.id,
    title: diagram.title,
    content: cleanContent,
    isModified: false,
    isUntitled: isUntitled,
    isInitialLoad: true // Mark as initial load to prevent modified flag
  };

  openTabs.value.push(newTab);
  switchToTab(newTab.id);
}

function showNotification(type: string, title: string, message: string) {
  switch (type) {
    case 'success':
      NotificationService.success(title, message)
      break
    case 'error':
      NotificationService.error(title, message)
      break
    case 'warning':
      NotificationService.warning(title, message)
      break
    case 'info':
    default:
      NotificationService.info(title, message)
      break
  }
}
// Project management methods (stubs for now)
async function createProject() {
  try {
    // Show project creation dialog
    const projectData = await showCreateProjectDialog();

    if (!projectData) {
      return; // User cancelled
    }

    // Validate project name
    const validationResult = validateProjectName(projectData.name);
    if (!validationResult.isValid) {
      showNotification('error', 'Invalid Name', validationResult.message);
      return;
    }

    // Create new project using ProjectManager with loading state
    await loading.withLoading(async () => {
      const projectManager = await import('../services/ProjectManager');
      const manager = projectManager.ProjectManager.getInstance();

      const newProject = await manager.createProject(projectData.id, projectData.name, projectData.description);

      // Switch to the new project
      await switchToProject(newProject);

      // Show success notification
      showNotification('success', 'Project Created',
        `"${newProject.name}" has been created and is now active`);
    }, 'Creating project...');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create project'
    showNotification('error', 'Creation Failed', errorMessage);
  }
}

function validateProjectName(name: string) {
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
}

async function showCreateProjectDialog() {
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
      const validation = validateProjectName(value);

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

      if (name && validateProjectName(name).isValid) {
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
}


async function createDiagram() {
  if (!currentProject.value) {
    showNotification('error', 'No Project', 'Please create or load a project first');
    return;
  }

  try {
    // Generate temporary title for new diagram
    const existingCount = currentProject.value.diagrams.length;
    const temporaryTitle = `Untitled Diagram ${existingCount + 1}`;

    // Create diagram locally (not saved to backend yet)
    const newDiagram: Diagram = {
      id: null, // null indicates it's not saved yet
      projectId: currentProject.value.id,
      title: temporaryTitle,
      content: 'graph TD\n    A[Start] --> B[End]',
      type: 'flowchart',
      createdAt: new Date(),
      lastModified: new Date(),
      isModified: false
    };

    // Add to local project state (but not saved to backend)
    currentProject.value.diagrams.push(newDiagram);

    // Select the new diagram in the navigation list
    // For new diagrams with id: null, we can use a special identifier
    selectedDiagramId.value = null; // This will deselect any existing diagram

    // Open in new tab immediately
    openDiagramInTab(newDiagram);

    // Show success notification
    showNotification('success', 'Diagram Created',
      `"${temporaryTitle}" has been created. It will be saved when you make changes or save manually.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create diagram'
    showNotification('error', 'Creation Failed', errorMessage);
  }
}


async function handleDiagramSaved(savedDiagram: any) {
  // Find the active tab
  const tab = openTabs.value.find(t => t.id === activeTabId.value);

  if (tab) {
    // Update the title (new name from backend)
    tab.title = savedDiagram.title;

    // Update diagram ID if it was null (new diagram)
    if (tab.diagramId === null && savedDiagram.id) {
      tab.diagramId = savedDiagram.id;
    }

    // Clear the modified flag and untitled status
    tab.isModified = false;
    tab.isUntitled = false;
  }

  // Update the diagram in the current project
  const projectDiagram = currentProject.value?.diagrams.find(d => d.id === tab?.diagramId);
  if (projectDiagram) {
    projectDiagram.title = savedDiagram.title;
    projectDiagram.id = savedDiagram.id;
    if (savedDiagram.content !== undefined) {
      projectDiagram.content = savedDiagram.content;
    }
  }

  // Close the dialog
  showCreateDialog.value = false;

  // Update selected diagram ID to match the saved diagram
  selectedDiagramId.value = savedDiagram.id;
}


async function openSaveDialog(content: string) {
  if (activeTabId.value && currentProject.value) {
    const diagram = openTabs.value.find(tab => tab.id === activeTabId.value);

    pendingSaveContent.value = content
    const saveDialog = saveDialogRef.value as any;
    if (saveDialog && saveDialog.saveData) {
      saveDialog.saveData(diagram?.diagramId, diagram?.title || '', content);
    }

    try {
      const projectManager = await import('../services/ProjectManager');
      const manager = projectManager.ProjectManager.getInstance();
      currentProject.value = await manager.loadProject(currentProject.value.id);
    } catch (error) {
      NotificationService.error('Reload Failed', 'Failed to reload project after save')
    }
  }
}
function closeAllTabs() {
  // Close all tabs without prompting (project switch scenario)
  openTabs.value = [];
  activeTabId.value = null;
}

// Pane splitter functionality
function startSplitterDrag(event: MouseEvent) {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = navigationWidth.value;

  function handleMouseMove(e: MouseEvent) {
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(600, startWidth + deltaX));
    navigationWidth.value = newWidth;
    updateCSSCustomProperty('--nav-width', `${newWidth}px`);
  }

  function handleMouseUp() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Beforeunload handler for unsaved changes warning
let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null;

function setupBeforeUnloadHandler() {
  beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    // Check if any tabs have unsaved changes
    const hasUnsavedChanges = openTabs.value.some(tab => tab.isModified);

    if (hasUnsavedChanges) {
      // Standard way to show browser's beforeunload dialog
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return 'You have unsaved changes. Are you sure you want to leave?';
    }
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);
}

function removeBeforeUnloadHandler() {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
}

</script>

<style scoped>
/* Tab status indicators */
.tab-status-indicator {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
  font-size: 0.75rem;
}

.status-saving {
  color: #0366d6;
  animation: spin 1s linear infinite;
}

.status-error {
  color: #d73a49;
}

.status-modified {
  color: #f66a0a;
}

.status-saved {
  color: #28a745;
  opacity: 0.7;
}

/* Tab styling enhancements */
.editor-tab {
  position: relative;
  transition: all 0.2s ease;
}

.editor-tab.saving {
  background-color: rgba(3, 102, 214, 0.05);
  border-left: 2px solid #0366d6;
}

.editor-tab.error {
  background-color: rgba(215, 58, 73, 0.05);
  border-left: 2px solid #d73a49;
}

.editor-tab.has-changes {
  background-color: rgba(246, 106, 10, 0.05);
  border-left: 2px solid #f66a0a;
}

/* Spin animation for saving indicator */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Enhanced tab close button */
.tab-close {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.tab-close:hover {
  opacity: 1;
}

.editor-tab.has-changes .tab-close {
  color: #f66a0a;
}

.editor-tab.error .tab-close {
  color: #d73a49;
}

/* Project workspace layout */
.project-workspace {
  display: grid;
  grid-template-columns: var(--nav-width, 300px) auto 1fr;
  grid-template-areas: "nav splitter editor";
  height: 100vh;
  transition: grid-template-columns 0.3s ease;
}

.project-workspace.nav-collapsed {
  grid-template-columns: 0 0 1fr;
}

.navigation-pane {
  grid-area: nav;
  background-color: #f6f8fa;
  border-right: 1px solid #d1d5da;
  overflow-y: auto;
}

.pane-splitter {
  grid-area: splitter;
  width: 4px;
  background-color: #d1d5da;
  cursor: col-resize;
  position: relative;
}

.pane-splitter:hover {
  background-color: #0366d6;
}

.splitter-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 20px;
  background-color: #586069;
  border-radius: 1px;
}

.editor-pane {
  grid-area: editor;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Navigation toggle */
.nav-toggle {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.nav-toggle-btn {
  background: #f6f8fa;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.75rem;
}

.nav-toggle-btn:hover {
  background: #e1e4e8;
}

/* Tab bar */
.tab-bar {
  display: flex;
  background-color: #f6f8fa;
  border-bottom: 1px solid #d1d5da;
  overflow-x: auto;
  padding-top: 2rem;
  /* Space for nav toggle */
}

.editor-tab {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5da;
  border-bottom: none;
  background-color: #ffffff;
  cursor: pointer;
  white-space: nowrap;
  min-width: 120px;
  max-width: 200px;
}

.editor-tab:not(:first-child) {
  border-left: none;
}

.editor-tab.active {
  background-color: #ffffff;
  border-bottom: 1px solid #ffffff;
  position: relative;
  z-index: 1;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.875rem;
}

.tab-close {
  margin-left: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.tab-close:hover {
  background-color: #e1e4e8;
}

/* Tab content */
.tab-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.empty-editor-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #fafbfc;
}

.empty-message {
  text-align: center;
  color: #586069;
}

.empty-message h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.empty-message p {
  margin: 0;
  font-size: 0.875rem;
}
</style>
