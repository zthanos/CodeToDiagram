<template>
  <div class="diagrams-workspace" :class="{ 'nav-collapsed': navigationCollapsed }">
    <!-- Navigation Pane (Left) -->
    <div class="navigation-pane" v-show="!navigationCollapsed">
      <div class="diagram-toolbar">
        <div class="project-name">
          {{ project?.name || 'No Project' }}
        </div>
        <div class="toolbar-actions">
          <button class="toolbar-btn" @click="createDiagram" title="Create New Diagram">
            ➕ New Diagram
          </button>
        </div>
      </div>

      <div class="diagram-list">
        <div v-if="loading.isLoading && project.diagrams.length === 0" class="loading-state">
          <SkeletonLoader type="list" :count="2" />
        </div>
        <div v-else-if="project.diagrams.length === 0" class="empty-state">
          <p>No diagrams in this project</p>
          <p>Add or create diagrams to begin</p>
        </div>
        <div v-else>
          <div v-for="diagram in project.diagrams" :key="diagram.id || diagram.title" class="diagram-item"
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
            <h3>Welcome to SO Assistant</h3>
            <p>Create or select a diagram to get started</p>
          </div>
        </div>
        <div v-else style="height: 100%;">
          <!-- Active Editor Instance -->
          <MermaidRenderer v-for="tab in openTabs" :key="tab.id" v-show="activeTabId === tab.id" :theme="theme"
            :diagram-id="tab.diagramId" @update:theme="$emit('update:theme', $event)"
            @content-changed="handleContentChanged(tab.id, $event)" ref="editorInstances"
            @request-save="openSaveDialog" />

          <SaveDiagramDialog ref="saveDialogRef" :projectId="project?.id || ''" :diagramId="selectedDiagramId"
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
import SkeletonLoader from './SkeletonLoader.vue'
import { Project, Diagram } from '../types/project'
import NotificationService from '../services/NotificationService'
import { useDialog } from '../composables/useDialog'
import { useLoading } from '../composables/useLoading'
import { useComponentErrorHandling } from '../composables/useErrorHandling'

interface Tab {
  id: string
  diagramId: number | null
  title: string
  isModified: boolean
  content: string
  isUntitled?: boolean
  isInitialLoad?: boolean
}

const props = defineProps<{
  project: Project
  theme: string
}>()

const emit = defineEmits<{
  (e: 'update:theme', theme: string): void
  (e: 'project-updated', project: Project): void
}>()

// State
const navigationCollapsed = ref(false)
const navigationWidth = ref(300)
const selectedDiagramId = ref<number | null>(null)
const openTabs = ref<Tab[]>([])
const activeTabId = ref<string | null>(null)
const pendingSaveContent = ref('')
const showCreateDialog = ref(false)
const tabCounter = ref(0)
const saveDialogRef = ref(null)

// Composables
const dialog = useDialog()
const loading = useLoading('diagrams-workspace')
const errorHandler = useComponentErrorHandling('DiagramsWorkspace')

// Lifecycle
onMounted(() => {
  initializeWorkspace()
  setupBeforeUnloadHandler()
})

onBeforeUnmount(() => {
  cleanupEventListeners()
  removeBeforeUnloadHandler()
})

// Methods
async function initializeWorkspace() {
  await errorHandler.withErrorHandling(async () => {
    await loading.withLoading(async () => {
      // Initialize workspace
      NotificationService.info('Diagrams', 'Diagrams workspace ready')
    }, 'Initializing diagrams workspace...')
  }, 'initialize_workspace')
}

function cleanupEventListeners() {
  // Cleanup complete - no notification needed for internal operations
}

function updateCSSCustomProperty(property: string, value: string) {
  const root = document.documentElement
  root.style.setProperty(property, value)
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

  // Remove tab
  const index = openTabs.value.findIndex(t => t.id === tabId)
  if (index !== -1) {
    openTabs.value.splice(index, 1)
    if (activeTabId.value === tabId) {
      activeTabId.value = openTabs.value.length ? openTabs.value[0].id : null
    }
  }
}

function selectDiagram(diagramId: number | null) {
  selectedDiagramId.value = diagramId
  const diagram = props.project?.diagrams.find(d => d.id === diagramId)
  if (diagram) {
    openDiagramInTab(diagram)
  }
}

function openDiagramInTab(diagram: Diagram) {
  // Check if tab already exists
  const existingTab = openTabs.value.find(tab => tab.diagramId === diagram.id)
  if (existingTab) {
    switchToTab(existingTab.id)
    return
  }

  // Increment tabCounter safely
  tabCounter.value++

  // Check if this is an untitled diagram
  const isUntitled = diagram.title.startsWith('Untitled Diagram')

  // Clean diagram content to remove problematic comments that break Mermaid parsing
  let cleanContent = diagram.content || ''
  if (cleanContent.includes('// Start creating your diagram here')) {
    cleanContent = cleanContent.replace('// Start creating your diagram here\n', '')
    console.log('Cleaned diagram content by removing problematic comment')
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
  }

  openTabs.value.push(newTab)
  switchToTab(newTab.id)
}

