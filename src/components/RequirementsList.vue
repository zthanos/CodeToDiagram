<template>
  <div 
    class="requirements-list"
    :data-testid="'requirements-list'"
    role="region"
    aria-label="Requirements list"
  >
    <!-- Header with controls -->
    <div class="requirements-list__header">
      <div class="requirements-list__controls">
        <!-- Advanced search input with suggestions -->
        <div class="requirements-list__search">
          <div class="requirements-list__search-container">
            <input
              ref="searchInput"
              v-model="localSearchQuery"
              type="text"
              class="requirements-list__search-input"
              :placeholder="searchPlaceholder"
              :data-testid="'requirements-search'"
              @input="handleSearchInput"
              @keydown="handleSearchKeydown"
              @focus="showSearchSuggestions = true"
              @blur="hideSearchSuggestions"
              aria-label="Search requirements"
              autocomplete="off"
            />
            <div class="requirements-list__search-icon">🔍</div>
            
            <!-- Search mode toggle -->
            <button
              class="requirements-list__search-mode"
              @click="toggleSearchMode"
              :title="searchModeTooltip"
              :data-testid="'search-mode-toggle'"
            >
              {{ searchModeIcon }}
            </button>

            <!-- Clear search button -->
            <button
              v-if="localSearchQuery"
              class="requirements-list__search-clear"
              @click="clearSearch"
              :data-testid="'clear-search'"
              aria-label="Clear search"
            >
              ×
            </button>
          </div>

          <!-- Search suggestions dropdown -->
          <div 
            v-if="showSearchSuggestions && searchSuggestions.length > 0"
            class="requirements-list__search-suggestions"
            :data-testid="'search-suggestions'"
          >
            <div
              v-for="(suggestion, index) in searchSuggestions"
              :key="suggestion"
              class="requirements-list__search-suggestion"
              :class="{ 'active': selectedSuggestionIndex === index }"
              @mousedown="selectSuggestion(suggestion)"
              :data-testid="`search-suggestion-${index}`"
            >
              {{ suggestion }}
            </div>
          </div>

          <!-- Search history dropdown -->
          <div 
            v-if="showSearchHistory && searchHistory.length > 0"
            class="requirements-list__search-history"
            :data-testid="'search-history'"
          >
            <div class="requirements-list__search-history-header">Recent searches</div>
            <div
              v-for="(historyItem, index) in searchHistory"
              :key="historyItem"
              class="requirements-list__search-history-item"
              @mousedown="selectHistoryItem(historyItem)"
              :data-testid="`search-history-${index}`"
            >
              {{ historyItem }}
            </div>
          </div>
        </div>

        <!-- Advanced filters -->
        <div class="requirements-list__filters">
          <!-- Status filter -->
          <div class="requirements-list__filter">
            <select
              v-model="localFilter"
              class="requirements-list__filter-select"
              :data-testid="'requirements-filter'"
              @change="handleFilterChange"
              aria-label="Filter requirements by status"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <!-- Priority filter -->
          <div class="requirements-list__filter">
            <select
              v-model="priorityFilter"
              class="requirements-list__filter-select"
              :data-testid="'priority-filter'"
              @change="handlePriorityFilterChange"
              aria-label="Filter requirements by priority"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <!-- Source filter -->
          <div class="requirements-list__filter">
            <select
              v-model="sourceFilter"
              class="requirements-list__filter-select"
              :data-testid="'source-filter'"
              @change="handleSourceFilterChange"
              aria-label="Filter requirements by source"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <!-- Advanced filters toggle -->
          <button
            class="requirements-list__advanced-filters-toggle"
            @click="showAdvancedFilters = !showAdvancedFilters"
            :class="{ 'active': showAdvancedFilters }"
            :data-testid="'advanced-filters-toggle'"
            aria-label="Toggle advanced filters"
          >
            🔧 Filters
          </button>
        </div>

        <!-- Add new requirement button -->
        <button
          class="requirements-list__add-btn"
          :disabled="readonly"
          @click="handleAddRequirement"
          :data-testid="'add-requirement-btn'"
          aria-label="Add new requirement"
        >
          + Add Requirement
        </button>
      </div>

      <!-- Advanced filters panel -->
      <div 
        v-if="showAdvancedFilters"
        class="requirements-list__advanced-filters"
        :data-testid="'advanced-filters-panel'"
      >
        <div class="requirements-list__advanced-filters-content">
          <!-- Date range filter -->
          <div class="requirements-list__filter-group">
            <label class="requirements-list__filter-label">Date Range:</label>
            <div class="requirements-list__date-range">
              <input
                v-model="dateRangeStart"
                type="date"
                class="requirements-list__date-input"
                :data-testid="'date-range-start'"
                @change="handleDateRangeChange"
              />
              <span class="requirements-list__date-separator">to</span>
              <input
                v-model="dateRangeEnd"
                type="date"
                class="requirements-list__date-input"
                :data-testid="'date-range-end'"
                @change="handleDateRangeChange"
              />
            </div>
          </div>

          <!-- Search options -->
          <div class="requirements-list__filter-group">
            <label class="requirements-list__filter-label">Search Options:</label>
            <div class="requirements-list__search-options">
              <label class="requirements-list__checkbox-label">
                <input
                  v-model="caseSensitive"
                  type="checkbox"
                  class="requirements-list__checkbox"
                  :data-testid="'case-sensitive'"
                  @change="handleSearchOptionsChange"
                />
                Case sensitive
              </label>
              <label class="requirements-list__checkbox-label">
                <input
                  v-model="wholeWords"
                  type="checkbox"
                  class="requirements-list__checkbox"
                  :data-testid="'whole-words'"
                  @change="handleSearchOptionsChange"
                />
                Whole words only
              </label>
              <label class="requirements-list__checkbox-label">
                <input
                  v-model="fuzzySearch"
                  type="checkbox"
                  class="requirements-list__checkbox"
                  :data-testid="'fuzzy-search'"
                  @change="handleSearchOptionsChange"
                />
                Fuzzy search
              </label>
            </div>
          </div>

          <!-- Filter actions -->
          <div class="requirements-list__filter-actions">
            <button
              class="requirements-list__filter-btn requirements-list__filter-btn--clear"
              @click="clearAllFilters"
              :data-testid="'clear-all-filters'"
            >
              Clear All
            </button>
            <button
              class="requirements-list__filter-btn requirements-list__filter-btn--load"
              @click="loadFilterPreset"
              :data-testid="'load-filter-preset'"
            >
              Load Preset
            </button>
            <button
              class="requirements-list__filter-btn requirements-list__filter-btn--save"
              @click="saveFilterPreset"
              :data-testid="'save-filter-preset'"
            >
              Save Preset
            </button>
          </div>

          <!-- User feedback messages -->
          <div 
            v-if="showFilterSaveConfirmation"
            class="requirements-list__feedback requirements-list__feedback--success"
            :data-testid="'filter-save-success'"
          >
            ✓ Filter preset saved successfully
          </div>
          <div 
            v-if="showFilterSaveError"
            class="requirements-list__feedback requirements-list__feedback--error"
            :data-testid="'filter-save-error'"
          >
            ✗ Failed to save filter preset
          </div>
        </div>
      </div>

      <!-- Bulk operations bar (shown when items are selected) -->
      <div 
        v-if="selectedItems.size > 0" 
        class="requirements-list__bulk-actions"
        :data-testid="'bulk-actions'"
      >
        <div class="requirements-list__bulk-info">
          {{ selectedItems.size }} item{{ selectedItems.size === 1 ? '' : 's' }} selected
        </div>
        <div class="requirements-list__bulk-buttons">
          <button
            class="requirements-list__bulk-btn requirements-list__bulk-btn--status"
            @click="showBulkStatusDialog = true"
            :data-testid="'bulk-status-btn'"
            aria-label="Change status of selected requirements"
          >
            Change Status
          </button>
          <button
            class="requirements-list__bulk-btn requirements-list__bulk-btn--delete"
            @click="handleBulkDelete"
            :data-testid="'bulk-delete-btn'"
            aria-label="Delete selected requirements"
          >
            Delete Selected
          </button>
          <button
            class="requirements-list__bulk-btn requirements-list__bulk-btn--clear"
            @click="clearSelection"
            :data-testid="'clear-selection-btn'"
            aria-label="Clear selection"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>

    <!-- Results summary -->
    <div class="requirements-list__summary" :data-testid="'requirements-summary'">
      Showing {{ filteredItems.length }} of {{ (items || []).length }} requirements
    </div>

    <!-- Virtual scrolling container -->
    <div 
      ref="scrollContainer"
      class="requirements-list__scroll-container"
      :style="{ height: `${containerHeight}px` }"
      @scroll="handleScroll"
      :data-testid="'requirements-scroll-container'"
    >
      <!-- Virtual list spacer (top) -->
      <div 
        class="requirements-list__spacer"
        :style="{ height: `${topSpacerHeight}px` }"
      ></div>

      <!-- Visible items -->
      <div class="requirements-list__items" role="list">
        <!-- Select all checkbox (when items are visible) -->
        <div 
          v-if="visibleItems.length > 0"
          class="requirements-list__select-all"
          :data-testid="'select-all-container'"
        >
          <label class="requirements-list__select-all-label">
            <input
              type="checkbox"
              class="requirements-list__select-all-checkbox"
              :checked="isAllVisibleSelected"
              :indeterminate="isSomeSelected"
              @change="handleSelectAll"
              :data-testid="'select-all-checkbox'"
              aria-label="Select all visible requirements"
            />
            Select all visible
          </label>
        </div>

        <!-- Requirement items -->
        <div
          v-for="(item, index) in visibleItems"
          :key="item.id"
          class="requirements-list__item-wrapper"
          :data-testid="`requirement-wrapper-${item.id}`"
        >
          <!-- Selection checkbox -->
          <div class="requirements-list__item-selection">
            <input
              type="checkbox"
              class="requirements-list__item-checkbox"
              :checked="selectedItems.has(item.id)"
              @change="handleItemSelection(item.id, $event)"
              :data-testid="`requirement-checkbox-${item.id}`"
              :aria-label="`Select requirement: ${item.title}`"
            />
          </div>

          <!-- Requirement item component -->
          <div class="requirements-list__item-content">
            <RequirementItem
              :requirement="item"
              :readonly="readonly"
              @update="handleItemUpdate"
              @delete="handleItemDelete"
              @status-change="handleItemStatusChange"
            />
          </div>
        </div>
      </div>

      <!-- Virtual list spacer (bottom) -->
      <div 
        class="requirements-list__spacer"
        :style="{ height: `${bottomSpacerHeight}px` }"
      ></div>
    </div>

    <!-- Empty state -->
    <div 
      v-if="filteredItems.length === 0"
      class="requirements-list__empty"
      :data-testid="'requirements-empty'"
    >
      <div class="requirements-list__empty-icon">📋</div>
      <h3 class="requirements-list__empty-title">
        {{ (items || []).length === 0 ? 'No requirements yet' : 'No matching requirements' }}
      </h3>
      <p class="requirements-list__empty-description">
        {{ (items || []).length === 0 
          ? 'Get started by adding your first requirement.' 
          : 'Try adjusting your search or filter criteria.' 
        }}
      </p>
      <button
        v-if="(items || []).length === 0 && !readonly"
        class="requirements-list__empty-btn"
        @click="handleAddRequirement"
        :data-testid="'empty-add-btn'"
      >
        Add First Requirement
      </button>
    </div>

    <!-- Bulk status change dialog -->
    <div 
      v-if="showBulkStatusDialog"
      class="requirements-list__dialog-overlay"
      @click="showBulkStatusDialog = false"
      :data-testid="'bulk-status-dialog'"
    >
      <div 
        class="requirements-list__dialog"
        @click.stop
      >
        <h3 class="requirements-list__dialog-title">Change Status</h3>
        <p class="requirements-list__dialog-description">
          Change status for {{ selectedItems.size }} selected requirement{{ selectedItems.size === 1 ? '' : 's' }}:
        </p>
        <select
          v-model="bulkStatusValue"
          class="requirements-list__dialog-select"
          :data-testid="'bulk-status-select'"
        >
          <option value="new">New</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <div class="requirements-list__dialog-actions">
          <button
            class="requirements-list__dialog-btn requirements-list__dialog-btn--primary"
            @click="handleBulkStatusChange"
            :data-testid="'bulk-status-confirm'"
          >
            Apply
          </button>
          <button
            class="requirements-list__dialog-btn requirements-list__dialog-btn--secondary"
            @click="showBulkStatusDialog = false"
            :data-testid="'bulk-status-cancel'"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import RequirementItem from './RequirementItem.vue'
