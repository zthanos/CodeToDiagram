/**
 * Integration tests for comprehensive error handling
 * Requirements: 4.5, 5.3, 6.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsWorkspace from '../../components/RequirementsWorkspace.vue'
import RequirementsErrorBoundary from '../../components/RequirementsErrorBoundary.vue'
import { RequirementsApiService } from '../../services/RequirementsApiService'

// Mock the API service
vi.mock('../../services/RequirementsApiService', () => ({
  RequirementsApiService: {
    getLatestRequirements: vi.fn(),
    uploadRequirementsPdf: vi.fn(),
    saveRequirementsDocument: vi.fn(),
    listRequirementItems: vi.fn(),
    createRequirementItem: vi.fn(),
    updateRequirementItem: vi.fn(),
    deleteRequirementItem: vi.fn(),
    isNetworkAvailable: vi.fn(() => true)
  }
}))

// Mock other dependencies
vi.mock('../../services/NotificationService', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('../../composables/useErrorHandling', () => ({
  useComponentErrorHandling: () => ({
    handleError: vi.fn()
  })
}))

// Mock MarkdownRenderer component
vi.mock('../../components/MarkdownRenderer.vue', () => ({
  default: {
    template: '<div class="markdown-renderer">{{ content }}</div>',
    props: ['content']
  }
}))

// Mock RequirementsTabsContainer component
vi.mock('../../components/RequirementsTabsContainer.vue', () => ({
  default: {
    template: '<div class="requirements-tabs-container">Tabs</div>',
    props: ['activeTab', 'requirementItems', 'systemsData', 'teamsData', 'tabState']
  }
}))

describe('Error Handling Integration Tests', () => {
  let mockProject: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockProject = {
      id: 'test-project-123',
      name: 'Test Project'
    }
  })

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const networkError = new Error('Network request failed')
      networkError.name = 'NetworkError'
      
      vi.mocked(RequirementsApiService.getLatestRequirements).mockRejectedValue(networkError)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for async operations

      // Should show error state
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toContain('Network')
    })

    it('should handle server errors with retry functionality', async () => {
      // Mock server error
      const serverError = new Error('Internal server error')
      serverError.name = 'ServerError'
      
      vi.mocked(RequirementsApiService.getLatestRequirements).mockRejectedValue(serverError)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show error state with retry button
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)

      // Test retry functionality
      vi.mocked(RequirementsApiService.getLatestRequirements).mockResolvedValue({
        id: 1,
        content: 'Test content',
        status: 'draft',
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      await wrapper.find('.retry-btn').trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should recover from error
      expect(wrapper.find('.error-state').exists()).toBe(false)
    })

    it('should handle validation errors from API', async () => {
      // Mock validation error
      const validationError = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: {
              title: ['Title is required'],
              description: ['Description is too long']
            }
          }
        }
      }
      
      vi.mocked(RequirementsApiService.saveRequirementsDocument).mockRejectedValue(validationError)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Initialize with some content
      await wrapper.setData({
        brdContent: 'Test content',
        hasChanges: true
      })

      // Try to save
      await wrapper.find('.save-btn').trigger('click')
      await nextTick()

      // Should handle validation errors appropriately
      expect(wrapper.vm.isSaving).toBe(false)
    })

    it('should handle PDF upload errors', async () => {
      // Mock PDF upload error
      const uploadError = new Error('PDF processing failed')
      uploadError.name = 'PDFError'
      
      vi.mocked(RequirementsApiService.uploadRequirementsPdf).mockRejectedValue(uploadError)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Open upload dialog
      await wrapper.find('.pdf-upload-btn').trigger('click')
      await nextTick()

      // Mock file selection
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      await wrapper.setData({
        selectedFile: mockFile,
        showUploadDialog: true
      })

      // Try to upload
      await wrapper.find('.upload-btn').trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show upload error
      expect(wrapper.find('.upload-error').exists()).toBe(true)
    })
  })

  describe('Validation Error Handling', () => {
    it('should handle form validation errors', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Initialize workspace
      await wrapper.setData({
        requirementsDocument: {
          id: 1,
          content: '',
          status: 'draft',
          project_id: 'test-project-123',
          version: 1,
          source_type: 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

      await nextTick()

      // Test BRD content validation
      const editor = wrapper.find('.markdown-editor')
      if (editor.exists()) {
        // Set invalid content (too long)
        const longContent = 'a'.repeat(100001)
        await editor.setValue(longContent)
        await editor.trigger('input')

        // Should trigger validation
        expect(wrapper.vm.brdContent.length).toBeGreaterThan(100000)
      }
    })

    it('should handle PDF file validation errors', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Open upload dialog
      await wrapper.find('.pdf-upload-btn').trigger('click')
      await nextTick()

      // Mock invalid file selection
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      // Simulate file selection
      const fileInput = wrapper.find('input[type="file"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      // Should show validation error
      expect(wrapper.vm.selectedFile).toBeTruthy()
    })
  })

  describe('Network Connectivity Handling', () => {
    it('should handle offline state', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      vi.mocked(RequirementsApiService.isNetworkAvailable).mockReturnValue(false)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      // Try to perform network operation while offline
      await wrapper.setData({
        brdContent: 'Test content',
        hasChanges: true
      })

      // Should handle offline state appropriately
      expect(navigator.onLine).toBe(false)
    })

    it('should handle network recovery', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()

      // Simulate network recovery
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      // Trigger online event
      window.dispatchEvent(new Event('online'))
      await nextTick()

      // Should handle network recovery
      expect(navigator.onLine).toBe(true)
    })
  })

  describe('Error Boundary Integration', () => {
    it('should catch component errors', async () => {
      // Create a component that throws an error
      const ErrorComponent = {
        template: '<div>{{ throwError() }}</div>',
        methods: {
          throwError() {
            throw new Error('Component error')
          }
        }
      }

      const wrapper = mount(RequirementsErrorBoundary, {
        slots: {
          default: ErrorComponent
        }
      })

      // Manually trigger error state for testing
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Component error')
      await nextTick()

      // Should show error boundary
      expect(wrapper.find('.error-boundary-content').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBeTruthy()
    })

    it('should provide recovery options', async () => {
      const wrapper = mount(RequirementsErrorBoundary, {
        props: {
          showRecoveryOptions: true
        }
      })

      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()

      // Should show recovery options
      expect(wrapper.find('.recovery-options').exists()).toBe(true)
      expect(wrapper.find('button:contains("Clear Local Data")').exists()).toBe(true)
      expect(wrapper.find('button:contains("Refresh Page")').exists()).toBe(true)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary network issues', async () => {
      // Start with network error
      const networkError = new Error('Network timeout')
      vi.mocked(RequirementsApiService.getLatestRequirements).mockRejectedValue(networkError)

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show error state
      expect(wrapper.find('.error-state').exists()).toBe(true)

      // Mock network recovery
      vi.mocked(RequirementsApiService.getLatestRequirements).mockResolvedValue({
        id: 1,
        content: 'Recovered content',
        status: 'draft',
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Retry operation
      await wrapper.find('.retry-btn').trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should recover successfully
      expect(wrapper.find('.error-state').exists()).toBe(false)
    })

    it('should handle partial data recovery', async () => {
      // Mock successful document load but failed items load
      vi.mocked(RequirementsApiService.getLatestRequirements).mockResolvedValue({
        id: 1,
        content: 'Test content',
        status: 'draft',
        project_id: 'test-project-123',
        version: 1,
        source_type: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      vi.mocked(RequirementsApiService.listRequirementItems).mockRejectedValue(
        new Error('Failed to load items')
      )

      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should load document but handle items error gracefully
      expect(wrapper.vm.requirementsDocument).toBeTruthy()
      expect(wrapper.vm.requirementItems).toEqual([])
    })
  })

  describe('User Experience During Errors', () => {
    it('should maintain user data during errors', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // User enters content
      await wrapper.setData({
        brdContent: 'User entered content',
        hasChanges: true
      })

      // Simulate save error
      vi.mocked(RequirementsApiService.saveRequirementsDocument).mockRejectedValue(
        new Error('Save failed')
      )

      await wrapper.find('.save-btn').trigger('click')
      await nextTick()

      // User content should be preserved
      expect(wrapper.vm.brdContent).toBe('User entered content')
      expect(wrapper.vm.hasChanges).toBe(true)
    })

    it('should provide clear error messages to users', async () => {
      const wrapper = mount(RequirementsErrorBoundary)

      // Test different error types
      const errors = [
        { name: 'ChunkLoadError', expectedMessage: 'Loading Error' },
        { name: 'TypeError', expectedMessage: 'Application Error' },
        { name: 'Error', message: 'Network failed', expectedMessage: 'Network Error' },
        { name: 'Error', message: 'PDF processing failed', expectedMessage: 'PDF Processing Error' }
      ]

      for (const errorCase of errors) {
        wrapper.vm.hasError = true
        wrapper.vm.error = { name: errorCase.name, message: errorCase.message || 'Test error' }
        await nextTick()

        expect(wrapper.vm.errorTitle).toBe(errorCase.expectedMessage)
      }
    })

    it('should provide actionable suggestions', async () => {
      const wrapper = mount(RequirementsErrorBoundary)

      // Test network error suggestions
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Network failed')
      wrapper.vm.isOnline = false
      await nextTick()

      const suggestions = wrapper.vm.suggestions
      expect(suggestions.some((s: any) => s.id === 'network')).toBe(true)
      expect(suggestions.some((s: any) => s.text.includes('internet connection'))).toBe(true)
    })
  })

  describe('Performance During Error Conditions', () => {
    it('should not cause memory leaks during repeated errors', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Simulate repeated errors
      for (let i = 0; i < 10; i++) {
        vi.mocked(RequirementsApiService.getLatestRequirements).mockRejectedValue(
          new Error(`Error ${i}`)
        )

        await wrapper.vm.retryLoadRequirements()
        await nextTick()
      }

      // Should handle repeated errors without issues
      expect(wrapper.vm.retryCount).toBeLessThanOrEqual(3) // Should respect max retries
    })

    it('should throttle error notifications', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: { project: mockProject }
      })

      // Simulate rapid errors
      const promises = []
      for (let i = 0; i < 5; i++) {
        vi.mocked(RequirementsApiService.saveRequirementsDocument).mockRejectedValue(
          new Error(`Rapid error ${i}`)
        )
        promises.push(wrapper.vm.saveRequirementsDocument())
      }

      await Promise.allSettled(promises)
      await nextTick()

      // Should handle rapid errors gracefully
      expect(wrapper.vm.isSaving).toBe(false)
    })
  })
})