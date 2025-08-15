<template>
  <div 
    :class="['requirement-item', { 
      'requirement-item--editing': isEditing,
      'requirement-item--readonly': readonly,
      'requirement-item--has-errors': hasValidationErrors
    }]"
    :data-testid="`requirement-item-${requirement.id}`"
    role="listitem"
    :aria-label="`Requirement: ${requirement.title}`"
    @keydown="handleKeyDown"
    tabindex="0"
  >
    <!-- Title Section -->
    <div class="requirement-item__header">
      <div class="requirement-item__title-section">
        <input
          v-if="isEditing"
          ref="titleInput"
          v-model="localTitle"
          class="requirement-item__title-input"
          :class="{ 'requirement-item__title-input--error': titleError }"
          placeholder="Enter requirement title..."
          :aria-describedby="titleError ? `title-error-${requirement.id}` : undefined"
          @blur="handleTitleBlur"
          @keydown.enter="handleTitleEnter"
          @keydown.escape="handleEscape"
          :data-testid="`requirement-title-input-${requirement.id}`"
        />
        <h3
          v-else
          class="requirement-item__title"
          :data-testid="`requirement-title-${requirement.id}`"
          @click="startEditing('title')"
          @keydown.enter="startEditing('title')"
          @keydown.space.prevent="startEditing('title')"
          tabindex="0"
          role="button"
          :aria-label="`Edit title: ${requirement.title}`"
        >
          {{ requirement.title || 'Untitled Requirement' }}
        </h3>
        
        <!-- Title Error Message -->
        <div
          v-if="titleError"
          :id="`title-error-${requirement.id}`"
          class="requirement-item__error"
          role="alert"
          :data-testid="`title-error-${requirement.id}`"
        >
          {{ titleError }}
        </div>
      </div>

      <!-- Status Dropdown -->
      <div class="requirement-item__status-section">
        <select
          v-model="localStatus"
          class="requirement-item__status-select"
          :class="`requirement-item__status-select--${localStatus}`"
          :disabled="readonly"
          @change="handleStatusChange"
          :data-testid="`requirement-status-${requirement.id}`"
          :aria-label="`Status for ${requirement.title}`"
        >
          <option value="new">New</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
    </div>

    <!-- Description Section -->
    <div class="requirement-item__description-section">
      <textarea
        v-if="isEditing"
        ref="descriptionInput"
        v-model="localDescription"
        class="requirement-item__description-input"
        :class="{ 'requirement-item__description-input--error': descriptionError }"
        placeholder="Enter requirement description..."
        rows="3"
        :aria-describedby="descriptionError ? `description-error-${requirement.id}` : undefined"
        @blur="handleDescriptionBlur"
        @keydown.escape="handleEscape"
        :data-testid="`requirement-description-input-${requirement.id}`"
      />
      <div
        v-else
        class="requirement-item__description"
        :data-testid="`requirement-description-${requirement.id}`"
        @click="startEditing('description')"
        @keydown.enter="startEditing('description')"
        @keydown.space.prevent="startEditing('description')"
        tabindex="0"
        role="button"
        :aria-label="`Edit description: ${requirement.description || 'No description'}`"
      >
        {{ requirement.description || 'Click to add description...' }}
      </div>
      
      <!-- Description Error Message -->
      <div
        v-if="descriptionError"
        :id="`description-error-${requirement.id}`"
        class="requirement-item__error"
        role="alert"
        :data-testid="`description-error-${requirement.id}`"
      >
        {{ descriptionError }}
      </div>
    </div>

    <!-- Action Buttons (shown when editing) -->
    <div v-if="isEditing" class="requirement-item__actions">
      <button
        class="requirement-item__action-btn requirement-item__action-btn--save"
        @click="saveChanges"
        :disabled="hasValidationErrors"
        :data-testid="`requirement-save-${requirement.id}`"
        :aria-label="`Save changes to ${requirement.title}`"
      >
        Save
      </button>
      <button
        class="requirement-item__action-btn requirement-item__action-btn--cancel"
        @click="cancelEditing"
        :data-testid="`requirement-cancel-${requirement.id}`"
        :aria-label="`Cancel editing ${requirement.title}`"
      >
        Cancel
      </button>
    </div>

    <!-- Metadata -->
    <div class="requirement-item__metadata">
      <span class="requirement-item__source">
        Source: {{ requirement.source === 'pdf' ? 'PDF Import' : 'Manual' }}
      </span>
      <span class="requirement-item__updated">
        Updated: {{ formatDate(requirement.updated_at) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

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
  requirement: RequirementItem;
  readonly?: boolean;
}

// Props and Emits
const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  'update': [requirement: RequirementItem];
  'delete': [requirementId: string];
  'status-change': [requirementId: string, status: RequirementItem['status']];
}>()

