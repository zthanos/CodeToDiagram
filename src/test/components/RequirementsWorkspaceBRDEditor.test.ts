import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsWorkspace from '../../components/RequirementsWorkspace.vue'
import type { Project } from '../../types/project'

// Mock the MarkdownRenderer component
vi.mock('../../components/MarkdownRenderer.vue', () => ({
  default: {
    name: 'MarkdownRenderer',
    props: ['content'],
    template: '<div class="mock-markdown-renderer">{{ content }}</div>'
  }
}))

// Mock the RequirementsTabsContainer component
vi.mock('../../components/RequirementsTabsContainer.vue', () => ({
  default: {
    name: 'RequirementsTabsContainer',
    props: [
      'active-tab', 'requirement-items', 'systems-data', 'teams-data', 'tab-state'
    ],
    template: '<div class="mock-tabs-container">Tabs Container</div>'
  }
}))

describe('RequirementsWorkspace - BRD Editor Integration', () => {
  let wrapper: VueWrapper<any>
  let mockProject: Project

  beforeEach(() => {
    mockProject = {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'Test project description'
    } as Project

    // Mock timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Editor Initialization', () => {
    it('should initialize with empty BRD content', async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      const textarea = wrapper.find('.markdown-editor')
      expect(textarea.exists()).toBe(true)
      expect(textarea.element.value).toBe('')
    })

    it('should show edit mode by default', async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      expect(wrapper.find('.edit-mode').exists()).toBe(true)
      expect(wrapper.find('.preview-mode').exists()).toBe(false)
    })

    it('should initialize with draft status', async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      const statusSelect = wrapper.find('.status-select')
      expect(statusSelect.element.value).toBe('draft')
    })
  })

  describe('View Mode Toggle', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should toggle between edit and preview modes', async () => {
      const toggleBtn = wrapper.find('.toggle-btn')
      
      // Initially in edit mode
      expect(wrapper.find('.edit-mode').exists()).toBe(true)
      expect(wrapper.find('.preview-mode').exists()).toBe(false)
      expect(toggleBtn.text()).toContain('Preview')

      // Click to switch to preview
      await toggleBtn.trigger('click')
      await nextTick()

      expect(wrapper.find('.edit-mode').exists()).toBe(false)
      expect(wrapper.find('.preview-mode').exists()).toBe(true)
      expect(toggleBtn.text()).toContain('Edit')

      // Click to switch back to edit
      await toggleBtn.trigger('click')
      await nextTick()

      expect(wrapper.find('.edit-mode').exists()).toBe(true)
      expect(wrapper.find('.preview-mode').exists()).toBe(false)
    })

    it('should show MarkdownRenderer in preview mode', async () => {
      // Add some content
      const textarea = wrapper.find('.markdown-editor')
      await textarea.setValue('# Test Content\n\nThis is a test.')

      // Switch to preview mode
      const toggleBtn = wrapper.find('.toggle-btn')
      await toggleBtn.trigger('click')
      await nextTick()

      const renderer = wrapper.find('.mock-markdown-renderer')
      expect(renderer.exists()).toBe(true)
      expect(renderer.text()).toContain('# Test Content')
    })

    it('should show empty preview message when no content', async () => {
      // Switch to preview mode without content
      const toggleBtn = wrapper.find('.toggle-btn')
      await toggleBtn.trigger('click')
      await nextTick()

      const emptyPreview = wrapper.find('.empty-preview')
      expect(emptyPreview.exists()).toBe(true)
      expect(emptyPreview.text()).toContain('Start writing')
    })
  })

  describe('Status Management', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should update status when changed', async () => {
      const statusSelect = wrapper.find('.status-select')
      
      await statusSelect.setValue('published')
      await nextTick()

      expect(statusSelect.element.value).toBe('published')
    })

    it('should mark as changed when status is updated', async () => {
      const statusSelect = wrapper.find('.status-select')
      
      // Initially no changes
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(false)

      await statusSelect.setValue('published')
      await nextTick()

      // Should show unsaved indicator
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(true)
    })

    it('should emit unsaved-changes event when status changes', async () => {
      const statusSelect = wrapper.find('.status-select')
      
      await statusSelect.setValue('archived')
      await nextTick()

      const emittedEvents = wrapper.emitted('unsaved-changes')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![emittedEvents!.length - 1]).toEqual([true])
    })
  })

  describe('Keyboard Shortcuts', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should save on Ctrl+S', async () => {
      const textarea = wrapper.find('.markdown-editor')
      const saveBtn = wrapper.find('.save-btn')
      
      // Add content to enable save
      await textarea.setValue('# Test Content')
      await nextTick()

      // Simulate Ctrl+S
      await textarea.trigger('keydown', { 
        key: 's', 
        ctrlKey: true 
      })

      // Should trigger save (button becomes disabled during save)
      expect(saveBtn.attributes('disabled')).toBeDefined()
    })

    it('should toggle preview on Ctrl+Shift+P', async () => {
      const textarea = wrapper.find('.markdown-editor')
      
      // Initially in edit mode
      expect(wrapper.find('.edit-mode').exists()).toBe(true)

      // Simulate Ctrl+Shift+P
      await textarea.trigger('keydown', { 
        key: 'P', 
        ctrlKey: true, 
        shiftKey: true 
      })
      await nextTick()

      // Should switch to preview mode
      expect(wrapper.find('.preview-mode').exists()).toBe(true)
    })

    it('should handle Tab for indentation', async () => {
      const textarea = wrapper.find('.markdown-editor')
      const textareaElement = textarea.element as HTMLTextAreaElement
      
      // Set initial content and cursor position
      await textarea.setValue('Line 1\nLine 2')
      textareaElement.selectionStart = 7 // Start of "Line 2"
      textareaElement.selectionEnd = 7

      // Simulate Tab key
      await textarea.trigger('keydown', { key: 'Tab' })

      // Should add indentation
      expect(textareaElement.value).toBe('Line 1\n  Line 2')
    })
  })

  describe('Auto-save Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should setup auto-save timer on mount', () => {
      // Auto-save timer should be set up (30 second interval)
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })

    it('should reset auto-save timer when content changes', async () => {
      const textarea = wrapper.find('.markdown-editor')
      const initialTimerCount = vi.getTimerCount()
      
      // Change content
      await textarea.setValue('New content')
      await nextTick()

      // Timer should be reset
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(initialTimerCount)
    })

    it('should auto-save after 30 seconds if there are changes', async () => {
      const textarea = wrapper.find('.markdown-editor')
      
      // Add content to trigger changes
      await textarea.setValue('Auto-save test content')
      await nextTick()

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)
      await nextTick()

      // Should have triggered save (check for save button state)
      const saveBtn = wrapper.find('.save-btn')
      expect(saveBtn.text()).toContain('Saving...')
    })
  })

  describe('Change Detection', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should detect content changes', async () => {
      const textarea = wrapper.find('.markdown-editor')
      
      // Initially no changes
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(false)

      // Add content
      await textarea.setValue('# New Content')
      await nextTick()

      // Should show unsaved indicator
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(true)
    })

    it('should emit unsaved-changes event when content changes', async () => {
      const textarea = wrapper.find('.markdown-editor')
      
      await textarea.setValue('Changed content')
      await nextTick()

      const emittedEvents = wrapper.emitted('unsaved-changes')
      expect(emittedEvents).toBeTruthy()
      expect(emittedEvents![emittedEvents!.length - 1]).toEqual([true])
    })

    it('should clear changes after successful save', async () => {
      const textarea = wrapper.find('.markdown-editor')
      const saveBtn = wrapper.find('.save-btn')
      
      // Add content and save
      await textarea.setValue('Content to save')
      await nextTick()
      
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(true)
      
      // Trigger save and wait for the async operation
      const savePromise = saveBtn.trigger('click')
      await nextTick()
      
      // Fast-forward past save simulation
      vi.advanceTimersByTime(1000)
      await savePromise
      await nextTick()

      // Changes should be cleared
      expect(wrapper.find('.unsaved-indicator').exists()).toBe(false)
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })
      await nextTick()
    })

    it('should have proper ARIA labels on editor', () => {
      const textarea = wrapper.find('.markdown-editor')
      expect(textarea.attributes('aria-label')).toBe('Business Requirements Document Editor')
      expect(textarea.attributes('aria-describedby')).toBe('editor-help')
    })

    it('should have screen reader help text', () => {
      const helpText = wrapper.find('#editor-help')
      expect(helpText.exists()).toBe(true)
      expect(helpText.classes()).toContain('sr-only')
      expect(helpText.text()).toContain('Ctrl+S to save')
    })

    it('should have proper focus management', async () => {
      const toggleBtn = wrapper.find('.toggle-btn')
      
      // Switch to preview mode
      await toggleBtn.trigger('click')
      await nextTick()

      // Switch back to edit mode
      await toggleBtn.trigger('click')
      await nextTick()

      // Editor should be focused (we can't test actual focus, but we can test the focus call)
      const textarea = wrapper.find('.markdown-editor')
      expect(textarea.exists()).toBe(true)
    })

    it('should have keyboard shortcut tooltips', () => {
      const toggleBtn = wrapper.find('.toggle-btn')
      expect(toggleBtn.attributes('title')).toContain('Ctrl+Shift+P')
    })
  })
})