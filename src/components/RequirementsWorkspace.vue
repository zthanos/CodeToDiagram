<template>
  <div class="requirements-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <h2 class="workspace-title">Requirements</h2>
      <div class="header-actions">
        <button class="pdf-upload-btn" @click="openPdfUpload" :disabled="isUploading"
          :class="{ 'uploading': isUploading }">
          <span v-if="isUploading" class="spinner"></span>
          {{ isUploading ? 'Uploading...' : '📄 Add Requirements from PDF' }}
        </button>
        <button class="save-btn" @click="() => saveRequirementsDocument(false)"
          :disabled="isSaving || !hasChanges || conflictDetected" :class="{
            'saving': isSaving,
            'has-changes': hasChanges,
            'conflict': conflictDetected
          }" :title="conflictDetected ? 'Document conflict detected - resolve before saving' : getChangesSummary()">
          <span v-if="isSaving" class="spinner"></span>
          <span v-else-if="conflictDetected" class="conflict-icon">⚠️</span>
          {{ isSaving ? 'Saving...' : conflictDetected ? 'Conflict' : 'Save' }}
        </button>

        <!-- Auto-save indicator -->
        <div v-if="autoSaveEnabled" class="auto-save-status">
          <span class="auto-save-indicator" :class="{ 'active': hasChanges && !isSaving }">
            🔄 Auto-save
          </span>
        </div>

        <!-- Last saved and change tracking info -->
        <div class="save-info">
          <span v-if="lastSaved" class="last-saved">
            Last saved: {{ formatTime(lastSaved) }}
          </span>
          <span v-if="hasChanges" class="changes-summary" :title="getChangesSummary()">
            {{ changeTracker.lastChangeTime ? `Modified ${formatTime(changeTracker.lastChangeTime)}` : 'Unsaved changes'
            }}
          </span>
        </div>

        <!-- Conflict resolution controls -->
        <div v-if="conflictDetected" class="conflict-resolution">
          <button class="resolve-btn use-theirs" @click="resolveConflict('use-theirs')"
            title="Discard your changes and use the latest version">
            Use Latest
          </button>
          <button class="resolve-btn keep-mine" @click="resolveConflict('keep-mine')"
            title="Keep your changes and overwrite the server version">
            Keep Mine
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - BRD Editor (60%) -->
      <div class="editor-panel">
        <div class="editor-header">
          <h3>📝 Business Requirements Document</h3>
          <div class="editor-controls">
            <div class="editor-status">
              <div class="change-indicators">
                <span v-if="changeTracker.brdContentChanged" class="change-indicator content"
                  title="Document content changed">📝</span>
                <span v-if="changeTracker.statusChanged" class="change-indicator status"
                  title="Document status changed">🏷️</span>
                <span v-if="changeTracker.requirementItemsChanged" class="change-indicator items"
                  title="Requirement items changed">📋</span>
                <span v-if="hasChanges" class="unsaved-indicator" title="Unsaved changes">●</span>
              </div>
              <select v-model="currentStatus" class="status-select" @change="handleStatusChange">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="view-toggle">
              <button class="toggle-btn" @click="toggleViewMode"
                :title="viewMode === 'edit' ? 'Switch to preview mode (Ctrl+Shift+P)' : 'Switch to edit mode (Ctrl+Shift+P)'">
                {{ viewMode === 'edit' ? '👁️ Preview' : '✏️ Edit' }}
              </button>
            </div>
          </div>
        </div>

        <div class="editor-container">
          <!-- Loading State -->
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <div class="loading-content">
              <p class="loading-title">Loading Requirements Document</p>
              <p class="loading-subtitle">Please wait while we fetch your requirements...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="loadingError" class="error-state">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <h3 class="error-title">Failed to Load Requirements</h3>
              <p class="error-message">{{ loadingError }}</p>
              <div class="error-actions">
                <button class="retry-btn" @click="retryLoadRequirements" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner"></span>
                  {{ isLoading ? 'Retrying...' : 'Try Again' }}
                </button>
                <button class="start-fresh-btn" @click="initializeEmptyWorkspace" :disabled="isLoading">
                  Start Fresh
                </button>
              </div>
              <p class="retry-info" v-if="retryCount > 0">
                Retry attempt {{ retryCount }}/{{ maxRetries }}
              </p>
            </div>
          </div>

          <!-- Empty State (No Document) -->
          <div v-else-if="!requirementsDocument && !brdContent" class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-content">
              <h3 class="empty-title">No Requirements Document Found</h3>
              <p class="empty-message">
                This project doesn't have a requirements document yet. Start by writing your Business Requirements
                Document or upload a PDF.
              </p>
              <div class="empty-actions">
                <button class="start-writing-btn" @click="startWriting">
                  ✏️ Start Writing
                </button>
                <button class="upload-pdf-btn" @click="openPdfUpload">
                  📄 Upload PDF
                </button>
              </div>
            </div>
          </div>

          <!-- Preview Mode -->
          <div v-else-if="viewMode === 'view'" class="preview-mode">
            <div class="preview-content-full">
              <MarkdownRenderer v-if="brdContent" :content="brdContent" />
              <div v-else class="empty-preview">
                <div class="empty-preview-icon">👁️</div>
                <p class="empty-preview-text">Start writing your Business Requirements Document to see a preview here.
                </p>
                <button class="switch-to-edit-btn" @click="toggleViewMode">
                  ✏️ Switch to Edit Mode
                </button>
              </div>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else class="edit-mode">
            <textarea ref="markdownEditor" v-model="brdContent" class="markdown-editor" placeholder="# Business Requirements Document

## Overview
Describe the business requirements and objectives for this project...

## Functional Requirements
List the specific functional requirements:
- Requirement 1: Description
- Requirement 2: Description

