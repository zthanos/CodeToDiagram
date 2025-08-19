/**
 * TypeScript interfaces for Notes data models
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

// Note entity types that can be associated with notes
export type NoteEntityType = 'requirement' | 'adr' | 'system' | 'team';

// Note association interface
export interface NoteAssociation {
  entity_type: NoteEntityType;
  entity_id: string;
  context?: string;
}

// Core Note interface (API Response) - matches backend schema
export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  author: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  associations: NoteAssociation[];
}

// UI-optimized note with editing state
export interface NoteUI extends Note {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
}
// Upsert request interface for unified create/update operations
export interface UpsertNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  id?: number; // Optional - presence determines create vs update
}

// API request types
export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  associations?: NoteAssociation[];
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  associations?: NoteAssociation[];
}

// Note association request
export interface AssociateNoteRequest {
  entity_type: NoteEntityType;
  entity_id: string;
  context?: string;
}

// Notes search and filter options
export interface NotesFilterOptions {
  entity_type?: NoteEntityType;
  entity_id?: string;
  tags?: string[];
  author?: string;
  search_query?: string;
  skip?: number;
  limit?: number;
}

// Notes summary for dashboard display
export interface NotesSummary {
  total_notes: number;
  notes_by_entity_type: Record<NoteEntityType, number>;
  recent_notes: Note[];
  popular_tags: Array<{ tag: string; count: number }>;
}

// Error types specific to notes
export enum NotesErrorType {
  NOTE_CREATE_FAILED = 'note_create_failed',
  NOTE_UPDATE_FAILED = 'note_update_failed',
  NOTE_DELETE_FAILED = 'note_delete_failed',
  NOTE_LOAD_FAILED = 'note_load_failed',
  ASSOCIATION_FAILED = 'association_failed',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error'
}

export interface NotesError {
  type: NotesErrorType;
  message: string;
  suggestedAction?: string;
  details?: any;
}

// Component prop interfaces
export interface NotePanelProps {
  projectId: string;
  entityType?: NoteEntityType;
  entityId?: string;
  readonly?: boolean;
}

export interface NotePanelEmits {
  'note-created': [note: Note];
  'note-updated': [note: Note];
  'note-deleted': [noteId: string];
}

export interface NoteItemProps {
  note: Note;
  readonly?: boolean;
  showAssociations?: boolean;
}

export interface NoteItemEmits {
  'update': [note: Note];
  'delete': [noteId: string];
  'associate': [noteId: string, association: NoteAssociation];
  'disassociate': [noteId: string, association: NoteAssociation];
}

export interface NotesListProps {
  notes: Note[];
  filter?: NotesFilterOptions;
  readonly?: boolean;
  showAssociations?: boolean;
}

export interface NotesListEmits {
  'note-update': [note: Note];
  'note-delete': [noteId: string];
  'note-create': [note: Partial<Note>];
  'filter-change': [filter: NotesFilterOptions];
  'search-change': [query: string];
}

// Validation rules for notes
export interface NoteValidationRules {
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  content: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  tags: {
    maxCount: number;
    maxTagLength: number;
  };
  associations: {
    maxCount: number;
  };
}

export const defaultNoteValidationRules: NoteValidationRules = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 200
  },
  content: {
    required: true,
    minLength: 1,
    maxLength: 10000
  },
  tags: {
    maxCount: 10,
    maxTagLength: 50
  },
  associations: {
    maxCount: 20
  }
};