/**
 * Network validation utilities
 */
export class NetworkValidator {
  private static networkListeners: Array<(online: boolean) => void> = []
  private static isInitialized = false

  /**
   * Initialize network monitoring
   */
  static initialize() {
    if (this.isInitialized) return

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.notifyListeners(true)
    })

    window.addEventListener('offline', () => {
      this.notifyListeners(false)
    })

    this.isInitialized = true
  }

  /**
   * Check if network is available
   */
  static isNetworkAvailable(): boolean {
    return navigator.onLine
  }

  /**
   * Add a network status listener
   */
  static addNetworkListener(callback: (online: boolean) => void) {
    this.initialize()
    this.networkListeners.push(callback)
  }

  /**
   * Remove a network status listener
   */
  static removeNetworkListener(callback: (online: boolean) => void) {
    const index = this.networkListeners.indexOf(callback)
    if (index > -1) {
      this.networkListeners.splice(index, 1)
    }
  }

  /**
   * Notify all listeners of network status change
   */
  private static notifyListeners(online: boolean) {
    this.networkListeners.forEach(callback => {
      try {
        callback(online)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  /**
   * Test network connectivity by making a request
   */
  static async testConnectivity(url: string = 'https://www.google.com/favicon.ico'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get network connection info (if available)
   */
  static getConnectionInfo(): {
    type?: string
    effectiveType?: string
    downlink?: number
    rtt?: number
  } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (!connection) {
      return {}
    }

    return {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate required field
   */
  static isRequired(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  }

  /**
   * Validate string length
   */
  static isValidLength(value: string, min: number = 0, max: number = Infinity): boolean {
    const length = value ? value.length : 0
    return length >= min && length <= max
  }

  /**
   * Validate number range
   */
  static isInRange(value: number, min: number = -Infinity, max: number = Infinity): boolean {
    return value >= min && value <= max
  }

  /**
   * Validate file type
   */
  static isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type)
  }

  /**
   * Validate file size
   */
  static isValidFileSize(file: File, maxSizeBytes: number): boolean {
    return file.size <= maxSizeBytes
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
  }

  /**
   * Validate JSON format
   */
  static isValidJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Data validation utilities
 */
export class DataValidator {
  /**
   * Validate object structure
   */
  static validateSchema(data: any, schema: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const [key, rules] of Object.entries(schema)) {
      const value = data[key]

      // Check required fields
      if (rules.required && !InputValidator.isRequired(value)) {
        errors.push(`${key} is required`)
        continue
      }

      // Skip validation if field is not required and empty
      if (!rules.required && !InputValidator.isRequired(value)) {
        continue
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`)
        continue
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`)
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${key} must be no more than ${rules.maxLength} characters`)
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${key} format is invalid`)
        }
        if (rules.email && !InputValidator.isValidEmail(value)) {
          errors.push(`${key} must be a valid email address`)
        }
        if (rules.url && !InputValidator.isValidUrl(value)) {
          errors.push(`${key} must be a valid URL`)
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`)
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must be no more than ${rules.max}`)
        }
      }

      // Array validations
      if (rules.type === 'array') {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push(`${key} must have at least ${rules.minItems} items`)
        }
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push(`${key} must have no more than ${rules.maxItems} items`)
        }
      }

      // Custom validation function
      if (rules.validate && typeof rules.validate === 'function') {
        const customResult = rules.validate(value)
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `${key} is invalid`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedFields: string[]): boolean {
    if (!response || typeof response !== 'object') {
      return false
    }

    return expectedFields.every(field => {
      const keys = field.split('.')
      let current = response

      for (const key of keys) {
        if (current === null || current === undefined || !(key in current)) {
          return false
        }
        current = current[key]
      }

      return true
    })
  }

  /**
   * Validate workspace data integrity
   */
  static validateWorkspaceData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push('Invalid workspace data structure')
      return { valid: false, errors }
    }

    // Validate common workspace fields
    if (data.id && typeof data.id !== 'string') {
      errors.push('Workspace ID must be a string')
    }

    if (data.name && typeof data.name !== 'string') {
      errors.push('Workspace name must be a string')
    }

    if (data.created_at && !this.isValidDate(data.created_at)) {
      errors.push('Invalid created_at date format')
    }

    if (data.updated_at && !this.isValidDate(data.updated_at)) {
      errors.push('Invalid updated_at date format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate date format
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  /**
   * Validate UUID format
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}

/**
 * Error validation utilities
 */
export class ErrorValidator {
  /**
   * Check if error is a network error
   */
  static isNetworkError(error: any): boolean {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.includes('Network Error') ||
      error?.message?.includes('fetch') ||
      !navigator.onLine
    )
  }

  /**
   * Check if error is a timeout error
   */
  static isTimeoutError(error: any): boolean {
    return (
      error?.code === 'ECONNABORTED' ||
      error?.message?.includes('timeout') ||
      error?.name === 'TimeoutError'
    )
  }

  /**
   * Check if error is a validation error
   */
  static isValidationError(error: any): boolean {
    return (
      error?.response?.status === 400 ||
      error?.name === 'ValidationError' ||
      error?.message?.includes('validation')
    )
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (this.isNetworkError(error)) return true
    
    // Timeout errors are retryable
    if (this.isTimeoutError(error)) return true
    
    // Server errors (5xx) are retryable
    const status = error?.response?.status
    if (status >= 500 && status < 600) return true
    
    // Rate limit errors are retryable
    if (status === 429) return true
    
    return false
  }

  /**
   * Extract error message for user display
   */
  static getUserErrorMessage(error: any): string {
    // Network errors
    if (this.isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return 'The request timed out. Please try again.'
    }

    // Validation errors
    if (this.isValidationError(error)) {
      const validationErrors = error?.response?.data?.errors
      if (validationErrors && Array.isArray(validationErrors)) {
        return validationErrors.map((err: any) => err.message || err).join(', ')
      }
      return 'Invalid input provided. Please check your data and try again.'
    }

    // HTTP status errors
    const status = error?.response?.status
    if (status) {
      switch (status) {
        case 401:
          return 'Authentication required. Please log in again.'
        case 403:
          return 'You don\'t have permission to perform this action.'
        case 404:
          return 'The requested resource could not be found.'
        case 409:
          return 'A conflict occurred. The resource may have been modified by another user.'
        case 429:
          return 'Too many requests. Please wait a moment and try again.'
        case 500:
          return 'A server error occurred. Please try again later.'
        case 502:
        case 503:
        case 504:
          return 'The server is temporarily unavailable. Please try again later.'
        default:
          return `Server error (${status}). Please try again.`
      }
    }

    // Generic error message
    return error?.message || 'An unexpected error occurred. Please try again.'
  }
}

// Initialize network monitoring when module loads
NetworkValidator.initialize()