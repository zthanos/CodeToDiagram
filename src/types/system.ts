export type SystemType = 'internal' | 'external' | 'integration'

export interface RequiredSystem {
    id: string;
    project_id: string;
    name: string;
    system_type: string;
    description: string;
    dependencies: string[];
    created_at: Date;
    updated_at: Date;
}


// API request/response types
export interface UpsertRequiredSystemRequest {
    id: number;
    name?: string;
    type?: string;
    description?: string;
    dependencies?: string[]
  }

// Paginated RequiredSystem list response interface
export interface RequiredSystemListResponse {
    success: boolean;
    message: string;
    data: RequiredSystem[];
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


// UI-optimized RequiredSystem with editing state
export interface RequiredSystemUI extends RequiredSystem {
    isEditing: boolean;
    hasUnsavedChanges: boolean;
    validationErrors: string[];
  }


// Search and filter interfaces
export interface RequiredSystemSearchResult {
    adr: RequiredSystem;
    score: number;
    matches: RequiredSystemSearchMatch[];
  }
  

  export interface RequiredSystemSearchMatch {
    field: string;
    value: string;
    highlightedValue: string;
    startIndex: number;
    endIndex: number;
  }

