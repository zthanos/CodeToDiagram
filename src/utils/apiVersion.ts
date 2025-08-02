/**
 * API Version Management Utilities
 * Helper functions for managing API versions and migrations
 */

import { apiConfig, updateApiConfig } from '../config/api';

export interface ApiVersionInfo {
  version: string;
  isSupported: boolean;
  deprecationDate?: Date;
  migrationGuide?: string;
}

// Supported API versions
export const SUPPORTED_VERSIONS: Record<string, ApiVersionInfo> = {
  'v1': {
    version: 'v1',
    isSupported: true,
    migrationGuide: 'Current stable version'
  },
  'v2': {
    version: 'v2',
    isSupported: false, // Future version
    migrationGuide: 'Future version - not yet available'
  }
};

/**
 * Get current API version
 */
export const getCurrentApiVersion = (): string => {
  return apiConfig.version;
};

/**
 * Check if a version is supported
 */
export const isVersionSupported = (version: string): boolean => {
  return SUPPORTED_VERSIONS[version]?.isSupported || false;
};

/**
 * Get version information
 */
export const getVersionInfo = (version: string): ApiVersionInfo | null => {
  return SUPPORTED_VERSIONS[version] || null;
};

/**
 * Switch to a different API version
 */
export const switchApiVersion = (version: string): boolean => {
  if (!isVersionSupported(version)) {
    console.warn(`API version ${version} is not supported`);
    return false;
  }
  
  updateApiConfig({ version });
  console.log(`Switched to API version ${version}`);
  return true;
};

/**
 * Get all supported versions
 */
export const getSupportedVersions = (): string[] => {
  return Object.keys(SUPPORTED_VERSIONS).filter(version => 
    SUPPORTED_VERSIONS[version].isSupported
  );
};

/**
 * Check if current version is deprecated
 */
export const isCurrentVersionDeprecated = (): boolean => {
  const currentVersion = getCurrentApiVersion();
  const versionInfo = getVersionInfo(currentVersion);
  return versionInfo?.deprecationDate ? new Date() > versionInfo.deprecationDate : false;
};

/**
 * Get migration recommendations
 */
export const getMigrationRecommendations = (): string[] => {
  const recommendations: string[] = [];
  const currentVersion = getCurrentApiVersion();
  
  if (isCurrentVersionDeprecated()) {
    recommendations.push(`Current version ${currentVersion} is deprecated`);
  }
  
  const supportedVersions = getSupportedVersions();
  const latestVersion = supportedVersions[supportedVersions.length - 1];
  
  if (currentVersion !== latestVersion) {
    recommendations.push(`Consider upgrading to version ${latestVersion}`);
  }
  
  return recommendations;
};

/**
 * Validate version format
 */
export const isValidVersionFormat = (version: string): boolean => {
  // Simple version format validation (v1, v2, etc.)
  return /^v\d+$/.test(version);
};

/**
 * Parse version number from version string
 */
export const parseVersionNumber = (version: string): number => {
  const match = version.match(/^v(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Compare two versions
 */
export const compareVersions = (version1: string, version2: string): number => {
  const num1 = parseVersionNumber(version1);
  const num2 = parseVersionNumber(version2);
  return num1 - num2;
};

/**
 * Get the latest supported version
 */
export const getLatestSupportedVersion = (): string => {
  const supportedVersions = getSupportedVersions();
  return supportedVersions.sort(compareVersions).pop() || 'v1';
};