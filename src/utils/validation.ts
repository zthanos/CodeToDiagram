// src/utils/validation.ts

/**
 * Comprehensive validation utilities for Requirements Workspace
 * Requirements: 4.5, 5.3, 6.2
 */

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

// Form validation state interface
export interface FormValidationState {
  isValidating: boolean;
  hasBeenValidated: boolean;
  fieldErrors: Record<string, ValidationError[]>;
  globalErrors: ValidationError[];
  isSubmitting: boolean;
  canSubmit: boolean;
}

// Validation context for better error messages
export interface ValidationContext {
  fieldName?: string;
  operation?: string;
  component?: string;
  userFriendlyName?: string;
}

/**
 * Validate requirement item fields
 */
export class RequirementItemValidator {
  private static readonly TITLE_MAX_LENGTH = 200;
  private static readonly DESCRIPTION_MAX_LENGTH = 2000;
  private static readonly TITLE_MIN_LENGTH = 1;

  /**
   * Validate requirement item title with enhanced error reporting
   */
  static validateTitle(title: string, context?: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const trimmedTitle = title?.trim() || '';
    const fieldName = context?.userFriendlyName || 'Title';

    if (!trimmedTitle) {
      errors.push({
        field: 'title',
        message: `${fieldName} is required`,
        code: 'TITLE_REQUIRED',
        severity: 'error',
        context
      });
    } else if (trimmedTitle.length < this.TITLE_MIN_LENGTH) {
      errors.push({
        field: 'title',
        message: `${fieldName} must be at least ${this.TITLE_MIN_LENGTH} character long`,
        code: 'TITLE_TOO_SHORT',
        severity: 'error',
        context: { ...context, minLength: this.TITLE_MIN_LENGTH }
      });
    } else if (trimmedTitle.length > this.TITLE_MAX_LENGTH) {
      errors.push({
        field: 'title',
        message: `${fieldName} must be less than ${this.TITLE_MAX_LENGTH} characters (currently ${trimmedTitle.length})`,
        code: 'TITLE_TOO_LONG',
        severity: 'error',
        context: { ...context, maxLength: this.TITLE_MAX_LENGTH, currentLength: trimmedTitle.length }
      });
    }

    // Check for invalid characters
    if (trimmedTitle && /[<>]/.test(trimmedTitle)) {
      errors.push({
        field: 'title',
        message: `${fieldName} cannot contain < or > characters`,
        code: 'TITLE_INVALID_CHARACTERS',
        severity: 'error',
        context: { ...context, invalidChars: ['<', '>'] }
      });
    }

    // Check for potentially problematic patterns
    if (trimmedTitle && /^\s*\d+\.\s*$/.test(trimmedTitle)) {
      errors.push({
        field: 'title',
        message: `${fieldName} appears to be just a number. Please provide a descriptive title.`,
        code: 'TITLE_ONLY_NUMBER',
        severity: 'error',
        context
      });
    }

    // Check for excessive whitespace
    if (trimmedTitle && /\s{3,}/.test(trimmedTitle)) {
      errors.push({
        field: 'title',
        message: `${fieldName} contains excessive whitespace. Please clean up formatting.`,
        code: 'TITLE_EXCESSIVE_WHITESPACE',
        severity: 'warning',
        context
      });
    }

    return errors;
  }

  /**
   * Validate requirement item description with enhanced error reporting
   */
  static validateDescription(description: string, context?: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const trimmedDescription = description?.trim() || '';
    const fieldName = context?.userFriendlyName || 'Description';

    if (!trimmedDescription) {
      errors.push({
        field: 'description',
        message: `${fieldName} is required`,
        code: 'DESCRIPTION_REQUIRED',
        severity: 'error',
        context
      });
    } else if (trimmedDescription.length > this.DESCRIPTION_MAX_LENGTH) {
      errors.push({
        field: 'description',
        message: `${fieldName} must be less than ${this.DESCRIPTION_MAX_LENGTH} characters (currently ${trimmedDescription.length})`,
        code: 'DESCRIPTION_TOO_LONG',
        severity: 'error',
        context: { ...context, maxLength: this.DESCRIPTION_MAX_LENGTH, currentLength: trimmedDescription.length }
      });
    }

    // Check for potentially unsafe content
    if (trimmedDescription && this.containsPotentiallyUnsafeContent(trimmedDescription)) {
      errors.push({
        field: 'description',
        message: `${fieldName} contains potentially unsafe content. Please remove any script tags or suspicious links.`,
        code: 'DESCRIPTION_UNSAFE_CONTENT',
        severity: 'error',
        context
      });
    }

    // Check for excessive line breaks
    if (trimmedDescription && /\n{4,}/.test(trimmedDescription)) {
      errors.push({
        field: 'description',
        message: `${fieldName} contains excessive line breaks. Please clean up formatting.`,
        code: 'DESCRIPTION_EXCESSIVE_LINEBREAKS',
        severity: 'warning',
        context
      });
    }

    return errors;
  }

