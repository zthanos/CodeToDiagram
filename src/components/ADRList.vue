<template>
  <div class="adr-list">
    <!-- Search and Filter Header -->
    <div class="list-header">
      <div class="search-section">
        <div class="search-input-container">
          <input
            v-model="localSearchQuery"
            type="text"
            class="search-input"
            placeholder="Search ADRs..."
            @input="handleSearchChange"
          />
          <button 
            v-if="localSearchQuery"
            class="search-clear"
            @click="clearSearch"
          >
            ×
          </button>
        </div>
        <button class="btn-primary" @click="handleCreate">
          + New ADR
        </button>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label for="status-filter">Status:</label>
          <select
            id="status-filter"
            v-model="localStatusFilter"
            class="filter-select"
            @change="handleFilterChange"
          >
            <option value="all">All Statuses</option>
            <option value="proposed">Proposed</option>
            <option value="accepted">Accepted</option>
            <option value="deprecated">Deprecated</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="sort-by">Sort by:</label>
          <select
            id="sort-by"
            v-model="sortBy"
            class="filter-select"
            @change="handleSortChange"
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="sort-order">Order:</label>
          <select
            id="sort-order"
            v-model="sortOrder"
            class="filter-select"
            @change="handleSortChange"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <button 
          v-if="hasActiveFilters"
          class="btn-secondary clear-filters"
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- ADR Cards -->
    <div class="adr-cards">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading ADRs...</p>
      </div>

      <div v-else-if="filteredADRs.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No ADRs Found</h3>
        <p v-if="hasActiveSearch || hasActiveFilters">
          Try adjusting your search or filters to find ADRs.
        </p>
        <p v-else>
          Get started by creating your first Architectural Decision Record.
        </p>
        <button class="btn-primary" @click="handleCreate">
          Create First ADR
        </button>
      </div>

      <div v-else class="cards-grid">
        <div
          v-for="adr in filteredADRs"
          :key="adr.id"
          class="adr-card"
          @click="handleSelect(adr)"
        >
          <div class="card-header">
            <h3 class="card-title" v-html="highlightSearchTerm(adr.title)"></h3>
            <div class="card-status" :class="`status-${adr.status}`">
              {{ adr.status.toUpperCase() }}
            </div>
          </div>

          <div class="card-meta">
            <span class="card-author">{{ adr.author }}</span>
            <span class="card-date">{{ formatDate(adr.created_at) }}</span>
          </div>

          <div class="card-content">
            <div class="card-section">
              <strong>Context:</strong>
              <p v-html="highlightSearchTerm(truncateText(adr.context, 150))"></p>
            </div>
            <div class="card-section">
              <strong>Decision:</strong>
              <p v-html="highlightSearchTerm(truncateText(adr.decision, 150))"></p>
            </div>
          </div>

          <div v-if="adr.tags.length > 0" class="card-tags">
            <span
              v-for="tag in adr.tags.slice(0, 3)"
              :key="tag"
              class="tag"
            >
              {{ tag }}
            </span>
            <span v-if="adr.tags.length > 3" class="tag-more">
              +{{ adr.tags.length - 3 }} more
            </span>
          </div>

          <div class="card-actions">
            <button
              class="btn-secondary btn-small"
              @click.stop="handleEdit(adr)"
            >
              Edit
            </button>
            <button
              v-if="!readonly"
              class="btn-danger btn-small"
              @click.stop="handleDelete(adr.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="btn-secondary"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </button>
      
      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="page-button"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>
      
      <button
        class="btn-secondary"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ADR, ADRListProps, ADRListEmits, ADRFilterConfig } from '../types/adr'
import { useADRSearch } from '../composables/useADRSearch'

const props = withDefaults(defineProps<ADRListProps>(), {
  adrs: () => [],
  searchQuery: '',
  statusFilter: 'all',
  tagFilter: () => [],
  readonly: false
})

const emit = defineEmits<ADRListEmits>()

// Composables
const { 
  applyFilters, 
  sortADRs, 
  highlightMatch,
  searchConfig,
  filterConfig,
  updateSearchConfig,
  updateFilterConfig
} = useADRSearch()

// Reactive state
const localSearchQuery = ref(props.searchQuery)
const localStatusFilter = ref(props.statusFilter || 'all')
const localTagFilter = ref([...props.tagFilter])
const sortBy = ref<'date' | 'title' | 'status'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isLoading = ref(false)
const currentPage = ref(1)
const itemsPerPage = 12

// Computed properties
const hasActiveSearch = computed(() => localSearchQuery.value.trim().length > 0)

const hasActiveFilters = computed(() => {
  return (
    localStatusFilter.value !== 'all' ||
    localTagFilter.value.length > 0
  )
})

