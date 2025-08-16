import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ADRsSection from '../../components/ADRsSection.vue'
import { ADRApiService } from '../../services/ADRApiService'
import type { ADR, ADRListOptions } from '../../types/adr'

// Mock the API service
vi.mock('../../services/ADRApiService')
const mockADRApiService = vi.mocked(ADRApiService)

// Mock router
const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/adr-workspace/:projectId', name: 'adr-workspace', component: { template: '<div>ADR Workspace</div>' } }
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

describe('ADRsSection', () => {
  let wrapper: VueWrapper<any>
  let mockADRs: ADR[]

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock ADRs data
    mockADRs = [
      {
        id: 'adr-1',
        project_id: 'test-project-1',
        title: 'Use React for Frontend Framework',
        status: 'accepted',
        context: 'We need to choose a frontend framework for our new web application. The team has experience with multiple frameworks.',
        decision: 'We will use React as our primary frontend framework due to its large ecosystem and team expertise.',
        consequences: 'This decision will allow us to leverage existing team knowledge and access to a vast library ecosystem.',
        alternatives: 'We also considered Vue.js and Angular as alternatives.',
        author: 'Tech Lead',
        created_at: new Date('2024-01-15T10:30:00Z'),
        updated_at: new Date('2024-01-15T10:30:00Z'),
        tags: ['frontend', 'framework', 'react'],
        supersedes: []
      },
      {
        id: 'adr-2',
        project_id: 'test-project-1',
        title: 'Adopt Microservices Architecture',
        status: 'proposed',
        context: 'Our monolithic application is becoming difficult to maintain and scale. We need to consider architectural alternatives.',
        decision: 'We propose adopting a microservices architecture to improve scalability and maintainability.',
        consequences: 'This will require significant refactoring but will provide better scalability and team autonomy.',
        author: 'Solution Architect',
        created_at: new Date('2024-01-10T14:20:00Z'),
        updated_at: new Date('2024-01-10T14:20:00Z'),
        tags: ['architecture', 'microservices', 'scalability'],
        supersedes: []
      },
      {
        id: 'adr-3',
        project_id: 'test-project-1',
        title: 'Use PostgreSQL as Primary Database',
        status: 'accepted',
        context: 'We need to select a primary database for our application that can handle our expected load and data requirements.',
        decision: 'We will use PostgreSQL as our primary database due to its reliability and feature set.',
        consequences: 'This provides us with ACID compliance and advanced features like JSON support.',
        author: 'Database Architect',
        created_at: new Date('2024-01-05T09:15:00Z'),
        updated_at: new Date('2024-01-05T09:15:00Z'),
        tags: ['database', 'postgresql', 'storage'],
        supersedes: []
      },
      {
        id: 'adr-4',
        project_id: 'test-project-1',
        title: 'Deprecated jQuery Usage',
        status: 'deprecated',
        context: 'We previously used jQuery for DOM manipulation but modern frameworks provide better alternatives.',
        decision: 'We are deprecating the use of jQuery in favor of modern framework approaches.',
        consequences: 'This will require refactoring existing jQuery code but will improve maintainability.',
        author: 'Frontend Lead',
        created_at: new Date('2024-01-01T08:00:00Z'),
        updated_at: new Date('2024-01-01T08:00:00Z'),
        tags: ['frontend', 'jquery', 'deprecated'],
        superseded_by: 'adr-1',
        supersedes: []
      }
    ]

    // Setup default successful API mocks
    mockADRApiService.listADRs.mockResolvedValue(mockADRs)

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
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.find('.section-title').text()).toBe('📚 Architectural Decision Records')
      expect(wrapper.find('.refresh-btn').exists()).toBe(true)
      expect(wrapper.find('.view-all-btn').exists()).toBe(true)
    })

    it('should show loading state initially', async () => {
      // Make API calls hang to test loading state
      mockADRApiService.listADRs.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.find('.loading-title').text()).toBe('Loading ADRs')
      expect(wrapper.find('.loading-subtitle').text()).toBe('Fetching architectural decision records...')
    })

    it('should load ADRs data on mount', async () => {
      wrapper = mount(ADRsSection, {
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
      expect(mockADRApiService.listADRs).toHaveBeenCalledWith('test-project-1', {
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: 50
      })
    })

    it('should not load data when projectId is missing', async () => {
      wrapper = mount(ADRsSection, {
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
      expect(mockADRApiService.listADRs).not.toHaveBeenCalled()
    })
  })

  describe('Data Loading and Display', () => {
    it('should display ADRs summary correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check summary card
      const summaryCard = wrapper.find('.summary-card')
      expect(summaryCard.exists()).toBe(true)
      expect(summaryCard.find('.card-title').text()).toBe('ADRs Summary')

      // Check summary badge
      const summaryBadge = wrapper.find('.summary-badge')
      expect(summaryBadge.text()).toBe('4 of 4 ADRs')

      // Check summary stats
      const statItems = wrapper.findAll('.stat-item')
      expect(statItems[0].find('.stat-value').text()).toBe('4') // Total
      expect(statItems[0].find('.stat-label').text()).toBe('Total')
      expect(statItems[1].find('.stat-value').text()).toBe('2') // Accepted
      expect(statItems[1].find('.stat-label').text()).toBe('Accepted')
      expect(statItems[2].find('.stat-value').text()).toBe('1') // Proposed
      expect(statItems[2].find('.stat-label').text()).toBe('Proposed')
      expect(statItems[3].find('.stat-value').text()).toBe('1') // Deprecated
      expect(statItems[3].find('.stat-label').text()).toBe('Deprecated')
    })

    it('should display ADRs list correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Check ADRs list card
      const listCard = wrapper.find('.adrs-list-card')
      expect(listCard.exists()).toBe(true)
      expect(listCard.find('.card-title').text()).toBe('Recent ADRs')

      // Check ADR items (should be sorted by date desc)
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(4)

      // Check first ADR item (most recent)
      const firstADR = adrItems[0]
      expect(firstADR.find('.adr-title').text()).toBe('Use React for Frontend Framework')
      expect(firstADR.find('.adr-id').text()).toBe('ADR-dr-1')
      expect(firstADR.find('.adr-author').text()).toBe('by Tech Lead')
      expect(firstADR.find('.adr-status').text()).toBe('Accepted')
      expect(firstADR.find('.adr-status').classes()).toContain('accepted')

      // Check ADR content sections
      expect(firstADR.find('.adr-context').exists()).toBe(true)
      expect(firstADR.find('.adr-decision').exists()).toBe(true)
      expect(firstADR.find('.adr-context').text()).toContain('We need to choose a frontend framework')
      expect(firstADR.find('.adr-decision').text()).toContain('We will use React as our primary frontend framework')

      // Check tags
      const tags = firstADR.findAll('.adr-tag')
      expect(tags.length).toBe(3)
      expect(tags[0].text()).toBe('frontend')
      expect(tags[1].text()).toBe('framework')
      expect(tags[2].text()).toBe('react')
    })

    it('should handle different ADR statuses correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const adrItems = wrapper.findAll('.adr-item')

      // Check accepted status
      const acceptedADR = adrItems.find(item => item.text().includes('Use React for Frontend Framework'))
      expect(acceptedADR?.find('.adr-status').classes()).toContain('accepted')

      // Check proposed status
      const proposedADR = adrItems.find(item => item.text().includes('Adopt Microservices Architecture'))
      expect(proposedADR?.find('.adr-status').classes()).toContain('proposed')

      // Check deprecated status
      const deprecatedADR = adrItems.find(item => item.text().includes('Deprecated jQuery Usage'))
      expect(deprecatedADR?.find('.adr-status').classes()).toContain('deprecated')
    })

    it('should truncate long content correctly', async () => {
      const longContextADR = {
        ...mockADRs[0],
        context: 'A'.repeat(200) + ' This should be truncated',
        decision: 'B'.repeat(200) + ' This should also be truncated'
      }
      
      mockADRApiService.listADRs.mockResolvedValue([longContextADR])

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const adrItem = wrapper.find('.adr-item')
      const contextText = adrItem.find('.adr-context').text()
      const decisionText = adrItem.find('.adr-decision').text()

      // Should be truncated to 150 chars + '...'
      expect(contextText.length).toBeLessThanOrEqual(170) // Context: + 150 + ...
      expect(decisionText.length).toBeLessThanOrEqual(170) // Decision: + 150 + ...
      expect(contextText).toMatch(/\.\.\./)
      expect(decisionText).toMatch(/\.\.\./)
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()
    })

    it('should show search controls when ADRs are available', () => {
      expect(wrapper.find('.controls-section').exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
      expect(wrapper.find('.search-input').attributes('placeholder')).toBe('Search ADRs by title, content, or author...')
    })

    it('should filter ADRs by search query', async () => {
      // Search for "React"
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('React')
      await nextTick()

      // Should show only React-related ADR
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-title').text()).toBe('Use React for Frontend Framework')

      // Summary should update
      const summaryBadge = wrapper.find('.summary-badge')
      expect(summaryBadge.text()).toBe('1 of 4 ADRs')
    })

    it('should search across multiple fields', async () => {
      const searchInput = wrapper.find('.search-input')

      // Search by author
      await searchInput.setValue('Solution Architect')
      await nextTick()

      let adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-title').text()).toBe('Adopt Microservices Architecture')

      // Search by tag
      await searchInput.setValue('database')
      await nextTick()

      adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-title').text()).toBe('Use PostgreSQL as Primary Database')

      // Search by content
      await searchInput.setValue('microservices')
      await nextTick()

      adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-title').text()).toBe('Adopt Microservices Architecture')
    })

    it('should highlight search matches', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('React')
      await nextTick()

      const adrItem = wrapper.find('.adr-item')
      expect(adrItem.classes()).toContain('highlighted')

      // Check that search highlighting is applied (using v-html)
      const titleElement = adrItem.find('.adr-title')
      expect(titleElement.element.innerHTML).toContain('<mark class="search-highlight">React</mark>')
    })

    it('should show clear search button when searching', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('React')
      await nextTick()

      const clearBtn = wrapper.find('.clear-search-btn')
      expect(clearBtn.exists()).toBe(true)

      // Click clear button
      await clearBtn.trigger('click')
      await nextTick()

      // Should clear search
      expect(searchInput.element.value).toBe('')
      expect(wrapper.findAll('.adr-item').length).toBe(4)
    })

    it('should show no results state when search has no matches', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('nonexistent')
      await nextTick()

      expect(wrapper.find('.no-results').exists()).toBe(true)
      expect(wrapper.find('.no-results-text').text()).toBe('No ADRs match your search criteria')
      expect(wrapper.find('.clear-filters-btn').exists()).toBe(true)
    })

    it('should debounce search input', async () => {
      const searchInput = wrapper.find('.search-input')
      
      // Trigger multiple rapid inputs
      await searchInput.setValue('R')
      await searchInput.setValue('Re')
      await searchInput.setValue('Rea')
      await searchInput.setValue('React')
      
      // Should not filter immediately
      expect(wrapper.findAll('.adr-item').length).toBe(4)
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350))
      await nextTick()
      
      // Should filter after debounce
      expect(wrapper.findAll('.adr-item').length).toBe(1)
    })
  })

  describe('Filter Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()
    })

    it('should show filter controls', () => {
      expect(wrapper.find('.filter-controls').exists()).toBe(true)
      expect(wrapper.findAll('.filter-select').length).toBe(2) // Status and Author filters
    })

    it('should populate author filter options', () => {
      const authorSelect = wrapper.findAll('.filter-select')[1] // Second select is author
      const options = authorSelect.findAll('option')
      
      expect(options.length).toBe(5) // "All Authors" + 4 unique authors
      expect(options[0].text()).toBe('All Authors')
      expect(options[1].text()).toBe('Database Architect')
      expect(options[2].text()).toBe('Frontend Lead')
      expect(options[3].text()).toBe('Solution Architect')
      expect(options[4].text()).toBe('Tech Lead')
    })

    it('should filter by status', async () => {
      const statusSelect = wrapper.findAll('.filter-select')[0] // First select is status
      await statusSelect.setValue('accepted')
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(2) // Only accepted ADRs
      
      adrItems.forEach(item => {
        expect(item.find('.adr-status').classes()).toContain('accepted')
      })

      // Summary should update
      const summaryBadge = wrapper.find('.summary-badge')
      expect(summaryBadge.text()).toBe('2 of 4 ADRs')
    })

    it('should filter by author', async () => {
      const authorSelect = wrapper.findAll('.filter-select')[1] // Second select is author
      await authorSelect.setValue('Tech Lead')
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-author').text()).toBe('by Tech Lead')
    })

    it('should combine search and filters', async () => {
      // Apply status filter
      const statusSelect = wrapper.findAll('.filter-select')[0]
      await statusSelect.setValue('accepted')
      await nextTick()

      // Apply search
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('React')
      await nextTick()

      // Should show only accepted ADRs that match "React"
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1)
      expect(adrItems[0].find('.adr-title').text()).toBe('Use React for Frontend Framework')
      expect(adrItems[0].find('.adr-status').classes()).toContain('accepted')
    })

    it('should show clear filters button when filters are active', async () => {
      const statusSelect = wrapper.findAll('.filter-select')[0]
      await statusSelect.setValue('accepted')
      await nextTick()

      expect(wrapper.find('.clear-filters-btn').exists()).toBe(true)

      // Click clear filters
      await wrapper.find('.clear-filters-btn').trigger('click')
      await nextTick()

      // Should reset filters
      expect(statusSelect.element.value).toBe('')
      expect(wrapper.findAll('.adr-item').length).toBe(4)
    })
  })

  describe('Sorting Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()
    })

    it('should sort ADRs by date descending by default', () => {
      const adrItems = wrapper.findAll('.adr-item')
      
      // Should be sorted by created_at desc
      expect(adrItems[0].find('.adr-title').text()).toBe('Use React for Frontend Framework') // 2024-01-15
      expect(adrItems[1].find('.adr-title').text()).toBe('Adopt Microservices Architecture') // 2024-01-10
      expect(adrItems[2].find('.adr-title').text()).toBe('Use PostgreSQL as Primary Database') // 2024-01-05
      expect(adrItems[3].find('.adr-title').text()).toBe('Deprecated jQuery Usage') // 2024-01-01
    })

    it('should toggle sort order when sort button is clicked', async () => {
      const sortBtn = wrapper.find('.sort-btn')
      expect(sortBtn.text()).toBe('📅↓') // Descending

      // Click to change to ascending
      await sortBtn.trigger('click')
      await nextTick()

      expect(sortBtn.text()).toBe('📅↑') // Ascending

      // Check order is reversed
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems[0].find('.adr-title').text()).toBe('Deprecated jQuery Usage') // 2024-01-01
      expect(adrItems[3].find('.adr-title').text()).toBe('Use React for Frontend Framework') // 2024-01-15
    })
  })

  describe('Navigation Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()
    })

    it('should navigate to ADR workspace when view all button is clicked', async () => {
      const routerPushSpy = vi.spyOn(mockRouter, 'push').mockResolvedValue()

      const viewAllBtn = wrapper.find('.view-all-btn')
      await viewAllBtn.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({
        name: 'adr-workspace',
        params: { projectId: 'test-project-1' }
      })
    })

    it('should navigate to ADR workspace with specific ADR when ADR is clicked', async () => {
      const routerPushSpy = vi.spyOn(mockRouter, 'push').mockResolvedValue()

      const firstADR = wrapper.find('.adr-item')
      await firstADR.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({
        name: 'adr-workspace',
        params: { projectId: 'test-project-1' },
        query: { adr: 'adr-1' }
      })
    })

    it('should emit adr-selected event when ADR is clicked', async () => {
      const firstADR = wrapper.find('.adr-item')
      await firstADR.trigger('click')

      expect(wrapper.emitted('adr-selected')).toBeTruthy()
      expect(wrapper.emitted('adr-selected')?.[0]).toEqual([mockADRs[0]])
    })

    it('should emit navigate-to-workspace event when navigation occurs', async () => {
      const viewAllBtn = wrapper.find('.view-all-btn')
      await viewAllBtn.trigger('click')

      expect(wrapper.emitted('navigate-to-workspace')).toBeTruthy()
    })

    it('should handle navigation errors gracefully', async () => {
      const routerPushSpy = vi.spyOn(mockRouter, 'push').mockRejectedValue(new Error('Navigation failed'))

      const viewAllBtn = wrapper.find('.view-all-btn')
      await viewAllBtn.trigger('click')

      // Should still emit the event even if navigation fails
      expect(wrapper.emitted('navigate-to-workspace')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle ADRs loading error', async () => {
      const errorMessage = 'Failed to load ADRs'
      mockADRApiService.listADRs.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.find('.error-title').text()).toBe('Failed to Load ADRs')
      expect(wrapper.find('.error-message').text()).toBe(errorMessage)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })

    it('should provide retry functionality', async () => {
      const errorMessage = 'Network error'
      mockADRApiService.listADRs.mockRejectedValueOnce(new Error(errorMessage))
      mockADRApiService.listADRs.mockResolvedValueOnce(mockADRs)

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.find('.summary-card').exists()).toBe(true)
      expect(wrapper.find('.adrs-list-card').exists()).toBe(true)
      expect(mockADRApiService.listADRs).toHaveBeenCalledTimes(2)
    })

    it('should track retry count and show retry info', async () => {
      const errorMessage = 'Persistent error'
      mockADRApiService.listADRs.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Click retry button
      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')
      await nextTick()
      await advanceTimersAndWait()

      // Should show retry info
      expect(wrapper.find('.retry-info').exists()).toBe(true)
      expect(wrapper.find('.retry-info').text()).toBe('Retry attempt 1/3')
    })

    it('should emit adrs-error event on error', async () => {
      const errorMessage = 'API Error'
      mockADRApiService.listADRs.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.emitted('adrs-error')).toBeTruthy()
      expect(wrapper.emitted('adrs-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Loading States', () => {
    it('should show loading state during data fetch', async () => {
      // Make API calls hang to test loading states
      mockADRApiService.listADRs.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.find('.loading-title').text()).toBe('Loading ADRs')
    })

    it('should show loading state on refresh button during refresh', async () => {
      wrapper = mount(ADRsSection, {
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
      mockADRApiService.listADRs.mockImplementation(
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

  describe('Empty States', () => {
    it('should show empty state when no ADRs exist', async () => {
      mockADRApiService.listADRs.mockResolvedValue([])

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.find('.no-data-text').text()).toBe('No ADRs created yet')
      expect(wrapper.find('.no-data-subtitle').text()).toBe('Create your first architectural decision record')
      expect(wrapper.find('.create-adr-btn').exists()).toBe(true)
    })

    it('should navigate to ADR workspace when create button is clicked', async () => {
      mockADRApiService.listADRs.mockResolvedValue([])
      const routerPushSpy = vi.spyOn(mockRouter, 'push').mockResolvedValue()

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const createBtn = wrapper.find('.create-adr-btn')
      await createBtn.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({
        name: 'adr-workspace',
        params: { projectId: 'test-project-1' }
      })
    })
  })

  describe('Show More/Less Functionality', () => {
    it('should show limited ADRs by default', async () => {
      // Create more ADRs to test pagination
      const manyADRs = Array.from({ length: 10 }, (_, i) => ({
        ...mockADRs[0],
        id: `adr-${i + 1}`,
        title: `ADR ${i + 1}`,
        created_at: new Date(2024, 0, i + 1)
      }))

      mockADRApiService.listADRs.mockResolvedValue(manyADRs)

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1',
          maxDisplayed: 5
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Should show only first 5 ADRs by default
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(5)

      // Should show "Show More" button
      const showMoreBtn = wrapper.find('.show-more-btn')
      expect(showMoreBtn.exists()).toBe(true)
      expect(showMoreBtn.text()).toBe('Show 5 More ADRs')
    })

    it('should expand/collapse ADRs list', async () => {
      // Create more ADRs to test pagination
      const manyADRs = Array.from({ length: 8 }, (_, i) => ({
        ...mockADRs[0],
        id: `adr-${i + 1}`,
        title: `ADR ${i + 1}`,
        created_at: new Date(2024, 0, i + 1)
      }))

      mockADRApiService.listADRs.mockResolvedValue(manyADRs)

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1',
          maxDisplayed: 5
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      // Initially shows 5 ADRs
      expect(wrapper.findAll('.adr-item').length).toBe(5)

      // Click "Show More"
      const showMoreBtn = wrapper.find('.show-more-btn')
      await showMoreBtn.trigger('click')
      await nextTick()

      // Should show all ADRs
      expect(wrapper.findAll('.adr-item').length).toBe(8)
      expect(showMoreBtn.text()).toBe('Show Less')

      // Click "Show Less"
      await showMoreBtn.trigger('click')
      await nextTick()

      // Should show limited ADRs again
      expect(wrapper.findAll('.adr-item').length).toBe(5)
      expect(showMoreBtn.text()).toBe('Show 3 More ADRs')
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('should setup auto-refresh timer by default', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(ADRsSection, {
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

      wrapper = mount(ADRsSection, {
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

      wrapper = mount(ADRsSection, {
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
      wrapper = mount(ADRsSection, {
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
  })

  describe('Event Emissions', () => {
    it('should emit adrs-loaded event when data loads successfully', async () => {
      wrapper = mount(ADRsSection, {
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
      expect(wrapper.emitted('adrs-loaded')).toBeTruthy()
      expect(wrapper.emitted('adrs-loaded')?.[0]).toEqual([mockADRs])
    })

    it('should emit adrs-error event when loading fails', async () => {
      const errorMessage = 'Load failed'
      mockADRApiService.listADRs.mockRejectedValue(new Error(errorMessage))

      wrapper = mount(ADRsSection, {
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
      expect(wrapper.emitted('adrs-error')).toBeTruthy()
      expect(wrapper.emitted('adrs-error')?.[0]).toEqual([errorMessage])
    })
  })

  describe('Prop Changes', () => {
    it('should reload data when projectId changes', async () => {
      wrapper = mount(ADRsSection, {
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
      expect(mockADRApiService.listADRs).toHaveBeenCalledWith('test-project-2', {
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: 50
      })
    })

    it('should update auto-refresh when prop changes', async () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      wrapper = mount(ADRsSection, {
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

  describe('Utility Functions', () => {
    beforeEach(async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()
    })

    it('should format dates correctly', () => {
      const adrItems = wrapper.findAll('.adr-item')
      const dateText = adrItems[0].find('.adr-date').text()
      
      // Should format as "Jan 15, 2024"
      expect(dateText).toMatch(/Jan \d+, 2024/)
    })

    it('should capitalize status text correctly', () => {
      const adrItems = wrapper.findAll('.adr-item')
      
      // Check different status capitalizations
      const acceptedStatus = adrItems.find(item => item.text().includes('Use React'))?.find('.adr-status')
      expect(acceptedStatus?.text()).toBe('Accepted')
      
      const proposedStatus = adrItems.find(item => item.text().includes('Microservices'))?.find('.adr-status')
      expect(proposedStatus?.text()).toBe('Proposed')
      
      const deprecatedStatus = adrItems.find(item => item.text().includes('jQuery'))?.find('.adr-status')
      expect(deprecatedStatus?.text()).toBe('Deprecated')
    })

    it('should handle tag display correctly', () => {
      const firstADR = wrapper.findAll('.adr-item')[0]
      const tags = firstADR.findAll('.adr-tag')
      
      expect(tags.length).toBe(3)
      expect(tags[0].text()).toBe('frontend')
      expect(tags[1].text()).toBe('framework')
      expect(tags[2].text()).toBe('react')
    })

    it('should show "more tags" indicator when there are many tags', async () => {
      const manyTagsADR = {
        ...mockADRs[0],
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
      }
      
      mockADRApiService.listADRs.mockResolvedValue([manyTagsADR])

      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      await advanceTimersAndWait()

      const adrItem = wrapper.find('.adr-item')
      const tags = adrItem.findAll('.adr-tag')
      const moreTags = adrItem.find('.more-tags')
      
      expect(tags.length).toBe(3) // Should show only first 3
      expect(moreTags.exists()).toBe(true)
      expect(moreTags.text()).toBe('+3 more')
    })
  })
})