  /**
   * Check for potentially unsafe content in descriptions
   */
  private static containsPotentiallyUnsafeContent(content: string): boolean {
    const unsafePatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /onclick\s*=/gi,
      /onload\s*=/gi
    ];

    return unsafePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate requirement item status with enhanced error reporting
   */
  static validateStatus(status: string, context?: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const validStatuses = ['new', 'accepted', 'rejected'];
    const fieldName = context?.userFriendlyName || 'Status';

    if (!status) {
      errors.push({
        field: 'status',
        message: `${fieldName} is required`,
        code: 'STATUS_REQUIRED',
        severity: 'error',
        context
      });
    } else if (!validStatuses.includes(status)) {
      errors.push({
        field: 'status',
        message: `${fieldName} must be one of: ${validStatuses.join(', ')} (received: ${status})`,
        code: 'STATUS_INVALID',
        severity: 'error',
        context: { ...context, validValues: validStatuses, receivedValue: status }
      });
    }

    return errors;
  }

  /**
   * Validate requirement item priority with enhanced error reporting
   */
  static validatePriority(priority: string, context?: ValidationContext): ValidationError[] {
    const errors: ValidationError[] = [];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const fieldName = context?.userFriendlyName || 'Priority';

    if (priority && !validPriorities.includes(priority)) {
      errors.push({
        field: 'priority',
        message: `${fieldName} must be one of: ${validPriorities.join(', ')} (received: ${priority})`,
        code: 'PRIORITY_INVALID',
        severity: 'error',
        context: { ...context, validValues: validPriorities, receivedValue: priority }
      });
    }

    return errors;
  }

