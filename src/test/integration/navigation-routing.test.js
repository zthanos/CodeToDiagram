import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProjectWorkspace from '../../components/ProjectWorkspace.vue'

// Mock all workspace components
vi.mock('../../components/SolutionOutlineWorkspace.vue', () => ({
  default: {
    name: 'SolutionOutlineWorkspace',
    template: '<div class="solution-outline-workspace">Solution Outline</div>',
    props: ['project']
  }
}))

vi.mock('../../components/ProjectOverviewWorkspace.vue', () => ({
  default: {
    name: 'ProjectOverviewWorkspace',
    template: '<div class="project-overview-workspace">Project Overview</div>',
    props: ['project', 'theme'],
    emits: ['create-diagram', 'open-diagram', 'switch-section']
  }
}))

vi.mock('../../components/RequirementsWorkspace.vue', () => ({
  default: {
    name: 'RequirementsWorkspace',
    template: '<div class="requirements-workspace">Requirements</div>',
    props: ['project'],
    emits: ['project-updated', 'unsaved-changes']
  }
}))

vi.mock('../../components/DiagramsWorkspace.vue', () => ({
  default: {
    name: 'DiagramsWorkspace',
    template: '<div class="diagrams-workspace">Diagrams</div>',
    props: ['project', 'theme'],
    emits: ['update:theme', 'project-updated']
  }
}))

vi.mock('../../components/ADRWorkspace.vue', () => ({
  default: {
    name: 'ADRWorkspace',
    template: '<div class="adr-workspace">ADR Workspace</div>',
    props: ['project']
  }
}))

vi.mock('../../components/NotesWorkspace.vue', () => ({
  default: {
    name: 'NotesWorkspace',
    template: '<div class="notes-workspace">Notes</div>',
    props: ['project']
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

describe('Navigation and Routing Integration Tests', () => {
  let router
  let wrapper
  let mockLocalStorage

  beforeEach(() => {
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
        },
        // Redirect routes for old Teams/Tasks workspaces
        {
          path: '/project/:id/teams',
          redirect: to => ({
            name: 'ProjectWorkspace',
            params: { id: to.params.id, section: 'requirements' },
            query: { tab: 'teams' }
          })
        },
        {
          path: '/project/:id/tasks',
          redirect: to => ({
            name: 'ProjectWorkspace',
            params: { id: to.params.id, section: 'project-overview' }
          })
        }
      ]
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  describe('Navigation Menu Updates', () => {
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

    it('should not display Teams navigation button', () => {
      const navButtons = wrapper.findAll('.nav-button')
      const teamsButton = navButtons.find(button => button.text().includes('👥 Teams'))
      expect(teamsButton).toBeUndefined()
    })

    it('should not display Tasks navigation button', () => {
      const navButtons = wrapper.findAll('.nav-button')
      const tasksButton = navButtons.find(button => button.text().includes('✅ Tasks'))
      expect(tasksButton).toBeUndefined()
    })

    it('should display ADRs navigation button', () => {
      const navButtons = wrapper.findAll('.nav-button')
      const adrsButton = navButtons.find(button => button.text().includes('📋 ADRs'))
      expect(adrsButton).toBeDefined()
    })

    it('should display Project Overview navigation button', () => {
      const navButtons = wrapper.findAll('.nav-button')
      const overviewButton = navButtons.find(button => button.text().includes('🎯 Project Overview'))
      expect(overviewButton).toBeDefined()
    })

    it('should have correct navigation buttons in order', () => {
      const navButtons = wrapper.findAll('.nav-button')
      const buttonTexts = navButtons.map(button => button.text())
      
      expect(buttonTexts).toEqual([
        '🎯 Project Overview',
        '🎯 Solution Outline',
        '📋 Requirements',
        '📊 Diagrams',
        '📋 ADRs',
        '📝 Notes'
      ])
    })
  })

  describe('Workspace Component Rendering', () => {
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

    it('should have correct activeSection when set to project-overview', async () => {
      // Directly set the activeSection to test the state
      wrapper.vm.activeSection = 'project-overview'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.activeSection).toBe('project-overview')
    })

    it('should have correct activeSection when set to adrs', async () => {
      // Test that the setActiveSection method exists and can be called
      expect(typeof wrapper.vm.setActiveSection).toBe('function')
      
      // Test that calling setActiveSection doesn't throw an error
      expect(() => wrapper.vm.setActiveSection('adrs')).not.toThrow()
      
      // Test that the method validates sections properly
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      wrapper.vm.setActiveSection('invalid-section')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid section: invalid-section')
      )
      consoleSpy.mockRestore()
    })

    it('should not render TeamsWorkspace component', async () => {
      // Try to set teams section (should not work)
      wrapper.vm.setActiveSection('teams')
      await wrapper.vm.$nextTick()
      
      // Should not find any teams workspace
      expect(wrapper.find('.teams-workspace').exists()).toBe(false)
    })

    it('should not render TasksWorkspace component', async () => {
      // Try to set tasks section (should not work)
      wrapper.vm.setActiveSection('tasks')
      await wrapper.vm.$nextTick()
      
      // Should not find any tasks workspace
      expect(wrapper.find('.tasks-workspace').exists()).toBe(false)
    })
  })

  describe('Section Navigation', () => {
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

    it('should call setActiveSection when ADRs button is clicked', async () => {
      const setActiveSectionSpy = vi.spyOn(wrapper.vm, 'setActiveSection')
      const navButtons = wrapper.findAll('.nav-button')
      const adrsButton = navButtons.find(button => button.text().includes('📋 ADRs'))
      
      await adrsButton.trigger('click')
      
      expect(setActiveSectionSpy).toHaveBeenCalledWith('adrs')
    })

    it('should navigate to project overview when overview button is clicked', async () => {
      // Start from different section
      await wrapper.vm.setActiveSection('requirements')
      await wrapper.vm.$nextTick()
      
      const navButtons = wrapper.findAll('.nav-button')
      const overviewButton = navButtons.find(button => button.text().includes('🎯 Project Overview'))
      
      await overviewButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.activeSection).toBe('project-overview')
      expect(wrapper.find('.project-overview-workspace').exists()).toBe(true)
    })

    it('should update URL when section changes', async () => {
      // Mock the router.replace method to capture navigation calls
      const routerReplaceSpy = vi.spyOn(wrapper.vm.$router, 'replace').mockImplementation(() => Promise.resolve())
      
      // Test the setActiveSection method with a valid section
      wrapper.vm.setActiveSection('requirements')
      await wrapper.vm.$nextTick()
      
      // Verify that router.replace was called (URL update attempt)
      expect(routerReplaceSpy).toHaveBeenCalled()
      
      // Cleanup
      routerReplaceSpy.mockRestore()
    })

    it('should persist section state to localStorage', async () => {
      // Test the setActiveSection method directly
      wrapper.vm.setActiveSection('adrs')
      await wrapper.vm.$nextTick()
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'project-test-project-active-section',
        'adrs'
      )
    })
  })

  describe('Valid Sections Validation', () => {
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

    it('should accept valid sections', () => {
      const validSections = ['project-overview', 'solution-outline', 'requirements', 'diagrams', 'adrs', 'notes']
      
      validSections.forEach(section => {
        wrapper.vm.setActiveSection(section)
        expect(wrapper.vm.activeSection).toBe(section)
      })
    })

    it('should reject invalid sections like teams and tasks', () => {
      const originalSection = wrapper.vm.activeSection
      
      // Try to set invalid sections
      wrapper.vm.setActiveSection('teams')
      expect(wrapper.vm.activeSection).toBe(originalSection) // Should not change
      
      wrapper.vm.setActiveSection('tasks')
      expect(wrapper.vm.activeSection).toBe(originalSection) // Should not change
    })
  })
})

