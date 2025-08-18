<template>
  <div class="adr-workspace">
    <!-- Workspace Header -->
    <div class="workspace-header">
      <div class="header-left">
        <h1>Architectural Decision Records</h1>
        <p class="workspace-description">
          Document and track architectural decisions for {{ project.name }}
        </p>
      </div>
      <div class="header-right">
        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-value">{{ adrStats.total || 0 }}</span>
            <span class="stat-label">Total ADRs</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ adrStats.accepted || 0 }}</span>
            <span class="stat-label">Accepted</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ adrStats.proposed || 0 }}</span>
            <span class="stat-label">Proposed</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="workspace-content">
      <!-- List View -->
      <ADRList
        v-if="viewMode === 'list'"
        :adrs="adrs"
        :search-query="searchQuery"
        :status-filter="statusFilter"
        :tag-filter="tagFilter"
        :readonly="false"
        @adr-select="handleADRSelect"
        @adr-create="handleADRCreate"
        @adr-edit="handleADREdit"
        @adr-delete="handleADRDelete"
        @search-change="handleSearchChange"
        @filter-change="handleFilterChange"
      />

      <!-- Editor View -->
      <ADREditor
        v-else-if="viewMode === 'edit' || viewMode === 'create'"
        :adr="selectedADR"
        :mode="viewMode"
        :readonly="false"
        @save="handleADRSave"
        @cancel="handleEditorCancel"
        @delete="handleADRDelete"
      />
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Error Toast -->
    <div v-if="errorMessage" class="error-toast" @click="clearError">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button class="error-close">×</button>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="successMessage" class="success-toast" @click="clearSuccess">
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span class="success-text">{{ successMessage }}</span>
        <button class="success-close">×</button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>Confirm Delete</h3>
        <p>Are you sure you want to delete this ADR? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
          <button class="btn-danger" @click="confirmDelete">Delete ADR</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ADRList from './ADRList.vue'
import ADREditor from './ADREditor.vue'
import { ADRApiService } from '../services/ADRApiService'
import { useADRSearch } from '../composables/useADRSearch'
import type { 
  ADR, 
  ADRWorkspaceProps, 
  ADRWorkspaceEmits, 
  ADRWorkspaceState,
  ADRFilterConfig,
  CreateADRRequest
} from '../types/adr'
import type { Project } from '../types/project'

const props = defineProps<ADRWorkspaceProps>()
const emit = defineEmits<ADRWorkspaceEmits>()

// Router
const router = useRouter()

// Composables
const { 
  searchConfig,
  filterConfig,
  updateSearchConfig,
  updateFilterConfig,
  performSearch,
  applyFilters
} = useADRSearch()

// Reactive state
const workspaceState = ref<ADRWorkspaceState>({
  isLoading: false,
  isSaving: false,
  hasChanges: false,
  lastSaved: null,
  adrs: [],
  selectedADR: null,
  viewMode: 'list',
  searchQuery: '',
  statusFilter: 'all',
  tagFilter: [],
  sortBy: 'date',
  sortOrder: 'desc'
})

const isLoading = ref(false)
const loadingMessage = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const showDeleteConfirm = ref(false)
const adrToDelete = ref<string | null>(null)

// Computed properties
const adrs = computed(() => workspaceState.value.adrs)
const selectedADR = computed(() => workspaceState.value.selectedADR)
const viewMode = computed(() => workspaceState.value.viewMode)
const searchQuery = computed(() => workspaceState.value.searchQuery)
const statusFilter = computed(() => workspaceState.value.statusFilter)
const tagFilter = computed(() => workspaceState.value.tagFilter)

const adrStats = computed(() => {
  const stats = {
    total: adrs.value.length,
    proposed: 0,
    accepted: 0,
    deprecated: 0,
    superseded: 0
  }

  adrs.value.forEach(adr => {
    stats[adr.status]++
  })

  return stats
})

// Lifecycle
onMounted(async () => {
  await loadADRs()
  
  // Initialize API service
  ADRApiService.initialize()
})

