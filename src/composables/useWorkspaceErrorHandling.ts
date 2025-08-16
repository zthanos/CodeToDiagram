import { ref, computed, onUnmounted } from 'vue'
import { useComponentErrorHandling } from './useErrorHandling'
import { useRetry, type RetryOptions } from './useRetry'
import { useLoading } from './useLoading'
import NotificationService from '../services/NotificationService'

export interface WorkspaceErrorState {
  hasError: boolean
  error: Error | null
  errorMessage: string
  canRetry: boolean
  retryCount: number
  maxRetries: number
  isRecoverable: boolean
  lastOperation: string
  timestamp: Date | null
}

export interface WorkspaceLoadingState {
  isLoading: boolean
  loadingMessage: string
  loadingProgress?: number
  loadingDetails: Array<{
    text: string
    status: 'pending' | 'loading' | 'success' | 'error'
    duration?: number
  }>
}

export interface WorkspaceErrorHandlingOptions {
  workspaceName: string
  componentName?: string
  maxRetries?: number
  retryOptions?: Partial<RetryOptions>
  showNotifications?: boolean
  autoRetry?: boolean
  onError?: (error: Error, context: any) => void
  onRetry?: (attempt: number) => void
  onRecover?: () => void
}

export function useWorkspaceErrorHandling(options: WorkspaceErrorHandlingOptions) {
  const {
    workspaceName,
    componentName = 'WorkspaceComponent',
    maxRetries = 3,
    retryOptions = {},
    showNotifications = true,
    autoRetry = false,
    onError,
    onRetry,
    onRecover
  } = options

  // State
  const errorState = ref<WorkspaceErrorState>({
    hasError: false,
    error: null,
    errorMessage: '',
    canRetry: false,
    retryCount: 0,
    maxRetries,
    isRecoverable: true,
    lastOperation: '',
    timestamp: null
  })

  const loadingState = ref<WorkspaceLoadingState>({
    isLoading: false,
    loadingMessage: '',
    loadingProgress: undefined,
    loadingDetails: []
  })

  // Composables
  const errorHandler = useComponentErrorHandling(componentName)
  const { executeWithRetry, isRetrying, currentAttempt, reset: resetRetry } = useRetry({
    maxAttempts: maxRetries,
    ...retryOptions,
    onRetry: (attempt, error) => {
      errorState.value.retryCount = attempt
      if (onRetry) {
        onRetry(attempt)
      }
      if (showNotifications) {
        NotificationService.info(
          'Retrying Operation',
          `Attempting to recover ${workspaceName} (${attempt}/${maxRetries})`
        )
      }
    },
    onMaxAttemptsReached: (error) => {
      errorState.value.canRetry = false
      if (showNotifications) {
        NotificationService.error(
          'Recovery Failed',
          `Unable to recover ${workspaceName} after ${maxRetries} attempts. Please refresh the page or contact support.`
        )
      }
    }
  })

  const { withLoading, isLoading: globalIsLoading } = useLoading(workspaceName)

  // Computed
  const hasError = computed(() => errorState.value.hasError)
  const isLoading = computed(() => loadingState.value.isLoading || globalIsLoading.value)
  const canRetry = computed(() => errorState.value.canRetry && errorState.value.retryCount < maxRetries)

  // Methods
  const handleError = (error: Error, operation: string = 'unknown', context: any = {}) => {
    console.error(`${workspaceName} error in ${operation}:`, error)

    // Update error state
    errorState.value = {
      hasError: true,
      error,
      errorMessage: getUserFriendlyErrorMessage(error),
      canRetry: isRetryableError(error),
      retryCount: currentAttempt.value,
      maxRetries,
      isRecoverable: isRecoverableError(error),
      lastOperation: operation,
      timestamp: new Date()
    }

    // Handle with error service
    errorHandler.handleError(error, {
      operation,
      workspaceName,
      ...context
    })

    // Show notification if enabled
    if (showNotifications) {
      NotificationService.error(
        `${workspaceName} Error`,
        errorState.value.errorMessage,
        {
          persistent: !errorState.value.isRecoverable,
          actions: errorState.value.canRetry ? [
            {
              label: 'Retry',
              action: () => retryLastOperation(),
              style: 'primary'
            }
          ] : undefined
        }
      )
    }

    // Call custom error handler
    if (onError) {
      onError(error, { operation, ...context })
    }

    // Auto-retry if enabled and error is retryable
    if (autoRetry && errorState.value.canRetry && currentAttempt.value === 0) {
      setTimeout(() => {
        retryLastOperation()
      }, 2000) // Wait 2 seconds before auto-retry
    }
  }

  const clearError = () => {
    errorState.value = {
      hasError: false,
      error: null,
      errorMessage: '',
      canRetry: false,
      retryCount: 0,
      maxRetries,
      isRecoverable: true,
      lastOperation: '',
      timestamp: null
    }
    resetRetry()
  }

  const retryLastOperation = async () => {
    if (!canRetry.value) {
      console.warn('Cannot retry: max attempts reached or error not retryable')
      return false
    }

    try {
      // Clear current error state
      const lastOperation = errorState.value.lastOperation
      clearError()

      // Show retry notification
      if (showNotifications) {
        NotificationService.info(
          'Retrying',
          `Attempting to recover ${workspaceName}...`
        )
      }

      return true
    } catch (retryError) {
      handleError(
        retryError instanceof Error ? retryError : new Error('Retry failed'),
        'retry_operation'
      )
      return false
    }
  }

  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown',
    context: any = {}
  ): Promise<T | null> => {
    try {
      clearError()
      return await operation()
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error(String(error)),
        operationName,
        context
      )
      return null
    }
  }

  const withRetryableOperation = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown',
    context: any = {}
  ): Promise<T | null> => {
    try {
      clearError()
      return await executeWithRetry(operation)
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error(String(error)),
        operationName,
        context
      )
      return null
    }
  }

  const withLoadingAndErrorHandling = async <T>(
    operation: () => Promise<T>,
    loadingMessage: string,
    operationName: string = 'unknown',
    context: any = {}
  ): Promise<T | null> => {
    return withLoading(
      () => withErrorHandling(operation, operationName, context),
      loadingMessage
    )
  }

  // Loading state management
  const setLoading = (loading: boolean, message: string = '', progress?: number) => {
    loadingState.value.isLoading = loading
    loadingState.value.loadingMessage = message
    loadingState.value.loadingProgress = progress
  }

  const addLoadingDetail = (text: string, status: 'pending' | 'loading' | 'success' | 'error' = 'pending') => {
    loadingState.value.loadingDetails.push({
      text,
      status,
      duration: undefined
    })
  }

  const updateLoadingDetail = (index: number, status: 'pending' | 'loading' | 'success' | 'error', duration?: number) => {
    if (loadingState.value.loadingDetails[index]) {
      loadingState.value.loadingDetails[index].status = status
      if (duration !== undefined) {
        loadingState.value.loadingDetails[index].duration = duration
      }
    }
  }

  const clearLoadingDetails = () => {
    loadingState.value.loadingDetails = []
  }

  // Recovery methods
  const recover = async () => {
    try {
      clearError()
      if (onRecover) {
        await onRecover()
      }
      if (showNotifications) {
        NotificationService.success(
          'Recovery Successful',
          `${workspaceName} has been recovered successfully.`
        )
      }
    } catch (recoveryError) {
      handleError(
        recoveryError instanceof Error ? recoveryError : new Error('Recovery failed'),
        'recovery_operation'
      )
    }
  }

  const resetWorkspace = async () => {
    try {
      // Clear all state
      clearError()
      clearLoadingDetails()
      setLoading(false)

      // Clear local storage for this workspace
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(workspaceName.toLowerCase())) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))

      if (showNotifications) {
        NotificationService.success(
          'Workspace Reset',
          `${workspaceName} has been reset successfully.`
        )
      }
    } catch (resetError) {
      handleError(
        resetError instanceof Error ? resetError : new Error('Reset failed'),
        'reset_operation'
      )
    }
  }

  // Utility functions
  const getUserFriendlyErrorMessage = (error: Error): string => {
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return 'The operation timed out. Please try again.'
    }
    if (error.message.includes('validation')) {
      return 'Invalid input provided. Please check your data and try again.'
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action.'
    }
    if (error.message.includes('not found')) {
      return 'The requested resource could not be found.'
    }
    
    return error.message || 'An unexpected error occurred. Please try again.'
  }

  const isRetryableError = (error: Error): boolean => {
    // Network errors are retryable
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return true
    }
    // Timeout errors are retryable
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true
    }
    // Server errors (5xx) are retryable
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return true
    }
    // Rate limit errors are retryable
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true
    }
    
    return false
  }

  const isRecoverableError = (error: Error): boolean => {
    // Authentication errors are not recoverable without user action
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return false
    }
    // Permission errors are not recoverable
    if (error.message.includes('403') || error.message.includes('forbidden')) {
      return false
    }
    // Most other errors are recoverable
    return true
  }

  // Cleanup
  onUnmounted(() => {
    clearError()
    clearLoadingDetails()
  })

  return {
    // State
    errorState: computed(() => errorState.value),
    loadingState: computed(() => loadingState.value),
    hasError,
    isLoading,
    canRetry,
    isRetrying,

    // Error handling
    handleError,
    clearError,
    retryLastOperation,
    withErrorHandling,
    withRetryableOperation,
    withLoadingAndErrorHandling,

    // Loading management
    setLoading,
    addLoadingDetail,
    updateLoadingDetail,
    clearLoadingDetails,

    // Recovery
    recover,
    resetWorkspace,

    // Utilities
    getUserFriendlyErrorMessage,
    isRetryableError,
    isRecoverableError
  }
}

export default useWorkspaceErrorHandling