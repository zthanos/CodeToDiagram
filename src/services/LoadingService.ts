import { reactive, ref } from 'vue'

export interface LoadingState {
  id: string
  message: string
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
  startTime: Date
}

class LoadingServiceClass {
  private loadingStates = reactive<Map<string, LoadingState>>(new Map())
  private nextId = 1

  /**
   * Start a loading operation
   */
  start(message: string, options?: {
    id?: string
    progress?: number
    cancellable?: boolean
    onCancel?: () => void
  }): string {
    const id = options?.id || `loading-${this.nextId++}`
    
    const loadingState: LoadingState = {
      id,
      message,
      progress: options?.progress,
      cancellable: options?.cancellable || false,
      onCancel: options?.onCancel,
      startTime: new Date()
    }
    
    this.loadingStates.set(id, loadingState)
    return id
  }

  /**
   * Update a loading operation
   */
  update(id: string, updates: Partial<Pick<LoadingState, 'message' | 'progress'>>) {
    const state = this.loadingStates.get(id)
    if (state) {
      Object.assign(state, updates)
    }
  }

  /**
   * Update progress for a loading operation
   */
  setProgress(id: string, progress: number) {
    this.update(id, { progress })
  }

  /**
   * Update message for a loading operation
   */
  setMessage(id: string, message: string) {
    this.update(id, { message })
  }

  /**
   * Stop a loading operation
   */
  stop(id: string) {
    this.loadingStates.delete(id)
  }

  /**
   * Stop all loading operations
   */
  stopAll() {
    this.loadingStates.clear()
  }

  /**
   * Get a specific loading state
   */
  getState(id: string): LoadingState | undefined {
    return this.loadingStates.get(id)
  }

  /**
   * Get all loading states
   */
  getAllStates(): LoadingState[] {
    return Array.from(this.loadingStates.values())
  }

  /**
   * Check if any loading operation is active
   */
  isLoading(): boolean {
    return this.loadingStates.size > 0
  }

  /**
   * Check if a specific loading operation is active
   */
  isLoadingId(id: string): boolean {
    return this.loadingStates.has(id)
  }

  /**
   * Get loading states by category/prefix
   */
  getStatesByPrefix(prefix: string): LoadingState[] {
    return Array.from(this.loadingStates.values())
      .filter(state => state.id.startsWith(prefix))
  }

  /**
   * Convenience method for backend operations
   */
  async withLoading<T>(
    operation: () => Promise<T>,
    message: string,
    options?: {
      id?: string
      onProgress?: (progress: number) => void
      cancellable?: boolean
    }
  ): Promise<T> {
    const id = this.start(message, {
      id: options?.id,
      cancellable: options?.cancellable
    })

    try {
      const result = await operation()
      return result
    } finally {
      this.stop(id)
    }
  }

  /**
   * Convenience method for operations with progress
   */
  async withProgressLoading<T>(
    operation: (updateProgress: (progress: number) => void) => Promise<T>,
    message: string,
    options?: {
      id?: string
      cancellable?: boolean
      onCancel?: () => void
    }
  ): Promise<T> {
    const id = this.start(message, {
      id: options?.id,
      progress: 0,
      cancellable: options?.cancellable,
      onCancel: options?.onCancel
    })

    try {
      const updateProgress = (progress: number) => {
        this.setProgress(id, progress)
      }

      const result = await operation(updateProgress)
      return result
    } finally {
      this.stop(id)
    }
  }

  /**
   * Create a scoped loading manager for a specific component/feature
   */
  createScope(prefix: string) {
    return {
      start: (message: string, options?: Omit<Parameters<typeof this.start>[1], 'id'>) => {
        return this.start(message, { ...options, id: `${prefix}-${this.nextId++}` })
      },
      
      update: (id: string, updates: Parameters<typeof this.update>[1]) => {
        this.update(id, updates)
      },
      
      stop: (id: string) => {
        this.stop(id)
      },
      
      getStates: () => {
        return this.getStatesByPrefix(prefix)
      },
      
      isLoading: () => {
        return this.getStatesByPrefix(prefix).length > 0
      },
      
      withLoading: <T>(
        operation: () => Promise<T>,
        message: string,
        options?: Omit<Parameters<typeof this.withLoading>[2], 'id'>
      ) => {
        return this.withLoading(operation, message, {
          ...options,
          id: `${prefix}-${this.nextId++}`
        })
      }
    }
  }
}

// Create singleton instance
export const LoadingService = new LoadingServiceClass()

// Export for use in components
export default LoadingService