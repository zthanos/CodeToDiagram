import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SolutionOutlineSection from '../../components/SolutionOutlineSection.vue'
import { ProjectOutlineApiService } from '../../services/ProjectOutlineApiService'
import type { ProjectOutline, OutlineVersion } from '../../types/projectOutline'

// Mock the API service
vi.mock('../../services/ProjectOutlineApiService')
const mockProjectOutlineApiService = vi.mocked(ProjectOutlineApiService)

describe('SolutionOutlineSection - Core Functionality', () => {
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
      content: '# Solution Outline\n\nThis is a comprehensive solution outline for the project.',
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
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render the section header correctly', () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false // Disable auto-refresh for testing
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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()

      // Should show loading state before data loads
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Solution Outline')
    })

    it('should not load data when projectId is missing', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: '',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should not make API calls with empty project ID
      expect(mockProjectOutlineApiService.getProjectOutline).not.toHaveBeenCalled()
      expect(mockProjectOutlineApiService.getOutlineVersions).not.toHaveBeenCalled()
    })
  })

  describe('Data Loading', () => {
    it('should load outline data on mount', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      // Wait for component to mount and start loading
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify API calls were made
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-1')
    })

    it('should display project outline data correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check status card
      const statusCard = wrapper.find('.status-card')
      expect(statusCard.exists()).toBe(true)
      expect(statusCard.find('.card-title').text()).toBe('Current Status')

      // Check status badge
      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Active')
      expect(statusBadge.classes()).toContain('active')
    })

    it('should display version history correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
    })
  })

  describe('Error Handling', () => {
    it('should handle project outline loading error', async () => {
      const errorMessage = 'Failed to load project outline'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still show outline data
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.outline-info').exists()).toBe(true)

      // Should not show version history card
      expect(wrapper.find('.version-history-card').exists()).toBe(false)
    })

    it('should emit outline-error event on error', async () => {
      const errorMessage = 'API Error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should emit error event
      expect(wrapper.emitted('outline-error')).toBeTruthy()
      expect(wrapper.emitted('outline-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('User Interactions', () => {
    it('should refresh data when refresh button is clicked', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clear previous calls
      vi.clearAllMocks()

      // Click refresh button
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify API calls were made again
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-1')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-1')
    })

    it('should provide retry functionality', async () => {
      const errorMessage = 'Network error'
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValueOnce(new Error(errorMessage))
      mockProjectOutlineApiService.getProjectOutline.mockResolvedValueOnce(mockProjectOutline)

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show error initially
      expect(wrapper.find('.error-state').exists()).toBe(true)

      // Click retry button
      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show data after retry
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.outline-info').exists()).toBe(true)
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledTimes(2)
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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
  })

  describe('No Data States', () => {
    it('should show no data state when outline is not available', async () => {
      mockProjectOutlineApiService.getProjectOutline.mockRejectedValue(new Error('Not found'))

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show error state when API fails
      expect(wrapper.find('.error-state').exists()).toBe(true)
    })

    it('should not show version history when no versions available', async () => {
      mockProjectOutlineApiService.getOutlineVersions.mockResolvedValue([])

      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should emit loaded event
      expect(wrapper.emitted('outline-loaded')).toBeTruthy()
      expect(wrapper.emitted('outline-loaded')?.[0]).toEqual([mockProjectOutline])
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
            projectId: 'test-project-1',
            autoRefresh: false
          }
        })

        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))

        const statusBadge = wrapper.find('.status-badge')
        expect(statusBadge.classes()).toContain(testCase.expectedClass)

        const statusValue = wrapper.find('.status-value')
        expect(statusValue.classes()).toContain(testCase.expectedClass)

        wrapper.unmount()
      }
    })
  })

  describe('Utility Functions', () => {
    it('should format date and time correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check that date formatting is working in version items
      const versionDate = wrapper.find('.version-date')
      expect(versionDate.exists()).toBe(true)
      expect(versionDate.text()).toMatch(/Jan \d+, 2024/)
    })

    it('should capitalize status text correctly', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Active') // Should be capitalized

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('Active') // Should be capitalized
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
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const contentText = wrapper.find('.content-text')
      expect(contentText.text().length).toBeLessThanOrEqual(203) // 200 + '...'
      expect(contentText.text()).toMatch(/\.\.\.$/);
    })
  })

  describe('Prop Changes', () => {
    it('should reload data when projectId changes', async () => {
      wrapper = mount(SolutionOutlineSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clear previous calls
      vi.clearAllMocks()

      // Change project ID
      await wrapper.setProps({ projectId: 'test-project-2' })
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should make API calls with new project ID
      expect(mockProjectOutlineApiService.getProjectOutline).toHaveBeenCalledWith('test-project-2')
      expect(mockProjectOutlineApiService.getOutlineVersions).toHaveBeenCalledWith('test-project-2')
    })
  })
})