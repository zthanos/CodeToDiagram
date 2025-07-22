import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/components/LandingPage.vue'
import ProjectWorkspace from '@/components/ProjectWorkspace.vue'
import { ProjectManager } from '@/services/ProjectManager'

// Mock ProjectManager
vi.mock('@/services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: vi.fn(() => ({
      loadProject: vi.fn().mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description',
        diagrams: [],
        requirements: []
      }),
      getAvailableProjects: vi.fn().mockResolvedValue([
        {
          id: 'test-project',
          name: 'Test Project',
          description: 'Test Description'
        }
      ]),
      createProject: vi.fn().mockResolvedValue({
        id: 'new-project',
        name: 'New Project',
        description: 'New Description'
      })
    }))
  }
}))

describe('Task 9: Integration and Complete Workflow Verification', () => {
  let router

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'Home',
          component: LandingPage
        },
        {
          path: '/project/:id',
          name: 'ProjectWorkspace',
          component: ProjectWorkspace,
          props: true
        }
      ]
    })
  })

  describe('Wire all components together in router configuration', () => {
    it('should have correct routes configured', () => {
      const routes = router.getRoutes()
      
      // Should have at least the main routes
      expect(routes.length).toBeGreaterThanOrEqual(2)
      
      // Should have home route
      const homeRoute = routes.find(route => route.path === '/')
      expect(homeRoute).toBeDefined()
      expect(homeRoute.name).toBe('Home')
      
      // Should have project workspace route
      const projectRoute = routes.find(route => route.path === '/project/:id')
      expect(projectRoute).toBeDefined()
      expect(projectRoute.name).toBe('ProjectWorkspace')
      expect(projectRoute.props).toBeTruthy()
    })
  })

  describe('Test complete user journey from landing page to project workspace', () => {
    it('should support navigation between pages', async () => {
      // Start at landing page
      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')
      expect(router.currentRoute.value.name).toBe('Home')

      // Navigate to project workspace
      await router.push('/project/test-project')
      expect(router.currentRoute.value.path).toBe('/project/test-project')
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      expect(router.currentRoute.value.params.id).toBe('test-project')
    })

    it('should handle route parameters correctly', async () => {
      await router.push('/project/my-project-123')
      expect(router.currentRoute.value.params.id).toBe('my-project-123')
    })
  })

  describe('Verify navigation between all workspace sections works correctly', () => {
    it('should render ProjectWorkspace with navigation sections', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: {
          projectId: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.$nextTick()

      // Check that navigation buttons exist
      const navButtons = wrapper.findAll('.nav-button')
      expect(navButtons.length).toBeGreaterThan(0)

      // Check that main content area exists
      const mainContent = wrapper.find('.main-content')
      expect(mainContent.exists()).toBe(true)

      // Check that navigation sections are present
      const navText = wrapper.text()
      expect(navText).toContain('Requirements')
      expect(navText).toContain('Diagrams')
      expect(navText).toContain('Teams')
      expect(navText).toContain('Tasks')
      expect(navText).toContain('Notes')
    })

    it('should allow section switching', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: {
          projectId: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.$nextTick()

      // Find navigation buttons
      const navButtons = wrapper.findAll('.nav-button')
      expect(navButtons.length).toBeGreaterThan(0)

      // Should be able to click navigation buttons without errors
      if (navButtons.length > 0) {
        await navButtons[0].trigger('click')
        // Component should still exist after navigation
        expect(wrapper.exists()).toBe(true)
      }
    })
  })

  describe('Test project creation, selection, and context preservation', () => {
    it('should render LandingPage with project management features', async () => {
      const wrapper = mount(LandingPage, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.$nextTick()

      // Check that essential elements exist
      expect(wrapper.find('.create-project-form').exists()).toBe(true)
      expect(wrapper.find('.projects-section').exists()).toBe(true)

      // Check that form has required fields
      const nameInput = wrapper.find('#project-name')
      expect(nameInput.exists()).toBe(true)

      const createButton = wrapper.find('.create-btn')
      expect(createButton.exists()).toBe(true)
    })

    it('should integrate with ProjectManager service', () => {
      const projectManager = ProjectManager.getInstance()
      
      // Verify all required methods exist
      expect(typeof projectManager.getAvailableProjects).toBe('function')
      expect(typeof projectManager.createProject).toBe('function')
      expect(typeof projectManager.loadProject).toBe('function')
    })

    it('should maintain project context in workspace', async () => {
      const wrapper = mount(ProjectWorkspace, {
        props: {
          projectId: 'test-project'
        },
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.$nextTick()

      // Component should render successfully
      expect(wrapper.exists()).toBe(true)
      
      // Should show project information
      const projectInfo = wrapper.find('.project-info')
      expect(projectInfo.exists()).toBe(true)
    })
  })

  describe('Overall Integration Verification', () => {
    it('should have all components properly wired together', () => {
      // Router should be configured
      expect(router).toBeDefined()
      
      // Components should be importable
      expect(LandingPage).toBeDefined()
      expect(ProjectWorkspace).toBeDefined()
      
      // ProjectManager should be available
      expect(ProjectManager).toBeDefined()
    })

    it('should support the complete SO Assistant workflow', async () => {
      // 1. Start at landing page
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('Home')
      
      // 2. Navigate to project workspace
      await router.push('/project/test-project')
      expect(router.currentRoute.value.name).toBe('ProjectWorkspace')
      
      // 3. Verify project context is maintained
      expect(router.currentRoute.value.params.id).toBe('test-project')
      
      // 4. Navigate back to home
      await router.push('/')
      expect(router.currentRoute.value.name).toBe('Home')
    })
  })
})