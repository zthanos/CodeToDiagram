// src/test/ADRWorkspace.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ADRWorkspace from '../components/ADRWorkspace.vue';
import ADRList from '../components/ADRList.vue';
import ADREditor from '../components/ADREditor.vue';

// Mock the router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn()
};

// Mock the composables
vi.mock('../composables/useADRSearch', () => ({
  useADRSearch: () => ({
    searchConfig: { value: {} },
    filterConfig: { value: {} },
    updateSearchConfig: vi.fn(),
    updateFilterConfig: vi.fn(),
    performSearch: vi.fn(),
    applyFilters: vi.fn()
  })
}));

// Mock the API service
vi.mock('../services/ADRApiService', () => ({
  ADRApiService: {
    initialize: vi.fn(),
    listADRs: vi.fn(),
    getADRStats: vi.fn(),
    createADR: vi.fn(),
    updateADR: vi.fn(),
    deleteADR: vi.fn()
  }
}));

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => mockRouter
}));

import { ADRApiService } from '../services/ADRApiService';

describe('ADRWorkspace', () => {
  let wrapper;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    description: 'A test project'
  };

  const mockADRs = [
    {
      id: 'adr-1',
      project_id: 'project-123',
      title: 'Use React for Frontend',
      status: 'accepted',
      context: 'We need to choose a frontend framework',
      decision: 'We will use React',
      consequences: 'Better developer experience',
      alternatives: 'Vue.js, Angular',
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
      context: 'We need to choose a database',
      decision: 'We will use PostgreSQL',
      consequences: 'ACID compliance',
      alternatives: 'MySQL, MongoDB',
      author: 'Jane Smith',
      created_at: new Date('2025-01-02'),
      updated_at: new Date('2025-01-02'),
      tags: ['database', 'backend'],
      superseded_by: undefined,
      supersedes: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API mocks
    ADRApiService.listADRs.mockResolvedValue(mockADRs);
    ADRApiService.getADRStats.mockResolvedValue({
      total: 2,
      proposed: 1,
      accepted: 1,
      deprecated: 0,
      superseded: 0
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Initialization', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      await nextTick();
    });

    it('should render workspace header correctly', () => {
      expect(wrapper.find('h1').text()).toBe('Architectural Decision Records');
      expect(wrapper.find('.workspace-description').text()).toContain('Test Project');
    });

    it('should initialize API service on mount', () => {
      expect(ADRApiService.initialize).toHaveBeenCalled();
    });

    it('should load ADRs on mount', () => {
      expect(ADRApiService.listADRs).toHaveBeenCalledWith('project-123');
    });

    it('should display ADR statistics', async () => {
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await nextTick();

      const statItems = wrapper.findAll('.stat-item');
      expect(statItems).toHaveLength(3);
      
      // Check if stats are displayed (computed from loaded ADRs)
      expect(wrapper.text()).toContain('2'); // Total
      expect(wrapper.text()).toContain('1'); // Accepted
      expect(wrapper.text()).toContain('1'); // Proposed
    });

    it('should start in list view mode', () => {
      expect(wrapper.findComponent(ADRList).exists()).toBe(true);
      expect(wrapper.findComponent(ADREditor).exists()).toBe(false);
    });
  });

  describe('ADR List Interactions', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      await nextTick();
    });

    it('should switch to edit mode when ADR is selected', async () => {
      const adrList = wrapper.findComponent(ADRList);
      await adrList.vm.$emit('adr-select', mockADRs[0]);

      expect(wrapper.vm.viewMode).toBe('edit');
      expect(wrapper.vm.selectedADR).toEqual(mockADRs[0]);
    });

    it('should switch to create mode when create is triggered', async () => {
      const adrList = wrapper.findComponent(ADRList);
      await adrList.vm.$emit('adr-create');

      expect(wrapper.vm.viewMode).toBe('create');
      expect(wrapper.vm.selectedADR).toBeNull();
    });

    it('should switch to edit mode when edit is triggered', async () => {
      const adrList = wrapper.findComponent(ADRList);
      await adrList.vm.$emit('adr-edit', mockADRs[1]);

      expect(wrapper.vm.viewMode).toBe('edit');
      expect(wrapper.vm.selectedADR).toEqual(mockADRs[1]);
    });

    it('should handle search changes', async () => {
      const adrList = wrapper.findComponent(ADRList);
      await adrList.vm.$emit('search-change', 'database');

      expect(wrapper.vm.searchQuery).toBe('database');
    });

    it('should handle filter changes', async () => {
      const adrList = wrapper.findComponent(ADRList);
      const filterConfig = { status: 'accepted', tags: [], author: '' };
      await adrList.vm.$emit('filter-change', filterConfig);

      expect(wrapper.vm.statusFilter).toBe('accepted');
    });
  });

  describe('ADR Creation', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      
      // Switch to create mode
      wrapper.vm.workspaceState.viewMode = 'create';
      await nextTick();
    });

    it('should render ADR editor in create mode', () => {
      expect(wrapper.findComponent(ADREditor).exists()).toBe(true);
      expect(wrapper.findComponent(ADREditor).props('mode')).toBe('create');
    });

    it('should create new ADR successfully', async () => {
      const newADR = {
        id: 'adr-new',
        project_id: 'project-123',
        title: 'New ADR',
        status: 'proposed',
        context: 'New context',
        decision: 'New decision',
        consequences: 'New consequences',
        author: 'New Author',
        created_at: new Date(),
        updated_at: new Date(),
        tags: ['new'],
        superseded_by: undefined,
        supersedes: []
      };

      ADRApiService.createADR.mockResolvedValue(newADR);

      const adrEditor = wrapper.findComponent(ADREditor);
      await adrEditor.vm.$emit('save', newADR);

      expect(ADRApiService.createADR).toHaveBeenCalledWith(
        'project-123',
        expect.objectContaining({
          title: 'New ADR',
          context: 'New context',
          decision: 'New decision',
          consequences: 'New consequences',
          author: 'New Author',
          tags: ['new']
        })
      );

      // Should return to list view
      expect(wrapper.vm.viewMode).toBe('list');
      
      // Should show success message
      expect(wrapper.vm.successMessage).toBe('ADR created successfully!');
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      ADRApiService.createADR.mockRejectedValue(error);

      const adrEditor = wrapper.findComponent(ADREditor);
      await adrEditor.vm.$emit('save', mockADRs[0]);

      expect(wrapper.vm.errorMessage).toBe('Failed to save ADR. Please try again.');
    });

    it('should cancel creation and return to list', async () => {
      const adrEditor = wrapper.findComponent(ADREditor);
      await adrEditor.vm.$emit('cancel');

      expect(wrapper.vm.viewMode).toBe('list');
      expect(wrapper.vm.selectedADR).toBeNull();
    });
  });

  describe('ADR Editing', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      
      // Switch to edit mode
      wrapper.vm.workspaceState.viewMode = 'edit';
      wrapper.vm.workspaceState.selectedADR = mockADRs[0];
      await nextTick();
    });

    it('should render ADR editor in edit mode', () => {
      expect(wrapper.findComponent(ADREditor).exists()).toBe(true);
      expect(wrapper.findComponent(ADREditor).props('mode')).toBe('edit');
      expect(wrapper.findComponent(ADREditor).props('adr')).toEqual(mockADRs[0]);
    });

    it('should update existing ADR successfully', async () => {
      const updatedADR = {
        ...mockADRs[0],
        title: 'Updated ADR Title'
      };

      ADRApiService.updateADR.mockResolvedValue(updatedADR);

      const adrEditor = wrapper.findComponent(ADREditor);
      await adrEditor.vm.$emit('save', updatedADR);

      expect(ADRApiService.updateADR).toHaveBeenCalledWith(
        'adr-1',
        expect.objectContaining({
          title: 'Updated ADR Title'
        })
      );

      // Should return to list view
      expect(wrapper.vm.viewMode).toBe('list');
      
      // Should show success message
      expect(wrapper.vm.successMessage).toBe('ADR updated successfully!');
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      ADRApiService.updateADR.mockRejectedValue(error);

      const adrEditor = wrapper.findComponent(ADREditor);
      await adrEditor.vm.$emit('save', mockADRs[0]);

      expect(wrapper.vm.errorMessage).toBe('Failed to save ADR. Please try again.');
    });
  });

  describe('ADR Deletion', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      await nextTick();
    });

    it('should show delete confirmation dialog', async () => {
      const adrList = wrapper.findComponent(ADRList);
      await adrList.vm.$emit('adr-delete', 'adr-1');

      expect(wrapper.vm.showDeleteConfirm).toBe(true);
      expect(wrapper.vm.adrToDelete).toBe('adr-1');
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    });

    it('should delete ADR when confirmed', async () => {
      ADRApiService.deleteADR.mockResolvedValue();

      // Trigger delete
      wrapper.vm.adrToDelete = 'adr-1';
      wrapper.vm.showDeleteConfirm = true;
      await nextTick();

      // Confirm delete
      await wrapper.find('.modal-content .btn-danger').trigger('click');

      expect(ADRApiService.deleteADR).toHaveBeenCalledWith('adr-1');
      expect(wrapper.vm.successMessage).toBe('ADR deleted successfully!');
      expect(wrapper.vm.showDeleteConfirm).toBe(false);
    });

    it('should cancel delete when cancel is clicked', async () => {
      wrapper.vm.adrToDelete = 'adr-1';
      wrapper.vm.showDeleteConfirm = true;
      await nextTick();

      // Cancel delete
      await wrapper.find('.modal-content .btn-secondary').trigger('click');

      expect(ADRApiService.deleteADR).not.toHaveBeenCalled();
      expect(wrapper.vm.showDeleteConfirm).toBe(false);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      ADRApiService.deleteADR.mockRejectedValue(error);

      wrapper.vm.adrToDelete = 'adr-1';
      await wrapper.vm.confirmDelete();

      expect(wrapper.vm.errorMessage).toBe('Failed to delete ADR. Please try again.');
    });

    it('should return to list view if editing deleted ADR', async () => {
      ADRApiService.deleteADR.mockResolvedValue();

      // Set up editing state
      wrapper.vm.workspaceState.viewMode = 'edit';
      wrapper.vm.workspaceState.selectedADR = mockADRs[0];
      wrapper.vm.adrToDelete = 'adr-1';

      await wrapper.vm.confirmDelete();

      expect(wrapper.vm.viewMode).toBe('list');
      expect(wrapper.vm.selectedADR).toBeNull();
    });
  });

  describe('Loading States', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
    });

    it('should show loading overlay during operations', async () => {
      wrapper.vm.isLoading = true;
      wrapper.vm.loadingMessage = 'Loading ADRs...';
      await nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.find('.loading-content p').text()).toBe('Loading ADRs...');
    });

    it('should hide loading overlay when not loading', async () => {
      wrapper.vm.isLoading = false;
      await nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
    });
  });

  describe('Toast Messages', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
    });

    it('should show error toast', async () => {
      wrapper.vm.errorMessage = 'Test error message';
      await nextTick();

      expect(wrapper.find('.error-toast').exists()).toBe(true);
      expect(wrapper.find('.error-text').text()).toBe('Test error message');
    });

    it('should show success toast', async () => {
      wrapper.vm.successMessage = 'Test success message';
      await nextTick();

      expect(wrapper.find('.success-toast').exists()).toBe(true);
      expect(wrapper.find('.success-text').text()).toBe('Test success message');
    });

    it('should clear error message when clicked', async () => {
      wrapper.vm.errorMessage = 'Test error';
      await nextTick();

      await wrapper.find('.error-toast').trigger('click');
      expect(wrapper.vm.errorMessage).toBe('');
    });

    it('should clear success message when clicked', async () => {
      wrapper.vm.successMessage = 'Test success';
      await nextTick();

      await wrapper.find('.success-toast').trigger('click');
      expect(wrapper.vm.successMessage).toBe('');
    });

    it('should auto-clear success message after timeout', async () => {
      vi.useFakeTimers();
      
      wrapper.vm.showSuccess('Test message');
      expect(wrapper.vm.successMessage).toBe('Test message');

      vi.advanceTimersByTime(3000);
      expect(wrapper.vm.successMessage).toBe('');

      vi.useRealTimers();
    });

    it('should auto-clear error message after timeout', async () => {
      vi.useFakeTimers();
      
      wrapper.vm.showError('Test error');
      expect(wrapper.vm.errorMessage).toBe('Test error');

      vi.advanceTimersByTime(5000);
      expect(wrapper.vm.errorMessage).toBe('');

      vi.useRealTimers();
    });
  });

  describe('Statistics Computation', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
      await nextTick();
    });

    it('should compute ADR statistics correctly', () => {
      // Set test data
      wrapper.vm.workspaceState.adrs = [
        { ...mockADRs[0], status: 'accepted' },
        { ...mockADRs[1], status: 'proposed' },
        { ...mockADRs[0], status: 'accepted', id: 'adr-3' },
        { ...mockADRs[0], status: 'deprecated', id: 'adr-4' }
      ];

      const stats = wrapper.vm.adrStats;
      expect(stats.total).toBe(4);
      expect(stats.accepted).toBe(2);
      expect(stats.proposed).toBe(1);
      expect(stats.deprecated).toBe(1);
      expect(stats.superseded).toBe(0);
    });
  });

  describe('Project Changes', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
    });

    it('should reload ADRs when project changes', async () => {
      const newProject = { ...mockProject, id: 'new-project-456' };
      
      await wrapper.setProps({ project: newProject });

      expect(ADRApiService.listADRs).toHaveBeenCalledWith('new-project-456');
    });
  });

  describe('Unsaved Changes Handling', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
    });

    it('should emit unsaved-changes event', async () => {
      wrapper.vm.workspaceState.hasChanges = true;
      await nextTick();

      expect(wrapper.emitted('unsaved-changes')).toBeTruthy();
      expect(wrapper.emitted('unsaved-changes')[0][0]).toBe(true);
    });

    it('should show confirmation when canceling with unsaved changes', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      wrapper.vm.workspaceState.hasChanges = true;
      wrapper.vm.workspaceState.viewMode = 'edit';
      
      await wrapper.vm.handleEditorCancel();

      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to discard them?');
      expect(wrapper.vm.viewMode).toBe('edit'); // Should stay in edit mode

      confirmSpy.mockRestore();
    });

    it('should allow cancel when user confirms discarding changes', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      wrapper.vm.workspaceState.hasChanges = true;
      wrapper.vm.workspaceState.viewMode = 'edit';
      
      await wrapper.vm.handleEditorCancel();

      expect(wrapper.vm.viewMode).toBe('list');
      expect(wrapper.vm.workspaceState.hasChanges).toBe(false);

      confirmSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      wrapper = mount(ADRWorkspace, {
        props: {
          project: mockProject
        }
      });
    });

    it('should handle ADR loading errors', async () => {
      const error = new Error('Failed to load ADRs');
      ADRApiService.listADRs.mockRejectedValue(error);

      await wrapper.vm.loadADRs();

      expect(wrapper.vm.errorMessage).toBe('Failed to load ADRs. Please try again.');
    });

    it('should handle stats loading errors gracefully', async () => {
      const error = new Error('Failed to load stats');
      ADRApiService.getADRStats.mockRejectedValue(error);

      // Should not throw error, just log warning
      await wrapper.vm.loadADRs();

      // Stats should still be computed from loaded ADRs
      expect(wrapper.vm.adrStats.total).toBe(2);
    });
  });
});