// src/services/ProjectOutlineApiService.ts

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  ProjectOutline,
  OutlineVersion,
  UpdateOutlineStatusRequest,
  CreateOutlineRequest,
  ProjectOutlineErrorType,
  ProjectOutlineError
} from '../types/projectOutline';
import { apiConfig, getVersionedPath } from '../config/api';
import { ApiErrorInfo, ApiErrorType } from './ProjectApiService';

// Network connectivity detection
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

export class ProjectOutlineApiService {
  private static maxRetries = apiConfig.maxRetries;
  private static baseDelay = apiConfig.retryDelay;
  private static apiClient: any = null;

  /**
   * Get or create axios instance
   */
  private static getApiClient() {
    if (!this.apiClient) {
      this.apiClient = axios.create({
        baseURL: apiConfig.baseUrl,
        timeout: apiConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      this.setupRequestInterceptor();
      this.setupResponseInterceptor();
    }
    return this.apiClient;
  }

  /**
   * Initialize API service with interceptors
   */
  public static initialize(): void {
    this.getApiClient();
  }

  /**
   * Setup request interceptor for logging and validation
   */
  private static setupRequestInterceptor(): void {
    this.apiClient.interceptors.request.use(
      (config) => {
        // Add request timestamp for timeout tracking
        (config as any).metadata = { startTime: new Date() };

        // Log request in development
        if (import.meta.env?.DEV) {
          console.debug('Project Outline API Request:', {
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
    this.apiClient.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful response in development
        if (import.meta.env?.DEV) {
          console.debug('Project Outline API Response:', {
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
            return await this.getApiClient()(originalRequest);
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
    if (!this.isNetworkAvailable()) {
      return {
        type: ApiErrorType.NETWORK,
        message: 'No internet connection. Please check your network and try again.',
        canRetry: true,
        suggestedAction: 'Check your internet connection and retry'
      };
    }

    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
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
          message: data?.message || 'The requested project outline was not found.',
          canRetry: false,
          suggestedAction: 'Verify the project exists and try again'
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
      console.error('Project Outline API Error:', {
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
    // Check current navigator.onLine status for real-time updates
    return typeof navigator !== 'undefined' ? navigator.onLine : isOnline;
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
   * Get the latest project outline for a project
   * Requirements: 2.1, 2.2, 2.3
   */
  public static async getProjectOutline(projectId: string): Promise<ProjectOutline> {
    try {
      const response = await this.getApiClient().get<any>(
        getVersionedPath(`projects/${projectId}/outline`)
      );
      return this.mapToProjectOutline(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get version history for a project outline
   * Requirements: 2.3, 2.4
   */
  public static async getOutlineVersions(projectId: string): Promise<OutlineVersion[]> {
    try {
      const response = await this.getApiClient().get<any>(
        getVersionedPath(`projects/${projectId}/solution-outlines`)
      );
      
      // Handle paginated response
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data.map(version => this.mapToOutlineVersion(version));
      }
      
      return [];
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get a specific version of project outline
   * Requirements: 2.3, 2.4
   */
  public static async getOutlineVersion(projectId: string, version: number): Promise<ProjectOutline> {
    try {
      const response = await this.getApiClient().get<any>(
        getVersionedPath(`projects/${projectId}/solution-outlines/${version}`)
      );
      return this.mapToProjectOutline(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update project outline status
   * Requirements: 2.5
   */
  public static async updateOutlineStatus(
    projectId: string, 
    status: 'draft' | 'active' | 'archived'
  ): Promise<ProjectOutline> {
    try {
      // First get the current outline to get its ID
      const currentOutline = await this.getProjectOutline(projectId);
      
      const response = await this.getApiClient().patch<any>(
        getVersionedPath(`solution-outlines/${currentOutline.id}/status`),
        null,
        {
          params: { status }
        }
      );
      return this.mapToProjectOutline(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create or update project outline
   * Requirements: 2.1, 2.2, 2.5
   */
  public static async saveProjectOutline(
    projectId: string,
    content: string,
    status: 'draft' | 'active' | 'archived' = 'draft'
  ): Promise<ProjectOutline> {
    try {
      const response = await this.getApiClient().post<any>(
        getVersionedPath(`projects/${projectId}/solution-outlines`),
        null,
        {
          params: {
            content,
            status
          }
        }
      );
      return this.mapToProjectOutline(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Map API response data to ProjectOutline interface with proper validation
   */
  public static mapToProjectOutline(data: any): ProjectOutline {
    if (!data) {
      throw new Error('Invalid project outline data: data is null or undefined');
    }

    // Validate required fields
    if (!data.id) {
      throw new Error('Invalid project outline: project_id is required');
    }

    // if (typeof data.content !== 'string') {
    //   throw new Error('Invalid project outline: content must be a string');
    // }

    if (!['draft', 'active', 'archived'].includes(data.state)) {
      throw new Error('Invalid project outline: status must be draft, active, or archived');
    }

    // Ensure ID is properly typed
    let outlineId: string;
    if (typeof data.id === 'string') {
      outlineId = data.id;
    } else if (typeof data.id === 'number') {
      outlineId = data.id.toString();
    } else {
      throw new Error('Invalid project outline: id is required and must be a string or number');
    }

    // Parse version numbers with defaults
    const version = 1;//typeof data.version === 'number' ? data.version : 1;
    const workingVersion = version;//typeof data.working_version === 'number' ? data.working_version : version;

    return {
      id: outlineId,
      project_id: data.project_id,
      content: data.content,
      status: data.status as 'draft' | 'active' | 'archived',
      adrs: data.adrs,
      teams: data.teams,
      notes: data.notes,
      version: version,
      working_version: workingVersion,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      versions: data.versions ? data.versions.map((v: any) => this.mapToOutlineVersion(v)) : undefined
    };
  }

  /**
   * Map API response data to OutlineVersion interface with proper validation
   */
  public static mapToOutlineVersion(data: any): OutlineVersion {
    if (!data) {
      throw new Error('Invalid outline version data: data is null or undefined');
    }

    // Validate required fields
    if (typeof data.version !== 'number') {
      throw new Error('Invalid outline version: version must be a number');
    }

    if (typeof data.content !== 'string') {
      throw new Error('Invalid outline version: content must be a string');
    }

    return {
      version: data.version,
      content: data.content,
      status: data.status || 'draft',
      created_at: data.created_at || new Date().toISOString(),
      changes_summary: data.changes_summary || undefined
    };
  }
}