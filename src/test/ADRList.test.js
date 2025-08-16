// src/test/ADRList.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ADRList from '../components/ADRList.vue';

// Mock the composables
vi.mock('../composables/useADRSearch', () => ({
  useADRSearch: () => ({
    applyFilters: vi.fn((adrs) => adrs),
    sortADRs: vi.fn((adrs) => adrs),
    highlightMatch: vi.fn((text) => text),
    searchConfig: { value: {} },
    filterConfig: { value: {} },
    updateSearchConfig: vi.fn(),
    updateFilterConfig: vi.fn()
  })
}));

describe('ADRList', () => {
  let wrapper;

  const mockADRs = [
    {
      id: 'adr-1',
      project_id: 'project-123',
      title: 'Use React for Frontend',
      status: 'accepted',
      context: 'We need to choose a frontend framework for our application. The team has experience with React.',
      decision: 'We will use React as our primary frontend framework.',
      consequences: 'This will provide better developer experience and community support.',
      alternatives: 'Vue.js and Angular were also considered.',
      author: 'John Doe',
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
      tags: ['frontend', 'framework'],
      superseded_by: undefined,
      supersedes: []
    },
    {
      id: 'adr-2',
      project_id: 'project-123',
      title: 'Use PostgreSQL for Database',
      status: 'proposed',
      context: 'We need to choose a database for our application. We need ACID compliance.',
      decision: 'We will use PostgreSQL as our primary database.',
      consequences: 'This will provide reliability and strong consistency.',
      alternatives: 'MySQL and MongoDB were also considered.',
      author: 'Jane Smith',
      created_at: new Date('2025-01-02'),
      updated_at: new Date('2025-01-02'),
      tags: ['database', 'backend'],
      superseded_by: undefined,
      supersedes: []
    },
    {
      id: 'adr-3',
      project_id: 'project-123',
      title: 'Use REST API Architecture',
      status: 'deprecated',
      context: 'We needed to define our API architecture.',
      decision: 'We used REST API architecture.',
      consequences: 'Simple to implement but limited flexibility.',
      alternatives: 'GraphQL was considered.',
      author: 'Bob Johnson',
      created_at: new Date('2025-01-03'),
      updated_at: new Date('2025-01-03'),
      tags: ['api', 'architecture'],
      superseded_by: 'adr-4',
      supersedes: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should render ADR cards correctly', () => {
      const cards = wrapper.findAll('.adr-card');
      expect(cards).toHaveLength(3);
    });

    it('should display ADR information correctly', () => {
      const firstCard = wrapper.find('.adr-card');
      
      expect(firstCard.find('.card-title').text()).toBe('Use React for Frontend');
      expect(firstCard.find('.card-status').text()).toBe('ACCEPTED');
      expect(firstCard.find('.card-author').text()).toBe('John Doe');
      expect(firstCard.find('.card-content').text()).toContain('We need to choose a frontend framework');
    });

    it('should display tags correctly', () => {
      const firstCard = wrapper.find('.adr-card');
      const tags = firstCard.findAll('.tag');
      
      expect(tags).toHaveLength(2);
      expect(tags[0].text()).toBe('frontend');
      expect(tags[1].text()).toBe('framework');
    });

    it('should show correct status styling', () => {
      const cards = wrapper.findAll('.adr-card');
      
      expect(cards[0].find('.card-status').classes()).toContain('status-accepted');
      expect(cards[1].find('.card-status').classes()).toContain('status-proposed');
      expect(cards[2].find('.card-status').classes()).toContain('status-deprecated');
    });

    it('should truncate long text content', () => {
      const firstCard = wrapper.find('.adr-card');
      const contextText = firstCard.find('.card-section p').text();
      
      // Should be truncated if longer than 150 characters
      expect(contextText.length).toBeLessThanOrEqual(153); // 150 + "..."
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no ADRs', () => {
      wrapper = mount(ADRList, {
        props: {
          adrs: []
        }
      });

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-state h3').text()).toBe('No ADRs Found');
      expect(wrapper.find('.empty-state .btn-primary').text()).toBe('Create First ADR');
    });

    it('should show loading state', () => {
      wrapper = mount(ADRList, {
        props: {
          adrs: []
        }
      });

      wrapper.vm.isLoading = true;

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.find('.loading-state p').text()).toBe('Loading ADRs...');
    });

    it('should show different empty message when filters are active', async () => {
      wrapper = mount(ADRList, {
        props: {
          adrs: [],
          searchQuery: 'test search'
        }
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.find('.empty-state p').text()).toContain('Try adjusting your search or filters');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should emit search change event', async () => {
      const searchInput = wrapper.find('.search-input');
      await searchInput.setValue('database');
      await searchInput.trigger('input');

      expect(wrapper.emitted('search-change')).toBeTruthy();
      expect(wrapper.emitted('search-change')[0][0]).toBe('database');
    });

    it('should show clear search button when search has value', async () => {
      await wrapper.setData({ localSearchQuery: 'test' });
      
      expect(wrapper.find('.search-clear').exists()).toBe(true);
    });

    it('should clear search when clear button is clicked', async () => {
      await wrapper.setData({ localSearchQuery: 'test' });
      await wrapper.find('.search-clear').trigger('click');

      expect(wrapper.vm.localSearchQuery).toBe('');
      expect(wrapper.emitted('search-change')).toBeTruthy();
    });

    it('should filter ADRs based on search query', async () => {
      await wrapper.setData({ localSearchQuery: 'database' });
      
      // The filtering is done by the parent component, but we test the computed property
      expect(wrapper.vm.hasActiveSearch).toBe(true);
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should emit filter change event when status filter changes', async () => {
      const statusFilter = wrapper.find('#status-filter');
      await statusFilter.setValue('accepted');
      await statusFilter.trigger('change');

      expect(wrapper.emitted('filter-change')).toBeTruthy();
      expect(wrapper.emitted('filter-change')[0][0]).toMatchObject({
        status: 'accepted'
      });
    });

    it('should show clear filters button when filters are active', async () => {
      await wrapper.setData({ localStatusFilter: 'accepted' });
      
      expect(wrapper.find('.clear-filters').exists()).toBe(true);
    });

    it('should clear all filters when clear button is clicked', async () => {
      await wrapper.setData({ 
        localStatusFilter: 'accepted',
        localTagFilter: ['frontend']
      });
      
      await wrapper.find('.clear-filters').trigger('click');

      expect(wrapper.vm.localStatusFilter).toBe('all');
      expect(wrapper.vm.localTagFilter).toEqual([]);
      expect(wrapper.emitted('filter-change')).toBeTruthy();
    });

    it('should update sort order', async () => {
      const sortBySelect = wrapper.find('#sort-by');
      await sortBySelect.setValue('title');
      await sortBySelect.trigger('change');

      expect(wrapper.vm.sortBy).toBe('title');
    });

    it('should update sort direction', async () => {
      const sortOrderSelect = wrapper.find('#sort-order');
      await sortOrderSelect.setValue('asc');
      await sortOrderSelect.trigger('change');

      expect(wrapper.vm.sortOrder).toBe('asc');
    });
  });

  describe('Card Interactions', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should emit adr-select event when card is clicked', async () => {
      const firstCard = wrapper.find('.adr-card');
      await firstCard.trigger('click');

      expect(wrapper.emitted('adr-select')).toBeTruthy();
      expect(wrapper.emitted('adr-select')[0][0]).toEqual(mockADRs[0]);
    });

    it('should emit adr-edit event when edit button is clicked', async () => {
      const editButton = wrapper.find('.adr-card .btn-secondary');
      await editButton.trigger('click');

      expect(wrapper.emitted('adr-edit')).toBeTruthy();
      expect(wrapper.emitted('adr-edit')[0][0]).toEqual(mockADRs[0]);
    });

    it('should emit adr-delete event when delete button is clicked', async () => {
      const deleteButton = wrapper.find('.adr-card .btn-danger');
      await deleteButton.trigger('click');

      expect(wrapper.emitted('adr-delete')).toBeTruthy();
      expect(wrapper.emitted('adr-delete')[0][0]).toBe(mockADRs[0].id);
    });

    it('should emit adr-create event when create button is clicked', async () => {
      const createButton = wrapper.find('.btn-primary');
      await createButton.trigger('click');

      expect(wrapper.emitted('adr-create')).toBeTruthy();
    });

    it('should prevent card click when action buttons are clicked', async () => {
      const editButton = wrapper.find('.adr-card .btn-secondary');
      const clickEvent = { stopPropagation: vi.fn() };
      
      await editButton.trigger('click', clickEvent);

      // The event should have stopPropagation called to prevent card selection
      // This is tested by checking that adr-select is not emitted when edit is clicked
      expect(wrapper.emitted('adr-select')).toBeFalsy();
    });
  });

  describe('Pagination', () => {
    const manyADRs = Array.from({ length: 25 }, (_, i) => ({
      ...mockADRs[0],
      id: `adr-${i + 1}`,
      title: `ADR ${i + 1}`
    }));

    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: manyADRs
        }
      });
    });

    it('should show pagination when there are many ADRs', () => {
      expect(wrapper.find('.pagination').exists()).toBe(true);
    });

    it('should calculate total pages correctly', () => {
      // 25 ADRs with 12 per page = 3 pages
      expect(wrapper.vm.totalPages).toBe(3);
    });

    it('should show correct number of ADRs per page', () => {
      const cards = wrapper.findAll('.adr-card');
      expect(cards.length).toBeLessThanOrEqual(12);
    });

    it('should navigate to next page', async () => {
      const nextButton = wrapper.find('.pagination .btn-secondary:last-child');
      await nextButton.trigger('click');

      expect(wrapper.vm.currentPage).toBe(2);
    });

    it('should navigate to previous page', async () => {
      // Go to page 2 first
      wrapper.vm.currentPage = 2;
      await wrapper.vm.$nextTick();

      const prevButton = wrapper.find('.pagination .btn-secondary:first-child');
      await prevButton.trigger('click');

      expect(wrapper.vm.currentPage).toBe(1);
    });

    it('should navigate to specific page', async () => {
      const pageButton = wrapper.find('.page-button:nth-child(2)');
      await pageButton.trigger('click');

      expect(wrapper.vm.currentPage).toBe(2);
    });

    it('should disable previous button on first page', () => {
      const prevButton = wrapper.find('.pagination .btn-secondary:first-child');
      expect(prevButton.element.disabled).toBe(true);
    });

    it('should disable next button on last page', async () => {
      wrapper.vm.currentPage = wrapper.vm.totalPages;
      await wrapper.vm.$nextTick();

      const nextButton = wrapper.find('.pagination .btn-secondary:last-child');
      expect(nextButton.element.disabled).toBe(true);
    });
  });

  describe('Readonly Mode', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs,
          readonly: true
        }
      });
    });

    it('should hide delete buttons in readonly mode', () => {
      expect(wrapper.findAll('.btn-danger')).toHaveLength(0);
    });

    it('should still show edit buttons in readonly mode', () => {
      // Edit buttons should still be visible for viewing
      expect(wrapper.findAll('.btn-secondary')).toHaveLength(3);
    });
  });

  describe('Tag Display', () => {
    const adrWithManyTags = {
      ...mockADRs[0],
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
    };

    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: [adrWithManyTags]
        }
      });
    });

    it('should show only first 3 tags', () => {
      const tags = wrapper.findAll('.tag');
      expect(tags).toHaveLength(3);
    });

    it('should show "more" indicator when there are more than 3 tags', () => {
      const moreIndicator = wrapper.find('.tag-more');
      expect(moreIndicator.exists()).toBe(true);
      expect(moreIndicator.text()).toBe('+2 more');
    });
  });

  describe('Date Formatting', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should format dates correctly', () => {
      const dateText = wrapper.find('.card-date').text();
      expect(dateText).toMatch(/Jan \d{1,2}, 2025/);
    });
  });

  describe('Prop Watching', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs,
          searchQuery: '',
          statusFilter: 'all'
        }
      });
    });

    it('should update local search query when prop changes', async () => {
      await wrapper.setProps({ searchQuery: 'new search' });
      expect(wrapper.vm.localSearchQuery).toBe('new search');
    });

    it('should update local status filter when prop changes', async () => {
      await wrapper.setProps({ statusFilter: 'accepted' });
      expect(wrapper.vm.localStatusFilter).toBe('accepted');
    });

    it('should reset page when filters change', async () => {
      wrapper.vm.currentPage = 2;
      await wrapper.setData({ localSearchQuery: 'test' });
      
      expect(wrapper.vm.currentPage).toBe(1);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      wrapper = mount(ADRList, {
        props: {
          adrs: mockADRs
        }
      });
    });

    it('should truncate text correctly', () => {
      const longText = 'a'.repeat(200);
      const truncated = wrapper.vm.truncateText(longText, 150);
      
      expect(truncated).toBe('a'.repeat(150) + '...');
    });

    it('should not truncate short text', () => {
      const shortText = 'short text';
      const result = wrapper.vm.truncateText(shortText, 150);
      
      expect(result).toBe(shortText);
    });

    it('should format dates correctly', () => {
      const date = new Date('2025-01-15');
      const formatted = wrapper.vm.formatDate(date);
      
      expect(formatted).toBe('Jan 15, 2025');
    });
  });
});