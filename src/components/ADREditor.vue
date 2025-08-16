<template>
  <div class="adr-editor">
    <div class="editor-header">
      <div class="header-left">
        <h2 v-if="mode === 'create'">Create New ADR</h2>
        <h2 v-else>Edit ADR</h2>
        <div class="status-indicator" :class="`status-${currentADR.status}`">
          {{ currentADR.status.toUpperCase() }}
        </div>
      </div>
      <div class="header-right">
        <button 
          class="btn-secondary" 
          @click="handleCancel"
          :disabled="isSaving"
        >
          Cancel
        </button>
        <button 
          class="btn-primary" 
          @click="handleSave"
          :disabled="!isValid || isSaving"
        >
          <span v-if="isSaving" class="loading-spinner"></span>
          {{ isSaving ? 'Saving...' : 'Save ADR' }}
        </button>
        <button 
          v-if="mode === 'edit' && !readonly"
          class="btn-danger" 
          @click="handleDelete"
          :disabled="isSaving"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="editor-content">
      <form @submit.prevent="handleSave" class="adr-form">
        <!-- Title Section -->
        <div class="form-section">
          <label for="title" class="form-label">Title *</label>
          <input
            id="title"
            v-model="currentADR.title"
            type="text"
            class="form-input"
            :class="{ 'error': validationErrors.title }"
            placeholder="Enter ADR title..."
            :readonly="readonly"
            @input="validateField('title')"
          />
          <div v-if="validationErrors.title" class="error-message">
            {{ validationErrors.title }}
          </div>
        </div>

        <!-- Status and Metadata Section -->
        <div class="form-row">
          <div class="form-section">
            <label for="status" class="form-label">Status *</label>
            <select
              id="status"
              v-model="currentADR.status"
              class="form-select"
              :class="{ 'error': validationErrors.status }"
              :disabled="readonly"
              @change="validateField('status')"
            >
              <option value="proposed">Proposed</option>
              <option value="accepted">Accepted</option>
              <option value="deprecated">Deprecated</option>
              <option value="superseded">Superseded</option>
            </select>
            <div v-if="validationErrors.status" class="error-message">
              {{ validationErrors.status }}
            </div>
          </div>

          <div class="form-section">
            <label for="author" class="form-label">Author *</label>
            <input
              id="author"
              v-model="currentADR.author"
              type="text"
              class="form-input"
              :class="{ 'error': validationErrors.author }"
              placeholder="Enter author name..."
              :readonly="readonly"
              @input="validateField('author')"
            />
            <div v-if="validationErrors.author" class="error-message">
              {{ validationErrors.author }}
            </div>
          </div>
        </div>

        <!-- Tags Section -->
        <div class="form-section">
          <label for="tags" class="form-label">Tags</label>
          <div class="tags-input">
            <div class="tags-list">
              <span 
                v-for="(tag, index) in currentADR.tags" 
                :key="index" 
                class="tag"
              >
                {{ tag }}
                <button 
                  v-if="!readonly"
                  type="button" 
                  class="tag-remove" 
                  @click="removeTag(index)"
                >
                  ×
                </button>
              </span>
            </div>
            <input
              v-if="!readonly"
              v-model="newTag"
              type="text"
              class="tag-input"
              placeholder="Add tag..."
              @keydown.enter.prevent="addTag"
              @keydown.comma.prevent="addTag"
            />
          </div>
        </div>

        <!-- Context Section -->
        <div class="form-section">
          <label for="context" class="form-label">Context *</label>
          <textarea
            id="context"
            v-model="currentADR.context"
            class="form-textarea"
            :class="{ 'error': validationErrors.context }"
            placeholder="Describe the context and problem that led to this decision..."
            rows="6"
            :readonly="readonly"
            @input="validateField('context')"
          ></textarea>
          <div v-if="validationErrors.context" class="error-message">
            {{ validationErrors.context }}
          </div>
          <div class="field-help">
            Explain the forces at play, including technological, political, social, and project local.
          </div>
        </div>

        <!-- Decision Section -->
        <div class="form-section">
          <label for="decision" class="form-label">Decision *</label>
          <textarea
            id="decision"
            v-model="currentADR.decision"
            class="form-textarea"
            :class="{ 'error': validationErrors.decision }"
            placeholder="Describe the decision that was made..."
            rows="6"
            :readonly="readonly"
            @input="validateField('decision')"
          ></textarea>
          <div v-if="validationErrors.decision" class="error-message">
            {{ validationErrors.decision }}
          </div>
          <div class="field-help">
            State the architecture decision and explain why this particular solution was chosen.
          </div>
        </div>

        <!-- Consequences Section -->
        <div class="form-section">
          <label for="consequences" class="form-label">Consequences *</label>
          <textarea
            id="consequences"
            v-model="currentADR.consequences"
            class="form-textarea"
            :class="{ 'error': validationErrors.consequences }"
            placeholder="Describe the consequences of this decision..."
            rows="6"
            :readonly="readonly"
            @input="validateField('consequences')"
          ></textarea>
          <div v-if="validationErrors.consequences" class="error-message">
            {{ validationErrors.consequences }}
          </div>
          <div class="field-help">
            Describe the resulting context, after applying the decision. All consequences should be listed here, not just the "positive" ones.
          </div>
        </div>

        <!-- Alternatives Section -->
        <div class="form-section">
          <label for="alternatives" class="form-label">Alternatives Considered</label>
          <textarea
            id="alternatives"
            v-model="currentADR.alternatives"
            class="form-textarea"
            placeholder="Describe alternative solutions that were considered..."
            rows="4"
            :readonly="readonly"
          ></textarea>
          <div class="field-help">
            List the alternative solutions that were considered and explain why they were not chosen.
          </div>
        </div>

        <!-- Supersession Section (for superseded ADRs) -->
        <div v-if="currentADR.status === 'superseded'" class="form-section">
          <label for="superseded_by" class="form-label">Superseded By</label>
          <input
            id="superseded_by"
            v-model="currentADR.superseded_by"
            type="text"
            class="form-input"
            placeholder="ADR ID that supersedes this one..."
            :readonly="readonly"
          />
          <div class="field-help">
            Enter the ID of the ADR that supersedes this one.
          </div>
        </div>
      </form>
    </div>

    <!-- Confirmation Dialog -->
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
import { ref, computed, watch, onMounted } from 'vue'
import type { ADR, ADREditorProps, ADREditorEmits } from '../types/adr'

