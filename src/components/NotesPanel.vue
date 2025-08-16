<template>
  <div class="notes-panel">
    <!-- Header -->
    <div class="notes-header">
      <h3 class="notes-title">
        <span class="notes-icon">📝</span>
        Notes
        <span v-if="totalNotes > 0" class="notes-count">({{ totalNotes }})</span>
      </h3>
      <div class="notes-actions">
        <button 
          class="create-note-btn" 
          @click="showCreateForm = !showCreateForm"
          :class="{ active: showCreateForm }"
          :disabled="isLoading || readonly"
        >
          <span class="btn-icon">{{ showCreateForm ? '✕' : '+' }}</span>
          {{ showCreateForm ? 'Cancel' : 'New Note' }}
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-section" v-if="!showCreateForm">
      <div class="search-input-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notes..."
          class="search-input"
          @input="handleSearchInput"
          :disabled="isLoading"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-controls" v-if="entityType || entityId">
        <button 
          class="filter-btn"
          :class="{ active: showContextualOnly }"
          @click="toggleContextualFilter"
        >
          {{ showContextualOnly ? 'Show All' : 'Show Related' }}
        </button>
      </div>
    </div>

    <!-- Create Note Form -->
    <div v-if="showCreateForm" class="create-note-form">
      <div class="form-group">
        <label for="note-title" class="form-label">Title</label>
        <input
          id="note-title"
          v-model="newNote.title"
          type="text"
          placeholder="Enter note title..."
          class="form-input"
          :class="{ error: validationErrors.title }"
          @blur="validateField('title')"
        />
        <span v-if="validationErrors.title" class="error-message">{{ validationErrors.title }}</span>
      </div>

      <div class="form-group">
        <label for="note-content" class="form-label">Content</label>
        <textarea
          id="note-content"
          v-model="newNote.content"
          placeholder="Write your note content..."
          class="form-textarea"
          :class="{ error: validationErrors.content }"
          rows="4"
          @blur="validateField('content')"
        ></textarea>
        <span v-if="validationErrors.content" class="error-message">{{ validationErrors.content }}</span>
      </div>

      <div class="form-group">
        <label for="note-tags" class="form-label">Tags (optional)</label>
        <input
          id="note-tags"
          v-model="tagsInput"
          type="text"
          placeholder="Enter tags separated by commas..."
          class="form-input"
          @blur="processTags"
        />
        <div v-if="newNote.tags.length > 0" class="tags-preview">
          <span v-for="tag in newNote.tags" :key="tag" class="tag-chip">
            {{ tag }}
            <button @click="removeTag(tag)" class="tag-remove">×</button>
          </span>
        </div>
      </div>

      <!-- Association Section -->
      <div v-if="entityType && entityId" class="form-group">
        <label class="form-label">
          <input
            v-model="associateWithContext"
            type="checkbox"
            class="form-checkbox"
          />
          Associate with current {{ entityType }}
        </label>
        <input
          v-if="associateWithContext"
          v-model="associationContext"
          type="text"
          placeholder="Optional context for this association..."
          class="form-input association-context"
        />
      </div>

      <div class="form-actions">
        <button 
          @click="createNote" 
          class="save-btn"
          :disabled="isCreating || !isFormValid"
          :class="{ loading: isCreating }"
        >
          <span v-if="isCreating" class="spinner"></span>
          {{ isCreating ? 'Creating...' : 'Create Note' }}
        </button>
        <button @click="cancelCreate" class="cancel-btn" :disabled="isCreating">
          Cancel
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !notes.length" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading notes...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && filteredNotes.length === 0 && !searchQuery" class="empty-state">
      <div class="empty-icon">📝</div>
      <h4 class="empty-title">No notes yet</h4>
      <p class="empty-description">
        {{ entityType ? `Create your first note for this ${entityType}` : 'Create your first project note' }}
      </p>
    </div>

    <!-- No Search Results -->
    <div v-else-if="!isLoading && filteredNotes.length === 0 && searchQuery" class="no-results-state">
      <div class="no-results-icon">🔍</div>
      <h4 class="no-results-title">No notes found</h4>
      <p class="no-results-description">
        No notes match "{{ searchQuery }}"
      </p>
      <button @click="clearSearch" class="clear-search-btn">Clear search</button>
    </div>

    <!-- Notes List -->
    <div v-else-if="filteredNotes.length > 0" class="notes-list">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item"
        :class="{ editing: editingNoteId === note.id }"
      >
        <!-- Note Display Mode -->
        <div v-if="editingNoteId !== note.id" class="note-display">
          <div class="note-header">
            <h4 class="note-title" v-html="highlightSearchTerm(note.title)"></h4>
            <div class="note-meta">
              <span class="note-author">{{ note.author }}</span>
              <span class="note-date">{{ formatDate(note.updated_at) }}</span>
            </div>
          </div>
          
          <div class="note-content" v-html="highlightSearchTerm(truncateContent(note.content))"></div>
          
          <!-- Tags -->
          <div v-if="note.tags.length > 0" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="note-tag">{{ tag }}</span>
          </div>

          <!-- Associations -->
          <div v-if="note.associations.length > 0" class="note-associations">
            <span class="associations-label">Related to:</span>
            <span 
              v-for="assoc in note.associations" 
              :key="`${assoc.entity_type}-${assoc.entity_id}`"
              class="association-chip"
              :class="`association-${assoc.entity_type}`"
            >
              {{ formatAssociation(assoc) }}
            </span>
          </div>

          <div class="note-actions">
            <button @click="startEdit(note)" class="edit-btn" :disabled="readonly">
              ✏️ Edit
            </button>
            <button @click="deleteNote(note.id)" class="delete-btn" :disabled="readonly">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Note Edit Mode -->
        <div v-else class="note-edit">
          <div class="form-group">
            <input
              v-model="editingNote.title"
              type="text"
              class="form-input"
              :class="{ error: editValidationErrors.title }"
              @blur="validateEditField('title')"
            />
            <span v-if="editValidationErrors.title" class="error-message">{{ editValidationErrors.title }}</span>
          </div>

          <div class="form-group">
            <textarea
              v-model="editingNote.content"
              class="form-textarea"
              :class="{ error: editValidationErrors.content }"
              rows="4"
              @blur="validateEditField('content')"
            ></textarea>
            <span v-if="editValidationErrors.content" class="error-message">{{ editValidationErrors.content }}</span>
          </div>

          <div class="form-group">
            <input
              v-model="editTagsInput"
              type="text"
              placeholder="Tags (comma-separated)"
              class="form-input"
              @blur="processEditTags"
            />
            <div v-if="editingNote.tags.length > 0" class="tags-preview">
              <span v-for="tag in editingNote.tags" :key="tag" class="tag-chip">
                {{ tag }}
                <button @click="removeEditTag(tag)" class="tag-remove">×</button>
              </span>
            </div>
          </div>

          <div class="form-actions">
            <button 
              @click="saveEdit" 
              class="save-btn"
              :disabled="isUpdating || !isEditFormValid"
              :class="{ loading: isUpdating }"
            >
              <span v-if="isUpdating" class="spinner"></span>
              {{ isUpdating ? 'Saving...' : 'Save' }}
            </button>
            <button @click="cancelEdit" class="cancel-btn" :disabled="isUpdating">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-display">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4 class="error-title">{{ error.message }}</h4>
        <p v-if="error.suggestedAction" class="error-suggestion">{{ error.suggestedAction }}</p>
        <button @click="retryLastAction" class="retry-btn">Try Again</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NotesApiService } from '../services/NotesApiService'
