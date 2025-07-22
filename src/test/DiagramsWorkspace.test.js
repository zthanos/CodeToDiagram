import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DiagramsWorkspace from '../components/DiagramsWorkspace.vue'
import { nextTick } from 'vue'

// Mock the composables
vi.mock('../composables/useDialog', () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn().mockResolvedValue(true)
  })
}))

vi.mock('../composables/useLoading', () => ({
  useLoading: () => ({
    isLoading: false,
    withLoading: vi.fn((fn) => fn())
  })
}))

vi.mock('../composables/useErrorHandling', () => ({
  useComponentErrorHandling: () => ({
    withErrorHandling: vi.fn((fn) => fn())
  })
}))

// Mock NotificationService
vi.mock('../services/NotificationService', () => ({
  default: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock child components
vi.mock('../components/MermaidRenderer.vue', () => ({
  default: {
    name: 'MermaidRenderer',
    template: '<div class="mermaid-renderer-mock">Mermaid Renderer</div>',
    props: ['theme', 'diagramId'],
    emits: ['update:theme', 'content-changed', 'request-save']
  }
}))

vi.mock('../components/SaveDiagramDialog.vue', () => ({
  default: {
    name: 'SaveDiagramDialog',
    template: '<div class="save-dialog-mock">Save Dialog</div>',
    props: ['projectId', 'diagramId', 'content'],
    emits: ['saved', 'cancelled']
  }
}))

vi.mock('../components/SkeletonLoader.vue', () => ({
  default: {
    name: 'SkeletonLoader',
    template: '<div class="skeleton-loader-mock">Loading...</div>',
    props: ['type', 'count']
  }
}))

describe('DiagramsWorkspace', () => {
  let wrapper
  let mockProject

  beforeEach(() => {
    mockProject = {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'A test project',
      diagrams: [
        {
          id: 1,
          title: 'Test Diagram 1',
          content: 'graph TD\n    A --> B',
          type: 'flowchart',
          projectId: 'test-project-1',
          createdAt: new Date(),
          lastModified: new Date(),
          isModified: false
        },
        {
          id: 2,
          title: 'Test Diagram 2',
          content: 'graph LR\n    C --> D',
          type: 'flowchart',
          projectId: 'test-project-1',
          createdAt: new Date(),
          lastModified: new Date(),
          isModified: true
        }
      ],
      requirements: [],
      teams: [],
      tasks: [],
      settings: {
        theme: 'default',
        autoSave: true,
        defaultDiagramType: 'flowchart',
        editorSettings: {
          theme: 'default',
          fontSize: 14,
          lineNumbers: true,
          wordWrap: true,
          autoSave: true,
          autoSaveInterval: 30000
        }
      },
      metadata: {
        version: '1.0.0',
        tags: [],
        lastOpenedDiagrams: [],
        workspaceLayout: {
          navigationPaneWidth: 300,
          navigationPaneCollapsed: false,
          lastOpenedTabs: [],
          activeTabId: null
        }
      },
      createdAt: new Date(),
      lastModified: new Date()
    }

    wrapper = mount(DiagramsWorkspace, {
      props: {
        project: mockProject,
        theme: 'default'
      }
    })
  })

  describe('Component Initialization', () => {
    it('should render the diagrams workspace', () => {
      expect(wrapper.find('.diagrams-workspace').exists()).toBe(true)
    })

    it('should display project name in toolbar', () => {
      expect(wrapper.find('.project-name').text()).toBe('Test Project')
    })

    it('should show diagram list', () => {
      const diagramItems = wrapper.findAll('.diagram-item')
      expect(diagramItems).toHaveLength(2)
      expect(diagramItems[0].text()).toContain('Test Diagram 1')
      expect(diagramItems[1].text()).toContain('Test Diagram 2')
    })

    it('should show modified indicator for modified diagrams', () => {
      const diagramItems = wrapper.findAll('.diagram-item')
      expect(diagramItems[0].find('.modified-indicator').exists()).toBe(false)
      expect(diagramItems[1].find('.modified-indicator').exists()).toBe(true)
    })
  })

  describe('Diagram Selection', () => {
    it('should select diagram when clicked', async () => {
      const diagramItem = wrapper.findAll('.diagram-item')[0]
      await diagramItem.trigger('click')
      
      expect(diagramItem.classes()).toContain('active')
    })

    it('should open diagram in tab when selected', async () => {
      const diagramItem = wrapper.findAll('.diagram-item')[0]
      await diagramItem.trigger('click')
      await nextTick()
      
      expect(wrapper.find('.tab-bar').exists()).toBe(true)
      expect(wrapper.find('.editor-tab').text()).toContain('Test Diagram 1')
    })
  })

  describe('Tab Management', () => {
    beforeEach(async () => {
      // Open a diagram in a tab
      const diagramItem = wrapper.findAll('.diagram-item')[0]
      await diagramItem.trigger('click')
      await nextTick()
    })

    it('should show tab bar when tabs are open', () => {
      expect(wrapper.find('.tab-bar').exists()).toBe(true)
      expect(wrapper.find('.editor-tab').exists()).toBe(true)
    })

    it('should show tab status indicators', () => {
      expect(wrapper.find('.tab-status-indicator').exists()).toBe(true)
      expect(wrapper.find('.status-saved').exists()).toBe(true)
    })

    it('should allow closing tabs', async () => {
      const closeButton = wrapper.find('.tab-close')
      expect(closeButton.exists()).toBe(true)
      
      await closeButton.trigger('click')
      await nextTick()
      
      expect(wrapper.find('.editor-tab').exists()).toBe(false)
    })
  })

  describe('Diagram Creation', () => {
    it('should show create diagram button', () => {
      const createButton = wrapper.find('.toolbar-btn')
      expect(createButton.exists()).toBe(true)
      expect(createButton.text()).toContain('New Diagram')
    })

    it('should create new diagram when button clicked', async () => {
      const createButton = wrapper.find('.toolbar-btn')
      await createButton.trigger('click')
      await nextTick()
      
      // Should emit project-updated event
      expect(wrapper.emitted('project-updated')).toBeTruthy()
      
      // Should open new tab
      expect(wrapper.find('.tab-bar').exists()).toBe(true)
      expect(wrapper.find('.editor-tab').text()).toContain('Untitled Diagram')
    })
  })

  describe('Navigation Toggle', () => {
    it('should show navigation toggle button', () => {
      expect(wrapper.find('.nav-toggle-btn').exists()).toBe(true)
    })

    it('should toggle navigation when button clicked', async () => {
      const toggleButton = wrapper.find('.nav-toggle-btn')
      
      expect(wrapper.classes()).not.toContain('nav-collapsed')
      
      await toggleButton.trigger('click')
      await nextTick()
      
      expect(wrapper.classes()).toContain('nav-collapsed')
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no diagrams exist', async () => {
      const emptyProject = { ...mockProject, diagrams: [] }
      await wrapper.setProps({ project: emptyProject })
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('No diagrams in this project')
    })

    it('should show empty editor state when no tabs are open', () => {
      expect(wrapper.find('.empty-editor-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Welcome to SO Assistant')
    })
  })

  describe('Theme Updates', () => {
    it('should emit theme updates', async () => {
      // Simulate theme update from child component
      const mermaidRenderer = wrapper.findComponent({ name: 'MermaidRenderer' })
      await mermaidRenderer.vm.$emit('update:theme', 'dark')
      
      expect(wrapper.emitted('update:theme')).toBeTruthy()
      expect(wrapper.emitted('update:theme')[0]).toEqual(['dark'])
    })
  })

  describe('Content Changes', () => {
    beforeEach(async () => {
      // Open a diagram in a tab
      const diagramItem = wrapper.findAll('.diagram-item')[0]
      await diagramItem.trigger('click')
      await nextTick()
    })

    it('should handle content changes from editor', async () => {
      const mermaidRenderer = wrapper.findComponent({ name: 'MermaidRenderer' })
      await mermaidRenderer.vm.$emit('content-changed', 'graph TD\n    A --> B --> C')
      await nextTick()
      
      // Tab should be marked as modified
      expect(wrapper.find('.status-modified').exists()).toBe(true)
    })

    it('should handle save requests from editor', async () => {
      const mermaidRenderer = wrapper.findComponent({ name: 'MermaidRenderer' })
      await mermaidRenderer.vm.$emit('request-save', 'graph TD\n    A --> B --> C')
      await nextTick()
      
      // Save dialog should be triggered (mocked)
      expect(wrapper.findComponent({ name: 'SaveDiagramDialog' }).exists()).toBe(true)
    })
  })

  describe('Project Updates', () => {
    it('should emit project updates when diagrams are saved', async () => {
      const saveDialog = wrapper.findComponent({ name: 'SaveDiagramDialog' })
      const savedDiagram = {
        id: 3,
        title: 'New Saved Diagram',
        content: 'graph TD\n    A --> B',
        type: 'flowchart'
      }
      
      await saveDialog.vm.$emit('saved', savedDiagram)
      
      expect(wrapper.emitted('project-updated')).toBeTruthy()
    })
  })
})