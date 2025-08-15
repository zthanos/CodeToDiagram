/**
 * Composable for comprehensive requirements validation
 * Requirements: 4.5, 5.3, 6.2
 */

import { ref, computed, watch } from 'vue'
import { 
  RequirementItemValidator, 
  PdfValidator, 
  BrdContentValidator,
  DocumentStatusValidator,
  FormValidator,
  NetworkValidator,
  ValidationUtils,
  type ValidationResult,
  type ValidationError,
  type ValidationContext,
  type FormValidationState
} from '../utils/validation'
import type { RequirementItem } from '../types/requirements'
import { useComponentErrorHandling } from './useErrorHandling'
import NotificationService from '../services/NotificationService'

/**
 * Composable for requirement item validation
 */
export function useRequirementItemValidation(componentName: string = 'RequirementItem') {
  const errorHandler = useComponentErrorHandling(componentName)
  const formValidator = new FormValidator()
  
  // Validation state
  const isValidating = ref(false)
  const validationErrors = ref<Record<string, ValidationError[]>>({})
  const validationWarnings = ref<Record<string, ValidationError[]>>({})
  const hasValidationErrors = computed(() => 
    Object.values(validationErrors.value).some(errors => errors.length > 0)
  )
  const hasValidationWarnings = computed(() => 
    Object.values(validationWarnings.value).some(warnings => warnings.length > 0)
  )

  // Register validators
  formValidator.registerValidator('title', (value: string, context?: ValidationContext) => {
    const errors = RequirementItemValidator.validateTitle(value, context)
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      hasErrors: errors.length > 0,
      hasWarnings: false
    }
  })
  
  formValidator.registerValidator('description', (value: string, context?: ValidationContext) => {
    const errors = RequirementItemValidator.validateDescription(value, context)
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      hasErrors: errors.length > 0,
      hasWarnings: false
    }
  })
  
  formValidator.registerValidator('status', (value: string, context?: ValidationContext) => {
    const errors = RequirementItemValidator.validateStatus(value, context)
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      hasErrors: errors.length > 0,
      hasWarnings: false
    }
  })
  
  formValidator.registerValidator('priority', (value: string, context?: ValidationContext) => {
    const errors = RequirementItemValidator.validatePriority(value, context)
    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      hasErrors: errors.length > 0,
      hasWarnings: false
    }
  })

  /**
   * Validate a single field
   */
  const validateField = (fieldName: string, value: any, context?: ValidationContext): ValidationResult => {
    try {
      const result = formValidator.validateField(fieldName, value, context)
      
      // Update validation state
      validationErrors.value[fieldName] = result.errors
      validationWarnings.value[fieldName] = result.warnings || []
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'field_validation',
        additionalInfo: { fieldName, value }
      })
      
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: fieldName,
          message: 'Validation failed due to an internal error',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
      
      validationErrors.value[fieldName] = errorResult.errors
      return errorResult
    }
  }

  /**
   * Validate entire requirement item
   */
  const validateRequirementItem = (item: Partial<RequirementItem>, context?: ValidationContext): ValidationResult => {
    try {
      const result = RequirementItemValidator.validateRequirementItem({
        title: item.title || '',
        description: item.description || '',
        status: item.status || 'new',
        priority: item.priority || 'medium'
      }, context)
      
      // Update validation state
      const errorsByField = ValidationUtils.groupErrorsByField(result.errors)
      const warningsByField = ValidationUtils.groupErrorsByField(result.warnings || [])
      
      validationErrors.value = errorsByField
      validationWarnings.value = warningsByField
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'item_validation',
        additionalInfo: { item }
      })
      
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation failed due to an internal error',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
    }
  }

  /**
   * Validate requirement item asynchronously
   */
  const validateRequirementItemAsync = async (item: Partial<RequirementItem>, context?: ValidationContext): Promise<ValidationResult> => {
    isValidating.value = true
    
    try {
      const result = await RequirementItemValidator.validateRequirementItemAsync({
        title: item.title || '',
        description: item.description || '',
        status: item.status || 'new',
        priority: item.priority || 'medium'
      }, context)
      
      // Update validation state
      const errorsByField = ValidationUtils.groupErrorsByField(result.errors)
      const warningsByField = ValidationUtils.groupErrorsByField(result.warnings || [])
      
      validationErrors.value = errorsByField
      validationWarnings.value = warningsByField
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'async_item_validation',
        additionalInfo: { item }
      })
      
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Async validation failed due to an internal error',
          code: 'ASYNC_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Get validation errors for a specific field
   */
  const getFieldErrors = (fieldName: string): ValidationError[] => {
    return validationErrors.value[fieldName] || []
  }

  /**
   * Get validation warnings for a specific field
   */
  const getFieldWarnings = (fieldName: string): ValidationError[] => {
    return validationWarnings.value[fieldName] || []
  }

  /**
   * Check if a field has errors
   */
  const hasFieldErrors = (fieldName: string): boolean => {
    return getFieldErrors(fieldName).length > 0
  }

  /**
   * Check if a field has warnings
   */
  const hasFieldWarnings = (fieldName: string): boolean => {
    return getFieldWarnings(fieldName).length > 0
  }

  /**
   * Clear validation for a specific field
   */
  const clearFieldValidation = (fieldName: string): void => {
    delete validationErrors.value[fieldName]
    delete validationWarnings.value[fieldName]
  }

  /**
   * Clear all validation
   */
  const clearValidation = (): void => {
    validationErrors.value = {}
    validationWarnings.value = {}
    formValidator.clearValidation()
  }

  /**
   * Get formatted error message for a field
   */
  const getFieldErrorMessage = (fieldName: string): string => {
    const errors = getFieldErrors(fieldName)
    return ValidationUtils.formatValidationErrors(errors)
  }

  /**
   * Get formatted warning message for a field
   */
  const getFieldWarningMessage = (fieldName: string): string => {
    const warnings = getFieldWarnings(fieldName)
    return ValidationUtils.formatValidationErrors(warnings)
  }

  return {
    // State
    isValidating,
    validationErrors: computed(() => validationErrors.value),
    validationWarnings: computed(() => validationWarnings.value),
    hasValidationErrors,
    hasValidationWarnings,
    
    // Methods
    validateField,
    validateRequirementItem,
    validateRequirementItemAsync,
    getFieldErrors,
    getFieldWarnings,
    hasFieldErrors,
    hasFieldWarnings,
    clearFieldValidation,
    clearValidation,
    getFieldErrorMessage,
    getFieldWarningMessage,
    
    // Form validator instance
    formValidator
  }
}

