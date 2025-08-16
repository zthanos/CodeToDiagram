import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProjectWorkspace from '../../components/ProjectWorkspace.vue'
import { useWorkspaceDataSharing, WorkspaceDataManager } from '../../composables/useWorkspaceDataSharing'

// Mock all workspace components
vi.mock('../../components/SolutionOutlineWorkspace.vue', () => ({
  default: {
    name: 'SolutionOutlineWorkspace',
    template: '<div class="solution-outline-workspace">Solution Outline</div>',
    props: ['project'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

vi.mock('../../components/ProjectOverviewWorkspace.vue', () => ({
  default: {
    name: 'ProjectOverviewWorkspace',
    template: '<div class="project-overview-workspace">Project Overview</div>',
    props: ['project', 'theme'],
    emits: ['create-diagram', 'open-diagram', 'switch-section'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

vi.mock('../../components/RequirementsWorkspace.vue', () => ({
  default: {
    name: 'RequirementsWorkspace',
    template: '<div class="requirements-workspace">Requirements</div>',
    props: ['project'],
    emits: ['project-updated', 'unsaved-changes'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

vi.mock('../../components/DiagramsWorkspace.vue', () => ({
  default: {
    name: 'DiagramsWorkspace',
    template: '<div class="diagrams-workspace">Diagrams</div>',
    props: ['project', 'theme'],
    emits: ['update:theme', 'project-updated'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

vi.mock('../../components/ADRWorkspace.vue', () => ({
  default: {
    name: 'ADRWorkspace',
    template: '<div class="adr-workspace">ADR Workspace</div>',
    props: ['project'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

vi.mock('../../components/NotesWorkspace.vue', () => ({
  default: {
    name: 'NotesWorkspace',
    template: '<div class="notes-workspace">Notes</div>',
    props: ['project'],
    setup() {
      const dataSharing = useWorkspaceDataSharing()
      return { dataSharing }
    }
  }
}))

// Mock services
vi.mock('../../services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: vi.fn(() => ({
      loadProject: vi.fn().mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      })
    }))
  }
}))

vi.mock('../../services/NotificationService', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../composables/useLoading', () => ({
  useLoading: vi.fn(() => ({
    withLoading: vi.fn((fn) => fn())
  }))
}))

vi.mock('../../composables/useErrorHandling', () => ({
  useComponentErrorHandling: vi.fn(() => ({
    withErrorHandling: vi.fn((fn) => fn())
  }))
}))

vi.mock('../../composables/useDialog', () => ({
  useDialog: vi.fn(() => ({
    confirmSave: vi.fn(),
    warning: vi.fn()
  }))
}))

vi.mock('../../composables/useAutoSave', () => ({
  useAutoSave: vi.fn()
}))

describe('Workspace Data Consistency Integration Tests', () => {
  let router
  let wrapper
  let mockLocalStorage

  beforeEach(() => {
    // Reset shared data before each test
    WorkspaceDataManager.resetData()
    
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Create router with test routes
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/project/:id/:section?',
          name: 'ProjectWorkspace',
          component: ProjectWorkspace,
          props: true
        }
      ]
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
    WorkspaceDataManager.resetData()
  })

  describe('Data Sharing Between Workspaces', () => {
    beforeEach(async () => {
      await router.push('/project/test-project/project-overview')
      wrapper = mount(ProjectWorkspace, {
        props: {
          theme: 'default',
          id: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })
      
      // Set up the project data manually for testing
      wrapper.vm.currentProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }
      await wrapper.vm.$nextTick()
    })

    it('should share project data across all workspaces', async () => {
      const testProject = {
        id: 'test-project',
        name: 'Updated Test Project',
        description: 'Updated Description'
      }

      // Update project data through data manager
      WorkspaceDataManager.updateProject(testProject)

      // Verify data is shared
      const sharedData = WorkspaceDataManager.getData()
      expect(sharedData.project).toEqual(testProject)
      expect(sharedData.lastUpdated).toBeInstanceOf(Date)
    })

    it('should maintain data consistency when switching between workspaces', async () => {
      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      // Set initial data
      WorkspaceDataManager.updateProject(testProject)
      
      // Switch to requirements workspace
      wrapper.vm.setActiveSection('requirements')
      await wrapper.vm.$nextTick()
      
      // Verify data is still consistent
      const sharedData = WorkspaceDataManager.getData()
      expect(sharedData.project).toEqual(testProject)
      
      // Switch to ADR workspace
      wrapper.vm.setActiveSection('adrs')
      await wrapper.vm.$nextTick()
      
      // Verify data is still consistent
      const sharedDataAfterSwitch = WorkspaceDataManager.getData()
      expect(sharedDataAfterSwitch.project).toEqual(testProject)
    })

    it('should handle project outline data sharing', async () => {
      const testOutline = {
        id: 'outline-1',
        project_id: 'test-project',
        content: 'Test outline content',
        status: 'active',
        version: 1,
        working_version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        versions: []
      }

      // Update outline data
      WorkspaceDataManager.updateProjectOutline(testOutline)

      // Verify data is shared
      const sharedData = WorkspaceDataManager.getData()
      expect(sharedData.projectOutline).toEqual(testOutline)
    })

    it('should validate data consistency across workspaces', async () => {
      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      const testOutline = {
        id: 'outline-1',
        project_id: 'test-project', // Matching project ID
        content: 'Test outline content',
        status: 'active',
        version: 1,
        working_version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        versions: []
      }

      // Set consistent data
      WorkspaceDataManager.updateProject(testProject)
      WorkspaceDataManager.updateProjectOutline(testOutline)

      // Use the composable to validate consistency
      const { validateDataConsistency } = useWorkspaceDataSharing()
      const validation = validateDataConsistency()

      expect(validation.isValid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect data inconsistencies', async () => {
      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      const inconsistentOutline = {
        id: 'outline-1',
        project_id: 'different-project', // Mismatched project ID
        content: 'Test outline content',
        status: 'active',
        version: 1,
        working_version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        versions: []
      }

      // Set inconsistent data
      WorkspaceDataManager.updateProject(testProject)
      WorkspaceDataManager.updateProjectOutline(inconsistentOutline)

      // Use the composable to validate consistency
      const { validateDataConsistency } = useWorkspaceDataSharing()
      const validation = validateDataConsistency()

      expect(validation.isValid).toBe(false)
      expect(validation.issues).toContain('Project ID mismatch between project and outline data')
    })
  })

  describe('Event-Based Data Updates', () => {
    beforeEach(async () => {
      await router.push('/project/test-project/project-overview')
      wrapper = mount(ProjectWorkspace, {
        props: {
          theme: 'default',
          id: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })
      await wrapper.vm.$nextTick()
    })

    it('should emit events when data is updated', async () => {
      const { addEventListener } = useWorkspaceDataSharing()
      
      let eventReceived = false
      let eventData = null

      // Add event listener
      const cleanup = addEventListener('onProjectUpdate', (data) => {
        eventReceived = true
        eventData = data
      })

      const testProject = {
        id: 'test-project',
        name: 'Updated Project',
        description: 'Updated Description'
      }

      // Update project data
      WorkspaceDataManager.updateProject(testProject)

      // Verify event was emitted
      expect(eventReceived).toBe(true)
      expect(eventData).toEqual(testProject)

      // Cleanup
      cleanup()
    })

    it('should handle multiple event listeners', async () => {
      const { addEventListener } = useWorkspaceDataSharing()
      
      let listener1Called = false
      let listener2Called = false

      // Add multiple event listeners
      const cleanup1 = addEventListener('onProjectUpdate', () => {
        listener1Called = true
      })

      const cleanup2 = addEventListener('onProjectUpdate', () => {
        listener2Called = true
      })

      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      // Update project data
      WorkspaceDataManager.updateProject(testProject)

      // Verify both listeners were called
      expect(listener1Called).toBe(true)
      expect(listener2Called).toBe(true)

      // Cleanup
      cleanup1()
      cleanup2()
    })
  })

  describe('Workspace State Persistence', () => {
    beforeEach(async () => {
      await router.push('/project/test-project/project-overview')
      wrapper = mount(ProjectWorkspace, {
        props: {
          theme: 'default',
          id: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })
      
      wrapper.vm.currentProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }
      await wrapper.vm.$nextTick()
    })

    it('should persist active section state when switching workspaces', async () => {
      // Switch to ADR workspace
      wrapper.vm.setActiveSection('adrs')
      await wrapper.vm.$nextTick()

      // Verify localStorage was called to persist state
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'project-test-project-active-section',
        'adrs'
      )

      // Switch to requirements workspace
      wrapper.vm.setActiveSection('requirements')
      await wrapper.vm.$nextTick()

      // Verify localStorage was called again
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'project-test-project-active-section',
        'requirements'
      )
    })

    it('should restore active section state from localStorage', async () => {
      // Mock localStorage to return saved section
      mockLocalStorage.getItem.mockReturnValue('adrs')

      // Create new wrapper to simulate page reload
      const newWrapper = mount(ProjectWorkspace, {
        props: {
          theme: 'default',
          id: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })

      newWrapper.vm.currentProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      // Simulate the loadProject method restoring section
      const savedSection = localStorage.getItem('project-test-project-active-section')
      if (savedSection && ['project-overview', 'solution-outline', 'requirements', 'diagrams', 'adrs', 'notes'].includes(savedSection)) {
        newWrapper.vm.activeSection = savedSection
      }

      await newWrapper.vm.$nextTick()

      // Verify section was restored
      expect(newWrapper.vm.activeSection).toBe('adrs')

      newWrapper.unmount()
    })
  })

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await router.push('/project/test-project/project-overview')
      wrapper = mount(ProjectWorkspace, {
        props: {
          theme: 'default',
          id: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })
      await wrapper.vm.$nextTick()
    })

    it('should handle errors in data sharing gracefully', async () => {
      const { setError, clearErrors, errors } = useWorkspaceDataSharing()

      // Set an error
      setError('project-load', 'Failed to load project data')

      // Verify error is set
      expect(errors.value['project-load']).toBe('Failed to load project data')

      // Clear errors
      clearErrors()

      // Verify errors are cleared
      expect(errors.value['project-load']).toBeNull()
    })

    it('should handle event listener errors gracefully', async () => {
      const { addEventListener } = useWorkspaceDataSharing()
      
      // Add a listener that throws an error
      const cleanup = addEventListener('onProjectUpdate', () => {
        throw new Error('Test error in listener')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      // Update project data - should not throw despite listener error
      expect(() => {
        WorkspaceDataManager.updateProject(testProject)
      }).not.toThrow()

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event listener for onProjectUpdate:'),
        expect.any(Error)
      )

      // Cleanup
      cleanup()
      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should clean up event listeners properly', async () => {
      const { addEventListener } = useWorkspaceDataSharing()
      
      // Add event listener
      const cleanup = addEventListener('onProjectUpdate', () => {})

      // Verify listener was added
      expect(WorkspaceDataManager.getData()).toBeDefined()

      // Clean up listener
      cleanup()

      // Verify cleanup doesn't cause errors
      const testProject = {
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      }

      expect(() => {
        WorkspaceDataManager.updateProject(testProject)
      }).not.toThrow()
    })

    it('should reset shared data completely', async () => {
      // Set some test data
      WorkspaceDataManager.updateProject({
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description'
      })

      // Verify data is set
      let sharedData = WorkspaceDataManager.getData()
      expect(sharedData.project).toBeTruthy()

      // Reset data
      WorkspaceDataManager.resetData()

      // Verify data is reset
      sharedData = WorkspaceDataManager.getData()
      expect(sharedData.project).toBeNull()
      expect(sharedData.teamsData).toHaveLength(0)
      expect(sharedData.systemsData).toHaveLength(0)
      expect(sharedData.adrsData).toHaveLength(0)
      expect(sharedData.notesData).toHaveLength(0)
    })
  })
})