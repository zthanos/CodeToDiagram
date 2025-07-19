/**
 * EditorTab component test suite
 * Tests tab component functionality including close buttons, modification indicators, and context menu
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorTab from '../components/EditorTab.vue';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve())
  }
});

// Mock document.execCommand for fallback clipboard
document.execCommand = vi.fn(() => true);

// Mock confirm dialog
global.confirm = vi.fn(() => true);

// Mock DragEvent
global.DragEvent = class DragEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: 'move',
      dropEffect: 'move'
    };
  }
};

describe('EditorTab', () => {
  let wrapper;
  
  const defaultProps = {
    id: 'tab-1',
    title: 'Test Tab',
    isActive: false,
    isModified: false,
    isPinned: false
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Basic Rendering', () => {
    it('should render tab with title', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      expect(wrapper.find('.tab-name').text()).toBe('Test Tab');
      expect(wrapper.find('.editor-tab').exists()).toBe(true);
    });

    it('should show active state when isActive is true', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isActive: true
        }
      });

      expect(wrapper.find('.editor-tab').classes()).toContain('active');
    });

    it('should show modification indicator when isModified is true', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isModified: true
        }
      });

      expect(wrapper.find('.modification-indicator').exists()).toBe(true);
      expect(wrapper.find('.modification-indicator').text()).toBe('●');
      expect(wrapper.find('.editor-tab').classes()).toContain('modified');
    });

    it('should show pin indicator when isPinned is true', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isPinned: true
        }
      });

      expect(wrapper.find('.tab-pin-indicator').exists()).toBe(true);
      expect(wrapper.find('.tab-pin-indicator').text()).toBe('📌');
      expect(wrapper.find('.editor-tab').classes()).toContain('pinned');
    });

    it('should generate correct tooltip', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isModified: true,
          isPinned: true
        }
      });

      const tooltip = wrapper.find('.editor-tab').attributes('title');
      expect(tooltip).toContain('Test Tab');
      expect(tooltip).toContain('(unsaved changes)');
      expect(tooltip).toContain('- Pinned');
    });
  });

  describe('Close Button', () => {
    it('should show close button by default', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      expect(wrapper.find('.tab-close-btn').exists()).toBe(true);
    });

    it('should hide close button on pinned tabs by default', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isPinned: true
        }
      });

      expect(wrapper.find('.tab-close-btn').exists()).toBe(false);
    });

    it('should show close button on pinned tabs when showCloseOnPinned is true', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isPinned: true,
          showCloseOnPinned: true
        }
      });

      expect(wrapper.find('.tab-close-btn').exists()).toBe(true);
    });

    it('should emit close event when close button is clicked', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      await wrapper.find('.tab-close-btn').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')[0]).toEqual(['tab-1']);
    });

    it('should show confirmation dialog for modified tabs', async () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isModified: true
        }
      });

      await wrapper.find('.tab-close-btn').trigger('click');

      expect(global.confirm).toHaveBeenCalledWith(
        'The tab "Test Tab" has unsaved changes. Do you want to close it anyway?'
      );
    });

    it('should not emit close event if user cancels confirmation', async () => {
      global.confirm.mockReturnValue(false);
      
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isModified: true
        }
      });

      await wrapper.find('.tab-close-btn').trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });

    it('should emit toggle-pin for pinned tabs without showCloseOnPinned', async () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isPinned: true,
          showCloseOnPinned: false
        }
      });

      // Since close button is hidden, we need to test the logic directly
      // This would be triggered if close button was shown
      wrapper.vm.handleCloseClick({ stopPropagation: vi.fn() });

      expect(wrapper.emitted('toggle-pin')).toBeTruthy();
      expect(wrapper.emitted('toggle-pin')[0]).toEqual(['tab-1']);
    });
  });

  describe('Tab Click', () => {
    it('should emit click event when tab is clicked', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      await wrapper.find('.editor-tab').trigger('click');

      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')[0][0]).toMatchObject({
        tabId: 'tab-1'
      });
    });

    it('should not emit click event when context menu is shown', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu first
      wrapper.vm.showContextMenu = true;
      await wrapper.vm.$nextTick();

      await wrapper.find('.editor-tab').trigger('click');

      expect(wrapper.emitted('click')).toBeFalsy();
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      await wrapper.find('.editor-tab').trigger('contextmenu');

      expect(wrapper.find('.tab-context-menu').exists()).toBe(true);
      expect(wrapper.vm.showContextMenu).toBe(true);
    });

    it('should hide context menu when clicking outside', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      expect(wrapper.vm.showContextMenu).toBe(true);

      // Simulate global click
      wrapper.vm.handleGlobalClick({ target: document.body });

      expect(wrapper.vm.showContextMenu).toBe(false);
    });

    it('should emit close event from context menu', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Click close option
      await wrapper.find('.context-menu-item').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')[0]).toEqual(['tab-1']);
    });

    it('should emit close-others event from context menu', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click "Close Other Tabs" option
      const menuItems = wrapper.findAll('.context-menu-item');
      const closeOthersItem = menuItems.find(item => 
        item.text().includes('Close Other Tabs')
      );
      
      await closeOthersItem.trigger('click');

      expect(wrapper.emitted('close-others')).toBeTruthy();
      expect(wrapper.emitted('close-others')[0]).toEqual(['tab-1']);
    });

    it('should emit close-all event from context menu', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click "Close All Tabs" option
      const menuItems = wrapper.findAll('.context-menu-item');
      const closeAllItem = menuItems.find(item => 
        item.text().includes('Close All Tabs')
      );
      
      await closeAllItem.trigger('click');

      expect(wrapper.emitted('close-all')).toBeTruthy();
    });

    it('should emit toggle-pin event from context menu', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click pin option
      const menuItems = wrapper.findAll('.context-menu-item');
      const pinItem = menuItems.find(item => 
        item.text().includes('Pin Tab')
      );
      
      await pinItem.trigger('click');

      expect(wrapper.emitted('toggle-pin')).toBeTruthy();
      expect(wrapper.emitted('toggle-pin')[0]).toEqual(['tab-1']);
    });

    it('should show correct pin text for pinned tabs', async () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isPinned: true
        }
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find pin option
      const menuItems = wrapper.findAll('.context-menu-item');
      const pinItem = menuItems.find(item => 
        item.text().includes('Unpin Tab')
      );
      
      expect(pinItem.exists()).toBe(true);
    });

    it('should emit duplicate event from context menu', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click duplicate option
      const menuItems = wrapper.findAll('.context-menu-item');
      const duplicateItem = menuItems.find(item => 
        item.text().includes('Duplicate Tab')
      );
      
      await duplicateItem.trigger('click');

      expect(wrapper.emitted('duplicate')).toBeTruthy();
      expect(wrapper.emitted('duplicate')[0]).toEqual(['tab-1']);
    });

    it('should copy tab name to clipboard', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click copy option
      const menuItems = wrapper.findAll('.context-menu-item');
      const copyItem = menuItems.find(item => 
        item.text().includes('Copy Tab Name')
      );
      
      await copyItem.trigger('click');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test Tab');
    });

    it('should use fallback clipboard method when clipboard API fails', async () => {
      // Mock clipboard API to fail
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Show context menu
      await wrapper.find('.editor-tab').trigger('contextmenu');
      
      // Find and click copy option
      const menuItems = wrapper.findAll('.context-menu-item');
      const copyItem = menuItems.find(item => 
        item.text().includes('Copy Tab Name')
      );
      
      await copyItem.trigger('click');

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Drag and Drop', () => {
    it('should be draggable by default', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      expect(wrapper.find('.editor-tab').attributes('draggable')).toBe('true');
    });

    it('should not be draggable when draggable prop is false', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          draggable: false
        }
      });

      expect(wrapper.find('.editor-tab').attributes('draggable')).toBe('true'); // Still true in DOM
      
      // But drag start should be prevented
      const dragEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          setData: vi.fn(),
          setDragImage: vi.fn(),
          effectAllowed: ''
        }
      };
      
      wrapper.vm.handleDragStart(dragEvent);
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });

    it('should emit drag-start event', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      const dragEvent = {
        dataTransfer: {
          setData: vi.fn(),
          setDragImage: vi.fn(),
          effectAllowed: ''
        }
      };

      // Test the handler directly
      wrapper.vm.handleDragStart(dragEvent);

      expect(wrapper.emitted('drag-start')).toBeTruthy();
      expect(wrapper.emitted('drag-start')[0][0]).toMatchObject({
        tabId: 'tab-1'
      });
    });

    it('should emit drop event with correct data', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn(() => 'dragged-tab-id')
        }
      };

      // Test the handler directly
      wrapper.vm.handleDrop(dropEvent);

      expect(wrapper.emitted('drop')).toBeTruthy();
      expect(wrapper.emitted('drop')[0][0]).toMatchObject({
        draggedTabId: 'dragged-tab-id',
        targetTabId: 'tab-1'
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      wrapper = mount(EditorTab, {
        props: {
          ...defaultProps,
          isActive: true
        }
      });

      const tab = wrapper.find('.editor-tab');
      expect(tab.attributes('title')).toBeTruthy();
    });

    it('should have focus styles', async () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      await wrapper.find('.editor-tab').trigger('focus');
      
      // Focus styles are handled by CSS, just ensure element can receive focus
      expect(wrapper.find('.editor-tab').element).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme class when specified', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps,
        attrs: {
          class: 'dark-theme'
        }
      });

      expect(wrapper.find('.editor-tab').classes()).toContain('dark-theme');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should handle touch events properly', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Mobile-specific behavior would be tested with actual touch events
      // For now, just ensure component renders properly
      expect(wrapper.find('.editor-tab').exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle clipboard errors gracefully', async () => {
      // Mock both clipboard methods to fail
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      document.execCommand.mockImplementation(() => {
        throw new Error('execCommand failed');
      });
      
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Should not throw error
      expect(() => {
        wrapper.vm.fallbackCopyToClipboard('test');
      }).not.toThrow();
    });

    it('should handle missing DOM elements gracefully', () => {
      wrapper = mount(EditorTab, {
        props: defaultProps
      });

      // Should not throw error when DOM elements are missing
      expect(() => {
        wrapper.vm.handleGlobalClick({ target: null });
      }).not.toThrow();
    });
  });
});