import type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteEntityType,
  NotesError
} from '../types/notes'

// Props
const props = withDefaults(defineProps<{
  projectId: string
  entityType?: NoteEntityType
  entityId?: string
  readonly?: boolean
}>(), {
  readonly: false
})

// Emits
const emit = defineEmits<{
  'note-created': [note: Note]
  'note-updated': [note: Note]
  'note-deleted': [noteId: string]
}>()

// Reactive state
const notes = ref<Note[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const isUpdating = ref(false)
const error = ref<NotesError | null>(null)
const searchQuery = ref('')
const showCreateForm = ref(false)
const showContextualOnly = ref(false)

// Create form state
const newNote = ref<CreateNoteRequest>({
  title: '',
  content: '',
  tags: [],
  associations: []
})
const tagsInput = ref('')
const associateWithContext = ref(true)
const associationContext = ref('')
const validationErrors = ref<Record<string, string>>({})

// Edit form state
const editingNoteId = ref<string | null>(null)
const editingNote = ref<Partial<Note>>({})
const editTagsInput = ref('')
const editValidationErrors = ref<Record<string, string>>({})

// Last action for retry functionality
const lastAction = ref<(() => Promise<void>) | null>(null)

// Computed properties
const totalNotes = computed(() => notes.value.length)

const filteredNotes = computed(() => {
  let filtered = notes.value

  // Apply contextual filter if enabled
  if (showContextualOnly.value && props.entityType && props.entityId) {
    filtered = filtered.filter(note =>
      note.associations.some(assoc =>
        assoc.entity_type === props.entityType && assoc.entity_id === props.entityId
      )
    )
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // Sort by updated date (most recent first)
  return filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
})

const isFormValid = computed(() => {
  return newNote.value.title.trim().length > 0 &&
         newNote.value.content.trim().length > 0 &&
         Object.keys(validationErrors.value).length === 0
})

const isEditFormValid = computed(() => {
  return editingNote.value.title?.trim().length > 0 &&
         editingNote.value.content?.trim().length > 0 &&
         Object.keys(editValidationErrors.value).length === 0
})

// Lifecycle
onMounted(() => {
  loadNotes()
})

// Watch for prop changes
watch(() => [props.projectId, props.entityType, props.entityId], () => {
  loadNotes()
}, { deep: true })

// Methods
async function loadNotes() {
  if (!props.projectId) return

  isLoading.value = true
  error.value = null

  try {
    const options = showContextualOnly.value && props.entityType && props.entityId
      ? { entity_type: props.entityType, entity_id: props.entityId }
      : undefined

    notes.value = await NotesApiService.listNotes(props.projectId, options)
  } catch (err: any) {
    error.value = {
      type: err.type || 'note_load_failed',
      message: err.message || 'Failed to load notes',
      suggestedAction: err.suggestedAction || 'Please try again'
    }
    lastAction.value = loadNotes
  } finally {
    isLoading.value = false
  }
}

async function createNote() {
  if (!isFormValid.value) return

  isCreating.value = true
  error.value = null

  try {
    // Prepare associations
    const associations = []
    if (associateWithContext.value && props.entityType && props.entityId) {
      associations.push({
        entity_type: props.entityType,
        entity_id: props.entityId,
        context: associationContext.value.trim() || undefined
      })
    }

    const noteRequest: CreateNoteRequest = {
      ...newNote.value,
      associations
    }

    const createdNote = await NotesApiService.createNote(props.projectId, noteRequest)
    notes.value.unshift(createdNote)
    emit('note-created', createdNote)
    
    // Reset form
    resetCreateForm()
    showCreateForm.value = false
  } catch (err: any) {
    error.value = {
      type: err.type || 'note_create_failed',
      message: err.message || 'Failed to create note',
      suggestedAction: err.suggestedAction || 'Please try again'
    }
    lastAction.value = createNote
  } finally {
    isCreating.value = false
  }
}

async function saveEdit() {
  if (!isEditFormValid.value || !editingNoteId.value) return

  isUpdating.value = true
  error.value = null

  try {
    const updates: UpdateNoteRequest = {
      title: editingNote.value.title,
      content: editingNote.value.content,
      tags: editingNote.value.tags
    }

    const updatedNote = await NotesApiService.updateNote(editingNoteId.value, updates)
    
    // Update local state
    const index = notes.value.findIndex(n => n.id === editingNoteId.value)
    if (index !== -1) {
      notes.value[index] = updatedNote
    }
    
    emit('note-updated', updatedNote)
    cancelEdit()
  } catch (err: any) {
    error.value = {
      type: err.type || 'note_update_failed',
      message: err.message || 'Failed to update note',
      suggestedAction: err.suggestedAction || 'Please try again'
    }
    lastAction.value = saveEdit
  } finally {
    isUpdating.value = false
  }
}

async function deleteNote(noteId: string) {
  if (!confirm('Are you sure you want to delete this note?')) return

  try {
    await NotesApiService.deleteNote(noteId)
    
    // Remove from local state
    notes.value = notes.value.filter(n => n.id !== noteId)
    emit('note-deleted', noteId)
  } catch (err: any) {
    error.value = {
      type: err.type || 'note_delete_failed',
      message: err.message || 'Failed to delete note',
      suggestedAction: err.suggestedAction || 'Please try again'
    }
    lastAction.value = () => deleteNote(noteId)
  }
}

function startEdit(note: Note) {
  editingNoteId.value = note.id
  editingNote.value = { ...note }
  editTagsInput.value = note.tags.join(', ')
  editValidationErrors.value = {}
}

function cancelEdit() {
  editingNoteId.value = null
  editingNote.value = {}
  editTagsInput.value = ''
  editValidationErrors.value = {}
}

function cancelCreate() {
  resetCreateForm()
  showCreateForm.value = false
}

function resetCreateForm() {
  newNote.value = {
    title: '',
    content: '',
    tags: [],
    associations: []
  }
  tagsInput.value = ''
  associateWithContext.value = true
  associationContext.value = ''
  validationErrors.value = {}
}

function processTags() {
  if (tagsInput.value.trim()) {
    newNote.value.tags = tagsInput.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10) // Limit to 10 tags
  }
}

function processEditTags() {
  if (editTagsInput.value.trim()) {
    editingNote.value.tags = editTagsInput.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10) // Limit to 10 tags
  }
}

