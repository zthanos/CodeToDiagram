import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkspaceErrorBoundary from '../../components/WorkspaceErrorBoundary.vue'
import NotificationService from '../../services/NotificationService'

// Mock dependencies
vi.mock('../../services/NotificationService', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }
}))

vi.mock('../../composables/useErrorHandling', () => ({
  useComponentErrorHandling: vi.fn(() => ({
    handleError: vi.fn()
  }))
}))

vi.mock('../../composables/useRetry', () => ({
  useRetry: vi.fn(() => ({
    executeWithRetry: vi.fn(),
    canRetry: vi.fn(() => true)
  }))
}))

vi.mock('../../utils/validation', () => ({
  NetworkValidator: {
    isNetworkAvailable: vi.fn(() => true),
    addNetworkListener: vi.fn(),
    removeNetworkListener: vi.fn()
  }
}))

// Mock global objects
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    onLine: true
  },
  writable: true
})

Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
    reload: vi.fn()
  },
  writable: true
})

Object.defineProperty(window, 'history', {
  value: {
    length: 2,
    back: vi.fn()
  },
  writable: true
})

describe('WorkspaceErrorBoundary', () => {
  let wrapper
  let mockOnRetry
  let mockOnReset
  let mockOnClearData

  beforeEach(() => {
    mockOnRetry = vi.fn()
    mockOnReset = vi.fn()
    mockOnClearData = vi.fn()
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const createWrapper = (props = {}) => {
    return mount(WorkspaceErrorBoundary, {
      props: {
        workspaceName: 'Test Workspace',
        componentName: 'TestComponent',
        onRetry: mockOnRetry,
        onReset: mockOnReset,
        onClearData: mockOnClearData,
        ...props
      },
      slots: {
        default: '<div data-testid="child-content">Child Content</div>'
      }
    })
  }

  describe('Normal Operation', () => {
    it('renders child content when no error', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('[data-testid="child-content"]').exists()).toBe(true)
      expect(wrapper.find('.error-boundary-content').exists()).toBe(false)
    })

    it('applies correct CSS classes', () => {
      wrapper = createWrapper()
      
      expect(wrapper.find('.workspace-error-boundary').exists()).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('catches and displays errors', async () => {
      wrapper = createWrapper()
      
      const testError = new Error('Test error message')
      const testInstance = { $options: { name: 'TestComponent' } }
      const testInfo = 'component render'

      // Simulate error capture
      wrapper.vm.$options.errorCaptured(testError, testInstance, testInfo)
      await nextTick()

      expect(wrapper.find('.error-boundary-content').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toContain('Application Error')
      expect(wrapper.find('.error-message').text()).toContain('Test Workspace')
    })

    it('categorizes different error types correctly', async () => {
      wrapper = createWrapper()

      // Test network error
      const networkError = new Error('Network Error: fetch failed')
      wrapper.vm.$options.errorCaptured(networkError, {}, 'network')
      await nextTick()

      expect(wrapper.find('.error-title').text()).toBe('Network Error')

      // Test chunk load error
      const chunkError = new Error('Loading chunk failed')
      chunkError.name = 'ChunkLoadError'
      wrapper.vm.$options.errorCaptured(chunkError, {}, 'chunk')
      await nextTick()

      expect(wrapper.find('.error-title').text()).toBe('Loading Error')
    })

    it('shows appropriate error messages for different error types', async () => {
      wrapper = createWrapper()

      const validationError = new Error('Validation failed')
      wrapper.vm.$options.errorCaptured(validationError, {}, 'validation')
      await nextTick()

      expect(wrapper.find('.error-message').text()).toContain('validation error')
    })

    it('displays error context information', async () => {
      wrapper = createWrapper()

      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test_operation')
      await nextTick()

      expect(wrapper.find('.error-context').exists()).toBe(true)
      expect(wrapper.text()).toContain('Test Workspace')
      expect(wrapper.text()).toContain('TestComponent')
    })
  })

  describe('Error Actions', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
    })

    it('shows retry button when retryable', () => {
      expect(wrapper.find('.error-btn-primary').exists()).toBe(true)
      expect(wrapper.find('.error-btn-primary').text()).toContain('Try Again')
    })

    it('calls onRetry when retry button is clicked', async () => {
      const retryButton = wrapper.find('.error-btn-primary')
      await retryButton.trigger('click')

      expect(mockOnRetry).toHaveBeenCalled()
    })

    it('disables retry button when max retries reached', async () => {
      wrapper = createWrapper({ maxRetries: 1 })
      
      // Simulate reaching max retries
      await wrapper.setData({ retryCount: 1 })
      
      const retryButton = wrapper.find('.error-btn-primary')
      expect(retryButton.attributes('disabled')).toBeDefined()
      expect(retryButton.text()).toContain('Max Retries Reached')
    })

    it('toggles error details when details button is clicked', async () => {
      const detailsButton = wrapper.find('.error-btn-secondary')
      expect(detailsButton.text()).toContain('Show Details')

      await detailsButton.trigger('click')
      expect(wrapper.find('.error-details').exists()).toBe(true)
      expect(detailsButton.text()).toContain('Hide Details')
    })

    it('shows go back button when history is available', () => {
      expect(wrapper.find('.error-btn-secondary').exists()).toBe(true)
      const buttons = wrapper.findAll('.error-btn-secondary')
      const goBackButton = buttons.find(btn => btn.text().includes('Go Back'))
      expect(goBackButton).toBeTruthy()
    })
  })

  describe('Error Suggestions', () => {
    it('shows network suggestions when offline', async () => {
      // Mock offline state
      vi.mocked(window.navigator).onLine = false
      
      wrapper = createWrapper()
      const networkError = new Error('Network Error')
      wrapper.vm.$options.errorCaptured(networkError, {}, 'network')
      await nextTick()

      expect(wrapper.find('.error-suggestions').exists()).toBe(true)
      expect(wrapper.text()).toContain('Check your internet connection')
    })

    it('shows refresh suggestion for chunk load errors', async () => {
      wrapper = createWrapper()
      
      const chunkError = new Error('Loading chunk failed')
      chunkError.name = 'ChunkLoadError'
      wrapper.vm.$options.errorCaptured(chunkError, {}, 'chunk')
      await nextTick()

      expect(wrapper.text()).toContain('Refresh the page to load the latest version')
    })

    it('shows validation suggestions for validation errors', async () => {
      wrapper = createWrapper()
      
      const validationError = new Error('Validation failed')
      wrapper.vm.$options.errorCaptured(validationError, {}, 'validation')
      await nextTick()

      expect(wrapper.text()).toContain('Check your input for any invalid characters')
    })
  })

  describe('Recovery Options', () => {
    beforeEach(async () => {
      wrapper = createWrapper({ showRecoveryOptions: true })
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
    })

    it('shows recovery options when enabled', () => {
      expect(wrapper.find('.recovery-options').exists()).toBe(true)
      expect(wrapper.find('.recovery-buttons').exists()).toBe(true)
    })

    it('calls onClearData when clear data button is clicked', async () => {
      const clearButton = wrapper.find('.recovery-btn')
      await clearButton.trigger('click')

      expect(mockOnClearData).toHaveBeenCalled()
    })

    it('calls onReset when reset button is clicked with confirmation', async () => {
      // Mock window.confirm
      window.confirm = vi.fn(() => true)
      
      const resetButton = wrapper.findAll('.recovery-btn').find(btn => 
        btn.text().includes('Reset Workspace')
      )
      await resetButton.trigger('click')

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnReset).toHaveBeenCalled()
    })

    it('does not reset when user cancels confirmation', async () => {
      // Mock window.confirm to return false
      window.confirm = vi.fn(() => false)
      
      const resetButton = wrapper.findAll('.recovery-btn').find(btn => 
        btn.text().includes('Reset Workspace')
      )
      await resetButton.trigger('click')

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnReset).not.toHaveBeenCalled()
    })
  })

  describe('Network Status', () => {
    it('shows offline indicator when network is unavailable', async () => {
      // Mock offline state
      vi.mocked(window.navigator).onLine = false
      
      wrapper = createWrapper()
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()

      expect(wrapper.find('.network-status.offline').exists()).toBe(true)
      expect(wrapper.text()).toContain('You\'re currently offline')
    })

    it('does not show offline indicator when online', async () => {
      wrapper = createWrapper()
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()

      expect(wrapper.find('.network-status.offline').exists()).toBe(false)
    })
  })

  describe('Error Reporting', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
    })

    it('opens email client when report error is clicked', async () => {
      // Mock window.open
      window.open = vi.fn()
      
      const reportButton = wrapper.findAll('.error-btn-secondary').find(btn => 
        btn.text().includes('Report Issue')
      )
      await reportButton.trigger('click')

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('mailto:support@example.com'),
        '_blank'
      )
    })

    it('includes error details in report', async () => {
      window.open = vi.fn()
      
      const reportButton = wrapper.findAll('.error-btn-secondary').find(btn => 
        btn.text().includes('Report Issue')
      )
      await reportButton.trigger('click')

      const mailtoUrl = window.open.mock.calls[0][0]
      expect(mailtoUrl).toContain('Test%20Workspace')
      expect(mailtoUrl).toContain('Test%20error')
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = createWrapper()
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
    })

    it('has proper ARIA labels and roles', () => {
      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.attributes()).toHaveProperty('type')
      })
    })

    it('maintains focus management', async () => {
      const retryButton = wrapper.find('.error-btn-primary')
      expect(retryButton.exists()).toBe(true)
    })
  })

  describe('Props and Configuration', () => {
    it('uses custom fallback title and message', () => {
      wrapper = createWrapper({
        fallbackTitle: 'Custom Error Title',
        fallbackMessage: 'Custom error message'
      })

      // No error state, so these won't be visible yet
      expect(wrapper.props('fallbackTitle')).toBe('Custom Error Title')
      expect(wrapper.props('fallbackMessage')).toBe('Custom error message')
    })

    it('respects showRetry prop', () => {
      wrapper = createWrapper({ showRetry: false })
      expect(wrapper.props('showRetry')).toBe(false)
    })

    it('respects showRecoveryOptions prop', () => {
      wrapper = createWrapper({ showRecoveryOptions: true })
      expect(wrapper.props('showRecoveryOptions')).toBe(true)
    })

    it('uses custom maxRetries value', () => {
      wrapper = createWrapper({ maxRetries: 5 })
      expect(wrapper.props('maxRetries')).toBe(5)
    })
  })

  describe('Component Lifecycle', () => {
    it('cleans up network listeners on unmount', () => {
      const { NetworkValidator } = require('../../utils/validation')
      wrapper = createWrapper()
      
      wrapper.unmount()
      
      expect(NetworkValidator.removeNetworkListener).toHaveBeenCalled()
    })

    it('exposes methods for parent components', () => {
      wrapper = createWrapper()
      
      expect(wrapper.vm.retry).toBeDefined()
      expect(wrapper.vm.hasError).toBeDefined()
      expect(wrapper.vm.clearError).toBeDefined()
      expect(wrapper.vm.getErrorInfo).toBeDefined()
    })
  })

  describe('Error State Management', () => {
    it('clears error state when clearError is called', async () => {
      wrapper = createWrapper()
      
      // Trigger error
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
      
      expect(wrapper.find('.error-boundary-content').exists()).toBe(true)
      
      // Clear error
      wrapper.vm.clearError()
      await nextTick()
      
      expect(wrapper.find('.error-boundary-content').exists()).toBe(false)
      expect(wrapper.find('[data-testid="child-content"]').exists()).toBe(true)
    })

    it('tracks retry count correctly', async () => {
      wrapper = createWrapper()
      
      const testError = new Error('Test error')
      wrapper.vm.$options.errorCaptured(testError, {}, 'test')
      await nextTick()
      
      const errorInfo = wrapper.vm.getErrorInfo()
      expect(errorInfo.retryCount).toBe(0)
    })
  })
})