## Non-Functional Requirements
List the non-functional requirements:
- Performance: Response time requirements
- Security: Authentication and authorization needs
- Scalability: Expected load and growth

## Acceptance Criteria
Define the acceptance criteria for each requirement:
- Criteria 1: Specific measurable outcome
- Criteria 2: Specific measurable outcome

## Dependencies
List any dependencies on other systems or projects...

## Assumptions and Constraints
Document any assumptions made and constraints that apply..." @input="handleEditorChange" @keydown="handleKeyDown"
              spellcheck="true" :aria-label="'Business Requirements Document Editor'"
              :aria-describedby="'editor-help'"></textarea>
            <div id="editor-help" class="sr-only">
              Use Ctrl+S to save, Ctrl+Shift+P to toggle preview, Tab to indent, Shift+Tab to unindent
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - Tabbed Area (40%) -->
      <div class="right-panel">
        <div v-if="isLoading" class="right-panel-loading">
          <div class="loading-spinner"></div>
          <p>Loading workspace data...</p>
        </div>
        <div v-else-if="loadingError" class="right-panel-error">
          <div class="error-icon">⚠️</div>
          <p>Unable to load workspace data</p>
          <button class="retry-btn" @click="retryLoadRequirements">
            Retry
          </button>
        </div>
        <RequirementsTabsContainer v-else :active-tab="activeTab" :requirement-items="requirementItems"
          :systems-data="systemsData" :teams-data="teamsData" :tab-state="tabState" @tab-change="handleTabChange"
          @requirement-update="handleRequirementUpdate" @requirement-delete="handleRequirementDelete"
          @requirement-create="handleRequirementCreate" @requirements-filter-change="handleRequirementsFilterChange"
          @requirements-search-change="handleRequirementsSearchChange" @system-select="handleSystemSelect"
          @system-create="handleSystemCreate" @system-update="handleSystemUpdate" @system-delete="handleSystemDelete"
          @systems-search-change="handleSystemsSearchChange" @systems-filter-change="handleSystemsFilterChange"
          @team-select="handleTeamSelect" @team-create="handleTeamCreate" @team-update="handleTeamUpdate"
          @team-delete="handleTeamDelete" @teams-search-change="handleTeamsSearchChange" />
      </div>
    </div>

    <!-- PDF Upload Dialog -->
    <div v-if="showUploadDialog" class="upload-dialog-overlay" @click="closeUploadDialog">
      <div class="upload-dialog" @click.stop>
        <div class="upload-dialog-header">
          <h3>📄 Upload Requirements PDF</h3>
          <button class="close-btn" @click="closeUploadDialog" aria-label="Close dialog">×</button>
        </div>

        <div class="upload-dialog-content">
          <div class="upload-dropzone" :class="{
            'dragover': isDragOver,
            'has-file': selectedFile,
            'uploading': isUploading,
            'error': uploadError
          }" @drop="handleDrop" @dragover="handleDragOver" @dragenter="handleDragEnter" @dragleave="handleDragLeave"
            @click="triggerFileSelect">
            <div v-if="!selectedFile && !isUploading" class="dropzone-content">
              <div class="upload-icon">📄</div>
              <p class="dropzone-text">
                <strong>Drop your PDF file here</strong> or <span class="link-text">click to browse</span>
              </p>
              <p class="dropzone-hint">Supports PDF files up to 10MB</p>
            </div>

            <div v-else-if="selectedFile && !isUploading" class="file-selected">
              <div class="file-icon">📄</div>
              <div class="file-info">
                <p class="file-name">{{ selectedFile.name }}</p>
                <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button class="remove-file-btn" @click.stop="removeSelectedFile" aria-label="Remove file">×</button>
            </div>

            <div v-else-if="isUploading" class="upload-progress">
              <div class="progress-spinner"></div>
              <p class="progress-text">{{ uploadProgressText }}</p>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <p class="progress-percentage">{{ Math.round(uploadProgress) }}%</p>
            </div>

            <div v-if="uploadError" class="upload-error">
              <div class="error-icon">⚠️</div>
              <p class="error-message">{{ uploadError }}</p>
              <button class="retry-btn" @click="retryUpload">Try Again</button>
            </div>
          </div>

          <div class="upload-options">
            <label class="status-label">
              Document Status:
              <select v-model="uploadStatus" class="status-select">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        </div>

        <div class="upload-dialog-footer">
          <button class="cancel-btn" @click="closeUploadDialog" :disabled="isUploading">
            Cancel
          </button>
          <button class="upload-btn" @click="startUpload" :disabled="!selectedFile || isUploading"
            :class="{ 'uploading': isUploading }">
            <span v-if="isUploading" class="spinner"></span>
            {{ isUploading ? 'Uploading...' : 'Upload PDF' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden file input for PDF upload -->
    <input ref="pdfFileInput" type="file" accept=".pdf" @change="handleFileSelect" style="display: none;" />

    <!-- Success/Error Notifications -->
    <div v-if="notification" class="notification" :class="notification.type">
      <div class="notification-content">
        <span class="notification-icon">{{ notification.type === 'success' ? '✅' : '❌' }}</span>
        <span class="notification-message">{{ notification.message }}</span>
      </div>
      <button class="notification-close" @click="closeNotification">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MarkdownRenderer from './MarkdownRenderer.vue'
import RequirementsTabsContainer from './RequirementsTabsContainer.vue'
import { RequirementsApiService } from '../services/RequirementsApiService'
import type {
  RequirementsDocument,
  RequirementItem,
  SystemInfo,
  TeamInfo,
  TabState
} from '../types/requirements'
import type { Project } from '../types/project'

// Props interface
interface Props {
  project: Project
}

// Emits interface
interface Emits {
  'project-updated': [project: Project]
  'unsaved-changes': [hasChanges: boolean]
}

// Props
const props = defineProps<Props>()

// Emits
const emit = defineEmits<Emits>()

// Router
const router = useRouter()
const route = useRoute()

// Core workspace state
const isLoading = ref(false)
const isSaving = ref(false)
const hasChanges = ref(false)
const lastSaved = ref<Date | null>(null)

// BRD document state
const brdContent = ref('')
const currentStatus = ref<'draft' | 'published' | 'archived'>('draft')
const viewMode = ref<'edit' | 'view'>('edit')

// Requirements state
const requirementsDocument = ref<RequirementsDocument | null>(null)
const requirementItems = ref<RequirementItem[]>([])
const systemsData = ref<SystemInfo[]>([])
const teamsData = ref<TeamInfo[]>([])

// UI state
const activeTab = ref<'requirements' | 'systems' | 'teams'>('requirements')
const isUploading = ref(false)

// PDF Upload state
const showUploadDialog = ref(false)
const selectedFile = ref<File | null>(null)
const uploadStatus = ref<'draft' | 'published' | 'archived'>('draft')
const uploadProgress = ref(0)
const uploadProgressText = ref('')
const uploadError = ref('')
const isDragOver = ref(false)

// Notification state
const notification = ref<{
  type: 'success' | 'error'
  message: string
} | null>(null)

// Tab state management
const tabState = ref<TabState>({
  requirements: {
    items: [],
    filter: 'all',
    searchQuery: ''
  },
  systems: {
    items: [],
    selectedSystem: null,
    searchQuery: '',
    filter: 'all'
  },
  teams: {
    items: [],
    selectedTeam: null,
    searchQuery: ''
  }
})

// Refs
const markdownEditor = ref<HTMLTextAreaElement>()
const pdfFileInput = ref<HTMLInputElement>()

// Auto-save timer and configuration
let autoSaveTimer: number | null = null
const autoSaveInterval = ref(30000) // 30 seconds default, configurable
const autoSaveEnabled = ref(true)

// Change tracking state
const originalBrdContent = ref('')
const originalStatus = ref<'draft' | 'published' | 'archived'>('draft')
const originalRequirementItems = ref<RequirementItem[]>([])
const changeTracker = ref({
  brdContentChanged: false,
  statusChanged: false,
  requirementItemsChanged: false,
  lastChangeTime: null as Date | null
})

// Concurrent editing detection
const documentVersion = ref(0)
const lastKnownVersion = ref(0)
const conflictDetected = ref(false)
const conflictResolutionMode = ref(false)

// Lifecycle
onMounted(async () => {
  await loadRequirementsDocument()
  setupAutoSave()
})

// Helper function to start writing
function startWriting() {
  viewMode.value = 'edit'
  // Add some initial content to get out of empty state
  if (!brdContent.value.trim()) {
    brdContent.value = '# Business Requirements Document\n\n'
  }
  nextTick(() => {
    markdownEditor.value?.focus()
  })
}

onBeforeUnmount(() => {
  cleanupRequirementsWorkspace()
})

// Cleanup function for proper resource management
function cleanupRequirementsWorkspace() {
  // Clear auto-save timer
  if (autoSaveTimer) {
    window.clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }

  // Clear any pending API requests
  // Note: Modern fetch API requests are automatically cancelled when component unmounts

  // Reset state to prevent memory leaks
  requirementsDocument.value = null
  requirementItems.value = []
  systemsData.value = []
  teamsData.value = []

  // Clear change tracking
  hasChanges.value = false

  // Emit final state to parent
  emit('unsaved-changes', false)
}

// Track if we're in initialization phase
const isInitializing = ref(true)

// Enhanced change tracking with detailed detection
function detectChanges() {
  if (isInitializing.value) return

  const brdChanged = brdContent.value !== originalBrdContent.value
  const statusChanged = currentStatus.value !== originalStatus.value
  const itemsChanged = hasRequirementItemsChanged()

  changeTracker.value = {
    brdContentChanged: brdChanged,
    statusChanged: statusChanged,
    requirementItemsChanged: itemsChanged,
    lastChangeTime: (brdChanged || statusChanged || itemsChanged) ? new Date() : changeTracker.value.lastChangeTime
  }

  const hasAnyChanges = brdChanged || statusChanged || itemsChanged
  if (hasChanges.value !== hasAnyChanges) {
    hasChanges.value = hasAnyChanges
    emit('unsaved-changes', hasAnyChanges)

    if (hasAnyChanges) {
      resetAutoSaveTimer()
    }
  }
}

function hasRequirementItemsChanged(): boolean {
  if (requirementItems.value.length !== originalRequirementItems.value.length) {
    return true
  }

  return requirementItems.value.some((item, index) => {
    const original = originalRequirementItems.value[index]
    if (!original) return true

    return (
      item.title !== original.title ||
      item.description !== original.description ||
      item.status !== original.status ||
      item.priority !== original.priority
    )
  })
}

// Watch for changes with enhanced tracking
watch(brdContent, () => {
  detectChanges()
})

watch(currentStatus, () => {
  detectChanges()
})

watch(requirementItems, () => {
  detectChanges()
}, { deep: true })

// Watch for requirements document changes to sync status
watch(requirementsDocument, (newDocument) => {
  if (newDocument?.status) {
    currentStatus.value = newDocument.status
  }
}, { immediate: true })

// Loading state management
const loadingError = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3

// Methods
async function loadRequirementsDocument() {
  if (!props.project?.id) {
    console.warn('Cannot load requirements document: project ID is missing')
    return
  }

  isLoading.value = true
  loadingError.value = null

  try {
    // Try to load the latest requirements document
    const document = await RequirementsApiService.getLatestRequirements(props.project.id)

    // Successfully loaded document - populate workspace
    await populateWorkspaceFromDocument(document)

    // Load requirement items associated with this document
    await loadRequirementItems()

    // Reset retry count on successful load
    retryCount.value = 0

    console.log('Requirements document loaded successfully:', {
      id: document.id,
      version: document.version,
      status: document.status,
      source_type: document.source_type,
      project_id: document.project_id
    })

  } catch (error: any) {
    console.error('Failed to load requirements document:', error)
    await handleLoadingError(error)
  } finally {
    isLoading.value = false
  }
}

async function populateWorkspaceFromDocument(document: RequirementsDocument) {
  // Set initialization flag to prevent watchers from triggering
  isInitializing.value = true

  // Populate BRD content and metadata
  requirementsDocument.value = document
  brdContent.value = document.content || ''
  currentStatus.value = document.status

  // Store original values for change tracking
  originalBrdContent.value = document.content || ''
  originalStatus.value = document.status
  documentVersion.value = document.version
  lastKnownVersion.value = document.version

  // Reset change tracking
  hasChanges.value = false
  changeTracker.value = {
    brdContentChanged: false,
    statusChanged: false,
    requirementItemsChanged: false,
    lastChangeTime: null
  }
  conflictDetected.value = false
  emit('unsaved-changes', false)

  // Update last saved timestamp if document exists
  if (document.updated_at) {
    try {
      const parsedDate = new Date(document.updated_at)
      if (isNaN(parsedDate.getTime())) {
        console.warn('Invalid updated_at date format:', document.updated_at)
        lastSaved.value = null
      } else {
        lastSaved.value = parsedDate
      }
    } catch (dateError) {
      console.warn('Invalid updated_at date format:', document.updated_at)
      lastSaved.value = null
    }
  }

  // Clear initialization flag after a tick to allow normal operation
  await nextTick()
  isInitializing.value = false
}

async function loadRequirementItems() {
  if (!props.project?.id) return

  try {
    // Load requirement items for this project
    const items = await RequirementsApiService.listRequirementItems(props.project.id)

    // Update requirement items state
    requirementItems.value = items

    // Store original items for change tracking
    originalRequirementItems.value = JSON.parse(JSON.stringify(items))

    // Update tab state with loaded items
    tabState.value.requirements.items = items.map(item => ({
      ...item,
      isEditing: false,
      hasUnsavedChanges: false,
      validationErrors: []
    }))

    console.log(`Loaded ${items.length} requirement items`)

  } catch (error: any) {
    console.error('Failed to load requirement items:', error)

    // Don't fail the entire loading process if requirement items fail
    // Just initialize with empty state and show a warning
    requirementItems.value = []
    originalRequirementItems.value = []
    tabState.value.requirements.items = []

    showNotification('error', 'Failed to load requirement items. You can still work with the document.')
  }
}

async function handleLoadingError(error: any) {
  // Handle different types of loading errors
  if (error?.type === 'CLIENT' && error?.message?.includes('not found')) {
    // No document exists - initialize empty state
    await initializeEmptyWorkspace()
    console.log('No existing requirements document found - initialized empty workspace')
  } else if (error?.type === 'NETWORK' || error?.type === 'TIMEOUT') {
    // Network/timeout errors - offer retry
    loadingError.value = error.message || 'Network error occurred while loading requirements'
    console.error('Network error loading requirements:', error)
  } else if (error?.type === 'SERVER') {
    // Server errors - offer retry
    loadingError.value = error.message || 'Server error occurred while loading requirements'
    console.error('Server error loading requirements:', error)
  } else {
    // Other errors - show generic error
    loadingError.value = error.message || 'An unexpected error occurred while loading requirements'
    console.error('Unexpected error loading requirements:', error)
  }
}

async function initializeEmptyWorkspace() {
  // Set initialization flag to prevent watchers from triggering
  isInitializing.value = true

  // Initialize with empty state for new projects
  requirementsDocument.value = null
  brdContent.value = ''
  currentStatus.value = 'draft'
  hasChanges.value = false
  lastSaved.value = null
  emit('unsaved-changes', false)

  // Initialize empty requirement items
  requirementItems.value = []
  tabState.value.requirements.items = []

  // Initialize sample systems and teams data (this would come from API in real implementation)
  initializeSampleSystemsAndTeams()

  // Clear initialization flag after a tick to allow normal operation
  await nextTick()
  isInitializing.value = false
}

async function retryLoadRequirements() {
  if (retryCount.value >= maxRetries) {
    showNotification('error', 'Maximum retry attempts reached. Please refresh the page or contact support.')
    return
  }

  retryCount.value++
  console.log(`Retrying requirements load (attempt ${retryCount.value}/${maxRetries})`)

  // Call loadRequirementsDocument but don't reset retry count on success
  // The retry count will be reset in the main load function only
  if (!props.project?.id) {
    console.warn('Cannot load requirements document: project ID is missing')
    return
  }

  isLoading.value = true
  loadingError.value = null

  try {
    // Try to load the latest requirements document
    const document = await RequirementsApiService.getLatestRequirements(props.project.id)

    // Successfully loaded document - populate workspace
    await populateWorkspaceFromDocument(document)

    // Load requirement items associated with this document
    await loadRequirementItems()

    // Reset retry count on successful load
    retryCount.value = 0

    console.log('Requirements document loaded successfully after retry:', {
      id: document.id,
      version: document.version,
      status: document.status,
      source_type: document.source_type,
      project_id: document.project_id
    })

  } catch (error: any) {
    console.error('Failed to load requirements document on retry:', error)
    await handleLoadingError(error)
  } finally {
    isLoading.value = false
  }
}

function initializeSampleSystemsAndTeams() {
  // Sample systems data (this would come from API in real implementation)
  systemsData.value = [
    {
      id: '1',
      name: 'Authentication Service',
      description: 'Handles user authentication and authorization',
      type: 'internal',
      dependencies: ['Database', 'Email Service']
    },
    {
      id: '2',
      name: 'Payment Gateway',
      description: 'External payment processing system',
      type: 'external',
      dependencies: []
    }
  ]

  // Sample teams data (this would come from API in real implementation)
  teamsData.value = [
    {
      id: '1',
      name: 'Frontend Team',
      role: 'Development',
      members: ['Alice Johnson', 'Bob Smith'],
      responsibilities: ['UI/UX Implementation', 'Client-side Logic']
    },
    {
      id: '2',
      name: 'Backend Team',
      role: 'Development',
      members: ['Charlie Brown', 'Diana Prince'],
      responsibilities: ['API Development', 'Database Design']
    }
  ]

  // Update tab state for systems and teams
  tabState.value.systems.items = systemsData.value
  tabState.value.teams.items = teamsData.value
}

async function saveRequirementsDocument(isAutoSave = false) {
  if (!props.project?.id || !hasChanges.value) return

  // Check for concurrent editing conflicts before saving
  if (await checkForConflicts()) {
    if (!isAutoSave) {
      showConflictResolutionDialog()
    }
    return
  }

  isSaving.value = true
  const saveStartTime = new Date()

  try {
    // Call the actual API service
    const saved = await RequirementsApiService.saveRequirementsDocument(
      props.project.id,
      brdContent.value,
      currentStatus.value
    )

    // Update the requirements document state
    requirementsDocument.value = saved

    // Update original values for change tracking
    originalBrdContent.value = brdContent.value
    originalStatus.value = currentStatus.value
    documentVersion.value = saved.version
    lastKnownVersion.value = saved.version

    // Reset change tracking
    hasChanges.value = false
    changeTracker.value = {
      brdContentChanged: false,
      statusChanged: false,
      requirementItemsChanged: false,
      lastChangeTime: null
    }

    lastSaved.value = saveStartTime
    emit('unsaved-changes', false)

    // Show success notification for manual saves
    if (!isAutoSave) {
      showNotification('success', 'Requirements document saved successfully!')
    }

    console.log('Requirements document saved successfully:', {
      id: saved.id,
      version: saved.version,
      status: saved.status,
      project_id: saved.project_id,
      isAutoSave
    })
  } catch (error: any) {
    console.error('Failed to save requirements document:', error)

    // Handle different types of save errors
    let errorMessage = 'Failed to save requirements document. Please try again.'

    if (error?.type === 'VALIDATION') {
      errorMessage = `Validation error: ${error.message}`
    } else if (error?.type === 'NETWORK') {
      errorMessage = 'Network error. Please check your connection and try again.'
    } else if (error?.type === 'SERVER') {
      errorMessage = 'Server error. Please try again in a moment.'
    } else if (error?.message) {
      errorMessage = error.message
    }

    showNotification('error', errorMessage)

    // For auto-save failures, don't show intrusive notifications
    if (isAutoSave) {
      console.warn('Auto-save failed:', errorMessage)
    }
  } finally {
    isSaving.value = false
  }
}

async function checkForConflicts(): Promise<boolean> {
  if (!props.project?.id || !requirementsDocument.value) return false

  try {
    // Get the latest version from the server
    const latest = await RequirementsApiService.getLatestRequirements(props.project.id)

    // Check if the version has changed since we last knew about it
    if (latest.version > lastKnownVersion.value) {
      conflictDetected.value = true
      return true
    }

    return false
  } catch (error) {
    // If we can't check for conflicts, assume no conflict
    console.warn('Could not check for conflicts:', error)
    return false
  }
}

function showConflictResolutionDialog() {
  // This would show a dialog to resolve conflicts
  // For now, we'll show a notification
  showNotification('error', 'Document has been modified by another user. Please refresh to see the latest version.')
  conflictResolutionMode.value = true
}

async function resolveConflict(resolution: 'keep-mine' | 'use-theirs' | 'merge') {
  if (!props.project?.id) return

  try {
    if (resolution === 'use-theirs') {
      // Reload the document from server
      await loadRequirementsDocument()
      conflictDetected.value = false
      conflictResolutionMode.value = false
      showNotification('success', 'Document updated with latest version.')
    } else if (resolution === 'keep-mine') {
      // Force save our version
      lastKnownVersion.value = documentVersion.value
      conflictDetected.value = false
      conflictResolutionMode.value = false
      await saveRequirementsDocument()
    }
    // 'merge' would require a more complex UI - not implemented in this task
  } catch (error) {
    console.error('Failed to resolve conflict:', error)
    showNotification('error', 'Failed to resolve conflict. Please try again.')
  }
}

function handleEditorChange() {
  // Changes are handled by the watcher
}

function handleKeyDown(event: KeyboardEvent) {
  // Handle Ctrl+S for save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveRequirementsDocument()
  }

  // Handle Ctrl+Shift+P for preview toggle
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
    event.preventDefault()
    toggleViewMode()
  }

  // Handle Tab for indentation
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Insert tab character (2 spaces)
    const value = textarea.value
    textarea.value = value.substring(0, start) + '  ' + value.substring(end)

    // Move cursor
    textarea.selectionStart = textarea.selectionEnd = start + 2

    // Trigger input event to update v-model
    textarea.dispatchEvent(new Event('input'))
  }

  // Handle Shift+Tab for unindent
  if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    // Find the start of the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineText = value.substring(lineStart, start)

    // Remove up to 2 spaces from the beginning of the line
    if (lineText.startsWith('  ')) {
      textarea.value = value.substring(0, lineStart) + lineText.substring(2) + value.substring(start)
      textarea.selectionStart = textarea.selectionEnd = start - 2
    } else if (lineText.startsWith(' ')) {
      textarea.value = value.substring(0, lineStart) + lineText.substring(1) + value.substring(start)
      textarea.selectionStart = textarea.selectionEnd = start - 1
    }

    // Trigger input event to update v-model
    textarea.dispatchEvent(new Event('input'))
  }
}

