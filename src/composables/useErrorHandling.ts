import { ref, computed } from 'vue'
import ErrorHandlingService, { type ErrorInfo, type ErrorContext, ErrorCategory } from '../services/ErrorHandlingService'

/**
 * Composable for error handling
 */
export function useErrorHandling() {
  const lastError = ref<ErrorInfo | null>(null)
  const errorHistory = computed(() => ErrorHandlingService.getErrorHistory())
  const errorStats = computed(() => ErrorHandlingService.getErrorStats())

  /**
   * Handle an error with context
   */
  const handleError = (error: any, context: Partial<ErrorContext> = {}) => {
    const fullContext: ErrorContext = {
      operation: 'unknown',
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    }

    const errorInfo = ErrorHandlingService.handleError(error, fullContext)
    lastError.value = errorInfo
    return errorInfo
  }

  /**
   * Handle async operation with error handling
   */
  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      handleError(error, context)
      return null
    }
  }

  /**
   * Create error handler for specific operation
   */
  const createErrorHandler = (operationName: string, component?: string) => {
    return (error: any, additionalContext: Partial<ErrorContext> = {}) => {
      return handleError(error, {
        operation: operationName,
        component,
        ...additionalContext
      })
    }
  }

  /**
   * Handle network errors specifically
   */
  const handleNetworkError = (error: any, context: Partial<ErrorContext> = {}) => {
    return handleError(error, {
      ...context,
      operation: context.operation || 'network_request'
    })
  }

  /**
   * Handle validation errors specifically
   */
  const handleValidationError = (error: any, context: Partial<ErrorContext> = {}) => {
    return handleError(error, {
      ...context,
      operation: context.operation || 'validation'
    })
  }

  /**
   * Handle API errors specifically
   */
  const handleApiError = (error: any, context: Partial<ErrorContext> = {}) => {
    return handleError(error, {
      ...context,
      operation: context.operation || 'api_request'
    })
  }

  /**
   * Clear error history
   */
  const clearErrors = () => {
    ErrorHandlingService.clearErrorHistory()
    lastError.value = null
  }

  /**
   * Check if error is recoverable
   */
  const isRecoverable = (error: ErrorInfo) => {
    return error.isRecoverable
  }

  /**
   * Check if error can be retried
   */
  const canRetry = (error: ErrorInfo) => {
    return error.canRetry
  }

  /**
   * Get errors by category
   */
  const getErrorsByCategory = (category: ErrorCategory) => {
    return errorHistory.value.filter(({ error }) => error.category === category)
  }

  /**
   * Get recent errors
   */
  const getRecentErrors = (limit: number = 10) => {
    return errorHistory.value.slice(0, limit)
  }

  /**
   * Check if there are critical errors
   */
  const hasCriticalErrors = computed(() => {
    return errorHistory.value.some(({ error }) => 
      !error.isRecoverable && 
      [ErrorCategory.SERVER, ErrorCategory.CLIENT, ErrorCategory.UNKNOWN].includes(error.category)
    )
  })

  /**
   * Get error count by category
   */
  const getErrorCount = (category?: ErrorCategory) => {
    if (!category) {
      return errorHistory.value.length
    }
    return errorHistory.value.filter(({ error }) => error.category === category).length
  }

  return {
    // State
    lastError,
    errorHistory,
    errorStats,
    hasCriticalErrors,

    // Methods
    handleError,
    withErrorHandling,
    createErrorHandler,
    handleNetworkError,
    handleValidationError,
    handleApiError,
    clearErrors,
    
    // Utilities
    isRecoverable,
    canRetry,
    getErrorsByCategory,
    getRecentErrors,
    getErrorCount,
    
    // Error categories for convenience
    ErrorCategory
  }
}

/**
 * Composable for component-specific error handling
 */
export function useComponentErrorHandling(componentName: string) {
  const { handleError, withErrorHandling, ...rest } = useErrorHandling()

  const handleComponentError = (error: any, operation: string = 'unknown', additionalContext: Partial<ErrorContext> = {}) => {
    return handleError(error, {
      component: componentName,
      operation,
      ...additionalContext
    })
  }

  const withComponentErrorHandling = async <T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T | null> => {
    return withErrorHandling(operation, {
      component: componentName,
      operation: operationName
    })
  }

  return {
    ...rest,
    handleError: handleComponentError,
    withErrorHandling: withComponentErrorHandling
  }
}

export default useErrorHandling