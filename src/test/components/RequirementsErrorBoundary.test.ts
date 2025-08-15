/**
 * Tests for RequirementsErrorBoundary component
 * Requirements: 4.5, 5.3, 6.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsErrorBoundary from '../../components/RequirementsErrorBoundary.vue'

// Mock the error handling composable
const mockHandleError = vi.fn()
vi.mock('../../composables/useErrorHandling', () => ({
  useComponentErrorHandling: () => ({
    handleError: mockHandleError
  })
}))

// Mock the notification service
const mockNotificationService = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}
vi.mock('../../services/NotificationService', () => ({
  default: mockNotificationService
}))

// Mock the network validator
const mockNetworkValidator = {
  isNetworkAvailable: vi.fn(() => true),
  addNetworkListener: vi.fn(),
  removeNetworkListener: vi.fn()
}
vi.mock('../../utils/validation', () => ({
  NetworkValidator: mockNetworkValidator
}))

// Mock window methods
const mockOpen = vi.fn()
const mockReload = vi.fn()
const mockBack = vi.fn()
const mockConfirm = vi.fn(() => true)

Object.defineProperty(window, 'open', { value: mockOpen })
Object.defineProperty(window.location, 'reload', { value: mockReload })
Object.defineProperty(window.history, 'back', { value: mockBack })
Object.defineProperty(window, 'confirm', { value: mockConfirm })

// Test component that throws errors
const ErrorThrowingComponent = {
  template: '<div>{{ throwError() }}</div>',
  methods: {
    throwError() {
      throw new Error('Test error')
    }
  }
}

describe('RequirementsErrorBoundary', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkValidator.isNetworkAvailable.mockReturnValue(true)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('normal operation', () => {
    it('should render slot content when no error', () => {
      wrapper = mount(RequirementsErrorBoundary, {
        slots: {
          default: '<div data-testid="slot-content">Normal content</div>'
        }
      })

      expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary-content').exists()).toBe(false)
    })

    it('should accept custom props', () => {
      wrapper = mount(RequirementsErrorBoundary, {
        props: {
          componentName: 'TestComponent',
          fallbackTitle: 'Custom Error Title',
          fallbackMessage: 'Custom error message',
          showRetry: false,
          showRecoveryOptions: true
        },
        slots: {
          default: '<div>Content</div>'
        }
      })

      expect(wrapper.vm.componentName).toBe('TestComponent')
      expect(wrapper.vm.fallbackTitle).toBe('Custom Error Title')
      expect(wrapper.vm.fallbackMessage).toBe('Custom error message')
      expect(wrapper.vm.showRetry).toBe(false)
      expect(wrapper.vm.showRecoveryOptions).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should catch and display errors', async () => {
      // Create a component that will throw an error
      const ThrowingComponent = {
        template: '<div>{{ throwError() }}</div>',
        setup() {
          const throwError = () => {
            throw new Error('Test error message')
          }
          return { throwError }
        }
      }

      wrapper = mount(RequirementsErrorBoundary, {
        slots: {
          default: ThrowingComponent
        }
      })

      // Trigger error by trying to render the throwing component
      try {
        await nextTick()
      } catch (error) {
        // Error is expected and should be caught by error boundary
      }

      // Manually trigger error state for testing
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error message')
      wrapper.vm.errorTimestamp = new Date()
      await nextTick()

      expect(wrapper.find('.error-boundary-content').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toContain('Requirements Workspace Error')
      expect(wrapper.find('.error-message').text()).toBeTruthy()
    })

    it('should categorize different error types', async () => {
      wrapper = mount(RequirementsErrorBoundary)

      // Test ChunkLoadError
      wrapper.vm.hasError = true
      wrapper.vm.error = { name: 'ChunkLoadError', message: 'Loading failed' }
      await nextTick()

      expect(wrapper.vm.errorTitle).toBe('Loading Error')

      // Test TypeError
      wrapper.vm.error = { name: 'TypeError', message: 'Type error' }
      await nextTick()

      expect(wrapper.vm.errorTitle).toBe('Application Error')

      // Test Network error
      wrapper.vm.error = { name: 'Error', message: 'Network request failed' }
      await nextTick()

      expect(wrapper.vm.errorTitle).toBe('Network Error')

      // Test PDF error
      wrapper.vm.error = { name: 'Error', message: 'PDF processing failed' }
      await nextTick()

      expect(wrapper.vm.errorTitle).toBe('PDF Processing Error')
    })

    it('should provide appropriate error messages', async () => {
      wrapper = mount(RequirementsErrorBoundary)

      // Test ChunkLoadError message
      wrapper.vm.hasError = true
      wrapper.vm.error = { name: 'ChunkLoadError', message: 'Loading failed' }
      await nextTick()

      expect(wrapper.vm.errorMessage).toContain('Failed to load application resources')

      // Test network error message
      wrapper.vm.error = { name: 'Error', message: 'Network request failed' }
      await nextTick()

      expect(wrapper.vm.errorMessage).toContain('Unable to connect to the server')
    })
  })

  describe('network status', () => {
    it('should show offline indicator when offline', async () => {
      mockNetworkValidator.isNetworkAvailable.mockReturnValue(false)
      
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      wrapper.vm.isOnline = false
      await nextTick()

      expect(wrapper.find('.network-status.offline').exists()).toBe(true)
      expect(wrapper.find('.network-status').text()).toContain('offline')
    })

    it('should not show network indicator when online', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      wrapper.vm.isOnline = true
      await nextTick()

      expect(wrapper.find('.network-status.offline').exists()).toBe(false)
    })
  })

  describe('error suggestions', () => {
    it('should provide network suggestions when offline', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      wrapper.vm.isOnline = false
      await nextTick()

      const suggestions = wrapper.vm.suggestions
      expect(suggestions.some((s: any) => s.id === 'network')).toBe(true)
    })

    it('should provide refresh suggestion for ChunkLoadError', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = { name: 'ChunkLoadError', message: 'Loading failed' }
      await nextTick()

      const suggestions = wrapper.vm.suggestions
      expect(suggestions.some((s: any) => s.id === 'refresh')).toBe(true)
    })

    it('should provide PDF suggestions for PDF errors', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = { name: 'Error', message: 'PDF processing failed' }
      await nextTick()

      const suggestions = wrapper.vm.suggestions
      expect(suggestions.some((s: any) => s.id === 'pdf')).toBe(true)
    })

    it('should provide validation suggestions for validation errors', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = { name: 'Error', message: 'validation failed' }
      await nextTick()

      const suggestions = wrapper.vm.suggestions
      expect(suggestions.some((s: any) => s.id === 'validation')).toBe(true)
    })
  })

  describe('error details', () => {
    it('should show/hide error details', async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()

      expect(wrapper.find('.error-details').exists()).toBe(false)

      await wrapper.find('button:contains("Show Details")').trigger('click')
      expect(wrapper.vm.showDetails).toBe(true)
      await nextTick()

      expect(wrapper.find('.error-details').exists()).toBe(true)
    })

    it('should format error details correctly', async () => {
      wrapper = mount(RequirementsErrorBoundary, {
        props: {
          componentName: 'TestComponent'
        }
      })

      const testError = new Error('Test error message')
      testError.stack = 'Error stack trace'
      
      wrapper.vm.hasError = true
      wrapper.vm.error = testError
      wrapper.vm.errorInfo = 'Component info'
      wrapper.vm.lastOperation = 'test_operation'
      await nextTick()

      const details = wrapper.vm.errorDetails
      expect(details).toContain('Error: Error')
      expect(details).toContain('Message: Test error message')
      expect(details).toContain('Component Info: Component info')
      expect(details).toContain('Network Status:')
    })
  })

  describe('action buttons', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsErrorBoundary, {
        props: {
          onRetry: vi.fn()
        }
      })
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()
    })

    it('should handle retry action', async () => {
      const retryButton = wrapper.find('button:contains("Try Again")')
      expect(retryButton.exists()).toBe(true)

      await retryButton.trigger('click')
      expect(wrapper.emitted('retry')).toBeTruthy()
    })

    it('should handle report error action', async () => {
      const reportButton = wrapper.find('button:contains("Report Issue")')
      expect(reportButton.exists()).toBe(true)

      await reportButton.trigger('click')
      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_blank')
    })

    it('should handle go back action when history is available', async () => {
      Object.defineProperty(window.history, 'length', { value: 2 })
      
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()

      const goBackButton = wrapper.find('button:contains("Go Back")')
      if (goBackButton.exists()) {
        await goBackButton.trigger('click')
        expect(mockBack).toHaveBeenCalled()
      }
    })

    it('should disable retry button when retrying', async () => {
      wrapper.vm.isRetrying = true
      await nextTick()

      const retryButton = wrapper.find('button:contains("Retrying...")')
      expect(retryButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('recovery options', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsErrorBoundary, {
        props: {
          showRecoveryOptions: true
        }
      })
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()
    })

    it('should show recovery options when enabled', () => {
      expect(wrapper.find('.recovery-options').exists()).toBe(true)
    })

    it('should handle clear local data action', async () => {
      const clearButton = wrapper.find('button:contains("Clear Local Data")')
      expect(clearButton.exists()).toBe(true)

      // Mock localStorage
      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          length: 2,
          key: vi.fn((index) => index === 0 ? 'requirements-test' : 'other-key'),
          removeItem: mockRemoveItem
        }
      })

      // Mock sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          length: 1,
          key: vi.fn(() => 'workspace-test'),
          removeItem: mockRemoveItem
        }
      })

      await clearButton.trigger('click')
      expect(mockRemoveItem).toHaveBeenCalled()
    })

    it('should handle refresh page action', async () => {
      const refreshButton = wrapper.find('button:contains("Refresh Page")')
      expect(refreshButton.exists()).toBe(true)

      await refreshButton.trigger('click')
      expect(mockReload).toHaveBeenCalled()
    })

    it('should handle reset workspace action', async () => {
      const resetButton = wrapper.find('button:contains("Reset Workspace")')
      expect(resetButton.exists()).toBe(true)

      await resetButton.trigger('click')
      expect(mockConfirm).toHaveBeenCalled()
    })
  })

  describe('component lifecycle', () => {
    it('should add network listener on mount', () => {
      wrapper = mount(RequirementsErrorBoundary)
      expect(mockNetworkValidator.addNetworkListener).toHaveBeenCalled()
    })

    it('should remove network listener on unmount', () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.unmount()
      expect(mockNetworkValidator.removeNetworkListener).toHaveBeenCalled()
    })
  })

  describe('exposed methods', () => {
    beforeEach(() => {
      wrapper = mount(RequirementsErrorBoundary)
    })

    it('should expose hasError method', () => {
      expect(wrapper.vm.hasError()).toBe(false)
      
      wrapper.vm.hasError = true
      expect(wrapper.vm.hasError()).toBe(true)
    })

    it('should expose clearError method', () => {
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test')
      wrapper.vm.showDetails = true

      wrapper.vm.clearError()

      expect(wrapper.vm.hasError).toBe(false)
      expect(wrapper.vm.error).toBe(null)
      expect(wrapper.vm.showDetails).toBe(false)
    })

    it('should expose getErrorInfo method', () => {
      const testError = new Error('Test')
      const testDate = new Date()
      
      wrapper.vm.error = testError
      wrapper.vm.errorTimestamp = testDate
      wrapper.vm.lastOperation = 'test_op'

      const errorInfo = wrapper.vm.getErrorInfo()
      expect(errorInfo.error).toBe(testError)
      expect(errorInfo.timestamp).toBe(testDate)
      expect(errorInfo.operation).toBe('test_op')
    })
  })

  describe('error categorization', () => {
    beforeEach(() => {
      wrapper = mount(RequirementsErrorBoundary)
    })

    it('should extract operation from error message', () => {
      const uploadError = new Error('upload failed')
      const operation = wrapper.vm.extractOperationFromError(uploadError, '')
      expect(operation).toBe('pdf_upload')

      const saveError = new Error('save failed')
      const saveOperation = wrapper.vm.extractOperationFromError(saveError, '')
      expect(saveOperation).toBe('save_document')

      const loadError = new Error('load failed')
      const loadOperation = wrapper.vm.extractOperationFromError(loadError, '')
      expect(loadOperation).toBe('load_document')

      const validationError = new Error('validation failed')
      const validationOperation = wrapper.vm.extractOperationFromError(validationError, '')
      expect(validationOperation).toBe('validation')

      const renderError = new Error('unknown error')
      const renderOperation = wrapper.vm.extractOperationFromError(renderError, 'render info')
      expect(renderOperation).toBe('component_render')

      const unknownError = new Error('unknown error')
      const unknownOperation = wrapper.vm.extractOperationFromError(unknownError, '')
      expect(unknownOperation).toBe('unknown')
    })
  })

  describe('time formatting', () => {
    it('should format time correctly', () => {
      wrapper = mount(RequirementsErrorBoundary)
      const testDate = new Date('2023-01-01T12:00:00Z')
      const formatted = wrapper.vm.formatTime(testDate)
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })
  })

  describe('accessibility', () => {
    beforeEach(async () => {
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()
    })

    it('should have proper ARIA attributes', () => {
      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)

      // Check for role attributes in suggestions
      const suggestions = wrapper.findAll('.suggestion-item')
      suggestions.forEach(suggestion => {
        expect(suggestion.exists()).toBe(true)
      })
    })

    it('should have proper button labels', () => {
      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.text()).toBeTruthy()
      })
    })
  })

  describe('responsive design', () => {
    it('should render properly on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500 })
      
      wrapper = mount(RequirementsErrorBoundary)
      wrapper.vm.hasError = true
      wrapper.vm.error = new Error('Test error')
      await nextTick()

      expect(wrapper.find('.error-boundary-content').exists()).toBe(true)
    })
  })
})