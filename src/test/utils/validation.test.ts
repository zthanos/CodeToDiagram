/**
 * Comprehensive tests for validation utilities
 * Requirements: 4.5, 5.3, 6.2
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  RequirementItemValidator,
  PdfValidator,
  BrdContentValidator,
  DocumentStatusValidator,
  FormValidator,
  NetworkValidator,
  ValidationUtils,
  type ValidationResult,
  type ValidationError
} from '../../utils/validation'

describe('RequirementItemValidator', () => {
  describe('validateTitle', () => {
    it('should pass validation for valid title', () => {
      const result = RequirementItemValidator.validateTitle('Valid requirement title')
      expect(result).toEqual([])
    })

    it('should fail validation for empty title', () => {
      const result = RequirementItemValidator.validateTitle('')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('TITLE_REQUIRED')
      expect(result[0].severity).toBe('error')
    })

    it('should fail validation for title that is too long', () => {
      const longTitle = 'a'.repeat(201)
      const result = RequirementItemValidator.validateTitle(longTitle)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('TITLE_TOO_LONG')
      expect(result[0].context?.currentLength).toBe(201)
    })

    it('should fail validation for title with invalid characters', () => {
      const result = RequirementItemValidator.validateTitle('Title with <script> tags')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('TITLE_INVALID_CHARACTERS')
    })

    it('should fail validation for title that is only a number', () => {
      const result = RequirementItemValidator.validateTitle('1. ')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('TITLE_ONLY_NUMBER')
    })

    it('should warn about excessive whitespace', () => {
      const result = RequirementItemValidator.validateTitle('Title   with   excessive   spaces')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('TITLE_EXCESSIVE_WHITESPACE')
      expect(result[0].severity).toBe('warning')
    })

    it('should use custom field name from context', () => {
      const result = RequirementItemValidator.validateTitle('', { userFriendlyName: 'Requirement Name' })
      expect(result[0].message).toContain('Requirement Name')
    })
  })

  describe('validateDescription', () => {
    it('should pass validation for valid description', () => {
      const result = RequirementItemValidator.validateDescription('Valid requirement description')
      expect(result).toEqual([])
    })

    it('should fail validation for empty description', () => {
      const result = RequirementItemValidator.validateDescription('')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('DESCRIPTION_REQUIRED')
    })

    it('should fail validation for description that is too long', () => {
      const longDescription = 'a'.repeat(2001)
      const result = RequirementItemValidator.validateDescription(longDescription)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('DESCRIPTION_TOO_LONG')
    })

    it('should fail validation for unsafe content', () => {
      const result = RequirementItemValidator.validateDescription('Description with <script>alert("xss")</script>')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('DESCRIPTION_UNSAFE_CONTENT')
    })

    it('should warn about excessive line breaks', () => {
      const result = RequirementItemValidator.validateDescription('Line 1\n\n\n\n\nLine 2')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('DESCRIPTION_EXCESSIVE_LINEBREAKS')
      expect(result[0].severity).toBe('warning')
    })
  })

  describe('validateStatus', () => {
    it('should pass validation for valid status', () => {
      const result = RequirementItemValidator.validateStatus('new')
      expect(result).toEqual([])
    })

    it('should fail validation for empty status', () => {
      const result = RequirementItemValidator.validateStatus('')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('STATUS_REQUIRED')
    })

    it('should fail validation for invalid status', () => {
      const result = RequirementItemValidator.validateStatus('invalid')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('STATUS_INVALID')
      expect(result[0].context?.receivedValue).toBe('invalid')
    })
  })

  describe('validatePriority', () => {
    it('should pass validation for valid priority', () => {
      const result = RequirementItemValidator.validatePriority('high')
      expect(result).toEqual([])
    })

    it('should pass validation for empty priority (optional)', () => {
      const result = RequirementItemValidator.validatePriority('')
      expect(result).toEqual([])
    })

    it('should fail validation for invalid priority', () => {
      const result = RequirementItemValidator.validatePriority('invalid')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('PRIORITY_INVALID')
    })
  })

  describe('validateRequirementItem', () => {
    it('should pass validation for valid requirement item', () => {
      const item = {
        title: 'Valid title',
        description: 'Valid description',
        status: 'new',
        priority: 'medium'
      }
      const result = RequirementItemValidator.validateRequirementItem(item)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should fail validation for invalid requirement item', () => {
      const item = {
        title: '',
        description: '',
        status: 'invalid',
        priority: 'invalid'
      }
      const result = RequirementItemValidator.validateRequirementItem(item)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.hasErrors).toBe(true)
    })

    it('should include warnings for potential issues', () => {
      const item = {
        title: 'Title',
        description: 'Title', // Same as title
        status: 'new',
        priority: 'medium'
      }
      const result = RequirementItemValidator.validateRequirementItem(item)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.hasWarnings).toBe(true)
    })

    it('should warn about brief descriptions', () => {
      const item = {
        title: 'Valid title',
        description: 'Brief', // Less than 20 characters
        status: 'new',
        priority: 'medium'
      }
      const result = RequirementItemValidator.validateRequirementItem(item)
      expect(result.warnings.some(w => w.code === 'DESCRIPTION_BRIEF')).toBe(true)
    })
  })
})

describe('PdfValidator', () => {
  let mockFile: File

  beforeEach(() => {
    // Create a file with proper PDF content and size
    const pdfContent = '%PDF-1.4\n' + 'a'.repeat(200) // Make it larger than 100 bytes
    mockFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' })
  })

  describe('validatePdfFile', () => {
    it('should pass validation for valid PDF file', () => {
      const result = PdfValidator.validatePdfFile(mockFile)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should fail validation for null file', () => {
      const result = PdfValidator.validatePdfFile(null as any)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_REQUIRED')
    })

    it('should fail validation for file that is too small', () => {
      const smallFile = new File([''], 'test.pdf', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(smallFile)
      expect(result.errors.some(e => e.code === 'FILE_TOO_SMALL')).toBe(true)
    })

    it('should fail validation for file that is too large', () => {
      const largeContent = 'a'.repeat(11 * 1024 * 1024) // 11MB
      const largeFile = new File([largeContent], 'test.pdf', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(largeFile)
      expect(result.errors.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true)
    })

    it('should fail validation for invalid MIME type', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = PdfValidator.validatePdfFile(invalidFile)
      expect(result.errors.some(e => e.code === 'FILE_INVALID_TYPE')).toBe(true)
    })

    it('should fail validation for invalid file extension', () => {
      const invalidFile = new File(['content'], 'test.txt', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(invalidFile)
      expect(result.errors.some(e => e.code === 'FILE_INVALID_EXTENSION')).toBe(true)
    })

    it('should fail validation for dangerous filename', () => {
      const dangerousFile = new File(['content'], 'test<script>.pdf', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(dangerousFile)
      expect(result.errors.some(e => e.code === 'FILE_NAME_INVALID')).toBe(true)
    })

    it('should warn about large files', () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024) // 6MB
      const largeFile = new File([largeContent], 'test.pdf', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(largeFile)
      expect(result.warnings.some(w => w.code === 'FILE_LARGE_PROCESSING_TIME')).toBe(true)
    })

    it('should warn about potentially corrupted files', () => {
      const corruptedFile = new File(['content'], 'test.pdf.tmp', { type: 'application/pdf' })
      const result = PdfValidator.validatePdfFile(corruptedFile)
      expect(result.warnings.some(w => w.code === 'FILE_POTENTIALLY_CORRUPTED')).toBe(true)
    })
  })

  describe('validatePdfFileAsync', () => {
    it('should validate PDF header asynchronously', async () => {
      const result = await PdfValidator.validatePdfFileAsync(mockFile)
      expect(result.isValid).toBe(true)
    })

    it('should fail for invalid PDF header', async () => {
      const invalidContent = 'not a pdf' + 'a'.repeat(200) // Make it larger than 100 bytes
      const invalidFile = new File([invalidContent], 'test.pdf', { type: 'application/pdf' })
      const result = await PdfValidator.validatePdfFileAsync(invalidFile)
      expect(result.errors.some(e => e.code === 'FILE_INVALID_PDF_HEADER')).toBe(true)
    })
  })

  describe('getMaxFileSize', () => {
    it('should return maximum file size', () => {
      const maxSize = PdfValidator.getMaxFileSize()
      expect(maxSize).toBe(10 * 1024 * 1024) // 10MB
    })
  })

  describe('getFormattedMaxFileSize', () => {
    it('should return formatted maximum file size', () => {
      const formattedSize = PdfValidator.getFormattedMaxFileSize()
      expect(formattedSize).toBe('10 MB')
    })
  })
})

describe('BrdContentValidator', () => {
  describe('validateContent', () => {
    it('should pass validation for valid content', () => {
      const result = BrdContentValidator.validateContent('Valid BRD content')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should pass validation for empty content', () => {
      const result = BrdContentValidator.validateContent('')
      expect(result.isValid).toBe(true)
    })

    it('should fail validation for content that is too long', () => {
      const longContent = 'a'.repeat(100001)
      const result = BrdContentValidator.validateContent(longContent)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONTENT_TOO_LONG')
    })

    it('should fail validation for dangerous content', () => {
      const dangerousContent = 'Content with <script>alert("xss")</script>'
      const result = BrdContentValidator.validateContent(dangerousContent)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONTENT_UNSAFE')
    })
  })
})

describe('DocumentStatusValidator', () => {
  describe('validateStatus', () => {
    it('should pass validation for valid status', () => {
      const result = DocumentStatusValidator.validateStatus('draft')
      expect(result.isValid).toBe(true)
    })

    it('should fail validation for empty status', () => {
      const result = DocumentStatusValidator.validateStatus('')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('STATUS_REQUIRED')
    })

    it('should fail validation for invalid status', () => {
      const result = DocumentStatusValidator.validateStatus('invalid')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('STATUS_INVALID')
    })
  })
})

describe('FormValidator', () => {
  let formValidator: FormValidator

  beforeEach(() => {
    formValidator = new FormValidator()
  })

  describe('registerValidator', () => {
    it('should register a validator for a field', () => {
      const validator = (value: string) => ({
        isValid: value.length > 0,
        errors: value.length === 0 ? [{ field: 'test', message: 'Required', code: 'REQUIRED', severity: 'error' as const }] : [],
        warnings: [],
        hasErrors: value.length === 0,
        hasWarnings: false
      })

      formValidator.registerValidator('test', validator)
      
      const result = formValidator.validateField('test', '')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('REQUIRED')
    })
  })

  describe('validateField', () => {
    beforeEach(() => {
      formValidator.registerValidator('test', (value: string) => ({
        isValid: value.length > 0,
        errors: value.length === 0 ? [{ field: 'test', message: 'Required', code: 'REQUIRED', severity: 'error' as const }] : [],
        warnings: [],
        hasErrors: value.length === 0,
        hasWarnings: false
      }))
    })

    it('should validate a field with registered validator', () => {
      const result = formValidator.validateField('test', 'valid')
      expect(result.isValid).toBe(true)
    })

    it('should return valid result for unregistered field', () => {
      const result = formValidator.validateField('unregistered', 'value')
      expect(result.isValid).toBe(true)
    })
  })

  describe('validateAll', () => {
    beforeEach(() => {
      formValidator.registerValidator('field1', (value: string) => ({
        isValid: value.length > 0,
        errors: value.length === 0 ? [{ field: 'field1', message: 'Required', code: 'REQUIRED', severity: 'error' as const }] : [],
        warnings: [],
        hasErrors: value.length === 0,
        hasWarnings: false
      }))
      
      formValidator.registerValidator('field2', (value: string) => ({
        isValid: value.length > 2,
        errors: value.length <= 2 ? [{ field: 'field2', message: 'Too short', code: 'TOO_SHORT', severity: 'error' as const }] : [],
        warnings: [],
        hasErrors: value.length <= 2,
        hasWarnings: false
      }))
    })

    it('should validate all fields', () => {
      const result = formValidator.validateAll({
        field1: 'valid',
        field2: 'valid'
      })
      expect(result.isValid).toBe(true)
    })

    it('should collect errors from all fields', () => {
      const result = formValidator.validateAll({
        field1: '',
        field2: 'ab'
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('getValidationState', () => {
    it('should return current validation state', () => {
      const state = formValidator.getValidationState()
      expect(state).toHaveProperty('isValidating')
      expect(state).toHaveProperty('hasBeenValidated')
      expect(state).toHaveProperty('fieldErrors')
      expect(state).toHaveProperty('canSubmit')
    })
  })
})

describe('NetworkValidator', () => {
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
  })

  afterEach(() => {
    // Restore original online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine
    })
  })

  describe('isNetworkAvailable', () => {
    it('should return true when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      expect(NetworkValidator.isNetworkAvailable()).toBe(true)
    })

    it('should return false when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      expect(NetworkValidator.isNetworkAvailable()).toBe(false)
    })
  })

  describe('validateNetworkConnectivity', () => {
    it('should pass validation when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
      const result = NetworkValidator.validateNetworkConnectivity('test operation')
      expect(result.isValid).toBe(true)
    })

    it('should fail validation when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      const result = NetworkValidator.validateNetworkConnectivity('test operation')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('NETWORK_OFFLINE')
    })
  })

  describe('network listeners', () => {
    it('should add and remove network listeners', () => {
      const listener = vi.fn()
      
      NetworkValidator.addNetworkListener(listener)
      NetworkValidator.removeNetworkListener(listener)
      
      // Should not throw errors
      expect(true).toBe(true)
    })
  })
})

describe('ValidationUtils', () => {
  describe('sanitizeString', () => {
    it('should sanitize string input', () => {
      const result = ValidationUtils.sanitizeString('  test\x00string  ')
      expect(result).toBe('test string')
    })

    it('should handle empty input', () => {
      const result = ValidationUtils.sanitizeString('')
      expect(result).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      const result = ValidationUtils.escapeHtml('<script>alert("xss")</script>')
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(ValidationUtils.isValidEmail('invalid-email')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URL', () => {
      expect(ValidationUtils.isValidUrl('https://example.com')).toBe(true)
    })

    it('should reject invalid URL', () => {
      expect(ValidationUtils.isValidUrl('not-a-url')).toBe(false)
    })
  })

  describe('isSafeString', () => {
    it('should accept safe string', () => {
      expect(ValidationUtils.isSafeString('Safe string 123!')).toBe(true)
    })

    it('should reject unsafe string', () => {
      expect(ValidationUtils.isSafeString('String with \x00 null byte')).toBe(false)
    })
  })

  describe('truncateString', () => {
    it('should truncate long string', () => {
      const result = ValidationUtils.truncateString('This is a long string', 10)
      expect(result).toBe('This is...')
    })

    it('should not truncate short string', () => {
      const result = ValidationUtils.truncateString('Short', 10)
      expect(result).toBe('Short')
    })
  })

  describe('formatValidationErrors', () => {
    it('should format single error', () => {
      const errors: ValidationError[] = [{
        field: 'test',
        message: 'Test error',
        code: 'TEST_ERROR',
        severity: 'error'
      }]
      const result = ValidationUtils.formatValidationErrors(errors)
      expect(result).toBe('Test error')
    })

    it('should format multiple errors', () => {
      const errors: ValidationError[] = [
        { field: 'test1', message: 'Error 1', code: 'ERROR_1', severity: 'error' },
        { field: 'test2', message: 'Error 2', code: 'ERROR_2', severity: 'error' }
      ]
      const result = ValidationUtils.formatValidationErrors(errors)
      expect(result).toBe('1. Error 1\n2. Error 2')
    })

    it('should return empty string for no errors', () => {
      const result = ValidationUtils.formatValidationErrors([])
      expect(result).toBe('')
    })
  })

  describe('groupErrorsByField', () => {
    it('should group errors by field', () => {
      const errors: ValidationError[] = [
        { field: 'field1', message: 'Error 1', code: 'ERROR_1', severity: 'error' },
        { field: 'field1', message: 'Error 2', code: 'ERROR_2', severity: 'error' },
        { field: 'field2', message: 'Error 3', code: 'ERROR_3', severity: 'error' }
      ]
      
      const result = ValidationUtils.groupErrorsByField(errors)
      
      expect(result.field1).toHaveLength(2)
      expect(result.field2).toHaveLength(1)
    })
  })
})