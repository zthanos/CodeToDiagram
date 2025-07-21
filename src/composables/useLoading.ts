import { computed, ref } from 'vue'
import LoadingService, { type LoadingState } from '../services/LoadingService'

/**
 * Composable for managing loading states
 */
export function useLoading(scope?: string) {
  const scopedService = scope ? LoadingService.createScope(scope) : LoadingService

  // Reactive state
  const allStates = computed(() => 
    scope ? scopedService.getStates() : LoadingService.getAllStates()
  )
  
  const isLoading = computed(() => 
    scope ? scopedService.isLoading() : LoadingService.isLoading()
  )

  // Methods
  const start = (message: string, options?: {
    id?: string
    progress?: number
    cancellable?: boolean
    onCancel?: () => void
  }) => {
    return scope 
      ? scopedService.start(message, options)
      : LoadingService.start(message, options)
  }

  const stop = (id: string) => {
    return scope 
      ? scopedService.stop(id)
      : LoadingService.stop(id)
  }

  const update = (id: string, updates: Partial<Pick<LoadingState, 'message' | 'progress'>>) => {
    return scope 
      ? scopedService.update(id, updates)
      : LoadingService.update(id, updates)
  }

  const setProgress = (id: string, progress: number) => {
    LoadingService.setProgress(id, progress)
  }

  const setMessage = (id: string, message: string) => {
    LoadingService.setMessage(id, message)
  }

  const withLoading = async <T>(
    operation: () => Promise<T>,
    message: string,
    options?: {
      id?: string
      onProgress?: (progress: number) => void
      cancellable?: boolean
    }
  ): Promise<T> => {
    return scope 
      ? scopedService.withLoading(operation, message, options)
      : LoadingService.withLoading(operation, message, options)
  }

  const withProgressLoading = async <T>(
    operation: (updateProgress: (progress: number) => void) => Promise<T>,
    message: string,
    options?: {
      id?: string
      cancellable?: boolean
      onCancel?: () => void
    }
  ): Promise<T> => {
    return LoadingService.withProgressLoading(operation, message, options)
  }

  return {
    // State
    allStates,
    isLoading,
    
    // Methods
    start,
    stop,
    update,
    setProgress,
    setMessage,
    withLoading,
    withProgressLoading,
    
    // Utilities
    getState: (id: string) => LoadingService.getState(id),
    isLoadingId: (id: string) => LoadingService.isLoadingId(id),
    stopAll: () => LoadingService.stopAll()
  }
}

/**
 * Composable for a single loading operation
 */
export function useSingleLoading(initialMessage?: string) {
  const loadingId = ref<string | null>(null)
  const message = ref(initialMessage || '')
  const progress = ref<number | undefined>(undefined)
  
  const isLoading = computed(() => 
    loadingId.value ? LoadingService.isLoadingId(loadingId.value) : false
  )

  const start = (msg?: string, options?: {
    progress?: number
    cancellable?: boolean
    onCancel?: () => void
  }) => {
    if (loadingId.value) {
      stop() // Stop existing loading
    }
    
    message.value = msg || message.value
    progress.value = options?.progress
    
    loadingId.value = LoadingService.start(message.value, {
      progress: progress.value,
      cancellable: options?.cancellable,
      onCancel: options?.onCancel
    })
    
    return loadingId.value
  }

  const stop = () => {
    if (loadingId.value) {
      LoadingService.stop(loadingId.value)
      loadingId.value = null
    }
  }

  const updateMessage = (newMessage: string) => {
    message.value = newMessage
    if (loadingId.value) {
      LoadingService.setMessage(loadingId.value, newMessage)
    }
  }

  const updateProgress = (newProgress: number) => {
    progress.value = newProgress
    if (loadingId.value) {
      LoadingService.setProgress(loadingId.value, newProgress)
    }
  }

  const withLoading = async <T>(
    operation: () => Promise<T>,
    msg?: string
  ): Promise<T> => {
    start(msg)
    try {
      return await operation()
    } finally {
      stop()
    }
  }

  return {
    // State
    isLoading,
    message,
    progress,
    
    // Methods
    start,
    stop,
    updateMessage,
    updateProgress,
    withLoading
  }
}

export default useLoading