import { useAdvancedSearch } from '../composables/useAdvancedSearch'
import SearchService from '../services/SearchService'

// Define interfaces locally to avoid import issues during testing
interface RequirementItem {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'accepted' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  updated_at: Date;
  source: 'manual' | 'pdf';
}

interface Props {
  items: RequirementItem[];
  filter?: 'all' | 'new' | 'accepted' | 'rejected';
  searchQuery?: string;
  readonly?: boolean;
}

// Props and Emits
const props = withDefaults(defineProps<Props>(), {
  filter: 'all',
  searchQuery: '',
  readonly: false
})

const emit = defineEmits<{
  'item-update': [requirement: RequirementItem];
  'item-delete': [requirementId: string];
  'item-create': [requirement: Partial<RequirementItem>];
  'filter-change': [filter: 'all' | 'new' | 'accepted' | 'rejected'];
  'search-change': [query: string];
  'advanced-filter-change': [filters: any];
}>()

// Advanced search composable
const {
  searchConfig,
  filterConfig,
  isSearching,
  searchResults,
  searchHistory,
  hasActiveFilters,
  hasActiveSearch,
  performSearch,
  applyFilters,
  updateSearchConfig,
  updateFilterConfig,
  resetSearch,
  resetFilters,
  highlightMatch
} = useAdvancedSearch()

