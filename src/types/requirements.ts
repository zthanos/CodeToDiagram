/**
 * TypeScript interfaces for Requirements Workspace data models
 * Requirements: 6.1, 6.2, 6.3
 */

// Requirements Document (API Response) - matches backend schema
export interface RequirementsDocument {
  content: string;
  status: 'draft' | 'published' | 'archived';
  id: number;
  project_id: string;
  version: number;
  source_type: 'manual' | 'pdf_upload';
  original_filename?: string;
  created_at: string;
  updated_at: string;
}

// Requirement Item (UI Model) - optimized for frontend use
export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  document_id: string;
  status: 'new' | 'accepted' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  project_id: string;
  created_at: Date;
  updated_at: Date;
  source: 'manual' | 'pdf';
}

// System Information for systems tab
export interface SystemInfo {
  id: string;
  name: string;
  description: string;
  type: 'internal' | 'external' | 'integration';
  dependencies: string[];
}

// Team Information for teams tab
export interface TeamInfo {
  id: string;
  name: string;
  role: string;
  members: string[];
  responsibilities: string[];
}

// UI-optimized requirement item with editing state
export interface RequirementItemUI extends RequirementItem {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
}

// Tab content state management
export interface TabState {
  requirements: {
    items: RequirementItemUI[];
    filter: 'all' | 'new' | 'accepted' | 'rejected';
    searchQuery: string;
  };
  systems: {
    items: SystemInfo[];
    selectedSystem: string | null;
    searchQuery: string;
    filter: 'all' | 'internal' | 'external' | 'integration';
  };
  teams: {
    items: TeamInfo[];
    selectedTeam: string | null;
    searchQuery: string;
  };
}

// Requirements workspace state
export interface RequirementsWorkspaceState {
  // Core workspace state
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  
  // BRD document state
  brdContent: string;
  currentStatus: 'draft' | 'published' | 'archived';
  viewMode: 'edit' | 'view';
  
  // Requirements data
  requirementsDocument: RequirementsDocument | null;
  requirementItems: RequirementItem[];
  systemsData: SystemInfo[];
  teamsData: TeamInfo[];
  
  // UI state
  activeTab: 'requirements' | 'systems' | 'teams';
  isUploading: boolean;
  tabState: TabState;
}

// API request/response types
export interface UploadRequirementsPdfRequest {
  file: File;
  status?: 'draft' | 'published' | 'archived';
}

export interface SaveRequirementsDocumentRequest {
  content: string;
  status: 'draft' | 'published' | 'archived';
}

export interface CreateRequirementItemRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  project_id: string;
  status?: 'new' | 'accepted' | 'rejected';
}

export interface UpdateRequirementItemRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'new' | 'accepted' | 'rejected';
}

// Upsert request interface for unified create/update operations
export interface UpsertRequirementItemRequest {
  project_id: string;  
  document_id: string;
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'new' | 'accepted' | 'rejected';
  id?: number; // Optional - presence determines create vs update
}



export interface SaveRequirementsSystemRequest {
  document?: RequirementsDocument;
  items?: RequirementItem[];
  systems?: any[];
  teams?: any[];
  metadata?: Record<string, any>;
}

export interface BulkUpdateRequirementRequest {
  id: string;
  title?: string;
  description?: string;
  status?: 'new' | 'accepted' | 'rejected';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Error types specific to requirements
export enum RequirementsErrorType {
  PDF_UPLOAD_FAILED = 'pdf_upload_failed',
  PDF_PROCESSING_FAILED = 'pdf_processing_failed',
  REQUIREMENTS_LOAD_FAILED = 'requirements_load_failed',
  REQUIREMENT_SAVE_FAILED = 'requirement_save_failed',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error'
}

export interface RequirementsError {
  type: RequirementsErrorType;
  message: string;
  suggestedAction?: string;
  details?: any;
}

// Component prop interfaces
export interface RequirementsWorkspaceProps {
  project: Project;
}

export interface RequirementsWorkspaceEmits {
  'project-updated': [project: Project];
  'unsaved-changes': [hasChanges: boolean];
}

export interface RequirementItemProps {
  requirement: RequirementItem;
  readonly?: boolean;
}

export interface RequirementItemEmits {
  'update': [requirement: RequirementItem];
  'delete': [requirementId: string];
  'status-change': [requirementId: string, status: RequirementItem['status']];
}

export interface RequirementsListProps {
  items: RequirementItem[];
  filter?: 'all' | 'new' | 'accepted' | 'rejected';
  searchQuery?: string;
  readonly?: boolean;
}

export interface RequirementsListEmits {
  'item-update': [requirement: RequirementItem];
  'item-delete': [requirementId: string];
  'item-create': [requirement: Partial<RequirementItem>];
  'filter-change': [filter: 'all' | 'new' | 'accepted' | 'rejected'];
  'search-change': [query: string];
}

// Import Project type from existing types
import type { Project } from './project';