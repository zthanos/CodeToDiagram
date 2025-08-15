// src/test/components/RequirementsWorkspaceInitialization.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsWorkspace from '../../components/RequirementsWorkspace.vue'
import { RequirementsApiService } from '../../services/RequirementsApiService'
import type { RequirementsDocument, RequirementItem } from '../../types/requirements'
import type { Project } from '../../types/project'

// Mock the API service
vi.mock('../../services/RequirementsApiService')

// Mock child components
vi.mock('../../components/MarkdownRenderer.vue', () => ({
  default: {
    name: 'MarkdownRenderer',
    template: '<div class="markdown-renderer">{{ content }}</div>',
    props: ['content']
  }
}))

vi.mock('../../components/RequirementsTabsContainer.vue', () => ({
  default: {
    name: 'RequirementsTabsContainer',
    template: '<div class="requirements-tabs-container">Tabs Container</div>',
    props: [
      'active-tab', 'requirement-items', 'systems-data', 'teams-data', 'tab-state'
    ],
    emits: [
      'tab-change', 'requirement-update', 'requirement-delete', 'requirement-create',
      'requirements-filter-change', 'requirements-search-change', 'system-select',
      'system-create', 'system-update', 'system-delete', 'systems-search-change',
      'systems-filter-change', 'team-select', 'team-create', 'team-update',
      'team-delete', 'teams-search-change'
    ]
  }
}))

