import NotificationService from './NotificationService'
import { useDialog } from '../composables/useDialog'

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  category: ErrorCategory
  title: string
  message: string
  userMessage: string
  suggestedActions: ErrorAction[]
  canRetry: boolean
  isRecoverable: boolean
  technicalDetails?: string
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  style?: 'primary' | 'secondary'
  icon?: string
}

export interface ErrorContext {
  operation: string
  component?: string
  userId?: string
  projectId?: string
  diagramId?: string
  timestamp: Date
  userAgent?: string
  url?: string
}

class ErrorHandlingServiceClass {
  private errorHistory: Array<{ error: ErrorInfo; context: ErrorContext }> = []
  private maxHistorySize = 100

  /**
   * Categorize and handle an error
   */
  handleError(error: any, context: ErrorContext): ErrorInfo {
    const errorInfo = this.categorizeError(error)
    
    // Add to error history
    this.addToHistory(errorInfo, context)
    
    // Show appropriate user notification
    this.showErrorNotification(errorInfo, context)
    
    return errorInfo
  }

  /**
   * Categorize an error and provide user guidance
   */
  categorizeError(error: any): ErrorInfo {
    // Network errors
    if (this.isNetworkError(error)) {
      return this.createNetworkErrorInfo(error)
    }
    
    // HTTP status code errors
    if (error.response?.status) {
      return this.createHttpErrorInfo(error)
    }
    
    // Validation errors
    if (this.isValidationError(error)) {
      return this.createValidationErrorInfo(error)
    }
    
    // Timeout errors
    if (this.isTimeoutError(error)) {
      return this.createTimeoutErrorInfo(error)
    }
    
    // Client-side errors
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return this.createClientErrorInfo(error)
    }
    
