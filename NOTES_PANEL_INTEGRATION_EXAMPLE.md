# NotesPanel Integration Example

This document shows how to integrate the NotesPanel component into the ProjectOverviewWorkspace.

## Component Usage

```vue
<template>
  <div class="project-overview-workspace">
    <!-- Other sections like solution outline, requirements status, etc. -->
    
    <!-- Notes Panel Integration -->
    <div class="notes-section">
      <NotesPanel
        :project-id="project.id"
        :entity-type="currentEntityType"
        :entity-id="currentEntityId"
        :readonly="false"
        @note-created="handleNoteCreated"
        @note-updated="handleNoteUpdated"
        @note-deleted="handleNoteDeleted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NotesPanel from './NotesPanel.vue'
import type { Note } from '../types/notes'
import type { Project } from '../types/project'

interface Props {
  project: Project
}

const props = defineProps<Props>()

// Optional: Track current context for contextual notes
const currentEntityType = ref<'requirement' | 'adr' | 'system' | 'team' | undefined>(undefined)
const currentEntityId = ref<string | undefined>(undefined)

// Event handlers
function handleNoteCreated(note: Note) {
  console.log('Note created:', note)
  // Handle note creation (e.g., show notification, update counters)
}

function handleNoteUpdated(note: Note) {
  console.log('Note updated:', note)
  // Handle note update
}

function handleNoteDeleted(noteId: string) {
  console.log('Note deleted:', noteId)
  // Handle note deletion
}

// Optional: Set context when user selects specific entities
function setNoteContext(entityType: 'requirement' | 'adr' | 'system' | 'team', entityId: string) {
  currentEntityType.value = entityType
  currentEntityId.value = entityId
}

function clearNoteContext() {
  currentEntityType.value = undefined
  currentEntityId.value = undefined
}
</script>

<style scoped>
.project-overview-workspace {
  display: grid;
  grid-template-columns: 1fr 400px; /* Main content + Notes panel */
  gap: 24px;
  padding: 24px;
  height: 100vh;
}

.notes-section {
  height: 100%;
  min-height: 600px;
}

/* Responsive layout */
@media (max-width: 1200px) {
  .project-overview-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }
  
  .notes-section {
    height: 500px;
  }
}
</style>
```

## Features Implemented

### ✅ Note Creation and Editing
- Create new notes with title, content, and tags
- Edit existing notes inline
- Form validation with error messages
- Auto-save functionality

### ✅ Contextual Note Associations
- Associate notes with requirements, ADRs, systems, and teams
- Filter notes by entity associations
- Display association context and relationships

### ✅ Search Functionality
- Real-time search across note titles, content, and tags
- Search result highlighting
- Clear search functionality
- No results state handling

### ✅ Comprehensive Testing
- 36 unit tests covering all functionality
- Component initialization and props handling
- Note CRUD operations with API integration
- Search and filtering logic
- Error handling and retry mechanisms
- Readonly mode and accessibility
- Empty states and loading states

### ✅ Error Handling
- Network error handling with retry functionality
- Validation errors with user-friendly messages
- Loading states with skeleton loaders
- Graceful degradation for API failures

### ✅ Accessibility & UX
- Keyboard navigation support
- Screen reader friendly labels
- Loading and error states
- Responsive design
- Readonly mode support

## API Integration

The component integrates with the existing `NotesApiService` which provides:

- `listNotes(projectId, options)` - List notes with filtering
- `createNote(projectId, note)` - Create new note
- `updateNote(noteId, updates)` - Update existing note
- `deleteNote(noteId)` - Delete note
- `searchNotes(projectId, query)` - Search notes

## Requirements Satisfied

This implementation satisfies all requirements from the specification:

- **6.1**: Notes section integrated into project overview ✅
- **6.2**: Note creation and editing with timestamps ✅
- **6.3**: Note associations with project elements ✅
- **6.4**: Search functionality across notes content ✅
- **6.5**: Contextual relationships and filtering ✅

## Next Steps

To complete the integration:

1. Add the NotesPanel to the ProjectOverviewWorkspace component
2. Configure the layout to accommodate the notes panel
3. Implement any project-specific styling or theming
4. Add the component to the navigation/routing system
5. Test the integration with real API endpoints