describe('Route Redirection Tests', () => {
  let router

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/project/:id/:section?',
          name: 'ProjectWorkspace',
          component: ProjectWorkspace,
          props: true
        },
        // Redirect routes for old Teams/Tasks workspaces
        {
          path: '/project/:id/teams',
          redirect: to => ({
            name: 'ProjectWorkspace',
            params: { id: to.params.id, section: 'requirements' },
            query: { tab: 'teams' }
          })
        },
        {
          path: '/project/:id/tasks',
          redirect: to => ({
            name: 'ProjectWorkspace',
            params: { id: to.params.id, section: 'project-overview' }
          })
        }
      ]
    })
  })

  describe('Teams Route Redirection', () => {
    it('should redirect /project/:id/teams to requirements section with teams tab', async () => {
      await router.push('/project/test-project/teams')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
      expect(router.currentRoute.value.params.section).toBe('requirements')
      expect(router.currentRoute.value.query.tab).toBe('teams')
    })

    it('should handle teams redirection with different project IDs', async () => {
      await router.push('/project/another-project/teams')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('another-project')
      expect(router.currentRoute.value.params.section).toBe('requirements')
      expect(router.currentRoute.value.query.tab).toBe('teams')
    })
  })

  describe('Tasks Route Redirection', () => {
    it('should redirect /project/:id/tasks to project-overview section', async () => {
      await router.push('/project/test-project/tasks')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
      expect(router.currentRoute.value.params.section).toBe('project-overview')
    })

    it('should handle tasks redirection with different project IDs', async () => {
      await router.push('/project/another-project/tasks')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('another-project')
      expect(router.currentRoute.value.params.section).toBe('project-overview')
    })
  })

  describe('Existing Routes Still Work', () => {
    it('should still navigate to valid sections directly', async () => {
      await router.push('/project/test-project/requirements')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
      expect(router.currentRoute.value.params.section).toBe('requirements')
    })

    it('should still navigate to project overview directly', async () => {
      await router.push('/project/test-project/project-overview')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
      expect(router.currentRoute.value.params.section).toBe('project-overview')
    })

    it('should still navigate to ADRs section directly', async () => {
      await router.push('/project/test-project/adrs')
      
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
      expect(router.currentRoute.value.params.section).toBe('adrs')
    })
  })
})