// Search service
const searchService = SearchService.getInstance()

// Local state
const localFilter = ref(props.filter)
const localSearchQuery = ref(props.searchQuery)
const priorityFilter = ref<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
const sourceFilter = ref<'all' | 'manual' | 'pdf'>('all')
const selectedItems = ref(new Set<string>())
const showBulkStatusDialog = ref(false)
const bulkStatusValue = ref<'new' | 'accepted' | 'rejected'>('new')

// Advanced search state
const showAdvancedFilters = ref(false)
const showSearchSuggestions = ref(false)
const showSearchHistory = ref(false)
const searchSuggestions = ref<string[]>([])
const selectedSuggestionIndex = ref(-1)
const searchMode = ref<'simple' | 'fuzzy' | 'regex' | 'multi'>('simple')
const dateRangeStart = ref('')
const dateRangeEnd = ref('')
const caseSensitive = ref(false)
const wholeWords = ref(false)
const fuzzySearch = ref(false)

// User feedback state
const showFilterSaveConfirmation = ref(false)
const showFilterSaveError = ref(false)

// Refs
const searchInput = ref<HTMLInputElement>()

// Virtual scrolling state
const scrollContainer = ref<HTMLElement>()
const containerHeight = ref(600) // Default height
const itemHeight = ref(200) // Estimated item height
const scrollTop = ref(0)
const visibleCount = ref(10) // Number of items to render