function removeTag(tag: string) {
  newNote.value.tags = newNote.value.tags.filter(t => t !== tag)
  tagsInput.value = newNote.value.tags.join(', ')
}

function removeEditTag(tag: string) {
  editingNote.value.tags = editingNote.value.tags?.filter(t => t !== tag) || []
  editTagsInput.value = editingNote.value.tags.join(', ')
}

function validateField(field: string) {
  validationErrors.value = { ...validationErrors.value }
  delete validationErrors.value[field]

  if (field === 'title' && newNote.value.title.trim().length === 0) {
    validationErrors.value.title = 'Title is required'
  } else if (field === 'title' && newNote.value.title.trim().length > 200) {
    validationErrors.value.title = 'Title must be 200 characters or less'
  }

  if (field === 'content' && newNote.value.content.trim().length === 0) {
    validationErrors.value.content = 'Content is required'
  } else if (field === 'content' && newNote.value.content.trim().length > 10000) {
    validationErrors.value.content = 'Content must be 10,000 characters or less'
  }
}

function validateEditField(field: string) {
  editValidationErrors.value = { ...editValidationErrors.value }
  delete editValidationErrors.value[field]

  if (field === 'title' && (!editingNote.value.title || editingNote.value.title.trim().length === 0)) {
    editValidationErrors.value.title = 'Title is required'
  } else if (field === 'title' && editingNote.value.title && editingNote.value.title.trim().length > 200) {
    editValidationErrors.value.title = 'Title must be 200 characters or less'
  }

  if (field === 'content' && (!editingNote.value.content || editingNote.value.content.trim().length === 0)) {
    editValidationErrors.value.content = 'Content is required'
  } else if (field === 'content' && editingNote.value.content && editingNote.value.content.trim().length > 10000) {
    editValidationErrors.value.content = 'Content must be 10,000 characters or less'
  }
}