const filteredADRs = computed(() => {
  let filtered = [...props.adrs]

  // Apply filters
  if (hasActiveFilters.value) {
    const filterConfig: ADRFilterConfig = {
      status: localStatusFilter.value === 'all' ? 'all' : localStatusFilter.value as any,
      tags: localTagFilter.value,
      author: ''
    }
    filtered = applyFilters(filtered)
  }

  // Apply search
  if (hasActiveSearch.value) {
    const query = localSearchQuery.value.toLowerCase()
    filtered = filtered.filter(adr => 
      adr.title.toLowerCase().includes(query) ||
      adr.context.toLowerCase().includes(query) ||
      adr.decision.toLowerCase().includes(query) ||
      adr.consequences.toLowerCase().includes(query) ||
      adr.alternatives?.toLowerCase().includes(query) ||
      adr.author.toLowerCase().includes(query) ||
      adr.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // Apply sorting
  filtered = sortADRs(filtered, sortBy.value, sortOrder.value)

  return filtered
})

const paginatedADRs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredADRs.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredADRs.value.length / itemsPerPage)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...', total)
    }
  }
  
  return pages
})

// Methods
const handleSearchChange = () => {
  currentPage.value = 1
  updateSearchConfig({ query: localSearchQuery.value })
  emit('search-change', localSearchQuery.value)
}

const handleFilterChange = () => {
  currentPage.value = 1
  const filterConfig: ADRFilterConfig = {
    status: localStatusFilter.value === 'all' ? 'all' : localStatusFilter.value as any,
    tags: localTagFilter.value,
    author: ''
  }
  updateFilterConfig(filterConfig)
  emit('filter-change', filterConfig)
}

const handleSortChange = () => {
  currentPage.value = 1
}

const clearSearch = () => {
  localSearchQuery.value = ''
  handleSearchChange()
}

const clearFilters = () => {
  localStatusFilter.value = 'all'
  localTagFilter.value = []
  handleFilterChange()
}

const handleCreate = () => {
  emit('adr-create')
}

const handleSelect = (adr: ADR) => {
  emit('adr-select', adr)
}

const handleEdit = (adr: ADR) => {
  emit('adr-edit', adr)
}

const handleDelete = (adrId: string) => {
  emit('adr-delete', adrId)
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Utility methods
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const highlightSearchTerm = (text: string): string => {
  if (!hasActiveSearch.value) return text
  
  const query = localSearchQuery.value.trim()
  if (!query) return text
  
  return highlightMatch(text, 0, query.length)
}

// Watch for prop changes
watch(() => props.searchQuery, (newQuery) => {
  localSearchQuery.value = newQuery
})

watch(() => props.statusFilter, (newFilter) => {
  localStatusFilter.value = newFilter || 'all'
})

watch(() => props.tagFilter, (newTags) => {
  localTagFilter.value = [...newTags]
})

// Reset page when filters change
watch([localSearchQuery, localStatusFilter, localTagFilter], () => {
  currentPage.value = 1
})

onMounted(() => {
  // Initialize with prop values
  localSearchQuery.value = props.searchQuery
  localStatusFilter.value = props.statusFilter || 'all'
  localTagFilter.value = [...props.tagFilter]
})
</script>

<style scoped>
.adr-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
}

.list-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #f8f9fa;
}

.search-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.search-input-container {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #656d76;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.search-clear:hover {
  color: #24292f;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  color: #24292f;
  white-space: nowrap;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: #ffffff;
}

.clear-filters {
  margin-left: auto;
}

.adr-cards {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: #656d76;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #24292f;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  max-width: 400px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.adr-card {
  background-color: #ffffff;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.adr-card:hover {
  border-color: #0969da;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #24292f;
  line-height: 1.3;
  flex: 1;
  margin-right: 1rem;
}

.card-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-proposed {
  background-color: #fff3cd;
  color: #856404;
}

.status-accepted {
  background-color: #d1edff;
  color: #0969da;
}

.status-deprecated {
  background-color: #ffebe9;
  color: #cf222e;
}

.status-superseded {
  background-color: #f6f8fa;
  color: #656d76;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #656d76;
}

.card-content {
  margin-bottom: 1rem;
}

.card-section {
  margin-bottom: 1rem;
}

.card-section:last-child {
  margin-bottom: 0;
}

.card-section strong {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: #24292f;
}

.card-section p {
  margin: 0;
  font-size: 0.875rem;
  color: #656d76;
  line-height: 1.4;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  background-color: #f6f8fa;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #24292f;
}

.tag-more {
  padding: 0.25rem 0.5rem;
  background-color: #e1e4e8;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #656d76;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
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
  text-decoration: none;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
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

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e1e4e8;
  background-color: #f8f9fa;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d9e0;
  background-color: #ffffff;
  color: #24292f;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.page-button:hover {
  background-color: #f6f8fa;
}

.page-button.active {
  background-color: #0969da;
  color: #ffffff;
  border-color: #0969da;
}

:deep(.search-highlight) {
  background-color: #fff3cd;
  color: #856404;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
}

@media (max-width: 768px) {
  .list-header {
    padding: 1rem;
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input-container {
    max-width: none;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .filter-group {
    justify-content: space-between;
  }

  .adr-cards {
    padding: 1rem;
  }

  .cards-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .card-title {
    margin-right: 0;
  }

  .pagination {
    padding: 1rem;
    flex-wrap: wrap;
  }
}
</style>