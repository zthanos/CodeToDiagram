import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectWorkspace from '../components/ProjectWorkspace.vue'

// Mock MermaidRenderer component
vi.mock('../components/MermaidRenderer.vue', () => ({
  default: {
    name: 'MermaidRenderer',
    template: '<div class="mocked-mermaid-renderer"></div>',
    props: ['theme', 'initial-content'],
    emits: ['update:theme', 'content-changed'],
    methods: {
      recalculateEditorHeight: vi.fn()
    }
  }
}))

describe('ProjectWorkspace - Pane Splitter Functionality', () => {
  let wrapper
  let mockLocalStorage

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    })

    // Mock DOM methods
    const mockClassList = {
      add: vi.fn(),
      remove: vi.fn()
    }
    Object.defineProperty(document.body, 'classList', {
      value: mockClassList,
      writable: true
    })

    wrapper = mount(ProjectWorkspace, {
      props: {
        theme: 'default'
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  describe('Splitter Drag Functionality', () => {
    it('should start splitter drag when mousedown on splitter', async () => {
      const splitter = wrapper.find('.pane-splitter')
      expect(splitter.exists()).toBe(true)

      const mousedownEvent = new MouseEvent('mousedown', {
        clientX: 300,
        bubbles: true
      })

      await splitter.trigger('mousedown', { clientX: 300 })

      expect(wrapper.vm.splitterDragging).toBe(true)
      expect(wrapper.vm.splitterStartX).toBe(300)
      expect(wrapper.vm.splitterStartWidth).toBe(wrapper.vm.navigationWidth)
    })

    it('should not start drag when navigation is collapsed', async () => {
      wrapper.vm.navigationCollapsed = true
      await wrapper.vm.$nextTick()

      const splitter = wrapper.find('.pane-splitter')
      await splitter.trigger('mousedown', { clientX: 300 })

      expect(wrapper.vm.splitterDragging).toBe(false)
    })

    it('should prevent multiple drag operations', async () => {
      wrapper.vm.splitterDragging = true
      
      const splitter = wrapper.find('.pane-splitter')
      await splitter.trigger('mousedown', { clientX: 300 })

      // Should not change the start values if already dragging
      expect(wrapper.vm.splitterStartX).toBe(0) // Initial value
    })
  })

  describe('Splitter Constraints', () => {
    it('should respect minimum width constraints', () => {
      const minWidth = wrapper.vm.getMinNavigationWidth()
      expect(minWidth).toBeGreaterThan(0)
      
      // Test different screen sizes
      window.innerWidth = 500 // Mobile
      expect(wrapper.vm.getMinNavigationWidth()).toBe(180)
      
      window.innerWidth = 800 // Tablet
      expect(wrapper.vm.getMinNavigationWidth()).toBe(200)
      
      window.innerWidth = 1200 // Desktop
      expect(wrapper.vm.getMinNavigationWidth()).toBe(220)
    })

    it('should respect maximum width constraints', () => {
      const containerWidth = 1000
      const maxWidth = wrapper.vm.getMaxNavigationWidth(containerWidth)
      
      expect(maxWidth).toBeLessThanOrEqual(containerWidth * 0.6)
      expect(maxWidth).toBeGreaterThan(0)
    })

    it('should apply snap zones near constraints', async () => {
      wrapper.vm.splitterDragging = true
      wrapper.vm.splitterStartX = 300
      wrapper.vm.splitterStartWidth = 300

      // Mock container width
      wrapper.vm.$el = {
        offsetWidth: 1000,
        style: { setProperty: vi.fn() },
        querySelector: vi.fn(() => ({ classList: { add: vi.fn(), remove: vi.fn() } }))
      }

      // Test snap to minimum
      const minWidth = wrapper.vm.getMinNavigationWidth()
      const mockEvent = { clientX: 300 - (300 - minWidth + 10), preventDefault: vi.fn() }
      
      wrapper.vm.handleSplitterDrag(mockEvent)
      
      expect(wrapper.vm.navigationWidth).toBe(minWidth)
    })
  })

  describe('Splitter State Persistence', () => {
    it('should persist workspace state after drag', async () => {
      wrapper.vm.navigationWidth = 350
      wrapper.vm.persistWorkspaceState()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'projectWorkspaceState',
        expect.stringContaining('"navigationWidth":350')
      )
    })

    it('should restore workspace state on initialization', () => {
      const mockState = {
        navigationWidth: 400,
        navigationCollapsed: false,
        lastSaved: new Date().toISOString()
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockState))
      
      wrapper.vm.restoreWorkspaceState()
      
      expect(wrapper.vm.navigationWidth).toBe(400)
    })

    it('should validate restored state values', () => {
      const invalidState = {
        navigationWidth: 50, // Too small
        navigationCollapsed: 'invalid', // Wrong type
        lastSaved: new Date().toISOString()
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidState))
      
      const originalWidth = wrapper.vm.navigationWidth
      wrapper.vm.restoreWorkspaceState()
      
      // Should not apply invalid width
      expect(wrapper.vm.navigationWidth).toBe(originalWidth)
    })
  })

  describe('Splitter Edge Cases', () => {
    it('should handle escape key during drag', async () => {
      wrapper.vm.splitterDragging = true
      wrapper.vm.splitterStartWidth = 300
      wrapper.vm.navigationWidth = 400

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      escapeEvent.preventDefault = vi.fn()

      wrapper.vm.handleSplitterKeydown(escapeEvent)

      expect(wrapper.vm.navigationWidth).toBe(300) // Restored to start width
      expect(wrapper.vm.splitterDragging).toBe(false)
      expect(escapeEvent.preventDefault).toHaveBeenCalled()
    })

    it('should handle drag without valid container', () => {
      wrapper.vm.splitterDragging = true
      wrapper.vm.splitterStartX = 300
      wrapper.vm.splitterStartWidth = 300
      wrapper.vm.$el = null // No container

      const mockEvent = { clientX: 350, preventDefault: vi.fn() }
      
      // Should not throw error
      expect(() => wrapper.vm.handleSplitterDrag(mockEvent)).not.toThrow()
    })

    it('should cleanup event listeners on component unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Should not throw error
      expect(() => wrapper.vm.persistWorkspaceState()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist workspace state:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Splitter Visual Feedback', () => {
    it('should add visual feedback classes during drag', async () => {
      const mockClassListAdd = vi.fn()
      const mockClassListRemove = vi.fn()
      
      wrapper.vm.$el = {
        offsetWidth: 1000,
        style: { setProperty: vi.fn() },
        querySelector: vi.fn(() => ({ classList: { add: mockClassListAdd, remove: mockClassListRemove } }))
      }

      // Mock the startSplitterDrag method to verify it calls the right methods
      const originalMethod = wrapper.vm.startSplitterDrag
      wrapper.vm.startSplitterDrag = vi.fn().mockImplementation((event) => {
        originalMethod.call(wrapper.vm, event)
      })

      const splitter = wrapper.find('.pane-splitter')
      await splitter.trigger('mousedown', { clientX: 300 })

      expect(document.body.classList.add).toHaveBeenCalledWith('splitter-dragging')
    })

    it('should remove visual feedback classes after drag', () => {
      wrapper.vm.splitterDragging = true
      wrapper.vm.$el = {
        querySelector: vi.fn(() => ({ classList: { add: vi.fn(), remove: vi.fn() } }))
      }

      wrapper.vm.stopSplitterDrag()

      expect(document.body.classList.remove).toHaveBeenCalledWith('splitter-dragging')
    })

    it('should update CSS custom properties during drag', () => {
      const mockSetProperty = vi.fn()
      wrapper.vm.$el = {
        offsetWidth: 1000,
        style: { setProperty: mockSetProperty },
        querySelector: vi.fn(() => ({ classList: { add: vi.fn(), remove: vi.fn() } }))
      }

      wrapper.vm.splitterDragging = true
      wrapper.vm.splitterStartX = 300
      wrapper.vm.splitterStartWidth = 300
      wrapper.vm.navigationWidth = 300

      const mockEvent = { clientX: 350, preventDefault: vi.fn() }
      wrapper.vm.handleSplitterDrag(mockEvent)

      // The width should change from 300 to something around 350
      expect(wrapper.vm.navigationWidth).not.toBe(300)
      expect(mockSetProperty).toHaveBeenCalledWith('--nav-width', expect.stringMatching(/\d+px/))
    })
  })

  describe('Splitter Performance', () => {
    it('should debounce editor resize during drag', () => {
      vi.useFakeTimers()
      
      const resizeSpy = vi.spyOn(wrapper.vm, 'resizeActiveEditor')
      
      // Call debounced resize multiple times
      wrapper.vm.debouncedResizeActiveEditor()
      wrapper.vm.debouncedResizeActiveEditor()
      wrapper.vm.debouncedResizeActiveEditor()

      // Should not call resize immediately
      expect(resizeSpy).not.toHaveBeenCalled()

      // Fast forward timers
      vi.advanceTimersByTime(20)

      // Should call resize only once after debounce
      expect(resizeSpy).toHaveBeenCalledTimes(1)
      
      vi.useRealTimers()
    })

    it('should only update width when change is significant', () => {
      const mockSetProperty = vi.fn()
      wrapper.vm.$el = {
        offsetWidth: 1000,
        style: { setProperty: mockSetProperty },
        querySelector: vi.fn(() => ({ classList: { add: vi.fn(), remove: vi.fn() } }))
      }

      wrapper.vm.splitterDragging = true
      wrapper.vm.splitterStartX = 300
      wrapper.vm.splitterStartWidth = 300
      wrapper.vm.navigationWidth = 300

      // Small change (less than 1px) - should not trigger update
      const smallChangeEvent = { clientX: 300.5, preventDefault: vi.fn() }
      wrapper.vm.handleSplitterDrag(smallChangeEvent)

      const callCountAfterSmallChange = mockSetProperty.mock.calls.length

      // Significant change (more than 1px difference) - should trigger update
      const significantChangeEvent = { clientX: 310, preventDefault: vi.fn() }
      wrapper.vm.handleSplitterDrag(significantChangeEvent)

      // Should have more calls after significant change
      expect(mockSetProperty.mock.calls.length).toBeGreaterThan(callCountAfterSmallChange)
    })
  })

  describe('Splitter Integration with Navigation Toggle', () => {
    it('should update splitter width when navigation is toggled', async () => {
      const mockSetProperty = vi.fn()
      wrapper.vm.$el = { style: { setProperty: mockSetProperty } }

      wrapper.vm.toggleNavigation()

      expect(mockSetProperty).toHaveBeenCalledWith('--splitter-width', expect.any(String))
    })

    it('should trigger editor resize after navigation toggle', async () => {
      const resizeSpy = vi.spyOn(wrapper.vm, 'resizeActiveEditor')
      
      wrapper.vm.toggleNavigation()
      await wrapper.vm.$nextTick()

      expect(resizeSpy).toHaveBeenCalled()
    })
  })
})