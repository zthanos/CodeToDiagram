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

describe('RequirementsStatusSection - Core Functionality', () => {
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
      content: '# Requirements Document\n\nThis is a comprehensive requirements document.',
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
      rejected: 2
    }

    // Setup default successful API mocks
    mockRequirementsApiService.getLatestRequirements.mockResolvedValue(mockRequirementsDocument)
    mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(mockRequirementsSummary)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should render the section header correctly', () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: 'test-project-1',
          autoRefresh: false // Disable auto-refresh for simpler testing
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
          projectId: 'test-project-1',
          autoRefresh: false
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

    it('should not load data when projectId is missing', async () => {
      wrapper = mount(RequirementsStatusSection, {
        props: {
          projectId: '',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should not make API calls with empty project ID
      expect(mockRequirementsApiService.getLatestRequirements).not.toHaveBeenCalled()
      expect(mockRequirementsApiService.getRequirementItemsSummary).not.toHaveBeenCalled()
    })
  })

  describe('Data Loading and Display', () => {
    it('should display requirements document data correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

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
      expect(versionNumbers.length).toBeGreaterThan(0)
      expect(versionNumbers[0].text()).toBe('v2') // document version
    })

    it('should display requirements summary metrics correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

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
    })

    it('should display progress tracking correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

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
    })

    it('should display quick actions correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

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
      mockRequirementsApiService.getRequirementItemsSummary.mockRejectedValue(new Error('Summary error'))

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
      await new Promise(resolve => setTimeout(resolve, 10))

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
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should still show document data
      expect(wrapper.find('.status-card').exists()).toBe(true)
      expect(wrapper.find('.document-info').exists()).toBe(true)

      // Should not show summary metrics
      expect(wrapper.find('.summary-metrics').exists()).toBe(false)
    })

    it('should emit requirements-error event on error', async () => {
      const errorMessage = 'API Error'
      mockRequirementsApiService.getLatestRequirements.mockRejectedValue(new Error(errorMessage))
      mockRequirementsApiService.getRequirementItemsSummary.mockRejectedValue(new Error('Summary error'))

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
      await new Promise(resolve => setTimeout(resolve, 10))

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
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

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

    it('should emit navigate-to-requirements event', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

      // Click navigate button
      const navigateBtn = wrapper.find('.navigate-btn')
      await navigateBtn.trigger('click')

      // Should emit navigation event
      expect(wrapper.emitted('navigate-to-requirements')).toBeTruthy()
      expect(wrapper.emitted('navigate-to-requirements')?.[0]).toEqual([undefined])
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
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

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
          projectId: 'test-project-1',
          autoRefresh: false
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should show metrics with zero values
      const metricItems = wrapper.findAll('.metric-item')
      expect(metricItems.length).toBe(4)
      
      metricItems.forEach(item => {
        expect(item.find('.metric-value').text()).toBe('0')
      })

      // Should not show progress tracking for zero requirements
      expect(wrapper.find('.progress-tracking').exists()).toBe(false)
    })
  })

  describe('No Data States', () => {
    it('should show no data state when no requirements are available', async () => {
      mockRequirementsApiService.getLatestRequirements.mockResolvedValue(null as any)
      mockRequirementsApiService.getRequirementItemsSummary.mockResolvedValue(null)

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
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check if no-data state is shown
      expect(wrapper.find('.no-data').exists()).toBe(true)
      
      // Check for the create requirements button
      const createBtn = wrapper.find('.action-btn.primary')
      expect(createBtn.exists()).toBe(true)
    })
  })

  describe('Event Emissions', () => {
    it('should emit requirements-loaded event when data loads successfully', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should emit loaded event
      expect(wrapper.emitted('requirements-loaded')).toBeTruthy()
      expect(wrapper.emitted('requirements-loaded')?.[0]).toEqual([mockRequirementsDocument, mockRequirementsSummary])
    })
  })

  describe('Utility Functions', () => {
    it('should capitalize status text correctly', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

      const statusValue = wrapper.find('.status-value')
      expect(statusValue.text()).toBe('Published') // Should be capitalized

      const statusBadge = wrapper.find('.status-badge')
      expect(statusBadge.text()).toBe('Published') // Should be capitalized
    })
  })

  describe('Responsive Design', () => {
    it('should render correctly on different screen sizes', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 10))

      // Check that responsive classes are applied
      expect(wrapper.find('.metrics-grid').exists()).toBe(true)
      expect(wrapper.find('.actions-grid').exists()).toBe(true)
      expect(wrapper.find('.progress-breakdown').exists()).toBe(true)
    })
  })
})