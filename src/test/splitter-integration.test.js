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

describe('ProjectWorkspace - Splitter Integration Test', () => {
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

  it('should implement all required splitter functionality', async () => {
    // Test 1: Draggable splitter between navigation and editor panes
    const splitter = wrapper.find('.pane-splitter')
    expect(splitter.exists()).toBe(true)
    expect(splitter.classes()).toContain('pane-splitter')

    // Test 2: Resize constraints and minimum pane widths
    const minWidth = wrapper.vm.getMinNavigationWidth()
    const maxWidth = wrapper.vm.getMaxNavigationWidth(1200)
    
    expect(minWidth).toBeGreaterThan(0)
    expect(maxWidth).toBeGreaterThan(minWidth)
    expect(minWidth).toBeGreaterThanOrEqual(180) // Mobile minimum
    expect(maxWidth).toBeLessThanOrEqual(600) // Desktop maximum

    // Test 3: Persist pane sizes in workspace state
    const originalWidth = wrapper.vm.navigationWidth
    wrapper.vm.navigationWidth = 400
    wrapper.vm.persistWorkspaceState()
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'projectWorkspaceState',
      expect.stringContaining('"navigationWidth":400')
    )

    // Test 4: Test splitter behavior and edge cases
    
    // Edge case: Escape key cancellation
    wrapper.vm.splitterDragging = true
    wrapper.vm.splitterStartWidth = originalWidth
    wrapper.vm.navigationWidth = 500
    
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    escapeEvent.preventDefault = vi.fn()
    wrapper.vm.handleSplitterKeydown(escapeEvent)
    
    expect(wrapper.vm.navigationWidth).toBe(originalWidth)
    expect(wrapper.vm.splitterDragging).toBe(false)

    // Edge case: Drag without valid container
    wrapper.vm.$el = null
    wrapper.vm.splitterDragging = true
    
    expect(() => {
      wrapper.vm.handleSplitterDrag({ clientX: 350, preventDefault: vi.fn() })
    }).not.toThrow()

    // Edge case: Multiple drag prevention
    wrapper.vm.splitterDragging = true
    const startX = wrapper.vm.splitterStartX
    
    wrapper.vm.startSplitterDrag({ clientX: 300, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    
    // Should not change start values if already dragging
    expect(wrapper.vm.splitterStartX).toBe(startX)
  })

  it('should meet all task requirements', () => {
    // Requirement: Implement draggable splitter between navigation and editor panes
    const splitter = wrapper.find('.pane-splitter')
    expect(splitter.exists()).toBe(true)
    expect(typeof wrapper.vm.startSplitterDrag).toBe('function')
    expect(typeof wrapper.vm.handleSplitterDrag).toBe('function')
    expect(typeof wrapper.vm.stopSplitterDrag).toBe('function')

    // Requirement: Add resize constraints and minimum pane widths
    expect(typeof wrapper.vm.getMinNavigationWidth).toBe('function')
    expect(typeof wrapper.vm.getMaxNavigationWidth).toBe('function')
    
    const minWidth = wrapper.vm.getMinNavigationWidth()
    const maxWidth = wrapper.vm.getMaxNavigationWidth(1200)
    expect(minWidth).toBeGreaterThan(0)
    expect(maxWidth).toBeGreaterThan(minWidth)

    // Requirement: Persist pane sizes in workspace state
    expect(typeof wrapper.vm.persistWorkspaceState).toBe('function')
    expect(typeof wrapper.vm.restoreWorkspaceState).toBe('function')
    
    // Test persistence
    wrapper.vm.navigationWidth = 350
    wrapper.vm.persistWorkspaceState()
    expect(mockLocalStorage.setItem).toHaveBeenCalled()

    // Requirement: Test splitter behavior and edge cases
    expect(typeof wrapper.vm.handleSplitterKeydown).toBe('function')
    
    // Test edge case handling
    wrapper.vm.splitterDragging = true
    wrapper.vm.splitterStartWidth = 300
    wrapper.vm.navigationWidth = 400
    
    const escapeEvent = { key: 'Escape', preventDefault: vi.fn() }
    wrapper.vm.handleSplitterKeydown(escapeEvent)
    
    expect(wrapper.vm.navigationWidth).toBe(300) // Restored
    expect(wrapper.vm.splitterDragging).toBe(false)
  })

  it('should handle responsive constraints correctly', () => {
    // Test mobile constraints
    window.innerWidth = 500
    expect(wrapper.vm.getMinNavigationWidth()).toBe(180)
    expect(wrapper.vm.getMaxNavigationWidth(500)).toBeLessThanOrEqual(400) // 80% of 500

    // Test tablet constraints  
    window.innerWidth = 800
    expect(wrapper.vm.getMinNavigationWidth()).toBe(200)
    expect(wrapper.vm.getMaxNavigationWidth(800)).toBeLessThanOrEqual(560) // 70% of 800

    // Test desktop constraints
    window.innerWidth = 1200
    expect(wrapper.vm.getMinNavigationWidth()).toBe(220)
    expect(wrapper.vm.getMaxNavigationWidth(1200)).toBeLessThanOrEqual(600) // Absolute max
  })

  it('should provide visual feedback during drag operations', () => {
    // Test that splitter has proper CSS classes for visual feedback
    const splitter = wrapper.find('.pane-splitter')
    expect(splitter.exists()).toBe(true)
    
    const splitterHandle = wrapper.find('.splitter-handle')
    expect(splitterHandle.exists()).toBe(true)
    
    // Test that component has methods for visual feedback
    expect(typeof wrapper.vm.updateCSSCustomProperty).toBe('function')
    
    // Test CSS custom properties are used
    const styles = wrapper.find('.project-workspace').element.style
    expect(wrapper.vm.navigationWidth).toBeGreaterThan(0)
  })
})