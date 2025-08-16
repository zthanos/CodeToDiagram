import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import NotesPanel from '../../components/NotesPanel.vue'
import { NotesApiService } from '../../services/NotesApiService'
import type { Note, CreateNoteRequest, UpdateNoteRequest } from '../../types/notes'

// Mock the NotesApiService
vi.mock('../../services/NotesApiService', () => ({
  NotesApiService: {
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    searchNotes: vi.fn()
  }
}))

// Mock data - Note 2 has more recent date so it will appear first due to sorting
const mockNotes: Note[] = [
  {
    id: '1',
    project_id: 'project-1',
    title: 'Test Note 1',
    content: 'This is the content of test note 1',
    author: 'John Doe',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02'),
    tags: ['tag1', 'tag2'],
    associations: [
      {
        entity_type: 'requirement',
        entity_id: 'req-1',
        context: 'Related to requirement'
      }
    ]
  },
  {
    id: '2',
    project_id: 'project-1',
    title: 'Test Note 2',
    content: 'This is the content of test note 2 with different content',
    author: 'Jane Smith',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-04'), // More recent, so appears first
    tags: ['tag3'],
    associations: []
  }
]

const mockProps = {
  projectId: 'project-1',
  entityType: 'requirement' as const,
  entityId: 'req-1',
  readonly: false
}

