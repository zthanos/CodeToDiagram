import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import ADRsSection from '../../components/ADRsSection.vue'
import { ADRApiService } from '../../services/ADRApiService'
import type { ADR } from '../../types/adr'

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

describe('ADRsSection - Basic Functionality', () => {
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
        context: 'We need to choose a frontend framework for our new web application.',
        decision: 'We will use React as our primary frontend framework.',
        consequences: 'This decision will allow us to leverage existing team knowledge.',
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
        context: 'Our monolithic application is becoming difficult to maintain.',
        decision: 'We propose adopting a microservices architecture.',
        consequences: 'This will require significant refactoring but will provide better scalability.',
        author: 'Solution Architect',
        created_at: new Date('2024-01-10T14:20:00Z'),
        updated_at: new Date('2024-01-10T14:20:00Z'),
        tags: ['architecture', 'microservices'],
        supersedes: []
      }
    ]

    // Setup default successful API mocks
    mockADRApiService.listADRs.mockResolvedValue(mockADRs)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
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
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not make API calls with empty project ID
      expect(mockADRApiService.listADRs).not.toHaveBeenCalled()
    })
  })

  describe('Data Display', () => {
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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Check summary card
      const summaryCard = wrapper.find('.summary-card')
      expect(summaryCard.exists()).toBe(true)
      expect(summaryCard.find('.card-title').text()).toBe('ADRs Summary')

      // Check summary badge
      const summaryBadge = wrapper.find('.summary-badge')
      expect(summaryBadge.text()).toBe('2 of 2 ADRs')

      // Check summary stats
      const statItems = wrapper.findAll('.stat-item')
      expect(statItems[0].find('.stat-value').text()).toBe('2') // Total
      expect(statItems[0].find('.stat-label').text()).toBe('Total')
      expect(statItems[1].find('.stat-value').text()).toBe('1') // Accepted
      expect(statItems[1].find('.stat-label').text()).toBe('Accepted')
      expect(statItems[2].find('.stat-value').text()).toBe('1') // Proposed
      expect(statItems[2].find('.stat-label').text()).toBe('Proposed')
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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Check ADRs list card
      const listCard = wrapper.find('.adrs-list-card')
      expect(listCard.exists()).toBe(true)
      expect(listCard.find('.card-title').text()).toBe('Recent ADRs')

      // Check ADR items (should be sorted by date desc)
      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(2)

      // Check first ADR item (most recent)
      const firstADR = adrItems[0]
      expect(firstADR.find('.adr-title').text()).toBe('Use React for Frontend Framework')
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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')

      // Check accepted status
      const acceptedADR = adrItems.find(item => item.text().includes('Use React for Frontend Framework'))
      expect(acceptedADR?.find('.adr-status').classes()).toContain('accepted')

      // Check proposed status
      const proposedADR = adrItems.find(item => item.text().includes('Adopt Microservices Architecture'))
      expect(proposedADR?.find('.adr-status').classes()).toContain('proposed')
    })
  })

  describe('Search Functionality', () => {
    it('should show search controls when ADRs are available', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      expect(wrapper.find('.controls-section').exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
      expect(wrapper.find('.search-input').attributes('placeholder')).toBe('Search ADRs by title, content, or author...')
    })

    it('should filter ADRs by search query', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

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
      expect(summaryBadge.text()).toBe('1 of 2 ADRs')
    })

    it('should show clear search button when searching', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

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
      expect(wrapper.findAll('.adr-item').length).toBe(2)
    })
  })

  describe('Filter Functionality', () => {
    it('should show filter controls', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      expect(wrapper.find('.filter-controls').exists()).toBe(true)
      expect(wrapper.findAll('.filter-select').length).toBe(2) // Status and Author filters
    })

    it('should filter by status', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const statusSelect = wrapper.findAll('.filter-select')[0] // First select is status
      await statusSelect.setValue('accepted')
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')
      expect(adrItems.length).toBe(1) // Only accepted ADRs
      
      adrItems.forEach(item => {
        expect(item.find('.adr-status').classes()).toContain('accepted')
      })

      // Summary should update
      const summaryBadge = wrapper.find('.summary-badge')
      expect(summaryBadge.text()).toBe('1 of 2 ADRs')
    })
  })

  describe('Navigation Functionality', () => {
    it('should navigate to ADR workspace when view all button is clicked', async () => {
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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const viewAllBtn = wrapper.find('.view-all-btn')
      await viewAllBtn.trigger('click')

      expect(routerPushSpy).toHaveBeenCalledWith({
        name: 'adr-workspace',
        params: { projectId: 'test-project-1' }
      })
    })

    it('should emit adr-selected event when ADR is clicked', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const firstADR = wrapper.find('.adr-item')
      await firstADR.trigger('click')

      expect(wrapper.emitted('adr-selected')).toBeTruthy()
      expect(wrapper.emitted('adr-selected')?.[0]).toEqual([mockADRs[0]])
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
      // Wait for API call to reject
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Should show error state
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBe('Failed to Load ADRs')
      expect(wrapper.find('.error-message').text()).toBe(errorMessage)
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
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
      // Wait for API call to reject
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Should emit error event
      expect(wrapper.emitted('adrs-error')).toBeTruthy()
      expect(wrapper.emitted('adrs-error')?.[0]).toEqual([errorMessage])
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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.find('.no-data-text').text()).toBe('No ADRs created yet')
      expect(wrapper.find('.no-data-subtitle').text()).toBe('Create your first architectural decision record')
      expect(wrapper.find('.create-adr-btn').exists()).toBe(true)
    })
  })

  describe('API Integration', () => {
    it('should call API with correct parameters', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify API calls were made
      expect(mockADRApiService.listADRs).toHaveBeenCalledWith('test-project-1', {
        sortBy: 'created_at',
        sortOrder: 'desc',
        limit: 50
      })
    })

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
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      // Should emit loaded event
      expect(wrapper.emitted('adrs-loaded')).toBeTruthy()
      expect(wrapper.emitted('adrs-loaded')?.[0]).toEqual([mockADRs])
    })
  })

  describe('Utility Functions', () => {
    it('should format dates correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')
      const dateText = adrItems[0].find('.adr-date').text()
      
      // Should format as "Jan 15, 2024"
      expect(dateText).toMatch(/Jan \d+, 2024/)
    })

    it('should capitalize status text correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const adrItems = wrapper.findAll('.adr-item')
      
      // Check different status capitalizations
      const acceptedStatus = adrItems.find(item => item.text().includes('Use React'))?.find('.adr-status')
      expect(acceptedStatus?.text()).toBe('Accepted')
      
      const proposedStatus = adrItems.find(item => item.text().includes('Microservices'))?.find('.adr-status')
      expect(proposedStatus?.text()).toBe('Proposed')
    })

    it('should handle tag display correctly', async () => {
      wrapper = mount(ADRsSection, {
        props: {
          projectId: 'test-project-1'
        },
        global: {
          plugins: [mockRouter]
        }
      })

      await nextTick()
      // Wait for API call to resolve
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()

      const firstADR = wrapper.findAll('.adr-item')[0]
      const tags = firstADR.findAll('.adr-tag')
      
      expect(tags.length).toBe(3)
      expect(tags[0].text()).toBe('frontend')
      expect(tags[1].text()).toBe('framework')
      expect(tags[2].text()).toBe('react')
    })
  })
})