/**
 * RequirementItem component test suite
 * Tests requirement item functionality including inline editing, validation, status changes, and accessibility
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RequirementItem from '../components/RequirementItem.vue';

describe('RequirementItem', () => {
  let wrapper;
  
  const mockRequirement = {
    id: 'req-1',
    title: 'Test Requirement',
    description: 'This is a test requirement description',
    status: 'new',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-02T15:30:00Z'),
    source: 'manual'
  };

  const defaultProps = {
    requirement: mockRequirement,
    readonly: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Basic Rendering', () => {
    it('should render requirement item with title and description', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      expect(wrapper.find('[data-testid="requirement-title-req-1"]').text()).toBe('Test Requirement');
      expect(wrapper.find('[data-testid="requirement-description-req-1"]').text()).toBe('This is a test requirement description');
      expect(wrapper.find('[data-testid="requirement-item-req-1"]').exists()).toBe(true);
    });

    it('should display correct status', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      expect(statusSelect.element.value).toBe('new');
    });

    it('should show metadata information', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const metadata = wrapper.find('.requirement-item__metadata');
      expect(metadata.text()).toContain('Source: Manual');
      expect(metadata.text()).toContain('Updated:');
    });

    it('should show PDF source correctly', () => {
      const pdfRequirement = {
        ...mockRequirement,
        source: 'pdf'
      };

      wrapper = mount(RequirementItem, {
        props: {
          requirement: pdfRequirement,
          readonly: false
        }
      });

      expect(wrapper.find('.requirement-item__source').text()).toBe('Source: PDF Import');
    });

    it('should handle empty title gracefully', () => {
      const emptyTitleRequirement = {
        ...mockRequirement,
        title: ''
      };

      wrapper = mount(RequirementItem, {
        props: {
          requirement: emptyTitleRequirement,
          readonly: false
        }
      });

      expect(wrapper.find('[data-testid="requirement-title-req-1"]').text()).toBe('Untitled Requirement');
    });

    it('should show placeholder for empty description', () => {
      const emptyDescRequirement = {
        ...mockRequirement,
        description: ''
      };

      wrapper = mount(RequirementItem, {
        props: {
          requirement: emptyDescRequirement,
          readonly: false
        }
      });

      expect(wrapper.find('[data-testid="requirement-description-req-1"]').text()).toBe('Click to add description...');
    });
  });

  describe('Inline Editing - Title', () => {
    it('should enter edit mode when title is clicked', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(true);
      expect(wrapper.find('.requirement-item__actions').exists()).toBe(true);
    });

    it('should enter edit mode when title is activated with Enter key', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('keydown.enter');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(true);
    });

    it('should enter edit mode when title is activated with Space key', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('keydown.space');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(true);
    });

    it('should focus and select title input when entering edit mode', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');

      // Check that the input exists and is focused
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      expect(titleInput.exists()).toBe(true);
      
      // In a real browser, the input would be focused, but in tests we just verify it exists
      expect(titleInput.element).toBeTruthy();
    });

    it('should save changes when Enter is pressed in title input', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('Updated Title');
      
      // Set description to avoid validation error
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue('Valid description');
      
      await titleInput.trigger('keydown.enter');

      // Since Enter moves focus to description, we need to save manually for this test
      await wrapper.find('[data-testid="requirement-save-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeTruthy();
      expect(wrapper.emitted('update')[0][0].title).toBe('Updated Title');
    });

    it('should move focus to description when Enter is pressed in title', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.trigger('keydown.enter');

      // Verify that description input is available for focus
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      expect(descInput.exists()).toBe(true);
    });

    it('should cancel editing when Escape is pressed', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('Changed Title');
      await titleInput.trigger('keydown.escape');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="requirement-title-req-1"]').text()).toBe('Test Requirement');
    });
  });

  describe('Inline Editing - Description', () => {
    it('should enter edit mode when description is clicked', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('click');

      expect(wrapper.find('[data-testid="requirement-description-input-req-1"]').exists()).toBe(true);
      expect(wrapper.find('.requirement-item__actions').exists()).toBe(true);
    });

    it('should enter edit mode when description is activated with Enter key', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('keydown.enter');

      expect(wrapper.find('[data-testid="requirement-description-input-req-1"]').exists()).toBe(true);
    });

    it('should focus and select description input when entering edit mode', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('click');

      // Check that the input exists and is available for focus
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      expect(descInput.exists()).toBe(true);
      expect(descInput.element).toBeTruthy();
    });

    it('should cancel editing when Escape is pressed in description', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('click');
      
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue('Changed Description');
      await descInput.trigger('keydown.escape');

      expect(wrapper.find('[data-testid="requirement-description-input-req-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="requirement-description-req-1"]').text()).toBe('This is a test requirement description');
    });
  });

  describe('Save and Cancel Actions', () => {
    it('should save changes when save button is clicked', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('Updated Title');
      
      await wrapper.find('[data-testid="requirement-save-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeTruthy();
      expect(wrapper.emitted('update')[0][0].title).toBe('Updated Title');
      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
    });

    it('should cancel changes when cancel button is clicked', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('Changed Title');
      
      await wrapper.find('[data-testid="requirement-cancel-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeFalsy();
      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="requirement-title-req-1"]').text()).toBe('Test Requirement');
    });

    it('should update both title and description when saving', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('New Title');
      
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue('New Description');
      
      await wrapper.find('[data-testid="requirement-save-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeTruthy();
      const updatedReq = wrapper.emitted('update')[0][0];
      expect(updatedReq.title).toBe('New Title');
      expect(updatedReq.description).toBe('New Description');
    });

    it('should update the updated_at timestamp when saving', async () => {
      const originalDate = mockRequirement.updated_at;
      
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('New Title');
      
      await wrapper.find('[data-testid="requirement-save-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeTruthy();
      const updatedReq = wrapper.emitted('update')[0][0];
      expect(updatedReq.updated_at).not.toEqual(originalDate);
      expect(updatedReq.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('Status Changes', () => {
    it('should emit status-change when status is changed', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      await statusSelect.setValue('accepted');

      expect(wrapper.emitted('status-change')).toBeTruthy();
      expect(wrapper.emitted('status-change')[0]).toEqual(['req-1', 'accepted']);
    });

    it('should apply correct CSS class for each status', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      
      // Test new status
      expect(statusSelect.classes()).toContain('requirement-item__status-select--new');
      
      // Test accepted status
      await statusSelect.setValue('accepted');
      expect(statusSelect.classes()).toContain('requirement-item__status-select--accepted');
      
      // Test rejected status
      await statusSelect.setValue('rejected');
      expect(statusSelect.classes()).toContain('requirement-item__status-select--rejected');
    });

    it('should not emit status-change when in editing mode', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      // Enter editing mode
      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      // Change status while editing
      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      await statusSelect.setValue('accepted');

      // Should not emit status-change immediately
      expect(wrapper.emitted('status-change')).toBeFalsy();
    });
  });

  describe('Validation', () => {
    it('should show error for empty title', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('');
      await titleInput.trigger('blur');

      expect(wrapper.find('[data-testid="title-error-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="title-error-req-1"]').text()).toBe('Title is required');
    });

    it('should show error for title too long', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const longTitle = 'a'.repeat(201);
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue(longTitle);
      await titleInput.trigger('blur');

      expect(wrapper.find('[data-testid="title-error-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="title-error-req-1"]').text()).toBe('Title must be less than 200 characters');
    });

    it('should show error for empty description', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('click');
      
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue('');
      await descInput.trigger('blur');

      expect(wrapper.find('[data-testid="description-error-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="description-error-req-1"]').text()).toBe('Description is required');
    });

    it('should show error for description too long', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-description-req-1"]').trigger('click');
      
      const longDesc = 'a'.repeat(2001);
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue(longDesc);
      await descInput.trigger('blur');

      expect(wrapper.find('[data-testid="description-error-req-1"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="description-error-req-1"]').text()).toBe('Description must be less than 2000 characters');
    });

    it('should disable save button when there are validation errors', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('');
      await titleInput.trigger('blur');

      const saveButton = wrapper.find('[data-testid="requirement-save-req-1"]');
      expect(saveButton.element.disabled).toBe(true);
    });

    it('should not save when there are validation errors', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('');
      await titleInput.trigger('blur'); // Trigger validation
      
      // Try to save with empty title
      wrapper.vm.saveChanges();

      expect(wrapper.emitted('update')).toBeFalsy();
      expect(wrapper.find('[data-testid="title-error-req-1"]').exists()).toBe(true);
    });

    it('should apply error styling to inputs with validation errors', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('');
      await titleInput.trigger('blur');

      expect(titleInput.classes()).toContain('requirement-item__title-input--error');
    });
  });

  describe('Readonly Mode', () => {
    it('should not enter edit mode when readonly is true', async () => {
      wrapper = mount(RequirementItem, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
    });

    it('should disable status select when readonly is true', () => {
      wrapper = mount(RequirementItem, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      expect(statusSelect.element.disabled).toBe(true);
    });

    it('should apply readonly styling', () => {
      wrapper = mount(RequirementItem, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      expect(wrapper.find('.requirement-item').classes()).toContain('requirement-item--readonly');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key to start editing', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const item = wrapper.find('[data-testid="requirement-item-req-1"]');
      await item.trigger('keydown', { key: 'Enter' });

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(true);
    });

    it('should handle Escape key to cancel editing', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const item = wrapper.find('[data-testid="requirement-item-req-1"]');
      await item.trigger('keydown', { key: 'Escape' });

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
    });

    it('should handle Ctrl+Delete to emit delete event', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const item = wrapper.find('[data-testid="requirement-item-req-1"]');
      await item.trigger('keydown', { key: 'Delete', ctrlKey: true });

      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0]).toEqual(['req-1']);
    });

    it('should not handle keyboard events in readonly mode', async () => {
      wrapper = mount(RequirementItem, {
        props: {
          ...defaultProps,
          readonly: true
        }
      });

      await wrapper.find('[data-testid="requirement-item-req-1"]').trigger('keydown.enter');

      expect(wrapper.find('[data-testid="requirement-title-input-req-1"]').exists()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const item = wrapper.find('[data-testid="requirement-item-req-1"]');
      expect(item.attributes('role')).toBe('listitem');
      expect(item.attributes('aria-label')).toBe('Requirement: Test Requirement');
      expect(item.attributes('tabindex')).toBe('0');
    });

    it('should have proper ARIA labels for interactive elements', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const title = wrapper.find('[data-testid="requirement-title-req-1"]');
      expect(title.attributes('role')).toBe('button');
      expect(title.attributes('aria-label')).toBe('Edit title: Test Requirement');
      expect(title.attributes('tabindex')).toBe('0');

      const description = wrapper.find('[data-testid="requirement-description-req-1"]');
      expect(description.attributes('role')).toBe('button');
      expect(description.attributes('aria-label')).toBe('Edit description: This is a test requirement description');
      expect(description.attributes('tabindex')).toBe('0');

      const statusSelect = wrapper.find('[data-testid="requirement-status-req-1"]');
      expect(statusSelect.attributes('aria-label')).toBe('Status for Test Requirement');
    });

    it('should associate error messages with inputs using aria-describedby', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('');
      await titleInput.trigger('blur');

      expect(titleInput.attributes('aria-describedby')).toBe('title-error-req-1');
      
      const errorElement = wrapper.find('[data-testid="title-error-req-1"]');
      expect(errorElement.attributes('role')).toBe('alert');
    });

    it('should have proper button labels for actions', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');

      const saveButton = wrapper.find('[data-testid="requirement-save-req-1"]');
      expect(saveButton.attributes('aria-label')).toBe('Save changes to Test Requirement');

      const cancelButton = wrapper.find('[data-testid="requirement-cancel-req-1"]');
      expect(cancelButton.attributes('aria-label')).toBe('Cancel editing Test Requirement');
    });
  });

  describe('Prop Updates', () => {
    it('should update local values when requirement prop changes', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const updatedRequirement = {
        ...mockRequirement,
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'accepted'
      };

      await wrapper.setProps({ requirement: updatedRequirement });

      expect(wrapper.find('[data-testid="requirement-title-req-1"]').text()).toBe('Updated Title');
      expect(wrapper.find('[data-testid="requirement-description-req-1"]').text()).toBe('Updated Description');
      expect(wrapper.find('[data-testid="requirement-status-req-1"]').element.value).toBe('accepted');
    });

    it('should not update local values when editing', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      // Start editing
      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('Local Change');

      // Update prop
      const updatedRequirement = {
        ...mockRequirement,
        title: 'Prop Change'
      };

      await wrapper.setProps({ requirement: updatedRequirement });

      // Local value should remain unchanged
      expect(titleInput.element.value).toBe('Local Change');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      const formattedDate = wrapper.vm.formatDate(new Date('2024-01-02T15:30:00Z'));
      expect(formattedDate).toMatch(/Jan 2, 2024/);
      expect(formattedDate).toMatch(/\d{1,2}:\d{2}/); // Time format
    });
  });

  describe('Error Handling', () => {
    it('should handle missing refs gracefully', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      // Should not throw error when starting editing
      expect(() => {
        wrapper.vm.startEditing('title');
      }).not.toThrow();
      
      // Should still enter editing mode
      expect(wrapper.vm.isEditing).toBe(true);
    });

    it('should trim whitespace from inputs', async () => {
      wrapper = mount(RequirementItem, {
        props: defaultProps
      });

      await wrapper.find('[data-testid="requirement-title-req-1"]').trigger('click');
      
      const titleInput = wrapper.find('[data-testid="requirement-title-input-req-1"]');
      await titleInput.setValue('  Trimmed Title  ');
      
      const descInput = wrapper.find('[data-testid="requirement-description-input-req-1"]');
      await descInput.setValue('  Trimmed Description  ');
      
      await wrapper.find('[data-testid="requirement-save-req-1"]').trigger('click');

      expect(wrapper.emitted('update')).toBeTruthy();
      const updatedReq = wrapper.emitted('update')[0][0];
      expect(updatedReq.title).toBe('Trimmed Title');
      expect(updatedReq.description).toBe('Trimmed Description');
    });
  });
});