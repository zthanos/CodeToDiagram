<template>
  <div 
    class="systems-list"
    :data-testid="'systems-list'"
    role="region"
    aria-label="Systems list"
  >
    <!-- Header with controls -->
    <div class="systems-list__header">
      <div class="systems-list__controls">
        <!-- Search input -->
        <div class="systems-list__search">
          <input
            v-model="localSearchQuery"
            type="text"
            class="systems-list__search-input"
            placeholder="Search systems..."
            :data-testid="'systems-search'"
            @input="handleSearchChange"
            aria-label="Search systems"
          />
          <div class="systems-list__search-icon">🔍</div>
        </div>

        <!-- Filter dropdown -->
        <div class="systems-list__filter">
          <select
            v-model="localFilter"
            class="systems-list__filter-select"
            :data-testid="'systems-filter'"
            @change="handleFilterChange"
            aria-label="Filter systems by type"
          >
            <option value="all">All Systems</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="integration">Integration</option>
          </select>
        </div>

        <!-- Add new system button -->
        <button
          class="systems-list__add-btn"
          :disabled="readonly"
          @click="handleAddSystem"
          :data-testid="'add-system-btn'"
          aria-label="Add new system"
        >
          + Add System
        </button>
      </div>
    </div>

    <!-- Results summary -->
    <div class="systems-list__summary" :data-testid="'systems-summary'">
      Showing {{ filteredItems.length }} of {{ (items || []).length }} systems
    </div>

    <!-- Systems grid -->
    <div class="systems-list__grid" :data-testid="'systems-grid'">
      <div
        v-for="system in filteredItems"
        :key="system.id"
        class="system-card"
        :class="{ 'system-card--selected': selectedSystem === system.id }"
        :data-testid="`system-card-${system.id}`"
        @click="handleSystemSelect(system.id)"
        @keydown="handleSystemKeydown(system.id, $event)"
        tabindex="0"
        role="button"
        :aria-label="`Select system: ${system.name}`"
        :aria-pressed="selectedSystem === system.id"
      >
        <!-- System type badge -->
        <div class="system-card__badge" :class="`system-card__badge--${system.type}`">
          {{ system.type }}
        </div>

        <!-- System name -->
        <h3 class="system-card__name">{{ system.name }}</h3>

        <!-- System description -->
        <p class="system-card__description">{{ system.description }}</p>

        <!-- Dependencies -->
        <div v-if="system.dependencies.length > 0" class="system-card__dependencies">
          <h4 class="system-card__dependencies-title">Dependencies:</h4>
          <ul class="system-card__dependencies-list">
            <li
              v-for="dependency in system.dependencies"
              :key="dependency"
              class="system-card__dependency"
            >
              {{ dependency }}
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="system-card__actions">
          <button
            class="system-card__action-btn system-card__action-btn--edit"
            :disabled="readonly"
            @click.stop="handleEditSystem(system.id)"
            :data-testid="`edit-system-${system.id}`"
            aria-label="Edit system"
          >
            ✏️
          </button>
          <button
            class="system-card__action-btn system-card__action-btn--delete"
            :disabled="readonly"
            @click.stop="handleDeleteSystem(system.id)"
            :data-testid="`delete-system-${system.id}`"
            aria-label="Delete system"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div 
      v-if="filteredItems.length === 0"
      class="systems-list__empty"
      :data-testid="'systems-empty'"
    >
      <div class="systems-list__empty-icon">🏗️</div>
      <h3 class="systems-list__empty-title">
        {{ (items || []).length === 0 ? 'No systems yet' : 'No matching systems' }}
      </h3>
      <p class="systems-list__empty-description">
        {{ (items || []).length === 0 
          ? 'Get started by adding your first system.' 
          : 'Try adjusting your search or filter criteria.' 
        }}
      </p>
      <button
        v-if="(items || []).length === 0 && !readonly"
        class="systems-list__empty-btn"
        @click="handleAddSystem"
        :data-testid="'empty-add-system-btn'"
      >
        Add First System
      </button>
    </div>

    <!-- System details modal -->
    <div 
      v-if="showSystemModal"
      class="systems-list__modal-overlay"
      @click="closeSystemModal"
      :data-testid="'system-modal'"
    >
      <div 
        class="systems-list__modal"
        @click.stop
      >
        <h3 class="systems-list__modal-title">
          {{ editingSystem ? 'Edit System' : 'Add New System' }}
        </h3>
        
        <form @submit.prevent="handleSaveSystem" class="systems-list__form">
          <!-- System name -->
          <div class="systems-list__form-group">
            <label for="system-name" class="systems-list__form-label">Name *</label>
            <input
              id="system-name"
              v-model="systemForm.name"
              type="text"
              class="systems-list__form-input"
              :class="{ 'systems-list__form-input--error': systemFormErrors.name }"
              placeholder="Enter system name"
              required
              :data-testid="'system-name-input'"
            />
            <div v-if="systemFormErrors.name" class="systems-list__form-error">
              {{ systemFormErrors.name }}
            </div>
          </div>

          <!-- System description -->
          <div class="systems-list__form-group">
            <label for="system-description" class="systems-list__form-label">Description *</label>
            <textarea
              id="system-description"
              v-model="systemForm.description"
              class="systems-list__form-textarea"
              :class="{ 'systems-list__form-textarea--error': systemFormErrors.description }"
              placeholder="Enter system description"
              rows="3"
              required
              :data-testid="'system-description-input'"
            ></textarea>
            <div v-if="systemFormErrors.description" class="systems-list__form-error">
              {{ systemFormErrors.description }}
            </div>
          </div>

          <!-- System type -->
          <div class="systems-list__form-group">
            <label for="system-type" class="systems-list__form-label">Type *</label>
            <select
              id="system-type"
              v-model="systemForm.type"
              class="systems-list__form-select"
              required
              :data-testid="'system-type-select'"
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
              <option value="integration">Integration</option>
            </select>
          </div>

          <!-- Dependencies -->
          <div class="systems-list__form-group">
            <label for="system-dependencies" class="systems-list__form-label">Dependencies</label>
            <div class="systems-list__dependencies-input">
              <input
                v-model="newDependency"
                type="text"
                class="systems-list__form-input"
                placeholder="Add dependency and press Enter"
                @keydown.enter.prevent="addDependency"
                :data-testid="'system-dependency-input'"
              />
              <button
                type="button"
                class="systems-list__add-dependency-btn"
                @click="addDependency"
                :disabled="!newDependency.trim()"
                :data-testid="'add-dependency-btn'"
              >
                Add
              </button>
            </div>
            <ul v-if="systemForm.dependencies.length > 0" class="systems-list__dependencies-list">
              <li
                v-for="(dependency, index) in systemForm.dependencies"
                :key="index"
                class="systems-list__dependency-item"
              >
                <span>{{ dependency }}</span>
                <button
                  type="button"
                  class="systems-list__remove-dependency-btn"
                  @click="removeDependency(index)"
                  :data-testid="`remove-dependency-${index}`"
                  aria-label="Remove dependency"
                >
                  ×
                </button>
              </li>
            </ul>
          </div>

          <!-- Form actions -->
          <div class="systems-list__form-actions">
            <button
              type="submit"
              class="systems-list__form-btn systems-list__form-btn--primary"
              :disabled="!isFormValid"
              :data-testid="'save-system-btn'"
            >
              {{ editingSystem ? 'Update System' : 'Add System' }}
            </button>
            <button
              type="button"
              class="systems-list__form-btn systems-list__form-btn--secondary"
              @click="closeSystemModal"
              :data-testid="'cancel-system-btn'"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SystemInfo } from '../types/requirements'