// Watch for prop changes
watch(() => props.filter, (newFilter) => {
  localFilter.value = newFilter
})

watch(() => props.searchQuery, (newQuery) => {
  localSearchQuery.value = newQuery
})

// Watch for advanced search changes with real-time filtering
watch([localSearchQuery, searchMode, caseSensitive, wholeWords, fuzzySearch], async () => {
  if (localSearchQuery.value.trim()) {
    await performAdvancedSearch()
  } else {
    searchResults.value = []
  }
  
  // Emit advanced filter change for real-time updates
  emit('advanced-filter-change', {
    status: localFilter.value,
    priority: priorityFilter.value,
    source: sourceFilter.value,
    dateRange: dateRangeStart.value || dateRangeEnd.value ? {
      start: dateRangeStart.value,
      end: dateRangeEnd.value
    } : null,
    searchOptions: {
      caseSensitive: caseSensitive.value,
      wholeWords: wholeWords.value,
      fuzzySearch: fuzzySearch.value,
      mode: searchMode.value
    }
  })
}, { debounce: 300 })

// Computed properties
const searchPlaceholder = computed(() => {
  const modes = {
    simple: 'Search requirements...',
    fuzzy: 'Fuzzy search requirements...',
    regex: 'Regex search requirements...',
    multi: 'Multi-term search (use quotes for phrases)...'
  }
  return modes[searchMode.value]
})

const searchModeIcon = computed(() => {
  const icons = {
    simple: '🔍',
    fuzzy: '🔍~',
    regex: '🔍.*',
    multi: '🔍+'
  }
  return icons[searchMode.value]
})

const searchModeTooltip = computed(() => {
  const tooltips = {
    simple: 'Simple text search',
    fuzzy: 'Fuzzy search (finds similar matches)',
    regex: 'Regular expression search',
    multi: 'Multi-term search with AND/OR logic'
  }
  return tooltips[searchMode.value]
})

