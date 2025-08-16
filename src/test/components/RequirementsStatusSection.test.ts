import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import RequirementsStatusSection from '../../components/RequirementsStatusSection.vue'
import { RequirementsApiService } from '../../services/RequirementsApiService'
import type { RequirementsDocument } from '../../types/requirements'

// Mock the API service
vi.mock('../../services/RequirementsApiService')
const mockRequirementsApiService = vi.mocked(RequirementsApiService)

// Mock router
const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/project/:projectId', name: 'project-workspace', component: { template: '<div>Project</div>' } }
  ]
})

// Helper function to wait for async operations
const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 10))

// Helper to advance timers and wait for async operations
const advanceTimersAndWait = async () => {
  await vi.runAllTimersAsync()
  await nextTick()
  await waitForAsync()
}

describe('RequirementsStatusSection', () => {
  let wrapper: VueWrapper<any>
  let mockRequirementsDocument: RequirementsDocument
  let mockRequirementsSummary: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock requirements document data
    mockRequirementsDocument = {
      id: 1,
      project_id: 'test-project-1',
      content: '# Requirements Document\n\nThis is a comprehensive requirements document.\n\n## Functional Requirements\n\n1. User authentication\n2. Data management',
      status: 'published',
      version: 2,
      source_type: 'manual',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:30:00Z'
    }

    // Mock requirements summary data
    mockRequirementsSummary = {
      total: 15,
      accepted: 10,
      pending: 3,
      rejected: 2,
      new: 3
    }

    // Setup default successful API mocks
    mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockRequirementsDocument)
    mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(mockRequirementsSummary)

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
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.find('.section-title').text()).toBe('📋 Requirements Status')
      expect(wrapper.find('.refresh-btn').exists()).toBe(true)
      expect(wrapper.find('.navigate-btn').exists()).toBe(true)
      expect(wrapper.find('.navigate-text').text()).toBe('Manage')
    })

    it('should show loading state initially', async () => {
      // Make API calls hang to test loading state
      mockRequirementsApiService.getLatestRequirements.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      // Should show loading state before data loads
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Requirements Status')
      expect(wrapper.find('.loading-subtitle').text()).toBe('Fetching requirements data and metrics...')
    })

    it('should load requirements data on mount', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      // Wait for component to mount and start loading
      await nextTick()
      await advanceTimersAndWait()

      // Verify API calls were made
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-1')
    })

    it('should not load data when projectId is missing', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: ''
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should not make API calls with empty project ID
      expect(mockRequirementsApiService.getLatestRequirements).not.toHaveBeenCalled()
      expect(mockRequirementsApiService.getRequirementItemsSummary).not.toHaveBeenCalled()
    })
  })

  describe('Data Loading and Display', () => {
    it('should display requirements document data correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check status card
      const statusCard = wrapper.find('.status-card')
      expect(statusCard.exists()).toBe(true)
      expect(statusCard.find('.card-title').text()).toBe('Status Overview')

      // Check status badge
      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.exists()).toBe(true)
      expect(statusBadge.text()).toBe('Published')
      expect(statusBadge.classes()).toContain('published')

      // Check document info
      const documentInfo = wrapper.find('.document-info')
      expect(documentInfo.exists()).toBe(true)

      const versionNumbers = wrapper.findAll('.version-number')
      expect(versionNumbers[0].text()).toBe('v2') // document version
      expect(versionNumbers[1].text()).toBe('v2') // working version

      // Check status value
      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Published')
      expect(statusValue.classes()).toContain('published')
    })

    it('should display requirements summary metrics correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check summary metrics
      const summaryMetrics = wrapper.find('.summary-metrics')
      expect(summaryMetrics.exists()).toBe(true)
      expect(summaryMetrics.find('.metrics-title').text()).toBe('Requirements Metrics')

      // Check metric items
      const metricItems = wrapper.findAll('.metric-item')
      expect(metricItems.length).toBe(4)

      // Check total metric
      const totalMetric = metricItems.find(item => item.classes().includes('total'))
      expect(totalMetric?.find('.metric-value').text()).toBe('15')
      expect(totalMetric?.find('.metric-label').text()).toBe('Total Requirements')

      // Check accepted metric
      const acceptedMetric = metricItems.find(item => item.classes().includes('accepted'))
      expect(acceptedMetric?.find('.metric-value').text()).toBe('10')
      expect(acceptedMetric?.find('.metric-label').text()).toBe('Accepted')

      // Check pending metric
      const pendingMetric = metricItems.find(item => item.classes().includes('pending'))
      expect(pendingMetric?.find('.metric-value').text()).toBe('3')
      expect(pendingMetric?.find('.metric-label').text()).toBe('Pending')

      // Check rejected metric
      const rejectedMetric = metricItems.find(item => item.classes().includes('rejected'))
      expect(rejectedMetric?.find('.metric-value').text()).toBe('2')
      expect(rejectedMetric?.find('.metric-label').text()).toBe('Rejected')
    })

    it('should display progress tracking correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check progress tracking
      const progressTracking = wrapper.find('.progress-tracking')
      expect(progressTracking.exists()).toBe(true)

      // Check progress percentage (10 accepted out of 15 total = 67%)
      const progressPercentage = wrapper.find('.progress-percentage')
      expect(progressPercentage.text()).toBe('67% Complete')

      // Check progress bar
      const progressFill = wrapper.find('.progress-fill')
      expect(progressFill.exists()).toBe(true)
      expect(progressFill.attributes('style')).toContain('width: 67%')

      // Check progress breakdown
      const breakdownItems = wrapper.findAll('.breakdown-item')
      expect(breakdownItems.length).toBe(3)

      const acceptedBreakdown = breakdownItems.find(item => item.classes().includes('accepted'))
      expect(acceptedBreakdown?.find('.breakdown-label').text()).toBe('Accepted (67%)')

      const pendingBreakdown = breakdownItems.find(item => item.classes().includes('pending'))
      expect(pendingBreakdown?.find('.breakdown-label').text()).toBe('Pending (20%)')

      const rejectedBreakdown = breakdownItems.find(item => item.classes().includes('rejected'))
      expect(rejectedBreakdown?.find('.breakdown-label').text()).toBe('Rejected (13%)')
    })

    it('should handle zero requirements correctly', async () => {
      const emptySummary = {
        total: 0,
        accepted: 0,
        pending: 0,
        rejected: 0
      }
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(emptySummary)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show metrics with zero values
      const metricItems = wrapper.findAll('.metric-item')
      expect(metricItems.length).toBe(4)
      
      metricItems.forEach(item => {
        expect(item.find('.metric-value').text()).toBe('0')
      })

      // Should not show progress tracking for zero requirements
      expect(wrapper.find('.progress-tracking').exists()).toBe(false)
    })

    it('should display quick actions correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check quick actions card
      const quickActionsCard = wrapper.find('.quick-actions-card')
      expect(quickActionsCard.exists()).toBe(true)
      expect(quickActionsCard.find('.card-title').text()).toBe('Quick Actions')

      // Check action buttons
      const actionButtons = wrapper.findAll('.action-btn')
      expect(actionButtons.length).toBe(4)

      const actionTexts = actionButtons.map(btn => btn.find('.action-text').text())
      expect(actionTexts).toContain('Manage Requirements')
      expect(actionTexts).toContain('View Systems')
      expect(actionTexts).toContain('View Teams')
      expect(actionTexts).toContain('Refresh Data')
    })
  })

  describe('Error Handling', () => {
    it('should handle requirements document loading error', async () => {
      const errorMessage = 'Failed to load requirements document'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show error state
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBe('Failed to Load Requirements Status')
      expect(wrapper.find('.error-message').text()).toBe(errorMessage)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should handle summary loading error gracefully', async () => {
      // Document succeeds, summary fails
      mockRequirementsApiService.getRequirementItemsSummary.mockRejectedValue(new Error('Summary error'))

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should still show document data
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.document-info').exists()).toBe(true)

      // Should not show summary metrics
      expect(wrapper.find('.summary-metrics').exists()).toBe(false)
    })

    it('should provide retry functionality', async () => {
      const errorMessage = 'Network error'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValueOnce(new Error(errorMessage))
      mockRequirementsApiService.getLatestRequirements.mockResolvedValueOnce(mockRequirementsDocument)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
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
      expect(wrapper.find('.document-info').exists()).toBe(true)
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledTimes(2)
    })

    it('should track retry count and show retry info', async () => {
      const errorMessage = 'Persistent error'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
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

    it('should emit requirements-error event on error', async () => {
      const errorMessage = 'API Error'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit error event
      expect(wrapper.emitted('requirements-error')).toBeTruthy()
      expect(wrapper.emitted('requirements-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Navigation Integration', () => {
    it('should navigate to requirements workspace when manage button is clicked', async () => {
      const pushSpy = vi.spyOn(mockRouter, 'push')

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Click navigate button in header
      const navigateBtn = wrapper.find('.navigate-btn')
      await navigateBtn.trigger('click')

      // Should navigate to requirements workspace
      expect(pushSpy).toHaveBeenCalledWith({
        name: 'project-workspace',
        params: { projectId: 'test-project-1' },
        query: { workspace: 'requirements' }
      })
    })

    it('should navigate to requirements workspace with specific tab', async () => {
      const pushSpy = vi.spyOn(mockRouter, 'push')

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Find and click "View Systems" button
      const actionButtons = wrapper.findAll('.action-btn')
      const viewSystemsBtn = actionButtons.find(btn => 
        btn.find('.action-text').text() === 'View Systems'
      )
      
      await viewSystemsBtn?.trigger('click')

      // Should navigate to requirements workspace with systems tab
      expect(pushSpy).toHaveBeenCalledWith({
        name: 'project-workspace',
        params: { projectId: 'test-project-1' },
        query: { workspace: 'requirements', tab: 'systems' }
      })
    })

    it('should emit navigate-to-requirements event', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Click navigate button
      const navigateBtn = wrapper.find('.navigate-btn')
      await navigateBtn.trigger('click')

      // Should emit navigation event
      expect(wrapper.emitted('navigate-to-requirements')).toBeTruthy()
      expect(wrapper.emitted('navigate-to-requirements')?.[0]).toEqual([undefined])
    })

    it('should emit navigate-to-requirements event with tab parameter', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Find and click "View Teams" button
      const actionButtons = wrapper.findAll('.action-btn')
      const viewTeamsBtn = actionButtons.find(btn => 
        btn.find('.action-text').text() === 'View Teams'
      )
      
      await viewTeamsBtn?.trigger('click')

      // Should emit navigation event with teams tab
      expect(wrapper.emitted('navigate-to-requirements')).toBeTruthy()
      expect(wrapper.emitted('navigate-to-requirements')?.[0]).toEqual(['teams'])
    })
  })

  describe('Loading States', () => {
    it('should show loading state during data fetch', async () => {
      // Make API calls hang to test loading states
      mockRequirementsApiService.getLatestRequirements.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.find('.loading-title').text()).toBe('Loading Requirements Status')
    })

    it('should show correct status classes for different document states', async () => {
      // Test draft status
      const draftDocument = { ...mockRequirementsDocument, status: 'draft' as const }
      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(draftDocument)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.classes()).toContain('draft')
      expect(statusBadge.text()).toBe('Draft')
    })

    it('should show loading status during refresh', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Make next API call hang
      mockRequirementsApiService.getLatestRequirements.mockImplementation(
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
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
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
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-1')
    })

    it('should refresh data when refresh action button is clicked', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Clear previous calls
      vi.clearAllMocks()

      // Find and click "Refresh Data" button
      const actionButtons = wrapper.findAll('.action-btn')
      const refreshActionBtn = actionButtons.find(btn => 
        btn.find('.action-text').text() === 'Refresh Data'
      )
      
      await refreshActionBtn?.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      // Verify API calls were made again
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-1')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-1')
    })

    it('should disable refresh button during loading', async () => {
      mockRequirementsApiService.getLatestRequirements.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRequirementsDocument), 1000))
      )

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      const refreshBtn = wrapper.find('.refresh-btn')
      expect(refreshBtn.attributes('disabled')).toBeDefined()
      expect(refreshBtn.classes()).toContain('loading')
    })

    it('should update last updated time after successful refresh', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
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

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true,
          refreshInterval: 60000 // 1 minute for testing
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('should not setup auto-refresh when disabled', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()

      expect(setIntervalSpy).not.toHaveBeenCalled()
    })

    it('should cleanup auto-refresh timer on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should toggle auto-refresh when button is clicked', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true
        },
        global: {
          plugins: [mockRouter]
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

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: true,
          refreshInterval: 100 // Very short interval for testing
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Clear initial load calls
      vi.clearAllMocks()

      // Start manual refresh (make it hang)
      mockRequirementsApiService.getLatestRequirements.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      await nextTick()

      // Advance timer while manual refresh is in progress
      vi.advanceTimersByTime(200)
      await nextTick()

      // Should not make additional API calls during manual refresh
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledTimes(1)
    })
  })

  describe('No Data States', () => {
    it('should show no data state when no requirements are available', async () => {
      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(null as any)
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(null)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.find('.no-data-text').text()).toBe('No requirements data available')
      expect(wrapper.find('.no-data-subtitle').text()).toBe('Upload a requirements document or create requirements manually')
      expect(wrapper.find('.action-btn.primary').exists()).toBe(true)
      expect(wrapper.find('.action-btn.primary .action-text').text()).toBe('Create Requirements')
    })

    it('should show create requirements button in no data state', async () => {
      const pushSpy = vi.spyOn(mockRouter, 'push')
      
      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(null as any)
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(null)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Click create requirements button
      const createBtn = wrapper.find('.action-btn.primary')
      await createBtn.trigger('click')

      // Should navigate to requirements workspace
      expect(pushSpy).toHaveBeenCalledWith({
        name: 'project-workspace',
        params: { projectId: 'test-project-1' },
        query: { workspace: 'requirements' }
      })
    })
  })

  describe('Event Emissions', () => {
    it('should emit requirements-loaded event when data loads successfully', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit loaded event
      expect(wrapper.emitted('requirements-loaded')).toBeTruthy()
      expect(wrapper.emitted('requirements-loaded')?.[0]).toEqual([mockRequirementsDocument, mockRequirementsSummary])
    })

    it('should emit requirements-error event when loading fails', async () => {
      const errorMessage = 'Load failed'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should emit error event
      expect(wrapper.emitted('requirements-error')).toBeTruthy()
      expect(wrapper.emitted('requirements-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Progress Calculations', () => {
    it('should calculate progress percentages correctly', async () => {
      // Test with specific numbers for easy calculation
      const testSummary = {
        total: 20,
        accepted: 15,
        pending: 3,
        rejected: 2
      }
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(testSummary)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check progress percentage (15 accepted out of 20 total = 75%)
      const progressPercentage = wrapper.find('.progress-percentage')
      expect(progressPercentage.text()).toBe('75% Complete')

      // Check progress bar width
      const progressFill = wrapper.find('.progress-fill')
      expect(progressFill.attributes('style')).toContain('width: 75%')

      // Check breakdown percentages
      const breakdownItems = wrapper.findAll('.breakdown-item')
      
      const acceptedBreakdown = breakdownItems.find(item => item.classes().includes('accepted'))
      expect(acceptedBreakdown?.find('.breakdown-label').text()).toBe('Accepted (75%)')

      const pendingBreakdown = breakdownItems.find(item => item.classes().includes('pending'))
      expect(pendingBreakdown?.find('.breakdown-label').text()).toBe('Pending (15%)')

      const rejectedBreakdown = breakdownItems.find(item => item.classes().includes('rejected'))
      expect(rejectedBreakdown?.find('.breakdown-label').text()).toBe('Rejected (10%)')
    })

    it('should handle edge case with zero total requirements', async () => {
      const zeroSummary = {
        total: 0,
        accepted: 0,
        pending: 0,
        rejected: 0
      }
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(zeroSummary)

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should not show progress tracking for zero requirements
      expect(wrapper.find('.progress-tracking').exists()).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('should format date and time correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check that date formatting is working in document info
      const documentInfo = wrapper.find('.document-info')
      expect(documentInfo.text()).toMatch(/Jan \d+, 2024/)
    })

    it('should format relative time correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const updateText = wrapper.find('.update-text')
      expect(updateText.exists()).toBe(true)
      expect(updateText.text()).toMatch(/Last updated:/)
    })

    it('should capitalize status text correctly', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Published') // Should be capitalized

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('Published') // Should be capitalized
    })
  })

  describe('Prop Changes', () => {
    it('should reload data when projectId changes', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
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
      expect(mockRequirementsApiService.getLatestRequirements).toHaveBeenCalledWith('test-project-2')
      expect(mockRequirementsApiService.getRequirementItemsSummary).toHaveBeenCalledWith('test-project-2')
    })

    it('should update auto-refresh when prop changes', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
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

  describe('Responsive Design', () => {
    it('should render correctly on different screen sizes', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check that responsive classes are applied
      expect(wrapper.find('.metrics-grid').exists()).toBe(true)
      expect(wrapper.find('.actions-grid').exists()).toBe(true)
      expect(wrapper.find('.progress-breakdown').exists()).toBe(true)
    })
  })
})