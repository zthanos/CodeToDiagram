<template>
  <div class="diagrams-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <h2 class="workspace-title">Diagrams</h2>
      <p class="workspace-description">Create and edit Mermaid diagrams for your project.</p>
    </div>

    <!-- Editor Section -->
    <div class="editor-section">

      
      <div  class="editor-section-content">
        <div class="editor-toolbar">
          <button class="add-btn" @click="createDiagram" title="Create New Diagram">
            ➕ New Diagram
          </button>
        </div>

        <div v-if="openTabs.length === 0" class="empty-editor-state">
          <div class="empty-message">
            <div class="empty-icon">📊</div>
            <h4>No diagrams open</h4>
            <p>Create a new diagram or select one from the list below to start editing.</p>
          </div>
        </div>
        
        <div v-else class="editor-container">
          <!-- Tab Bar -->
          <div class="tab-bar">
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

          <!-- Editor Content -->
          <div class="editor-content">
            <MermaidRenderer v-for="tab in openTabs" :key="tab.id" v-show="activeTabId === tab.id" :theme="theme"
              :diagram-id="tab.diagramId" @update:theme="$emit('update:theme', $event)"
              @content-changed="handleContentChanged(tab.id, $event)" ref="editorInstances"
              @request-save="openSaveDialog" />
          </div>
        </div>
      </div>
    </div>



    <!-- Save Dialog -->
    <SaveDiagramDialog ref="saveDialogRef" :projectId="project?.id || ''" :diagramId="selectedDiagramId"
      :content="pendingSaveContent" @saved="handleDiagramSaved" @cancelled="showCreateDialog = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import MermaidRenderer from './MermaidRenderer.vue'
import SaveDiagramDialog from './SaveDiagramDialog.vue'

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
const selectedDiagramId = ref<number | null>(null)
const openTabs = ref<Tab[]>([])
const activeTabId = ref<string | null>(null)
const pendingSaveContent = ref('')
const showCreateDialog = ref(false)
const tabCounter = ref(0)
const saveDialogRef = ref(null)
const isEditorSectionExpanded = ref(true)

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

// Removed toggleNavigation as it's no longer needed in the new design

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
    const shouldClose = await dialog.warning(
      'Unsaved Changes',
      `"${tab.title}" has unsaved changes. Do you want to close it anyway?`
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

// Removed pane splitter functionality as it's no longer needed in the new design

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

// New methods for the redesigned interface
function toggleEditorSection() {
  isEditorSectionExpanded.value = !isEditorSectionExpanded.value
}

// Auto-open all diagrams as tabs when component loads
onMounted(() => {
  // Open all existing diagrams as tabs
  if (props.project?.diagrams?.length > 0) {
    props.project.diagrams.forEach(diagram => {
      openDiagramInTab(diagram)
    })
  }
})

// Expose methods for parent component
defineExpose({
  closeAllTabs,
  openDiagramInTab,
  selectDiagram
})
</script>

<style scoped>
.diagrams-workspace {
  padding: 24px;
  margin: 0 auto;
  height: 90vh;
  margin-bottom: 150px;
}

.workspace-header {
  margin-bottom: 32px;
}

.workspace-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.workspace-description {
  font-size: 16px;
  color: #666;
  margin: 0;
  
}

/* Editor Section */
.editor-section {

  border-radius: 12px;
  padding: 24px;
  margin-bottom: 100px;
  width: 100%;
}

.editor-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 16px;
  padding: 8px 0;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.editor-section-header:hover {
  background-color: rgba(59, 130, 246, 0.05);
}

.editor-section-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.collapse-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.collapse-btn.collapsed {
  transform: rotate(-90deg);
}

.editor-section-content {
  animation: slideDown 0.3s ease-out;
  overflow-y: auto;
}

.editor-toolbar {
  margin-bottom: 16px;
  text-align: right;
}

.toolbar-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toolbar-btn:hover {
  background: #2563eb;
}

.empty-editor-state {
  text-align: center;
  padding: 48px 24px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-message h4 {
  font-size: 18px;
  font-weight: 500;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-message p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.editor-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

/* Tab Bar */
.tab-bar {
  display: flex;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.editor-tab {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-right: 1px solid #e5e7eb;
  background-color: #f8f9fa;
  cursor: pointer;
  white-space: nowrap;
  min-width: 120px;
  max-width: 200px;
  transition: all 0.2s ease;
}

.editor-tab:hover {
  background-color: #e5e7eb;
}

.editor-tab.active {
  background-color: #ffffff;
  border-bottom: 1px solid #ffffff;
  position: relative;
  z-index: 1;
}

.editor-tab.has-changes {
  background-color: rgba(246, 106, 10, 0.05);
  border-left: 2px solid #f66a0a;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
}

.tab-status-indicator {
  display: flex;
  align-items: center;
  margin-left: 8px;
  font-size: 12px;
}

.status-modified {
  color: #f66a0a;
}

.status-saved {
  color: #10b981;
  opacity: 0.7;
}

.tab-close {
  margin-left: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.tab-close:hover {
  background-color: #e5e7eb;
  opacity: 1;
}

.editor-tab.has-changes .tab-close {
  color: #f66a0a;
}

.editor-content {
  min-height: 400px;
  background: white;
}

.add-btn {
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}


@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}
</style>