function handleSearchInput() {
  // Debounce search to avoid too many API calls
  // For now, we'll search locally since we load all notes
}

function toggleContextualFilter() {
  showContextualOnly.value = !showContextualOnly.value
}

function clearSearch() {
  searchQuery.value = ''
}

function highlightSearchTerm(text: string): string {
  if (!searchQuery.value.trim()) return text
  
  const query = searchQuery.value.trim()
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return new Date(date).toLocaleDateString()
}

function formatAssociation(assoc: any): string {
  const typeLabels = {
    requirement: 'Requirement',
    adr: 'ADR',
    system: 'System',
    team: 'Team'
  }
  
  const label = typeLabels[assoc.entity_type as keyof typeof typeLabels] || assoc.entity_type
  return `${label} ${assoc.entity_id}`
}

async function retryLastAction() {
  if (lastAction.value) {
    await lastAction.value()
    lastAction.value = null
  }
}
</script>

<style scoped>
.notes-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

/* Header */
.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.notes-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.notes-icon {
  font-size: 20px;
}

.notes-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 400;
}

.create-note-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-note-btn:hover:not(:disabled) {
  background: #2563eb;
}

.create-note-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.create-note-btn.active {
  background: #ef4444;
}

.create-note-btn.active:hover:not(:disabled) {
  background: #dc2626;
}

