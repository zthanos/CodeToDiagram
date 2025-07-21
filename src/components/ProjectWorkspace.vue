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
        <div v-else style="height: 100%;">
          <!-- Active Editor Instance -->
          <MermaidRenderer v-for="tab in openTabs" :key="tab.id" v-show="activeTabId === tab.id" :theme="theme"
            :diagram-id="tab.diagramId" @update:theme="$emit('update:theme', $event)"
            @content-changed="handleContentChanged(tab.id, $event)" ref="editorInstances"
            @request-save="openSaveDialog" />


          <SaveDiagramDialog ref="saveDialogRef" :projectId="currentProject?.id" :diagramId="selectedDiagramId"
            :content="pendingSaveContent.value" @saved="handleDiagramSaved" @cancelled="showCreateDialog = false" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import MermaidRenderer from './MermaidRenderer.vue'
import SaveDiagramDialog from './SaveDiagramDialog.vue'
import { Project, Diagram } from '../types';


interface Tab {
  id: string
  diagramId: number
  title: string
  isModified: boolean
  content: string
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
const pendingSaveContent = ref('')
const showCreateDialog = ref(false)
const tabCounter = ref(0)
const nameInput = ref("")
const saveDialogRef = ref(null)

onMounted(() => {
  initializeWorkspace()
  fetchAvailableProjects()
})

onBeforeUnmount(() => {
  cleanupEventListeners()
})

function initializeWorkspace() {
  console.log('Initialize workspace')
}

async function fetchAvailableProjects() {
  console.log('Fetch projects')
  try {
    const projectManager = await import('../services/ProjectManager')
    const manager = projectManager.ProjectManager.getInstance()
    await manager.loadProjectList()
    availableProjects.value = manager.getProjectList()
  } catch (error) {
    console.error('Failed to load available projects:', error)
  }
}

function cleanupEventListeners() {
  console.log('Cleanup listeners')
}

function updateCSSCustomProperty(property: string, value: string) {
  if (root.value) {
    root.value.style.setProperty(property, value)
  }
}

function handleContentChanged(tabId: string, newContent: string) {
  const tab = openTabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.content = newContent
    tab.isModified = true
  }
}

function toggleNavigation() {
  navigationCollapsed.value = !navigationCollapsed.value
  updateCSSCustomProperty('--nav-width', navigationCollapsed.value ? '0px' : `${navigationWidth.value}px`)
  nextTick(() => {
    console.log('Editor resize (placeholder)')
  })
}

function switchToTab(tabId: string) {
  activeTabId.value = tabId
  nextTick(() => {
    console.log('Editor resize (placeholder)')
  })
}

function closeTab(tabId: string) {
  const index = openTabs.value.findIndex(t => t.id === tabId)
  if (index !== -1) {
    openTabs.value.splice(index, 1)
    if (activeTabId.value === tabId) {
      activeTabId.value = openTabs.value.length ? openTabs.value[0].id : null
    }
  }
}

async function selectProject(projectId: string) {
  try {
    const projectManager = await import('../services/ProjectManager');
    const manager = projectManager.ProjectManager.getInstance();
    const project = await manager.loadProject(projectId);
    await switchToProject(project);
  } catch (error) {
    console.error('Failed to load project:', error);
  }
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
    console.error('Error switching to project:', error);
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
    console.warn('Error restoring project tabs:', error);
  }
}

function selectDiagram(diagramId: number) {
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

  // Create new tab
  const newTab: Tab = {
    id: `tab-${tabCounter.value}`,
    diagramId: diagram.id,
    title: diagram.title,
    content: diagram.content || '',  // αν το πεδίο λέγεται mermaid_code, βάλε diagram.mermaid_code
    isModified: false
  };

  openTabs.value.push(newTab);
  switchToTab(newTab.id);
}

function showNotification(type: string, title: string, message: string) {
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

    // Create new project using ProjectManager
    const projectManager = await import('../services/ProjectManager');
    const manager = projectManager.ProjectManager.getInstance();

    const newProject = await manager.createProject(projectData.id, projectData.name, projectData.description);

    // Switch to the new project
    await switchToProject(newProject);

    // Show success notification
    showNotification('success', 'Project Created',
      `"${newProject.name}" has been created and is now active`);

  } catch (error) {
    console.error('Error creating project:', error);
    showNotification('error', 'Creation Failed',
      error.message || 'Failed to create project');
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
    const diagramName = "undefined"
    // Create new diagram with default content
    const newDiagram: Diagram = {
      id: null,
      projectId: currentProject.value.id,
      title: diagramName,
      content: "",
      type: "flowchart",
    };

    // Add to current project
    currentProject.value.diagrams.push(newDiagram)
    

    // Open in new tab
    openDiagramInTab(newDiagram);

    // Show success notification
    showNotification('success', 'Diagram Created',
      `"${diagramName}" has been created and opened for editing`);

  } catch (error) {
    console.error('Error creating diagram:', error);
    if (error instanceof Error) {
      showNotification('error', 'Creation Failed',
        error.message || 'Failed to create diagram');
    }
  }
}


async function handleDiagramSaved(savedDiagram: any) {
  // Βρες το active tab
  const tab = openTabs.value.find(t => t.id === activeTabId.value);

  if (tab) {
    // Ενημέρωσε το title (νέο όνομα από backend)
    tab.title = savedDiagram.title;

    // // Ενημέρωσε το content (αν το backend επέστρεψε νέο περιεχόμενο, αλλιώς κράτα το δικό σου)
    // if (savedDiagram.content !== undefined) {
    //   tab.content = savedDiagram.content;
    // }

    // Καθάρισε το modified flag
    tab.isModified = false;
  }

  // Ενημέρωσε το diagram και μέσα στο currentProject (αν υπάρχει)
  const projectDiagram = currentProject.value?.diagrams.find(d => d.id === tab?.diagramId);
  if (projectDiagram) {
    projectDiagram.title = savedDiagram.title || savedDiagram.name || projectDiagram.title;
    if (savedDiagram.content !== undefined) {
      projectDiagram.content = savedDiagram.content;
    }
  }

  // Κλείσε το dialog
  showCreateDialog.value = false;

  // Εμφάνισε ειδοποίηση
  // emitNotification('Diagram saved successfully', 'success', '✅');
}


async function openSaveDialog(content: string) {
  if (activeTabId.value) {
    const diagram = openTabs.value.find(tab => tab.id === activeTabId.value);
    
    console.log(content)
    pendingSaveContent.value = content
    saveDialogRef.value?.saveData(diagram.diagramId, diagram?.title, content)
    const manager = projectManager.ProjectManager.getInstance();
    currentProject.value = await manager.loadProject(currentProject.value?.id)
  }
}
function closeAllTabs() {
  // Close all tabs without prompting (project switch scenario)
  openTabs.value = [];
  activeTabId.value = null;
}

</script>

<style scoped>
/* Optional: Add your styles here */
</style>
