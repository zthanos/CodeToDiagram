<template>
  <div class="requirements-status-section">
    <!-- Section Header -->
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">📋</span>
        Requirements Status
      </h3>
      <div class="section-actions">
        <button 
          class="refresh-btn" 
          @click="refreshRequirementsData" 
          :disabled="isLoading"
          :class="{ 'loading': isLoading }"
          title="Refresh requirements data"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else class="refresh-icon">🔄</span>
        </button>
        <button 
          class="navigate-btn" 
          @click="navigateToRequirementsWorkspace()"
          title="Open Requirements Workspace"
        >
          <span class="navigate-icon">🔗</span>
          <span class="navigate-text">Manage</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !hasAnyData" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-content">
        <p class="loading-title">Loading Requirements Status</p>
        <p class="loading-subtitle">Fetching requirements data and metrics...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !hasAnyData" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4 class="error-title">Failed to Load Requirements Status</h4>
        <p class="error-message">{{ error }}</p>
        <div class="error-actions">
          <button 
            class="retry-btn" 
            @click="retryLoadData"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner"></span>
            {{ isLoading ? 'Retrying...' : 'Try Again' }}
          </button>
        </div>
        <p class="retry-info" v-if="retryCount > 0">
          Retry attempt {{ retryCount }}/{{ maxRetries }}
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="section-content">
      <!-- Status Overview Card -->
      <div class="status-card">
        <div class="card-header">
          <h4 class="card-title">Status Overview</h4>
          <div class="status-badge" :class="statusClass">
            {{ statusText }}
          </div>
        </div>
        
        <div class="card-content">
          <div v-if="requirementsDocument || requirementsSummary" class="requirements-info">
            <!-- Document Version Info -->
            <div v-if="requirementsDocument" class="document-info">
              <div class="info-item">
                <span class="info-label">Document Version:</span>
                <span class="info-value version-number">
                  v{{ requirementsDocument.version }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Working Version:</span>
                <span class="info-value version-number working-version">
                  v{{ requirementsDocument.version }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Document Status:</span>
                <span class="info-value status-value" :class="requirementsDocument.status">
                  {{ capitalizeFirst(requirementsDocument.status) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Updated:</span>
                <span class="info-value">
                  {{ formatDateTime(new Date(requirementsDocument.updated_at)) }}
                </span>
              </div>
            </div>

            <!-- Requirements Summary Metrics -->
            <div v-if="requirementsSummary" class="summary-metrics">
              <div class="metrics-header">
                <h5 class="metrics-title">Requirements Metrics</h5>
              </div>
              <div class="metrics-grid">
                <div class="metric-item total">
                  <div class="metric-value">{{ requirementsSummary.total || 0 }}</div>
                  <div class="metric-label">Total Requirements</div>
                </div>
                <div class="metric-item accepted">
                  <div class="metric-value">{{ requirementsSummary.accepted || 0 }}</div>
                  <div class="metric-label">Accepted</div>
                </div>
                <div class="metric-item pending">
                  <div class="metric-value">{{ requirementsSummary.pending || 0 }}</div>
                  <div class="metric-label">Pending</div>
                </div>
                <div class="metric-item rejected">
                  <div class="metric-value">{{ requirementsSummary.rejected || 0 }}</div>
                  <div class="metric-label">Rejected</div>
                </div>
              </div>
            </div>

            <!-- Progress Tracking -->
            <div v-if="requirementsSummary && requirementsSummary.total > 0" class="progress-tracking">
              <div class="progress-header">
                <h5 class="progress-title">Progress Tracking</h5>
                <div class="progress-percentage">
                  {{ progressPercentage }}% Complete
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
              </div>
              <div class="progress-breakdown">
                <div class="breakdown-item accepted">
                  <span class="breakdown-color"></span>
                  <span class="breakdown-label">Accepted ({{ acceptedPercentage }}%)</span>
                </div>
                <div class="breakdown-item pending">
                  <span class="breakdown-color"></span>
                  <span class="breakdown-label">Pending ({{ pendingPercentage }}%)</span>
                </div>
                <div class="breakdown-item rejected">
                  <span class="breakdown-color"></span>
                  <span class="breakdown-label">Rejected ({{ rejectedPercentage }}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-data">
            <span class="no-data-icon">📋</span>
            <span class="no-data-text">No requirements data available</span>
            <p class="no-data-subtitle">Upload a requirements document or create requirements manually</p>
            <div class="no-data-actions">
              <button 
                class="action-btn primary" 
                @click="navigateToRequirementsWorkspace()"
              >
                Create Requirements
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Card -->
      <div class="quick-actions-card">
        <div class="card-header">
          <h4 class="card-title">Quick Actions</h4>
        </div>
        <div class="card-content">
          <div class="actions-grid">
            <button 
              class="action-btn" 
              @click="navigateToRequirementsWorkspace()"
              title="Open Requirements Workspace for detailed management"
            >
              <span class="action-icon">📝</span>
              <span class="action-text">Manage Requirements</span>
            </button>
            <button 
              class="action-btn" 
              @click="navigateToRequirementsWorkspace('systems')"
              title="View and manage systems"
            >
              <span class="action-icon">🏗️</span>
              <span class="action-text">View Systems</span>
            </button>
            <button 
              class="action-btn" 
              @click="navigateToRequirementsWorkspace('teams')"
              title="View and manage teams"
            >
              <span class="action-icon">👥</span>
              <span class="action-text">View Teams</span>
            </button>
            <button 
              class="action-btn" 
              @click="refreshRequirementsData"
              :disabled="isLoading"
              title="Refresh requirements data"
            >
              <span class="action-icon">🔄</span>
              <span class="action-text">Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Real-time Status Updates -->
      <div v-if="lastUpdated" class="last-updated-info">
        <span class="update-icon">🕒</span>
        <span class="update-text">
          Last updated: {{ formatRelativeTime(lastUpdated) }}
        </span>
        <button 
          class="auto-refresh-toggle" 
          @click="toggleAutoRefresh"
          :class="{ 'active': autoRefreshEnabled }"
          title="Toggle automatic refresh"
        >
          {{ autoRefreshEnabled ? '🔄 Auto' : '⏸️ Manual' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RequirementsApiService } from '../services/RequirementsApiService'
import type { RequirementsDocument } from '../types/requirements'

// Props interface
interface Props {
  projectId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 300000 // 5 minutes
})

// Emits
const emit = defineEmits<{
  'requirements-loaded': [document: RequirementsDocument, summary: any]
  'requirements-error': [error: string]
  'navigate-to-requirements': [tab?: string]
}>()

// Router for navigation
const router = useRouter()

// Core state
const isLoading = ref(false)
const error = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const lastUpdated = ref<Date | null>(null)

// Data state
const requirementsDocument = ref<RequirementsDocument | null>(null)
const requirementsSummary = ref<any>(null)

// UI state
const autoRefreshEnabled = ref(props.autoRefresh)

// Auto-refresh timer
let refreshTimer: number | null = null

// Computed properties
const hasAnyData = computed(() => {
  return requirementsDocument.value || requirementsSummary.value
})

const statusClass = computed(() => {
  if (isLoading.value) return 'loading'
  if (error.value) return 'error'
  if (!requirementsDocument.value) return 'empty'
  return requirementsDocument.value.status
})

const statusText = computed(() => {
  if (isLoading.value) return 'Loading...'
  if (error.value) return 'Error'
  if (!requirementsDocument.value) return 'No Data'
  return capitalizeFirst(requirementsDocument.value.status)
})

const progressPercentage = computed(() => {
  if (!requirementsSummary.value || !requirementsSummary.value.total) return 0
  const accepted = requirementsSummary.value.accepted || 0
  return Math.round((accepted / requirementsSummary.value.total) * 100)
})

const acceptedPercentage = computed(() => {
  if (!requirementsSummary.value || !requirementsSummary.value.total) return 0
  const accepted = requirementsSummary.value.accepted || 0
  return Math.round((accepted / requirementsSummary.value.total) * 100)
})

const pendingPercentage = computed(() => {
  if (!requirementsSummary.value || !requirementsSummary.value.total) return 0
  const pending = requirementsSummary.value.pending || 0
  return Math.round((pending / requirementsSummary.value.total) * 100)
})

const rejectedPercentage = computed(() => {
  if (!requirementsSummary.value || !requirementsSummary.value.total) return 0
  const rejected = requirementsSummary.value.rejected || 0
  return Math.round((rejected / requirementsSummary.value.total) * 100)
})

// Watch for project ID changes
watch(() => props.projectId, (newProjectId, oldProjectId) => {
  if (newProjectId && newProjectId !== oldProjectId) {
    loadRequirementsData()
  }
})

// Watch for auto-refresh setting changes
watch(() => autoRefreshEnabled.value, (enabled) => {
  if (enabled) {
    setupAutoRefresh()
  } else {
    cleanupAutoRefresh()
  }
})

// Lifecycle
onMounted(() => {
  if (props.projectId) {
    loadRequirementsData()
  }
  if (autoRefreshEnabled.value) {
    setupAutoRefresh()
  }
})

onBeforeUnmount(() => {
  cleanupAutoRefresh()
})

// Methods
async function loadRequirementsData() {
  if (!props.projectId) {
    console.warn('Cannot load requirements status: project ID is missing')
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // Load document and summary in parallel
    const [documentResult, summaryResult] = await Promise.allSettled([
      RequirementsApiService.getLatestRequirements(props.projectId),
      RequirementsApiService.getRequirementItemsSummary(props.projectId)
    ])

    // Handle document result
    if (documentResult.status === 'fulfilled') {
      requirementsDocument.value = documentResult.value
    } else {
      console.error('Failed to load requirements document:', documentResult.reason)
    }

    // Handle summary result
    if (summaryResult.status === 'fulfilled') {
      requirementsSummary.value = summaryResult.value
    } else {
      console.error('Failed to load requirements summary:', summaryResult.reason)
    }

    // If we have at least some data, consider it a success
    if (requirementsDocument.value || requirementsSummary.value) {
      lastUpdated.value = new Date()
      retryCount.value = 0
      emit('requirements-loaded', requirementsDocument.value!, requirementsSummary.value)
      console.log('Requirements status data loaded successfully')
    } else {
      // Both failed - check if it's due to errors
      const documentError = documentResult.status === 'rejected' ? documentResult.reason : null
      const summaryError = summaryResult.status === 'rejected' ? summaryResult.reason : null
      
      if (documentError || summaryError) {
        // At least one failed with an error
        const errorMessage = documentError?.message || summaryError?.message || 'Failed to load requirements status data'
        error.value = errorMessage
        emit('requirements-error', errorMessage)
      } else {
        // Both succeeded but returned null/empty data
        console.warn('No requirements data available')
      }
    }

  } catch (err: any) {
    console.error('Failed to load requirements status data:', err)
    error.value = err.message || 'Failed to load requirements status data'
    emit('requirements-error', err.message || 'Failed to load requirements status data')
  } finally {
    isLoading.value = false
  }
}

async function refreshRequirementsData() {
  await loadRequirementsData()
}

async function retryLoadData() {
  if (retryCount.value < maxRetries) {
    retryCount.value++
    await loadRequirementsData()
  }
}

function navigateToRequirementsWorkspace(tab?: string) {
  emit('navigate-to-requirements', tab)
  
  // Navigate to requirements workspace
  const route = {
    name: 'project-workspace',
    params: { projectId: props.projectId },
    query: { workspace: 'requirements' }
  }
  
  if (tab) {
    route.query.tab = tab
  }
  
  router.push(route)
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
}

function setupAutoRefresh() {
  cleanupAutoRefresh()
  if (props.refreshInterval > 0) {
    refreshTimer = window.setInterval(() => {
      if (!isLoading.value) {
        loadRequirementsData()
      }
    }, props.refreshInterval)
  }
}

function cleanupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// Utility functions
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  
  return formatDateTime(date)
}
</script>

<style scoped>
.requirements-status-section {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

.section-icon {
  font-size: 1.5rem;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.refresh-btn, .navigate-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.refresh-btn:hover:not(:disabled), .navigate-btn:hover {
  background: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.navigate-btn {
  background: var(--color-brand);
  color: white;
  border-color: var(--color-brand);
}

.navigate-btn:hover {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
}

.refresh-btn.loading .refresh-icon {
  animation: spin 1s linear infinite;
}

/* Loading State */
.loading-state {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-content {
  flex: 1;
}

.loading-title {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: var(--color-heading);
}

.loading-subtitle {
  margin: 0;
  color: var(--color-text-2);
  font-size: 0.9rem;
}

/* Error State */
.error-state {
  text-align: center;
  padding: 2rem;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-title {
  margin: 0 0 0.5rem 0;
  color: var(--color-danger);
  font-weight: 600;
}

.error-message {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-2);
}

.error-actions {
  margin-bottom: 1rem;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.retry-btn:hover:not(:disabled) {
  background: var(--color-brand-dark);
}

.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-info {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-2);
}

/* Section Content */
.section-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Status Card */
.status-card, .quick-actions-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.draft {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.status-badge.published {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.status-badge.archived {
  background: var(--color-text-3);
  color: var(--color-background);
}

.status-badge.loading {
  background: var(--color-border);
  color: var(--color-text-2);
}

.status-badge.error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.status-badge.empty {
  background: var(--color-border);
  color: var(--color-text-2);
}

.card-content {
  padding: 1rem;
}

/* Requirements Info */
.requirements-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.document-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-weight: 600;
  color: var(--color-text);
}

.version-number {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--color-background-mute);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.working-version {
  background: var(--color-brand-soft);
  color: var(--color-brand);
  border: 1px solid var(--color-brand);
}

.status-value.draft {
  color: var(--color-warning);
}

.status-value.published {
  color: var(--color-success);
}

.status-value.archived {
  color: var(--color-text-2);
}

/* Summary Metrics */
.summary-metrics {
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.metrics-header {
  margin-bottom: 1rem;
}

.metrics-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.metric-item {
  text-align: center;
  padding: 1rem;
  background: var(--color-background-mute);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.8rem;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-item.total .metric-value {
  color: var(--color-brand);
}

.metric-item.accepted .metric-value {
  color: var(--color-success);
}

.metric-item.pending .metric-value {
  color: var(--color-warning);
}

.metric-item.rejected .metric-value {
  color: var(--color-danger);
}

/* Progress Tracking */
.progress-tracking {
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.progress-percentage {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-brand);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-background-mute);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-success), var(--color-brand));
  transition: width 0.3s ease;
}

.progress-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.breakdown-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.breakdown-item.accepted .breakdown-color {
  background: var(--color-success);
}

.breakdown-item.pending .breakdown-color {
  background: var(--color-warning);
}

.breakdown-item.rejected .breakdown-color {
  background: var(--color-danger);
}

/* No Data State */
.no-data {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-2);
}

.no-data-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.no-data-text {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.no-data-subtitle {
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}

.no-data-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: var(--color-text);
  font-size: 0.9rem;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-background-soft);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: var(--color-brand);
  color: white;
  border-color: var(--color-brand);
}

.action-btn.primary:hover {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
}

.action-icon {
  font-size: 1.1rem;
}

.action-text {
  font-weight: 500;
}

/* Last Updated Info */
.last-updated-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-background-mute);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-text-2);
}

.update-icon {
  font-size: 1rem;
}

.update-text {
  flex: 1;
}

.auto-refresh-toggle {
  padding: 0.25rem 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.auto-refresh-toggle:hover {
  background: var(--color-background-soft);
}

.auto-refresh-toggle.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand);
}

/* Spinner Animation */
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
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
@media (max-width: 768px) {
  .requirements-status-section {
    padding: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .section-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .document-info {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .progress-breakdown {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .metric-item {
    padding: 0.75rem;
  }
  
  .metric-value {
    font-size: 1.5rem;
  }
}
</style>