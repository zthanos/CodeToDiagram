import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ProjectOverviewWorkspace from '../../components/ProjectOverviewWorkspace.vue'
import { ProjectOutlineApiService } from '../../services/ProjectOutlineApiService'
import { RequirementsApiService } from '../../services/RequirementsApiService'
import type { Project } from '../../types/project'
import type { ProjectOutline } from '../../types/projectOutline'
import type { RequirementsDocument } from '../../types/requirements'

// Mock the API services
vi.mock('../../services/ProjectOutlineApiService')
vi.mock('../../services/RequirementsApiService')

const mockProjectOutlineApiService = vi.mocked(ProjectOutlineApiService)
const mockRequirementsApiService = vi.mocked(RequirementsApiService)

// Helper function to wait for async operations
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 10))

// Helper to advance timers and wait for async operations
const advanceTimersAndWait = async () => {
  await vi.runAllTimersAsync()
  await nextTick()
  await waitForAsync()
}

describe('ProjectOverviewWorkspace', () => {
  let wrapper: VueWrapper<any>
  let mockProject: Project
  let mockProjectOutline: ProjectOutline
  let mockRequirementsDocument: RequirementsDocument

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock project data
    mockProject = {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'A test project for unit testing',
      code: 'TEST001',
      state: 'active',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-15'),
      diagrams: [],
      requirements: [],
      teams: [],
      tasks: [],
      settings: {
        theme: 'light',
        autoSave: true,
        defaultDiagramType: 'flowchart',
        editorSettings: {
          theme: 'light',
          fontSize: 14,
          lineNumbers: true,
          wordWrap: true,
          autoSave: true,
          autoSaveInterval: 30000
        }
      },
      metadata: {
        version: '1.0.0',
        tags: ['test'],
        lastOpenedDiagrams: [],
        workspaceLayout: {
          navigationPaneWidth: 280,
          navigationPaneCollapsed: false,
          lastOpenedTabs: []
        }
      }
    }

    // Mock project outline data
    mockProjectOutline = {
      id: 'outline-1',
      project_id: 'test-project-1',
      content: '# Solution Outline\n\nThis is a test solution outline.',
      status: 'active',
      version: 2,
      working_version: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    }

    // Mock requirements document data
    mockRequirementsDocument = {
      id: 1,
      project_id: 'test-project-1',
      content: '# Requirements Document\n\nTest requirements content.',
      status: 'published',
      version: 1,
      source_type: 'manual',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z'
    }

    // Setup default successful API mocks
    mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(mockProjectOutline)
    mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockRequirementsDocument)
    mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue({
      total: 10,
      accepted: 7,
      pending: 3,
      rejected: 0
    })

    // Mock timers for auto-refresh functionality
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  describe('Component Initialization', () => {
    it('should render the workspace header correctly', () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      expect(wrapper.find('.workspace-title').text()).toBe('Project Overview')
      expect(wrapper.find('.refresh-btn').exists()).toBe(true)
    })

    it('should show loading state initially', async () => {
      // Make API calls hang to test loading state
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()

      // Should show loading state before data loads
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Project Overview')
    })

    it('should load all data sources on mount', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      // Wait for component to mount and start loading
      await nextTick()
      await advanceTimersAndWait()

      // Verify API calls were made
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-1')
    }, 10000)
  })

  describe('Data Loading and Display', () => {
    it('should display project outline data correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      // Wait for component to mount and load data
      await nextTick()
      await advanceTimersAndWait()

      const outlineCard = wrapper.find('.solution-outline-card')
      expect(outlineCard.exists()).toBe(true)
      expect(outlineCard.find('.card-title').text()).toBe('🎯 Solution Outline')
      expect(outlineCard.find('.version-number').text()).toBe('v2')
      expect(outlineCard.find('.status-value').text()).toBe('Active')
    }, 10000)

    it('should display requirements data correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await waitForAsync()
      await nextTick()

      const requirementsCard = wrapper.find('.requirements-card')
      expect(requirementsCard.exists()).toBe(true)
      expect(requirementsCard.find('.card-title').text()).toBe('📋 Requirements')
      
      const statValues = requirementsCard.findAll('.stat-value')
      expect(statValues[0].text()).toBe('10') // total
      expect(statValues[1].text()).toBe('7')  // accepted
      expect(statValues[2].text()).toBe('3')  // pending
    })

    it('should display sample teams data', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const teamsCard = wrapper.find('.teams-card')
      expect(teamsCard.exists()).toBe(true)
      expect(teamsCard.find('.card-title').text()).toBe('👥 Teams')
      
      const teamItems = teamsCard.findAll('.team-item')
      expect(teamItems.length).toBeGreaterThan(0)
      expect(teamItems[0].find('.team-name').text()).toBe('Frontend Team')
    })

    it('should display sample systems data', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const systemsCard = wrapper.find('.systems-card')
      expect(systemsCard.exists()).toBe(true)
      expect(systemsCard.find('.card-title').text()).toBe('🏗️ Systems')
      
      const systemItems = systemsCard.findAll('.system-item')
      expect(systemItems.length).toBeGreaterThan(0)
      expect(systemItems[0].find('.system-name').text()).toBe('Authentication Service')
    })

    it('should display sample ADRs data', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const adrsCard = wrapper.find('.adrs-card')
      expect(adrsCard.exists()).toBe(true)
      expect(adrsCard.find('.card-title').text()).toBe('📚 ADRs')
      
      const adrItems = adrsCard.findAll('.adr-item')
      expect(adrItems.length).toBeGreaterThan(0)
      expect(adrItems[0].find('.adr-title').text()).toBe('Use React for Frontend Framework')
    })

    it('should display sample notes data', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const notesCard = wrapper.find('.notes-card')
      expect(notesCard.exists()).toBe(true)
      expect(notesCard.find('.card-title').text()).toBe('📝 Notes')
      
      const noteItems = notesCard.findAll('.note-item')
      expect(noteItems.length).toBeGreaterThan(0)
      expect(noteItems[0].find('.note-title').text()).toBe('Project Kickoff Meeting Notes')
    })
  })

  describe('Error Handling', () => {
    it('should handle project outline loading error', async () => {
      const errorMessage = 'Failed to load project outline'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const outlineCard = wrapper.find('.solution-outline-card')
      expect(outlineCard.find('.card-error').exists()).toBe(true)
      expect(outlineCard.find('.error-text').text()).toBe(errorMessage)
    })

    it('should handle requirements loading error', async () => {
      const errorMessage = 'Failed to load requirements'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const requirementsCard = wrapper.find('.requirements-card')
      expect(requirementsCard.find('.card-error').exists()).toBe(true)
      expect(requirementsCard.find('.error-text').text()).toBe(errorMessage)
    })

    it('should show global error state when all data fails to load', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error('API Error'))
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error('API Error'))
      mockRequirementsApiService.getRequirementItemsSummary.mockRejectedValue(new Error('API Error'))

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Should show error state when no data is available
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBe('Failed to Load Project Overview')
    })

    it('should provide retry functionality for individual cards', async () => {
      const errorMessage = 'Network error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValueOnce(new Error(errorMessage))
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValueOnce(mockProjectOutline)

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Should show error initially
      const outlineCard = wrapper.find('.solution-outline-card')
      expect(outlineCard.find('.card-error').exists()).toBe(true)

      // Click retry button
      const retryBtn = outlineCard.find('.retry-btn')
      expect(retryBtn.exists()).toBe(true)
      await retryBtn.trigger('click')
      await nextTick()
      await vi.runAllTimersAsync()

      // Should show data after retry
      expect(outlineCard.find('.outline-info').exists()).toBe(true)
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledTimes(2)
    })
  })

  describe('Loading States', () => {
    it('should show individual card loading states', async () => {
      // Make API calls hang to test loading states
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()

      const outlineCard = wrapper.find('.solution-outline-card')
      expect(outlineCard.find('.card-loading').exists()).toBe(true)
      expect(outlineCard.find('.loading-spinner.small').exists()).toBe(true)
    })

    it('should show correct status classes for different states', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const outlineCard = wrapper.find('.solution-outline-card')
      const statusElement = outlineCard.find('.card-status')
      expect(statusElement.classes()).toContain('active')
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh all data when refresh button is clicked', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Clear previous calls
      vi.clearAllMocks()

      // Click refresh button
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await vi.runAllTimersAsync()

      // Verify all API calls were made again
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-1')
    })

    it('should disable refresh button during loading', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockProjectOutline), 1000))
      )

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()

      const refreshBtn = wrapper.find('.refresh-btn')
      expect(refreshBtn.attributes('disabled')).toBeDefined()
      expect(refreshBtn.classes()).toContain('loading')
    })

    it('should show success notification after successful refresh', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Click refresh button
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await vi.runAllTimersAsync()

      // Should show success notification
      const notification = wrapper.find('.notification.success')
      expect(notification.exists()).toBe(true)
      expect(notification.find('.notification-message').text()).toBe('Project overview data refreshed successfully')
    })
  })

  describe('Auto-refresh', () => {
    it('should setup auto-refresh timer on mount', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000) // 5 minutes
    })

    it('should cleanup auto-refresh timer on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Utility Functions', () => {
    it('should format time correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Check that time formatting is working
      const lastUpdated = wrapper.find('.last-updated')
      expect(lastUpdated.exists()).toBe(true)
      expect(lastUpdated.text()).toMatch(/Last updated:/)
    })

    it('should capitalize first letter correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Active') // Should be capitalized
    })
  })

  describe('Computed Properties', () => {
    it('should calculate team statistics correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const teamsCard = wrapper.find('.teams-card')
      const statValues = teamsCard.findAll('.stat-value')
      
      // Should show correct team count and member count
      expect(statValues[0].text()).toBe('3') // 3 teams
      expect(statValues[1].text()).toBe('5') // 5 total members
    })

    it('should calculate system statistics correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const systemsCard = wrapper.find('.systems-card')
      const statValues = systemsCard.findAll('.stat-value')
      
      // Should show correct system counts
      expect(statValues[0].text()).toBe('4') // 4 total systems
      expect(statValues[1].text()).toBe('2') // 2 internal
      expect(statValues[2].text()).toBe('2') // 2 external
    })

    it('should calculate ADR statistics correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const adrsCard = wrapper.find('.adrs-card')
      const statValues = adrsCard.findAll('.stat-value')
      
      // Should show correct ADR counts
      expect(statValues[0].text()).toBe('3') // 3 total ADRs
      expect(statValues[1].text()).toBe('2') // 2 accepted
      expect(statValues[2].text()).toBe('1') // 1 proposed
    })
  })

  describe('No Data States', () => {
    it('should show no data state when project outline is not available', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(
        { type: 'CLIENT', message: 'not found' }
      )

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const outlineCard = wrapper.find('.solution-outline-card')
      expect(outlineCard.find('.no-data').exists()).toBe(true)
      expect(outlineCard.find('.no-data-text').text()).toBe('No solution outline available')
    })

    it('should show no data state when requirements are not available', async () => {
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(
        { type: 'CLIENT', message: 'not found' }
      )

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      const requirementsCard = wrapper.find('.requirements-card')
      expect(requirementsCard.find('.no-data').exists()).toBe(true)
      expect(requirementsCard.find('.no-data-text').text()).toBe('No requirements data available')
    })
  })

  describe('Notification System', () => {
    it('should show and hide notifications correctly', async () => {
      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Trigger refresh to show success notification
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await vi.runAllTimersAsync()

      // Should show notification
      const notification = wrapper.find('.notification')
      expect(notification.exists()).toBe(true)

      // Click close button
      const closeBtn = notification.find('.notification-close')
      await closeBtn.trigger('click')
      await nextTick()

      // Should hide notification
      expect(wrapper.find('.notification').exists()).toBe(false)
    })

    it('should auto-hide success notifications', async () => {
      vi.useRealTimers() // Use real timers for this test

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Trigger refresh to show success notification
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show notification
      expect(wrapper.find('.notification.success').exists()).toBe(true)

      // Wait for auto-hide (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3100))
      await nextTick()

      // Should auto-hide
      expect(wrapper.find('.notification').exists()).toBe(false)

      vi.useFakeTimers() // Switch back to fake timers
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing project ID gracefully', async () => {
      const projectWithoutId = { ...mockProject, id: '' }

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: projectWithoutId,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Should not make API calls with empty project ID
      expect(mockProjectOutlineApiService.getProjectOutline).not.toHaveBeenCalled()
      expect(mockRequirementsApiService.getLatestRequirements).not.toHaveBeenCalled()
    })

    it('should handle partial data loading gracefully', async () => {
      // Only project outline succeeds, others fail
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error('Failed'))
      mockRequirementsApiService.getRequirementItemsSummary.mockRejectedValue(new Error('Failed'))

      wrapper = mount(ProjectOverviewWorkspace, {
        props: {
          project: mockProject,
          theme: 'light'
        }
      })

      await nextTick()
      await vi.runAllTimersAsync()

      // Should show successful data
      expect(wrapper.find('.solution-outline-card .outline-info').exists()).toBe(true)
      
      // Should show error states for failed data
      expect(wrapper.find('.requirements-card .card-error').exists()).toBe(true)
      
      // Should not show global error state since some data loaded
      expect(wrapper.find('.error-state').exists()).toBe(false)
    })
  })
})