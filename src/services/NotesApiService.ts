// src/services/NotesApiService.ts

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  UpsertNoteRequest,
  AssociateNoteRequest,
  NoteAssociation,
  NotesFilterOptions,
  NotesSummary,
  NotesErrorType,
  NotesError,
  NoteEntityType,
  defaultNoteValidationRules
} from '../types/notes';
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

export class NotesApiService {
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
          console.debug('Notes API Request:', {
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
          console.debug('Notes API Response:', {
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
          message: data?.message || 'The requested note was not found.',
          canRetry: false,
          suggestedAction: 'Verify the note exists and try again'
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
      console.error('Notes API Error:', {
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
   * List all notes for a project with optional filtering
   * Requirements: 6.1, 6.2, 6.4
   */
  public static async listNotes(
    projectId: string,
    options?: NotesFilterOptions
  ): Promise<Note[]> {
    try {
      const params = new URLSearchParams();

      if (options?.entity_type) {
        params.append('entity_type', options.entity_type);
      }

      if (options?.entity_id) {
        params.append('entity_id', options.entity_id);
      }

      if (options?.tags && options.tags.length > 0) {
        params.append('tags', options.tags.join(','));
      }

      if (options?.author) {
        params.append('author', options.author);
      }

      if (options?.search_query) {
        params.append('search_query', options.search_query);
      }

      if (options?.skip !== undefined) {
        params.append('skip', options.skip.toString());
      }

      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }

      const response = await apiClient.get<Note[]>(
        getVersionedPath(`projects/${projectId}/notes?${params.toString()}`)
      );

      return response.data.data.map(note => this.mapToNote(note));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get a specific note by ID
   * Requirements: 6.1, 6.2
   */
  public static async getNote(noteId: string): Promise<Note> {
    try {
      const response = await apiClient.get<Note>(
        getVersionedPath(`notes/${noteId}`)
      );

      return this.mapToNote(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create a new note
   * Requirements: 6.1, 6.2
   */
  public static async createNote(
    projectId: string,
    note: CreateNoteRequest
  ): Promise<Note> {
    try {
      // Validate note data before sending
      this.validateNoteData(note);

      const response = await apiClient.post<Note>(
        getVersionedPath(`projects/${projectId}/notes`),
        {
          title: note.title.trim(),
          content: note.content.trim(),
          tags: note.tags || [],
          associations: note.associations || []
        }
      );

      return this.mapToNote(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Update an existing note
   * Requirements: 6.1, 6.2
   */
  public static async updateNote(
    noteId: string,
    updates: UpdateNoteRequest
  ): Promise<Note> {
    try {
      // Validate update data before sending
      if (updates.title !== undefined || updates.content !== undefined) {
        this.validateNoteData(updates as CreateNoteRequest);
      }

      const cleanUpdates: any = {};

      if (updates.title !== undefined) {
        cleanUpdates.title = updates.title.trim();
      }

      if (updates.content !== undefined) {
        cleanUpdates.content = updates.content.trim();
      }

      if (updates.tags !== undefined) {
        cleanUpdates.tags = updates.tags;
      }

      if (updates.associations !== undefined) {
        cleanUpdates.associations = updates.associations;
      }

      const response = await apiClient.put<Note>(
        getVersionedPath(`notes/${noteId}`),
        cleanUpdates
      );

      return this.mapToNote(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Delete a note
   * Requirements: 6.1, 6.2
   */
  public static async deleteNote(noteId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`notes/${noteId}`)
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Create or update an ADR using upsert functionality
   * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  public static async upsertNote(projectId: string, noteTitle: string, noteContent: string, noteTags: string[], noteId?: string,): Promise<Note> {
    try {
      // Validate required fields before sending request


      const requestPayload = {
        title: noteTitle,
        author: "",//author,
        tags: noteTags,
        content: noteContent,
        ...(noteId && { note_id: noteId }) // Include adr_id only if provided (for updates)
      };

      this.validateUpserNoteRequest(requestPayload);

      const response = await apiClient.post<Note>(
        getVersionedPath(`projects/${projectId}/notes`),
        requestPayload
      );

      return this.mapToNote(response.data);
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Associate a note with an entity (requirement, ADR, system, team)
   * Requirements: 6.3, 6.4
   */
  public static async associateNote(
    noteId: string,
    association: AssociateNoteRequest
  ): Promise<void> {
    try {
      // Validate association data
      this.validateAssociation(association);

      await apiClient.post(
        getVersionedPath(`notes/${noteId}/associations`),
        {
          entity_type: association.entity_type,
          entity_id: association.entity_id,
          context: association.context
        }
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Remove an association between a note and an entity
   * Requirements: 6.3, 6.4
   */
  public static async disassociateNote(
    noteId: string,
    entityType: NoteEntityType,
    entityId: string
  ): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`notes/${noteId}/associations/${entityType}/${entityId}`)
      );
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Search notes with full-text search
   * Requirements: 6.4, 6.5
   */
  public static async searchNotes(
    projectId: string,
    query: string,
    options?: {
      entity_type?: NoteEntityType;
      tags?: string[];
      limit?: number;
    }
  ): Promise<Note[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);

      if (options?.entity_type) {
        params.append('entity_type', options.entity_type);
      }

      if (options?.tags && options.tags.length > 0) {
        params.append('tags', options.tags.join(','));
      }

      if (options?.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }

      const response = await apiClient.get<Note[]>(
        getVersionedPath(`projects/${projectId}/notes/search?${params.toString()}`)
      );

      return response.data.map(note => this.mapToNote(note));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get notes summary for dashboard display
   * Requirements: 6.1, 6.5
   */
  public static async getNotesSummary(projectId: string): Promise<NotesSummary> {
    try {
      const response = await apiClient.get<NotesSummary>(
        getVersionedPath(`projects/${projectId}/notes/summary`)
      );

      return {
        total_notes: response.data.total_notes || 0,
        notes_by_entity_type: response.data.notes_by_entity_type || {},
        recent_notes: (response.data.recent_notes || []).map(note => this.mapToNote(note)),
        popular_tags: response.data.popular_tags || []
      };
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get notes associated with a specific entity
   * Requirements: 6.3, 6.4
   */
  public static async getNotesForEntity(
    projectId: string,
    entityType: NoteEntityType,
    entityId: string
  ): Promise<Note[]> {
    try {
      const response = await apiClient.get<Note[]>(
        getVersionedPath(`projects/${projectId}/notes/entity/${entityType}/${entityId}`)
      );

      return response.data.map(note => this.mapToNote(note));
    } catch (error) {
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Validate note data before API calls
   */
  private static validateNoteData(note: CreateNoteRequest): void {
    const rules = defaultNoteValidationRules;

    // Validate title
    if (rules.title.required && (!note.title || note.title.trim().length === 0)) {
      throw new Error('Note title is required');
    }

    if (note.title && note.title.trim().length < rules.title.minLength) {
      throw new Error(`Note title must be at least ${rules.title.minLength} characters`);
    }

    if (note.title && note.title.trim().length > rules.title.maxLength) {
      throw new Error(`Note title must not exceed ${rules.title.maxLength} characters`);
    }

    // Validate content
    if (rules.content.required && (!note.content || note.content.trim().length === 0)) {
      throw new Error('Note content is required');
    }

    if (note.content && note.content.trim().length < rules.content.minLength) {
      throw new Error(`Note content must be at least ${rules.content.minLength} characters`);
    }

    if (note.content && note.content.trim().length > rules.content.maxLength) {
      throw new Error(`Note content must not exceed ${rules.content.maxLength} characters`);
    }

    // Validate tags
    if (note.tags && note.tags.length > rules.tags.maxCount) {
      throw new Error(`Note cannot have more than ${rules.tags.maxCount} tags`);
    }

    if (note.tags) {
      for (const tag of note.tags) {
        if (tag.length > rules.tags.maxTagLength) {
          throw new Error(`Tag "${tag}" exceeds maximum length of ${rules.tags.maxTagLength} characters`);
        }
      }
    }

    // Validate associations
    if (note.associations && note.associations.length > rules.associations.maxCount) {
      throw new Error(`Note cannot have more than ${rules.associations.maxCount} associations`);
    }

    if (note.associations) {
      for (const association of note.associations) {
        this.validateAssociation(association);
      }
    }
  }

  /**
   * Validate note association data
   */
  private static validateAssociation(association: NoteAssociation | AssociateNoteRequest): void {
    const validEntityTypes: NoteEntityType[] = ['requirement', 'adr', 'system', 'team'];

    if (!association.entity_type) {
      throw new Error('Association entity_type is required');
    }

    if (!validEntityTypes.includes(association.entity_type)) {
      throw new Error(`Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`);
    }

    if (!association.entity_id || association.entity_id.trim().length === 0) {
      throw new Error('Association entity_id is required');
    }

    if (association.context && association.context.length > 500) {
      throw new Error('Association context must not exceed 500 characters');
    }
  }

  /**
   * Map API response data to Note interface with proper validation
   */
  public static mapToNote(data: any): Note {
    if (!data) {
      throw new Error('Invalid note data: data is null or undefined');
    }

    // Validate required fields
    if (!data.id) {
      throw new Error('Invalid note: id is required');
    }

    if (!data.project_id) {
      throw new Error('Invalid note: project_id is required');
    }

    if (typeof data.title !== 'string' || !data.title.trim()) {
      throw new Error('Invalid note: title must be a non-empty string');
    }

    if (typeof data.content !== 'string') {
      throw new Error('Invalid note: content must be a string');
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

    // Validate and clean tags
    let tags: string[] = [];
    if (Array.isArray(data.tags)) {
      tags = data.tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim());
    }

    // Validate and clean associations
    let associations: NoteAssociation[] = [];
    if (Array.isArray(data.associations)) {
      associations = data.associations
        .filter(assoc =>
          assoc &&
          typeof assoc.entity_type === 'string' &&
          typeof assoc.entity_id === 'string' &&
          ['requirement', 'adr', 'system', 'team'].includes(assoc.entity_type)
        )
        .map(assoc => ({
          entity_type: assoc.entity_type as NoteEntityType,
          entity_id: assoc.entity_id.trim(),
          context: assoc.context ? assoc.context.trim() : undefined
        }));
    }

    return {
      id: data.id.toString(),
      project_id: data.project_id.toString(),
      title: data.title.trim(),
      content: data.content,
      author: "",//data.author.trim(),
      created_at: createdAt,
      updated_at: updatedAt,
      tags
      // associations
    };
  }


  /**
     * Validate upsert ADR request data
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
  private static validateUpserNoteRequest(note: UpdateNoteRequest): void {
    if (!note.title || typeof note.title !== 'string' || !note.title.trim()) {
      throw new Error('Invalid note: title must be a non-empty string');
    }

    if (!note.content || typeof note.content !== 'string') {
      throw new Error('Invalid note: context must be a non-empty string');
    }


    if (!Array.isArray(note.tags)) {
      throw new Error('Invalid note: tags must be an array');
    }

    // Validate tags array contains only strings
    for (const tag of note.tags) {
      if (typeof tag !== 'string') {
        throw new Error('Invalid note: all tags must be strings');
      }
    }


  }
}