interface Props {
  items: SystemInfo[];
  selectedSystem?: string | null;
  searchQuery?: string;
  filter?: 'all' | 'internal' | 'external' | 'integration';
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedSystem: null,
  searchQuery: '',
  filter: 'all',
  readonly: false
})

const emit = defineEmits<{
  'system-select': [systemId: string];
  'system-create': [system: Omit<SystemInfo, 'id'>];
  'system-update': [systemId: string, system: Partial<SystemInfo>];
  'system-delete': [systemId: string];
  'search-change': [query: string];
  'filter-change': [filter: 'all' | 'internal' | 'external' | 'integration'];
}>()

// Local state
const localSearchQuery = ref(props.searchQuery)
const localFilter = ref(props.filter)
const showSystemModal = ref(false)
const editingSystem = ref<string | null>(null)
const newDependency = ref('')

// System form state
const systemForm = ref({
  name: '',
  description: '',
  type: 'internal' as 'internal' | 'external' | 'integration',
  dependencies: [] as string[]
})

const systemFormErrors = ref({
  name: '',
  description: ''
})

// Watch for prop changes
watch(() => props.searchQuery, (newQuery) => {
  localSearchQuery.value = newQuery
})

watch(() => props.filter, (newFilter) => {
  localFilter.value = newFilter
})

