import { ref, computed } from 'vue'
import NotificationService from '../services/NotificationService'

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  exponentialBackoff?: boolean
  jitter?: boolean
  onRetry?: (attempt: number, error: any) => void
  onMaxAttemptsReached?: (error: any) => void
  shouldRetry?: (error: any, attempt: number) => boolean
}

export interface RetryState {
  isRetrying: boolean
  currentAttempt: number
  maxAttempts: number
  lastError: any
  nextRetryIn: number
}

export function useRetry(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    exponentialBackoff = true,
    jitter = true,
    onRetry,
    onMaxAttemptsReached,
    shouldRetry = (error, attempt) => {
      // Default retry logic - retry on network errors, timeouts, and 5xx errors
      if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNABORTED') return true
      if (error?.response?.status >= 500) return true
      if (error?.message?.includes('timeout')) return true
      return false
    }
  } = options

  const isRetrying = ref(false)
  const currentAttempt = ref(0)
  const lastError = ref<any>(null)
  const nextRetryIn = ref(0)
  const retryTimer = ref<NodeJS.Timeout | null>(null)

  const state = computed<RetryState>(() => ({
    isRetrying: isRetrying.value,
    currentAttempt: currentAttempt.value,
    maxAttempts,
    lastError: lastError.value,
    nextRetryIn: nextRetryIn.value
  }))

  const canRetry = computed(() => {
    return currentAttempt.value < maxAttempts && 
           lastError.value && 
           shouldRetry(lastError.value, currentAttempt.value)
  })

  const calculateDelay = (attempt: number): number => {
    let delay = exponentialBackoff 
      ? baseDelay * Math.pow(2, attempt - 1)
      : baseDelay

    // Add jitter to prevent thundering herd
    if (jitter) {
      delay += Math.random() * 0.1 * delay
    }

    return Math.min(delay, maxDelay)
  }

  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const opts = { ...options, ...customOptions }
    const maxAtts = opts.maxAttempts || maxAttempts
    
    currentAttempt.value = 0
    lastError.value = null
    isRetrying.value = false

    for (let attempt = 1; attempt <= maxAtts; attempt++) {
      currentAttempt.value = attempt

      try {
        const result = await operation()
        
        // Success - reset state
        currentAttempt.value = 0
        lastError.value = null
        isRetrying.value = false
        
        if (attempt > 1) {
          NotificationService.success('Retry Successful', `Operation succeeded after ${attempt} attempts`)
        }
        
        return result
      } catch (error) {
        lastError.value = error
        
        console.error(`Attempt ${attempt}/${maxAtts} failed:`, error)
        
        // Check if we should retry
        const shouldRetryThis = opts.shouldRetry ? opts.shouldRetry(error, attempt) : shouldRetry(error, attempt)
        
        if (attempt < maxAtts && shouldRetryThis) {
          isRetrying.value = true
          
          const delay = calculateDelay(attempt)
          nextRetryIn.value = delay
          
          // Call retry callback
          if (opts.onRetry || onRetry) {
            (opts.onRetry || onRetry)?.(attempt, error)
          }
          
          NotificationService.warning(
            'Retrying Operation',
            `Attempt ${attempt} failed. Retrying in ${Math.round(delay / 1000)} seconds...`
          )
          
          // Wait before retry
          await new Promise(resolve => {
            retryTimer.value = setTimeout(resolve, delay)
          })
          
          nextRetryIn.value = 0
        } else {
          // Max attempts reached or shouldn't retry
          isRetrying.value = false
          
          if (opts.onMaxAttemptsReached || onMaxAttemptsReached) {
            (opts.onMaxAttemptsReached || onMaxAttemptsReached)?.(error)
          }
          
          if (attempt >= maxAtts) {
            NotificationService.error(
              'Operation Failed',
              `Operation failed after ${maxAtts} attempts. Please try again later.`
            )
          }
          
          throw error
        }
      }
    }

    throw lastError.value
  }

  const retryLast = async <T>(operation?: () => Promise<T>): Promise<T | void> => {
    if (!canRetry.value) {
      throw new Error('Cannot retry: no retryable error or max attempts reached')
    }

    if (operation) {
      return executeWithRetry(operation, { maxAttempts: maxAttempts - currentAttempt.value })
    } else {
      throw new Error('No operation provided for retry')
    }
  }

  const reset = () => {
    if (retryTimer.value) {
      clearTimeout(retryTimer.value)
      retryTimer.value = null
    }
    
    isRetrying.value = false
    currentAttempt.value = 0
    lastError.value = null
    nextRetryIn.value = 0
  }

  const createRetryableOperation = <T>(operation: () => Promise<T>, customOptions?: Partial<RetryOptions>) => {
    return () => executeWithRetry(operation, customOptions)
  }

  // Cleanup on unmount
  const cleanup = () => {
    if (retryTimer.value) {
      clearTimeout(retryTimer.value)
    }
  }

  return {
    // State
    state,
    isRetrying,
    currentAttempt,
    lastError,
    nextRetryIn,
    canRetry,

    // Methods
    executeWithRetry,
    retryLast,
    reset,
    createRetryableOperation,
    cleanup,

    // Utilities
    calculateDelay
  }
}

// Utility function for common retry scenarios
export const createNetworkRetry = (options?: Partial<RetryOptions>) => {
  return useRetry({
    maxAttempts: 3,
    baseDelay: 1000,
    exponentialBackoff: true,
    shouldRetry: (error) => {
      return error?.code === 'NETWORK_ERROR' || 
             error?.code === 'ECONNABORTED' ||
             error?.response?.status >= 500 ||
             error?.message?.includes('timeout') ||
             error?.message?.includes('fetch')
    },
    ...options
  })
}

export const createApiRetry = (options?: Partial<RetryOptions>) => {
  return useRetry({
    maxAttempts: 2,
    baseDelay: 2000,
    exponentialBackoff: true,
    shouldRetry: (error) => {
      const status = error?.response?.status
      return status >= 500 || status === 429 || !status // Network errors
    },
    ...options
  })
}

export default useRetry