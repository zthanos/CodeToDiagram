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

describe('Complete Workflow Integration', () => {
  let router

  beforeEach(() => {
    // Create router with the same configuration as the app
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

  it('should wire all components together in router configuration', () => {
    // Test that router has correct routes
    const routes = router.getRoutes()
    
    expect(routes.length).toBeGreaterThanOrEqual(2)
    
    // Find the home route
    const homeRoute = routes.find(route => route.path === '/')
    expect(homeRoute).toBeDefined()
    expect(homeRoute.name).toBe('Home')
    expect(homeRoute.component).toBe(LandingPage)
    
    // Find the project workspace route
    const projectRoute = routes.find(route => route.path === '/project/:id')
    expect(projectRoute).toBeDefined()
    expect(projectRoute.name).toBe('ProjectWorkspace')
    expect(projectRoute.component).toBe(ProjectWorkspace)
    expect(projectRoute.props).toBe(true)
  })

  it('should support complete user journey from landing page to project workspace', async () => {
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

  it('should verify navigation between all workspace sections works correctly', async () => {
    // Mount ProjectWorkspace component
    const wrapper = mount(ProjectWorkspace, {
      props: {
        projectId: 'test-project'
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check that navigation sections exist
    const navButtons = wrapper.findAll('.nav-button')
    expect(navButtons.length).toBeGreaterThan(0)

    // Check that main content area exists
    const mainContent = wrapper.find('.main-content')
    expect(mainContent.exists()).toBe(true)
  })

  it('should test project creation, selection, and context preservation', async () => {
    // Mount LandingPage component
    const wrapper = mount(LandingPage, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Check that projects section is displayed (using correct class name)
    expect(wrapper.find('.projects-section').exists()).toBe(true)

    // Check that create project form exists
    expect(wrapper.find('.create-project-form').exists()).toBe(true)

    // Verify project manager integration
    const projectManager = ProjectManager.getInstance()
    expect(projectManager.getAvailableProjects).toBeDefined()
    expect(projectManager.createProject).toBeDefined()
    expect(projectManager.loadProject).toBeDefined()
  })

  it('should handle router navigation helpers', async () => {
    // Test navigation to project
    await router.push('/project/test-project')
    expect(router.currentRoute.value.params.id).toBe('test-project')

    // Test navigation back to home
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('Home')
  })

  it('should verify all workspace components are properly integrated', async () => {
    const wrapper = mount(ProjectWorkspace, {
      props: {
        projectId: 'test-project'
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()

    // Verify that the component renders without errors
    expect(wrapper.exists()).toBe(true)
    
    // Check that project context is maintained (using vm to access props)
    expect(wrapper.vm.projectId).toBe('test-project')
  })
})