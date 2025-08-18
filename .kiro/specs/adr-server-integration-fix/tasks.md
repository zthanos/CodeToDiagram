# Implementation Plan

- [x] 1. Update ADRApiService with upsert functionality





  - Replace separate create/update methods with unified upsert method
  - Update listADRs method to handle paginated response structure
  - Implement proper request payload construction for upsert operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 2. Update RequirementsApiService with upsert functionality
  - Replace separate create/update methods with unified upsert method using query parameter approach
  - Implement proper request payload construction and query parameter handling
  - Update error handling to match new endpoint responses
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 3. Update TeamsApiService with upsert functionality
  - Replace separate create/update methods with unified upsert method using natural key approach
  - Implement proper request payload construction for teams upsert
  - Update error handling and response processing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 11.1, 11.2, 11.6_

- [ ] 4. Create SystemsApiService with upsert functionality
  - Create new SystemsApiService following established patterns from other API services
  - Implement upsert method using natural key approach (project_id + name)
  - Add proper error handling and response processing
  - Create TypeScript interfaces for system-related data structures
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.3, 11.4, 11.5, 11.6_

- [ ] 5. Create NotesApiService with comprehensive CRUD functionality
  - Create new NotesApiService following established patterns from other API services
  - Implement upsert method using note_id in request body approach
  - Implement all CRUD operations: listNotes, getNote, deleteNote, searchNotes, getRecentNotes, getNotesCount
  - Add proper error handling and response processing for all methods
  - Create TypeScript interfaces for note-related data structures
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 6. Update error handling across all API services
  - Standardize error response processing for 422 validation errors
  - Implement consistent error mapping and user-friendly error messages
  - Ensure proper handling of network errors and retry logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Write comprehensive unit tests for updated API services
  - Create unit tests for ADRApiService upsert functionality
  - Create unit tests for RequirementsApiService upsert functionality  
  - Create unit tests for TeamsApiService upsert functionality
  - Create unit tests for new SystemsApiService
  - Create unit tests for new NotesApiService including all CRUD operations
  - Test error handling scenarios for all services
  - _Requirements: All requirements - testing validation_

- [ ] 8. Update components to use new upsert methods
  - Update ADR-related components to use new upsert method
  - Update Requirements workspace components to use new upsert method
  - Update Teams-related components to use new upsert method
  - Update Systems-related components to use new SystemsApiService
  - Update Notes-related components to use new NotesApiService
  - _Requirements: 1.1, 2.1, 6.1, 7.1, 9.1, 10.1, 12.1_

- [ ] 9. Implement proper data validation before API calls
  - Add client-side validation for all required fields before sending requests
  - Implement proper data structure validation for arrays and complex objects
  - Add validation for enum values (status, priority, type fields)
  - Add validation for notes content and tags structure
  - _Requirements: 5.1, 8.1, 11.1, 11.3, 15.1, 15.2_

- [ ] 10. Update API response handling and data mapping
  - Update response processing to handle new paginated ADR and Notes list structures
  - Implement proper timestamp parsing for ISO 8601 dates
  - Add proper handling of server-generated fields (id, created_at, updated_at)
  - Add proper handling of notes content and tags arrays
  - _Requirements: 3.2, 5.5, 8.5, 11.6, 13.2, 15.3, 15.4_

- [ ] 11. Integration testing and error scenario validation
  - Test end-to-end create and update flows for all entities (ADRs, requirements, teams, systems, notes)
  - Test all notes CRUD operations including search, recent notes, and count functionality
  - Test error handling with actual API error responses
  - Validate proper retry logic for network failures
  - Test component error state handling and user feedback
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_