/**
 * ADR API Service
 * Handles all API operations for Architectural Decision Records
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  ADR,
  CreateADRRequest,
  UpdateADRRequest,
  UpsertADRRequest,
  ADRListResponse
} from '../types/adr';
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

export class ADRApiService {
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
          console.debug('ADR API Request:', {
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
          console.debug('ADR API Response:', {
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
          message: data?.message || 'The requested ADR was not found.',
          canRetry: false,
          suggestedAction: 'Verify the ADR exists and try again'
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
      console.error('ADR API Error:', {
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
   * List all ADRs for a project with pagination support
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  public static async listADRs(
    projectId: string,
    options?: {
      page?: number;
      per_page?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      search?: string;
    }
  ): Promise<ADR[]> {
    try {
      const params = new URLSearchParams();
      
      if (options?.page) {
        params.append('page', options.page.toString());
      }
      
      if (options?.per_page) {
        params.append('per_page', options.per_page.toString());
      }
      
      if (options?.sort_by) {
        params.append('sort_by', options.sort_by);
      }
      
      if (options?.sort_order) {
        params.append('sort_order', options.sort_order);
      }
      
      if (options?.search) {
        params.append('search', options.search);
      }

      const queryString = params.toString();
      const url = queryString 
        ? `${getVersionedPath(`projects/${projectId}/adrs`)}?${queryString}`
        : getVersionedPath(`projects/${projectId}/adrs`);

      const response = await apiClient.get<ADRListResponse>(url);
      
      // Map the ADR data in the response
      return response.data.data.map(adr => this.mapToADR(adr));
      
      // return {
      //   ...response.data,
      //   data: mappedData
      // };
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get a specific ADR by ID
   * Requirements: 9.1, 9.2
   */
  public static async getADR(adrId: string): Promise<ADR> {
    try {
      const response = await apiClient.get<ADR>(
        getVersionedPath(`adrs/${adrId}`)
      );
      return this.mapToADR(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create or update an ADR using upsert functionality
   * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  public static async upsertADR(projectId: string, adr: ADR): Promise<ADR> {
    try {
      const requestPayload = {
        title: adr.title,
        status: adr.status,
        context: adr.context,
        decision: adr.decision,
        consequences: adr.consequences,
        alternatives: adr.alternatives || '',
        content: adr.context,//`${adr.context}\n\n${adr.decision}\n\n${adr.consequences}${adr.alternatives ? '\n\n' + adr.alternatives : ''}`,
        author: adr.author,
        tags: adr.tags,
        ...(adr.id && { id: adr.id }) // Include adr_id only if provided (for updates)
      };

      // Validate required fields before sending request
      this.validateUpsertADRRequest(requestPayload);      

      const response = await apiClient.post<ADR>(
        getVersionedPath(`projects/${projectId}/adrs`),
        requestPayload
      );
      
      return this.mapToADR(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create a new ADR (legacy method - use upsertADR instead)
   * @deprecated Use upsertADR instead
   * Requirements: 9.2, 9.3
   */
  public static async createADR(projectId: string, adr: CreateADRRequest): Promise<ADR> {
    const upsertRequest: UpsertADRRequest = {
      title: adr.title,
      status: adr.status || 'proposed',
      context: adr.context,
      decision: adr.decision,
      consequences: adr.consequences,
      alternatives: adr.alternatives,
      author: adr.author,
      tags: adr.tags || [],
      content: `${adr.context}\n\n${adr.decision}\n\n${adr.consequences}${adr.alternatives ? '\n\n' + adr.alternatives : ''}`
    };
    
    return this.upsertADR(projectId, upsertRequest);
  }

  /**
   * Update an existing ADR (legacy method - use upsertADR instead)
   * @deprecated Use upsertADR instead
   * Requirements: 9.3, 9.4
   */
  public static async updateADR(adrId: string, updates: UpdateADRRequest): Promise<ADR> {
    // For legacy support, we need to get the current ADR first to build the complete upsert request
    const currentADR = await this.getADR(adrId);
    
    const upsertRequest: UpsertADRRequest = {
      title: updates.title || currentADR.title,
      status: updates.status || currentADR.status,
      context: updates.context || currentADR.context,
      decision: updates.decision || currentADR.decision,
      consequences: updates.consequences || currentADR.consequences,
      alternatives: updates.alternatives !== undefined ? updates.alternatives : currentADR.alternatives,
      author: currentADR.author,
      tags: updates.tags || currentADR.tags,
      content: `${updates.context || currentADR.context}\n\n${updates.decision || currentADR.decision}\n\n${updates.consequences || currentADR.consequences}${(updates.alternatives !== undefined ? updates.alternatives : currentADR.alternatives) ? '\n\n' + (updates.alternatives !== undefined ? updates.alternatives : currentADR.alternatives) : ''}`,
      adr_id: parseInt(adrId)
    };
    
    return this.upsertADR(currentADR.project_id, upsertRequest);
  }

  /**
   * Delete an ADR
   * Requirements: 9.7
   */
  public static async deleteADR(adrId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`adrs/${adrId}`)
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Search ADRs with full-text search
   * Requirements: 9.5, 9.6
   */
  public static async searchADRs(projectId: string, query: string): Promise<ADR[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);

      const response = await apiClient.get<ADR[]>(
        getVersionedPath(`projects/${projectId}/adrs/search?${params.toString()}`)
      );
      return response.data.map(adr => this.mapToADR(adr));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Filter ADRs by status, tags, or other criteria
   * Requirements: 9.6
   */
  public static async filterADRs(
    projectId: string,
    options: {
      status?: string;
      tags?: string[];
      author?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ADR[]> {
    try {
      const params = new URLSearchParams();
      
      if (options.status) {
        params.append('status', options.status);
      }
      
      if (options.tags && options.tags.length > 0) {
        options.tags.forEach(tag => params.append('tags', tag));
      }
      
      if (options.author) {
        params.append('author', options.author);
      }
      
      if (options.dateFrom) {
        params.append('date_from', options.dateFrom);
      }
      
      if (options.dateTo) {
        params.append('date_to', options.dateTo);
      }

      const response = await apiClient.get<ADR[]>(
        getVersionedPath(`projects/${projectId}/adrs?${params.toString()}`)
      );
      return response.data.map(adr => this.mapToADR(adr));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get ADR statistics for a project
   * Requirements: 9.1
   */
  public static async getADRStats(projectId: string): Promise<Record<string, any>> {
    try {
      const response = await apiClient.get<Record<string, any>>(
        getVersionedPath(`projects/${projectId}/adrs/stats`)
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Validate upsert ADR request data
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  private static validateUpsertADRRequest(adr: UpsertADRRequest): void {
    if (!adr.title || typeof adr.title !== 'string' || !adr.title.trim()) {
      throw new Error('Invalid ADR: title must be a non-empty string');
    }

    if (!['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'].includes(adr.status)) {
      throw new Error('Invalid ADR: status must be proposed, accepted, rejected, deprecated, or superseded');
    }

    if (!adr.context || typeof adr.context !== 'string') {
      throw new Error('Invalid ADR: context must be a non-empty string');
    }

    if (!adr.decision || typeof adr.decision !== 'string') {
      throw new Error('Invalid ADR: decision must be a non-empty string');
    }

    if (!adr.consequences || typeof adr.consequences !== 'string') {
      throw new Error('Invalid ADR: consequences must be a non-empty string');
    }

    if (!adr.author || typeof adr.author !== 'string' || !adr.author.trim()) {
      throw new Error('Invalid ADR: author must be a non-empty string');
    }

    if (!adr.content || typeof adr.content !== 'string') {
      throw new Error('Invalid ADR: content must be a non-empty string');
    }

    if (!Array.isArray(adr.tags)) {
      throw new Error('Invalid ADR: tags must be an array');
    }

    // Validate tags array contains only strings
    for (const tag of adr.tags) {
      if (typeof tag !== 'string') {
        throw new Error('Invalid ADR: all tags must be strings');
      }
    }

    // Validate adr_id if provided (for updates)
    if (adr.adr_id !== undefined && (!Number.isInteger(adr.adr_id) || adr.adr_id <= 0)) {
      throw new Error('Invalid ADR: adr_id must be a positive integer');
    }
  }

  /**
   * Map API response data to ADR interface with proper validation
   */
  public static mapToADR(data: any): ADR {
    if (!data) {
      throw new Error('Invalid ADR data: data is null or undefined');
    }

    // Validate required fields
    if (!data.id) {
      throw new Error('Invalid ADR: id is required');
    }

    if (typeof data.title !== 'string' || !data.title.trim()) {
      throw new Error('Invalid ADR: title must be a non-empty string');
    }

    // Check for missing fields and provide detailed error message
    const missingFields: string[] = [];
    
    if (!data.status) missingFields.push('status');
    if (!data.context) missingFields.push('context');
    if (!data.decision) missingFields.push('decision');
    if (!data.consequences) missingFields.push('consequences');
    if (!data.author) missingFields.push('author');

    if (missingFields.length > 0) {
      console.error('Server response missing ADR fields:', missingFields);
      console.error('Actual server response:', data);
      throw new Error(`Invalid ADR: missing required fields: ${missingFields.join(', ')}. Server may not be returning complete ADR objects.`);
    }

    if (!['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'].includes(data.status)) {
      throw new Error('Invalid ADR: status must be proposed, accepted, rejected, deprecated, or superseded');
    }

    if (typeof data.context !== 'string') {
      throw new Error('Invalid ADR: context must be a string');
    }

    if (typeof data.decision !== 'string') {
      throw new Error('Invalid ADR: decision must be a string');
    }

    if (typeof data.consequences !== 'string') {
      throw new Error('Invalid ADR: consequences must be a string');
    }

    if (typeof data.author !== 'string' || !data.author.trim()) {
      throw new Error('Invalid ADR: author must be a non-empty string');
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
      project_id: data.project_id,
      title: data.title.trim(),
      status: data.status,
      context: data.context,
      decision: data.decision,
      consequences: data.consequences,
      alternatives: data.alternatives || '',
      author: data.author.trim(),
      created_at: createdAt,
      updated_at: updatedAt,
      tags: Array.isArray(data.tags) ? data.tags.filter((tag: any) => typeof tag === 'string') : [],
      superseded_by: data.superseded_by || undefined,
      supersedes: Array.isArray(data.supersedes) ? data.supersedes.filter((id: any) => typeof id === 'string') : []
    };
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
}