// Local state
const isEditing = ref(false)
const editingField = ref<'title' | 'description' | null>(null)
const localTitle = ref(props.requirement.title)
const localDescription = ref(props.requirement.description)
const localStatus = ref(props.requirement.status)

// Template refs
const titleInput = ref<HTMLInputElement>()
const descriptionInput = ref<HTMLTextAreaElement>()

// Validation
const titleError = ref<string>('')
const descriptionError = ref<string>('')

const hasValidationErrors = computed(() => {
  return Boolean(titleError.value || descriptionError.value)
})

// Watch for prop changes
watch(() => props.requirement, (newRequirement) => {
  if (!isEditing.value) {
    localTitle.value = newRequirement.title
    localDescription.value = newRequirement.description
    localStatus.value = newRequirement.status
  }
}, { deep: true })

// Validation functions
const validateTitle = (title: string): string => {
  if (!title.trim()) {
    return 'Title is required'
  }
  if (title.length > 200) {
    return 'Title must be less than 200 characters'
  }
  return ''
}

const validateDescription = (description: string): string => {
  if (!description.trim()) {
    return 'Description is required'
  }
  if (description.length > 2000) {
    return 'Description must be less than 2000 characters'
  }
  return ''
}

// Editing functions
const startEditing = async (field: 'title' | 'description') => {
  if (props.readonly) return
  
  isEditing.value = true
  editingField.value = field
  
  // Reset validation errors
  titleError.value = ''
  descriptionError.value = ''
  
  await nextTick()
  
  // Focus the appropriate input
  if (field === 'title' && titleInput.value) {
    titleInput.value.focus()
    titleInput.value.select()
  } else if (field === 'description' && descriptionInput.value) {
    descriptionInput.value.focus()
    descriptionInput.value.select()
  }
}

const cancelEditing = () => {
  isEditing.value = false
  editingField.value = null
  
  // Reset local values
  localTitle.value = props.requirement.title
  localDescription.value = props.requirement.description
  localStatus.value = props.requirement.status
  
  // Clear validation errors
  titleError.value = ''
  descriptionError.value = ''
}

const saveChanges = () => {
  // Validate all fields
  titleError.value = validateTitle(localTitle.value)
  descriptionError.value = validateDescription(localDescription.value)
  
  if (hasValidationErrors.value) {
    return
  }
  
  // Create updated requirement
  const updatedRequirement: RequirementItem = {
    ...props.requirement,
    title: localTitle.value.trim(),
    description: localDescription.value.trim(),
    status: localStatus.value,
    updated_at: new Date()
  }
  
  // Emit update event
  emit('update', updatedRequirement)
  
  // Exit editing mode
  isEditing.value = false
  editingField.value = null
}

// Event handlers
const handleTitleBlur = () => {
  titleError.value = validateTitle(localTitle.value)
}

const handleDescriptionBlur = () => {
  descriptionError.value = validateDescription(localDescription.value)
}

const handleTitleEnter = (event: KeyboardEvent) => {
  event.preventDefault()
  if (descriptionInput.value) {
    descriptionInput.value.focus()
  } else {
    saveChanges()
  }
}

const handleEscape = () => {
  cancelEditing()
}