describe('RequirementsWorkspace - Initialization', () => {
  let wrapper: VueWrapper<any>
  let mockProject: Project
  let mockRequirementsApiService: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock project
    mockProject = {
      id: 'test-project-123',
      name: 'Test Project',
      description: 'Test project description',
      created_at: new Date(),
      updated_at: new Date()
    }

    // Get the mocked API service
    mockRequirementsApiService = vi.mocked(RequirementsApiService)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Successful Document Loading', () => {
    it('should load requirements document and populate workspace on mount', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Test Requirements\n\nThis is a test document.',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      const mockRequirementItems: RequirementItem[] = [
        {
          id: '1',
          title: 'User Authentication',
          description: 'Users must be able to log in',
          status: 'new',
          priority: 'high',
          project_id: 'test-project-123',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          source: 'manual'
        }
      ]

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue(mockRequirementItems)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async operations

      // Assert
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-123')
      expect(mockRequirementsApiService.listRequirementItems).toHaveBeenCalledWith('test-project-123')
      
      // Check that loading state is no longer visible
      expect(wrapper.find('.loading-state').exists()).toBe(false)
      
      // Check that document content is populated
      expect(wrapper.vm.brdContent).toBe(mockDocument.content)
      expect(wrapper.vm.currentStatus).toBe(mockDocument.status)
      expect(wrapper.vm.requirementsDocument).toEqual(mockDocument)
      expect(wrapper.vm.requirementItems).toEqual(mockRequirementItems)
      
      // Check that changes are not marked
      expect(wrapper.vm.hasChanges).toBe(false)
      
      // Check that last saved timestamp is set
      expect(wrapper.vm.lastSaved).toEqual(new Date(mockDocument.updated_at))
    })

    it('should handle document with empty content', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.brdContent).toBe('')
      expect(wrapper.vm.requirementsDocument).toEqual(mockDocument)
      expect(wrapper.vm.requirementItems).toEqual([])
    })

    it('should handle PDF-imported document correctly', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Imported Requirements\n\nFrom PDF document.',
        status: 'published',
        id: 2,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'pdf_upload',
        original_filename: 'requirements.pdf',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.requirementsDocument.source_type).toBe('pdf_upload')
      expect(wrapper.vm.requirementsDocument.original_filename).toBe('requirements.pdf')
      expect(wrapper.vm.currentStatus).toBe('published')
    })
  })

  describe('Empty State Handling', () => {
    it('should initialize empty workspace when no document exists (404)', async () => {
      // Arrange
      const notFoundError = {
        type: 'CLIENT',
        message: 'Requirements document not found',
        canRetry: false
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(notFoundError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.requirementsDocument).toBe(null)
      expect(wrapper.vm.brdContent).toBe('')
      expect(wrapper.vm.currentStatus).toBe('draft')
      expect(wrapper.vm.hasChanges).toBe(false)
      expect(wrapper.vm.requirementItems).toEqual([])
      
      // Check that empty state is shown
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-title').text()).toContain('No Requirements Document Found')
    })

    it('should show empty state actions', async () => {
      // Arrange
      const notFoundError = {
        type: 'CLIENT',
        message: 'Requirements document not found',
        canRetry: false
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(notFoundError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.find('.start-writing-btn').exists()).toBe(true)
      expect(wrapper.find('.upload-pdf-btn').exists()).toBe(true)
    })

    it('should switch to edit mode when start writing is clicked', async () => {
      // Arrange
      const notFoundError = {
        type: 'CLIENT',
        message: 'Requirements document not found',
        canRetry: false
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(notFoundError)

      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Act
      await wrapper.find('.start-writing-btn').trigger('click')
      await nextTick()

      // Assert
      expect(wrapper.vm.viewMode).toBe('edit')
      expect(wrapper.find('.empty-state').exists()).toBe(false)
      expect(wrapper.find('.edit-mode').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors with retry functionality', async () => {
      // Arrange
      const networkError = {
        type: 'NETWORK',
        message: 'Network connection failed',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(networkError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.loadingError).toBe('Network connection failed')
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toContain('Failed to Load Requirements')
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should handle server errors with retry functionality', async () => {
      // Arrange
      const serverError = {
        type: 'SERVER',
        message: 'Internal server error',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(serverError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.loadingError).toBe('Internal server error')
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = {
        type: 'TIMEOUT',
        message: 'Request timed out',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(timeoutError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.loadingError).toBe('Request timed out')
      expect(wrapper.find('.error-state').exists()).toBe(true)
    })

    it('should handle unknown errors', async () => {
      // Arrange
      const unknownError = {
        type: 'UNKNOWN',
        message: 'An unexpected error occurred',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(unknownError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.loadingError).toBe('An unexpected error occurred')
      expect(wrapper.find('.error-state').exists()).toBe(true)
    })
  })

  describe('Retry Functionality', () => {
    it('should retry loading when retry button is clicked', async () => {
      // Arrange
      const networkError = {
        type: 'NETWORK',
        message: 'Network connection failed',
        canRetry: true
      }

      const mockDocument: RequirementsDocument = {
        content: '# Retried Document',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      // First call fails, second call succeeds
      mockRequirementsApiService.getLatestRequirements
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockDocument)
      
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify error state
      expect(wrapper.find('.error-state').exists()).toBe(true)

      // Act - Click retry
      await wrapper.find('.retry-btn').trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.loadingError).toBe(null)
      expect(wrapper.vm.brdContent).toBe('# Retried Document')
      // Retry count should be reset to 0 on successful load
      expect(wrapper.vm.retryCount).toBe(0)
    })

    it('should track retry count and show retry info', async () => {
      // Arrange
      const networkError = {
        type: 'NETWORK',
        message: 'Network connection failed',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(networkError)

      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Act - Click retry multiple times
      await wrapper.find('.retry-btn').trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.retryCount).toBe(1)
      expect(wrapper.find('.retry-info').text()).toContain('Retry attempt 1/3')
    })

    it('should prevent retry after maximum attempts', async () => {
      // Arrange
      const networkError = {
        type: 'NETWORK',
        message: 'Network connection failed',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(networkError)

      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Set retry count to maximum
      wrapper.vm.retryCount = 3

      // Act - Try to retry when at max attempts
      await wrapper.vm.retryLoadRequirements()

      // Assert - Check that the notification state was set
      expect(wrapper.vm.notification).toEqual({
        type: 'error',
        message: 'Maximum retry attempts reached. Please refresh the page or contact support.'
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during initial load', async () => {
      // Arrange
      let resolvePromise: (value: any) => void
      const loadingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockRequirementsApiService.getLatestRequirements.mockReturnValue(loadingPromise)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      // Assert - Should show loading state
      expect(wrapper.vm.isLoading).toBe(true)
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toContain('Loading Requirements Document')

      // Complete the loading
      resolvePromise!({
        content: 'Test',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      })

      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert - Loading state should be gone
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.find('.loading-state').exists()).toBe(false)
    })

    it('should show loading state in right panel during load', async () => {
      // Arrange
      let resolvePromise: (value: any) => void
      const loadingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockRequirementsApiService.getLatestRequirements.mockReturnValue(loadingPromise)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      // Assert
      expect(wrapper.find('.right-panel-loading').exists()).toBe(true)
      expect(wrapper.find('.right-panel-loading').text()).toContain('Loading workspace data')
    })
  })

  describe('Requirement Items Loading', () => {
    it('should handle requirement items loading failure gracefully', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Test Document',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      const itemsError = {
        type: 'SERVER',
        message: 'Failed to load requirement items',
        canRetry: true
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockRejectedValue(itemsError)

      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.brdContent).toBe('# Test Document') // Document should still load
      expect(wrapper.vm.requirementItems).toEqual([]) // Items should be empty
      
      // Check that the notification state was set (since we can't easily spy on the method call)
      expect(wrapper.vm.notification).toEqual({
        type: 'error',
        message: 'Failed to load requirement items. You can still work with the document.'
      })

      // Cleanup
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Project ID Validation', () => {
    it('should handle missing project ID gracefully', async () => {
      // Arrange
      const projectWithoutId = { ...mockProject, id: '' }

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: projectWithoutId }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(mockRequirementsApiService.getLatestRequirements).not.toHaveBeenCalled()
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('should handle null project gracefully', async () => {
      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: null }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(mockRequirementsApiService.getLatestRequirements).not.toHaveBeenCalled()
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Data Validation', () => {
    it('should handle invalid date formats in document', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Test Document',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: 'invalid-date'
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.lastSaved).toBe(null) // Should handle invalid date gracefully
      expect(wrapper.vm.brdContent).toBe('# Test Document') // Document should still load
    })

    it('should handle document with missing updated_at field', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Test Document',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: ''
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.lastSaved).toBe(null) // Should handle missing date gracefully
      expect(wrapper.vm.brdContent).toBe('# Test Document') // Document should still load
    })
  })

  describe('Initialization State Management', () => {
    it('should prevent change tracking during initialization', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Initial Content',
        status: 'published',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.hasChanges).toBe(false) // Should not mark as changed during initialization
      expect(wrapper.vm.brdContent).toBe('# Initial Content')
      expect(wrapper.vm.currentStatus).toBe('published')
    })

    it('should emit unsaved-changes event correctly after initialization', async () => {
      // Arrange
      const mockDocument: RequirementsDocument = {
        content: '# Initial Content',
        status: 'draft',
        id: 1,
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockDocument)
      mockRequirementsApiService.listRequirementItems.mockResolvedValue([])

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify initial state
      expect(wrapper.vm.hasChanges).toBe(false)

      // Make a change after initialization
      wrapper.vm.brdContent = '# Modified Content'
      await nextTick()

      // Assert
      expect(wrapper.vm.hasChanges).toBe(true)
      expect(wrapper.emitted('unsaved-changes')).toBeTruthy()
      expect(wrapper.emitted('unsaved-changes')![0]).toEqual([false]) // Initial emit
      expect(wrapper.emitted('unsaved-changes')![1]).toEqual([true]) // After change
    })
  })

  describe('Systems and Teams Initialization', () => {
    it('should initialize sample systems and teams data for empty workspace', async () => {
      // Arrange
      const notFoundError = {
        type: 'CLIENT',
        message: 'Requirements document not found',
        canRetry: false
      }

      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(notFoundError)

      // Act
      wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert
      expect(wrapper.vm.systemsData.length).toBeGreaterThan(0)
      expect(wrapper.vm.teamsData.length).toBeGreaterThan(0)
      expect(wrapper.vm.tabState.systems.items.length).toBeGreaterThan(0)
      expect(wrapper.vm.tabState.teams.items.length).toBeGreaterThan(0)
    })
  })
})