/**
 * RequirementsList component test suite
 * Tests container component functionality including filtering, search, bulk operations, virtual scrolling, and accessibility
 * Requirements: 2.1, 2.2, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RequirementsList from '../components/RequirementsList.vue';
import RequirementItem from '../components/RequirementItem.vue';

// Mock the RequirementItem component to avoid complex nested testing
vi.mock('../components/RequirementItem.vue', () => ({
  default: {
    name: 'RequirementItem',
    props: ['requirement', 'readonly'],
    emits: ['update', 'delete', 'status-change'],
    template: `
      <div 
        :data-testid="'mock-requirement-item-' + requirement.id"
        class="mock-requirement-item"
      >
        <div class="mock-title">{{ requirement.title }}</div>
        <div class="mock-description">{{ requirement.description }}</div>
        <div class="mock-status">{{ requirement.status }}</div>
        <button 
          @click="$emit('update', requirement)"
          :data-testid="'mock-update-' + requirement.id"
        >
          Update
        </button>
        <button 
          @click="$emit('delete', requirement.id)"
          :data-testid="'mock-delete-' + requirement.id"
        >
          Delete
        </button>
        <button 
          @click="$emit('status-change', requirement.id, 'accepted')"
          :data-testid="'mock-status-change-' + requirement.id"
        >
          Change Status
        </button>
      </div>
    `
  }
}));

describe('RequirementsList', () => {
  let wrapper;
  
  const mockRequirements = [
    {
      id: 'req-1',
      title: 'First Requirement',
      description: 'This is the first requirement',
      status: 'new',
      created_at: new Date('2024-01-01T10:00:00Z'),
      updated_at: new Date('2024-01-02T15:30:00Z'),
      source: 'manual'
    },
    {
      id: 'req-2',
      title: 'Second Requirement',
      description: 'This is the second requirement',
      status: 'accepted',
      created_at: new Date('2024-01-01T11:00:00Z'),
      updated_at: new Date('2024-01-02T16:30:00Z'),
      source: 'pdf'
    },
    {
      id: 'req-3',
      title: 'Third Requirement',
      description: 'This is the third requirement',
      status: 'rejected',
      created_at: new Date('2024-01-01T12:00:00Z'),
      updated_at: new Date('2024-01-02T17:30:00Z'),
      source: 'manual'
    },
    {
      id: 'req-4',
      title: 'Fourth Requirement',
      description: 'This is the fourth requirement with search term',
      status: 'new',
      created_at: new Date('2024-01-01T13:00:00Z'),
      updated_at: new Date('2024-01-02T18:30:00Z'),
      source: 'manual'
    }
  ];

  const defaultProps = {
    items: mockRequirements,
    filter: 'all',
    searchQuery: '',
    readonly: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for bulk delete tests
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render requirements list with all items', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="requirements-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 4 of 4 requirements');
      
      // Check that all requirement items are rendered
      expect(wrapper.findAll('.mock-requirement-item')).toHaveLength(4);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-3"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-4"]').exists()).toBe(true);
    });

    it('should render header controls', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="requirements-search"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-filter"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="add-requirement-btn"]').exists()).toBe(true);
    });

    it('should render virtual scrolling container', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="requirements-scroll-container"]').exists()).toBe(true);
    });

    it('should render select all checkbox when items are visible', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="select-all-container"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="select-all-checkbox"]').exists()).toBe(true);
    });

    it('should render selection checkboxes for each item', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="requirement-checkbox-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirement-checkbox-req-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirement-checkbox-req-3"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirement-checkbox-req-4"]').exists()).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    it('should filter items based on search query in title', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('First');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-2"]').exists()).toBe(false);
    });

    it('should filter items based on search query in description', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('search term');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-4"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(false);
    });

    it('should be case insensitive', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('FIRST');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(true);
    });

    it('should emit search-change event when search input changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('test query');

      expect(wrapper.emitted('search-change')).toBeTruthy();
      expect(wrapper.emitted('search-change')[0]).toEqual(['test query']);
    });

    it('should clear selection when search changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item first
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);

      // Change search
      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('test');

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });

    it('should handle empty search results', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('nonexistent');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 0 of 4 requirements');
      expect(wrapper.find('[data-testid="requirements-empty"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-empty"]').text()).toContain('No matching requirements');
    });
  });

  describe('Filter Functionality', () => {
    it('should filter items by status', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('new');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 2 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-4"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-2"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-3"]').exists()).toBe(false);
    });

    it('should filter items by accepted status', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('accepted');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-2"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(false);
    });

    it('should filter items by rejected status', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('rejected');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-3"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(false);
    });

    it('should show all items when filter is "all"', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('all');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 4 of 4 requirements');
      expect(wrapper.findAll('.mock-requirement-item')).toHaveLength(4);
    });

    it('should emit filter-change event when filter changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('accepted');

      expect(wrapper.emitted('filter-change')).toBeTruthy();
      expect(wrapper.emitted('filter-change')[0]).toEqual(['accepted']);
    });

    it('should clear selection when filter changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item first
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);

      // Change filter
      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('accepted');

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });
  });

  describe('Combined Search and Filter', () => {
    it('should apply both search and filter together', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Apply filter first
      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      await filterSelect.setValue('new');

      // Then apply search
      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('First');

      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1 of 4 requirements');
      expect(wrapper.find('[data-testid="mock-requirement-item-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="mock-requirement-item-req-4"]').exists()).toBe(false);
    });
  });

  describe('Add New Requirement', () => {
    it('should emit item-create when add button is clicked', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const addButton = wrapper.find('[data-testid="add-requirement-btn"]');
      await addButton.trigger('click');

      expect(wrapper.emitted('item-create')).toBeTruthy();
      expect(wrapper.emitted('item-create')[0][0]).toEqual({
        title: '',
        description: '',
        status: 'new',
        source: 'manual'
      });
    });

    it('should disable add button when readonly', () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      const addButton = wrapper.find('[data-testid="add-requirement-btn"]');
      expect(addButton.element.disabled).toBe(true);
    });
  });

  describe('Item Selection', () => {
    it('should select individual items', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-actions"]').text()).toContain('1 item selected');
    });

    it('should select multiple items', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const checkbox1 = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      const checkbox2 = wrapper.find('[data-testid="requirement-checkbox-req-2"]');
      
      await checkbox1.setChecked(true);
      await checkbox2.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-actions"]').text()).toContain('2 items selected');
    });

    it('should deselect items', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);
      await checkbox.setChecked(false);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });

    it('should select all visible items', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]');
      await selectAllCheckbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-actions"]').text()).toContain('4 items selected');
    });

    it('should deselect all visible items', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select all first
      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]');
      await selectAllCheckbox.setChecked(true);
      
      // Then deselect all
      await selectAllCheckbox.setChecked(false);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });

    it('should show indeterminate state when some items are selected', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]');
      expect(selectAllCheckbox.element.indeterminate).toBe(true);
    });

    it('should clear selection when clear button is clicked', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item first
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      // Clear selection
      const clearButton = wrapper.find('[data-testid="clear-selection-btn"]');
      await clearButton.trigger('click');

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should show bulk actions when items are selected', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-status-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-delete-btn"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="clear-selection-btn"]').exists()).toBe(true);
    });

    it('should hide bulk actions when no items are selected', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false);
    });

    it('should show bulk status change dialog', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      // Click bulk status button
      const bulkStatusButton = wrapper.find('[data-testid="bulk-status-btn"]');
      await bulkStatusButton.trigger('click');

      expect(wrapper.find('[data-testid="bulk-status-dialog"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="bulk-status-select"]').exists()).toBe(true);
    });

    it('should apply bulk status change', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select items
      const checkbox1 = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      const checkbox2 = wrapper.find('[data-testid="requirement-checkbox-req-2"]');
      await checkbox1.setChecked(true);
      await checkbox2.setChecked(true);

      // Open bulk status dialog
      const bulkStatusButton = wrapper.find('[data-testid="bulk-status-btn"]');
      await bulkStatusButton.trigger('click');

      // Select new status
      const statusSelect = wrapper.find('[data-testid="bulk-status-select"]');
      await statusSelect.setValue('accepted');

      // Confirm change
      const confirmButton = wrapper.find('[data-testid="bulk-status-confirm"]');
      await confirmButton.trigger('click');

      expect(wrapper.emitted('item-update')).toBeTruthy();
      expect(wrapper.emitted('item-update')).toHaveLength(2); // Two items updated
      expect(wrapper.find('[data-testid="bulk-status-dialog"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false); // Selection cleared
    });

    it('should cancel bulk status change', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      // Open bulk status dialog
      const bulkStatusButton = wrapper.find('[data-testid="bulk-status-btn"]');
      await bulkStatusButton.trigger('click');

      // Cancel
      const cancelButton = wrapper.find('[data-testid="bulk-status-cancel"]');
      await cancelButton.trigger('click');

      expect(wrapper.find('[data-testid="bulk-status-dialog"]').exists()).toBe(false);
      expect(wrapper.emitted('item-update')).toBeFalsy();
      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true); // Selection preserved
    });

    it('should perform bulk delete with confirmation', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select items
      const checkbox1 = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      const checkbox2 = wrapper.find('[data-testid="requirement-checkbox-req-2"]');
      await checkbox1.setChecked(true);
      await checkbox2.setChecked(true);

      // Click bulk delete
      const bulkDeleteButton = wrapper.find('[data-testid="bulk-delete-btn"]');
      await bulkDeleteButton.trigger('click');

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete 2 requirements?');
      expect(wrapper.emitted('item-delete')).toBeTruthy();
      expect(wrapper.emitted('item-delete')).toHaveLength(2);
      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(false); // Selection cleared
    });

    it('should cancel bulk delete when user cancels confirmation', async () => {
      global.confirm = vi.fn(() => false);
      
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      // Click bulk delete
      const bulkDeleteButton = wrapper.find('[data-testid="bulk-delete-btn"]');
      await bulkDeleteButton.trigger('click');

      expect(global.confirm).toHaveBeenCalled();
      expect(wrapper.emitted('item-delete')).toBeFalsy();
      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true); // Selection preserved
    });
  });

  describe('Item Events', () => {
    it('should handle item update events', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const updateButton = wrapper.find('[data-testid="mock-update-req-1"]');
      await updateButton.trigger('click');

      expect(wrapper.emitted('item-update')).toBeTruthy();
      expect(wrapper.emitted('item-update')[0][0]).toEqual(mockRequirements[0]);
    });

    it('should handle item delete events', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const deleteButton = wrapper.find('[data-testid="mock-delete-req-1"]');
      await deleteButton.trigger('click');

      expect(wrapper.emitted('item-delete')).toBeTruthy();
      expect(wrapper.emitted('item-delete')[0]).toEqual(['req-1']);
    });

    it('should handle item status change events', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const statusButton = wrapper.find('[data-testid="mock-status-change-req-1"]');
      await statusButton.trigger('click');

      expect(wrapper.emitted('item-update')).toBeTruthy();
      const updatedItem = wrapper.emitted('item-update')[0][0];
      expect(updatedItem.status).toBe('accepted');
      expect(updatedItem.updated_at).toBeInstanceOf(Date);
    });

    it('should remove deleted item from selection', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      expect(wrapper.find('[data-testid="bulk-actions"]').exists()).toBe(true);

      // Delete the item
      const deleteButton = wrapper.find('[data-testid="mock-delete-req-1"]');
      await deleteButton.trigger('click');

      // Selection should be cleared for that item
      expect(wrapper.vm.selectedItems.has('req-1')).toBe(false);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no items exist', () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          items: []
        }
      });

      expect(wrapper.find('[data-testid="requirements-empty"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-empty"]').text()).toContain('No requirements yet');
      expect(wrapper.find('[data-testid="empty-add-btn"]').exists()).toBe(true);
    });

    it('should show filtered empty state when no items match filter', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      await searchInput.setValue('nonexistent');

      expect(wrapper.find('[data-testid="requirements-empty"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-empty"]').text()).toContain('No matching requirements');
      expect(wrapper.find('[data-testid="empty-add-btn"]').exists()).toBe(false);
    });

    it('should handle add requirement from empty state', async () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          items: []
        }
      });

      const emptyAddButton = wrapper.find('[data-testid="empty-add-btn"]');
      await emptyAddButton.trigger('click');

      expect(wrapper.emitted('item-create')).toBeTruthy();
    });

    it('should not show add button in empty state when readonly', () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          items: [],
          readonly: true
        }
      });

      expect(wrapper.find('[data-testid="empty-add-btn"]').exists()).toBe(false);
    });
  });

  describe('Virtual Scrolling', () => {
    it('should render scroll container with proper height', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const scrollContainer = wrapper.find('[data-testid="requirements-scroll-container"]');
      expect(scrollContainer.exists()).toBe(true);
      expect(scrollContainer.attributes('style')).toContain('height:');
    });

    it('should handle scroll events', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const scrollContainer = wrapper.find('[data-testid="requirements-scroll-container"]');
      
      // Mock scrollTop
      Object.defineProperty(scrollContainer.element, 'scrollTop', {
        value: 100,
        writable: true
      });

      await scrollContainer.trigger('scroll');

      expect(wrapper.vm.scrollTop).toBe(100);
    });

    it('should render spacers for virtual scrolling', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const spacers = wrapper.findAll('.requirements-list__spacer');
      expect(spacers).toHaveLength(2); // Top and bottom spacers
    });
  });

  describe('Prop Updates', () => {
    it('should update local filter when prop changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      await wrapper.setProps({ filter: 'accepted' });

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      expect(filterSelect.element.value).toBe('accepted');
    });

    it('should update local search query when prop changes', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      await wrapper.setProps({ searchQuery: 'test query' });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      expect(searchInput.element.value).toBe('test query');
    });

    it('should pass readonly prop to requirement items', () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      const requirementItems = wrapper.findAllComponents({ name: 'RequirementItem' });
      requirementItems.forEach(item => {
        expect(item.props('readonly')).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const list = wrapper.find('[data-testid="requirements-list"]');
      expect(list.attributes('role')).toBe('region');
      expect(list.attributes('aria-label')).toBe('Requirements list');

      const itemsList = wrapper.find('.requirements-list__items');
      expect(itemsList.attributes('role')).toBe('list');
    });

    it('should have proper labels for form controls', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const searchInput = wrapper.find('[data-testid="requirements-search"]');
      expect(searchInput.attributes('aria-label')).toBe('Search requirements');

      const filterSelect = wrapper.find('[data-testid="requirements-filter"]');
      expect(filterSelect.attributes('aria-label')).toBe('Filter requirements by status');

      const addButton = wrapper.find('[data-testid="add-requirement-btn"]');
      expect(addButton.attributes('aria-label')).toBe('Add new requirement');
    });

    it('should have proper labels for selection controls', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      const selectAllCheckbox = wrapper.find('[data-testid="select-all-checkbox"]');
      expect(selectAllCheckbox.attributes('aria-label')).toBe('Select all visible requirements');

      const itemCheckbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      expect(itemCheckbox.attributes('aria-label')).toBe('Select requirement: First Requirement');
    });

    it('should have proper labels for bulk action buttons', async () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Select an item to show bulk actions
      const checkbox = wrapper.find('[data-testid="requirement-checkbox-req-1"]');
      await checkbox.setChecked(true);

      const bulkStatusButton = wrapper.find('[data-testid="bulk-status-btn"]');
      expect(bulkStatusButton.attributes('aria-label')).toBe('Change status of selected requirements');

      const bulkDeleteButton = wrapper.find('[data-testid="bulk-delete-btn"]');
      expect(bulkDeleteButton.attributes('aria-label')).toBe('Delete selected requirements');

      const clearSelectionButton = wrapper.find('[data-testid="clear-selection-btn"]');
      expect(clearSelectionButton.attributes('aria-label')).toBe('Clear selection');
    });
  });

  describe('Responsive Design', () => {
    it('should render without errors on different screen sizes', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Component should render successfully
      expect(wrapper.find('[data-testid="requirements-list"]').exists()).toBe(true);
      
      // All main sections should be present
      expect(wrapper.find('.requirements-list__header').exists()).toBe(true);
      expect(wrapper.find('.requirements-list__summary').exists()).toBe(true);
      expect(wrapper.find('.requirements-list__scroll-container').exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing items gracefully', () => {
      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          items: null
        }
      });

      // Should not throw error and show empty state
      expect(wrapper.find('[data-testid="requirements-empty"]').exists()).toBe(true);
    });

    it('should handle undefined props gracefully', () => {
      wrapper = mount(RequirementsList, {
        props: {
          items: mockRequirements
          // Other props undefined
        }
      });

      // Should render with default values
      expect(wrapper.find('[data-testid="requirements-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-filter"]').element.value).toBe('all');
      expect(wrapper.find('[data-testid="requirements-search"]').element.value).toBe('');
    });

    it('should handle scroll container ref not being available', () => {
      wrapper = mount(RequirementsList, {
        props: defaultProps
      });

      // Should not throw error when calling scroll handler without ref
      expect(() => {
        wrapper.vm.handleScroll();
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of items efficiently', () => {
      const largeItemList = Array.from({ length: 1000 }, (_, i) => ({
        id: `req-${i}`,
        title: `Requirement ${i}`,
        description: `Description ${i}`,
        status: 'new',
        created_at: new Date(),
        updated_at: new Date(),
        source: 'manual'
      }));

      wrapper = mount(RequirementsList, {
        props: {
          ...defaultProps,
          items: largeItemList
        }
      });

      // Should render without performance issues
      expect(wrapper.find('[data-testid="requirements-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="requirements-summary"]').text()).toBe('Showing 1000 of 1000 requirements');
      
      // Virtual scrolling should limit rendered items
      const renderedItems = wrapper.findAll('.mock-requirement-item');
      expect(renderedItems.length).toBeLessThan(largeItemList.length);
    });
  });
});