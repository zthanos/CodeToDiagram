/**
 * TypeScript interfaces for Project Outline data models
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

// Project Outline (API Response) - matches backend schema
export interface ProjectOutline {
  id: string;
  project_id: string;
  content: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
  working_version: number; // Latest version
  created_at: string;
  updated_at: string;
  versions?: OutlineVersion[];
}

// Outline Version for version history tracking
export interface OutlineVersion {
  version: number;
  content: string;
  status: string;
  created_at: string;
  changes_summary?: string;
}

// UI-optimized project outline with additional state
export interface ProjectOutlineUI extends ProjectOutline {
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSyncedAt: Date | null;
}

// API request types
export interface UpdateOutlineStatusRequest {
  status: 'draft' | 'active' | 'archived';
}

export interface CreateOutlineRequest {
  content: string;
  status?: 'draft' | 'active' | 'archived';
}

// Error types specific to project outline
export enum ProjectOutlineErrorType {
  OUTLINE_LOAD_FAILED = 'outline_load_failed',
  OUTLINE_SAVE_FAILED = 'outline_save_failed',
  VERSION_LOAD_FAILED = 'version_load_failed',
  STATUS_UPDATE_FAILED = 'status_update_failed',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error'
}

export interface ProjectOutlineError {
  type: ProjectOutlineErrorType;
  message: string;
  suggestedAction?: string;
  details?: any;
}

// Component prop interfaces
export interface ProjectOutlineProps {
  projectId: string;
  readonly?: boolean;
}

export interface ProjectOutlineEmits {
  'outline-updated': [outline: ProjectOutline];
  'status-changed': [status: ProjectOutline['status']];
  'version-selected': [version: number];
}

// Version history props
export interface OutlineVersionHistoryProps {
  versions: OutlineVersion[];
  currentVersion: number;
  workingVersion: number;
}

export interface OutlineVersionHistoryEmits {
  'version-select': [version: number];
  'version-compare': [version1: number, version2: number];
}