/**
 * Composable for PDF file validation
 */
export function usePdfValidation(componentName: string = 'PdfUpload') {
  const errorHandler = useComponentErrorHandling(componentName)
  
  // Validation state
  const isValidating = ref(false)
  const validationResult = ref<ValidationResult | null>(null)
  const lastValidatedFile = ref<File | null>(null)

  /**
   * Validate PDF file synchronously
   */
  const validatePdfFile = (file: File | null, context?: ValidationContext): ValidationResult => {
    try {
      if (!file) {
        const result: ValidationResult = {
          isValid: false,
          errors: [{
            field: 'file',
            message: 'Please select a PDF file',
            code: 'FILE_REQUIRED',
            severity: 'error'
          }],
          warnings: [],
          hasErrors: true,
          hasWarnings: false
        }
        validationResult.value = result
        return result
      }

      const result = PdfValidator.validatePdfFile(file, context)
      validationResult.value = result
      lastValidatedFile.value = file
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'pdf_validation',
        additionalInfo: { fileName: file?.name, fileSize: file?.size }
      })
      
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: 'file',
          message: 'PDF validation failed due to an internal error',
          code: 'PDF_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
      
      validationResult.value = errorResult
      return errorResult
    }
  }

  /**
   * Validate PDF file asynchronously with content checks
   */
  const validatePdfFileAsync = async (file: File | null, context?: ValidationContext): Promise<ValidationResult> => {
    isValidating.value = true
    
    try {
      if (!file) {
        const result: ValidationResult = {
          isValid: false,
          errors: [{
            field: 'file',
            message: 'Please select a PDF file',
            code: 'FILE_REQUIRED',
            severity: 'error'
          }],
          warnings: [],
          hasErrors: true,
          hasWarnings: false
        }
        validationResult.value = result
        return result
      }

      const result = await PdfValidator.validatePdfFileAsync(file, context)
      validationResult.value = result
      lastValidatedFile.value = file
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'async_pdf_validation',
        additionalInfo: { fileName: file?.name, fileSize: file?.size }
      })
      
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: 'file',
          message: 'Async PDF validation failed due to an internal error',
          code: 'ASYNC_PDF_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
      
      validationResult.value = errorResult
      return errorResult
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Check if current validation result is valid
   */
  const isValid = computed(() => validationResult.value?.isValid ?? false)

  /**
   * Get validation errors
   */
  const errors = computed(() => validationResult.value?.errors ?? [])

  /**
   * Get validation warnings
   */
  const warnings = computed(() => validationResult.value?.warnings ?? [])

  /**
   * Get formatted error message
   */
  const errorMessage = computed(() => {
    return ValidationUtils.formatValidationErrors(errors.value)
  })

  /**
   * Get formatted warning message
   */
  const warningMessage = computed(() => {
    return ValidationUtils.formatValidationErrors(warnings.value)
  })

  /**
   * Clear validation
   */
  const clearValidation = (): void => {
    validationResult.value = null
    lastValidatedFile.value = null
  }

  return {
    // State
    isValidating,
    validationResult: computed(() => validationResult.value),
    lastValidatedFile: computed(() => lastValidatedFile.value),
    isValid,
    errors,
    warnings,
    errorMessage,
    warningMessage,
    
    // Methods
    validatePdfFile,
    validatePdfFileAsync,
    clearValidation
  }
}