function setupAutoSave() {
  if (!autoSaveEnabled.value) return

  // Auto-save at configurable intervals if there are changes
  autoSaveTimer = window.setInterval(() => {
    if (hasChanges.value && !isSaving.value && !conflictDetected.value && brdContent.value.trim()) {
      console.log('Auto-saving requirements document...')
      saveRequirementsDocument(true) // Pass true to indicate auto-save
    }
  }, autoSaveInterval.value)
}

function resetAutoSaveTimer() {
  if (autoSaveTimer) {
    window.clearInterval(autoSaveTimer)
  }
  setupAutoSave()
}

function configureAutoSave(enabled: boolean, intervalMs?: number) {
  autoSaveEnabled.value = enabled

  if (intervalMs && intervalMs >= 10000) { // Minimum 10 seconds
    autoSaveInterval.value = intervalMs
  }

  resetAutoSaveTimer()
}

function getChangesSummary(): string {
  const changes: string[] = []

  if (changeTracker.value.brdContentChanged) {
    changes.push('document content')
  }

  if (changeTracker.value.statusChanged) {
    changes.push('document status')
  }

  if (changeTracker.value.requirementItemsChanged) {
    changes.push('requirement items')
  }

  if (changes.length === 0) {
    return 'No unsaved changes'
  }

  return `Unsaved changes: ${changes.join(', ')}`
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'edit' ? 'view' : 'edit'

  // Focus the editor when switching to edit mode
  if (viewMode.value === 'edit') {
    nextTick(() => {
      markdownEditor.value?.focus()
    })
  }
}

