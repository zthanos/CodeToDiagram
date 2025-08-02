// src/services/ProjectApiService.ts

import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import { Project, Diagram, Requirement, Task, Team, DiagramType } from '../types/project';
import { apiConfig, getVersionedPath } from '../config/api';

// Error types for categorization
export enum ApiErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface ApiErrorInfo {
  type: ApiErrorType;
  message: string;
  details?: any;
  canRetry: boolean;
  suggestedAction?: string;
}

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

export class ProjectApiService {
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
        
        // Log request in development (using notification service for consistency)
        if (import.meta.env?.DEV) {
          // Development logging - could be enhanced with debug notification service
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
          // Development logging - could be enhanced with debug notification service
        }
        
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
        
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
          
          // Retry logic - could be enhanced with notification service for user feedback
          
          await this.delay(delay);
          
          try {
            return await apiClient(originalRequest);
          } catch (retryError) {
            if (originalRequest._retryCount >= this.maxRetries) {
              return Promise.reject(this.handleApiError(retryError as AxiosError));
            }
            // Continue with retry logic
            return this.setupResponseInterceptor();
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
      console.error('API Error:', {
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
  private static shouldRetry(config: AxiosRequestConfig & { _retryCount?: number }): boolean {
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
        // Retry logic - could be enhanced with notification service for user feedback
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  public static async listProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<Project[]>(getVersionedPath('projects'));
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async createProject(id: string, name: string, description?: string, code?: string, state?: string): Promise<Project> {
    try {
      const response = await apiClient.post<Project>(getVersionedPath('projects'), { 
        id, 
        name, 
        description, 
        code: code || id, // Use provided code or fallback to id
        state: state || 'active' 
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async getProjectOutline(projectId: string): Promise<Project> {
    try {
      const response = await apiClient.get<Project>(getVersionedPath(`projects/${projectId}/outline`));
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async addDiagram(projectId: string, title: string, mermaid_code: string, type: string): Promise<Diagram> {
    try {
      const response = await apiClient.post<Diagram>(getVersionedPath(`projects/${projectId}/diagrams/add`), {
        title,
        mermaid_code,
        type,
      });
      return this.mapToDiagram(response.data, projectId);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async updateDiagram(projectId: string, diagramId: number, title: string, mermaid_code: string, type: string): Promise<Diagram> {
    try {
      const response = await apiClient.put<Diagram>(getVersionedPath(`projects/${projectId}/diagrams/${diagramId}`), {
        title,
        mermaid_code,
        type,
      });
      return this.mapToDiagram(response.data, projectId);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async getDiagram(projectId: string, diagramId: number): Promise<Diagram> {
    try {
      const response = await apiClient.get<Diagram>(getVersionedPath(`projects/${projectId}/diagrams/${diagramId}`));
      return this.mapToDiagram(response.data, projectId);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Map API response data to Diagram interface with proper type handling
   */
  public static mapToDiagram(data: any, projectId: string): Diagram {
    // Validate required fields
    if (!data) {
      throw new Error('Invalid diagram data: data is null or undefined');
    }

    // Ensure ID is properly typed (number or null)
    let diagramId: number | null = null;
    if (data.id !== undefined && data.id !== null) {
      const parsedId = typeof data.id === 'string' ? parseInt(data.id, 10) : data.id;
      if (!isNaN(parsedId) && isFinite(parsedId)) {
        diagramId = parsedId;
      }
    }

    // Validate and normalize diagram type
    const validTypes: DiagramType[] = ['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'journey'];
    let diagramType: DiagramType = 'flowchart'; // default
    if (data.type && typeof data.type === 'string') {
      const normalizedType = data.type.toLowerCase() as DiagramType;
      if (validTypes.includes(normalizedType)) {
        diagramType = normalizedType;
      }
    }

    // Parse dates with proper error handling
    let createdAt: Date | undefined;
    let lastModified: Date | undefined;

    if (data.created_at) {
      try {
        const parsedDate = new Date(data.created_at);
        if (!isNaN(parsedDate.getTime())) {
          createdAt = parsedDate;
        }
      } catch (error) {
        console.warn('Invalid created_at date format:', data.created_at);
      }
    }

    if (data.updated_at) {
      try {
        const parsedDate = new Date(data.updated_at);
        if (!isNaN(parsedDate.getTime())) {
          lastModified = parsedDate;
        }
      } catch (error) {
        console.warn('Invalid updated_at date format:', data.updated_at);
      }
    }

    // Create diagram with validated data
    const diagram: Diagram = {
      id: diagramId,
      projectId: projectId,
      title: data.title && typeof data.title === 'string' ? data.title.trim() : '',
      content: data.mermaid_code && typeof data.mermaid_code === 'string' ? data.mermaid_code : '',
      type: diagramType,
      createdAt,
      lastModified,
      // Keep original API fields for compatibility
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return diagram;
  }
  


  public static async listDiagrams(projectId: string): Promise<Diagram[]> {
    try {
      const response = await apiClient.get<Diagram[]>(getVersionedPath(`projects/${projectId}/diagrams/list`));
      return response.data.map(diagram => this.mapToDiagram(diagram, projectId));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async deleteDiagram(projectId: string, diagramId: number): Promise<any> {
    try {
      const response = await apiClient.delete(getVersionedPath(`projects/${projectId}/diagrams/${diagramId}/delete`));
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async addRequirement(projectId: string, description: string, category: 'Functional' | 'Non-Functional'): Promise<Requirement> {
    try {
      const response = await apiClient.post<Requirement>(getVersionedPath(`projects/${projectId}/requirements/add`), {
        description,
        category,
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async assignTeam(projectId: string, name: string, members?: string): Promise<Team> {
    try {
      const response = await apiClient.post<Team>(getVersionedPath(`projects/${projectId}/teams/assign`), {
        name,
        members,
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async createTask(projectId: string, description: string, assigned_to_team_id?: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(getVersionedPath(`projects/${projectId}/tasks/create`), {
        description,
        assigned_to_team_id,
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  // File upload and requirements processing methods
  public static async uploadFilesForRequirements(projectId: string, files: File[]): Promise<Requirement[]> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append(`files`, file);
      });

      const response = await apiClient.post<Requirement[]>(
        getVersionedPath(`projects/${projectId}/requirements/upload-and-process`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 240000, // 4 minutes for file processing
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async listRequirements(projectId: string): Promise<Requirement[]> {
    try {
      const response = await apiClient.get<Requirement[]>(getVersionedPath(`projects/${projectId}/requirements/list`));
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async updateRequirement(projectId: string, requirementId: number, description: string, category: 'Functional' | 'Non-Functional'): Promise<Requirement> {
    try {
      const response = await apiClient.put<Requirement>(getVersionedPath(`projects/${projectId}/requirements/${requirementId}`), {
        description,
        category,
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  public static async deleteRequirement(projectId: string, requirementId: number): Promise<void> {
    try {
      await apiClient.delete(getVersionedPath(`projects/${projectId}/requirements/${requirementId}`));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }
}
