import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LandingPage from '../components/LandingPage.vue'
import ProjectWorkspace from '../components/ProjectWorkspace.vue'
import RequirementsWorkspace from '../components/RequirementsWorkspace.vue'
import NotificationService from '../services/NotificationService'
import LoadingService from '../services/LoadingService'
import ErrorHandlingService from '../services/ErrorHandlingService'

// Mock router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  currentRoute: { value: { params: { id: 'test-project' }, query: {} } },
  beforeEach: vi.fn()
}

const mockRoute = {
  params: { id: 'test-project' },
  query: {},
  name: 'ProjectWorkspace'
}

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => mockRoute
}))

// Mock ProjectManager
vi.mock('../services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: () => ({
      loadProjectList: vi.fn().mockResolvedValue([]),
      getProjectList: vi.fn().mockReturnValue([]),
      createProject: vi.fn().mockResolvedValue({ id: 'test', name: 'Test Project' }),
      loadProject: vi.fn().mockResolvedValue({ id: 'test', name: 'Test Project', diagrams: [], requirements: [] })
    })
  }
}))

// Mock ProjectApiService
vi.mock('../services/ProjectApiService', () => ({
  ProjectApiService: {
    listRequirements: vi.fn().mockResolvedValue([]),
    uploadFilesForRequirements: vi.fn().mockResolvedValue([]),
    addRequirement: vi.fn().mockResolvedValue({ id: 1, description: 'Test', category: 'Functional' }),
    updateRequirement: vi.fn().mockResolvedValue({ id: 1, description: 'Updated', category: 'Functional' }),
    deleteRequirement: vi.fn().mockResolvedValue()
  },
  ApiErrorInfo: class ApiErrorInfo {
    constructor(message) {
      this.message = message
    }
  }
}))

