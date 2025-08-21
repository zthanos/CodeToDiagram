// src/services/RequirementsApiService.ts

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  RequirementsDocument,
  RequirementItem,
  CreateRequirementItemRequest,
  UpdateRequirementItemRequest,
  UpsertRequirementItemRequest,
  SaveRequirementsDocumentRequest,
  SaveRequirementsSystemRequest,
  BulkUpdateRequirementRequest,
  RequirementsErrorType,
  RequirementsError
} from '../types/requirements';
import { apiConfig, getVersionedPath } from '../config/api';
import { ApiErrorInfo, ApiErrorType } from './ProjectApiService';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Network connectivity detection
let isOnline = navigator.onLine;
window.addEventListener('online', () => { isOnline = true; });
window.addEventListener('offline', () => { isOnline = false; });

export class RequirementsApiService {
  private static maxRetries = apiConfig.maxRetries;
  private static baseDelay = apiConfig.retryDelay;

  /**
   * Initialize API service with interceptors
   */
  public static initialize(): void {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Setup request interceptor for logging and validation
   */
  private static setupRequestInterceptor(): void {
    apiClient.interceptors.request.use(
      (config) => {
        // Add request timestamp for timeout tracking
        (config as any).metadata = { startTime: new Date() };

        // Log request in development
        if (import.meta.env?.DEV) {
          console.debug('Requirements API Request:', {
            method: config.method,
            url: config.url,
            data: config.data
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Setup response interceptor for error handling and retry logic
   */
  private static setupResponseInterceptor(): void {
    apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful response in development
        if (import.meta.env?.DEV) {
          console.debug('Requirements API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Don't retry if already retrying or if it's not a retryable error
        if (originalRequest._retry) {
          return Promise.reject(this.handleApiError(error));
        }

        const errorInfo = this.categorizeError(error);

        // Retry logic for retryable errors
        if (errorInfo.canRetry && this.shouldRetry(originalRequest)) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          const delay = this.calculateRetryDelay(originalRequest._retryCount);
          await this.delay(delay);

          try {
            return await apiClient(originalRequest);
          } catch (retryError) {
            if (originalRequest._retryCount >= this.maxRetries) {
              return Promise.reject(this.handleApiError(retryError as AxiosError));
            }
            throw retryError;
          }
        }

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Categorize API errors for appropriate handling
   */
  private static categorizeError(error: AxiosError): ApiErrorInfo {
    if (!isOnline) {
      return {
        type: ApiErrorType.NETWORK,
        message: 'No internet connection. Please check your network and try again.',
        canRetry: true,
        suggestedAction: 'Check your internet connection and retry'
      };
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        type: ApiErrorType.TIMEOUT,
        message: 'Request timed out. The server may be busy.',
        canRetry: true,
        suggestedAction: 'Wait a moment and try again'
      };
    }

    if (!error.response) {
      return {
        type: ApiErrorType.NETWORK,
        message: 'Unable to connect to the server. Please check your connection.',
        canRetry: true,
        suggestedAction: 'Check server availability and network connection'
      };
    }

    const status = error.response.status;
    const data = error.response.data as any;

    if (status >= 400 && status < 500) {
      if (status === 400) {
        return {
          type: ApiErrorType.VALIDATION,
          message: data?.message || 'Invalid request data. Please check your input.',
          details: data?.details,
          canRetry: false,
          suggestedAction: 'Verify your input data and try again'
        };
      }

      if (status === 404) {
        return {
          type: ApiErrorType.CLIENT,
          message: data?.message || 'The requested resource was not found.',
          canRetry: false,
          suggestedAction: 'Verify the resource exists and try again'
        };
      }

      if (status === 422) {
        return {
          type: ApiErrorType.VALIDATION,
          message: data?.message || 'Validation error. Please check your input.',
          details: data?.details || data?.errors,
          canRetry: false,
          suggestedAction: 'Review the validation errors and correct your input'
        };
      }

      return {
        type: ApiErrorType.CLIENT,
        message: data?.message || `Client error (${status}). Please check your request.`,
        details: data,
        canRetry: false,
        suggestedAction: 'Review your request and try again'
      };
    }

    if (status >= 500) {
      return {
        type: ApiErrorType.SERVER,
        message: data?.message || 'Server error. Please try again later.',
        details: data,
        canRetry: true,
        suggestedAction: 'Wait a moment and try again, or contact support if the problem persists'
      };
    }

    return {
      type: ApiErrorType.UNKNOWN,
      message: 'An unexpected error occurred. Please try again.',
      details: error.message,
      canRetry: true,
      suggestedAction: 'Try again or contact support if the problem persists'
    };
  }

  /**
   * Handle API errors with proper categorization and user-friendly messages
   */
  private static handleApiError(error: AxiosError): ApiErrorInfo {
    const errorInfo = this.categorizeError(error);

    // Log error details in development
    if (import.meta.env?.DEV) {
      console.error('Requirements API Error:', {
        type: errorInfo.type,
        message: errorInfo.message,
        details: errorInfo.details,
        originalError: error
      });
    }

    return errorInfo;
  }

  /**
   * Check if request should be retried
   */
  private static shouldRetry(config: any): boolean {
    const retryCount = config._retryCount || 0;
    return retryCount < this.maxRetries;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private static calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, 10000); // Cap at 10 seconds
  }

  /**
   * Utility method to create delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check network connectivity
   */
  public static isNetworkAvailable(): boolean {
    return isOnline;
  }

  /**
   * Retry a request with exponential backoff
   */
  public static async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        const errorInfo = error as ApiErrorInfo;
        if (!errorInfo.canRetry || attempt === maxRetries) {
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Get the latest requirements document for a project
   * Requirements: 5.1, 5.2, 6.1, 6.2
   */
  public static async getLatestRequirements(projectId: string): Promise<RequirementsDocument> {
    try {
      const response = await apiClient.get<RequirementsDocument>(
        getVersionedPath(`projects/${projectId}/requirements-document/latest`)
      );
      return this.mapToRequirementsDocument(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Upload PDF file and extract requirements
   * Requirements: 4.2, 4.3, 6.1, 6.2
   */
  public static async uploadRequirementsPdf(
    projectId: string,
    file: File,
    status: 'draft' | 'published' | 'archived' = 'draft'
  ): Promise<RequirementsDocument> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<RequirementsDocument>(
        getVersionedPath(`projects/${projectId}/requirements-document/upload-pdf?status=${status}`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutes for PDF processing
        }
      );

      return this.mapToRequirementsDocument(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Save requirements document (upsert - create or update)
   * Requirements: 6.1, 6.2
   */
  public static async saveRequirementsDocument(
    projectId: string,
    content: string,
    status: 'draft' | 'published' | 'archived' = 'draft'
  ): Promise<RequirementsDocument> {
    try {
      const response = await apiClient.post<RequirementsDocument>(
        getVersionedPath(`projects/${projectId}/requirements-document`),
        {
          content,
          status,
          source_type: 'manual'
        }
      );

      return this.mapToRequirementsDocument(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }




  /**
   * Upsert requirement item
   * Requirements: 6.1, 6.2
   */
  public static async upsertRequirementItem(
    projectId: string,
    item: RequirementItem
  ): Promise<RequirementItem> {
    try {

      const response = await apiClient.post<RequirementItem>(
        getVersionedPath(`projects/${projectId}/requirement-items`),
        {
          title: item.title,
          description: item.description,
          priority: item.priority || 'medium',
          document_id: item.document_id,
          project_id: item.project_id || projectId,
          id: item.id || null,
          status: item.status
        }
      );

      return this.mapToRequirementItem(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }


  private static buildUpsertPayload(project_id: string, item: RequirementItem): UpsertRequirementItemRequest {
    const payload: UpsertRequirementItemRequest = {
      project_id: item.project_id,
      description: item.description,
      document_id: item.document_id,
      priority: item.priority,
      status: item.status
    };
    return payload;
  }

  /**
   * Create a new requirement item
   * Requirements: 6.1, 6.2
   */
  public static async createRequirementItem(
    projectId: string,
    item: CreateRequirementItemRequest
  ): Promise<RequirementItem> {
    try {
      const response = await apiClient.post<RequirementItem>(
        getVersionedPath(`requirement-items`),
        {
          title: item.title,
          description: item.description,
          priority: item.priority || 'medium',
          project_id: item.project_id || projectId
        }
      );

      return this.mapToRequirementItem(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update an existing requirement item
   * Requirements: 6.1, 6.2
   */
  public static async updateRequirementItem(
    projectId: string,
    itemId: string,
    updates: UpdateRequirementItemRequest
  ): Promise<RequirementItem> {
    try {
      const response = await apiClient.put<RequirementItem>(
        getVersionedPath(`requirement-items/${itemId}`),
        updates
      );

      return this.mapToRequirementItem(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Delete a requirement item
   * Requirements: 6.1, 6.2
   */
  public static async deleteRequirementItem(projectId: string, itemId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`requirement-items/${itemId}`)
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * List all requirement items for a project with optional filtering
   * Requirements: 6.1, 6.2
   */
  public static async listRequirementItems(
    projectId: string,
    options?: {
      status?: 'new' | 'accepted' | 'rejected';
      priority?: 'low' | 'medium' | 'high' | 'critical';
      skip?: number;
      limit?: number;
    }
  ): Promise<RequirementItem[]> {
    try {
      const params = new URLSearchParams();
      params.append('project_id', projectId);

      if (options?.status) {
        params.append('status', options.status);
      }

      if (options?.priority) {
        params.append('priority', options.priority);
      }

      if (options?.skip !== undefined) {
        params.append('skip', options.skip.toString());
      }

      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }

      const response = await apiClient.get<RequirementItem[]>(
        getVersionedPath(`requirement-items?${params.toString()}`)
      );

      return response.data.map(item => this.mapToRequirementItem(item));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update the status of a specific requirement item
   * Requirements: 6.1, 6.2
   */
  public static async updateRequirementItemStatus(
    itemId: string,
    status: 'new' | 'accepted' | 'rejected'
  ): Promise<RequirementItem> {
    try {
      const response = await apiClient.put<RequirementItem>(
        getVersionedPath(`requirement-items/${itemId}/status`),
        { status }
      );

      return this.mapToRequirementItem(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get a summary of requirement items by status for a specific project
   * Requirements: 6.1, 6.2
   */
  public static async getRequirementItemsSummary(projectId: string): Promise<Record<string, any>> {
    try {
      const response = await apiClient.get<Record<string, any>>(
        getVersionedPath(`requirement-items/projects/${projectId}/summary`)
      );

      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Save the overall requirements system data for a project
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  public static async saveRequirementsSystem(
    projectId: string,
    data: SaveRequirementsSystemRequest
  ): Promise<void> {
    try {
      await apiClient.post(
        getVersionedPath(`projects/${projectId}/requirements-system`),
        {
          document: data.document,
          items: data.items,
          systems: data.systems,
          teams: data.teams,
          metadata: data.metadata || {},
          updated_at: new Date().toISOString()
        }
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update the status of a specific requirement item
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  public static async updateRequirementStatus(
    itemId: string,
    status: 'new' | 'accepted' | 'rejected'
  ): Promise<RequirementItem> {
    try {
      const response = await apiClient.put<RequirementItem>(
        getVersionedPath(`requirement-items/${itemId}/status`),
        {
          status,
          updated_at: new Date().toISOString()
        }
      );

      return this.mapToRequirementItem(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Perform bulk updates on multiple requirements efficiently
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  public static async bulkUpdateRequirements(
    updates: BulkUpdateRequirementRequest[]
  ): Promise<RequirementItem[]> {
    // Validate updates array
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates array must be non-empty');
    }

    // Validate each update object
    for (const update of updates) {
      if (!update.id || typeof update.id !== 'string') {
        throw new Error('Each update must have a valid id');
      }
    }

    try {
      const response = await apiClient.put<RequirementItem[]>(
        getVersionedPath(`requirement-items/bulk-update`),
        {
          updates: updates.map(update => ({
            ...update,
            updated_at: new Date().toISOString()
          }))
        }
      );

      return response.data.map(item => this.mapToRequirementItem(item));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Map API response data to RequirementsDocument interface with proper validation
   */
  public static mapToRequirementsDocument(data: any): RequirementsDocument {
    if (!data) {
      throw new Error('Invalid requirements document data: data is null or undefined');
    }

    // Validate required fields
    if (typeof data.content !== 'string') {
      throw new Error('Invalid requirements document: content must be a string');
    }

    if (!['draft', 'published', 'archived'].includes(data.status)) {
      throw new Error('Invalid requirements document: status must be draft, published, or archived');
    }

    if (!data.project_id) {
      throw new Error('Invalid requirements document: project_id is required');
    }

    // Ensure ID is properly typed
    let documentId: number;
    if (typeof data.id === 'string') {
      documentId = parseInt(data.id, 10);
      if (isNaN(documentId)) {
        throw new Error('Invalid requirements document: id must be a valid number');
      }
    } else if (typeof data.id === 'number') {
      documentId = data.id;
    } else {
      throw new Error('Invalid requirements document: id is required and must be a number');
    }

    return {
      content: data.content,
      status: data.status as 'draft' | 'published' | 'archived',
      id: documentId,
      project_id: data.project_id,
      version: data.version || 1,
      source_type: data.source_type || 'manual' as 'manual' | 'pdf_upload',
      original_filename: data.original_filename || undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    };
  }

  /**
   * Map API response data to RequirementItem interface with proper validation
   */
  public static mapToRequirementItem(data: any): RequirementItem {
    if (!data) {
      throw new Error('Invalid requirement item data: data is null or undefined');
    }

    // Validate required fields
    if (!data.id) {
      throw new Error('Invalid requirement item: id is required');
    }

    if (typeof data.title !== 'string' || !data.title.trim()) {
      throw new Error('Invalid requirement item: title must be a non-empty string');
    }

    if (typeof data.description !== 'string') {
      throw new Error('Invalid requirement item: description must be a string');
    }

    if (!['new', 'accepted', 'rejected'].includes(data.status)) {
      throw new Error('Invalid requirement item: status must be new, accepted, or rejected');
    }

    // Validate priority if present
    if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
      throw new Error('Invalid requirement item: priority must be low, medium, high, or critical');
    }

    // Parse dates with proper error handling
    let createdAt: Date;
    let updatedAt: Date;

    try {
      createdAt = data.created_at ? new Date(data.created_at) : new Date();
      if (isNaN(createdAt.getTime())) {
        createdAt = new Date();
      }
    } catch (error) {
      createdAt = new Date();
    }

    try {
      updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
      if (isNaN(updatedAt.getTime())) {
        updatedAt = new Date();
      }
    } catch (error) {
      updatedAt = new Date();
    }

    return {
      id: data.id.toString(),
      title: data.title.trim(),
      description: data.description,
      status: data.status as 'new' | 'accepted' | 'rejected',
      priority: data.priority as 'low' | 'medium' | 'high' | 'critical' || 'medium',
      project_id: data.project_id,
      created_at: createdAt,
      updated_at: updatedAt,
      source: data.source || 'manual'
    };
  }
}