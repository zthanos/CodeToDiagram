<template>
  <div class="solution-outline-section">
    <!-- Section Header -->
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">🎯</span>
        Solution Outline
      </h3>
      <div class="section-actions">
        <button 
          class="refresh-btn" 
          @click="refreshOutlineData" 
          :disabled="isLoading"
          :class="{ 'loading': isLoading }"
          title="Refresh solution outline data"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else class="refresh-icon">🔄</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !projectOutline" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-content">
        <p class="loading-title">Loading Solution Outline</p>
        <p class="loading-subtitle">Fetching outline data and version history...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !projectOutline" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4 class="error-title">Failed to Load Solution Outline</h4>
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
      <!-- Current Status Card -->
      <div class="status-card">
        <div class="card-header">
          <h4 class="card-title">Current Status</h4>
          <div class="status-badge" :class="statusClass">
            {{ statusText }}
          </div>
        </div>
        
        <div class="card-content">
          <div v-if="projectOutline" class="outline-info">
            <!-- Working Version Info -->
            <div class="version-info">
              <div class="info-item">
                <span class="info-label">Working Version:</span>
                <span class="info-value version-number">
                  v{{ projectOutline.working_version }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Current Version:</span>
                <span class="info-value version-number">
                  v{{ projectOutline.version }}
                </span>
              </div>
            </div>

            <!-- Status Info -->
            <div class="status-info">
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value status-value" :class="projectOutline.status">
                  {{ capitalizeFirst(projectOutline.status) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Updated:</span>
                <span class="info-value">
                  {{ formatDateTime(new Date(projectOutline.updated_at)) }}
                </span>
              </div>
            </div>

            <!-- Content Preview -->
            <div class="content-preview" v-if="projectOutline.content">
              <div class="info-item">
                <span class="info-label">Content Preview:</span>
              </div>
              <div class="content-text">
                {{ truncateContent(projectOutline.content, 200) }}
              </div>
            </div>
          </div>

          <div v-else-if="!projectOutline" class="no-data">
            <span class="no-data-icon">📝</span>
            <span class="no-data-text">No solution outline available</span>
            <p class="no-data-subtitle">Create a solution outline to get started</p>
          </div>
        </div>
      </div>

      <!-- Version History Card -->
      <div class="version-history-card" v-if="versions.length > 0">
        <div class="card-header">
          <h4 class="card-title">Version History</h4>
          <div class="version-count">
            {{ versions.length }} version{{ versions.length !== 1 ? 's' : '' }}
          </div>
        </div>
        
        <div class="card-content">
          <div class="versions-list">
            <div 
              v-for="version in displayedVersions" 
              :key="version.version"
              class="version-item"
              :class="{ 
                'working-version': version.version === projectOutline?.working_version,
                'current-version': version.version === projectOutline?.version
              }"
            >
              <div class="version-header">
                <div class="version-number">
                  v{{ version.version }}
                  <span v-if="version.version === projectOutline?.working_version" class="working-badge">
                    Working
                  </span>
                  <span v-if="version.version === projectOutline?.version" class="current-badge">
                    Current
                  </span>
                </div>
                <div class="version-date">
                  {{ formatDateTime(new Date(version.created_at)) }}
                </div>
              </div>
              
              <div class="version-details">
                <div class="version-status" :class="version.status">
                  {{ capitalizeFirst(version.status) }}
                </div>
                <div v-if="version.changes_summary" class="version-changes">
                  {{ version.changes_summary }}
                </div>
              </div>
            </div>
          </div>

          <!-- Show More/Less Button -->
          <div v-if="versions.length > maxDisplayedVersions" class="show-more-section">
            <button 
              class="show-more-btn" 
              @click="toggleShowAllVersions"
            >
              {{ showAllVersions ? 'Show Less' : `Show ${versions.length - maxDisplayedVersions} More Versions` }}
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
import { ProjectOutlineApiService } from '../services/ProjectOutlineApiService'
import type { ProjectOutline, OutlineVersion } from '../types/projectOutline'

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
  'outline-loaded': [outline: ProjectOutline]
  'outline-error': [error: string]
  'version-selected': [version: number]
}>()

// Core state
const isLoading = ref(false)
const error = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const lastUpdated = ref<Date | null>(null)

// Data state
const projectOutline = ref<ProjectOutline | null>(null)
const versions = ref<OutlineVersion[]>([])

// UI state
const showAllVersions = ref(false)
const maxDisplayedVersions = 3
const autoRefreshEnabled = ref(props.autoRefresh)

// Auto-refresh timer
let refreshTimer: number | null = null

// Computed properties
const statusClass = computed(() => {
  if (isLoading.value) return 'loading'
  if (error.value) return 'error'
  if (!projectOutline.value) return 'empty'
  return projectOutline.value.status
})

const statusText = computed(() => {
  if (isLoading.value) return 'Loading...'
  if (error.value) return 'Error'
  if (!projectOutline.value) return 'No Data'
  return capitalizeFirst(projectOutline.value.status)
})

const displayedVersions = computed(() => {
  if (showAllVersions.value) {
    return versions.value
  }
  return versions.value.slice(0, maxDisplayedVersions)
})

// Watch for project ID changes
watch(() => props.projectId, (newProjectId, oldProjectId) => {
  if (newProjectId && newProjectId !== oldProjectId) {
    loadOutlineData()
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
    loadOutlineData()
  }
  if (autoRefreshEnabled.value) {
    setupAutoRefresh()
  }
})

onBeforeUnmount(() => {
  cleanupAutoRefresh()
})

// Methods
async function loadOutlineData() {
  if (!props.projectId) {
    console.warn('Cannot load solution outline: project ID is missing')
    return
  }

  isLoading.value = true
  error.value = null

  try {
    // Load outline and versions in parallel
    const [outlineResult, versionsResult] = await Promise.allSettled([
      ProjectOutlineApiService.getProjectOutline(props.projectId),
      ProjectOutlineApiService.getOutlineVersions(props.projectId)
    ])

    // Handle outline result
    if (outlineResult.status === 'fulfilled') {
      projectOutline.value = outlineResult.value
      emit('outline-loaded', outlineResult.value)
    } else {
      console.error('Failed to load project outline:', outlineResult.reason)
    }

    // Handle versions result
    if (versionsResult.status === 'fulfilled') {
      versions.value = versionsResult.value.sort((a, b) => b.version - a.version)
    } else {
      console.error('Failed to load outline versions:', versionsResult.reason)
      // Don't fail the entire load if versions fail
      versions.value = []
    }

    // If we have at least the outline, consider it a success
    if (projectOutline.value) {
      lastUpdated.value = new Date()
      retryCount.value = 0
      console.log('Solution outline data loaded successfully')
    } else if (outlineResult.status === 'rejected') {
      throw outlineResult.reason
    } else {
      throw new Error('Failed to load solution outline data')
    }

  } catch (err: any) {
    console.error('Failed to load solution outline data:', err)
    error.value = err.message || 'Failed to load solution outline data'
    emit('outline-error', err.message || 'Failed to load solution outline data')
  } finally {
    isLoading.value = false
  }
}

async function refreshOutlineData() {
  await loadOutlineData()
}

async function retryLoadData() {
  if (retryCount.value < maxRetries) {
    retryCount.value++
    await loadOutlineData()
  }
}

function toggleShowAllVersions() {
  showAllVersions.value = !showAllVersions.value
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
}

function setupAutoRefresh() {
  cleanupAutoRefresh()
  if (props.refreshInterval > 0) {
    refreshTimer = window.setInterval(() => {
      if (!isLoading.value) {
        loadOutlineData()
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

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength).trim() + '...'
}
</script>

<style scoped>
.solution-outline-section {
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

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
.status-card, .version-history-card {
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

.status-badge.active {
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

/* Outline Info */
.outline-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.version-info, .status-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
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

.status-value.draft {
  color: var(--color-warning);
}

.status-value.active {
  color: var(--color-success);
}

.status-value.archived {
  color: var(--color-text-2);
}

/* Content Preview */
.content-preview {
  margin-top: 0.5rem;
}

.content-text {
  background: var(--color-background-mute);
  padding: 0.75rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--color-text-2);
  white-space: pre-wrap;
  word-break: break-word;
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
  margin: 0;
}

/* Version History */
.version-count {
  font-size: 0.9rem;
  color: var(--color-text-2);
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-item {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.version-item.working-version {
  border-color: var(--color-brand);
  background: var(--color-brand-soft);
}

.version-item.current-version {
  border-color: var(--color-success);
  background: var(--color-success-soft);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.version-number {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-weight: 600;
  color: var(--color-heading);
}

.working-badge, .current-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  border-radius: 8px;
  font-weight: 500;
  text-transform: uppercase;
}

.working-badge {
  background: var(--color-brand);
  color: white;
}

.current-badge {
  background: var(--color-success);
  color: white;
}

.version-date {
  font-size: 0.8rem;
  color: var(--color-text-2);
}

.version-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.version-status {
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.version-status.draft {
  color: var(--color-warning);
}

.version-status.active {
  color: var(--color-success);
}

.version-status.archived {
  color: var(--color-text-2);
}

.version-changes {
  flex: 1;
  font-size: 0.85rem;
  color: var(--color-text-2);
  font-style: italic;
}

/* Show More Section */
.show-more-section {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.show-more-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.show-more-btn:hover {
  background: var(--color-background-soft);
  border-color: var(--color-border-hover);
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
  .solution-outline-section {
    padding: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .version-info, .status-info {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .version-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .version-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>