const filteredItems = computed(() => {
  let filtered = props.items || []

  // Apply basic filters first
  if (localFilter.value !== 'all') {
    filtered = filtered.filter(item => item.status === localFilter.value)
  }

  if (priorityFilter.value !== 'all') {
    filtered = filtered.filter(item => item.priority === priorityFilter.value)
  }

  if (sourceFilter.value !== 'all') {
    filtered = filtered.filter(item => item.source === sourceFilter.value)
  }

  // Apply date range filter
  if (dateRangeStart.value || dateRangeEnd.value) {
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.created_at)
      const startDate = dateRangeStart.value ? new Date(dateRangeStart.value) : null
      const endDate = dateRangeEnd.value ? new Date(dateRangeEnd.value) : null

      if (startDate && itemDate < startDate) return false
      if (endDate && itemDate > endDate) return false
      return true
    })
  }

  // Apply search if active
  if (hasActiveSearch.value && searchResults.value.length > 0) {
    const searchResultIds = new Set(
      searchResults.value
        .filter(result => result.category === 'requirements')
        .map(result => result.item.id)
    )
    filtered = filtered.filter(item => searchResultIds.has(item.id))
  } else if (localSearchQuery.value.trim() && searchMode.value === 'simple') {
    // Fallback to simple search if advanced search hasn't run
    const query = localSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

const startIndex = computed(() => {
  return Math.floor(scrollTop.value / itemHeight.value)
})

const endIndex = computed(() => {
  return Math.min(startIndex.value + visibleCount.value, filteredItems.value.length)
})

const visibleItems = computed(() => {
  return filteredItems.value.slice(startIndex.value, endIndex.value)
})

const topSpacerHeight = computed(() => {
  return startIndex.value * itemHeight.value
})

const bottomSpacerHeight = computed(() => {
  return (filteredItems.value.length - endIndex.value) * itemHeight.value
})

const isAllVisibleSelected = computed(() => {
  return visibleItems.value.length > 0 && 
         visibleItems.value.every(item => selectedItems.value.has(item.id))
})

const isSomeSelected = computed(() => {
  return selectedItems.value.size > 0 && !isAllVisibleSelected.value
})

// Advanced search methods
const performAdvancedSearch = async () => {
  if (!localSearchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  const query = localSearchQuery.value.trim()
  const fields = ['title', 'description']

  try {
    let results = []

    switch (searchMode.value) {
      case 'fuzzy':
        results = searchService.fuzzySearch(props.items, query, fields, 0.6)
        break
      case 'regex':
        results = searchService.regexSearch(props.items, query, fields, caseSensitive.value ? 'g' : 'gi')
        break
      case 'multi':
        results = searchService.multiTermSearch(props.items, query, fields, 'OR', caseSensitive.value)
        break
      default:
        results = searchService.exactSearch(props.items, query, fields, caseSensitive.value)
    }

    searchResults.value = results
  } catch (error) {
    console.warn('Search error:', error)
    searchResults.value = []
  }
}

const generateSearchSuggestions = async () => {
  if (!localSearchQuery.value.trim() || localSearchQuery.value.length < 2) {
    searchSuggestions.value = []
    return
  }

  const suggestions = searchService.getSearchSuggestions(
    props.items,
    localSearchQuery.value,
    ['title', 'description'],
    5
  )

  searchSuggestions.value = suggestions
}

const toggleSearchMode = () => {
  const modes: Array<typeof searchMode.value> = ['simple', 'fuzzy', 'regex', 'multi']
  const currentIndex = modes.indexOf(searchMode.value)
  const nextIndex = (currentIndex + 1) % modes.length
  searchMode.value = modes[nextIndex]
}

const clearSearch = () => {
  localSearchQuery.value = ''
  searchResults.value = []
  searchSuggestions.value = []
  showSearchSuggestions.value = false
  emit('search-change', '')
}

const selectSuggestion = (suggestion: string) => {
  localSearchQuery.value = suggestion
  showSearchSuggestions.value = false
  searchInput.value?.focus()
  handleSearchChange()
}

const selectHistoryItem = (historyItem: string) => {
  localSearchQuery.value = historyItem
  showSearchHistory.value = false
  searchInput.value?.focus()
  handleSearchChange()
}

const hideSearchSuggestions = () => {
  // Delay hiding to allow click events to fire
  setTimeout(() => {
    showSearchSuggestions.value = false
    showSearchHistory.value = false
  }, 200)
}

// Event handlers
const handleSearchInput = async () => {
  emit('search-change', localSearchQuery.value)
  clearSelection() // Clear selection when search changes
  
  if (localSearchQuery.value.trim()) {
    await generateSearchSuggestions()
    showSearchSuggestions.value = true
    showSearchHistory.value = false
  } else {
    showSearchSuggestions.value = false
    showSearchHistory.value = searchHistory.value.length > 0
  }
}

const handleSearchChange = () => {
  emit('search-change', localSearchQuery.value)
  clearSelection() // Clear selection when search changes
}

const handleSearchKeydown = (event: KeyboardEvent) => {
  if (showSearchSuggestions.value && searchSuggestions.value.length > 0) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.min(
          selectedSuggestionIndex.value + 1,
          searchSuggestions.value.length - 1
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, -1)
        break
      case 'Enter':
        event.preventDefault()
        if (selectedSuggestionIndex.value >= 0) {
          selectSuggestion(searchSuggestions.value[selectedSuggestionIndex.value])
        }
        break
      case 'Escape':
        showSearchSuggestions.value = false
        selectedSuggestionIndex.value = -1
        break
    }
  }
}