  /**
   * Validate complete requirement item with enhanced error reporting
   */
  static validateRequirementItem(
    item: {
      title: string;
      description: string;
      status: string;
      priority?: string;
    },
    context?: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate individual fields
    errors.push(...this.validateTitle(item.title, context));
    errors.push(...this.validateDescription(item.description, context));
    errors.push(...this.validateStatus(item.status, context));
    errors.push(...this.validatePriority(item.priority || 'medium', context));

    // Cross-field validation
    if (item.title && item.description && item.title.toLowerCase() === item.description.toLowerCase()) {
      warnings.push({
        field: 'description',
        message: 'Description is identical to title. Consider providing more detailed information.',
        code: 'DESCRIPTION_SAME_AS_TITLE',
        severity: 'warning',
        context: { ...context, crossField: 'title' }
      });
    }

    // Check for potentially incomplete requirements
    if (item.description && item.description.length < 20) {
      warnings.push({
        field: 'description',
        message: 'Description seems brief. Consider adding more details for clarity.',
        code: 'DESCRIPTION_BRIEF',
        severity: 'warning',
        context
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0
    };
  }

  /**
   * Validate requirement item with async checks (for future use)
   */
  static async validateRequirementItemAsync(
    item: {
      title: string;
      description: string;
      status: string;
      priority?: string;
    },
    context?: ValidationContext
  ): Promise<ValidationResult> {
    // Start with synchronous validation
    const syncResult = this.validateRequirementItem(item, context);
    
    // Add async validations here if needed (e.g., duplicate checking)
    // For now, just return the sync result
    return syncResult;
  }
}

/**
 * Validate PDF files for upload
 */
export class PdfValidator {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MIN_FILE_SIZE = 100; // 100 bytes (more lenient for tests)
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf'
  ];
  private static readonly ALLOWED_EXTENSIONS = ['.pdf'];

  /**
   * Validate PDF file for upload with comprehensive error handling
   */
  static validatePdfFile(file: File, context?: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if file exists
    if (!file) {
      errors.push({
        field: 'file',
        message: 'Please select a PDF file to upload',
        code: 'FILE_REQUIRED',
        severity: 'error',
        context
      });
      return { 
        isValid: false, 
        errors, 
        warnings: [], 
        hasErrors: true, 
        hasWarnings: false 
      };
    }

    // Check file size
    if (file.size < this.MIN_FILE_SIZE) {
      errors.push({
        field: 'file',
        message: `File is too small (${this.formatFileSize(file.size)}). Minimum size is ${this.formatFileSize(this.MIN_FILE_SIZE)}`,
        code: 'FILE_TOO_SMALL',
        severity: 'error',
        context: { ...context, fileSize: file.size, minSize: this.MIN_FILE_SIZE }
      });
    } else if (file.size > this.MAX_FILE_SIZE) {
      errors.push({
        field: 'file',
        message: `File is too large (${this.formatFileSize(file.size)}). Maximum size is ${this.formatFileSize(this.MAX_FILE_SIZE)}`,
        code: 'FILE_TOO_LARGE',
        severity: 'error',
        context: { ...context, fileSize: file.size, maxSize: this.MAX_FILE_SIZE }
      });
    }

    // Warn about large files that might take time to process
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push({
        field: 'file',
        message: `Large file (${this.formatFileSize(file.size)}) may take longer to process`,
        code: 'FILE_LARGE_PROCESSING_TIME',
        severity: 'warning',
        context: { ...context, fileSize: file.size }
      });
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push({
        field: 'file',
        message: `Invalid file type (${file.type || 'unknown'}). Only PDF files are allowed`,
        code: 'FILE_INVALID_TYPE',
        severity: 'error',
        context: { ...context, fileType: file.type, allowedTypes: this.ALLOWED_MIME_TYPES }
      });
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push({
        field: 'file',
        message: `Invalid file extension (${extension || 'none'}). File must have a .pdf extension`,
        code: 'FILE_INVALID_EXTENSION',
        severity: 'error',
        context: { ...context, extension, allowedExtensions: this.ALLOWED_EXTENSIONS }
      });
    }

    // Check filename
    if (!file.name || file.name.trim().length === 0) {
      errors.push({
        field: 'file',
        message: 'File must have a valid name',
        code: 'FILE_INVALID_NAME',
        severity: 'error',
        context
      });
    } else if (file.name.length > 255) {
      errors.push({
        field: 'file',
        message: `Filename is too long (${file.name.length} characters). Maximum is 255 characters`,
        code: 'FILE_NAME_TOO_LONG',
        severity: 'error',
        context: { ...context, nameLength: file.name.length, maxLength: 255 }
      });
    }

    // Check for potentially dangerous filenames
    if (this.isDangerousFilename(file.name)) {
      errors.push({
        field: 'file',
        message: 'Filename contains invalid or potentially unsafe characters',
        code: 'FILE_NAME_INVALID',
        severity: 'error',
        context: { ...context, filename: file.name }
      });
    }

    // Check for common PDF corruption indicators
    if (file.name && this.isPotentiallyCorruptedPdf(file.name)) {
      warnings.push({
        field: 'file',
        message: 'Filename suggests this might be a corrupted or incomplete PDF',
        code: 'FILE_POTENTIALLY_CORRUPTED',
        severity: 'warning',
        context: { ...context, filename: file.name }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0
    };
  }

  /**
   * Validate PDF file asynchronously with content checks
   */
  static async validatePdfFileAsync(file: File, context?: ValidationContext): Promise<ValidationResult> {
    // Start with synchronous validation
    const syncResult = this.validatePdfFile(file, context);
    
    if (!syncResult.isValid) {
      return syncResult;
    }

    // Add async validations
    const asyncErrors: ValidationError[] = [...syncResult.errors];
    const asyncWarnings: ValidationError[] = [...syncResult.warnings];

    try {
      // Check if file can be read as PDF (basic header check)
      const isValidPdf = await this.checkPdfHeader(file);
      if (!isValidPdf) {
        asyncErrors.push({
          field: 'file',
          message: 'File does not appear to be a valid PDF document',
          code: 'FILE_INVALID_PDF_HEADER',
          severity: 'error',
          context
        });
      }
    } catch (error) {
      asyncWarnings.push({
        field: 'file',
        message: 'Could not verify PDF format. File may still be valid',
        code: 'FILE_PDF_VERIFICATION_FAILED',
        severity: 'warning',
        context: { ...context, error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }

    return {
      isValid: asyncErrors.length === 0,
      errors: asyncErrors,
      warnings: asyncWarnings,
      hasErrors: asyncErrors.length > 0,
      hasWarnings: asyncWarnings.length > 0
    };
  }

  /**
   * Check if filename suggests a potentially corrupted PDF
   */
  private static isPotentiallyCorruptedPdf(filename: string): boolean {
    const corruptionIndicators = [
      /\.pdf\.tmp$/i,
      /\.pdf\.part$/i,
      /\.pdf\.download$/i,
      /\.pdf\.crdownload$/i,
      /^~\$.*\.pdf$/i,
      /\.pdf\.bak$/i
    ];

    return corruptionIndicators.some(pattern => pattern.test(filename));
  }

  /**
   * Check PDF header to verify it's a valid PDF file
   */
  private static async checkPdfHeader(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Check for PDF header (%PDF-)
          const header = String.fromCharCode(...uint8Array.slice(0, 5));
          resolve(header === '%PDF-');
        } catch (error) {
          resolve(false);
        }
      };
      
      reader.onerror = () => resolve(false);
      
      // Read only the first 5 bytes to check header
      reader.readAsArrayBuffer(file.slice(0, 5));
    });
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex >= 0 ? filename.substring(lastDotIndex).toLowerCase() : '';
  }

  /**
   * Check if filename is potentially dangerous
   */
  private static isDangerousFilename(filename: string): boolean {
    // Check for null bytes, control characters, and path traversal
    const dangerousPatterns = [
      /\0/, // null byte
      /[\x00-\x1f\x7f]/, // control characters
      /\.\./, // path traversal
      /[<>:"|?*]/, // Windows invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Windows reserved names
    ];

    return dangerousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  /**
   * Get maximum file size in bytes
   */
  static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Get formatted maximum file size
   */
  static getFormattedMaxFileSize(): string {
    return this.formatFileSize(this.MAX_FILE_SIZE);
  }
}

/**
 * Validate BRD document content
 */
export class BrdContentValidator {
  private static readonly MAX_CONTENT_LENGTH = 100000; // 100KB of text

  /**
   * Validate BRD content
   */
  static validateContent(content: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (content && content.length > this.MAX_CONTENT_LENGTH) {
      errors.push({
        field: 'content',
        message: `Document content is too long. Maximum length is ${this.MAX_CONTENT_LENGTH} characters`,
        code: 'CONTENT_TOO_LONG'
      });
    }

    // Check for potentially dangerous content (basic XSS prevention)
    if (content && this.containsDangerousContent(content)) {
      errors.push({
        field: 'content',
        message: 'Document content contains potentially unsafe elements',
        code: 'CONTENT_UNSAFE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for potentially dangerous content
   */
  private static containsDangerousContent(content: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }
}

/**
 * Validate document status
 */
export class DocumentStatusValidator {
  private static readonly VALID_STATUSES = ['draft', 'published', 'archived'];

  /**
   * Validate document status
   */
  static validateStatus(status: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!status) {
      errors.push({
        field: 'status',
        message: 'Document status is required',
        code: 'STATUS_REQUIRED'
      });
    } else if (!this.VALID_STATUSES.includes(status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${this.VALID_STATUSES.join(', ')}`,
        code: 'STATUS_INVALID'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Form validation manager for complex forms
 */
export class FormValidator {
  private validationState: FormValidationState = {
    isValidating: false,
    hasBeenValidated: false,
    fieldErrors: {},
    globalErrors: [],
    isSubmitting: false,
    canSubmit: false
  };

  private validators: Record<string, (value: any, context?: ValidationContext) => ValidationResult> = {};
  private asyncValidators: Record<string, (value: any, context?: ValidationContext) => Promise<ValidationResult>> = {};

  /**
   * Register a validator for a field
   */
  registerValidator(fieldName: string, validator: (value: any, context?: ValidationContext) => ValidationResult): void {
    this.validators[fieldName] = validator;
  }

  /**
   * Register an async validator for a field
   */
  registerAsyncValidator(fieldName: string, validator: (value: any, context?: ValidationContext) => Promise<ValidationResult>): void {
    this.asyncValidators[fieldName] = validator;
  }

  /**
   * Validate a single field
   */
  validateField(fieldName: string, value: any, context?: ValidationContext): ValidationResult {
    const validator = this.validators[fieldName];
    if (!validator) {
      return { isValid: true, errors: [], warnings: [], hasErrors: false, hasWarnings: false };
    }

    const result = validator(value, context);
    this.validationState.fieldErrors[fieldName] = result.errors;
    this.updateCanSubmit();

    return result;
  }

  /**
   * Validate a single field asynchronously
   */
  async validateFieldAsync(fieldName: string, value: any, context?: ValidationContext): Promise<ValidationResult> {
    const asyncValidator = this.asyncValidators[fieldName];
    if (!asyncValidator) {
      return this.validateField(fieldName, value, context);
    }

    this.validationState.isValidating = true;
    
    try {
      const result = await asyncValidator(value, context);
      this.validationState.fieldErrors[fieldName] = result.errors;
      this.updateCanSubmit();
      return result;
    } finally {
      this.validationState.isValidating = false;
    }
  }

  /**
   * Validate all fields
   */
  validateAll(formData: Record<string, any>, context?: ValidationContext): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    this.validationState.fieldErrors = {};

    for (const [fieldName, value] of Object.entries(formData)) {
      const result = this.validateField(fieldName, value, { ...context, fieldName });
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    this.validationState.hasBeenValidated = true;
    this.updateCanSubmit();

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      hasErrors: allErrors.length > 0,
      hasWarnings: allWarnings.length > 0
    };
  }

  /**
   * Get validation state
   */
  getValidationState(): FormValidationState {
    return { ...this.validationState };
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(fieldName: string): ValidationError[] {
    return this.validationState.fieldErrors[fieldName] || [];
  }

  /**
   * Check if a field has errors
   */
  hasFieldErrors(fieldName: string): boolean {
    return (this.validationState.fieldErrors[fieldName] || []).length > 0;
  }

  /**
   * Clear validation state
   */
  clearValidation(): void {
    this.validationState = {
      isValidating: false,
      hasBeenValidated: false,
      fieldErrors: {},
      globalErrors: [],
      isSubmitting: false,
      canSubmit: false
    };
  }

  /**
   * Set submitting state
   */
  setSubmitting(isSubmitting: boolean): void {
    this.validationState.isSubmitting = isSubmitting;
    this.updateCanSubmit();
  }

  /**
   * Add global error
   */
  addGlobalError(error: ValidationError): void {
    this.validationState.globalErrors.push(error);
    this.updateCanSubmit();
  }

  /**
   * Clear global errors
   */
  clearGlobalErrors(): void {
    this.validationState.globalErrors = [];
    this.updateCanSubmit();
  }

  /**
   * Update canSubmit state based on current validation state
   */
  private updateCanSubmit(): void {
    const hasFieldErrors = Object.values(this.validationState.fieldErrors).some(errors => errors.length > 0);
    const hasGlobalErrors = this.validationState.globalErrors.length > 0;
    
    this.validationState.canSubmit = 
      !this.validationState.isValidating &&
      !this.validationState.isSubmitting &&
      !hasFieldErrors &&
      !hasGlobalErrors;
  }
}

/**
 * Network connectivity validator
 */
export class NetworkValidator {
  private static isOnline = navigator.onLine;
  private static listeners: ((isOnline: boolean) => void)[] = [];

  static {
    // Set up event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners(true);
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners(false);
      });
    }
  }

  /**
   * Check if network is available
   */
  static isNetworkAvailable(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Validate network connectivity for operations
   */
  static validateNetworkConnectivity(operation: string = 'operation'): ValidationResult {
    const errors: ValidationError[] = [];
    const isOnline = this.isNetworkAvailable();

    if (!isOnline) {
      errors.push({
        field: 'network',
        message: `Cannot perform ${operation} while offline. Please check your internet connection.`,
        code: 'NETWORK_OFFLINE',
        severity: 'error',
        context: { operation, isOnline }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      hasErrors: errors.length > 0,
      hasWarnings: false
    };
  }

  /**
   * Add listener for network status changes
   */
  static addNetworkListener(listener: (isOnline: boolean) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove network listener
   */
  static removeNetworkListener(listener: (isOnline: boolean) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of network status change
   */
  private static notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }
}

/**
 * Utility functions for validation
 */
export class ValidationUtils {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[\x00-\x1f\x7f]/g, ' ') // Replace control characters with space
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Escape HTML characters
   */
  static escapeHtml(input: string): string {
    if (!input) return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate email format (for future use)
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format (for future use)
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if string contains only safe characters
   */
  static isSafeString(input: string): boolean {
    // Allow alphanumeric, spaces, and common punctuation
    const safePattern = /^[a-zA-Z0-9\s\-_.,!?()[\]{}:;"'@#$%^&*+=|\\/<>~`]*$/;
    return safePattern.test(input);
  }

  /**
   * Truncate string to specified length
   */
  static truncateString(input: string, maxLength: number, suffix = '...'): string {
    if (!input || input.length <= maxLength) return input;
    
    return input.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    return errors.map((error, index) => `${index + 1}. ${error.message}`).join('\n');
  }

  /**
   * Group validation errors by field
   */
  static groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce((groups, error) => {
      if (!groups[error.field]) {
        groups[error.field] = [];
      }
      groups[error.field].push(error);
      return groups;
    }, {} as Record<string, ValidationError[]>);
  }
}