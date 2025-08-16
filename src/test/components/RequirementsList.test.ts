import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsList from '../../components/RequirementsList.vue'
import type { RequirementItem } from '../../types/requirements'

// Mock the composables
vi.mock('../../composables/useAdvancedSearch', () => ({
  useAdvancedSearch: () => ({
    searchConfig: { value: { query: '', caseSensitive: false, wholeWords: false, fuzzySearch: false } },
    filterConfig: { value: { requirements: { status: 'all', priority: 'all', source: 'all' } } },
    isSearching: { value: false },
    searchResults: { value: [] },
    searchHistory: { value: ['previous search', 'another search'] },
    hasActiveFilters: { value: false },
    hasActiveSearch: { value: false },
    performSearch: vi.fn().mockResolvedValue([]),
    applyFilters: vi.fn().mockReturnValue([]),
    updateSearchConfig: vi.fn(),
    updateFilterConfig: vi.fn(),
    resetSearch: vi.fn(),
    resetFilters: vi.fn(),
    highlightMatch: vi.fn().mockReturnValue('highlighted text')
  })
}))

vi.mock('../../services/SearchService', () => ({
  default: {
    getInstance: () => ({
      exactSearch: vi.fn().mockReturnValue([]),
      fuzzySearch: vi.fn().mockReturnValue([]),
      regexSearch: vi.fn().mockReturnValue([]),
      multiTermSearch: vi.fn().mockReturnValue([]),
      getSearchSuggestions: vi.fn().mockReturnValue(['suggestion1', 'suggestion2'])
    })
  }
}))

// Sample test data
const sampleRequirements: RequirementItem[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure user login and registration functionality',
    status: 'new',
    priority: 'high',
    project_id: 'project-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    source: 'manual'
  },
  {
    id: '2',
    title: 'Payment Processing',
    description: 'Integrate payment gateway for secure transactions',
    status: 'accepted',
    priority: 'critical',
    project_id: 'project-1',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
    source: 'pdf'
  },
  {
    id: '3',
    title: 'User Profile Management',
    description: 'Allow users to manage their profile information',
    status: 'rejected',
    priority: 'medium',
    project_id: 'project-1',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
    source: 'manual'
  }
]