.btn-icon {
  font-size: 16px;
  line-height: 1;
}

/* Search Section */
.search-section {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.search-input-container {
  position: relative;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 16px;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #e5e7eb;
}

.filter-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* Create Note Form */
.create-note-form {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.error,
.form-textarea.error {
  border-color: #ef4444;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-checkbox {
  margin-right: 8px;
}

.association-context {
  margin-top: 8px;
  font-size: 13px;
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}

.tags-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: #6366f1;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
}

.tag-remove:hover {
  color: #4f46e5;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn.loading {
  opacity: 0.8;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Empty States */
.empty-state,
.no-results-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-icon,
.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title,
.no-results-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.empty-description,
.no-results-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  line-height: 1.5;
}

.clear-search-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-search-btn:hover {
  background: #2563eb;
}

/* Notes List */
.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.note-item {
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.note-item:hover {
  background: #f9fafb;
}

.note-item.editing {
  background: #fef3c7;
}

.note-display,
.note-edit {
  padding: 16px 20px;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.note-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  flex: 1;
}

.note-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: 12px;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.note-author {
  font-weight: 500;
}

.note-content {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.note-tag {
  padding: 2px 8px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.note-associations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.associations-label {
  color: #6b7280;
  font-weight: 500;
}

.association-chip {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.association-requirement {
  background: #dbeafe;
  color: #1e40af;
}

.association-adr {
  background: #fef3c7;
  color: #92400e;
}

.association-system {
  background: #d1fae5;
  color: #065f46;
}

.association-team {
  background: #fce7f3;
  color: #be185d;
}

.note-actions {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.edit-btn {
  color: #3b82f6;
  border-color: #3b82f6;
}

.edit-btn:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.delete-btn {
  color: #ef4444;
  border-color: #ef4444;
}

.delete-btn:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.edit-btn:disabled,
.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Error Display */
.error-display {
  padding: 16px 20px;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-icon {
  font-size: 20px;
  color: #ef4444;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #dc2626;
}

.error-suggestion {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #7f1d1d;
}

.retry-btn {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #dc2626;
}

/* Search highlighting */
:deep(mark) {
  background: #fef08a;
  color: #854d0e;
  padding: 1px 2px;
  border-radius: 2px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .notes-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .note-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .note-meta {
    align-items: flex-start;
    flex-direction: row;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .note-actions {
    flex-wrap: wrap;
  }
}
</style>