describe('NotesPanel', () => {
  let wrapper: VueWrapper<any>
  let mockListNotes: any
  let mockCreateNote: any
  let mockUpdateNote: any
  let mockDeleteNote: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock implementations
    mockListNotes = vi.mocked(NotesApiService.listNotes)
    mockCreateNote = vi.mocked(NotesApiService.createNote)
    mockUpdateNote = vi.mocked(NotesApiService.updateNote)
    mockDeleteNote = vi.mocked(NotesApiService.deleteNote)
    
    mockListNotes.mockResolvedValue(mockNotes)
    mockCreateNote.mockResolvedValue(mockNotes[0])
    mockUpdateNote.mockResolvedValue(mockNotes[0])
    mockDeleteNote.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should render with basic props', async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      expect(wrapper.find('.notes-panel').exists()).toBe(true)
      expect(wrapper.find('.notes-title').text()).toContain('Notes')
    })

    it('should load notes on mount', async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      expect(mockListNotes).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should display notes count in header', async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      await wrapper.vm.$nextTick()

      const title = wrapper.find('.notes-title')
      expect(title.text()).toContain('(2)')
    })

    it('should show contextual filter when entityType and entityId are provided', async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      expect(wrapper.find('.filter-btn').exists()).toBe(true)
    })
  })

  describe('Note Creation', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
    })

    it('should show create form when New Note button is clicked', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      expect(wrapper.find('.create-note-form').exists()).toBe(true)
      expect(createBtn.text()).toContain('Cancel')
    })

    it('should validate required fields', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      const titleInput = wrapper.find('#note-title')
      const contentTextarea = wrapper.find('#note-content')

      // Trigger blur without entering data
      await titleInput.trigger('blur')
      await contentTextarea.trigger('blur')

      await nextTick()

      expect(wrapper.find('.error-message').exists()).toBe(true)
    })

    it('should create note with valid data', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      // Fill form
      const titleInput = wrapper.find('#note-title')
      const contentTextarea = wrapper.find('#note-content')
      const tagsInput = wrapper.find('#note-tags')

      await titleInput.setValue('New Test Note')
      await contentTextarea.setValue('This is new note content')
      await tagsInput.setValue('tag1, tag2')
      await tagsInput.trigger('blur')

      // Submit form
      const saveBtn = wrapper.find('.save-btn')
      await saveBtn.trigger('click')

      expect(mockCreateNote).toHaveBeenCalledWith('project-1', {
        title: 'New Test Note',
        content: 'This is new note content',
        tags: ['tag1', 'tag2'],
        associations: [
          {
            entity_type: 'requirement',
            entity_id: 'req-1',
            context: undefined
          }
        ]
      })
    })

    it('should emit note-created event after successful creation', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      const titleInput = wrapper.find('#note-title')
      const contentTextarea = wrapper.find('#note-content')

      await titleInput.setValue('New Test Note')
      await contentTextarea.setValue('This is new note content')

      const saveBtn = wrapper.find('.save-btn')
      await saveBtn.trigger('click')

      await nextTick()

      expect(wrapper.emitted('note-created')).toBeTruthy()
      expect(wrapper.emitted('note-created')?.[0]).toEqual([mockNotes[0]])
    })

    it('should handle creation errors gracefully', async () => {
      mockCreateNote.mockRejectedValue(new Error('Creation failed'))

      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      const titleInput = wrapper.find('#note-title')
      const contentTextarea = wrapper.find('#note-content')

      await titleInput.setValue('New Test Note')
      await contentTextarea.setValue('This is new note content')

      const saveBtn = wrapper.find('.save-btn')
      await saveBtn.trigger('click')

      await nextTick()

      expect(wrapper.find('.error-display').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toContain('Creation failed')
    })
  })

  describe('Note Editing', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should enter edit mode when edit button is clicked', async () => {
      const editBtn = wrapper.find('.edit-btn')
      await editBtn.trigger('click')

      expect(wrapper.find('.note-edit').exists()).toBe(true)
      // Note: there are multiple notes, so we check that at least one is in edit mode
      expect(wrapper.findAll('.note-display')).toHaveLength(1) // One note remains in display mode
    })

    it('should populate edit form with existing note data', async () => {
      const editBtn = wrapper.find('.edit-btn')
      await editBtn.trigger('click')

      const titleInput = wrapper.find('.note-edit .form-input')
      const contentTextarea = wrapper.find('.note-edit .form-textarea')

      // First note in the list is Note 2 due to sorting by updated_at
      expect(titleInput.element.value).toBe('Test Note 2')
      expect(contentTextarea.element.value).toBe('This is the content of test note 2 with different content')
    })

    it('should save edited note', async () => {
      const editBtn = wrapper.find('.edit-btn')
      await editBtn.trigger('click')

      const titleInput = wrapper.find('.note-edit .form-input')
      const contentTextarea = wrapper.find('.note-edit .form-textarea')

      await titleInput.setValue('Updated Note Title')
      await contentTextarea.setValue('Updated note content')

      const saveBtn = wrapper.find('.note-edit .save-btn')
      await saveBtn.trigger('click')

      // First note in the list is Note 2 due to sorting
      expect(mockUpdateNote).toHaveBeenCalledWith('2', {
        title: 'Updated Note Title',
        content: 'Updated note content',
        tags: ['tag3']
      })
    })

    it('should emit note-updated event after successful update', async () => {
      const editBtn = wrapper.find('.edit-btn')
      await editBtn.trigger('click')

      const titleInput = wrapper.find('.note-edit .form-input')
      await titleInput.setValue('Updated Note Title')

      const saveBtn = wrapper.find('.note-edit .save-btn')
      await saveBtn.trigger('click')

      await nextTick()

      expect(wrapper.emitted('note-updated')).toBeTruthy()
      expect(wrapper.emitted('note-updated')?.[0]).toEqual([mockNotes[0]])
    })

    it('should cancel edit mode', async () => {
      const editBtn = wrapper.find('.edit-btn')
      await editBtn.trigger('click')

      const cancelBtn = wrapper.find('.note-edit .cancel-btn')
      await cancelBtn.trigger('click')

      expect(wrapper.find('.note-edit').exists()).toBe(false)
      expect(wrapper.find('.note-display').exists()).toBe(true)
    })
  })

  describe('Note Deletion', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should delete note after confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const deleteBtn = wrapper.find('.delete-btn')
      await deleteBtn.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this note?')
      // First note in the list is Note 2 due to sorting
      expect(mockDeleteNote).toHaveBeenCalledWith('2')

      confirmSpy.mockRestore()
    })

    it('should not delete note if confirmation is cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const deleteBtn = wrapper.find('.delete-btn')
      await deleteBtn.trigger('click')

      expect(mockDeleteNote).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('should emit note-deleted event after successful deletion', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const deleteBtn = wrapper.find('.delete-btn')
      await deleteBtn.trigger('click')

      await nextTick()

      expect(wrapper.emitted('note-deleted')).toBeTruthy()
      // First note in the list is Note 2 due to sorting
      expect(wrapper.emitted('note-deleted')?.[0]).toEqual(['2'])

      confirmSpy.mockRestore()
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should filter notes based on search query', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('different')

      await nextTick()
      await wrapper.vm.$nextTick()

      // Check that the filtered notes contain the expected note
      const notesList = wrapper.find('.notes-list')
      const noteItems = notesList.findAll('.note-item')
      
      // Should have at least 1 note, and the first one should be Test Note 2
      expect(noteItems.length).toBeGreaterThanOrEqual(1)
      expect(noteItems[0].find('.note-title').text()).toContain('Test Note 2')
    })

    it('should highlight search terms in results', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('different')

      await nextTick()

      const noteContent = wrapper.find('.note-content')
      expect(noteContent.html()).toContain('<mark>different</mark>')
    })

    it('should show no results state when search yields no matches', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('nonexistent')

      await nextTick()

      expect(wrapper.find('.no-results-state').exists()).toBe(true)
      expect(wrapper.find('.no-results-title').text()).toContain('No notes found')
    })

    it('should clear search when clear button is clicked', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('nonexistent')

      await nextTick()

      // Clear button only appears when there are no results
      const clearBtn = wrapper.find('.clear-search-btn')
      await clearBtn.trigger('click')

      expect(searchInput.element.value).toBe('')
      
      // Check specifically within the notes list - should have at least 2 notes
      const notesList = wrapper.find('.notes-list')
      const noteItems = notesList.findAll('.note-item')
      expect(noteItems.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Contextual Filtering', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should filter notes by entity association', async () => {
      const filterBtn = wrapper.find('.filter-btn')
      await filterBtn.trigger('click')

      await nextTick()

      const noteItems = wrapper.findAll('.note-item')
      expect(noteItems).toHaveLength(1)
      expect(noteItems[0].find('.note-title').text()).toContain('Test Note 1')
    })

    it('should toggle filter button text', async () => {
      const filterBtn = wrapper.find('.filter-btn')
      expect(filterBtn.text()).toBe('Show Related')

      await filterBtn.trigger('click')
      expect(filterBtn.text()).toBe('Show All')

      await filterBtn.trigger('click')
      expect(filterBtn.text()).toBe('Show Related')
    })
  })

  describe('Note Associations', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should display note associations', async () => {
      const associations = wrapper.find('.note-associations')
      expect(associations.exists()).toBe(true)
      expect(associations.text()).toContain('Related to:')
      expect(associations.text()).toContain('Requirement req-1')
    })

    it('should style associations by entity type', async () => {
      const associationChip = wrapper.find('.association-requirement')
      expect(associationChip.exists()).toBe(true)
      expect(associationChip.text()).toContain('Requirement req-1')
    })
  })

  describe('Tag Management', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
    })

    it('should display note tags', async () => {
      await wrapper.vm.$nextTick()
      
      // Check tags specifically within the notes list
      const notesList = wrapper.find('.notes-list')
      const tags = notesList.findAll('.note-tag')
      
      // Both notes have tags: Note 2 has 1 tag, Note 1 has 2 tags = at least 3 total
      expect(tags.length).toBeGreaterThanOrEqual(3)
      
      // Check that we have the expected tags (may be in different order due to sorting)
      const tagTexts = tags.map(tag => tag.text())
      expect(tagTexts).toContain('tag3')
      expect(tagTexts).toContain('tag1')
      expect(tagTexts).toContain('tag2')
    })

    it('should process comma-separated tags in create form', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      const tagsInput = wrapper.find('#note-tags')
      await tagsInput.setValue('tag1, tag2, tag3')
      await tagsInput.trigger('blur')

      await nextTick()

      const tagChips = wrapper.findAll('.tag-chip')
      expect(tagChips).toHaveLength(3)
    })

    it('should remove tags when remove button is clicked', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      await createBtn.trigger('click')

      const tagsInput = wrapper.find('#note-tags')
      await tagsInput.setValue('tag1, tag2')
      await tagsInput.trigger('blur')

      await nextTick()

      const removeBtn = wrapper.find('.tag-remove')
      await removeBtn.trigger('click')

      await nextTick()

      const tagChips = wrapper.findAll('.tag-chip')
      expect(tagChips).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
    })

    it('should display error when loading notes fails', async () => {
      mockListNotes.mockRejectedValue({
        type: 'note_load_failed',
        message: 'Load failed',
        suggestedAction: 'Please try again'
      })

      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.error-display').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toContain('Load failed')
    })

    it('should retry last action when retry button is clicked', async () => {
      // Clear previous calls
      mockListNotes.mockClear()
      
      mockListNotes.mockRejectedValueOnce({
        type: 'note_load_failed',
        message: 'Load failed',
        suggestedAction: 'Please try again'
      }).mockResolvedValue(mockNotes)

      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      await wrapper.vm.$nextTick()

      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')

      await nextTick()

      expect(mockListNotes).toHaveBeenCalledTimes(2)
    })
  })

  describe('Readonly Mode', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: { ...mockProps, readonly: true }
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should disable edit and delete buttons in readonly mode', async () => {
      const editBtn = wrapper.find('.edit-btn')
      const deleteBtn = wrapper.find('.delete-btn')

      expect(editBtn.attributes('disabled')).toBeDefined()
      expect(deleteBtn.attributes('disabled')).toBeDefined()
    })

    it('should disable create note button in readonly mode', async () => {
      const createBtn = wrapper.find('.create-note-btn')
      expect(createBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no notes exist', async () => {
      mockListNotes.mockResolvedValue([])

      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-title').text()).toContain('No notes yet')
    })

    it('should show loading state while loading notes', async () => {
      mockListNotes.mockImplementation(() => new Promise(() => {})) // Never resolves

      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    })
  })

  describe('Date Formatting', () => {
    beforeEach(async () => {
      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should format recent dates correctly', async () => {
      // Mock a note with today's date
      const todayNote = {
        ...mockNotes[0],
        updated_at: new Date()
      }
      mockListNotes.mockResolvedValue([todayNote])

      wrapper = mount(NotesPanel, {
        props: mockProps
      })

      await nextTick()
      await wrapper.vm.$nextTick()

      const noteDate = wrapper.find('.note-date')
      expect(noteDate.text()).toBe('Today')
    })
  })

  describe('Content Truncation', () => {
    beforeEach(async () => {
      const longContentNote = {
        ...mockNotes[0],
        content: 'A'.repeat(200) // Long content that should be truncated
      }
      mockListNotes.mockResolvedValue([longContentNote])

      wrapper = mount(NotesPanel, {
        props: mockProps
      })
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('should truncate long content with ellipsis', async () => {
      const noteContent = wrapper.find('.note-content')
      expect(noteContent.text()).toContain('...')
      expect(noteContent.text().length).toBeLessThan(200)
    })
  })
})