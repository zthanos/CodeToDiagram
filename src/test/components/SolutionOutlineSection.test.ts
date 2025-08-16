import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SolutionOutlineSection from '../../components/SolutionOutlineSection.vue'
import { ProjectOutlineApiService } from '../../services/ProjectOutlineApiService'
import type { ProjectOutline, OutlineVersion } from '../../types/projectOutline'

// Mock the API service
vi.mock('../../services/ProjectOutlineApiService')
const mockProjectOutlineApiService = vi.mocked(ProjectOutlineApiService)

// Helper function to wait for async operations
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 10))

// Helper to advance timers and wait for async operations
const advanceTimersAndWait = async () => {
  await vi.runAllTimersAsync()
  await nextTick()
  await waitForAsync()
}

describe('SolutionOutlineSection', () => {
  let wrapper: VueWrapper<any>
  let mockProjectOutline: ProjectOutline
  let mockVersions: OutlineVersion[]

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock project outline data
    mockProjectOutline = {
      id: 'outline-1',
      project_id: 'test-project-1',
      content: '# Solution Outline\n\nThis is a comprehensive solution outline for the project.\n\n## Architecture\n\nThe system will use a microservices architecture...',
      status: 'active',
      version: 3,
      working_version: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:30:00Z'
    }

    // Mock version history data
    mockVersions = [
      {
        version: 3,
        content: '# Solution Outline v3\n\nLatest version with updated architecture.',
        status: 'active',
        created_at: '2024-01-15T10:30:00Z',
        changes_summary: 'Updated architecture section with microservices approach'
      },
      {
        version: 2,
        content: '# Solution Outline v2\n\nSecond version with improvements.',
        status: 'draft',
        created_at: '2024-01-10T14:20:00Z',
        changes_summary: 'Added detailed component descriptions'
      },
      {
        version: 1,
        content: '# Solution Outline v1\n\nInitial version.',
        status: 'archived',
        created_at: '2024-01-05T09:15:00Z',
        changes_summary: 'Initial solution outline creation'
      }
    ]

    // Setup default successful API mocks
    mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(mockProjectOutline)
    mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue(mockVersions)

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
    it('should render the section header correctly', () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      expect(wrapper.find('.section-title').text()).toBe('🎯 Solution Outline')
      expect(wrapper.find('.refresh-btn').exists()).toBe(true)
    })

    it('should show loading state initially', async () => {
      // Make API calls hang to test loading state
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()

      // Should show loading state before data loads
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Solution Outline')
      expect(wrapper.find('.loading-subtitle').text()).toBe('Fetching outline data and version history...')
    })

    it('should load outline data on mount', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      // Wait for component to mount and start loading
      await nextTick()
      await advanceTimersAndWait()

      // Verify API calls were made
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-1')
    })

    it('should not load data when projectId is missing', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: ''
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should not make API calls with empty project ID
      expect(mockProjectOutlineApiService.getProjectOutline).not.toHaveBeenCalled()
      expect(mockProjectOutlineApiService.getOutlineVersions).not.toHaveBeenCalled()
    })
  })

  describe('Data Loading and Display', () => {
    it('should display project outline data correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check status card
      const statusCard = wrapper.find('.status-card')
      expect(statusCard.exists()).toBe(true)
      expect(statusCard.find('.card-title').text()).toBe('Current Status')

      // Check status badge
      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Active')
      expect(statusBadge.classes()).toContain('active')

      // Check version info
      const versionNumbers = wrapper.findAll('.version-number')
      expect(versionNumbers[0].text()).toBe('v3') // working version
      expect(versionNumbers[1].text()).toBe('v3') // current version

      // Check status info
      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Active')
      expect(statusValue.classes()).toContain('active')

      // Check content preview
      const contentText = wrapper.find('.content-text')
      expect(contentText.exists()).toBe(true)
      expect(contentText.text()).toContain('This is a comprehensive solution outline')
    })

    it('should display version history correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check version history card
      const versionCard = wrapper.find('.version-history-card')
      expect(versionCard.exists()).toBe(true)
      expect(versionCard.find('.card-title').text()).toBe('Version History')
      expect(versionCard.find('.version-count').text()).toBe('3 versions')

      // Check version items (should show first 3 by default)
      const versionItems = wrapper.findAll('.version-item')
      expect(versionItems.length).toBe(3)

      // Check first version item (latest)
      const firstVersion = versionItems[0]
      expect(firstVersion.find('.version-number').text()).toContain('v3')
      expect(firstVersion.find('.working-badge').exists()).toBe(true)
      expect(firstVersion.find('.current-badge').exists()).toBe(true)
      expect(firstVersion.find('.version-status').text()).toBe('Active')
      expect(firstVersion.find('.version-changes').text()).toBe('Updated architecture section with microservices approach')

      // Check second version item
      const secondVersion = versionItems[1]
      expect(secondVersion.find('.version-number').text()).toContain('v2')
      expect(secondVersion.find('.working-badge').exists()).toBe(false)
      expect(secondVersion.find('.current-badge').exists()).toBe(false)
      expect(secondVersion.find('.version-status').text()).toBe('Draft')
    })

    it('should handle different working and current versions', async () => {
      // Mock outline with different working and current versions
      const outlineWithDifferentVersions = {
        ...mockProjectOutline,
        version: 2,
        working_version: 3
      }
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(outlineWithDifferentVersions)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check version info shows different values
      const versionNumbers = wrapper.findAll('.version-number')
      expect(versionNumbers[0].text()).toBe('v3') // working version
      expect(versionNumbers[1].text()).toBe('v2') // current version

      // Check version items have correct badges
      const versionItems = wrapper.findAll('.version-item')
      const workingVersion = versionItems.find(item => item.text().includes('v3'))
      const currentVersion = versionItems.find(item => item.text().includes('v2'))

      expect(workingVersion?.find('.working-badge').exists()).toBe(true)
      expect(workingVersion?.find('.current-badge').exists()).toBe(false)
      expect(currentVersion?.find('.working-badge').exists()).toBe(false)
      expect(currentVersion?.find('.current-badge').exists()).toBe(true)
    })

    it('should truncate long content correctly', async () => {
      const longContent = 'A'.repeat(300) // Content longer than 200 chars
      const outlineWithLongContent = {
        ...mockProjectOutline,
        content: longContent
      }
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(outlineWithLongContent)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const contentText = wrapper.find('.content-text')
      expect(contentText.text().length).toBeLessThanOrEqual(203) // 200 + '...'
      expect(contentText.text()).toMatch(/\.\.\.$/);
    })
  })

  describe('Error Handling', () => {
    it('should handle project outline loading error', async () => {
      const errorMessage = 'Failed to load project outline'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show error state
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBe('Failed to Load Solution Outline')
      expect(wrapper.find('.error-message').text()).toBe(errorMessage)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should handle version history loading error gracefully', async () => {
      // Outline succeeds, versions fail
      mockProjectOutlineApiService.getOutlineVersions.mockRejectedValue(new Error('Version error'))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should still show outline data
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.outline-info').exists()).toBe(true)

      // Should not show version history card
      expect(wrapper.find('.version-history-card').exists()).toBe(false)
    })

    it('should provide retry functionality', async () => {
      const errorMessage = 'Network error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValueOnce(new Error(errorMessage))
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValueOnce(mockProjectOutline)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show error initially
      expect(wrapper.find('.error-state').exists()).toBe(true)

      // Click retry button
      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      // Should show data after retry
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.outline-info').exists()).toBe(true)
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledTimes(2)
    })

    it('should track retry count and show retry info', async () => {
      const errorMessage = 'Persistent error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Click retry button multiple times
      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      // Should show retry info
      expect(wrapper.find('.retry-info').exists()).toBe(true)
      expect(wrapper.find('.retry-info').text()).toBe('Retry attempt 1/3')

      // Retry again
      await retryBtn.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      expect(wrapper.find('.retry-info').text()).toBe('Retry attempt 2/3')
    })

    it('should emit outline-error event on error', async () => {
      const errorMessage = 'API Error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit error event
      expect(wrapper.emitted('outline-error')).toBeTruthy()
      expect(wrapper.emitted('outline-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Loading States', () => {
    it('should show loading state during data fetch', async () => {
      // Make API calls hang to test loading states
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Solution Outline')
    })

    it('should show correct status classes for different states', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.classes()).toContain('active')
    })

    it('should show loading status during refresh', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Make next API call hang
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      // Click refresh button
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()

      // Should show loading state on refresh button
      expect(refreshBtn.classes()).toContain('loading')
      expect(refreshBtn.attributes('disabled')).toBeDefined()
      expect(refreshBtn.find('.spinner').exists()).toBe(true)
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Clear previous calls
      vi.clearAllMocks()

      // Click refresh button
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      // Verify API calls were made again
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-1')
    })

    it('should disable refresh button during loading', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockProjectOutline), 1000))
      )

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()

      const refreshBtn = wrapper.find('.refresh-btn')
      expect(refreshBtn.attributes('disabled')).toBeDefined()
      expect(refreshBtn.classes()).toContain('loading')
    })

    it('should update last updated time after successful refresh', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show last updated info
      expect(wrapper.find('.last-updated-info').exists()).toBe(true)
      expect(wrapper.find('.update-text').text()).toMatch(/Last updated:/)
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('should setup auto-refresh timer by default', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true,
          refreshInterval: 60000 // 1 minute for testing
        }
      })

      await nextTick()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('should not setup auto-refresh when disabled', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()

      expect(setIntervalSpy).not.toHaveBeenCalled()
    })

    it('should cleanup auto-refresh timer on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true
        }
      })

      await nextTick()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should toggle auto-refresh when button is clicked', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const autoRefreshToggle = wrapper.find('.auto-refresh-toggle')
      expect(autoRefreshToggle.exists()).toBe(true)
      expect(autoRefreshToggle.classes()).toContain('active')
      expect(autoRefreshToggle.text()).toBe('🔄 Auto')

      // Click to disable
      await autoRefreshToggle.trigger('click')
      await nextTick()

      expect(autoRefreshToggle.classes()).not.toContain('active')
      expect(autoRefreshToggle.text()).toBe('⏸️ Manual')
    })

    it('should not auto-refresh during manual loading', async () => {
      vi.clearAllMocks()

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true,
          refreshInterval: 100 // Very short interval for testing
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Clear initial load calls
      vi.clearAllMocks()

      // Start manual refresh (make it hang)
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()

      // Advance timer while manual refresh is in progress
      vi.advanceTimersByTime(200)
      await nextTick()

      // Should not make additional API calls during manual refresh
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledTimes(1)
    })
  })

  describe('Version History Display', () => {
    it('should show limited versions by default', async () => {
      // Create more versions to test pagination
      const manyVersions = Array.from({ length: 10 }, (_, i) => ({
        version: 10 - i,
        content: `Version ${10 - i} content`,
        status: 'active',
        created_at: new Date(2024, 0, i + 1).toISOString(),
        changes_summary: `Changes for version ${10 - i}`
      }))

      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue(manyVersions)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show only first 3 versions by default
      const versionItems = wrapper.findAll('.version-item')
      expect(versionItems.length).toBe(3)

      // Should show "Show More" button
      const showMoreBtn = wrapper.find('.show-more-btn')
      expect(showMoreBtn.exists()).toBe(true)
      expect(showMoreBtn.text()).toBe('Show 7 More Versions')
    })

    it('should expand/collapse version history', async () => {
      // Create more versions to test pagination
      const manyVersions = Array.from({ length: 6 }, (_, i) => ({
        version: 6 - i,
        content: `Version ${6 - i} content`,
        status: 'active',
        created_at: new Date(2024, 0, i + 1).toISOString(),
        changes_summary: `Changes for version ${6 - i}`
      }))

      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue(manyVersions)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Initially shows 3 versions
      expect(wrapper.findAll('.version-item').length).toBe(3)

      // Click "Show More"
      const showMoreBtn = wrapper.find('.show-more-btn')
      await showMoreBtn.trigger('click')
      await nextTick()

      // Should show all versions
      expect(wrapper.findAll('.version-item').length).toBe(6)
      expect(showMoreBtn.text()).toBe('Show Less')

      // Click "Show Less"
      await showMoreBtn.trigger('click')
      await nextTick()

      // Should show limited versions again
      expect(wrapper.findAll('.version-item').length).toBe(3)
      expect(showMoreBtn.text()).toBe('Show 3 More Versions')
    })

    it('should not show "Show More" button when versions <= maxDisplayed', async () => {
      // Use only 2 versions (less than maxDisplayedVersions = 3)
      const fewVersions = mockVersions.slice(0, 2)
      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue(fewVersions)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show all versions
      expect(wrapper.findAll('.version-item').length).toBe(2)

      // Should not show "Show More" button
      expect(wrapper.find('.show-more-btn').exists()).toBe(false)
    })
  })

  describe('No Data States', () => {
    it('should show no data state when outline is not available', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(null as any)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.find('.no-data-text').text()).toBe('No solution outline available')
      expect(wrapper.find('.no-data-subtitle').text()).toBe('Create a solution outline to get started')
    })

    it('should not show version history when no versions available', async () => {
      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue([])

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show outline data
      expect(wrapper.find('.status-card').exists()).toBe(true)

      // Should not show version history card
      expect(wrapper.find('.version-history-card').exists()).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    it('should emit outline-loaded event when data loads successfully', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit loaded event
      expect(wrapper.emitted('outline-loaded')).toBeTruthy()
      expect(wrapper.emitted('outline-loaded')?.[0]).toEqual([mockProjectOutline])
    })

    it('should emit outline-error event when loading fails', async () => {
      const errorMessage = 'Load failed'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit error event
      expect(wrapper.emitted('outline-error')).toBeTruthy()
      expect(wrapper.emitted('outline-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Utility Functions', () => {
    it('should format date and time correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check that date formatting is working in version items
      const versionDate = wrapper.find('.version-date')
      expect(versionDate.exists()).toBe(true)
      expect(versionDate.text()).toMatch(/Jan \d+, 2024/)
    })

    it('should format relative time correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const updateText = wrapper.find('.update-text')
      expect(updateText.exists()).toBe(true)
      expect(updateText.text()).toMatch(/Last updated:/)
    })

    it('should capitalize status text correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Active') // Should be capitalized

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('Active') // Should be capitalized
    })
  })

  describe('Prop Changes', () => {
    it('should reload data when projectId changes', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Clear previous calls
      vi.clearAllMocks()

      // Change project ID
      await wrapper.setProps({ projectId: 'test-project-2' })
      await nextTick()
      await advanceTimersAndWait()

      // Should make API calls with new project ID
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-2')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-2')
    })

    it('should update auto-refresh when prop changes', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()

      // Should not have set up auto-refresh initially
      expect(setIntervalSpy).not.toHaveBeenCalled()

      // Enable auto-refresh
      await wrapper.setProps({ autoRefresh: true })
      await nextTick()

      // Should set up auto-refresh
      expect(setIntervalSpy).toHaveBeenCalled()

      // Disable auto-refresh
      await wrapper.setProps({ autoRefresh: false })
      await nextTick()

      // Should clean up auto-refresh
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Status Classes', () => {
    it('should apply correct status classes for different outline statuses', async () => {
      const testCases = [
        { status: 'draft', expectedClass: 'draft' },
        { status: 'active', expectedClass: 'active' },
        { status: 'archived', expectedClass: 'archived' }
      ]

      for (const testCase of testCases) {
        const outlineWithStatus = {
          ...mockProjectOutline,
          status: testCase.status as 'draft' | 'active' | 'archived'
        }
        mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(outlineWithStatus)

        wrapper = mount(SolutionOutlineSection, {
          props: {
            projectId: 'test-project-1'
          }
        })

        await nextTick()
        await advanceTimersAndWait()

        const statusBadge = wrapper.find('.status-badge')
        expect(statusBadge.classes()).toContain(testCase.expectedClass)

        const statusValue = wrapper.find('.status-value')
        expect(statusValue.classes()).toContain(testCase.expectedClass)

        wrapper.unmount()
      }
    })

    it('should apply loading class during data fetch', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()

      // Status should show loading class
      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.classes()).toContain('loading')
    })

    it('should apply error class when loading fails', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error('Error'))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show error state instead of status badge
      expect(wrapper.find('.error-state').exists()).toBe(true)
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle empty content gracefully', async () => {
      const outlineWithEmptyContent = {
        ...mockProjectOutline,
        content: ''
      }
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValue(outlineWithEmptyContent)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should not show content preview for empty content
      expect(wrapper.find('.content-preview').exists()).toBe(false)
    })

    it('should handle versions without changes summary', async () => {
      const versionsWithoutSummary = mockVersions.map(v => ({
        ...v,
        changes_summary: undefined
      }))
      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue(versionsWithoutSummary)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1'
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should not show changes summary elements
      expect(wrapper.find('.version-changes').exists()).toBe(false)
    })
  })
})