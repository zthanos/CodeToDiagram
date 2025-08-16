// src/test/ADREditor.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ADREditor from '../components/ADREditor.vue';

// Mock the composables and services
vi.mock('../composables/useADRSearch', () => ({
  useADRSearch: () => ({
    searchConfig: { value: {} },
    filterConfig: { value: {} },
    updateSearchConfig: vi.fn(),
    updateFilterConfig: vi.fn()
  })
}));

describe('ADREditor', () => {
  let wrapper;

  const mockADR = {
    id: 'adr-123',
    project_id: 'project-123',
    title: 'Use React for Frontend',
    status: 'proposed',
    context: 'We need to choose a frontend framework for our application.',
    decision: 'We will use React as our primary frontend framework.',
    consequences: 'This will provide better developer experience and community support.',
    alternatives: 'Vue.js and Angular were also considered.',
    author: 'John Doe',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    tags: ['frontend', 'framework'],
    superseded_by: undefined,
    supersedes: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'create'
        }
      });
    });

    it('should render create mode correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Create New ADR');
      expect(wrapper.find('.btn-primary').text()).toContain('Save ADR');
      expect(wrapper.find('.btn-danger').exists()).toBe(false);
    });

    it('should initialize with default values', () => {
      expect(wrapper.find('#title').element.value).toBe('');
      expect(wrapper.find('#status').element.value).toBe('proposed');
      expect(wrapper.find('#context').element.value).toBe('');
      expect(wrapper.find('#decision').element.value).toBe('');
      expect(wrapper.find('#consequences').element.value).toBe('');
    });

    it('should validate required fields', async () => {
      // Try to save without filling required fields
      await wrapper.find('.btn-primary').trigger('click');
      
      // Should show validation errors
      expect(wrapper.findAll('.error-message')).toHaveLength(5); // title, context, decision, consequences, author
    });

    it('should emit save event with valid data', async () => {
      // Fill in required fields
      await wrapper.find('#title').setValue('Test ADR Title');
      await wrapper.find('#context').setValue('This is a test context that is long enough to pass validation.');
      await wrapper.find('#decision').setValue('This is a test decision that is long enough to pass validation.');
      await wrapper.find('#consequences').setValue('These are test consequences.');
      await wrapper.find('#author').setValue('Test Author');

      // Save the ADR
      await wrapper.find('.btn-primary').trigger('click');

      // Should emit save event
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')[0][0]).toMatchObject({
        title: 'Test ADR Title',
        status: 'proposed',
        context: 'This is a test context that is long enough to pass validation.',
        decision: 'This is a test decision that is long enough to pass validation.',
        consequences: 'These are test consequences.',
        author: 'Test Author'
      });
    });

    it('should emit cancel event when cancel button is clicked', async () => {
      await wrapper.find('.btn-secondary').trigger('click');
      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'edit',
          adr: mockADR
        }
      });
    });

    it('should render edit mode correctly', () => {
      expect(wrapper.find('h2').text()).toBe('Edit ADR');
      expect(wrapper.find('.btn-primary').text()).toContain('Save ADR');
      expect(wrapper.find('.btn-danger').exists()).toBe(true);
    });

    it('should populate form with ADR data', () => {
      expect(wrapper.find('#title').element.value).toBe(mockADR.title);
      expect(wrapper.find('#status').element.value).toBe(mockADR.status);
      expect(wrapper.find('#context').element.value).toBe(mockADR.context);
      expect(wrapper.find('#decision').element.value).toBe(mockADR.decision);
      expect(wrapper.find('#consequences').element.value).toBe(mockADR.consequences);
      expect(wrapper.find('#alternatives').element.value).toBe(mockADR.alternatives);
      expect(wrapper.find('#author').element.value).toBe(mockADR.author);
    });

    it('should display existing tags', () => {
      const tags = wrapper.findAll('.tag');
      expect(tags).toHaveLength(2);
      expect(tags[0].text()).toContain('frontend');
      expect(tags[1].text()).toContain('framework');
    });

    it('should emit save event with updated data', async () => {
      // Update the title
      await wrapper.find('#title').setValue('Updated ADR Title');
      
      // Save the ADR
      await wrapper.find('.btn-primary').trigger('click');

      // Should emit save event with updated data
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')[0][0]).toMatchObject({
        ...mockADR,
        title: 'Updated ADR Title'
      });
    });

    it('should show delete confirmation dialog', async () => {
      await wrapper.find('.btn-danger').trigger('click');
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
      expect(wrapper.find('.modal-content h3').text()).toBe('Confirm Delete');
    });

    it('should emit delete event when confirmed', async () => {
      // Open delete dialog
      await wrapper.find('.btn-danger').trigger('click');
      
      // Confirm delete
      await wrapper.find('.modal-content .btn-danger').trigger('click');
      
      expect(wrapper.emitted('delete')).toBeTruthy();
      expect(wrapper.emitted('delete')[0][0]).toBe(mockADR.id);
    });

    it('should cancel delete when cancel is clicked', async () => {
      // Open delete dialog
      await wrapper.find('.btn-danger').trigger('click');
      
      // Cancel delete
      await wrapper.find('.modal-content .btn-secondary').trigger('click');
      
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
      expect(wrapper.emitted('delete')).toBeFalsy();
    });
  });

  describe('Tag Management', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'create'
        }
      });
    });

    it('should add new tags', async () => {
      const tagInput = wrapper.find('.tag-input');
      
      // Add a tag
      await tagInput.setValue('newtag');
      await tagInput.trigger('keydown.enter');
      
      // Should display the new tag
      expect(wrapper.find('.tag').text()).toContain('newtag');
      expect(tagInput.element.value).toBe(''); // Input should be cleared
    });

    it('should add tags on comma key', async () => {
      const tagInput = wrapper.find('.tag-input');
      
      // Add a tag with comma
      await tagInput.setValue('anothertag');
      await tagInput.trigger('keydown.comma');
      
      expect(wrapper.find('.tag').text()).toContain('anothertag');
    });

    it('should not add duplicate tags', async () => {
      const tagInput = wrapper.find('.tag-input');
      
      // Add same tag twice
      await tagInput.setValue('duplicate');
      await tagInput.trigger('keydown.enter');
      await tagInput.setValue('duplicate');
      await tagInput.trigger('keydown.enter');
      
      // Should only have one tag
      expect(wrapper.findAll('.tag')).toHaveLength(1);
    });

    it('should remove tags when remove button is clicked', async () => {
      // First add a tag
      const tagInput = wrapper.find('.tag-input');
      await tagInput.setValue('removeme');
      await tagInput.trigger('keydown.enter');
      
      // Then remove it
      await wrapper.find('.tag-remove').trigger('click');
      
      expect(wrapper.findAll('.tag')).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'create'
        }
      });
    });

    it('should validate title is required', async () => {
      await wrapper.find('#title').setValue('');
      await wrapper.find('#title').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Title is required');
    });

    it('should validate title length', async () => {
      const longTitle = 'a'.repeat(201);
      await wrapper.find('#title').setValue(longTitle);
      await wrapper.find('#title').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Title must be less than 200 characters');
    });

    it('should validate context minimum length', async () => {
      await wrapper.find('#context').setValue('short');
      await wrapper.find('#context').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Context should be at least 50 characters');
    });

    it('should validate decision minimum length', async () => {
      await wrapper.find('#decision').setValue('short');
      await wrapper.find('#decision').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Decision should be at least 50 characters');
    });

    it('should validate consequences minimum length', async () => {
      await wrapper.find('#consequences').setValue('short');
      await wrapper.find('#consequences').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Consequences should be at least 30 characters');
    });

    it('should validate author is required', async () => {
      await wrapper.find('#author').setValue('');
      await wrapper.find('#author').trigger('input');
      
      expect(wrapper.find('.error-message').text()).toBe('Author is required');
    });

    it('should disable save button when form is invalid', async () => {
      // Form should be invalid initially (empty required fields)
      expect(wrapper.find('.btn-primary').element.disabled).toBe(true);
    });

    it('should enable save button when form is valid', async () => {
      // Fill in all required fields with valid data
      await wrapper.find('#title').setValue('Valid Title');
      await wrapper.find('#context').setValue('This is a valid context that is long enough to pass validation requirements.');
      await wrapper.find('#decision').setValue('This is a valid decision that is long enough to pass validation requirements.');
      await wrapper.find('#consequences').setValue('These are valid consequences that meet the minimum length requirement.');
      await wrapper.find('#author').setValue('Valid Author');

      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('.btn-primary').element.disabled).toBe(false);
    });
  });

  describe('Status Handling', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'edit',
          adr: { ...mockADR, status: 'superseded' }
        }
      });
    });

    it('should show superseded by field when status is superseded', () => {
      expect(wrapper.find('#superseded_by').exists()).toBe(true);
    });

    it('should hide superseded by field for other statuses', async () => {
      await wrapper.find('#status').setValue('accepted');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('#superseded_by').exists()).toBe(false);
    });

    it('should display correct status indicator', () => {
      const statusIndicator = wrapper.find('.status-indicator');
      expect(statusIndicator.text()).toBe('SUPERSEDED');
      expect(statusIndicator.classes()).toContain('status-superseded');
    });
  });

  describe('Readonly Mode', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'edit',
          adr: mockADR,
          readonly: true
        }
      });
    });

    it('should disable all form inputs in readonly mode', () => {
      expect(wrapper.find('#title').element.readOnly).toBe(true);
      expect(wrapper.find('#status').element.disabled).toBe(true);
      expect(wrapper.find('#context').element.readOnly).toBe(true);
      expect(wrapper.find('#decision').element.readOnly).toBe(true);
      expect(wrapper.find('#consequences').element.readOnly).toBe(true);
      expect(wrapper.find('#alternatives').element.readOnly).toBe(true);
      expect(wrapper.find('#author').element.readOnly).toBe(true);
    });

    it('should hide tag remove buttons in readonly mode', () => {
      expect(wrapper.findAll('.tag-remove')).toHaveLength(0);
    });

    it('should hide tag input in readonly mode', () => {
      expect(wrapper.find('.tag-input').exists()).toBe(false);
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'create'
        }
      });
    });

    it('should show loading state when saving', async () => {
      // Set isSaving to true by triggering save with valid data
      await wrapper.find('#title').setValue('Test Title');
      await wrapper.find('#context').setValue('This is a test context that is long enough to pass validation.');
      await wrapper.find('#decision').setValue('This is a test decision that is long enough to pass validation.');
      await wrapper.find('#consequences').setValue('These are test consequences.');
      await wrapper.find('#author').setValue('Test Author');

      // Mock the save process to be async
      wrapper.vm.isSaving = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.find('.btn-primary').text()).toContain('Saving...');
      expect(wrapper.find('.btn-primary').element.disabled).toBe(true);
    });

    it('should disable buttons during save', async () => {
      wrapper.vm.isSaving = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.btn-primary').element.disabled).toBe(true);
      expect(wrapper.find('.btn-secondary').element.disabled).toBe(true);
      if (wrapper.find('.btn-danger').exists()) {
        expect(wrapper.find('.btn-danger').element.disabled).toBe(true);
      }
    });
  });

  describe('Prop Watching', () => {
    it('should update form when adr prop changes', async () => {
      wrapper = mount(ADREditor, {
        props: {
          mode: 'edit',
          adr: mockADR
        }
      });

      const updatedADR = {
        ...mockADR,
        title: 'Updated Title',
        status: 'accepted'
      };

      await wrapper.setProps({ adr: updatedADR });

      expect(wrapper.find('#title').element.value).toBe('Updated Title');
      expect(wrapper.find('#status').element.value).toBe('accepted');
    });
  });
});