function handleStatusChange() {
  hasChanges.value = true
  emit('unsaved-changes', true)
}

function openPdfUpload() {
  showUploadDialog.value = true
  resetUploadState()
}

function closeUploadDialog() {
  if (isUploading.value) return // Prevent closing during upload
  showUploadDialog.value = false
  resetUploadState()
}

function resetUploadState() {
  selectedFile.value = null
  uploadProgress.value = 0
  uploadProgressText.value = ''
  uploadError.value = ''
  uploadStatus.value = 'draft'
  isDragOver.value = false
}

function triggerFileSelect() {
  if (isUploading.value) return
  pdfFileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (validatePdfFile(file)) {
      selectedFile.value = file
      uploadError.value = ''
    }
  }

  // Reset file input
  target.value = ''
}

function validatePdfFile(file: File): boolean {
  // Check file type
  if (file.type !== 'application/pdf') {
    uploadError.value = 'Please select a PDF file.'
    return false
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB in bytes
  if (file.size > maxSize) {
    uploadError.value = 'File size must be less than 10MB.'
    return false
  }

  // Check file name
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    uploadError.value = 'File must have a .pdf extension.'
    return false
  }

  return true
}

function removeSelectedFile() {
  selectedFile.value = null
  uploadError.value = ''
}

// Drag and drop handlers
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  if (isUploading.value) return
  isDragOver.value = true
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  if (isUploading.value) return
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  // Only set to false if we're leaving the dropzone entirely
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  if (isUploading.value) return

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (validatePdfFile(file)) {
      selectedFile.value = file
      uploadError.value = ''
    }
  }
}

