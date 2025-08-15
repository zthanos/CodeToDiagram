/**
 * TypeScript integration test to verify requirements types work correctly
 */

import type {
  RequirementsDocument,
  RequirementItem,
  SystemInfo,
  TeamInfo,
  RequirementsWorkspaceState,
  RequirementsErrorType,
  RequirementItemUI,
  TabState
} from '../types/requirements'

import type { Project } from '../types/project'

// Test that we can create objects with the correct types
const testDocument: RequirementsDocument = {
  content: "# Test Document",
  status: 'draft',
  id: 1,
  project_id: 'test-project',
  version: 1,
  source_type: 'manual',
  created_at: '2025-08-03T20:11:09.585Z',
  updated_at: '2025-08-03T20:11:09.585Z'
}

const testRequirement: RequirementItem = {
  id: 'req-001',
  title: 'Test Requirement',
  description: 'This is a test requirement',
  status: 'new',
  created_at: new Date(),
  updated_at: new Date(),
  source: 'manual'
}

const testSystem: SystemInfo = {
  id: 'sys-001',
  name: 'Test System',
  description: 'This is a test system',
  type: 'internal',
  dependencies: ['dep1', 'dep2']
}

const testTeam: TeamInfo = {
  id: 'team-001',
  name: 'Test Team',
  role: 'Development',
  members: ['Member 1', 'Member 2'],
  responsibilities: ['Task 1', 'Task 2']
}

const testRequirementUI: RequirementItemUI = {
  ...testRequirement,
  isEditing: false,
  hasUnsavedChanges: false,
  validationErrors: []
}

const testTabState: TabState = {
  requirements: {
    items: [testRequirementUI],
    filter: 'all',
    searchQuery: ''
  },
  systems: {
    items: [testSystem],
    selectedSystem: null
  },
  teams: {
    items: [testTeam],
    selectedTeam: null
  }
}

const testWorkspaceState: RequirementsWorkspaceState = {
  isLoading: false,
  isSaving: false,
  hasChanges: false,
  lastSaved: null,
  brdContent: '',
  currentStatus: 'draft',
  viewMode: 'edit',
  requirementsDocument: testDocument,
  requirementItems: [testRequirement],
  systemsData: [testSystem],
  teamsData: [testTeam],
  activeTab: 'requirements',
  isUploading: false,
  tabState: testTabState
}

// Test enum usage
const errorType: RequirementsErrorType = RequirementsErrorType.PDF_UPLOAD_FAILED

// Export for testing
export {
  testDocument,
  testRequirement,
  testSystem,
  testTeam,
  testRequirementUI,
  testTabState,
  testWorkspaceState,
  errorType
}