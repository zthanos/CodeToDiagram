<template>
  <div class="notes-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <div class="header-left">
        <h2 class="workspace-title">Notes</h2>
        <p class="workspace-description">Capture and organize notes for {{ project?.name || 'this project' }}.</p>
      </div>
      <div class="header-right">
        <div class="header-actions">
          <button class="btn-secondary" @click="showSearchModal = true" :disabled="notes.length === 0">
            🔍 Search
          </button>
          <button class="btn-primary" @click="createNewNote">
            ➕ New Note
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading notes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Failed to Load Notes</h3>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="loadNotes">Try Again</button>
    </div>

    <!-- Main Content -->
    <div v-else class="main-content">
      <!-- Sidebar -->
      <div class="notes-sidebar">
        <!-- Filter and Sort Controls -->
        <div class="sidebar-controls">
          <div class="filter-section">
            <label class="filter-label">Filter by tag:</label>
            <select v-model="selectedTag" class="filter-select">
              <option value="">All tags</option>
              <option v-for="tag in availableTags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>
          </div>

          <div class="sort-section">
            <label class="sort-label">Sort by:</label>
            <select v-model="sortBy" class="sort-select">
              <option value="updated">Last updated</option>
              <option value="created">Date created</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <!-- Notes List -->
        <div class="notes-list">
          <div v-if="filteredNotes.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p v-if="notes.length === 0">No notes yet. Create your first note!</p>
            <p v-else>No notes match your current filter.</p>
          </div>

          <div v-for="note in filteredNotes" :key="note.id" class="note-item"
            :class="{ active: selectedNote?.id === note.id }" @click="selectNote(note)">
            <div class="note-header">
              <h4 class="note-title">{{ note.title || 'Untitled Note' }}</h4>
              <div class="note-meta">
                <span class="note-date">{{ formatDate(note.updated_at) }}</span>
              </div>
            </div>
            <div class="note-preview">{{ getPreviewText(note.content) }}</div>
            <div v-if="note.tags && note.tags.length > 0" class="note-tags">
              <span v-for="tag in note.tags" :key="tag" class="note-tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Editor -->
      <div class="notes-editor">
        <div v-if="!selectedNote" class="no-selection">
          <div class="no-selection-icon">📝</div>
          <h3>Select a note to edit</h3>
          <p>Choose a note from the sidebar or create a new one to get started.</p>
        </div>

        <div v-else class="editor-container">
          <!-- Editor Header -->
          <div class="editor-header">
            <input v-model="selectedNote.title" class="note-title-input" placeholder="Note title..."
              @input="markAsModified" />
            <div class="editor-actions">
              <button class="btn-icon" @click="toggleFavorite" :class="{ active: selectedNote.is_favorite }"
                title="Toggle favorite">
                {{ selectedNote.is_favorite ? '⭐' : '☆' }}
              </button>
              <button class="btn-secondary" @click="showTagsModal = true" title="Manage tags">
                🏷️ Tags
              </button>
              <button class="btn-secondary" @click="saveNote" :disabled="!isModified" title="Save note">
                💾 Save
              </button>
              <button class="btn-danger" @click="confirmDeleteNote" title="Delete note">
                🗑️ Delete
              </button>
            </div>
          </div>

          <!-- Editor Content -->
          <div class="editor-content">
            <textarea v-model="selectedNote.content" class="note-content-editor"
              placeholder="Start writing your note..." @input="markAsModified"></textarea>
          </div>

          <!-- Editor Footer -->
          <div class="editor-footer">
            <div class="editor-info">
              <span class="word-count">{{ getWordCount(selectedNote.content) }} words</span>
              <span class="char-count">{{ selectedNote.content?.length || 0 }} characters</span>
              <span class="last-saved" v-if="selectedNote.updated_at">
                Last saved: {{ formatDateTime(selectedNote.updated_at) }}
              </span>
            </div>
            <div class="modification-indicator" v-if="isModified">
              <span class="modified-dot">●</span>
              <span>Unsaved changes</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Modal -->
    <div v-if="showSearchModal" class="modal-overlay" @click="showSearchModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Search Notes</h3>
          <button class="modal-close" @click="showSearchModal = false">×</button>
        </div>
        <div class="modal-body">
          <input v-model="searchQuery" class="search-input" placeholder="Search in titles and content..."
            @input="performSearch" ref="searchInput" />
          <div class="search-results">
            <div v-if="searchResults.length === 0 && searchQuery" class="no-results">
              No notes found matching "{{ searchQuery }}"
            </div>
            <div v-for="result in searchResults" :key="result.id" class="search-result"
              @click="selectNoteFromSearch(result)">
              <h4>{{ result.title || 'Untitled Note' }}</h4>
              <p>{{ getPreviewText(result.content) }}</p>
              <div class="search-meta">
                <span>{{ formatDate(result.updated_at) }}</span>
                <span v-if="result.tags && result.tags.length > 0">
                  Tags: {{ result.tags.join(', ') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tags Modal -->
    <div v-if="showTagsModal" class="modal-overlay" @click="showTagsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Manage Tags</h3>
          <button class="modal-close" @click="showTagsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="current-tags">
            <label>Current tags:</label>
            <div class="tags-list">
              <span v-for="tag in selectedNote?.tags || []" :key="tag" class="tag-item">
                {{ tag }}
                <button @click="removeTag(tag)" class="tag-remove">×</button>
              </span>
            </div>
          </div>
          <div class="add-tag">
            <input v-model="newTag" class="tag-input" placeholder="Add new tag..." @keyup.enter="addTag" />
            <button @click="addTag" class="btn-primary">Add</button>
          </div>
          <div class="available-tags">
            <label>Available tags:</label>
            <div class="tags-list">
              <button v-for="tag in availableTagsForSelection" :key="tag" class="tag-suggestion"
                @click="addExistingTag(tag)">
                {{ tag }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Delete Note</h3>
          <button class="modal-close" @click="showDeleteConfirm = false">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete "{{ selectedNote?.title || 'Untitled Note' }}"?</p>
          <p class="warning-text">This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn-danger" @click="deleteNote">Delete Note</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Notifications -->
    <div v-if="notification" class="notification" :class="notification.type">
      <span>{{ notification.message }}</span>
      <button @click="notification = null" class="notification-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Project } from '../types/project'
import { useWorkspaceDataSharing } from '../composables/useWorkspaceDataSharing'
import { NotesApiService } from '@/services/NotesApiService';

// Props
interface Props {
  project: Project
}

const props = defineProps<Props>()

// Note interface
interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  is_favorite: boolean
  created_at: Date
  updated_at: Date
  project_id: string
}

// State
const notes = ref<Note[]>([])
const selectedNote = ref<Note | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const isModified = ref(false)

// Modal states
const showSearchModal = ref(false)
const showTagsModal = ref(false)
const showDeleteConfirm = ref(false)

// Filter and search states
const selectedTag = ref('')
const sortBy = ref('updated')
const searchQuery = ref('')
const searchResults = ref<Note[]>([])

// Tag management
const newTag = ref('')

// Notification
const notification = ref<{ type: 'success' | 'error', message: string } | null>(null)

// Data sharing
const dataSharing = useWorkspaceDataSharing()

// Computed properties
const availableTags = computed(() => {
  const tags = new Set<string>()
  notes.value.forEach(note => {
    note.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

const availableTagsForSelection = computed(() => {
  const currentTags = selectedNote.value?.tags || []
  return availableTags.value.filter(tag => !currentTags.includes(tag))
})

const filteredNotes = computed(() => {
  let filtered = [...notes.value]

  // Filter by tag
  if (selectedTag.value) {
    filtered = filtered.filter(note =>
      note.tags?.includes(selectedTag.value)
    )
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'updated':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  return filtered
})

// Lifecycle
onMounted(() => {
  loadNotes()
})

// Watch for project changes
watch(() => props.project?.id, (newProjectId) => {
  if (newProjectId) {
    loadNotes()
  }
})

// Methods
async function loadNotes() {
  if (!props.project?.id) return

  isLoading.value = true
  error.value = null

  try {
    // Simulate API call - replace with actual API service
    const items = await NotesApiService.listNotes(props.project.id);
    notes.value = items;



    // Update shared data
    dataSharing.updateNotesData(notes.value)

    console.log('Notes loaded successfully:', notes.value)
  } catch (err) {
    console.error('Failed to load notes:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load notes'
    showNotification('error', 'Failed to load notes')
  } finally {
    isLoading.value = false
  }
}

function createNewNote() {
  const newNote: Note = {
    id: generateId(),
    title: '',
    content: '',
    tags: [],
    is_favorite: false,
    created_at: new Date(),
    updated_at: new Date(),
    project_id: props.project.id
  }

  notes.value.unshift(newNote)
  selectedNote.value = newNote
  isModified.value = true

  // Focus on title input
  nextTick(() => {
    const titleInput = document.querySelector('.note-title-input') as HTMLInputElement
    titleInput?.focus()
  })
}

function selectNote(note: Note) {
  if (isModified.value && selectedNote.value) {
    if (confirm('You have unsaved changes. Do you want to save them first?')) {
      saveNote()
    }
  }

  selectedNote.value = note
  isModified.value = false
}

function markAsModified() {
  isModified.value = true
}

async function saveNote() {
  if (!selectedNote.value) return

  try {
    selectedNote.value.updated_at = new Date()

    const savedNote = NotesApiService.upsertNote(
      props.project.id, 
      selectedNote.value.title, 
      selectedNote.value.content, 
      selectedNote.value.tags, 
      selectedNote.value.id)
    // Simulate API call - replace with actual API service
    await new Promise(resolve => setTimeout(resolve, 300))

    // Update the note in the list
    const index = notes.value.findIndex(n => n.id === selectedNote.value!.id)
    if (index >= 0) {
      notes.value[index] = { ...selectedNote.value }
    }

    // Update shared data
    dataSharing.updateNotesData(notes.value)

    isModified.value = false
    showNotification('success', 'Note saved successfully')

    console.log('Note saved:', selectedNote.value)
  } catch (err) {
    console.error('Failed to save note:', err)
    showNotification('error', 'Failed to save note')
  }
}

function confirmDeleteNote() {
  showDeleteConfirm.value = true
}

async function deleteNote() {
  if (!selectedNote.value) return

  try {
    // Simulate API call - replace with actual API service
    await NotesApiService.deleteNote(selectedNote.value.id)
    // await new Promise(resolve => setTimeout(resolve, 300))

    // Remove from list
    notes.value = notes.value.filter(n => n.id !== selectedNote.value!.id)

    // Update shared data
    dataSharing.updateNotesData(notes.value)

    // Clear selection
    selectedNote.value = null
    isModified.value = false
    showDeleteConfirm.value = false

    showNotification('success', 'Note deleted successfully')

    console.log('Note deleted')
  } catch (err) {
    console.error('Failed to delete note:', err)
    showNotification('error', 'Failed to delete note')
  }
}

function toggleFavorite() {
  if (!selectedNote.value) return

  selectedNote.value.is_favorite = !selectedNote.value.is_favorite
  markAsModified()
}

function addTag() {
  if (!selectedNote.value || !newTag.value.trim()) return

  const tag = newTag.value.trim().toLowerCase()
  if (!selectedNote.value.tags.includes(tag)) {
    selectedNote.value.tags.push(tag)
    markAsModified()
  }

  newTag.value = ''
}

function addExistingTag(tag: string) {
  if (!selectedNote.value) return

  if (!selectedNote.value.tags.includes(tag)) {
    selectedNote.value.tags.push(tag)
    markAsModified()
  }
}

function removeTag(tag: string) {
  if (!selectedNote.value) return

  selectedNote.value.tags = selectedNote.value.tags.filter(t => t !== tag)
  markAsModified()
}

function performSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  const query = searchQuery.value.toLowerCase()
  searchResults.value = notes.value.filter(note =>
    (note.title?.toLowerCase().includes(query)) ||
    (note.content?.toLowerCase().includes(query)) ||
    (note.tags?.some(tag => tag.toLowerCase().includes(query)))
  )
}

function selectNoteFromSearch(note: Note) {
  selectNote(note)
  showSearchModal.value = false
  searchQuery.value = ''
  searchResults.value = []
}

// Utility functions
function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

function formatDate(date: Date): string {
  const now = new Date()
  const diffTime = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return new Date(date).toLocaleDateString()
  }
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString()
}

function getPreviewText(content: string): string {
  if (!content) return 'No content'
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

function getWordCount(content: string): number {
  if (!content) return 0
  return content.trim().split(/\s+/).filter(word => word.length > 0).length
}

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}
</script>

<style scoped>
.notes-workspace {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* Header */
.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.header-left {
  flex: 1;
}

.workspace-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.workspace-description {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Loading and Error States */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.notes-sidebar {
  width: 320px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.sidebar-controls {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.filter-section,
.sort-section {
  margin-bottom: 12px;
}

.filter-section:last-child,
.sort-section:last-child {
  margin-bottom: 0;
}

.filter-label,
.sort-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-select,
.sort-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: #ffffff;
}

/* Notes List */
.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.note-item {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.note-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.note-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.note-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.note-meta {
  font-size: 11px;
  color: #6b7280;
  margin-left: 8px;
}

.note-preview {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.note-tag {
  background: #e0e7ff;
  color: #3730a3;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

/* Editor */
.notes-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.no-selection-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
}

.note-title-input {
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: #1a1a1a;
  margin-right: 16px;
}

.note-title-input:focus {
  outline: none;
}

.note-title-input::placeholder {
  color: #9ca3af;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  flex: 1;
  padding: 24px;
}

.note-content-editor {
  width: 100%;
  height: 100%;
  border: none;
  resize: none;
  font-size: 16px;
  line-height: 1.6;
  color: #1a1a1a;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.note-content-editor:focus {
  outline: none;
}

.note-content-editor::placeholder {
  color: #9ca3af;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f8f9fa;
  font-size: 12px;
  color: #6b7280;
}

.editor-info {
  display: flex;
  gap: 16px;
}

.modification-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f59e0b;
}

.modified-dot {
  color: #f59e0b;
}

/* Buttons */
.btn-primary {
  background: #3b82f6;
  color: #ffffff;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  border-color: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-secondary:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-icon {
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #f9fafb;
}

.btn-icon.active {
  background: #fef3c7;
  border-color: #f59e0b;
}

/* Modals */
.modal-overlay {
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

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 20px 24px 24px 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Search Modal */
.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
}

.no-results {
  text-align: center;
  color: #6b7280;
  padding: 24px;
}

.search-result {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.search-result h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.search-result p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.search-meta {
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  gap: 12px;
}

/* Tags Modal */
.current-tags,
.add-tag,
.available-tags {
  margin-bottom: 20px;
}

.current-tags label,
.available-tags label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  background: #e0e7ff;
  color: #3730a3;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-remove {
  background: none;
  border: none;
  color: #3730a3;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.tag-remove:hover {
  background: rgba(55, 48, 163, 0.2);
}

.add-tag {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.tag-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.tag-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.tag-suggestion {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-suggestion:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.warning-text {
  color: #ef4444;
  font-size: 14px;
  margin: 8px 0;
}

/* Notifications */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1001;
  font-size: 14px;
  font-weight: 500;
}

.notification.success {
  background: #10b981;
  color: #ffffff;
}

.notification.error {
  background: #ef4444;
  color: #ffffff;
}

.notification-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.8;
}

.notification-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive Design */
@media (max-width: 768px) {
  .workspace-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .main-content {
    flex-direction: column;
  }

  .notes-sidebar {
    width: 100%;
    height: 300px;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .notes-editor {
    flex: 1;
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }
}
</style>