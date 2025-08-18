/**
 * TypeScript interfaces for ADR (Architectural Decision Records) data models
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

// ADR Status enumeration
export type ADRStatus = 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';

// ADR interface
export interface ADR {
  id: string;
  project_id: string;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  author: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  superseded_by?: string;
  supersedes?: string[];
}

// ADR template for creating new ADRs
export interface ADRTemplate {
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  metadata: {
    date: Date;
    author: string;
    tags: string[];
  };
}

// API request/response types
export interface CreateADRRequest {
  title: string;
  status?: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  author: string;
  tags?: string[];
}

export interface UpdateADRRequest {
  title?: string;
  status?: ADRStatus;
  context?: string;
  decision?: string;
  consequences?: string;
  alternatives?: string;
  tags?: string[];
  superseded_by?: string;
  supersedes?: string[];
}

// Upsert request interface for unified create/update operations
export interface UpsertADRRequest {
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  author: string;
  tags: string[];
  content: string;
  adr_id?: number; // Optional - presence determines create vs update
}

// Paginated ADR list response interface
export interface ADRListResponse {
  success: boolean;
  message: string;
  data: ADR[];
  timestamp: string;
  meta: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// UI-optimized ADR with editing state
export interface ADRUI extends ADR {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
}

// ADR workspace state
export interface ADRWorkspaceState {
  // Core workspace state
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  
  // ADR data
  adrs: ADR[];
  selectedADR: ADR | null;
  
  // UI state
  viewMode: 'list' | 'edit' | 'create';
  searchQuery: string;
  statusFilter: 'all' | ADRStatus;
  tagFilter: string[];
  sortBy: 'date' | 'title' | 'status';
  sortOrder: 'asc' | 'desc';
}

// Search and filter interfaces
export interface ADRSearchResult {
  adr: ADR;
  score: number;
  matches: ADRSearchMatch[];
}

export interface ADRSearchMatch {
  field: string;
  value: string;
  highlightedValue: string;
  startIndex: number;
  endIndex: number;
}

export interface ADRFilterConfig {
  status: 'all' | ADRStatus;
  tags: string[];
  author: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Component prop interfaces
export interface ADRWorkspaceProps {
  project: any; // Using any to avoid circular import, will be typed as Project in component
}

export interface ADRWorkspaceEmits {
  'project-updated': [project: any]; // Using any to avoid circular import
  'unsaved-changes': [hasChanges: boolean];
}

export interface ADREditorProps {
  adr?: ADR;
  mode: 'create' | 'edit';
  readonly?: boolean;
}

export interface ADREditorEmits {
  'save': [adr: ADR];
  'cancel': [];
  'delete': [adrId: string];
}

export interface ADRListProps {
  adrs: ADR[];
  searchQuery?: string;
  statusFilter?: 'all' | ADRStatus;
  tagFilter?: string[];
  readonly?: boolean;
}

export interface ADRListEmits {
  'adr-select': [adr: ADR];
  'adr-create': [];
  'adr-edit': [adr: ADR];
  'adr-delete': [adrId: string];
  'search-change': [query: string];
  'filter-change': [filter: ADRFilterConfig];
}

// Error types specific to ADRs
export enum ADRErrorType {
  ADR_LOAD_FAILED = 'adr_load_failed',
  ADR_SAVE_FAILED = 'adr_save_failed',
  ADR_DELETE_FAILED = 'adr_delete_failed',
  ADR_VALIDATION_ERROR = 'adr_validation_error',
  ADR_NETWORK_ERROR = 'adr_network_error'
}

export interface ADRError {
  type: ADRErrorType;
  message: string;
  suggestedAction?: string;
  details?: any;
}

// Note: Project type is imported in components to avoid circular imports