// Computed properties
const filteredItems = computed(() => {
  let filtered = props.items || []

  // Apply type filter
  if (localFilter.value !== 'all') {
    filtered = filtered.filter(item => item.type === localFilter.value)
  }

  // Apply search filter
  if (localSearchQuery.value.trim()) {
    const query = localSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.dependencies.some(dep => dep.toLowerCase().includes(query))
    )
  }

  return filtered
})

const isFormValid = computed(() => {
  return systemForm.value.name.trim() && 
         systemForm.value.description.trim() &&
         !systemFormErrors.value.name &&
         !systemFormErrors.value.description
})

// Event handlers
const handleSearchChange = () => {
  emit('search-change', localSearchQuery.value)
}

const handleFilterChange = () => {
  emit('filter-change', localFilter.value)
}

const handleSystemSelect = (systemId: string) => {
  emit('system-select', systemId)
}

const handleSystemKeydown = (systemId: string, event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleSystemSelect(systemId)
  }
}

const handleAddSystem = () => {
  resetSystemForm()
  editingSystem.value = null
  showSystemModal.value = true
}

const handleEditSystem = (systemId: string) => {
  const system = props.items.find(s => s.id === systemId)
  if (system) {
    systemForm.value = {
      name: system.name,
      description: system.description,
      type: system.type,
      dependencies: [...system.dependencies]
    }
    editingSystem.value = systemId
    showSystemModal.value = true
  }
}

const handleDeleteSystem = (systemId: string) => {
  const system = props.items.find(s => s.id === systemId)
  if (system && confirm(`Are you sure you want to delete the system "${system.name}"?`)) {
    emit('system-delete', systemId)
  }
}

const handleSaveSystem = () => {
  // Validate form
  validateForm()
  
  if (!isFormValid.value) {
    return
  }

  const systemData = {
    name: systemForm.value.name.trim(),
    description: systemForm.value.description.trim(),
    type: systemForm.value.type,
    dependencies: systemForm.value.dependencies
  }

  if (editingSystem.value) {
    emit('system-update', editingSystem.value, systemData)
  } else {
    emit('system-create', systemData)
  }

  closeSystemModal()
}

const closeSystemModal = () => {
  showSystemModal.value = false
  editingSystem.value = null
  resetSystemForm()
}

const resetSystemForm = () => {
  systemForm.value = {
    name: '',
    description: '',
    type: 'internal',
    dependencies: []
  }
  systemFormErrors.value = {
    name: '',
    description: ''
  }
  newDependency.value = ''
}

const validateForm = () => {
  systemFormErrors.value.name = ''
  systemFormErrors.value.description = ''

  if (!systemForm.value.name.trim()) {
    systemFormErrors.value.name = 'Name is required'
  } else if (systemForm.value.name.length > 100) {
    systemFormErrors.value.name = 'Name must be less than 100 characters'
  }

  if (!systemForm.value.description.trim()) {
    systemFormErrors.value.description = 'Description is required'
  } else if (systemForm.value.description.length > 500) {
    systemFormErrors.value.description = 'Description must be less than 500 characters'
  }
}

const addDependency = () => {
  const dependency = newDependency.value.trim()
  if (dependency && !systemForm.value.dependencies.includes(dependency)) {
    systemForm.value.dependencies.push(dependency)
    newDependency.value = ''
  }
}

const removeDependency = (index: number) => {
  systemForm.value.dependencies.splice(index, 1)
}
</script>
<style scoped>
.systems-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

/* Header */
.systems-list__header {
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  background: #f6f8fa;
}

.systems-list__controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.systems-list__search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.systems-list__search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.systems-list__search-input:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.systems-list__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6a737d;
  pointer-events: none;
}

.systems-list__filter {
  flex-shrink: 0;
}

