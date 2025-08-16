<template>
  <div class="adrs-section">
    <!-- Section Header -->
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">📚</span>
        Architectural Decision Records
      </h3>
      <div class="section-actions">
        <button 
          class="refresh-btn" 
          @click="refreshADRsData" 
          :disabled="isLoading"
          :class="{ 'loading': isLoading }"
          title="Refresh ADRs data"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else class="refresh-icon">🔄</span>
        </button>
        <button 
          class="view-all-btn" 
          @click="navigateToADRWorkspace"
          title="View all ADRs in dedicated workspace"
        >
          <span class="view-icon">📖</span>
          View All
        </button>
      </div>
    </div>

    <!-- Search and Filter Controls -->
    <div class="controls-section" v-if="adrs.length > 0 || searchQuery || hasActiveFilters">
      <div class="search-controls">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search ADRs by title, content, or author..."
            class="search-input"
            @input="onSearchInput"
          />
          <button 
            v-if="searchQuery" 
            class="clear-search-btn"
            @click="clearSearch"
            title="Clear search"
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="filter-controls">
        <div class="filter-group">
          <label class="filter-label">Status:</label>
          <select 
            v-model="selectedStatus" 
            class="filter-select"
            @change="onFilterChange"
          >
            <option value="">All Statuses</option>
            <option value="proposed">Proposed</option>
            <option value="accepted">Accepted</option>
            <option value="deprecated">Deprecated</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Author:</label>
          <select 
            v-model="selectedAuthor" 
            class="filter-select"
            @change="onFilterChange"
          >
            <option value="">All Authors</option>
            <option v-for="author in uniqueAuthors" :key="author" :value="author">
              {{ author }}
            </option>
          </select>
        </div>
        
        <button 
          v-if="hasActiveFilters || searchQuery"
          class="clear-filters-btn"
          @click="clearAllFilters"
          title="Clear all filters and search"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && adrs.length === 0" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-content">
        <p class="loading-title">Loading ADRs</p>
        <p class="loading-subtitle">Fetching architectural decision records...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error && adrs.length === 0" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4 class="error-title">Failed to Load ADRs</h4>
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
      <!-- Summary Card -->
      <div class="summary-card">
        <div class="card-header">
          <h4 class="card-title">ADRs Summary</h4>
          <div class="summary-badge">
            {{ filteredADRs.length }} of {{ adrs.length }} ADRs
          </div>
        </div>
        
        <div class="card-content">
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-value">{{ adrs.length }}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ acceptedCount }}</span>
              <span class="stat-label">Accepted</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ proposedCount }}</span>
              <span class="stat-label">Proposed</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ deprecatedCount }}</span>
              <span class="stat-label">Deprecated</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ADRs List -->
      <div class="adrs-list-card">
        <div class="card-header">
          <h4 class="card-title">Recent ADRs</h4>
          <div class="list-controls">
            <button 
              class="sort-btn"
              @click="toggleSortOrder"
              :title="`Sort by date ${sortOrder === 'desc' ? 'ascending' : 'descending'}`"
            >
              {{ sortOrder === 'desc' ? '📅↓' : '📅↑' }}
            </button>
          </div>
        </div>
        
        <div class="card-content">
          <!-- No Results State -->
          <div v-if="filteredADRs.length === 0 && adrs.length > 0" class="no-results">
            <span class="no-results-icon">🔍</span>
            <span class="no-results-text">No ADRs match your search criteria</span>
            <button class="clear-filters-btn" @click="clearAllFilters">
              Clear filters
            </button>
          </div>

          <!-- Empty State -->
          <div v-else-if="adrs.length === 0" class="no-data">
            <span class="no-data-icon">📚</span>
            <span class="no-data-text">No ADRs created yet</span>
            <p class="no-data-subtitle">Create your first architectural decision record</p>
            <button class="create-adr-btn" @click="navigateToADRWorkspace">
              Create ADR
            </button>
          </div>

          <!-- ADRs List -->
          <div v-else class="adrs-list">
            <div 
              v-for="adr in displayedADRs" 
              :key="adr.id"
              class="adr-item"
              :class="{ 'highlighted': searchQuery && isHighlighted(adr) }"
              @click="viewADRDetails(adr)"
            >
              <div class="adr-header">
                <div class="adr-title-section">
                  <h5 class="adr-title" v-html="highlightText(adr.title, searchQuery)"></h5>
                  <div class="adr-meta">
                    <span class="adr-id">ADR-{{ adr.id.slice(-4) }}</span>
                    <span class="adr-author">by {{ adr.author }}</span>
                  </div>
                </div>
                <div class="adr-status-section">
                  <div class="adr-status" :class="adr.status">
                    {{ capitalizeFirst(adr.status) }}
                  </div>
                  <div class="adr-date">
                    {{ formatDate(new Date(adr.created_at)) }}
                  </div>
                </div>
              </div>
              
              <div class="adr-content">
                <div class="adr-context" v-if="adr.context">
                  <strong>Context:</strong>
                  <span v-html="highlightText(truncateText(adr.context, 150), searchQuery)"></span>
                </div>
                <div class="adr-decision" v-if="adr.decision">
                  <strong>Decision:</strong>
                  <span v-html="highlightText(truncateText(adr.decision, 150), searchQuery)"></span>
                </div>
              </div>

              <div class="adr-footer" v-if="adr.tags && adr.tags.length > 0">
                <div class="adr-tags">
                  <span 
                    v-for="tag in adr.tags.slice(0, 3)" 
                    :key="tag" 
                    class="adr-tag"
                    v-html="highlightText(tag, searchQuery)"
                  ></span>
                  <span v-if="adr.tags.length > 3" class="more-tags">
                    +{{ adr.tags.length - 3 }} more
                  </span>
                </div>
              </div>

              <!-- Click indicator -->
              <div class="click-indicator">
                <span class="click-text">Click to view details</span>
                <span class="click-icon">→</span>
              </div>
            </div>
          </div>

          <!-- Show More Button -->
          <div v-if="filteredADRs.length > maxDisplayedADRs" class="show-more-section">
            <button 
              class="show-more-btn" 
              @click="toggleShowAll"
            >
              {{ showAllADRs ? 'Show Less' : `Show ${filteredADRs.length - maxDisplayedADRs} More ADRs` }}
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
import { ADRApiService } from '../services/ADRApiService'
import type { ADR, ADRListOptions } from '../types/adr'