/**
 * Composable for BRD content validation
 */
export function useBrdContentValidation(componentName: string = 'BrdEditor') {
  const errorHandler = useComponentErrorHandling(componentName)
  
  // Validation state
  const validationResult = ref<ValidationResult | null>(null)
  const lastValidatedContent = ref<string>('')

  /**
   * Validate BRD content
   */
  const validateContent = (content: string, context?: ValidationContext): ValidationResult => {
    try {
      const result = BrdContentValidator.validateContent(content)
      validationResult.value = result
      lastValidatedContent.value = content
      
      return result
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'brd_content_validation',
        additionalInfo: { contentLength: content?.length }
      })
      
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: 'content',
          message: 'Content validation failed due to an internal error',
          code: 'CONTENT_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
      
      validationResult.value = errorResult
      return errorResult
    }
  }

  /**
   * Validate document status
   */
  const validateStatus = (status: string, context?: ValidationContext): ValidationResult => {
    try {
      return DocumentStatusValidator.validateStatus(status)
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'status_validation',
        additionalInfo: { status }
      })
      
      return {
        isValid: false,
        errors: [{
          field: 'status',
          message: 'Status validation failed due to an internal error',
          code: 'STATUS_VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: [],
        hasErrors: true,
        hasWarnings: false
      }
    }
  }

  /**
   * Check if current validation result is valid
   */
  const isValid = computed(() => validationResult.value?.isValid ?? true)

  /**
   * Get validation errors
   */
  const errors = computed(() => validationResult.value?.errors ?? [])

  /**
   * Get validation warnings
   */
  const warnings = computed(() => validationResult.value?.warnings ?? [])

  /**
   * Clear validation
   */
  const clearValidation = (): void => {
    validationResult.value = null
    lastValidatedContent.value = ''
  }

  return {
    // State
    validationResult: computed(() => validationResult.value),
    lastValidatedContent: computed(() => lastValidatedContent.value),
    isValid,
    errors,
    warnings,
    
    // Methods
    validateContent,
    validateStatus,
    clearValidation
  }
}

/**
 * Composable for network connectivity validation
 */
export function useNetworkValidation() {
  const isOnline = ref(NetworkValidator.isNetworkAvailable())
  const lastNetworkCheck = ref<Date>(new Date())
  
  // Network status monitoring
  const handleNetworkChange = (online: boolean) => {
    isOnline.value = online
    lastNetworkCheck.value = new Date()
    
    if (online) {
      NotificationService.success('Network Restored', 'Your internet connection has been restored.')
    } else {
      NotificationService.warning('Network Offline', 'You are currently offline. Some features may not work properly.')
    }
  }

  // Set up network listeners
  NetworkValidator.addNetworkListener(handleNetworkChange)

  /**
   * Validate network connectivity for an operation
   */
  const validateNetworkForOperation = (operation: string = 'operation'): ValidationResult => {
    return NetworkValidator.validateNetworkConnectivity(operation)
  }

  /**
   * Check if network is required for operation and validate
   */
  const requireNetworkForOperation = (operation: string): boolean => {
    const result = validateNetworkForOperation(operation)
    
    if (!result.isValid) {
      NotificationService.error(
        'Network Required',
        `Cannot perform ${operation} while offline. Please check your internet connection.`
      )
    }
    
    return result.isValid
  }

  return {
    // State
    isOnline: computed(() => isOnline.value),
    lastNetworkCheck: computed(() => lastNetworkCheck.value),
    
    // Methods
    validateNetworkForOperation,
    requireNetworkForOperation,
    
    // Utilities
    addNetworkListener: NetworkValidator.addNetworkListener,
    removeNetworkListener: NetworkValidator.removeNetworkListener
  }
}

/**
 * Main composable that combines all validation functionality
 */
export function useRequirementsValidation(componentName: string = 'RequirementsWorkspace') {
  const requirementValidation = useRequirementItemValidation(componentName)
  const pdfValidation = usePdfValidation(componentName)
  const brdValidation = useBrdContentValidation(componentName)
  const networkValidation = useNetworkValidation()
  
  return {
    // Requirement item validation
    requirement: requirementValidation,
    
    // PDF validation
    pdf: pdfValidation,
    
    // BRD content validation
    brd: brdValidation,
    
    // Network validation
    network: networkValidation,
    
    // Utility functions
    ValidationUtils
  }
}

export default useRequirementsValidation