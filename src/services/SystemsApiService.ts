/**
 * System API Service
 * Handles all API operations for Systems
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
    RequiredSystem,
    UpsertRequiredSystemRequest,
    RequiredSystemListResponse
} from '../types/system'
import { apiConfig, getVersionedPath } from '@/config/api';
import { ApiErrorInfo, ApiErrorType } from './ProjectApiService';
import { SystemInfo } from '@/types';

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


export class RequiredSystemApiService {
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
                    console.debug('RequiredSystem API Request:', {
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
                    console.debug('RequiredSystem API Response:', {
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
 * Handle API errors with proper categorization and user-friendly messages
 */
    private static handleApiError(error: AxiosError): ApiErrorInfo {
        const errorInfo = this.categorizeError(error);

        // Log error details in development
        if (import.meta.env?.DEV) {
            console.error('RequiredSystem API Error:', {
                type: errorInfo.type,
                message: errorInfo.message,
                details: errorInfo.details,
                originalError: error
            });
        }

        return errorInfo;
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
       * List all ADRs for a project with pagination support
       * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
       */
    public static async listRequiredSystems(
        projectId: string,
        options?: {
            page?: number;
            per_page?: number;
            sort_by?: string;
            sort_order?: 'asc' | 'desc';
            search?: string;
        }
    ): Promise<SystemInfo[]> {
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
                ? `${getVersionedPath(`projects/${projectId}/systems`)}?${queryString}`
                : getVersionedPath(`projects/${projectId}/systems`);

            const response = await apiClient.get<RequiredSystemListResponse>(url);

            // Map the request_system data in the response
            const mappedData = response.data.data.map(request_system => this.mapToRequiredSystem(request_system));

            return response.data.data.map(system => this.mapToRequiredSystem(system));
        } catch (error) {
            throw this.handleApiError(error as AxiosError);
        }
    }


    /**
     * Create or update an RequiredSystem using upsert functionality
     * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5
     */
    public static async upsertRequiredSystem(projectId: string,
        id?: string,
        name?: string,
        system_type?: string,
        description?: string,
        dependencies?: string[]
    ): Promise<SystemInfo> {
        try {


            const requestPayload = {
                name: name,
                description: description,
                type: system_type,
                dependencies:dependencies,
                ...(id && { id: id }) // Include adr_id only if provided (for updates)
            };
            // Validate required fields before sending request
            this.validateUpsertRequiredSystemRequest(requestPayload);

            const response = await apiClient.post<UpsertRequiredSystemRequest>(
                getVersionedPath(`projects/${projectId}/systems`),
                requestPayload
            );

            return this.mapToRequiredSystem(response.data);
        } catch (error) {
            throw this.handleApiError(error as AxiosError);
        }
    }

    /**
     * Validate upsert system request data
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    private static validateUpsertRequiredSystemRequest(system: UpsertRequiredSystemRequest): void {
        if (!system.name || typeof system.name !== 'string') {
            throw new Error('Invalid System: name must be a non-empty string');
        }

        if (!['internal', 'external', 'integration'].includes(system.type)) {
            throw new Error('Invalid System: status must be proposed, accepted, rejected, deprecated, or superseded');
        }


        if (!Array.isArray(system.dependencies)) {
            throw new Error('Invalid System: tags must be an array');
        }

        // Validate tags array contains only strings
        for (const dependency of system.dependencies) {
            if (typeof dependency !== 'string') {
                throw new Error('Invalid System: all dependencies must be strings');
            }
        }

        // Validate adr_id if provided (for updates)
        // if (system.id !== undefined && (!Number.isInteger(system.id) || system.id <= 0)) {
        //     throw new Error('Invalid System: id must be a positive integer');
        // }
    }



    /**
       * Map API response data to ADR interface with proper validation
       */
    public static mapToRequiredSystem(data: any): SystemInfo {
        if (!data) {
            throw new Error('Invalid RequiredSystem data: data is null or undefined');
        }

        // Validate required fields
        if (!data.id) {
            throw new Error('Invalid RequiredSystem: id is required');
        }

        if (typeof data.name !== 'string' || !data.name.trim()) {
            throw new Error('Invalid RequiredSystem: name must be a non-empty string');
        }

        // Check for missing fields and provide detailed error message
        const missingFields: string[] = [];

        if (!data.name) missingFields.push('name');


        if (missingFields.length > 0) {
            console.error('Server response missing RequiredSystem fields:', missingFields);
            console.error('Actual server response:', data);
            throw new Error(`Invalid RequiredSystem: missing required fields: ${missingFields.join(', ')}. Server may not be returning complete RequiredSystem objects.`);
        }

        if (!['internal', 'external', 'integration'].includes(data.type)) {
            throw new Error('Invalid RequiredSystem: system type must be internal, external, integration');
        }

        if (typeof data.name !== 'string') {
            throw new Error('Invalid RequiredSystem: name must be a string');
        }

        if (typeof data.description !== 'string') {
            throw new Error('Invalid RequiredSystem: description must be a string');
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
            // project_id: data.project_id,
            name: data.name.trim(),
            description: data.description.trim(),
            type: data.type,
            // created_at: createdAt,
            // updated_at: updatedAt,
            dependencies: Array.isArray(data.tags) ? data.dependencies.filter((dependency: any) => typeof dependency === 'string') : []
        };
    }

}