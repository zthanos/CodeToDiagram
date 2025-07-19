/**
 * TabbedEditor component test suite
 * Tests integration of TabManager, TabBar, and MermaidRenderer within tabs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TabbedEditor from '../components/TabbedEditor.vue';
import { TabManager } from '../services/TabManager.ts';

// Mock TabManager
vi.mock('../services/TabManager.ts', () => ({
  TabManager: {
    getInstance: vi.fn(() => ({
      openTab: vi.fn(),
      closeTab: vi.fn(),
      switchToTab: vi.fn(),
      closeOtherTabs: vi.fn(),
      closeAllTabs: vi.fn(),
      toggleTabPin: vi.fn(),
      reorderTab: vi.fn(),
      updateTabEditorState: vi.fn(),
      setTabModified: vi.fn(),
      getOpenTabs: vi.fn(() => []),
      getActiveTabId: vi.fn(() => null),
      getTab: vi.fn(),
      hasUnsavedChanges: vi.fn(() => false),
      cleanup: vi.fn()
    }))
  }
}));

// Mock MermaidRenderer component
const MockMermaidRenderer = {
  name: 'MermaidRenderer',
  props: [
    'theme', 
    'initial-content', 
    'initial-cursor-position', 
    'initial-scroll-position'
  ],
  emits: [
    'update:theme',
    'content-changed',
    'cursor-changed', 
    'scroll-changed',
    'editor-ready'
  ],
  template: '<div class="mock-mermaid-renderer">Mock Mermaid Renderer</div>',
  methods: {
    initCodeMirror: vi.fn(),
    setContent: vi.fn(),
    recalculateEditorHeight: vi.fn()
  }
};

// Mock TabBar component
const MockTabBar = {
  name: 'TabBar',
  props: [
    'tabs',
    'active-tab-id',
    'theme',
    'show-close-on-pinned',
    'max-visible-tabs'
  ],
  emits: [
    'tab-click',
    'tab-close',
    'tab-close-others',
    'tab-close-all',
    'tab-toggle-pin',
    'tab-duplicate',
    'tab-reorder',
    'new-tab',
    'close-unmodified-tabs'
  ],
  template: '<div class="mock-tab-bar">Mock Tab Bar</div>'
};

describe('TabbedEditor', () => {
  let wrapper;
  let mockTabManager;
  
  const mockDiagrams = [
    {
      id: 'diagram-1',
      name: 'Diagram 1',
      content: 'graph TD\nA --> B',
      isModified: false,
      metadata: {
        lastCursorPosition: { line: 0, column: 0 },
        lastScrollPosition: { top: 0, left: 0 }
      }
    },
    {
      id: 'diagram-2',
      name: 'Diagram 2',
      content: 'sequenceDiagram\nA->>B: Hello',
      isModified: true,
      metadata: {
        lastCursorPosition: { line: 1, column: 5 },
        lastScrollPosition: { top: 10, left: 0 }
      }
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock TabManager instance
    mockTabManager = {
      openTab: vi.fn(),
      closeTab: vi.fn(),
      switchToTab: vi.fn(),
      closeOtherTabs: vi.fn(),
      closeAllTabs: vi.fn(),
      toggleTabPin: vi.fn(),
      reorderTab: vi.fn(),
      updateTabEditorState: vi.fn(),
      setTabModified: vi.fn(),
      getOpenTabs: vi.fn(() => []),
      getActiveTabId: vi.fn(() => null),
      getTab: vi.fn(),
      hasUnsavedChanges: vi.fn(() => false),
      cleanup: vi.fn()
    };
    
    TabManager.getInstance.mockReturnValue(mockTabManager);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Initialization', () => {
    it('should render with empty state when no tabs are open', async () => {
      wrapper = mount(TabbedEditor, {
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-content h3').text()).toBe('No tabs open');
    });

    it('should initialize TabManager with correct options', async () => {
      wrapper = mount(TabbedEditor, {
        props: {
          autoSave: true,
          autoSaveInterval: 15000
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();

      expect(TabManager.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTabs: 20,
          autoSave: true,
          autoSaveInterval: 15000,
          persistState: true
        }),
        expect.any(Object)
      );
    });

    it('should initialize with diagrams from props', async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      mockTabManager.openTab.mockReturnValue(mockTab);
      mockTabManager.getOpenTabs.mockReturnValue([mockTab]);
      mockTabManager.getActiveTabId.mockReturnValue('tab-1');

      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams,
          activeDiagramId: 'diagram-1'
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();

      expect(mockTabManager.openTab).toHaveBeenCalledWith(mockDiagrams[0]);
    });
  });

  describe('Tab Management', () => {
    beforeEach(async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      mockTabManager.openTab.mockReturnValue(mockTab);
      mockTabManager.getOpenTabs.mockReturnValue([mockTab]);
      mockTabManager.getActiveTabId.mockReturnValue('tab-1');

      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
    });

    it('should handle tab click events', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('tab-click', { tabId: 'tab-1' });

      expect(mockTabManager.switchToTab).toHaveBeenCalledWith('tab-1');
    });

    it('should handle tab close events', async () => {
      mockTabManager.closeTab.mockReturnValue(true);
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('tab-close', 'tab-1');

      expect(mockTabManager.closeTab).toHaveBeenCalledWith('tab-1');
      expect(wrapper.emitted('tab-closed')).toBeTruthy();
    });

    it('should handle close other tabs', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('tab-close-others', 'tab-1');

      expect(mockTabManager.closeOtherTabs).toHaveBeenCalledWith('tab-1');
    });

    it('should handle close all tabs', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('tab-close-all');

      expect(mockTabManager.closeAllTabs).toHaveBeenCalled();
    });

    it('should handle tab pin toggle', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('tab-toggle-pin', 'tab-1');

      expect(mockTabManager.toggleTabPin).toHaveBeenCalledWith('tab-1');
    });

    it('should handle tab reordering', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      const reorderEvent = {
        tabId: 'tab-1',
        fromIndex: 0,
        toIndex: 1
      };
      
      await tabBar.vm.$emit('tab-reorder', reorderEvent);

      expect(mockTabManager.reorderTab).toHaveBeenCalledWith('tab-1', 1);
    });

    it('should handle new tab request', async () => {
      const tabBar = wrapper.findComponent(MockTabBar);
      
      await tabBar.vm.$emit('new-tab');

      expect(wrapper.emitted('new-diagram-requested')).toBeTruthy();
      expect(wrapper.emitted('new-diagram-requested')[0][0]).toEqual({
        name: 'New Diagram'
      });
    });
  });

  describe('Content Management', () => {
    beforeEach(async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      mockTabManager.openTab.mockReturnValue(mockTab);
      mockTabManager.getOpenTabs.mockReturnValue([mockTab]);
      mockTabManager.getActiveTabId.mockReturnValue('tab-1');

      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
    });

    it('should handle content changes', async () => {
      const newContent = 'graph TD\nA --> B --> C';
      
      await wrapper.vm.handleContentChanged('tab-1', newContent);

      expect(mockTabManager.updateTabEditorState).toHaveBeenCalledWith('tab-1', {
        content: newContent
      });
      expect(mockTabManager.setTabModified).toHaveBeenCalledWith('tab-1', true);
      expect(wrapper.emitted('diagram-content-changed')).toBeTruthy();
    });

    it('should handle cursor position changes', async () => {
      const cursorPosition = { line: 2, column: 5 };
      
      await wrapper.vm.handleCursorChanged('tab-1', cursorPosition);

      expect(mockTabManager.updateTabEditorState).toHaveBeenCalledWith('tab-1', {
        cursorPosition
      });
      expect(wrapper.emitted('diagram-cursor-changed')).toBeTruthy();
    });

    it('should handle scroll position changes', async () => {
      const scrollPosition = { top: 100, left: 0 };
      
      await wrapper.vm.handleScrollChanged('tab-1', scrollPosition);

      expect(mockTabManager.updateTabEditorState).toHaveBeenCalledWith('tab-1', {
        scrollPosition
      });
      expect(wrapper.emitted('diagram-scroll-changed')).toBeTruthy();
    });
  });

  describe('Diagram Changes', () => {
    it('should handle diagram additions', async () => {
      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: []
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
      wrapper.vm.initializationComplete = true;

      // Add diagrams
      await wrapper.setProps({
        diagrams: mockDiagrams
      });

      // Should not automatically open tabs for new diagrams
      expect(mockTabManager.openTab).not.toHaveBeenCalled();
    });

    it('should handle diagram removals', async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      mockTabManager.getOpenTabs.mockReturnValue([mockTab]);
      mockTabManager.closeTab.mockReturnValue(true);

      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
      wrapper.vm.initializationComplete = true;

      // Remove first diagram
      await wrapper.setProps({
        diagrams: [mockDiagrams[1]]
      });

      expect(mockTabManager.closeTab).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('Public API', () => {
    beforeEach(async () => {
      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
    });

    it('should provide openDiagram method', async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false
      };

      mockTabManager.openTab.mockReturnValue(mockTab);

      await wrapper.vm.openDiagram(mockDiagrams[0]);

      expect(mockTabManager.openTab).toHaveBeenCalledWith(mockDiagrams[0]);
    });

    it('should provide closeDiagram method', async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      // Set up the component's openTabs to include the mock tab
      wrapper.vm.openTabs = [mockTab];
      mockTabManager.closeTab.mockReturnValue(true);

      await wrapper.vm.closeDiagram('diagram-1');

      expect(mockTabManager.closeTab).toHaveBeenCalledWith('tab-1');
    });

    it('should provide switchToDiagram method', async () => {
      const mockTab = {
        id: 'tab-1',
        diagramId: 'diagram-1',
        title: 'Diagram 1',
        isActive: true,
        isModified: false,
        isPinned: false,
        editorState: {
          content: 'graph TD\nA --> B',
          cursorPosition: { line: 0, column: 0 },
          scrollPosition: { top: 0, left: 0 }
        }
      };

      // Set up the component's openTabs to include the mock tab
      wrapper.vm.openTabs = [mockTab];

      await wrapper.vm.switchToDiagram('diagram-1');

      expect(mockTabManager.switchToTab).toHaveBeenCalledWith('tab-1');
    });

    it('should provide hasUnsavedChanges method', () => {
      mockTabManager.hasUnsavedChanges.mockReturnValue(true);

      const result = wrapper.vm.hasUnsavedChanges();

      expect(result).toBe(true);
      expect(mockTabManager.hasUnsavedChanges).toHaveBeenCalled();
    });
  });

  describe('Theme Support', () => {
    it('should apply dark theme class', async () => {
      wrapper = mount(TabbedEditor, {
        props: {
          theme: 'dark'
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      expect(wrapper.find('.tabbed-editor').classes()).toContain('dark-theme');
    });

    it('should pass theme to child components', async () => {
      wrapper = mount(TabbedEditor, {
        props: {
          theme: 'dark',
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      const tabBar = wrapper.findComponent(MockTabBar);
      expect(tabBar.props('theme')).toBe('dark');
    });
  });

  describe('Loading States', () => {
    it('should show loading overlay when loading', async () => {
      wrapper = mount(TabbedEditor, {
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      wrapper.vm.isLoading = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('.loading-text').text()).toBe('Loading editor...');
    });
  });

  describe('Error Handling', () => {
    it('should handle TabManager initialization errors gracefully', async () => {
      TabManager.getInstance.mockImplementation(() => {
        throw new Error('TabManager initialization failed');
      });

      // Should not throw
      expect(() => {
        wrapper = mount(TabbedEditor, {
          global: {
            components: {
              TabBar: MockTabBar,
              MermaidRenderer: MockMermaidRenderer
            }
          }
        });
      }).not.toThrow();
    });

    it('should handle diagram opening errors gracefully', async () => {
      mockTabManager.openTab.mockImplementation(() => {
        throw new Error('Failed to open tab');
      });

      wrapper = mount(TabbedEditor, {
        props: {
          diagrams: mockDiagrams
        },
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      // Should not throw
      expect(async () => {
        await wrapper.vm.openDiagramTab('diagram-1');
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup TabManager on unmount', async () => {
      wrapper = mount(TabbedEditor, {
        global: {
          components: {
            TabBar: MockTabBar,
            MermaidRenderer: MockMermaidRenderer
          }
        }
      });

      await wrapper.vm.$nextTick();
      wrapper.unmount();

      expect(mockTabManager.cleanup).toHaveBeenCalled();
    });
  });
});