    // Unknown errors
    return this.createUnknownErrorInfo(error)
  }

  /**
   * Show error notification with appropriate actions
   */
  private showErrorNotification(errorInfo: ErrorInfo, context: ErrorContext) {
    if (errorInfo.canRetry && errorInfo.suggestedActions.length > 0) {
      NotificationService.error(errorInfo.title, errorInfo.userMessage, {
        actions: errorInfo.suggestedActions.map(action => ({
          label: action.label,
          action: action.action,
          style: action.style || 'secondary'
        })),
        persistent: true
      })
    } else {
      NotificationService.error(errorInfo.title, errorInfo.userMessage, {
        persistent: !errorInfo.isRecoverable
      })
    }
  }

  /**
   * Show detailed error dialog for critical errors
   */
  async showDetailedErrorDialog(errorInfo: ErrorInfo, context: ErrorContext): Promise<void> {
    const dialog = useDialog()
    
    await dialog.error(
      errorInfo.title,
      errorInfo.userMessage,
      errorInfo.technicalDetails
    )
  }

  /**
   * Create retry action with exponential backoff
   */
  createRetryAction(
    operation: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): ErrorAction {
    let retryCount = 0
    
    const retryWithBackoff = async () => {
      if (retryCount >= maxRetries) {
        NotificationService.error('Retry Failed', 'Maximum retry attempts reached')
        return
      }
      
      retryCount++
      const delay = baseDelay * Math.pow(2, retryCount - 1)
      
      NotificationService.info('Retrying', `Attempting retry ${retryCount}/${maxRetries}...`)
      
      setTimeout(async () => {
        try {
          await operation()
          NotificationService.success('Retry Successful', 'Operation completed successfully')
        } catch (error) {
          if (retryCount < maxRetries) {
            retryWithBackoff()
          } else {
            NotificationService.error('Retry Failed', 'All retry attempts failed')
          }
        }
      }, delay)
    }
    
    return {
      label: 'Retry',
      action: retryWithBackoff,
      style: 'primary',
      icon: '🔄'
    }
  }

  /**
   * Network error handling
   */
  private isNetworkError(error: any): boolean {
    return !navigator.onLine || 
           error.code === 'NETWORK_ERROR' ||
           error.message?.includes('Network Error') ||
           error.message?.includes('fetch')
  }

  private createNetworkErrorInfo(error: any): ErrorInfo {
    const isOffline = !navigator.onLine
    
    return {
      category: ErrorCategory.NETWORK,
      title: isOffline ? 'No Internet Connection' : 'Network Error',
      message: error.message || 'Network request failed',
      userMessage: isOffline 
        ? 'You appear to be offline. Please check your internet connection and try again.'
        : 'Unable to connect to the server. Please check your internet connection.',
      suggestedActions: [
        {
          label: 'Check Connection',
          action: () => {
            window.open('https://www.google.com', '_blank')
          },
          style: 'secondary',
          icon: '🌐'
        },
        {
          label: 'Retry',
          action: () => window.location.reload(),
          style: 'primary',
          icon: '🔄'
        }
      ],
      canRetry: true,
      isRecoverable: true,
      technicalDetails: `Network Error: ${error.message}\nTimestamp: ${new Date().toISOString()}`
    }
  }

  /**
   * HTTP status code error handling
   */
  private createHttpErrorInfo(error: any): ErrorInfo {
    const status = error.response.status
    const statusText = error.response.statusText || 'Unknown Error'
    
    switch (status) {
      case 400:
        return this.createValidationErrorInfo(error)
      case 401:
        return this.createAuthenticationErrorInfo(error)
      case 403:
        return this.createAuthorizationErrorInfo(error)
      case 404:
        return this.createNotFoundErrorInfo(error)
      case 409:
        return this.createConflictErrorInfo(error)
      case 429:
        return this.createRateLimitErrorInfo(error)
      case 500:
      case 502:
      case 503:
      case 504:
        return this.createServerErrorInfo(error)
      default:
        return this.createUnknownErrorInfo(error)
    }
  }

  /**
   * Validation error handling
   */
  private isValidationError(error: any): boolean {
    return error.response?.status === 400 ||
           error.name === 'ValidationError' ||
           error.message?.includes('validation')
  }

  private createValidationErrorInfo(error: any): ErrorInfo {
    const validationErrors = error.response?.data?.errors || []
    const fieldErrors = validationErrors.map((err: any) => `${err.field}: ${err.message}`).join('\n')
    
    return {
      category: ErrorCategory.VALIDATION,
      title: 'Validation Error',
      message: error.message || 'Invalid input provided',
      userMessage: fieldErrors || 'Please check your input and try again.',
      suggestedActions: [
        {
          label: 'Review Input',
          action: () => {
            // Focus on first invalid field if possible
            const firstInvalidField = document.querySelector('.error, [aria-invalid="true"]') as HTMLElement
            firstInvalidField?.focus()
          },
          style: 'primary',
          icon: '✏️'
        }
      ],
      canRetry: false,
      isRecoverable: true,
      technicalDetails: `Validation Error: ${JSON.stringify(validationErrors, null, 2)}`
    }
  }

  /**
   * Authentication error handling
   */
  private createAuthenticationErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.AUTHENTICATION,
      title: 'Authentication Required',
      message: 'Authentication failed',
      userMessage: 'Your session has expired. Please log in again.',
      suggestedActions: [
        {
          label: 'Log In',
          action: () => {
            // Redirect to login page
            window.location.href = '/login'
          },
          style: 'primary',
          icon: '🔐'
        }
      ],
      canRetry: false,
      isRecoverable: true
    }
  }

  /**
   * Authorization error handling
   */
  private createAuthorizationErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.AUTHORIZATION,
      title: 'Access Denied',
      message: 'Insufficient permissions',
      userMessage: 'You don\'t have permission to perform this action.',
      suggestedActions: [
        {
          label: 'Contact Support',
          action: () => {
            window.open('mailto:support@example.com?subject=Access%20Denied', '_blank')
          },
          style: 'secondary',
          icon: '📧'
        }
      ],
      canRetry: false,
      isRecoverable: false
    }
  }

  /**
   * Not found error handling
   */
  private createNotFoundErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.NOT_FOUND,
      title: 'Not Found',
      message: 'Resource not found',
      userMessage: 'The requested item could not be found. It may have been deleted or moved.',
      suggestedActions: [
        {
          label: 'Go Back',
          action: () => window.history.back(),
          style: 'secondary',
          icon: '⬅️'
        },
        {
          label: 'Refresh',
          action: () => window.location.reload(),
          style: 'primary',
          icon: '🔄'
        }
      ],
      canRetry: true,
      isRecoverable: true
    }
  }

  /**
   * Conflict error handling
   */
  private createConflictErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.CONFLICT,
      title: 'Conflict Detected',
      message: 'Resource conflict',
      userMessage: 'The item has been modified by another user. Please refresh and try again.',
      suggestedActions: [
        {
          label: 'Refresh',
          action: () => window.location.reload(),
          style: 'primary',
          icon: '🔄'
        }
      ],
      canRetry: true,
      isRecoverable: true
    }
  }

  /**
   * Rate limit error handling
   */
  private createRateLimitErrorInfo(error: any): ErrorInfo {
    const retryAfter = error.response?.headers['retry-after'] || 60
    
    return {
      category: ErrorCategory.SERVER,
      title: 'Too Many Requests',
      message: 'Rate limit exceeded',
      userMessage: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
      suggestedActions: [
        {
          label: `Wait ${retryAfter}s`,
          action: () => {
            setTimeout(() => {
              NotificationService.info('Ready', 'You can now try your request again')
            }, retryAfter * 1000)
          },
          style: 'primary',
          icon: '⏱️'
        }
      ],
      canRetry: true,
      isRecoverable: true
    }
  }

  /**
   * Server error handling
   */
  private createServerErrorInfo(error: any): ErrorInfo {
    const status = error.response?.status
    
    return {
      category: ErrorCategory.SERVER,
      title: 'Server Error',
      message: `Server error (${status})`,
      userMessage: 'The server encountered an error. Please try again in a few moments.',
      suggestedActions: [
        this.createRetryAction(async () => {
          // Retry the original operation
          throw new Error('Retry operation not implemented')
        })
      ],
      canRetry: true,
      isRecoverable: true,
      technicalDetails: `HTTP ${status}: ${error.response?.statusText}\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`
    }
  }

  /**
   * Timeout error handling
   */
  private isTimeoutError(error: any): boolean {
    return error.code === 'ECONNABORTED' ||
           error.message?.includes('timeout') ||
           error.name === 'TimeoutError'
  }

  private createTimeoutErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.TIMEOUT,
      title: 'Request Timeout',
      message: 'Request timed out',
      userMessage: 'The request took too long to complete. Please try again.',
      suggestedActions: [
        this.createRetryAction(async () => {
          // Retry the original operation
          throw new Error('Retry operation not implemented')
        })
      ],
      canRetry: true,
      isRecoverable: true
    }
  }

  /**
   * Client error handling
   */
  private createClientErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.CLIENT,
      title: 'Application Error',
      message: error.message || 'Client-side error occurred',
      userMessage: 'An unexpected error occurred in the application. Please refresh the page.',
      suggestedActions: [
        {
          label: 'Refresh Page',
          action: () => window.location.reload(),
          style: 'primary',
          icon: '🔄'
        },
        {
          label: 'Report Bug',
          action: () => {
            const bugReport = `Error: ${error.message}\nStack: ${error.stack}\nURL: ${window.location.href}\nUser Agent: ${navigator.userAgent}`
            window.open(`mailto:support@example.com?subject=Bug%20Report&body=${encodeURIComponent(bugReport)}`, '_blank')
          },
          style: 'secondary',
          icon: '🐛'
        }
      ],
      canRetry: false,
      isRecoverable: true,
      technicalDetails: `${error.name}: ${error.message}\n${error.stack}`
    }
  }

  /**
   * Unknown error handling
   */
  private createUnknownErrorInfo(error: any): ErrorInfo {
    return {
      category: ErrorCategory.UNKNOWN,
      title: 'Unexpected Error',
      message: error.message || 'An unknown error occurred',
      userMessage: 'Something unexpected happened. Please try again or contact support if the problem persists.',
      suggestedActions: [
        {
          label: 'Try Again',
          action: () => window.location.reload(),
          style: 'primary',
          icon: '🔄'
        },
        {
          label: 'Contact Support',
          action: () => {
            window.open('mailto:support@example.com?subject=Unknown%20Error', '_blank')
          },
          style: 'secondary',
          icon: '📧'
        }
      ],
      canRetry: true,
      isRecoverable: true,
      technicalDetails: JSON.stringify(error, null, 2)
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(errorInfo: ErrorInfo, context: ErrorContext) {
    this.errorHistory.unshift({ error: errorInfo, context })
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize)
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): Array<{ error: ErrorInfo; context: ErrorContext }> {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {} as Record<ErrorCategory, number>,
      recent: this.errorHistory.slice(0, 10)
    }
    
    this.errorHistory.forEach(({ error }) => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1
    })
    
    return stats
  }
}

// Create singleton instance
export const ErrorHandlingService = new ErrorHandlingServiceClass()

// Export for use in components
export default ErrorHandlingService