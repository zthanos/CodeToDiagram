/**
 * API Configuration
 * Centralized configuration for API endpoints and versioning
 */

export interface ApiConfig {
    baseUrl: string;
    version: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
}

// Default API configuration
const defaultConfig: ApiConfig = {
    baseUrl: 'http://localhost:8000',
    version: 'v1',
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000 // 1 second
};

// Environment-based configuration overrides
const getEnvironmentConfig = (): Partial<ApiConfig> => {
    const config: Partial<ApiConfig> = {};

    // Override from environment variables
    if (import.meta.env.VITE_API_BASE_URL) {
        config.baseUrl = import.meta.env.VITE_API_BASE_URL;
    }

    if (import.meta.env.VITE_API_VERSION) {
        config.version = import.meta.env.VITE_API_VERSION;
    }

    if (import.meta.env.VITE_API_TIMEOUT) {
        config.timeout = parseInt(import.meta.env.VITE_API_TIMEOUT, 10);
    }

    if (import.meta.env.VITE_API_MAX_RETRIES) {
        config.maxRetries = parseInt(import.meta.env.VITE_API_MAX_RETRIES, 10);
    }

    if (import.meta.env.VITE_API_RETRY_DELAY) {
        config.retryDelay = parseInt(import.meta.env.VITE_API_RETRY_DELAY, 10);
    }

    return config;
};

// Merge default config with environment overrides
export const apiConfig: ApiConfig = {
    ...defaultConfig,
    ...getEnvironmentConfig()
};

/**
 * Get the full API base URL with version
 */
export const getApiBaseUrl = (): string => {
    return `${apiConfig.baseUrl}/api/${apiConfig.version}`;
};

/**
 * Get versioned endpoint path
 */
export const getVersionedPath = (path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/api/${apiConfig.version}/${cleanPath}`;
};

/**
 * Get legacy endpoint path (for backwards compatibility)
 */
export const getLegacyPath = (path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/${cleanPath}`;
};

/**
 * Update API configuration at runtime
 */
export const updateApiConfig = (updates: Partial<ApiConfig>): void => {
    Object.assign(apiConfig, updates);
};

/**
 * Reset API configuration to defaults
 */
export const resetApiConfig = (): void => {
    Object.assign(apiConfig, defaultConfig, getEnvironmentConfig());
};