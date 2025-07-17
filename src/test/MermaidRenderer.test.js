import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MermaidRenderer from '../components/MermaidRenderer.vue'

// Create a more comprehensive mock for the component's DOM refs
const createMockRefs = () => ({
  editor: document.createElement('div'),
  diagramContainer: document.createElement('div')
})

// Mock CodeMirror
vi.mock('codemirror', () => ({
  EditorView: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    dispatch: vi.fn(),
    state: { doc: { toString: () => 'test content', length: 12 } }
  })),
  basicSetup: {},
}))

vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({}))
  }
}))

vi.mock('@codemirror/lang-markdown', () => ({
  markdown: vi.fn(() => ({}))
}))

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}))

vi.mock('@codemirror/view', () => ({
  keymap: {
    of: vi.fn(() => ({}))
  },
  EditorView: {
    updateListener: {
      of: vi.fn(() => ({}))
    },
    domEventHandlers: vi.fn(() => ({}))
  }
}))

vi.mock('@codemirror/commands', () => ({
  indentWithTab: {}
}))

describe('MermaidRenderer Component Lifecycle and Integration Tests', () => {
  let wrapper
  let mockTimers

  beforeEach(() => {
    // Setup fake timers
    mockTimers = vi.useFakeTimers()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset localStorage mock
    localStorage.getItem.mockReturnValue(null)
    localStorage.setItem.mockImplementation(() => {})
    localStorage.removeItem.mockImplementation(() => {})
    
    // Mock DOM elements that the component expects
    document.body.innerHTML = '<div id="app"></div>'
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    mockTimers.useRealTimers()
  })

  describe('Component Mounting and Initialization', () => {
    it('should mount successfully and initialize all features', async () => {
      wrapper = mount(MermaidRenderer, {
        attachTo: document.body
      })
      
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm).toBeDefined()
      
      // Verify initial data properties
      expect(wrapper.vm.leftWidth).toBe(50)
      expect(wrapper.vm.autoSaveKey).toBe('mermaid-autosave-content')
      expect(wrapper.vm.isFileModified).toBe(false)
      expect(wrapper.vm.currentFileName).toBe(null)
    })

    it('should initialize auto-save functionality', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Verify auto-save properties are initialized
      expect(wrapper.vm.autoSaveTimer).toBe(null)
      expect(wrapper.vm.autoSaveKey).toBe('mermaid-autosave-content')
    })

    it('should initialize notification system', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Verify notification system is initialized
      expect(wrapper.vm.notification).toBeDefined()
      expect(wrapper.vm.notification.show).toBe(false)
      expect(wrapper.vm.notification.timeout).toBe(null)
    })
  })

  describe('Auto-save Functionality Integration', () => {
    it('should trigger auto-save when content changes', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Simulate content change
      wrapper.vm.mermaidText = 'new content'
      wrapper.vm.autoSaveContent()
      
      // Fast-forward timers
      mockTimers.advanceTimersByTime(2000)
      
      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mermaid-autosave-content',
        expect.stringContaining('new content')
      )
    })

    it('should restore auto-saved content on initialization', async () => {
      // Mock auto-saved data
      const autoSaveData = {
        content: 'auto-saved content',
        timestamp: Date.now(),
        fileName: null
      }
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'mermaid-autosave-content') {
          return JSON.stringify(autoSaveData)
        }
        return null
      })
      
      wrapper = mount(MermaidRenderer)
      
      // Wait for component to initialize
      await wrapper.vm.$nextTick()
      
      // Verify content was restored
      expect(wrapper.vm.mermaidText).toBe('auto-saved content')
    })

    it('should handle auto-save storage errors gracefully', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Mock storage error
      localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should not throw error
      expect(() => {
        wrapper.vm.autoSaveContent()
        mockTimers.advanceTimersByTime(2000)
      }).not.toThrow()
    })
  })

  describe('File Management Integration', () => {
    it('should track file modification state correctly', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Set initial content
      wrapper.vm.lastSavedContent = 'original content'
      wrapper.vm.mermaidText = 'original content'
      wrapper.vm.updateFileState()
      
      expect(wrapper.vm.isFileModified).toBe(false)
      
      // Modify content
      wrapper.vm.mermaidText = 'modified content'
      wrapper.vm.updateFileState()
      
      expect(wrapper.vm.isFileModified).toBe(true)
    })

    it('should update document title with modification indicator', async () => {
      wrapper = mount(MermaidRenderer)
      
      wrapper.vm.currentFileName = 'test.mmd'
      wrapper.vm.isFileModified = true
      wrapper.vm.updateDocumentTitle()
      
      expect(document.title).toBe('* test.mmd')
    })

    it('should detect File System Access API support', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Mock API support
      global.showOpenFilePicker = vi.fn()
      global.showSaveFilePicker = vi.fn()
      
      expect(wrapper.vm.isFileSystemAccessSupported()).toBe(true)
      
      // Remove API support
      delete global.showOpenFilePicker
      delete global.showSaveFilePicker
      
      expect(wrapper.vm.isFileSystemAccessSupported()).toBe(false)
    })
  })

  describe('Keyboard Shortcuts Integration', () => {
    it('should handle Ctrl+S keyboard shortcut', async () => {
      wrapper = mount(MermaidRenderer)
      
      const mockEvent = {
        ctrlKey: true,
        key: 's',
        preventDefault: vi.fn()
      }
      
      const result = wrapper.vm.handleKeyboardShortcuts(mockEvent)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should handle global keyboard shortcuts', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Show notification first
      wrapper.vm.showNotification('Test message')
      expect(wrapper.vm.notification.show).toBe(true)
      
      // Simulate Escape key
      const mockEvent = {
        key: 'Escape',
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleGlobalKeyboardShortcuts(mockEvent)
      
      expect(wrapper.vm.notification.show).toBe(false)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('Component Cleanup and Unmounting', () => {
    it('should clean up all timers on unmount', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Set up timers
      wrapper.vm.autoSaveTimer = setTimeout(() => {}, 1000)
      wrapper.vm.debounceTimer = setTimeout(() => {}, 1000)
      wrapper.vm.notification.timeout = setTimeout(() => {}, 1000)
      
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      wrapper.unmount()
      
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3)
    })

    it('should remove event listeners on unmount', async () => {
      wrapper = mount(MermaidRenderer)
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should clean up CodeMirror editor on unmount', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Mock editor view
      const mockDestroy = vi.fn()
      wrapper.vm.editorView = { destroy: mockDestroy }
      
      wrapper.unmount()
      
      expect(mockDestroy).toHaveBeenCalled()
      expect(wrapper.vm.editorView).toBe(null)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle CodeMirror initialization errors gracefully', async () => {
      // Mock CodeMirror to throw error
      const { EditorView } = await import('codemirror')
      EditorView.mockImplementationOnce(() => {
        throw new Error('CodeMirror initialization failed')
      })
      
      wrapper = mount(MermaidRenderer)
      
      // Should not crash the component
      expect(wrapper.exists()).toBe(true)
    })

    it('should show appropriate error messages', async () => {
      wrapper = mount(MermaidRenderer)
      
      wrapper.vm.showErrorMessage('Test error message')
      
      expect(wrapper.vm.notification.show).toBe(true)
      expect(wrapper.vm.notification.type).toBe('error')
      expect(wrapper.vm.notification.message).toBe('Test error message')
    })

    it('should handle beforeunload with unsaved changes', async () => {
      wrapper = mount(MermaidRenderer)
      
      wrapper.vm.isFileModified = true
      
      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: null
      }
      
      const result = wrapper.vm.handleBeforeUnload(mockEvent)
      
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.returnValue).toBe('You have unsaved changes. Are you sure you want to leave?')
      expect(result).toBe('You have unsaved changes. Are you sure you want to leave?')
    })
  })

  describe('Notification System Integration', () => {
    it('should show and hide notifications correctly', async () => {
      wrapper = mount(MermaidRenderer)
      
      wrapper.vm.showNotification('Test message', 'success', 1000)
      
      expect(wrapper.vm.notification.show).toBe(true)
      expect(wrapper.vm.notification.message).toBe('Test message')
      expect(wrapper.vm.notification.type).toBe('success')
      expect(wrapper.vm.notification.icon).toBe('✅')
      
      // Fast-forward timer
      mockTimers.advanceTimersByTime(1000)
      
      expect(wrapper.vm.notification.show).toBe(false)
    })

    it('should handle notification cleanup', async () => {
      wrapper = mount(MermaidRenderer)
      
      wrapper.vm.showNotification('Test message')
      expect(wrapper.vm.notification.timeout).toBeDefined()
      
      wrapper.vm.hideNotification()
      expect(wrapper.vm.notification.show).toBe(false)
      expect(wrapper.vm.notification.timeout).toBe(null)
    })
  })

  describe('Integration with Existing Functionality', () => {
    it('should maintain existing diagram rendering functionality', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Verify renderDiagram method exists
      expect(typeof wrapper.vm.renderDiagram).toBe('function')
      
      // Mock the diagramContainer ref to avoid DOM issues
      wrapper.vm.$refs.diagramContainer = document.createElement('div')
      
      // Should not throw error with mocked ref
      expect(() => wrapper.vm.renderDiagram()).not.toThrow()
    })

    it('should maintain existing save/load functionality', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Verify existing methods exist
      expect(typeof wrapper.vm.saveDiagram).toBe('function')
      expect(typeof wrapper.vm.loadDiagram).toBe('function')
      
      // Test save functionality
      wrapper.vm.mermaidText = 'test diagram'
      wrapper.vm.saveDiagram()
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'lastMermaidDiagram',
        expect.stringContaining('test diagram')
      )
    })

    it('should maintain split-pane functionality', async () => {
      wrapper = mount(MermaidRenderer)
      
      // Verify split-pane methods exist
      expect(typeof wrapper.vm.startDrag).toBe('function')
      expect(typeof wrapper.vm.onDrag).toBe('function')
      expect(typeof wrapper.vm.stopDrag).toBe('function')
      
      // Test drag functionality
      const mockEvent = { clientX: 100 }
      wrapper.vm.startDrag(mockEvent)
      
      expect(wrapper.vm.dragging).toBe(true)
      expect(wrapper.vm.dragStartX).toBe(100)
    })
  })
})