const handleFilterChange = () => {
  emit('filter-change', localFilter.value)
  emit('advanced-filter-change', {
    status: localFilter.value,
    priority: priorityFilter.value,
    source: sourceFilter.value,
    dateRange: dateRangeStart.value || dateRangeEnd.value ? {
      start: dateRangeStart.value,
      end: dateRangeEnd.value
    } : null
  })
  clearSelection() // Clear selection when filter changes
}

const handlePriorityFilterChange = () => {
  handleFilterChange()
}

const handleSourceFilterChange = () => {
  handleFilterChange()
}

const handleDateRangeChange = () => {
  handleFilterChange()
}

const handleSearchOptionsChange = () => {
  updateSearchConfig({
    caseSensitive: caseSensitive.value,
    wholeWords: wholeWords.value,
    fuzzySearch: fuzzySearch.value
  })
}

const clearAllFilters = () => {
  localFilter.value = 'all'
  priorityFilter.value = 'all'
  sourceFilter.value = 'all'
  dateRangeStart.value = ''
  dateRangeEnd.value = ''
  caseSensitive.value = false
  wholeWords.value = false
  fuzzySearch.value = false
  searchMode.value = 'simple'
  
  resetFilters()
  resetSearch()
  clearSearch()
  
  handleFilterChange()
}

const saveFilterPreset = () => {
  const preset = {
    name: `Filter Preset ${new Date().toLocaleString()}`,
    timestamp: new Date().toISOString(),
    status: localFilter.value,
    priority: priorityFilter.value,
    source: sourceFilter.value,
    dateRange: {
      start: dateRangeStart.value,
      end: dateRangeEnd.value
    },
    searchOptions: {
      caseSensitive: caseSensitive.value,
      wholeWords: wholeWords.value,
      fuzzySearch: fuzzySearch.value,
      mode: searchMode.value
    }
  }
  
  try {
    // Get existing presets
    const existingPresets = JSON.parse(localStorage.getItem('requirementsList_filterPresets') || '[]')
    
    // Add new preset
    existingPresets.unshift(preset)
    
    // Keep only last 10 presets
    if (existingPresets.length > 10) {
      existingPresets.splice(10)
    }
    
    // Save updated presets
    localStorage.setItem('requirementsList_filterPresets', JSON.stringify(existingPresets))
    localStorage.setItem('requirementsList_filterPreset', JSON.stringify(preset))
    
    // Show user feedback
    showFilterSaveConfirmation.value = true
    setTimeout(() => {
      showFilterSaveConfirmation.value = false
    }, 3000)
  } catch (error) {
    console.warn('Failed to save filter preset:', error)
    showFilterSaveError.value = true
    setTimeout(() => {
      showFilterSaveError.value = false
    }, 3000)
  }
}

const loadFilterPreset = () => {
  try {
    const preset = localStorage.getItem('requirementsList_filterPreset')
    if (preset) {
      const parsedPreset = JSON.parse(preset)
      
      // Apply preset values
      localFilter.value = parsedPreset.status || 'all'
      priorityFilter.value = parsedPreset.priority || 'all'
      sourceFilter.value = parsedPreset.source || 'all'
      dateRangeStart.value = parsedPreset.dateRange?.start || ''
      dateRangeEnd.value = parsedPreset.dateRange?.end || ''
      
      if (parsedPreset.searchOptions) {
        caseSensitive.value = parsedPreset.searchOptions.caseSensitive || false
        wholeWords.value = parsedPreset.searchOptions.wholeWords || false
        fuzzySearch.value = parsedPreset.searchOptions.fuzzySearch || false
        searchMode.value = parsedPreset.searchOptions.mode || 'simple'
      }
      
      // Trigger filter change
      handleFilterChange()
    }
  } catch (error) {
    console.warn('Failed to load filter preset:', error)
  }
}

const handleAddRequirement = () => {
  const newRequirement: Partial<RequirementItem> = {
    title: '',
    description: '',
    status: 'new',
    source: 'manual'
  }
  emit('item-create', newRequirement)
}

const handleItemUpdate = (requirement: RequirementItem) => {
  emit('item-update', requirement)
}

const handleItemDelete = (requirementId: string) => {
  selectedItems.value.delete(requirementId)
  emit('item-delete', requirementId)
}

const handleItemStatusChange = (requirementId: string, status: RequirementItem['status']) => {
  // Find the item and emit update with new status
  const item = (props.items || []).find(item => item.id === requirementId)
  if (item) {
    const updatedItem: RequirementItem = {
      ...item,
      status,
      updated_at: new Date()
    }
    emit('item-update', updatedItem)
  }
}