const props = withDefaults(defineProps<ADREditorProps>(), {
  mode: 'create',
  readonly: false
})

const emit = defineEmits<ADREditorEmits>()

// Reactive state
const currentADR = ref<ADR>({
  id: '',
  project_id: '',
  title: '',
  status: 'proposed',
  context: '',
  decision: '',
  consequences: '',
  alternatives: '',
  author: '',
  created_at: new Date(),
  updated_at: new Date(),
  tags: [],
  superseded_by: undefined,
  supersedes: []
})

const validationErrors = ref<Record<string, string>>({})
const isSaving = ref(false)
const showDeleteConfirm = ref(false)
const newTag = ref('')

// Computed properties
const isValid = computed(() => {
  return (
    currentADR.value.title.trim() !== '' &&
    currentADR.value.context.trim() !== '' &&
    currentADR.value.decision.trim() !== '' &&
    currentADR.value.consequences.trim() !== '' &&
    currentADR.value.author.trim() !== '' &&
    Object.keys(validationErrors.value).length === 0
  )
})

// Validation methods
const validateField = (field: string) => {
  const errors = { ...validationErrors.value }
  
  switch (field) {
    case 'title':
      if (!currentADR.value.title.trim()) {
        errors.title = 'Title is required'
      } else if (currentADR.value.title.length > 200) {
        errors.title = 'Title must be less than 200 characters'
      } else {
        delete errors.title
      }
      break
      
    case 'context':
      if (!currentADR.value.context.trim()) {
        errors.context = 'Context is required'
      } else if (currentADR.value.context.length < 50) {
        errors.context = 'Context should be at least 50 characters'
      } else {
        delete errors.context
      }
      break
      
    case 'decision':
      if (!currentADR.value.decision.trim()) {
        errors.decision = 'Decision is required'
      } else if (currentADR.value.decision.length < 50) {
        errors.decision = 'Decision should be at least 50 characters'
      } else {
        delete errors.decision
      }
      break
      
    case 'consequences':
      if (!currentADR.value.consequences.trim()) {
        errors.consequences = 'Consequences are required'
      } else if (currentADR.value.consequences.length < 30) {
        errors.consequences = 'Consequences should be at least 30 characters'
      } else {
        delete errors.consequences
      }
      break
      
    case 'author':
      if (!currentADR.value.author.trim()) {
        errors.author = 'Author is required'
      } else {
        delete errors.author
      }
      break
      
    case 'status':
      if (!['proposed', 'accepted', 'deprecated', 'superseded'].includes(currentADR.value.status)) {
        errors.status = 'Invalid status'
      } else {
        delete errors.status
      }
      break
  }
  
  validationErrors.value = errors
}

const validateAll = () => {
  validateField('title')
  validateField('context')
  validateField('decision')
  validateField('consequences')
  validateField('author')
  validateField('status')
}

// Tag management
const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !currentADR.value.tags.includes(tag)) {
    currentADR.value.tags.push(tag)
    newTag.value = ''
  }
}

const removeTag = (index: number) => {
  currentADR.value.tags.splice(index, 1)
}

// Event handlers
const handleSave = async () => {
  validateAll()
  
  if (!isValid.value) {
    return
  }
  
  isSaving.value = true
  
  try {
    emit('save', { ...currentADR.value })
  } catch (error) {
    console.error('Failed to save ADR:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const handleDelete = () => {
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  showDeleteConfirm.value = false
  if (currentADR.value.id) {
    emit('delete', currentADR.value.id)
  }
}

// Initialize component
onMounted(() => {
  if (props.adr) {
    currentADR.value = { ...props.adr }
  } else {
    // Set default author from user context if available
    currentADR.value.author = 'Current User' // This would come from auth context
  }
})

// Watch for prop changes
watch(() => props.adr, (newADR) => {
  if (newADR) {
    currentADR.value = { ...newADR }
  }
}, { deep: true })
</script>

<style scoped>
.adr-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #f8f9fa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #24292f;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
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

.header-right {
  display: flex;
  gap: 0.75rem;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.adr-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #24292f;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0969da;
  box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
}

.form-input.error,
.form-select.error,
.form-textarea.error {
  border-color: #cf222e;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.tags-input {
  border: 1px solid #d1d9e0;
  border-radius: 6px;
  padding: 0.5rem;
  min-height: 2.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #f6f8fa;
  border: 1px solid #d1d9e0;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #24292f;
}

.tag-remove {
  background: none;
  border: none;
  color: #656d76;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  margin-left: 0.25rem;
}

.tag-remove:hover {
  color: #cf222e;
}

.tag-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.25rem;
  font-size: 0.875rem;
  min-width: 120px;
}

.field-help {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #656d76;
  line-height: 1.4;
}

.error-message {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #cf222e;
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-right {
    justify-content: center;
  }

  .editor-content {
    padding: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>