// Props interface
interface Props {
  projectId: string
  autoRefresh?: boolean
  refreshInterval?: number
  maxDisplayed?: number
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  maxDisplayed: 5
})

// Emits
const emit = defineEmits<{
  'adr-selected': [adr: ADR]
  'adrs-loaded': [adrs: ADR[]]
  'adrs-error': [error: string]
  'navigate-to-workspace': []
}>()

// Router
const router = useRouter()

// Core state
const isLoading = ref(false)
const error = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const lastUpdated = ref<Date | null>(null)

// Data state
const adrs = ref<ADR[]>([])

// UI state
const showAllADRs = ref(false)
const maxDisplayedADRs = computed(() => props.maxDisplayed)
const autoRefreshEnabled = ref(props.autoRefresh)

// Search and filter state
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedAuthor = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Auto-refresh timer
let refreshTimer: number | null = null

// Search debounce timer
let searchDebounceTimer: number | null = null

// Computed properties
const uniqueAuthors = computed(() => {
  const authors = adrs.value.map(adr => adr.author)
  return [...new Set(authors)].sort()
})

const hasActiveFilters = computed(() => {
  return selectedStatus.value !== '' || selectedAuthor.value !== ''
})

const filteredADRs = computed(() => {
  let filtered = [...adrs.value]

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(adr => 
      adr.title.toLowerCase().includes(query) ||
      adr.context.toLowerCase().includes(query) ||
      adr.decision.toLowerCase().includes(query) ||
      adr.consequences.toLowerCase().includes(query) ||
      adr.author.toLowerCase().includes(query) ||
      (adr.alternatives && adr.alternatives.toLowerCase().includes(query)) ||
      adr.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // Apply status filter
  if (selectedStatus.value) {
    filtered = filtered.filter(adr => adr.status === selectedStatus.value)
  }

  // Apply author filter
  if (selectedAuthor.value) {
    filtered = filtered.filter(adr => adr.author === selectedAuthor.value)
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB
  })

  return filtered
})