const handleStatusChange = () => {
  if (!isEditing.value) {
    // Immediate status change when not in editing mode
    emit('status-change', props.requirement.id, localStatus.value)
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (props.readonly) return
  
  switch (event.key) {
    case 'Enter':
      if (!isEditing.value) {
        event.preventDefault()
        startEditing('title')
      }
      break
    case 'Escape':
      if (isEditing.value) {
        event.preventDefault()
        cancelEditing()
      }
      break
    case 'Delete':
      if (!isEditing.value && event.ctrlKey) {
        event.preventDefault()
        emit('delete', props.requirement.id)
      }
      break
  }
}

// Utility functions
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped>
.requirement-item {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: #ffffff;
  transition: all 0.2s ease;
  position: relative;
}

.requirement-item:hover {
  border-color: #c1c7cd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.requirement-item:focus-within {
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirement-item--editing {
  border-color: #0366d6;
  background: #f8f9fa;
}

.requirement-item--readonly {
  background: #f6f8fa;
  cursor: default;
}

.requirement-item--has-errors {
  border-color: #d73a49;
}

/* Header */
.requirement-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
}

.requirement-item__title-section {
  flex: 1;
}

.requirement-item__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #24292e;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.requirement-item__title:hover {
  background-color: #f1f3f4;
}

.requirement-item__title:focus {
  outline: 2px solid #0366d6;
  outline-offset: 2px;
}

.requirement-item__title-input {
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.requirement-item__title-input:focus {
  outline: none;
  border-color: #0366d6;
}

.requirement-item__title-input--error {
  border-color: #d73a49;
}

/* Status */
.requirement-item__status-section {
  flex-shrink: 0;
}

.requirement-item__status-select {
  padding: 6px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.requirement-item__status-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirement-item__status-select--new {
  background-color: #fff5b4;
  border-color: #d1cc00;
  color: #735c0f;
}

.requirement-item__status-select--accepted {
  background-color: #dcfce7;
  border-color: #16a34a;
  color: #15803d;
}

.requirement-item__status-select--rejected {
  background-color: #fee2e2;
  border-color: #dc2626;
  color: #dc2626;
}

/* Description */
.requirement-item__description-section {
  margin-bottom: 12px;
}

.requirement-item__description {
  color: #586069;
  line-height: 1.5;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  min-height: 24px;
}

.requirement-item__description:hover {
  background-color: #f1f3f4;
}

.requirement-item__description:focus {
  outline: 2px solid #0366d6;
  outline-offset: 2px;
}

.requirement-item__description-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  background: #ffffff;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;
}

.requirement-item__description-input:focus {
  outline: none;
  border-color: #0366d6;
}

.requirement-item__description-input--error {
  border-color: #d73a49;
}

/* Error messages */
.requirement-item__error {
  color: #d73a49;
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.requirement-item__error::before {
  content: "⚠";
  font-size: 14px;
}

/* Actions */
.requirement-item__actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.requirement-item__action-btn {
  padding: 6px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.requirement-item__action-btn:hover {
  background-color: #f6f8fa;
}

.requirement-item__action-btn:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.requirement-item__action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.requirement-item__action-btn--save {
  background-color: #28a745;
  border-color: #28a745;
  color: #ffffff;
}

.requirement-item__action-btn--save:hover:not(:disabled) {
  background-color: #218838;
  border-color: #1e7e34;
}

.requirement-item__action-btn--cancel {
  background-color: #6c757d;
  border-color: #6c757d;
  color: #ffffff;
}

.requirement-item__action-btn--cancel:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

/* Metadata */
.requirement-item__metadata {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6a737d;
  border-top: 1px solid #e1e5e9;
  padding-top: 8px;
}

.requirement-item__source {
  font-weight: 500;
}

.requirement-item__updated {
  font-style: italic;
}

/* Responsive design */
@media (max-width: 768px) {
  .requirement-item__header {
    flex-direction: column;
    gap: 8px;
  }
  
  .requirement-item__metadata {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .requirement-item__actions {
    flex-direction: column;
  }
  
  .requirement-item__action-btn {
    width: 100%;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .requirement-item {
    border-width: 2px;
  }
  
  .requirement-item__title:focus,
  .requirement-item__description:focus {
    outline-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .requirement-item,
  .requirement-item__title,
  .requirement-item__description,
  .requirement-item__title-input,
  .requirement-item__description-input,
  .requirement-item__status-select,
  .requirement-item__action-btn {
    transition: none;
  }
}
</style>