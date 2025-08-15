/**
 * Tests for requirements validation composables
 * Requirements: 4.5, 5.3, 6.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import {
  useRequirementItemValidation,
  usePdfValidation,
  useBrdContentValidation,
  useNetworkValidation,
  useRequirementsValidation
} from '../../composables/useRequirementsValidation'

// Mock the error handling composable
vi.mock('../composables/useErrorHandling', () => ({
  useComponentErrorHandling: () => ({
    handleError: vi.fn()
  })
}))

// Mock the notification service
vi.mock('../../services/NotificationService', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

describe('useRequirementItemValidation', () => {
  let validation: ReturnType<typeof useRequirementItemValidation>

  beforeEach(() => {
    validation = useRequirementItemValidation('TestComponent')
  })

  describe('validateField', () => {
    it('should validate title field', () => {
      const result = validation.validateField('title', 'Valid title')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate empty title field', () => {
      const result = validation.validateField('title', '')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('TITLE_REQUIRED')
    })

    it('should validate description field', () => {
      const result = validation.validateField('description', 'Valid description')
      expect(result.isValid).toBe(true)
    })

    it('should validate status field', () => {
      const result = validation.validateField('status', 'new')
      expect(result.isValid).toBe(true)
    })

    it('should validate priority field', () => {
      const result = validation.validateField('priority', 'high')
      expect(result.isValid).toBe(true)
    })

    it('should return valid result for unregistered field', () => {
      const result = validation.validateField('unknown', 'value')
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateRequirementItem', () => {
    it('should validate complete valid requirement item', () => {
      const item = {
        title: 'Valid title',
        description: 'Valid description',
        status: 'new' as const,
        priority: 'medium' as const
      }
      
      const result = validation.validateRequirementItem(item)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate incomplete requirement item', () => {
      const item = {
        title: '',
        description: '',
        status: 'invalid' as any,
        priority: 'invalid' as any
      }
      
      const result = validation.validateRequirementItem(item)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle partial requirement item', () => {
      const item = {
        title: 'Valid title'
      }
      
      const result = validation.validateRequirementItem(item)
      expect(result.errors.some(e => e.field === 'description')).toBe(true)
    })
  })

  describe('validateRequirementItemAsync', () => {
    it('should validate requirement item asynchronously', async () => {
      const item = {
        title: 'Valid title',
        description: 'Valid description',
        status: 'new' as const,
        priority: 'medium' as const
      }
      
      const result = await validation.validateRequirementItemAsync(item)
      expect(result.isValid).toBe(true)
    })

    it('should set validating state during async validation', async () => {
      const item = {
        title: 'Valid title',
        description: 'Valid description',
        status: 'new' as const,
        priority: 'medium' as const
      }
      
      const promise = validation.validateRequirementItemAsync(item)
      expect(validation.isValidating.value).toBe(true)
      
      await promise
      expect(validation.isValidating.value).toBe(false)
    })
  })

  describe('field error methods', () => {
    beforeEach(() => {
      // Set up some validation errors
      validation.validateField('title', '')
      validation.validateField('description', '')
    })

    it('should get field errors', () => {
      const errors = validation.getFieldErrors('title')
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('TITLE_REQUIRED')
    })

    it('should check if field has errors', () => {
      expect(validation.hasFieldErrors('title')).toBe(true)
      expect(validation.hasFieldErrors('status')).toBe(false)
    })

    it('should get formatted error message', () => {
      const message = validation.getFieldErrorMessage('title')
      expect(message).toContain('required')
    })

    it('should clear field validation', () => {
      validation.clearFieldValidation('title')
      expect(validation.hasFieldErrors('title')).toBe(false)
    })

    it('should clear all validation', () => {
      validation.clearValidation()
      expect(validation.hasValidationErrors.value).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should track validation errors', () => {
      expect(validation.hasValidationErrors.value).toBe(false)
      
      validation.validateField('title', '')
      expect(validation.hasValidationErrors.value).toBe(true)
    })

    it('should track validation warnings', () => {
      expect(validation.hasValidationWarnings.value).toBe(false)
      
      // Create a scenario that generates warnings
      const item = {
        title: 'Title',
        description: 'Title', // Same as title - should generate warning
        status: 'new' as const,
        priority: 'medium' as const
      }
      
      validation.validateRequirementItem(item)
      expect(validation.hasValidationWarnings.value).toBe(true)
    })
  })
})

describe('usePdfValidation', () => {
  let validation: ReturnType<typeof usePdfValidation>
  let mockFile: File

  beforeEach(() => {
    validation = usePdfValidation('TestComponent')
    // Create a file with proper PDF content and size
    const pdfContent = '%PDF-1.4\n' + 'a'.repeat(200) // Make it larger than 100 bytes
    mockFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' })
  })

  describe('validatePdfFile', () => {
    it('should validate valid PDF file', () => {
      const result = validation.validatePdfFile(mockFile)
      expect(result.isValid).toBe(true)
    })

    it('should validate null file', () => {
      const result = validation.validatePdfFile(null)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_REQUIRED')
    })

    it('should validate invalid file type', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = validation.validatePdfFile(invalidFile)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'FILE_INVALID_TYPE')).toBe(true)
    })
  })

  describe('validatePdfFileAsync', () => {
    it('should validate PDF file asynchronously', async () => {
      const result = await validation.validatePdfFileAsync(mockFile)
      expect(result.isValid).toBe(true)
    })

    it('should set validating state during async validation', async () => {
      const promise = validation.validatePdfFileAsync(mockFile)
      expect(validation.isValidating.value).toBe(true)
      
      await promise
      expect(validation.isValidating.value).toBe(false)
    })

    it('should validate null file asynchronously', async () => {
      const result = await validation.validatePdfFileAsync(null)
      expect(result.isValid).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should track validation state', () => {
      expect(validation.isValid.value).toBe(false)
      
      validation.validatePdfFile(mockFile)
      expect(validation.isValid.value).toBe(true)
    })

    it('should provide error and warning messages', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      validation.validatePdfFile(invalidFile)
      
      expect(validation.errorMessage.value).toBeTruthy()
      expect(validation.errors.value.length).toBeGreaterThan(0)
    })

    it('should track last validated file', () => {
      validation.validatePdfFile(mockFile)
      expect(validation.lastValidatedFile.value).toBe(mockFile)
    })
  })

  describe('clearValidation', () => {
    it('should clear validation state', () => {
      validation.validatePdfFile(mockFile)
      expect(validation.isValid.value).toBe(true)
      
      validation.clearValidation()
      expect(validation.validationResult.value).toBe(null)
      expect(validation.lastValidatedFile.value).toBe(null)
    })
  })
})

describe('useBrdContentValidation', () => {
  let validation: ReturnType<typeof useBrdContentValidation>

  beforeEach(() => {
    validation = useBrdContentValidation('TestComponent')
  })

  describe('validateContent', () => {
    it('should validate valid content', () => {
      const result = validation.validateContent('Valid BRD content')
      expect(result.isValid).toBe(true)
    })

    it('should validate empty content', () => {
      const result = validation.validateContent('')
      expect(result.isValid).toBe(true)
    })

    it('should validate content that is too long', () => {
      const longContent = 'a'.repeat(100001)
      const result = validation.validateContent(longContent)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONTENT_TOO_LONG')
    })

    it('should validate dangerous content', () => {
      const dangerousContent = 'Content with <script>alert("xss")</script>'
      const result = validation.validateContent(dangerousContent)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONTENT_UNSAFE')
    })
  })

  describe('validateStatus', () => {
    it('should validate valid status', () => {
      const result = validation.validateStatus('draft')
      expect(result.isValid).toBe(true)
    })

    it('should validate invalid status', () => {
      const result = validation.validateStatus('invalid')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('STATUS_INVALID')
    })
  })

  describe('computed properties', () => {
    it('should track validation state', () => {
      expect(validation.isValid.value).toBe(true)
      
      validation.validateContent('a'.repeat(100001))
      expect(validation.isValid.value).toBe(false)
    })

    it('should track last validated content', () => {
      const content = 'Test content'
      validation.validateContent(content)
      expect(validation.lastValidatedContent.value).toBe(content)
    })
  })

  describe('clearValidation', () => {
    it('should clear validation state', () => {
      validation.validateContent('Test content')
      expect(validation.lastValidatedContent.value).toBe('Test content')
      
      validation.clearValidation()
      expect(validation.validationResult.value).toBe(null)
      expect(validation.lastValidatedContent.value).toBe('')
    })
  })
})

describe('useNetworkValidation', () => {
  let validation: ReturnType<typeof useNetworkValidation>
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
    validation = useNetworkValidation()
  })

  afterEach(() => {
    // Restore original online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine
    })
  })

  describe('network status tracking', () => {
    it('should track online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      
      // Create new instance to pick up the status
      const onlineValidation = useNetworkValidation()
      expect(onlineValidation.isOnline.value).toBe(true)
    })

    it('should track offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      // Create new instance to pick up the status
      const offlineValidation = useNetworkValidation()
      expect(offlineValidation.isOnline.value).toBe(false)
    })
  })

  describe('validateNetworkForOperation', () => {
    it('should validate network for operation when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      
      const result = validation.validateNetworkForOperation('test operation')
      expect(result.isValid).toBe(true)
    })

    it('should fail validation when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      const result = validation.validateNetworkForOperation('test operation')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('NETWORK_OFFLINE')
    })
  })

  describe('requireNetworkForOperation', () => {
    it('should return true when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      
      const result = validation.requireNetworkForOperation('test operation')
      expect(result).toBe(true)
    })

    it('should return false and show notification when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      const result = validation.requireNetworkForOperation('test operation')
      expect(result).toBe(false)
    })
  })

  describe('lastNetworkCheck', () => {
    it('should track last network check time', () => {
      expect(validation.lastNetworkCheck.value).toBeInstanceOf(Date)
    })
  })
})

describe('useRequirementsValidation', () => {
  let validation: ReturnType<typeof useRequirementsValidation>

  beforeEach(() => {
    validation = useRequirementsValidation('TestComponent')
  })

  it('should provide all validation composables', () => {
    expect(validation.requirement).toBeDefined()
    expect(validation.pdf).toBeDefined()
    expect(validation.brd).toBeDefined()
    expect(validation.network).toBeDefined()
    expect(validation.ValidationUtils).toBeDefined()
  })

  it('should provide requirement validation methods', () => {
    expect(validation.requirement.validateField).toBeDefined()
    expect(validation.requirement.validateRequirementItem).toBeDefined()
    expect(validation.requirement.validateRequirementItemAsync).toBeDefined()
  })

  it('should provide PDF validation methods', () => {
    expect(validation.pdf.validatePdfFile).toBeDefined()
    expect(validation.pdf.validatePdfFileAsync).toBeDefined()
  })

  it('should provide BRD validation methods', () => {
    expect(validation.brd.validateContent).toBeDefined()
    expect(validation.brd.validateStatus).toBeDefined()
  })

  it('should provide network validation methods', () => {
    expect(validation.network.validateNetworkForOperation).toBeDefined()
    expect(validation.network.requireNetworkForOperation).toBeDefined()
  })

  describe('integration', () => {
    it('should validate requirement item', () => {
      const item = {
        title: 'Valid title',
        description: 'Valid description',
        status: 'new' as const,
        priority: 'medium' as const
      }
      
      const result = validation.requirement.validateRequirementItem(item)
      expect(result.isValid).toBe(true)
    })

    it('should validate PDF file', () => {
      const pdfContent = '%PDF-1.4\n' + 'a'.repeat(200) // Make it larger than 100 bytes
      const mockFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' })
      const result = validation.pdf.validatePdfFile(mockFile)
      expect(result.isValid).toBe(true)
    })

    it('should validate BRD content', () => {
      const result = validation.brd.validateContent('Valid BRD content')
      expect(result.isValid).toBe(true)
    })

    it('should validate network connectivity', () => {
      const result = validation.network.validateNetworkForOperation('test operation')
      expect(result).toBeDefined()
    })
  })
})