const handleItemSelection = (itemId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    selectedItems.value.add(itemId)
  } else {
    selectedItems.value.delete(itemId)
  }
}

const handleSelectAll = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    // Select all visible items
    visibleItems.value.forEach(item => {
      selectedItems.value.add(item.id)
    })
  } else {
    // Deselect all visible items
    visibleItems.value.forEach(item => {
      selectedItems.value.delete(item.id)
    })
  }
}

const clearSelection = () => {
  selectedItems.value.clear()
}

// Component lifecycle
onMounted(() => {
  // Load saved filter preset on component mount
  loadFilterPreset()
  
  // Initialize virtual scrolling
  if (scrollContainer.value) {
    const rect = scrollContainer.value.getBoundingClientRect()
    containerHeight.value = rect.height || 600
    visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + 2
  }
})

onUnmounted(() => {
  // Save current filter state before unmounting
  saveFilterPreset()
})

const handleBulkDelete = () => {
  if (confirm(`Are you sure you want to delete ${selectedItems.value.size} requirement${selectedItems.value.size === 1 ? '' : 's'}?`)) {
    selectedItems.value.forEach(itemId => {
      emit('item-delete', itemId)
    })
    clearSelection()
  }
}

const handleBulkStatusChange = () => {
  selectedItems.value.forEach(itemId => {
    handleItemStatusChange(itemId, bulkStatusValue.value)
  })
  showBulkStatusDialog.value = false
  clearSelection()
}

// Virtual scrolling
const handleScroll = () => {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop
  }
}

const updateContainerHeight = () => {
  if (scrollContainer.value) {
    const rect = scrollContainer.value.getBoundingClientRect()
    containerHeight.value = Math.max(400, window.innerHeight - rect.top - 100)
    visibleCount.value = Math.ceil(containerHeight.value / itemHeight.value) + 2 // Buffer
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<style scoped>
.requirements-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

/* Header */
.requirements-list__header {
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  background: #f6f8fa;
}

.requirements-list__controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Advanced search */
.requirements-list__search {
  position: relative;
  flex: 1;
  min-width: 300px;
}

.requirements-list__search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.requirements-list__search-input {
  width: 100%;
  padding: 8px 80px 8px 36px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.requirements-list__search-input:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirements-list__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6a737d;
  pointer-events: none;
}

.requirements-list__search-mode {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #6a737d;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.requirements-list__search-mode:hover {
  background: #e1e5e9;
  color: #24292e;
}

.requirements-list__search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 16px;
  color: #6a737d;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.requirements-list__search-clear:hover {
  background: #e1e5e9;
  color: #24292e;
}

/* Search suggestions */
.requirements-list__search-suggestions,
.requirements-list__search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.requirements-list__search-suggestion,
.requirements-list__search-history-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  border-bottom: 1px solid #f6f8fa;
  transition: background-color 0.2s ease;
}

.requirements-list__search-suggestion:hover,
.requirements-list__search-history-item:hover,
.requirements-list__search-suggestion.active {
  background: #f6f8fa;
}

.requirements-list__search-suggestion:last-child,
.requirements-list__search-history-item:last-child {
  border-bottom: none;
}

.requirements-list__search-history-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6a737d;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e5e9;
}

/* Filters */
.requirements-list__filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.requirements-list__filter {
  flex-shrink: 0;
}

.requirements-list__filter-select {
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  min-width: 120px;
}

.requirements-list__filter-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirements-list__advanced-filters-toggle {
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6a737d;
}

.requirements-list__advanced-filters-toggle:hover,
.requirements-list__advanced-filters-toggle.active {
  background: #0366d6;
  border-color: #0366d6;
  color: #ffffff;
}

/* Advanced filters panel */
.requirements-list__advanced-filters {
  margin-top: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
}

.requirements-list__advanced-filters-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.requirements-list__filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.requirements-list__filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #24292e;
}

.requirements-list__date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.requirements-list__date-input {
  padding: 6px 8px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-size: 14px;
}

.requirements-list__date-separator {
  font-size: 14px;
  color: #6a737d;
}

.requirements-list__search-options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.requirements-list__checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #24292e;
  cursor: pointer;
}