.systems-list__filter-select {
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.systems-list__filter-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.systems-list__add-btn {
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

.systems-list__add-btn:hover:not(:disabled) {
  background: #218838;
}

.systems-list__add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
}

.systems-list__add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Summary */
.systems-list__summary {
  padding: 8px 16px;
  font-size: 12px;
  color: #6a737d;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e5e9;
}

/* Grid */
.systems-list__grid {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

/* System Card */
.system-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.system-card:hover {
  border-color: #0366d6;
  box-shadow: 0 2px 8px rgba(3, 102, 214, 0.1);
}

.system-card:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.system-card--selected {
  border-color: #0366d6;
  background: #f0f8ff;
  box-shadow: 0 2px 8px rgba(3, 102, 214, 0.15);
}

.system-card__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-card__badge--internal {
  background: #e6f7ff;
  color: #0366d6;
  border: 1px solid #b3d9ff;
}

.system-card__badge--external {
  background: #fff5e6;
  color: #d97706;
  border: 1px solid #fbbf24;
}

.system-card__badge--integration {
  background: #f0f9ff;
  color: #059669;
  border: 1px solid #34d399;
}

.system-card__name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
  padding-right: 80px; /* Space for badge */
}

.system-card__description {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #6a737d;
  flex: 1;
}

.system-card__dependencies {
  margin-bottom: 16px;
}

.system-card__dependencies-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #24292e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-card__dependencies-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.system-card__dependency {
  padding: 2px 6px;
  background: #f6f8fa;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-size: 11px;
  color: #6a737d;
}

.system-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: auto;
}

.system-card__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.system-card__action-btn:hover:not(:disabled) {
  border-color: #0366d6;
  background: #f0f8ff;
}

.system-card__action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.system-card__action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.system-card__action-btn--delete:hover:not(:disabled) {
  border-color: #d73a49;
  background: #ffeef0;
}

/* Empty state */
.systems-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6a737d;
}

.systems-list__empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.systems-list__empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
}

.systems-list__empty-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
}

.systems-list__empty-btn {
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

.systems-list__empty-btn:hover {
  background: #218838;
}

/* Modal */
.systems-list__modal-overlay {
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

.systems-list__modal {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.systems-list__modal-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #24292e;
}

/* Form */
.systems-list__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.systems-list__form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.systems-list__form-label {
  font-size: 14px;
  font-weight: 500;
  color: #24292e;
}

.systems-list__form-input,
.systems-list__form-textarea,
.systems-list__form-select {
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.systems-list__form-input:focus,
.systems-list__form-textarea:focus,
.systems-list__form-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.systems-list__form-input--error,
.systems-list__form-textarea--error {
  border-color: #d73a49;
}

.systems-list__form-error {
  font-size: 12px;
  color: #d73a49;
  margin-top: 4px;
}

.systems-list__form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Dependencies input */
.systems-list__dependencies-input {
  display: flex;
  gap: 8px;
}

.systems-list__dependencies-input .systems-list__form-input {
  flex: 1;
}

.systems-list__add-dependency-btn {
  padding: 8px 16px;
  background: #0366d6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.systems-list__add-dependency-btn:hover:not(:disabled) {
  background: #0256cc;
}

.systems-list__add-dependency-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.systems-list__dependencies-list {
  margin: 8px 0 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.systems-list__dependency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #f6f8fa;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-size: 13px;
}

.systems-list__remove-dependency-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  color: #6a737d;
  transition: all 0.2s ease;
}

.systems-list__remove-dependency-btn:hover {
  background: #d73a49;
  color: #ffffff;
}

/* Form actions */
.systems-list__form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.systems-list__form-btn {
  padding: 10px 20px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.systems-list__form-btn--primary {
  background: #28a745;
  border-color: #28a745;
  color: #ffffff;
}

.systems-list__form-btn--primary:hover:not(:disabled) {
  background: #218838;
  border-color: #218838;
}

.systems-list__form-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.systems-list__form-btn--secondary {
  background: #ffffff;
  color: #24292e;
}

.systems-list__form-btn--secondary:hover {
  background: #f6f8fa;
}

/* Responsive design */
@media (max-width: 768px) {
  .systems-list__controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .systems-list__search {
    min-width: auto;
  }
  
  .systems-list__grid {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
  
  .system-card {
    min-height: auto;
  }
  
  .system-card__name {
    font-size: 16px;
    padding-right: 70px;
  }
  
  .systems-list__modal {
    margin: 16px;
    width: calc(100% - 32px);
  }
  
  .systems-list__form-actions {
    flex-direction: column;
  }
  
  .systems-list__dependencies-input {
    flex-direction: column;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .systems-list__header,
  .systems-list__summary {
    border-width: 2px;
  }
  
  .system-card {
    border-width: 2px;
  }
  
  .systems-list__form-input:focus,
  .systems-list__form-textarea:focus,
  .systems-list__form-select:focus {
    outline-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .systems-list__search-input,
  .systems-list__filter-select,
  .systems-list__add-btn,
  .system-card,
  .systems-list__form-btn {
    transition: none;
  }
}
</style>