async function createDiagram() {
  if (!props.project) {
    NotificationService.error('No Project', 'Please create or load a project first')
    return
  }

  try {
    // Generate temporary title for new diagram
    const existingCount = props.project.diagrams.length
    const temporaryTitle = `Untitled Diagram ${existingCount + 1}`

    // Create diagram locally (not saved to backend yet)
    const newDiagram: Diagram = {
      id: null, // null indicates it's not saved yet
      projectId: props.project.id,
      title: temporaryTitle,
      content: 'graph TD\n    A[Start] --> B[End]',
      type: 'flowchart',
      createdAt: new Date(),
      lastModified: new Date(),
      isModified: false
    }

    // Add to local project state (but not saved to backend)
    const updatedProject = { ...props.project }
    updatedProject.diagrams.push(newDiagram)
    emit('project-updated', updatedProject)

    // Clear current selection
    selectedDiagramId.value = null

    // Open in new tab immediately
    openDiagramInTab(newDiagram)

    // Show success notification
    NotificationService.success('Diagram Created',
      `"${temporaryTitle}" has been created. It will be saved when you make changes or save manually.`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create diagram'
    NotificationService.error('Creation Failed', errorMessage)
  }
}

async function handleDiagramSaved(savedDiagram: any) {
  // Find the active tab
  const tab = openTabs.value.find(t => t.id === activeTabId.value)

  if (tab) {
    // Update the title (new name from backend)
    tab.title = savedDiagram.title

    // Update diagram ID if it was null (new diagram)
    if (tab.diagramId === null && savedDiagram.id) {
      tab.diagramId = savedDiagram.id
    }

    // Clear the modified flag and untitled status
    tab.isModified = false
    tab.isUntitled = false
  }

  // Update the diagram in the current project
  const updatedProject = { ...props.project }
  const projectDiagram = updatedProject.diagrams.find(d => d.id === tab?.diagramId)
  if (projectDiagram) {
    projectDiagram.title = savedDiagram.title
    projectDiagram.id = savedDiagram.id
    if (savedDiagram.content !== undefined) {
      projectDiagram.content = savedDiagram.content
    }
  }

  // Emit updated project
  emit('project-updated', updatedProject)

  // Close the dialog
  showCreateDialog.value = false

  // Update selected diagram ID to match the saved diagram
  selectedDiagramId.value = savedDiagram.id
}

async function openSaveDialog(content: string) {
  if (activeTabId.value && props.project) {
    const diagram = openTabs.value.find(tab => tab.id === activeTabId.value)

    pendingSaveContent.value = content
    const saveDialog = saveDialogRef.value as any
    if (saveDialog && saveDialog.saveData) {
      saveDialog.saveData(diagram?.diagramId, diagram?.title || '', content)
    }

    try {
      const projectManager = await import('../services/ProjectManager')
      const manager = projectManager.ProjectManager.getInstance()
      const reloadedProject = await manager.loadProject(props.project.id)
      emit('project-updated', reloadedProject)
    } catch (error) {
      NotificationService.error('Reload Failed', 'Failed to reload project after save')
    }
  }
}

function closeAllTabs() {
  // Close all tabs without prompting (project switch scenario)
  openTabs.value = []
  activeTabId.value = null
}

// Pane splitter functionality
function startSplitterDrag(event: MouseEvent) {
  event.preventDefault()

  const startX = event.clientX
  const startWidth = navigationWidth.value

  function handleMouseMove(e: MouseEvent) {
    const deltaX = e.clientX - startX
    const newWidth = Math.max(200, Math.min(600, startWidth + deltaX))
    navigationWidth.value = newWidth
    updateCSSCustomProperty('--nav-width', `${newWidth}px`)
  }

  function handleMouseUp() {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Beforeunload handler for unsaved changes warning
let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null

function setupBeforeUnloadHandler() {
  beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    // Check if any tabs have unsaved changes
    const hasUnsavedChanges = openTabs.value.some(tab => tab.isModified)

    if (hasUnsavedChanges) {
      // Standard way to show browser's beforeunload dialog
      event.preventDefault()
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      return 'You have unsaved changes. Are you sure you want to leave?'
    }
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)
}

function removeBeforeUnloadHandler() {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
}

// Expose methods for parent component
defineExpose({
  closeAllTabs,
  openDiagramInTab,
  selectDiagram
})
</script>

<style scoped>
/* Tab status indicators */
.tab-status-indicator {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
  font-size: 0.75rem;
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

.editor-tab.has-changes {
  background-color: rgba(246, 106, 10, 0.05);
  border-left: 2px solid #f66a0a;
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

/* Diagrams workspace layout */
.diagrams-workspace {
  display: grid;
  grid-template-columns: var(--nav-width, 300px) auto 1fr;
  grid-template-areas: "nav splitter editor";
  height: 100vh;
  transition: grid-template-columns 0.3s ease;
}

.diagrams-workspace.nav-collapsed {
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

/* Diagram toolbar */
.diagram-toolbar {
  padding: 1rem;
  border-bottom: 1px solid #d1d5da;
  background-color: #ffffff;
}

.project-name {
  font-weight: 600;
  color: #24292f;
  margin-bottom: 0.5rem;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.toolbar-btn {
  background: #f6f8fa;
  border: 1px solid #d1d5da;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover {
  background: #e1e4e8;
}

/* Diagram list */
.diagram-list {
  padding: 1rem;
}

.diagram-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.diagram-item:hover {
  background-color: #f6f8fa;
}

.diagram-item.active {
  background-color: #e1f5fe;
  border-left: 3px solid #0366d6;
}

.diagram-icon {
  margin-right: 0.5rem;
  font-size: 0.875rem;
}

.diagram-name {
  flex: 1;
  font-size: 0.875rem;
  color: #24292f;
}

.modified-indicator {
  color: #f66a0a;
  font-weight: bold;
}

/* Empty states */
.empty-state {
  text-align: center;
  color: #586069;
  padding: 2rem 1rem;
}

.empty-state p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.loading-state {
  padding: 1rem;
}

/* Tab bar */
.tab-bar {
  display: flex;
  background-color: #f6f8fa;
  border-bottom: 1px solid #d1d5da;
  overflow-x: auto;
  padding-top: 2rem;
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