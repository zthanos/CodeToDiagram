import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import useWorkspaceErrorHandling from '../../composables/useWorkspaceErrorHandling'
import NotificationService from '../../services/NotificationService'

// Mock dependencies
vi.mock('../../composables/useErrorHandling', () => ({
  useComponentErrorHandling: vi.fn(() => ({
    handleError: vi.fn()
  }))
}))

vi.mock('../../composables/useRetry', () => ({
  useRetry: vi.fn(() => ({
    executeWithRetry: vi.fn(),
    isRetrying: ref(false),
    currentAttempt: ref(0),
    reset: vi.fn()
  }))
}))

vi.mock('../../composables/useLoading', () => ({
  useLoading: vi.fn(() => ({
    withLoading: vi.fn((operation) => operation()),
    isLoading: ref(false)
  }))
}))

vi.mock('../../services/NotificationService', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }
}))

describe('useWorkspaceErrorHandling', () => {
  let errorHandling
  let mockOnError
  let mockOnRetry
  let mockOnRecover

  beforeEach(() => {
    mockOnError = vi.fn()
    mockOnRetry = vi.fn()
    mockOnRecover = vi.fn()
    
    vi.clearAllMocks()
  })

  const createErrorHandling = (options = {}) => {
    return useWorkspaceErrorHandling({
      workspaceName: 'Test Workspace',
      componentName: 'TestComponent',
      onError: mockOnError,
      onRetry: mockOnRetry,
      onRecover: mockOnRecover,
      ...options
    })
  }

  describe('Initialization', () => {
    it('initializes with default state', () => {
      errorHandling = createErrorHandling()
      
      expect(errorHandling.hasError.value).toBe(false)
      expect(errorHandling.isLoading.value).toBe(false)
      expect(errorHandling.canRetry.value).toBe(false)
      expect(errorHandling.errorState.value.hasError).toBe(false)
      expect(errorHandling.loadingState.value.isLoading).toBe(false)
    })

    it('accepts custom configuration options', () => {
      errorHandling = createErrorHandling({
        maxRetries: 5,
        showNotifications: false,
        autoRetry: true
      })
      
      expect(errorHandling.errorState.value.maxRetries).toBe(5)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('handles errors correctly', () => {
      const testError = new Error('Test error message')
      
      errorHandling.handleError(testError, 'test_operation')
      
      expect(errorHandling.hasError.value).toBe(true)
      expect(errorHandling.errorState.value.error).toBe(testError)
      expect(errorHandling.errorState.value.lastOperation).toBe('test_operation')
      expect(errorHandling.errorState.value.errorMessage).toContain('Test error message')
    })

    it('calls custom error handler when provided', () => {
      const testError = new Error('Test error')
      
      errorHandling.handleError(testError, 'test_operation', { extra: 'context' })
      
      expect(mockOnError).toHaveBeenCalledWith(testError, {
        operation: 'test_operation',
        extra: 'context'
      })
    })

    it('shows notifications when enabled', () => {
      errorHandling = createErrorHandling({ showNotifications: true })
      const testError = new Error('Test error')
      
      errorHandling.handleError(testError, 'test_operation')
      
      expect(NotificationService.error).toHaveBeenCalledWith(
        'Test Workspace Error',
        expect.any(String),
        expect.any(Object)
      )
    })

    it('does not show notifications when disabled', () => {
      errorHandling = createErrorHandling({ showNotifications: false })
      const testError = new Error('Test error')
      
      errorHandling.handleError(testError, 'test_operation')
      
      expect(NotificationService.error).not.toHaveBeenCalled()
    })

    it('categorizes network errors correctly', () => {
      const networkError = new Error('Network Error: fetch failed')
      
      errorHandling.handleError(networkError, 'network_request')
      
      expect(errorHandling.errorState.value.canRetry).toBe(true)
      expect(errorHandling.errorState.value.isRecoverable).toBe(true)
    })

    it('categorizes timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      
      errorHandling.handleError(timeoutError, 'api_request')
      
      expect(errorHandling.errorState.value.canRetry).toBe(true)
    })

    it('categorizes validation errors correctly', () => {
      const validationError = new Error('Validation failed')
      
      errorHandling.handleError(validationError, 'form_submit')
      
      expect(errorHandling.errorState.value.canRetry).toBe(false)
      expect(errorHandling.errorState.value.isRecoverable).toBe(true)
    })

    it('categorizes authentication errors correctly', () => {
      const authError = new Error('401 Unauthorized')
      
      errorHandling.handleError(authError, 'api_request')
      
      expect(errorHandling.errorState.value.isRecoverable).toBe(false)
    })
  })

  describe('Error Clearing', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
      const testError = new Error('Test error')
      errorHandling.handleError(testError, 'test_operation')
    })

    it('clears error state', () => {
      expect(errorHandling.hasError.value).toBe(true)
      
      errorHandling.clearError()
      
      expect(errorHandling.hasError.value).toBe(false)
      expect(errorHandling.errorState.value.error).toBe(null)
      expect(errorHandling.errorState.value.errorMessage).toBe('')
    })

    it('resets retry state when clearing error', () => {
      errorHandling.clearError()
      
      // Verify that retry reset was called
      const { useRetry } = require('../../composables/useRetry')
      const mockRetry = useRetry()
      expect(mockRetry.reset).toHaveBeenCalled()
    })
  })

  describe('Retry Functionality', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling({ maxRetries: 3 })
    })

    it('allows retry when error is retryable', () => {
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      expect(errorHandling.canRetry.value).toBe(true)
    })

    it('does not allow retry when max retries reached', () => {
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      // Simulate reaching max retries
      errorHandling.errorState.value.retryCount = 3
      
      expect(errorHandling.canRetry.value).toBe(false)
    })

    it('calls onRetry callback during retry', async () => {
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      const result = await errorHandling.retryLastOperation()
      
      expect(result).toBe(true)
      expect(NotificationService.info).toHaveBeenCalledWith(
        'Retrying',
        expect.stringContaining('Test Workspace')
      )
    })

    it('handles retry failure gracefully', async () => {
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      // Mock retry to fail
      errorHandling.errorState.value.canRetry = false
      
      const result = await errorHandling.retryLastOperation()
      
      expect(result).toBe(false)
    })
  })

  describe('Operation Wrappers', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('withErrorHandling catches and handles errors', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'))
      
      const result = await errorHandling.withErrorHandling(
        failingOperation,
        'test_operation'
      )
      
      expect(result).toBe(null)
      expect(errorHandling.hasError.value).toBe(true)
      expect(failingOperation).toHaveBeenCalled()
    })

    it('withErrorHandling returns result on success', async () => {
      const successfulOperation = vi.fn().mockResolvedValue('success')
      
      const result = await errorHandling.withErrorHandling(
        successfulOperation,
        'test_operation'
      )
      
      expect(result).toBe('success')
      expect(errorHandling.hasError.value).toBe(false)
    })

    it('withRetryableOperation uses retry logic', async () => {
      const { useRetry } = require('../../composables/useRetry')
      const mockRetry = useRetry()
      mockRetry.executeWithRetry.mockResolvedValue('success')
      
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await errorHandling.withRetryableOperation(
        operation,
        'retryable_operation'
      )
      
      expect(mockRetry.executeWithRetry).toHaveBeenCalledWith(operation)
    })

    it('withLoadingAndErrorHandling combines loading and error handling', async () => {
      const { useLoading } = require('../../composables/useLoading')
      const mockLoading = useLoading()
      mockLoading.withLoading.mockImplementation((operation) => operation())
      
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await errorHandling.withLoadingAndErrorHandling(
        operation,
        'Loading...',
        'test_operation'
      )
      
      expect(mockLoading.withLoading).toHaveBeenCalled()
      expect(result).toBe('success')
    })
  })

  describe('Loading State Management', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('sets loading state correctly', () => {
      errorHandling.setLoading(true, 'Loading data...', 50)
      
      expect(errorHandling.loadingState.value.isLoading).toBe(true)
      expect(errorHandling.loadingState.value.loadingMessage).toBe('Loading data...')
      expect(errorHandling.loadingState.value.loadingProgress).toBe(50)
    })

    it('adds loading details', () => {
      errorHandling.addLoadingDetail('Loading users', 'loading')
      
      expect(errorHandling.loadingState.value.loadingDetails).toHaveLength(1)
      expect(errorHandling.loadingState.value.loadingDetails[0]).toEqual({
        text: 'Loading users',
        status: 'loading',
        duration: undefined
      })
    })

    it('updates loading details', () => {
      errorHandling.addLoadingDetail('Loading users', 'loading')
      errorHandling.updateLoadingDetail(0, 'success', 1500)
      
      const detail = errorHandling.loadingState.value.loadingDetails[0]
      expect(detail.status).toBe('success')
      expect(detail.duration).toBe(1500)
    })

    it('clears loading details', () => {
      errorHandling.addLoadingDetail('Loading users', 'loading')
      errorHandling.addLoadingDetail('Loading settings', 'pending')
      
      expect(errorHandling.loadingState.value.loadingDetails).toHaveLength(2)
      
      errorHandling.clearLoadingDetails()
      
      expect(errorHandling.loadingState.value.loadingDetails).toHaveLength(0)
    })
  })

  describe('Recovery Methods', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('recovers successfully', async () => {
      const testError = new Error('Test error')
      errorHandling.handleError(testError, 'test_operation')
      
      await errorHandling.recover()
      
      expect(errorHandling.hasError.value).toBe(false)
      expect(mockOnRecover).toHaveBeenCalled()
      expect(NotificationService.success).toHaveBeenCalledWith(
        'Recovery Successful',
        expect.stringContaining('Test Workspace')
      )
    })

    it('handles recovery failure', async () => {
      mockOnRecover.mockRejectedValue(new Error('Recovery failed'))
      
      await errorHandling.recover()
      
      expect(errorHandling.hasError.value).toBe(true)
      expect(errorHandling.errorState.value.lastOperation).toBe('recovery_operation')
    })

    it('resets workspace successfully', async () => {
      // Mock localStorage
      const mockLocalStorage = {
        length: 2,
        key: vi.fn()
          .mockReturnValueOnce('test-workspace-data')
          .mockReturnValueOnce('other-data'),
        removeItem: vi.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      })
      
      await errorHandling.resetWorkspace()
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-workspace-data')
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other-data')
      expect(NotificationService.success).toHaveBeenCalledWith(
        'Workspace Reset',
        expect.stringContaining('Test Workspace')
      )
    })
  })

  describe('Utility Functions', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('generates user-friendly error messages', () => {
      const networkError = new Error('NetworkError: fetch failed')
      const message = errorHandling.getUserFriendlyErrorMessage(networkError)
      
      expect(message).toContain('connect to the server')
    })

    it('identifies retryable errors correctly', () => {
      const networkError = new Error('Network Error')
      const validationError = new Error('Validation failed')
      
      expect(errorHandling.isRetryableError(networkError)).toBe(true)
      expect(errorHandling.isRetryableError(validationError)).toBe(false)
    })

    it('identifies recoverable errors correctly', () => {
      const networkError = new Error('Network Error')
      const authError = new Error('401 Unauthorized')
      
      expect(errorHandling.isRecoverableError(networkError)).toBe(true)
      expect(errorHandling.isRecoverableError(authError)).toBe(false)
    })
  })

  describe('Auto-retry Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('auto-retries when enabled and error is retryable', async () => {
      errorHandling = createErrorHandling({ autoRetry: true })
      
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      // Fast-forward time to trigger auto-retry
      vi.advanceTimersByTime(2000)
      
      expect(NotificationService.info).toHaveBeenCalledWith(
        'Retrying',
        expect.stringContaining('Test Workspace')
      )
    })

    it('does not auto-retry when disabled', () => {
      errorHandling = createErrorHandling({ autoRetry: false })
      
      const networkError = new Error('Network Error')
      errorHandling.handleError(networkError, 'network_request')
      
      vi.advanceTimersByTime(2000)
      
      // Should not have called retry notification
      const infoCalls = NotificationService.info.mock.calls
      const retryCall = infoCalls.find(call => call[0] === 'Retrying')
      expect(retryCall).toBeUndefined()
    })
  })

  describe('Error Message Categorization', () => {
    beforeEach(() => {
      errorHandling = createErrorHandling()
    })

    it('categorizes network errors', () => {
      const error = new Error('fetch failed')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toContain('connect to the server')
    })

    it('categorizes timeout errors', () => {
      const error = new Error('Request timeout')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toContain('timed out')
    })

    it('categorizes validation errors', () => {
      const error = new Error('validation failed')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toContain('Invalid input')
    })

    it('categorizes permission errors', () => {
      const error = new Error('permission denied')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toContain('permission')
    })

    it('categorizes not found errors', () => {
      const error = new Error('not found')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toContain('could not be found')
    })

    it('falls back to original message for unknown errors', () => {
      const error = new Error('Unknown error type')
      const message = errorHandling.getUserFriendlyErrorMessage(error)
      
      expect(message).toBe('Unknown error type')
    })
  })
})