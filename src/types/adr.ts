/**
 * TypeScript interfaces for ADR (Architectural Decision Records) data models
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

// ADR Status types
export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';

// ADR (API Response) - matches backend schema
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

// Create ADR Request
export interface CreateADRRequest {
  title: string;
  status?: ADRStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  author: string;
  tags?: string[];
  supersedes?: string[];
}

// Update ADR Request
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

// ADR Template for structured creation
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

// ADR Search Result
export interface ADRSearchResult {
  adr: ADR;
  matches: {
    field: string;
    snippet: string;
    highlights: Array<{ start: number; end: number }>;
  }[];
  score: number;
}

// ADR Filter Options
export interface ADRFilterOptions {
  status?: ADRStatus[];
  author?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// ADR List Options
export interface ADRListOptions {
  skip?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
  filter?: ADRFilterOptions;
}

// ADR Summary for project overview
export interface ADRSummary {
  total: number;
  by_status: Record<ADRStatus, number>;
  recent: ADR[];
  most_referenced: ADR[];
}

// Error types specific to ADRs
export enum ADRErrorType {
  ADR_NOT_FOUND = 'adr_not_found',
  ADR_CREATE_FAILED = 'adr_create_failed',
  ADR_UPDATE_FAILED = 'adr_update_failed',
  ADR_DELETE_FAILED = 'adr_delete_failed',
  ADR_SEARCH_FAILED = 'adr_search_failed',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error'
}

export interface ADRError {
  type: ADRErrorType;
  message: string;
  suggestedAction?: string;
  details?: any;
}

// Component prop interfaces
export interface ADRWorkspaceProps {
  project: Project;
}

export interface ADRWorkspaceEmits {
  'adr-created': [adr: ADR];
  'adr-updated': [adr: ADR];
  'adr-deleted': [adrId: string];
}

export interface ADREditorProps {
  adr?: ADR;
  template?: ADRTemplate;
  readonly?: boolean;
}

export interface ADREditorEmits {
  'save': [adr: CreateADRRequest | UpdateADRRequest];
  'cancel': [];
  'delete': [adrId: string];
}

export interface ADRListProps {
  adrs: ADR[];
  filter?: ADRFilterOptions;
  searchQuery?: string;
  readonly?: boolean;
}

export interface ADRListEmits {
  'adr-select': [adr: ADR];
  'adr-edit': [adr: ADR];
  'adr-delete': [adrId: string];
  'filter-change': [filter: ADRFilterOptions];
  'search-change': [query: string];
}

// Import Project type from existing types
import type { Project } from './project';