// Methods
const loadADRs = async () => {
  isLoading.value = true
  loadingMessage.value = 'Loading ADRs...'
  
  try {
    const loadedADRs = await ADRApiService.listADRs(props.project.id)
    workspaceState.value.adrs = loadedADRs.data
    
    // Load stats
    // try {
    //   const stats = await ADRApiService.getADRStats(props.project.id)
    //   // Stats are computed from the loaded ADRs, but we could use API stats if needed
    // } catch (statsError) {
    //   console.warn('Failed to load ADR stats:', statsError)
    // }
    
  } catch (error) {
    console.error('Failed to load ADRs:', error)
    showError('Failed to load ADRs. Please try again.')
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

const handleADRSelect = (adr: ADR) => {
  workspaceState.value.selectedADR = adr
  workspaceState.value.viewMode = 'edit'
}

const handleADRCreate = () => {
  workspaceState.value.selectedADR = null
  workspaceState.value.viewMode = 'create'
}

const handleADREdit = (adr: ADR) => {
  workspaceState.value.selectedADR = adr
  workspaceState.value.viewMode = 'edit'
}

const handleADRSave = async (adr: ADR) => {
  isLoading.value = true
  loadingMessage.value = workspaceState.value.viewMode === 'create' ? 'Creating ADR...' : 'Saving ADR...'
  
  try {
    let savedADR: ADR
    
    if (workspaceState.value.viewMode === 'create') {
      const createRequest: CreateADRRequest = {
        title: adr.title,
        status: adr.status,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        alternatives: adr.alternatives,
        author: adr.author,
        tags: adr.tags
      }
      
      savedADR = await ADRApiService.createADR(props.project.id, createRequest)
      workspaceState.value.adrs.push(savedADR)
      showSuccess('ADR created successfully!')
    } else {
      const updateRequest = {
        title: adr.title,
        status: adr.status,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        alternatives: adr.alternatives,
        tags: adr.tags,
        superseded_by: adr.superseded_by,
        supersedes: adr.supersedes
      }
      
      savedADR = await ADRApiService.updateADR(adr.id, updateRequest)
      
      // Update the ADR in the list
      const index = workspaceState.value.adrs.findIndex(a => a.id === adr.id)
      if (index !== -1) {
        workspaceState.value.adrs[index] = savedADR
      }
      
      showSuccess('ADR updated successfully!')
    }
    
    workspaceState.value.selectedADR = savedADR
    workspaceState.value.viewMode = 'list'
    workspaceState.value.hasChanges = false
    workspaceState.value.lastSaved = new Date()
    
    emit('unsaved-changes', false)
    
  } catch (error) {
    console.error('Failed to save ADR:', error)
    showError('Failed to save ADR. Please try again.')
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

const handleADRDelete = (adrId: string) => {
  adrToDelete.value = adrId
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!adrToDelete.value) return
  
  isLoading.value = true
  loadingMessage.value = 'Deleting ADR...'
  showDeleteConfirm.value = false
  
  try {
    await ADRApiService.deleteADR(adrToDelete.value)
    
    // Remove from list
    workspaceState.value.adrs = workspaceState.value.adrs.filter(
      adr => adr.id !== adrToDelete.value
    )
    
    // If we're editing the deleted ADR, go back to list
    if (workspaceState.value.selectedADR?.id === adrToDelete.value) {
      workspaceState.value.selectedADR = null
      workspaceState.value.viewMode = 'list'
    }
    
    showSuccess('ADR deleted successfully!')
    
  } catch (error) {
    console.error('Failed to delete ADR:', error)
    showError('Failed to delete ADR. Please try again.')
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
    adrToDelete.value = null
  }
}

const handleEditorCancel = () => {
  if (workspaceState.value.hasChanges) {
    const shouldDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?')
    if (!shouldDiscard) return
  }
  
  workspaceState.value.selectedADR = null
  workspaceState.value.viewMode = 'list'
  workspaceState.value.hasChanges = false
  emit('unsaved-changes', false)
}

const handleSearchChange = (query: string) => {
  workspaceState.value.searchQuery = query
  updateSearchConfig({ query })
}

const handleFilterChange = (filterConfig: ADRFilterConfig) => {
  workspaceState.value.statusFilter = filterConfig.status
  workspaceState.value.tagFilter = filterConfig.tags
  updateFilterConfig(filterConfig)
}

// Utility methods
const showError = (message: string) => {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

const showSuccess = (message: string) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const clearError = () => {
  errorMessage.value = ''
}

const clearSuccess = () => {
  successMessage.value = ''
}

// Watch for changes to emit unsaved changes
watch(() => workspaceState.value.hasChanges, (hasChanges) => {
  emit('unsaved-changes', hasChanges)
})

// Watch for project changes
watch(() => props.project, async (newProject) => {
  if (newProject) {
    await loadADRs()
  }
}, { deep: true })
</script>

<style scoped>
.adr-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  position: relative;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #f8f9fa;
}

.header-left h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #24292f;
}

.workspace-description {
  margin: 0;
  font-size: 0.875rem;
  color: #656d76;
  line-height: 1.4;
}

.stats-summary {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #0969da;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #656d76;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}

.workspace-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content p {
  margin: 0;
  font-size: 0.875rem;
  color: #656d76;
}

.error-toast,
.success-toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 1001;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.error-toast {
  background-color: #ffebe9;
  border: 1px solid #ffcccb;
}

.success-toast {
  background-color: #dafbe1;
  border: 1px solid #9ae6b4;
}

.error-content,
.success-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.error-icon,
.success-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.error-text,
.success-text {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-text {
  color: #cf222e;
}

.success-text {
  color: #1a7f37;
}

.error-close,
.success-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  flex-shrink: 0;
}

.error-close:hover,
.success-close:hover {
  opacity: 1;
}

.modal-overlay {
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

.modal-content {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #24292f;
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #656d76;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.btn-primary {
  background-color: #0969da;
  color: #ffffff;
  border-color: #0969da;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0860ca;
}

.btn-secondary {
  background-color: #f6f8fa;
  color: #24292f;
  border-color: #d1d9e0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.btn-danger {
  background-color: #cf222e;
  color: #ffffff;
  border-color: #cf222e;
}

.btn-danger:hover:not(:disabled) {
  background-color: #b91c1c;
}

@media (max-width: 768px) {
  .workspace-header {
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem 1rem;
  }

  .stats-summary {
    gap: 1rem;
    justify-content: center;
    width: 100%;
  }

  .error-toast,
  .success-toast {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }

  .modal-content {
    margin: 1rem;
    width: auto;
  }
}
</style>