async function startUpload() {
  if (!selectedFile.value || !props.project?.id) return

  isUploading.value = true
  uploadProgress.value = 0
  uploadProgressText.value = 'Preparing upload...'
  uploadError.value = ''

  try {
    // Simulate upload progress for better UX
    const progressInterval = window.setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10
        if (uploadProgress.value < 30) {
          uploadProgressText.value = 'Uploading file...'
        } else if (uploadProgress.value < 70) {
          uploadProgressText.value = 'Processing PDF...'
        } else {
          uploadProgressText.value = 'Extracting requirements...'
        }
      }
    }, 200)

    // Call the actual API service
    const result = await RequirementsApiService.uploadRequirementsPdf(
      props.project.id,
      selectedFile.value,
      uploadStatus.value
    )

    window.clearInterval(progressInterval)
    uploadProgress.value = 100
    uploadProgressText.value = 'Upload complete!'

    // Update the workspace with the new requirements document
    requirementsDocument.value = result
    brdContent.value = result.content
    currentStatus.value = result.status
    hasChanges.value = false
    emit('unsaved-changes', false)

    // Show success notification
    showNotification('success', `PDF "${selectedFile.value.name}" uploaded successfully!`)

    // Close dialog after a short delay
    setTimeout(() => {
      closeUploadDialog()
      // Reload requirements document to show new content
      loadRequirementsDocument()
    }, 1500)

  } catch (error: any) {
    console.error('Failed to upload PDF:', error)

    // Handle different types of errors
    let errorMessage = 'Failed to upload PDF. Please try again.'

    if (error?.message) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.'
      } else if (error.message.includes('size')) {
        errorMessage = 'File is too large. Please select a smaller PDF file.'
      } else if (error.message.includes('format') || error.message.includes('PDF')) {
        errorMessage = 'Invalid PDF file. Please select a valid PDF document.'
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else {
        errorMessage = error.message
      }
    }

    uploadError.value = errorMessage
    showNotification('error', errorMessage)
  } finally {
    isUploading.value = false
  }
}

