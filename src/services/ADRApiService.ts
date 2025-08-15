// src/services/ADRApiService.ts

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  ADR,
  CreateADRRequest,
  UpdateADRRequest,
  ADRListOptions,
  ADRSearchResult,
  ADRSummary,
  ADRErrorType,
  ADRError,
  ADRStatus
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
   * List all ADRs for a project with optional filtering and pagination
   * Requirements: 8.1, 8.2, 9.1, 9.2
   */
  public static async listADRs(projectId: string, options?: ADRListOptions): Promise<ADR[]> {
    try {
      const params = new URLSearchParams();
      
      if (options?.skip !== undefined) {
        params.append('skip', options.skip.toString());
      }
      
      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }
      
      if (options?.sortBy) {
        params.append('sort_by', options.sortBy);
      }
      
      if (options?.sortOrder) {
        params.append('sort_order', options.sortOrder);
      }

      // Add filter parameters
      if (options?.filter) {
        if (options.filter.status && options.filter.status.length > 0) {
          params.append('status', options.filter.status.join(','));
        }
        
        if (options.filter.author && options.filter.author.length > 0) {
          params.append('author', options.filter.author.join(','));
        }
        
        if (options.filter.tags && options.filter.tags.length > 0) {
          params.append('tags', options.filter.tags.join(','));
        }
        
        if (options.filter.dateRange) {
          params.append('date_start', options.filter.dateRange.start.toISOString());
          params.append('date_end', options.filter.dateRange.end.toISOString());
        }
        
        if (options.filter.searchQuery) {
          params.append('search', options.filter.searchQuery);
        }
      }

      const queryString = params.toString();
      const url = queryString 
        ? getVersionedPath(`projects/${projectId}/adrs?${queryString}`)
        : getVersionedPath(`projects/${projectId}/adrs`);

      const response = await apiClient.get<ADR[]>(url);
      return response.data.map(adr => this.mapToADR(adr));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get a specific ADR by ID
   * Requirements: 8.1, 8.3, 9.1
   */
  public static async getADR(projectId: string, adrId: string): Promise<ADR> {
    try {
      const response = await apiClient.get<ADR>(
        getVersionedPath(`projects/${projectId}/adrs/${adrId}`)
      );
      return this.mapToADR(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create a new ADR
   * Requirements: 9.2, 9.4
   */
  public static async createADR(projectId: string, adr: CreateADRRequest): Promise<ADR> {
    try {
      const response = await apiClient.post<ADR>(
        getVersionedPath(`projects/${projectId}/adrs`),
        {
          title: adr.title,
          status: adr.status || 'proposed',
          context: adr.context,
          decision: adr.decision,
          consequences: adr.consequences,
          alternatives: adr.alternatives,
          author: adr.author,
          tags: adr.tags || [],
          supersedes: adr.supersedes || []
        }
      );
      return this.mapToADR(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update an existing ADR
   * Requirements: 9.3, 9.4
   */
  public static async updateADR(projectId: string, adrId: string, updates: UpdateADRRequest): Promise<ADR> {
    try {
      const response = await apiClient.put<ADR>(
        getVersionedPath(`projects/${projectId}/adrs/${adrId}`),
        updates
      );
      return this.mapToADR(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Delete an ADR
   * Requirements: 9.7
   */
  public static async deleteADR(projectId: string, adrId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`projects/${projectId}/adrs/${adrId}`)
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Search ADRs with full-text search support
   * Requirements: 8.5, 9.5, 9.6
   */
  public static async searchADRs(projectId: string, query: string, options?: {
    limit?: number;
    includeHighlights?: boolean;
  }): Promise<ADRSearchResult[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }
      
      if (options?.includeHighlights !== undefined) {
        params.append('include_highlights', options.includeHighlights.toString());
      }

      const response = await apiClient.get<ADRSearchResult[]>(
        getVersionedPath(`projects/${projectId}/adrs/search?${params.toString()}`)
      );

      return response.data.map(result => ({
        ...result,
        adr: this.mapToADR(result.adr)
      }));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get ADR summary for project overview
   * Requirements: 8.1, 8.2
   */
  public static async getADRSummary(projectId: string): Promise<ADRSummary> {
    try {
      const response = await apiClient.get<ADRSummary>(
        getVersionedPath(`projects/${projectId}/adrs/summary`)
      );

      return {
        ...response.data,
        recent: response.data.recent.map(adr => this.mapToADR(adr)),
        most_referenced: response.data.most_referenced.map(adr => this.mapToADR(adr))
      };
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get ADRs that supersede a specific ADR
   * Requirements: 8.4, 9.1
   */
  public static async getSupersedingADRs(projectId: string, adrId: string): Promise<ADR[]> {
    try {
      const response = await apiClient.get<ADR[]>(
        getVersionedPath(`projects/${projectId}/adrs/${adrId}/superseding`)
      );
      return response.data.map(adr => this.mapToADR(adr));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get ADRs that are superseded by a specific ADR
   * Requirements: 8.4, 9.1
   */
  public static async getSupersededADRs(projectId: string, adrId: string): Promise<ADR[]> {
    try {
      const response = await apiClient.get<ADR[]>(
        getVersionedPath(`projects/${projectId}/adrs/${adrId}/superseded`)
      );
      return response.data.map(adr => this.mapToADR(adr));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
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

    if (!['proposed', 'accepted', 'deprecated', 'superseded'].includes(data.status)) {
      throw new Error('Invalid ADR: status must be proposed, accepted, deprecated, or superseded');
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

    // Validate and normalize arrays
    const tags = Array.isArray(data.tags) ? data.tags.filter(tag => typeof tag === 'string') : [];
    const supersedes = Array.isArray(data.supersedes) ? data.supersedes.filter(id => typeof id === 'string') : [];

    return {
      id: data.id.toString(),
      project_id: data.project_id,
      title: data.title.trim(),
      status: data.status as ADRStatus,
      context: data.context,
      decision: data.decision,
      consequences: data.consequences,
      alternatives: data.alternatives || undefined,
      author: data.author.trim(),
      created_at: createdAt,
      updated_at: updatedAt,
      tags,
      superseded_by: data.superseded_by || undefined,
      supersedes
    };
  }
}