const displayedADRs = computed(() => {
  if (showAllADRs.value) {
    return filteredADRs.value
  }
  return filteredADRs.value.slice(0, maxDisplayedADRs.value)
})

const acceptedCount = computed(() => {
  return adrs.value.filter(adr => adr.status === 'accepted').length
})

const proposedCount = computed(() => {
  return adrs.value.filter(adr => adr.status === 'proposed').length
})

const deprecatedCount = computed(() => {
  return adrs.value.filter(adr => adr.status === 'deprecated').length
})

// Watch for project ID changes
watch(() => props.projectId, (newProjectId, oldProjectId) => {
  if (newProjectId && newProjectId !== oldProjectId) {
    loadADRsData()
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
    loadADRsData()
  }
  if (autoRefreshEnabled.value) {
    setupAutoRefresh()
  }
})

onBeforeUnmount(() => {
  cleanupAutoRefresh()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

// Methods
async function loadADRsData() {
  if (!props.projectId) {
    console.warn('Cannot load ADRs: project ID is missing')
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const options: ADRListOptions = {
      sortBy: 'created_at',
      sortOrder: 'desc',
      limit: 50 // Load more than we display for better filtering
    }

    const loadedADRs = await ADRApiService.listADRs(props.projectId, options)
    adrs.value = loadedADRs
    
    lastUpdated.value = new Date()
    retryCount.value = 0
    
    emit('adrs-loaded', loadedADRs)
    console.log('ADRs data loaded successfully:', loadedADRs.length, 'ADRs')

  } catch (err: any) {
    console.error('Failed to load ADRs data:', err)
    error.value = err.message || 'Failed to load ADRs data'
    emit('adrs-error', err.message || 'Failed to load ADRs data')
  } finally {
    isLoading.value = false
  }
}

async function refreshADRsData() {
  await loadADRsData()
}

async function retryLoadData() {
  if (retryCount.value < maxRetries) {
    retryCount.value++
    await loadADRsData()
  }
}

function onSearchInput() {
  // Debounce search to avoid excessive filtering
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = window.setTimeout(() => {
    // Search is reactive through computed property
    console.log('Search query updated:', searchQuery.value)
  }, 300)
}

function onFilterChange() {
  console.log('Filters updated:', { status: selectedStatus.value, author: selectedAuthor.value })
}

function clearSearch() {
  searchQuery.value = ''
}

function clearAllFilters() {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedAuthor.value = ''
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

function toggleShowAll() {
  showAllADRs.value = !showAllADRs.value
}

function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
}

function viewADRDetails(adr: ADR) {
  emit('adr-selected', adr)
  // Navigate to ADR workspace with the specific ADR selected
  navigateToADRWorkspace(adr.id)
}

function navigateToADRWorkspace(adrId?: string) {
  emit('navigate-to-workspace')
  
  // Navigate to ADR workspace
  const route = {
    name: 'adr-workspace',
    params: { projectId: props.projectId }
  }
  
  if (adrId && typeof adrId === 'string') {
    (route as any).query = { adr: adrId }
  }
  
  router.push(route).catch(err => {
    console.warn('Navigation to ADR workspace failed:', err)
    // Fallback: emit event for parent to handle navigation
    emit('navigate-to-workspace')
  })
}

function setupAutoRefresh() {
  cleanupAutoRefresh()
  if (props.refreshInterval > 0) {
    refreshTimer = window.setInterval(() => {
      if (!isLoading.value) {
        loadADRsData()
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

function isHighlighted(adr: ADR): boolean {
  if (!searchQuery.value.trim()) return false
  
  const query = searchQuery.value.toLowerCase().trim()
  return adr.title.toLowerCase().includes(query) ||
         adr.context.toLowerCase().includes(query) ||
         adr.decision.toLowerCase().includes(query) ||
         adr.author.toLowerCase().includes(query)
}

// Utility functions
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
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
  
  return formatDate(date)
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text
  
  const regex = new RegExp(`(${escapeRegExp(query.trim())})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
.adrs-section {
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

.refresh-btn, .view-all-btn {
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

.refresh-btn:hover:not(:disabled), .view-all-btn:hover {
  background: var(--color-background-mute);
  border-color: var(--color-border-hover);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.view-all-btn {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand);
}

.view-all-btn:hover {
  background: var(--color-brand);
  color: white;
}

.refresh-btn.loading .refresh-icon {
  animation: spin 1s linear infinite;
}

/* Controls Section */
.controls-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.search-controls {
  margin-bottom: 1rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--color-background);
  color: var(--color-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px var(--color-brand-soft);
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-2);
  padding: 0.25rem;
  border-radius: 2px;
}

.clear-search-btn:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-2);
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.9rem;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-brand);
}

.clear-filters-btn {
  padding: 0.5rem 1rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: var(--color-background-soft);
  border-color: var(--color-border-hover);
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

/* Summary Card */
.summary-card, .adrs-list-card {
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

.summary-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: var(--color-background-soft);
  color: var(--color-text-2);
}

.list-controls {
  display: flex;
  gap: 0.5rem;
}

.sort-btn {
  padding: 0.25rem 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  background: var(--color-background-soft);
}

.card-content {
  padding: 1rem;
}

/* Summary Stats */
.summary-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* No Results/Data States */
.no-results, .no-data {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-2);
}

.no-results-icon, .no-data-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.no-results-text, .no-data-text {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.no-data-subtitle {
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.create-adr-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-brand);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.create-adr-btn:hover {
  background: var(--color-brand-dark);
}

/* ADRs List */
.adrs-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.adr-item {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.adr-item:hover {
  border-color: var(--color-brand);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.adr-item.highlighted {
  border-color: var(--color-warning);
  background: var(--color-warning-soft);
}

.adr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.adr-title-section {
  flex: 1;
}

.adr-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.3;
}

.adr-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-2);
}

.adr-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--color-background-mute);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}

.adr-status-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.adr-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.adr-status.proposed {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.adr-status.accepted {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.adr-status.deprecated {
  background: var(--color-text-3);
  color: var(--color-background);
}

.adr-status.superseded {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.adr-date {
  font-size: 0.8rem;
  color: var(--color-text-2);
}

.adr-content {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.adr-context, .adr-decision {
  margin-bottom: 0.5rem;
}

.adr-context strong, .adr-decision strong {
  color: var(--color-heading);
  margin-right: 0.5rem;
}

.adr-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.adr-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.adr-tag {
  padding: 0.125rem 0.5rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--color-text-2);
}

.more-tags {
  font-size: 0.75rem;
  color: var(--color-text-2);
  font-style: italic;
}

.click-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-3);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.adr-item:hover .click-indicator {
  opacity: 1;
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

/* Search Highlighting */
:deep(.search-highlight) {
  background: var(--color-warning-soft);
  color: var(--color-warning-dark);
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 600;
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
  .adrs-section {
    padding: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .controls-section {
    padding: 0.75rem;
  }
  
  .filter-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .summary-stats {
    gap: 1rem;
    justify-content: center;
  }
  
  .adr-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .adr-status-section {
    align-items: flex-start;
  }
  
  .adr-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .click-indicator {
    position: static;
    opacity: 1;
    justify-content: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }
}
</style>