describe('Error Handling and Loading States', () => {
  beforeEach(() => {
    // Clear all services before each test
    NotificationService.dismissAll()
    LoadingService.stopAll()
    ErrorHandlingService.clearErrorHistory()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up after each test
    NotificationService.dismissAll()
    LoadingService.stopAll()
  })

  describe('LandingPage Error Handling', () => {
    it('should display loading state when loading projects', async () => {
      const wrapper = mount(LandingPage, {
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set loading state
      await wrapper.setData({ isLoading: true })
      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading projects...')
    })

    it('should display error alert when there is a route error', async () => {
      const wrapper = mount(LandingPage, {
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set error state
      await wrapper.setData({
        routeError: {
          error: 'project-not-found',
          message: 'Project not found',
          projectId: 'test-id'
        }
      })
      await nextTick()

      expect(wrapper.find('.error-alert').exists()).toBe(true)
      expect(wrapper.text()).toContain('Project Not Found')
      expect(wrapper.text()).toContain('Project not found')
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should handle project creation errors', async () => {
      const wrapper = mount(LandingPage, {
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set form data
      await wrapper.setData({
        newProject: { name: 'Test Project', description: 'Test Description' }
      })

      // Mock error in createProject
      const ProjectManager = await import('../services/ProjectManager')
      ProjectManager.ProjectManager.getInstance().createProject.mockRejectedValueOnce(
        new Error('Project already exists')
      )

      // Submit form
      await wrapper.find('form').trigger('submit.prevent')
      await nextTick()

      // Check error state
      expect(wrapper.vm.errors.general).toBeDefined()
    })

    it('should retry loading projects when retry button is clicked', async () => {
      const wrapper = mount(LandingPage, {
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set error state
      await wrapper.setData({
        routeError: {
          error: 'project-list-load-failed',
          message: 'Failed to load projects',
          projectId: null
        }
      })
      await nextTick()

      const retryBtn = wrapper.find('.retry-btn')
      expect(retryBtn.exists()).toBe(true)

      // Click retry button
      await retryBtn.trigger('click')
      await nextTick()

      // Error should be dismissed
      expect(wrapper.vm.routeError).toBeNull()
    })
  })

  describe('ProjectWorkspace Error Handling', () => {
    it('should display loading state when loading project', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: { theme: 'default', id: 'test-project' },
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set loading state
      await wrapper.setData({ isLoading: true })
      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading project...')
    })

    it('should display error state when project fails to load', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: { theme: 'default', id: 'test-project' },
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set error state
      await wrapper.setData({ currentProject: null, isLoading: false })
      await nextTick()

      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Project Not Found')
      expect(wrapper.find('.btn-primary').exists()).toBe(true)
    })

    it('should track unsaved changes', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: { theme: 'default', id: 'test-project' },
        global: {
          mocks: {
            $router: mockRouter,
            $route: mockRoute
          }
        }
      })

      // Set project data
      await wrapper.setData({
        currentProject: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] },
        hasUnsavedChanges: false
      })

      // Simulate unsaved changes
      wrapper.vm.setUnsavedChanges(true)
      await nextTick()

      expect(wrapper.vm.hasUnsavedChanges).toBe(true)
    })
  })

  describe('RequirementsWorkspace Error Handling', () => {
    it('should display loading state when loading requirements', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      // Set loading state
      await wrapper.setData({ isLoadingRequirements: true })
      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading requirements...')
    })

    it('should display error state when requirements fail to load', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      // Set error state
      await wrapper.setData({
        error: 'Failed to load requirements',
        isLoadingRequirements: false,
        requirements: []
      })
      await nextTick()

      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to Load Requirements')
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
      expect(wrapper.find('.dismiss-btn').exists()).toBe(true)
    })

    it('should handle file upload errors', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      // Create a large file (over 10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' })
      
      // Simulate file drop
      wrapper.vm.addFiles([largeFile])
      await nextTick()

      expect(wrapper.vm.error).toContain('too large')
    })

    it('should handle invalid file types', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      // Create an invalid file type
      const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' })
      
      // Simulate file drop
      wrapper.vm.addFiles([invalidFile])
      await nextTick()

      expect(wrapper.vm.error).toContain('unsupported format')
    })

    it('should emit unsaved changes when editing requirements', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      const requirement = { id: 1, description: 'Test', category: 'Functional' }
      
      // Start editing
      wrapper.vm.startEditRequirement(requirement)
      await nextTick()

      // Check if unsaved-changes event was emitted
      expect(wrapper.emitted('unsaved-changes')).toBeTruthy()
      expect(wrapper.emitted('unsaved-changes')[0]).toEqual([true])
    })

    it('should clear error when dismiss button is clicked', async () => {
      const wrapper = mount(RequirementsWorkspace, {
        props: {
          project: { id: 'test', name: 'Test Project', diagrams: [], requirements: [] }
        }
      })

      // Set error state
      await wrapper.setData({ error: 'Test error' })
      await nextTick()

      const dismissBtn = wrapper.find('.dismiss-btn')
      expect(dismissBtn.exists()).toBe(true)

      // Click dismiss button
      await dismissBtn.trigger('click')
      await nextTick()

      expect(wrapper.vm.error).toBeNull()
    })
  })

  describe('Loading Service Integration', () => {
    it('should start and stop loading operations', () => {
      const loadingId = LoadingService.start('Test operation')
      expect(LoadingService.isLoading()).toBe(true)
      expect(LoadingService.isLoadingId(loadingId)).toBe(true)

      LoadingService.stop(loadingId)
      expect(LoadingService.isLoading()).toBe(false)
      expect(LoadingService.isLoadingId(loadingId)).toBe(false)
    })

    it('should handle loading with progress', async () => {
      const operation = vi.fn().mockImplementation(async (updateProgress) => {
        updateProgress(50)
        await new Promise(resolve => setTimeout(resolve, 10))
        updateProgress(100)
        return 'result'
      })

      const result = await LoadingService.withProgressLoading(operation, 'Test operation')
      expect(result).toBe('result')
      expect(operation).toHaveBeenCalled()
    })
  })

  describe('Notification Service Integration', () => {
    it('should show success notifications', () => {
      const id = NotificationService.success('Success', 'Operation completed')
      const notifications = NotificationService.getNotifications()
      
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('success')
      expect(notifications[0].title).toBe('Success')
      expect(notifications[0].message).toBe('Operation completed')
    })

    it('should show error notifications with retry', () => {
      const retryFn = vi.fn()
      const id = NotificationService.errorWithRetry('Error', 'Operation failed', retryFn)
      const notifications = NotificationService.getNotifications()
      
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('error')
      expect(notifications[0].actions).toBeDefined()
      expect(notifications[0].actions.length).toBeGreaterThan(0)
    })

    it('should dismiss notifications', () => {
      const id = NotificationService.info('Info', 'Test message')
      expect(NotificationService.getNotifications()).toHaveLength(1)
      
      NotificationService.dismiss(id)
      expect(NotificationService.getNotifications()).toHaveLength(0)
    })
  })

  describe('Error Handling Service Integration', () => {
    it('should categorize network errors', () => {
      const networkError = new Error('Network Error')
      networkError.code = 'NETWORK_ERROR'
      
      const errorInfo = ErrorHandlingService.categorizeError(networkError)
      expect(errorInfo.category).toBe('network')
      expect(errorInfo.canRetry).toBe(true)
      expect(errorInfo.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should categorize validation errors', () => {
      const validationError = {
        response: {
          status: 400,
          data: {
            errors: [{ field: 'name', message: 'Required' }]
          }
        }
      }
      
      const errorInfo = ErrorHandlingService.categorizeError(validationError)
      expect(errorInfo.category).toBe('validation')
      expect(errorInfo.canRetry).toBe(false)
      expect(errorInfo.isRecoverable).toBe(true)
    })

    it('should track error history', () => {
      const error = new Error('Test error')
      const context = {
        operation: 'test',
        component: 'TestComponent',
        timestamp: new Date()
      }
      
      ErrorHandlingService.handleError(error, context)
      const history = ErrorHandlingService.getErrorHistory()
      
      expect(history).toHaveLength(1)
      expect(history[0].context.operation).toBe('test')
      expect(history[0].context.component).toBe('TestComponent')
    })
  })
})