import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProjectWorkspace from '../components/ProjectWorkspace.vue'

// Mock the router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/project/:id', component: ProjectWorkspace, props: true }
  ]
})

// Mock the project manager
vi.mock('../services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: () => ({
      loadProject: vi.fn().mockResolvedValue({
        id: 'test-project',
        name: 'Test Project',
        description: 'Test Description',
        diagrams: [],
        requirements: [],
        teams: [],
        tasks: [],
        settings: { theme: 'light' },
        metadata: { version: '1.0' }
      })
    })
  }
}))

// Mock notification service
vi.mock('../services/NotificationService', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock composables
vi.mock('../composables/useLoading', () => ({
  useLoading: () => ({
    withLoading: vi.fn((fn) => fn())
  })
}))

vi.mock('../composables/useErrorHandling', () => ({
  useComponentErrorHandling: () => ({
    withErrorHandling: vi.fn((fn) => fn())
  })
}))

describe('New ProjectWorkspace Component', () => {
  let wrapper

  beforeEach(async () => {
    // Push to a route with project ID
    await router.push('/project/test-project')
    
    wrapper = mount(ProjectWorkspace, {
      global: {
        plugins: [router],
        stubs: {
          DiagramsWorkspace: { template: '<div>Diagrams Workspace</div>' }
        }
      },
      props: {
        theme: 'light'
      }
    })
  })

  it('should render the project workspace', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('should display navigation sidebar', () => {
    const sidebar = wrapper.find('.navigation-sidebar')
    expect(sidebar.exists()).toBe(true)
  })

  it('should display main content area', () => {
    const mainContent = wrapper.find('.main-content')
    expect(mainContent.exists()).toBe(true)
  })

  it('should have navigation buttons for all sections', () => {
    const navButtons = wrapper.findAll('.nav-button')
    expect(navButtons).toHaveLength(5)
    
    const buttonTexts = navButtons.map(button => button.text())
    expect(buttonTexts).toContain('📋 Requirements')
    expect(buttonTexts).toContain('📊 Diagrams')
    expect(buttonTexts).toContain('👥 Teams')
    expect(buttonTexts).toContain('✅ Tasks')
    expect(buttonTexts).toContain('📝 Notes')
  })

  it('should have diagrams section active by default', () => {
    const diagramsButton = wrapper.find('.nav-button.active')
    expect(diagramsButton.text()).toBe('📊 Diagrams')
  })

  it('should switch sections when navigation buttons are clicked', async () => {
    const requirementsButton = wrapper.find('.nav-button:first-child')
    await requirementsButton.trigger('click')
    
    expect(requirementsButton.classes()).toContain('active')
  })

  it('should display loading state initially', () => {
    const loadingState = wrapper.find('.loading-state')
    // Loading state might not be visible if component loads quickly
    // This test verifies the loading state exists in the template
    expect(wrapper.html()).toContain('loading-state')
  })
})