.requirements-list__checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.requirements-list__filter-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.requirements-list__filter-btn {
  padding: 8px 16px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.requirements-list__filter-btn--clear {
  background: #ffffff;
  color: #6a737d;
}

.requirements-list__filter-btn--clear:hover {
  background: #f6f8fa;
  color: #24292e;
}

.requirements-list__filter-btn--save {
  background: #28a745;
  border-color: #28a745;
  color: #ffffff;
}

.requirements-list__filter-btn--save:hover {
  background: #218838;
  border-color: #218838;
}

.requirements-list__add-btn {
  padding: 8px 16px;
  background: #28a745;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.requirements-list__add-btn:hover:not(:disabled) {
  background: #218838;
}

.requirements-list__add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
}

.requirements-list__add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Bulk actions */
.requirements-list__bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 12px;
  background: #fff5b4;
  border: 1px solid #d1cc00;
  border-radius: 6px;
}

.requirements-list__bulk-info {
  font-size: 14px;
  font-weight: 500;
  color: #735c0f;
}

.requirements-list__bulk-buttons {
  display: flex;
  gap: 8px;
}

.requirements-list__bulk-btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.requirements-list__bulk-btn--status {
  background: #0366d6;
  color: #ffffff;
}

.requirements-list__bulk-btn--status:hover {
  background: #0256cc;
}

.requirements-list__bulk-btn--delete {
  background: #d73a49;
  color: #ffffff;
}

.requirements-list__bulk-btn--delete:hover {
  background: #cb2431;
}

.requirements-list__bulk-btn--clear {
  background: #6c757d;
  color: #ffffff;
}

.requirements-list__bulk-btn--clear:hover {
  background: #5a6268;
}

/* Summary */
.requirements-list__summary {
  padding: 8px 16px;
  font-size: 12px;
  color: #6a737d;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e5e9;
}

/* Scroll container */
.requirements-list__scroll-container {
  flex: 1;
  overflow-y: auto;
  position: relative;
  height: 100%;
}

.requirements-list__spacer {
  width: 100%;
}

.requirements-list__items {
  padding: 0 16px;
  height: 100%;
  overflow-y: auto;
}

/* Select all */
.requirements-list__select-all {
  padding: 12px 0;
  border-bottom: 1px solid #e1e5e9;
  margin-bottom: 12px;
}

.requirements-list__select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #24292e;
  cursor: pointer;
}

.requirements-list__select-all-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Item wrapper */
.requirements-list__item-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.requirements-list__item-selection {
  flex-shrink: 0;
  padding-top: 20px; /* Align with item content */
}

.requirements-list__item-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.requirements-list__item-content {
  flex: 1;
}

/* Empty state */
.requirements-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6a737d;
}

.requirements-list__empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.requirements-list__empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
}

.requirements-list__empty-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
}

.requirements-list__empty-btn {
  padding: 10px 20px;
  background: #28a745;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.requirements-list__empty-btn:hover {
  background: #218838;
}

/* Dialog */
.requirements-list__dialog-overlay {
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
}

.requirements-list__dialog {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.requirements-list__dialog-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
}

.requirements-list__dialog-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #6a737d;
  line-height: 1.5;
}

.requirements-list__dialog-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 20px;
}

.requirements-list__dialog-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirements-list__dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.requirements-list__dialog-btn {
  padding: 8px 16px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.requirements-list__dialog-btn--primary {
  background: #0366d6;
  border-color: #0366d6;
  color: #ffffff;
}

.requirements-list__dialog-btn--primary:hover {
  background: #0256cc;
  border-color: #0256cc;
}

.requirements-list__dialog-btn--secondary {
  background: #ffffff;
  color: #24292e;
}

.requirements-list__dialog-btn--secondary:hover {
  background: #f6f8fa;
}

/* Responsive design */
@media (max-width: 768px) {
  .requirements-list__controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .requirements-list__search {
    min-width: auto;
  }
  
  .requirements-list__bulk-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .requirements-list__bulk-buttons {
    justify-content: center;
  }
  
  .requirements-list__item-wrapper {
    flex-direction: column;
    gap: 8px;
  }
  
  .requirements-list__item-selection {
    padding-top: 0;
    align-self: flex-start;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .requirements-list__header,
  .requirements-list__summary {
    border-width: 2px;
  }
  
  .requirements-list__search-input:focus,
  .requirements-list__filter-select:focus {
    outline-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .requirements-list__search-input,
  .requirements-list__filter-select,
  .requirements-list__add-btn,
  .requirements-list__bulk-btn,
  .requirements-list__dialog-btn,
  .requirements-list__search-mode,
  .requirements-list__search-clear,
  .requirements-list__advanced-filters-toggle,
  .requirements-list__filter-btn {
    transition: none;
  }
}

/* Search highlighting */
:deep(.search-highlight) {
  background: #fff5b4;
  color: #735c0f;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* Loading state for search */
.requirements-list__search-loading {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #0366d6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}
</style>