describe('RequirementsList', () => {
  let wrapper: VueWrapper<any>

  const createWrapper = (props = {}) => {
    return mount(RequirementsList, {
      props: {
        items: sampleRequirements,
        filter: 'all',
        searchQuery: '',
        readonly: false,
        ...props
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('component initialization', () => {
    it('should render with default props', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('[data-testid="requirements-list"]').exists()).toBe(true)
    })

    it('should display correct number of items', () => {
      wrapper = createWrapper()
      const summary = wrapper.find('[data-testid="requirements-summary"]')
      expect(summary.text()).toContain('Showing 3 of 3 requirements')
    })

    it('should initialize with provided props', () => {
      wrapper = createWrapper({
        filter: 'new',
        searchQuery: 'test query',
        readonly: true
      })

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]')
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      const addButton = wrapper.find('[data-testid="add-requirement-btn"]')

      expect(filterSelect.element.value).toBe('new')
      expect(searchInput.element.value).toBe('test query')
      expect(addButton.element.disabled).toBe(true)
    })
  })

  describe('search functionality', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should render search input with correct placeholder', () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      expect(searchInput.attributes('placeholder')).toBe('Search requirements...')
    })

    it('should emit search-change event on input', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('test query')
      await searchInput.trigger('input')

      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change')[0]).toEqual(['test query'])
    })

    it('should show search mode toggle button', () => {
      const searchModeToggle = wrapper.find('[data-testid="search-mode-toggle"]')
      expect(searchModeToggle.exists()).toBe(true)
      expect(searchModeToggle.text()).toBe('🔍')
    })

    it('should toggle search mode when clicked', async () => {
      const searchModeToggle = wrapper.find('[data-testid="search-mode-toggle"]')
      await searchModeToggle.trigger('click')

      // Should cycle through search modes
      expect(searchModeToggle.text()).toBe('🔍~') // fuzzy mode
    })

    it('should show clear search button when query exists', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('test')

      await nextTick()
      const clearButton = wrapper.find('[data-testid="clear-search"]')
      expect(clearButton.exists()).toBe(true)
    })

    it('should clear search when clear button is clicked', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('test')
      await nextTick()

      const clearButton = wrapper.find('[data-testid="clear-search"]')
      await clearButton.trigger('click')

      expect(searchInput.element.value).toBe('')
      expect(wrapper.emitted('search-change')).toBeTruthy()
    })

    it('should show search suggestions on focus', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('te')
      await searchInput.trigger('focus')
      await nextTick()

      const suggestions = wrapper.find('[data-testid="search-suggestions"]')
      expect(suggestions.exists()).toBe(true)
    })

    it('should handle keyboard navigation in suggestions', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('te')
      await searchInput.trigger('focus')
      await nextTick()

      // Arrow down should select first suggestion
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      const firstSuggestion = wrapper.find('[data-testid="search-suggestion-0"]')
      expect(firstSuggestion.classes()).toContain('active')

      // Enter should select the suggestion
      await searchInput.trigger('keydown', { key: 'Enter' })
      // Should emit search-change with selected suggestion
      expect(wrapper.emitted('search-change')).toBeTruthy()
    })
  })

  describe('filtering functionality', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should render all filter dropdowns', () => {
      expect(wrapper.find('[data-testid="requirements-filter"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="priority-filter"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="source-filter"]').exists()).toBe(true)
    })

    it('should emit filter-change event when status filter changes', async () => {
      const filterSelect = wrapper.find('[data-testid="requirements-filter"]')
      await filterSelect.setValue('new')
      await filterSelect.trigger('change')

      expect(wrapper.emitted('filter-change')).toBeTruthy()
      expect(wrapper.emitted('filter-change')[0]).toEqual(['new'])
    })

    it('should emit advanced-filter-change event with all filter values', async () => {
      const priorityFilter = wrapper.find('[data-testid="priority-filter"]')
      await priorityFilter.setValue('high')
      await priorityFilter.trigger('change')

      expect(wrapper.emitted('advanced-filter-change')).toBeTruthy()
      const emittedFilter = wrapper.emitted('advanced-filter-change')[0][0]
      expect(emittedFilter.priority).toBe('high')
    })

    it('should show advanced filters panel when toggle is clicked', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      const advancedPanel = wrapper.find('[data-testid="advanced-filters-panel"]')
      expect(advancedPanel.exists()).toBe(true)
    })

    it('should render date range inputs in advanced filters', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      expect(wrapper.find('[data-testid="date-range-start"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="date-range-end"]').exists()).toBe(true)
    })

    it('should render search option checkboxes', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      expect(wrapper.find('[data-testid="case-sensitive"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="whole-words"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="fuzzy-search"]').exists()).toBe(true)
    })

    it('should clear all filters when clear all button is clicked', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      const clearAllButton = wrapper.find('[data-testid="clear-all-filters"]')
      await clearAllButton.trigger('click')

      // Should reset all filter values
      expect(wrapper.find('[data-testid="requirements-filter"]').element.value).toBe('all')
      expect(wrapper.find('[data-testid="priority-filter"]').element.value).toBe('all')
      expect(wrapper.find('[data-testid="source-filter"]').element.value).toBe('all')
    })

    it('should save filter preset when save button is clicked', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      // Set some filter values
      const priorityFilter = wrapper.find('[data-testid="priority-filter"]')
      await priorityFilter.setValue('high')

      const saveButton = wrapper.find('[data-testid="save-filter-preset"]')
      await saveButton.trigger('click')

      // Should show success feedback
      await nextTick()
      const successMessage = wrapper.find('[data-testid="filter-save-success"]')
      expect(successMessage.exists()).toBe(true)
      expect(successMessage.text()).toContain('saved successfully')
    })

    it('should load filter preset when load button is clicked', async () => {
      // Mock localStorage with a saved preset
      const mockPreset = {
        status: 'accepted',
        priority: 'high',
        source: 'pdf',
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        searchOptions: { caseSensitive: true, wholeWords: false, fuzzySearch: true, mode: 'fuzzy' }
      }
      
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
      getItemSpy.mockReturnValue(JSON.stringify(mockPreset))

      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      const loadButton = wrapper.find('[data-testid="load-filter-preset"]')
      await loadButton.trigger('click')

      // Should apply the preset values
      expect(wrapper.find('[data-testid="requirements-filter"]').element.value).toBe('accepted')
      expect(wrapper.find('[data-testid="priority-filter"]').element.value).toBe('high')
      expect(wrapper.find('[data-testid="source-filter"]').element.value).toBe('pdf')

      getItemSpy.mockRestore()
    })

    it('should handle localStorage errors when saving presets', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      const saveButton = wrapper.find('[data-testid="save-filter-preset"]')
      await saveButton.trigger('click')

      // Should show error feedback
      await nextTick()
      const errorMessage = wrapper.find('[data-testid="filter-save-error"]')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Failed to save')

      setItemSpy.mockRestore()
    })
  })

  describe('item selection and bulk operations', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should show select all checkbox when items are visible', () => {
      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]')
      expect(selectAllCheckbox.exists()).toBe(true)
    })

    it('should show individual item checkboxes', () => {
      const itemCheckboxes = wrapper.findAll('[data-testid^="requirement-checkbox-"]')
      expect(itemCheckboxes).toHaveLength(3)
    })

    it('should show bulk actions when items are selected', async () => {
      const firstCheckbox = wrapper.find('[data-testid="requirement-checkbox-1"]')
      await firstCheckbox.setChecked(true)

      await nextTick()
      const bulkActions = wrapper.find('[data-testid="bulk-actions"]')
      expect(bulkActions.exists()).toBe(true)
      expect(bulkActions.text()).toContain('1 item selected')
    })

    it('should show bulk status change dialog', async () => {
      const firstCheckbox = wrapper.find('[data-testid="requirement-checkbox-1"]')
      await firstCheckbox.setChecked(true)
      await nextTick()

      const bulkStatusButton = wrapper.find('[data-testid="bulk-status-btn"]')
      await bulkStatusButton.trigger('click')

      const bulkStatusDialog = wrapper.find('[data-testid="bulk-status-dialog"]')
      expect(bulkStatusDialog.exists()).toBe(true)
    })

    it('should handle bulk delete with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const firstCheckbox = wrapper.find('[data-testid="requirement-checkbox-1"]')
      await firstCheckbox.setChecked(true)
      await nextTick()

      const bulkDeleteButton = wrapper.find('[data-testid="bulk-delete-btn"]')
      await bulkDeleteButton.trigger('click')

      expect(confirmSpy).toHaveBeenCalled()
      expect(wrapper.emitted('item-delete')).toBeTruthy()

      confirmSpy.mockRestore()
    })

    it('should clear selection when clear selection button is clicked', async () => {
      const firstCheckbox = wrapper.find('[data-testid="requirement-checkbox-1"]')
      await firstCheckbox.setChecked(true)
      await nextTick()

      const clearSelectionButton = wrapper.find('[data-testid="clear-selection-btn"]')
      await clearSelectionButton.trigger('click')

      await nextTick()
      const bulkActions = wrapper.find('[data-testid="bulk-actions"]')
      expect(bulkActions.exists()).toBe(false)
    })
  })

  describe('virtual scrolling', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should render scroll container', () => {
      const scrollContainer = wrapper.find('[data-testid="requirements-scroll-container"]')
      expect(scrollContainer.exists()).toBe(true)
    })

    it('should handle scroll events', async () => {
      const scrollContainer = wrapper.find('[data-testid="requirements-scroll-container"]')
      await scrollContainer.trigger('scroll')

      // Should not throw errors
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('empty state', () => {
    it('should show empty state when no items', () => {
      wrapper = createWrapper({ items: [] })
      
      const emptyState = wrapper.find('[data-testid="requirements-empty"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No requirements yet')
    })

    it('should show no matching results when filtered', () => {
      wrapper = createWrapper({ items: [], searchQuery: 'nonexistent' })
      
      const emptyState = wrapper.find('[data-testid="requirements-empty"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No matching requirements')
    })

    it('should show add first requirement button in empty state', () => {
      wrapper = createWrapper({ items: [] })
      
      const addButton = wrapper.find('[data-testid="empty-add-btn"]')
      expect(addButton.exists()).toBe(true)
    })
  })

  describe('accessibility', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should have proper ARIA labels', () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      const filterSelect = wrapper.find('[data-testid="requirements-filter"]')
      const addButton = wrapper.find('[data-testid="add-requirement-btn"]')

      expect(searchInput.attributes('aria-label')).toBe('Search requirements')
      expect(filterSelect.attributes('aria-label')).toBe('Filter requirements by status')
      expect(addButton.attributes('aria-label')).toBe('Add new requirement')
    })

    it('should have proper role attributes', () => {
      const list = wrapper.find('[data-testid="requirements-list"]')
      expect(list.attributes('role')).toBe('region')
      expect(list.attributes('aria-label')).toBe('Requirements list')
    })

    it('should support keyboard navigation', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      
      // Should handle escape key
      await searchInput.trigger('keydown', { key: 'Escape' })
      expect(wrapper.exists()).toBe(true) // Should not throw
    })
  })

  describe('responsive design', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should handle window resize events', async () => {
      // Simulate window resize
      window.dispatchEvent(new Event('resize'))
      await nextTick()

      expect(wrapper.exists()).toBe(true) // Should not throw
    })
  })

  describe('event emissions', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should emit item-create event when add button is clicked', async () => {
      const addButton = wrapper.find('[data-testid="add-requirement-btn"]')
      await addButton.trigger('click')

      expect(wrapper.emitted('item-create')).toBeTruthy()
      const emittedItem = wrapper.emitted('item-create')[0][0]
      expect(emittedItem.title).toBe('')
      expect(emittedItem.status).toBe('new')
      expect(emittedItem.source).toBe('manual')
    })

    it('should emit advanced-filter-change with complete filter state', async () => {
      const priorityFilter = wrapper.find('[data-testid="priority-filter"]')
      await priorityFilter.setValue('high')
      await priorityFilter.trigger('change')

      expect(wrapper.emitted('advanced-filter-change')).toBeTruthy()
      const filterState = wrapper.emitted('advanced-filter-change')[0][0]
      expect(filterState).toHaveProperty('status')
      expect(filterState).toHaveProperty('priority')
      expect(filterState).toHaveProperty('source')
    })
  })

  describe('error handling', () => {
    it('should handle null/undefined items gracefully', () => {
      wrapper = createWrapper({ items: null })
      expect(wrapper.exists()).toBe(true)
      
      const summary = wrapper.find('[data-testid="requirements-summary"]')
      expect(summary.text()).toContain('Showing 0 of 0 requirements')
    })

    it('should handle invalid filter values gracefully', async () => {
      wrapper = createWrapper({ filter: 'invalid' as any })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('real-time filtering', () => {
    beforeEach(() => {
      wrapper = createWrapper()
    })

    it('should emit advanced-filter-change on search mode changes', async () => {
      const searchModeToggle = wrapper.find('[data-testid="search-mode-toggle"]')
      await searchModeToggle.trigger('click')

      // Should emit advanced filter change with search options
      expect(wrapper.emitted('advanced-filter-change')).toBeTruthy()
      const emittedFilter = wrapper.emitted('advanced-filter-change')[0][0]
      expect(emittedFilter).toHaveProperty('searchOptions')
    })

    it('should emit advanced-filter-change on search option changes', async () => {
      const advancedToggle = wrapper.find('[data-testid="advanced-filters-toggle"]')
      await advancedToggle.trigger('click')

      const caseSensitiveCheckbox = wrapper.find('[data-testid="case-sensitive"]')
      await caseSensitiveCheckbox.setChecked(true)

      expect(wrapper.emitted('advanced-filter-change')).toBeTruthy()
      const emittedFilter = wrapper.emitted('advanced-filter-change')[0][0]
      expect(emittedFilter.searchOptions.caseSensitive).toBe(true)
    })

    it('should update filters in real-time when search query changes', async () => {
      const searchInput = wrapper.find('[data-testid="requirements-search"]')
      await searchInput.setValue('test query')
      await searchInput.trigger('input')

      // Should trigger real-time filter update
      expect(wrapper.emitted('advanced-filter-change')).toBeTruthy()
    })

    it('should maintain filter state across search mode changes', async () => {
      // Set initial filters
      const priorityFilter = wrapper.find('[data-testid="priority-filter"]')
      await priorityFilter.setValue('high')

      // Change search mode
      const searchModeToggle = wrapper.find('[data-testid="search-mode-toggle"]')
      await searchModeToggle.trigger('click')

      // Filter state should be maintained
      expect(priorityFilter.element.value).toBe('high')
    })
  })

  describe('performance', () => {
    it('should debounce search input', async () => {
      wrapper = createWrapper()
      const searchInput = wrapper.find('[data-testid="requirements-search"]')

      // Rapid typing should not trigger multiple immediate searches
      await searchInput.setValue('a')
      await searchInput.setValue('ab')
      await searchInput.setValue('abc')

      // Should only emit the final value after debounce
      expect(wrapper.emitted('search-change')).toBeTruthy()
    })

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        title: `Requirement ${i}`,
        description: `Description for requirement ${i}`,
        status: 'new' as const,
        priority: 'medium' as const,
        project_id: 'project-1',
        created_at: new Date(),
        updated_at: new Date(),
        source: 'manual' as const
      }))

      wrapper = createWrapper({ items: largeDataset })
      
      // Should render without performance issues
      expect(wrapper.exists()).toBe(true)
      const summary = wrapper.find('[data-testid="requirements-summary"]')
      expect(summary.text()).toContain('Showing 1000 of 1000 requirements')
    })
  })
})