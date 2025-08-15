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
        <!-- Search input -->
        <div class="requirements-list__search">
          <input
            v-model="localSearchQuery"
            type="text"
            class="requirements-list__search-input"
            placeholder="Search requirements..."
            :data-testid="'requirements-search'"
            @input="handleSearchChange"
            aria-label="Search requirements"
          />
          <div class="requirements-list__search-icon">🔍</div>
        </div>

        <!-- Filter dropdown -->
        <div class="requirements-list__filter">
          <select
            v-model="localFilter"
            class="requirements-list__filter-select"
            :data-testid="'requirements-filter'"
            @change="handleFilterChange"
            aria-label="Filter requirements by status"
          >
            <option value="all">All Requirements</option>
            <option value="new">New</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
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

// Define interfaces locally to avoid import issues during testing
interface RequirementItem {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'accepted' | 'rejected';
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
}>()

// Local state
const localFilter = ref(props.filter)
const localSearchQuery = ref(props.searchQuery)
const selectedItems = ref(new Set<string>())
const showBulkStatusDialog = ref(false)
const bulkStatusValue = ref<'new' | 'accepted' | 'rejected'>('new')

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

// Computed properties
const filteredItems = computed(() => {
  let filtered = props.items || []

  // Apply status filter
  if (localFilter.value !== 'all') {
    filtered = filtered.filter(item => item.status === localFilter.value)
  }

  // Apply search filter
  if (localSearchQuery.value.trim()) {
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

// Event handlers
const handleSearchChange = () => {
  emit('search-change', localSearchQuery.value)
  clearSelection() // Clear selection when search changes
}

const handleFilterChange = () => {
  emit('filter-change', localFilter.value)
  clearSelection() // Clear selection when filter changes
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

.requirements-list__search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.requirements-list__search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
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
}

.requirements-list__filter-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
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
}

.requirements-list__spacer {
  width: 100%;
}

.requirements-list__items {
  padding: 0 16px;
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
  .requirements-list__dialog-btn {
    transition: none;
  }
}
</style>