async function retryUpload() {
  uploadError.value = ''
  await startUpload()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

function closeNotification() {
  notification.value = null
}

// Tab event handlers
function handleTabChange(tabId: 'requirements' | 'systems' | 'teams') {
  activeTab.value = tabId
}

// Requirements event handlers with change tracking
function handleRequirementUpdate(requirement: RequirementItem) {
  const index = requirementItems.value.findIndex(r => r.id === requirement.id)
  if (index !== -1) {
    requirementItems.value[index] = { ...requirement, updated_at: new Date() }
    detectChanges()
  }
}

function handleRequirementDelete(requirementId: string) {
  requirementItems.value = requirementItems.value.filter(r => r.id !== requirementId)
  detectChanges()
}

function handleRequirementCreate(requirement: Partial<RequirementItem>) {
  const newRequirement: RequirementItem = {
    id: Date.now().toString(),
    title: requirement.title || '',
    description: requirement.description || '',
    status: requirement.status || 'new',
    priority: requirement.priority || 'medium',
    project_id: props.project?.id || '',
    created_at: new Date(),
    updated_at: new Date(),
    source: 'manual'
  }
  requirementItems.value.push(newRequirement)
  detectChanges()
}

function handleRequirementsFilterChange(filter: 'all' | 'new' | 'accepted' | 'rejected') {
  tabState.value.requirements.filter = filter
}

function handleRequirementsSearchChange(query: string) {
  tabState.value.requirements.searchQuery = query
}

// Systems event handlers
function handleSystemSelect(systemId: string) {
  tabState.value.systems.selectedSystem = systemId
}

function handleSystemCreate(system: Omit<SystemInfo, 'id'>) {
  const newSystem: SystemInfo = {
    ...system,
    id: Date.now().toString()
  }
  systemsData.value.push(newSystem)
}

function handleSystemUpdate(systemId: string, updates: Partial<SystemInfo>) {
  const index = systemsData.value.findIndex(s => s.id === systemId)
  if (index !== -1) {
    systemsData.value[index] = { ...systemsData.value[index], ...updates }
  }
  console.log('Save clicked', updates)
}

function handleSystemDelete(systemId: string) {
  systemsData.value = systemsData.value.filter(s => s.id !== systemId)
}

function handleSystemsSearchChange(query: string) {
  tabState.value.systems.searchQuery = query
}

function handleSystemsFilterChange(filter: 'all' | 'internal' | 'external' | 'integration') {
  tabState.value.systems.filter = filter
}

// Teams event handlers
function handleTeamSelect(teamId: string) {
  tabState.value.teams.selectedTeam = teamId
}

function handleTeamCreate(team: Omit<TeamInfo, 'id'>) {
  const newTeam: TeamInfo = {
    ...team,
    id: Date.now().toString()
  }
  teamsData.value.push(newTeam)
}

function handleTeamUpdate(teamId: string, updates: Partial<TeamInfo>) {
  const index = teamsData.value.findIndex(t => t.id === teamId)
  if (index !== -1) {
    teamsData.value[index] = { ...teamsData.value[index], ...updates }
  }
}

function handleTeamDelete(teamId: string) {
  teamsData.value = teamsData.value.filter(t => t.id !== teamId)
}

function handleTeamsSearchChange(query: string) {
  tabState.value.teams.searchQuery = query
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.requirements-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.workspace-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pdf-upload-btn,
.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.pdf-upload-btn {
  background: #10b981;
  color: white;
}

.pdf-upload-btn:hover:not(:disabled) {
  background: #059669;
}

.save-btn {
  background: #3b82f6;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #2563eb;
}

.pdf-upload-btn:disabled,
.save-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.save-btn.has-changes {
  background: #059669;
  box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.2);
}

.save-btn.conflict {
  background: #dc2626;
  color: white;
}

.save-btn.conflict:hover:not(:disabled) {
  background: #b91c1c;
}

.pdf-upload-btn.uploading,
.save-btn.saving {
  background: #6b7280;
}

.conflict-icon {
  font-size: 1rem;
}

/* Auto-save status */
.auto-save-status {
  display: flex;
  align-items: center;
}

.auto-save-indicator {
  font-size: 0.75rem;
  color: #6b7280;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.auto-save-indicator.active {
  opacity: 1;
  color: #059669;
}

/* Save info */
.save-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.changes-summary {
  font-size: 0.75rem;
  color: #f59e0b;
  font-style: italic;
}

/* Conflict resolution */
.conflict-resolution {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.resolve-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.resolve-btn.use-theirs {
  background: #3b82f6;
  color: white;
}

.resolve-btn.use-theirs:hover {
  background: #2563eb;
}

.resolve-btn.keep-mine {
  background: #dc2626;
  color: white;
}

.resolve-btn.keep-mine:hover {
  background: #b91c1c;
}

/* Loading States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  margin: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-content {
  text-align: center;
}

.loading-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.loading-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Error States */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: #fef2f2;
  border: 2px dashed #fca5a5;
  border-radius: 8px;
  margin: 1rem;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-content {
  max-width: 400px;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 0.5rem 0;
}

.error-message {
  font-size: 0.875rem;
  color: #7f1d1d;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.retry-btn,
.start-fresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.retry-btn {
  background: #dc2626;
  color: white;
}

.retry-btn:hover:not(:disabled) {
  background: #b91c1c;
}

.start-fresh-btn {
  background: #6b7280;
  color: white;
}

.start-fresh-btn:hover:not(:disabled) {
  background: #4b5563;
}

.retry-btn:disabled,
.start-fresh-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.retry-info {
  font-size: 0.75rem;
  color: #7f1d1d;
  margin: 0;
  font-style: italic;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: #f0f9ff;
  border: 2px dashed #7dd3fc;
  border-radius: 8px;
  margin: 1rem;
  padding: 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-content {
  max-width: 400px;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0369a1;
  margin: 0 0 0.5rem 0;
}

.empty-message {
  font-size: 0.875rem;
  color: #0c4a6e;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.start-writing-btn,
.upload-pdf-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.start-writing-btn {
  background: #0ea5e9;
  color: white;
}

.start-writing-btn:hover {
  background: #0284c7;
}

.upload-pdf-btn {
  background: #10b981;
  color: white;
}

.upload-pdf-btn:hover {
  background: #059669;
}

/* Empty Preview State */
.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  margin: 1rem;
  padding: 2rem;
  text-align: center;
}

.empty-preview-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-preview-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.switch-to-edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.switch-to-edit-btn:hover {
  background: #2563eb;
}

/* Right Panel Loading/Error States */
.right-panel-loading,
.right-panel-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 1rem;
  padding: 1rem;
  text-align: center;
}

.right-panel-loading .loading-spinner {
  width: 24px;
  height: 24px;
  border-width: 3px;
  margin-bottom: 0.5rem;
}

.right-panel-loading p,
.right-panel-error p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0;
}

.right-panel-error .error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.right-panel-error .retry-btn {
  margin-top: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

/* Animation */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.last-saved {
  font-size: 0.75rem;
  color: #6b7280;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Left Panel - Editor (60%) */
.editor-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.editor-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.editor-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.change-indicators {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.change-indicator {
  font-size: 0.875rem;
  opacity: 0.8;
}

.change-indicator.content {
  color: #3b82f6;
}

.change-indicator.status {
  color: #8b5cf6;
}

.change-indicator.items {
  color: #10b981;
}

.unsaved-indicator {
  color: #f59e0b;
  font-size: 1.2rem;
  line-height: 1;
  margin-left: 0.25rem;
}

.status-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s;
}

.status-select:hover {
  border-color: #9ca3af;
}

.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.view-toggle {
  display: flex;
  align-items: center;
}

.toggle-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #e5e7eb;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.preview-mode,
.edit-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-content-full {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: white;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  font-style: italic;
}

.markdown-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: none;
  outline: none;
  padding: 1.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: white;
  color: #374151;
  box-sizing: border-box;
}

.markdown-editor::placeholder {
  color: #9ca3af;
}

/* Right Panel - Tabs (40%) */
.right-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  background: white;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }

  .editor-panel,
  .right-panel {
    width: 100%;
  }

  .editor-panel {
    height: 50%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .right-panel {
    height: 50%;
  }
}

@media (max-width: 768px) {
  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 1rem;
  }

  .editor-controls {
    width: 100%;
    justify-content: space-between;
  }

  .pdf-upload-btn,
  .save-btn {
    font-size: 0.75rem;
    padding: 0.375rem 0.75rem;
  }
}

@media (max-width: 480px) {
  .main-content {
    flex-direction: column;
  }

  .editor-panel {
    height: 60%;
  }

  .right-panel {
    height: 40%;
  }

  .markdown-editor {
    font-size: 12px;
    padding: 1rem;
  }

  .upload-dialog {
    width: 95%;
    margin: 1rem;
  }

  .upload-dialog-header,
  .upload-dialog-content,
  .upload-dialog-footer {
    padding: 1rem;
  }

  .upload-dropzone {
    padding: 1.5rem;
    min-height: 150px;
  }

  .upload-icon {
    font-size: 2rem;
  }

  .dropzone-text {
    font-size: 0.875rem;
  }

  .notification {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
    min-width: auto;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .workspace-header {
    border-bottom-width: 2px;
  }

  .editor-panel {
    border-right-width: 2px;
  }

  .editor-header {
    border-bottom-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

  .pdf-upload-btn,
  .save-btn,
  .toggle-btn,
  .status-select {
    transition: none;
  }

  .spinner,
  .loading-spinner {
    animation: none;
  }
}

/* PDF Upload Dialog */
.upload-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.upload-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  animation: dialogSlideIn 0.2s ease-out;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.upload-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.upload-dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.upload-dialog-content {
  padding: 1.5rem;
}

.upload-dropzone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f9fafb;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.upload-dropzone:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-dropzone.dragover {
  border-color: #10b981;
  background: #ecfdf5;
  transform: scale(1.02);
}

.upload-dropzone.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.upload-dropzone.uploading {
  border-color: #3b82f6;
  background: #eff6ff;
  cursor: not-allowed;
}

.upload-dropzone.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.dropzone-text {
  margin: 0;
  color: #374151;
  font-size: 1rem;
}

.link-text {
  color: #3b82f6;
  text-decoration: underline;
}

.dropzone-hint {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  width: 100%;
  max-width: 300px;
}

.file-icon {
  font-size: 2rem;
  color: #10b981;
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  margin: 0;
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
  word-break: break-word;
}

.file-size {
  margin: 0;
  color: #6b7280;
  font-size: 0.75rem;
}

.remove-file-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-file-btn:hover {
  background: #dc2626;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.progress-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.progress-text {
  margin: 0;
  color: #374151;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percentage {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.upload-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #ef4444;
}

.error-icon {
  font-size: 2rem;
}

.error-message {
  margin: 0;
  text-align: center;
  font-weight: 500;
}

.retry-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #dc2626;
}

.upload-options {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.status-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.upload-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.cancel-btn,
.upload-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-btn {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.cancel-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.upload-btn {
  background: #3b82f6;
  color: white;
  border: none;
}

.upload-btn:hover:not(:disabled) {
  background: #2563eb;
}

.upload-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.upload-btn.uploading {
  background: #6b7280;
}

/* Notifications */
.notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1001;
  min-width: 300px;
  animation: notificationSlideIn 0.3s ease-out;
}

@keyframes notificationSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification.success {
  border-left: 4px solid #10b981;
}

.notification.error {
  border-left: 4px solid #ef4444;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.notification-icon {
  font-size: 1.25rem;
}

.notification-message {
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}

.notification-close {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.notification-close:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus management for accessibility */
.pdf-upload-btn:focus,
.save-btn:focus,
.toggle-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.status-select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.markdown-editor:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}
</style>