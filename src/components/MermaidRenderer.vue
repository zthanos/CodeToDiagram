<template>
  <div class="mermaid-editor">
    <!-- Notification area -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <span class="notification-icon">{{ notification.icon }}</span>
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="hideNotification">×</button>
    </div>

    <div class="split-pane" :style="{ height: '100%' }">
      <div class="pane editor-pane" :style="{ width: leftWidth + '%' }">
        <!-- Editor toolbar with file operations and theme selection -->
        <div class="editor-toolbar">
          <div class="toolbar-section file-info">
            <div class="current-file-display">
              <span class="file-icon">📄</span>
              <span class="file-name">
                {{ currentFileName || 'Untitled Document' }}
                <span v-if="isFileModified" class="modified-dot" title="File has unsaved changes">●</span>
              </span>
              <span v-if="!isFileSystemAccessSupported()" class="compatibility-badge"
                title="Advanced file features not supported in this browser">
                Limited
              </span>
            </div>
          </div>

          <div class="toolbar-section file-operations">
            <button class="toolbar-btn" @click="loadFileWithErrorHandling" title="Load File (Ctrl+O)">
              📁 Load
            </button>
            <button class="toolbar-btn" @click="saveFileWithErrorHandling" title="Save File (Ctrl+S)">
              💾 Save
            </button>
            <button class="toolbar-btn" @click="saveDiagram" title="Save to Browser Storage">
              🗃️ Store
            </button>
            <button class="toolbar-btn" @click="loadDiagram" title="Load from Browser Storage">
              📋 Restore
            </button>
            <button class="toolbar-btn" @click="exportImageWithErrorHandling" title="Export as PNG">
              🖼️ Export
            </button>
          </div>

          <div class="toolbar-section theme-selection">
            <label class="theme-label">Theme:</label>
            <select class="theme-select" :value="theme" @change="$emit('update:theme', $event.target.value)">
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="forest">Forest</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        <div ref="editor" class="mermaid-codemirror"></div>
      </div>
      <div class="split-bar" @mousedown="startDrag"></div>
      <div class="pane diagram-pane" :style="{ width: (100 - leftWidth) + '%' }">
        <div class="diagram-container" :class="themeClass">
          <div class="mermaid" ref="diagramContainer"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import mermaid from 'mermaid';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { mermaid as mermaidLang, mermaidTags, flowchartTags, sequenceTags, pieTags, ganttTags } from 'codemirror-lang-mermaid';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export default defineComponent({
  name: 'MermaidEditor',
  props: {
    theme: {
      type: String,
      default: ''
    },
    initialContent: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      // Existing properties
      mermaidText: '',
      debounceTimer: null,
      leftWidth: 50, // Changed from 30 to 50 for better editor visibility
      dragging: false,
      dragStartX: 0,
      dragStartWidth: 50, // Updated to match new default
      editorView: null,

      // New auto-save properties
      autoSaveTimer: null,
      autoSaveKey: 'mermaid-autosave-content',

      // New file management properties
      currentFileName: null,
      currentFileHandle: null, // File System Access API handle
      isFileModified: false,
      lastSavedContent: '',
      currentFileHash: null, // Current file hash for localStorage operations

      // ResizeObserver for dynamic height updates
      resizeObserver: null,
      resizeDebounceTimer: null,
      windowResizeHandler: null,

      // Notification system
      notification: {
        show: false,
        message: '',
        type: 'info',
        icon: 'ℹ️',
        timeout: null
      },

      // Mobile responsiveness properties
      isMobile: false,
      isLandscape: false,
      screenWidth: 0,
      touchStartY: 0,
      touchStartHeight: 0,

      // localStorage fallback
      memoryStorage: null
    }
  },
  computed: {
    themeClass() {
      return `mermaid-theme-${this.theme || 'default'}`;
    }
  },
  watch: {
    initialContent: {
      immediate: true,
      handler(newContent) {
        this.setEditorContent(newContent ?? '');
      }
    },
    theme: {
      immediate: true,
      handler(newTheme) {
        this.$nextTick(() => {
          if (window.mermaid) {
            window.mermaid.initialize({
              startOnLoad: false,
              theme: newTheme || 'default',
              securityLevel: 'loose'
            });
            this.renderDiagram();
          }

          // Update CodeMirror theme and syntax highlighting
          this.updateEditorTheme(newTheme);
        });
      }
    }
  },
  mounted() {
    try {
      // Initialize Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: this.theme || 'default',
        securityLevel: 'loose'
      });
      ;
      // Check browser compatibility first
      this.validateBrowserCompatibility();

      // Initialize all new features in proper order
      this.initCodeMirrorWithErrorHandling();
      this.initResizeObserver();
      // this.initAutoSave();
      this.initKeyboardShortcuts();
      this.initFileSystemFeatures();
      this.initMobileResponsiveness();

      // Initialize existing drag functionality
      window.addEventListener('mousemove', this.onDrag);
      window.addEventListener('mouseup', this.stopDrag);

      // Initialize notification cleanup
      this.initNotificationSystem();

      console.log('MermaidRenderer component mounted successfully with all features');

    } catch (error) {
      console.error('Error during component mounting:', error);
      this.showErrorMessage('Failed to initialize the editor. Please refresh the page and try again.');
    }
  },
  beforeUnmount() {
    try {
      // Clean up window event listeners
      window.removeEventListener('mousemove', this.onDrag);
      window.removeEventListener('mouseup', this.stopDrag);

      // Clean up CodeMirror editor
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null;
      }

      // Clean up auto-save timer
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }

      // Clean up debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // Clean up notification timeout
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
        this.notification.timeout = null;
      }

      // Clean up ResizeObserver
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      // Clean up resize-related timers
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer);
        this.resizeDebounceTimer = null;
      }

      // Clean up window resize handler
      if (this.windowResizeHandler) {
        window.removeEventListener('resize', this.windowResizeHandler);
        this.windowResizeHandler = null;
      }

      // Clean up File System API handles (they don't need explicit cleanup but good practice)
      this.currentFileHandle = null;

      // Clean up beforeunload event listener
      window.removeEventListener('beforeunload', this.handleBeforeUnload);

      // Clean up keyboard event listeners if any were added globally
      this.cleanupKeyboardShortcuts();

      // Clean up mobile responsiveness event listeners
      window.removeEventListener('orientationchange', this.handleOrientationChange);

      // Clean up touch event listeners
      const splitBar = this.$el?.querySelector('.split-bar');
      if (splitBar) {
        splitBar.removeEventListener('touchstart', this.handleTouchStart);
        splitBar.removeEventListener('touchmove', this.handleTouchMove);
        splitBar.removeEventListener('touchend', this.handleTouchEnd);
      }

      // Clean up manual height interval if it exists
      if (this.manualHeightInterval) {
        clearInterval(this.manualHeightInterval);
        this.manualHeightInterval = null;
      }

      // Clean up any remaining timers or intervals
      this.cleanupAllTimers();

      console.log('MermaidRenderer component unmounted and cleaned up successfully');

    } catch (error) {
      console.error('Error during component cleanup:', error);
      // Continue with cleanup even if some parts fail
    }
  },
  methods: {
    initCodeMirror() {
      const self = this;

      // Custom keymap for keyboard shortcuts
      const customKeymap = keymap.of([
        indentWithTab,
        {
          key: 'Ctrl-s',
          mac: 'Cmd-s',
          run: () => {
            self.handleKeyboardShortcuts({ ctrlKey: true, key: 's', preventDefault: () => { } });
            return true; // Prevent default behavior
          }
        }
      ]);

      // Create theme-aware Mermaid syntax highlighting with error handling
      const mermaidHighlighting = this.createMermaidSyntaxHighlighting();

      // Create Mermaid language extension with error handling
      const mermaidLanguage = this.createMermaidLanguageExtension();

      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.mermaidText,
          extensions: [
            basicSetup,
            mermaidLanguage, // Use enhanced Mermaid language support
            this.theme === 'dark' ? oneDark : [], // Apply dark theme conditionally
            mermaidHighlighting, // Apply Mermaid-specific syntax highlighting
            customKeymap,
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                self.mermaidText = update.state.doc.toString();
                self.renderWithDebounce();
                self.autoSaveContent();
                self.updateFileState(); // Track file modifications
              }
            })
          ]
        }),
        parent: this.$refs.editor
      });
    },

    createMermaidLanguageExtension() {
      // Create Mermaid language extension with enhanced error handling
      try {
        const langExtension = mermaidLang();
        console.log('Mermaid language extension created successfully');
        return langExtension;
      } catch (error) {
        console.error('Error creating Mermaid language extension:', error);
        console.warn('Falling back to markdown language support');

        // Fallback to markdown if Mermaid language fails
        try {
          return markdown();
        } catch (fallbackError) {
          console.error('Error creating markdown fallback:', fallbackError);
          // Return empty extension as last resort
          return [];
        }
      }
    },

    createMermaidSyntaxHighlighting() {
      // Create theme-aware syntax highlighting for Mermaid diagrams
      try {
        // Define color schemes based on current theme
        const isDarkTheme = this.theme === 'dark';

        // Enhanced color palette for better visual distinction
        const colors = {
          // Primary colors
          diagramType: isDarkTheme ? '#9650c8' : '#6f42c1',    // Purple for diagram types
          keyword: isDarkTheme ? '#569cd6' : '#0969da',        // Blue for keywords
          string: isDarkTheme ? '#ce9178' : '#032f62',         // Orange/brown for strings
          number: isDarkTheme ? '#b5cea8' : '#0550ae',         // Green for numbers
          comment: isDarkTheme ? '#6a9955' : '#6e7781',        // Gray for comments
          operator: isDarkTheme ? '#d4d4d4' : '#24292f',       // Light gray for operators

          // Specialized colors
          nodeId: isDarkTheme ? '#4ec9b0' : '#0969da',         // Cyan for node IDs
          nodeText: isDarkTheme ? '#ce9178' : '#032f62',       // Orange for node text
          edge: isDarkTheme ? '#c586c0' : '#8250df',           // Pink for edges/arrows
          edgeText: isDarkTheme ? '#9cdcfe' : '#0550ae',       // Light blue for edge labels
          participant: isDarkTheme ? '#4ec9b0' : '#0969da',    // Cyan for participants
          message: isDarkTheme ? '#ce9178' : '#032f62',        // Orange for messages
          title: isDarkTheme ? '#569cd6' : '#0969da',          // Blue for titles
        };

        // Create comprehensive highlight style with enhanced coverage
        const highlightStyle = HighlightStyle.define([
          // General Mermaid syntax highlighting using standard tags
          { tag: t.typeName, color: colors.diagramType },
          { tag: t.keyword, color: colors.keyword },
          { tag: t.string, color: colors.string },
          { tag: t.number, color: colors.number },
          { tag: t.lineComment, color: colors.comment },
          { tag: t.operator, color: colors.operator },
          { tag: t.variableName, color: colors.nodeId },
          { tag: t.propertyName, color: colors.nodeText },

          // General Mermaid tags
          { tag: mermaidTags.diagramName, color: colors.diagramType, fontWeight: 'bold' },

          // Flowchart-specific highlighting with comprehensive coverage
          { tag: flowchartTags.diagramName, color: colors.diagramType, fontWeight: 'bold' },
          { tag: flowchartTags.keyword, color: colors.keyword },
          { tag: flowchartTags.nodeId, color: colors.nodeId, fontWeight: '500' },
          { tag: flowchartTags.nodeText, color: colors.nodeText },
          { tag: flowchartTags.nodeEdge, color: colors.edge, fontWeight: '500' },
          { tag: flowchartTags.nodeEdgeText, color: colors.edgeText },
          { tag: flowchartTags.orientation, color: colors.keyword, fontWeight: 'bold' },
          { tag: flowchartTags.link, color: colors.edge },
          { tag: flowchartTags.string, color: colors.string },
          { tag: flowchartTags.number, color: colors.number },
          { tag: flowchartTags.lineComment, color: colors.comment, fontStyle: 'italic' },

          // Sequence diagram-specific highlighting with full coverage
          { tag: sequenceTags.diagramName, color: colors.diagramType, fontWeight: 'bold' },
          { tag: sequenceTags.arrow, color: colors.edge, fontWeight: '500' },
          { tag: sequenceTags.messageText1, color: colors.message },
          { tag: sequenceTags.messageText2, color: colors.edgeText },
          { tag: sequenceTags.nodeText, color: colors.participant, fontWeight: '500' },
          { tag: sequenceTags.position, color: colors.keyword },
          { tag: sequenceTags.keyword1, color: colors.keyword },
          { tag: sequenceTags.keyword2, color: colors.keyword },
          { tag: sequenceTags.lineComment, color: colors.comment, fontStyle: 'italic' },

          // Pie chart-specific highlighting with complete coverage
          { tag: pieTags.diagramName, color: colors.diagramType, fontWeight: 'bold' },
          { tag: pieTags.title, color: colors.keyword, fontWeight: 'bold' },
          { tag: pieTags.titleText, color: colors.title },
          { tag: pieTags.showData, color: colors.keyword },
          { tag: pieTags.string, color: colors.string },
          { tag: pieTags.number, color: colors.number },
          { tag: pieTags.lineComment, color: colors.comment, fontStyle: 'italic' },

          // Gantt chart-specific highlighting with full coverage
          { tag: ganttTags.diagramName, color: colors.diagramType, fontWeight: 'bold' },
          { tag: ganttTags.keyword, color: colors.keyword },
          { tag: ganttTags.string, color: colors.string },
          { tag: ganttTags.lineComment, color: colors.comment, fontStyle: 'italic' },
        ]);

        return syntaxHighlighting(highlightStyle);
      } catch (error) {
        console.error('Error creating Mermaid syntax highlighting:', error);
        // Enhanced fallback: try to create basic highlighting
        try {
          const basicHighlightStyle = HighlightStyle.define([
            { tag: t.keyword, color: this.theme === 'dark' ? '#569cd6' : '#0969da' },
            { tag: t.string, color: this.theme === 'dark' ? '#ce9178' : '#032f62' },
            { tag: t.lineComment, color: this.theme === 'dark' ? '#6a9955' : '#6e7781' },
          ]);
          console.warn('Using basic syntax highlighting fallback');
          return syntaxHighlighting(basicHighlightStyle);
        } catch (fallbackError) {
          console.error('Error creating fallback syntax highlighting:', fallbackError);
          return [];
        }
      }
    },

    updateEditorTheme(newTheme) {
      // Update CodeMirror theme and syntax highlighting when theme changes
      try {
        if (this.editorView) {
          // Create new theme-aware syntax highlighting
          const newMermaidHighlighting = this.createMermaidSyntaxHighlighting();

          // Create Mermaid language extension with error handling
          const mermaidLanguage = this.createMermaidLanguageExtension();

          // Reconfigure the editor with new theme and highlighting
          this.editorView.dispatch({
            effects: [
              // Remove old theme extensions and add new ones
              this.editorView.state.reconfigure([
                basicSetup,
                mermaidLanguage, // Use enhanced Mermaid language support
                newTheme === 'dark' ? oneDark : [], // Apply dark theme conditionally
                newMermaidHighlighting, // Apply updated Mermaid syntax highlighting
                keymap.of([
                  indentWithTab,
                  {
                    key: 'Ctrl-s',
                    mac: 'Cmd-s',
                    run: () => {
                      this.handleKeyboardShortcuts({ ctrlKey: true, key: 's', preventDefault: () => { } });
                      return true;
                    }
                  }
                ]),
                EditorView.updateListener.of(update => {
                  if (update.docChanged) {
                    this.mermaidText = update.state.doc.toString();
                    this.renderWithDebounce();
                    this.autoSaveContent();
                    this.updateFileState();
                  }
                })
              ])
            ]
          });

          console.log(`Updated CodeMirror theme to: ${newTheme} with enhanced Mermaid support`);
        }
      } catch (error) {
        console.error('Error updating editor theme:', error);
        // Continue with existing theme if update fails
      }
    },

    // New initialization methods for enhanced lifecycle management
    initKeyboardShortcuts() {
      // Initialize global keyboard shortcuts if needed
      // Most keyboard shortcuts are handled within CodeMirror keymap
      // This method is for any additional global shortcuts
      try {
        // Add global keyboard event listener for shortcuts that need to work outside the editor
        document.addEventListener('keydown', this.handleGlobalKeyboardShortcuts);
        console.log('Keyboard shortcuts initialized');
      } catch (error) {
        console.error('Error initializing keyboard shortcuts:', error);
        // Continue without global shortcuts
      }
    },

    initFileSystemFeatures() {
      // Initialize File System Access API features
      try {
        // Check browser compatibility and log status
        const isSupported = this.isFileSystemAccessSupported();
        console.log('File System Access API supported:', isSupported);

        // Initialize file state tracking
        this.updateDocumentTitle();

        // Set up beforeunload handler to warn about unsaved changes
        window.addEventListener('beforeunload', this.handleBeforeUnload);

        console.log('File system features initialized');
      } catch (error) {
        console.error('Error initializing file system features:', error);
        // Continue with reduced functionality
      }
    },

    initNotificationSystem() {
      // Initialize the notification system
      try {
        // Ensure notification state is properly initialized
        this.notification.show = false;
        this.notification.timeout = null;

        console.log('Notification system initialized');
      } catch (error) {
        console.error('Error initializing notification system:', error);
        // Continue without notifications
      }
    },

    initMobileResponsiveness() {
      // Initialize mobile responsiveness features
      try {
        // Detect initial mobile state
        this.updateMobileState();

        // Add orientation change listener
        window.addEventListener('orientationchange', this.handleOrientationChange);

        // Add resize listener for mobile state updates
        window.addEventListener('resize', this.debounce(this.updateMobileState, 100));

        // Add touch event listeners for mobile split bar
        this.initTouchEvents();

        console.log('Mobile responsiveness initialized');
      } catch (error) {
        console.error('Error initializing mobile responsiveness:', error);
        // Continue with reduced mobile functionality
      }
    },

    updateMobileState() {
      // Update mobile and landscape state based on screen size
      try {
        this.screenWidth = window.innerWidth;
        this.isMobile = window.innerWidth <= 768;
        this.isLandscape = window.innerWidth > window.innerHeight;

        // Adjust editor layout for mobile
        if (this.isMobile) {
          this.adjustMobileLayout();
        }

        // Force editor height recalculation on mobile state change
        this.$nextTick(() => {
          this.recalculateEditorHeight();
        });
      } catch (error) {
        console.error('Error updating mobile state:', error);
      }
    },

    adjustMobileLayout() {
      // Adjust layout specifically for mobile devices
      try {
        if (this.isMobile) {
          // On mobile, ensure both panes get equal space in vertical layout
          // The CSS media query handles the layout change, but we can adjust heights
          const availableHeight = window.innerHeight;
          const notificationHeight = this.notification.show ? 60 : 0;
          const filenameBarHeight = (this.currentFileName || this.isFileModified) ? 32 : 0;

          // Calculate optimal heights for mobile
          const usableHeight = availableHeight - notificationHeight;
          const paneHeight = Math.max(200, (usableHeight - filenameBarHeight) / 2);

          // Apply mobile-specific adjustments
          this.$nextTick(() => {
            const editorPane = this.$el?.querySelector('.editor-pane');
            const diagramPane = this.$el?.querySelector('.diagram-pane');

            if (editorPane && diagramPane) {
              // Let CSS media queries handle the layout
              // Just ensure proper height calculation
              this.recalculateEditorHeight();
            }
          });
        }
      } catch (error) {
        console.error('Error adjusting mobile layout:', error);
      }
    },

    handleOrientationChange() {
      // Handle device orientation changes
      try {
        // Wait for orientation change to complete
        setTimeout(() => {
          this.updateMobileState();

          // Force a complete layout recalculation
          if (this.editorView) {
            this.editorView.requestMeasure();
          }

          // Re-render diagram to fit new dimensions
          this.renderDiagram();
        }, 100);
      } catch (error) {
        console.error('Error handling orientation change:', error);
      }
    },

    initTouchEvents() {
      // Initialize touch events for mobile split bar interaction
      try {
        const splitBar = this.$el?.querySelector('.split-bar');
        if (splitBar) {
          splitBar.addEventListener('touchstart', this.handleTouchStart, { passive: false });
          splitBar.addEventListener('touchmove', this.handleTouchMove, { passive: false });
          splitBar.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        }
      } catch (error) {
        console.error('Error initializing touch events:', error);
      }
    },

    handleTouchStart(event) {
      // Handle touch start on split bar
      try {
        if (this.isMobile && event.touches.length === 1) {
          event.preventDefault();
          const touch = event.touches[0];
          this.touchStartY = touch.clientY;

          // Store initial heights for vertical split on mobile
          const editorPane = this.$el?.querySelector('.editor-pane');
          if (editorPane) {
            this.touchStartHeight = editorPane.offsetHeight;
          }
        }
      } catch (error) {
        console.error('Error handling touch start:', error);
      }
    },

    handleTouchMove(event) {
      // Handle touch move on split bar (mobile vertical resize)
      try {
        if (this.isMobile && event.touches.length === 1 && this.touchStartY !== 0) {
          event.preventDefault();
          const touch = event.touches[0];
          const deltaY = touch.clientY - this.touchStartY;

          // Calculate new heights for vertical split
          const containerHeight = this.$el?.offsetHeight || window.innerHeight;
          const newEditorHeight = Math.max(100, Math.min(containerHeight - 200, this.touchStartHeight + deltaY));
          const newDiagramHeight = containerHeight - newEditorHeight;

          // Apply new heights
          const editorPane = this.$el?.querySelector('.editor-pane');
          const diagramPane = this.$el?.querySelector('.diagram-pane');

          if (editorPane && diagramPane) {
            editorPane.style.height = `${newEditorHeight}px`;
            diagramPane.style.height = `${newDiagramHeight}px`;

            // Recalculate editor dimensions
            this.$nextTick(() => {
              this.recalculateEditorHeight();
            });
          }
        }
      } catch (error) {
        console.error('Error handling touch move:', error);
      }
    },

    handleTouchEnd(event) {
      // Handle touch end on split bar
      try {
        if (this.isMobile) {
          event.preventDefault();
          this.touchStartY = 0;
          this.touchStartHeight = 0;

          // Force final layout recalculation
          this.$nextTick(() => {
            this.recalculateEditorHeight();
            this.renderDiagram();
          });
        }
      } catch (error) {
        console.error('Error handling touch end:', error);
      }
    },

    initResizeObserver() {
      // Initialize ResizeObserver for dynamic height updates with comprehensive error handling
      try {
        if ('ResizeObserver' in window) {
          this.resizeObserver = new ResizeObserver(entries => {
            try {
              // Debounce resize handling to avoid excessive recalculations
              this.handleContainerResize(entries);
            } catch (observerError) {
              console.error('Error in ResizeObserver callback:', observerError);
              // Attempt fallback height calculation
              this.fallbackHeightCalculation();
            }
          });

          // Observe the main editor container for size changes
          if (this.$el) {
            try {
              this.resizeObserver.observe(this.$el);
              console.log('ResizeObserver initialized successfully');
            } catch (observeError) {
              console.error('Error observing element with ResizeObserver:', observeError);
              this.initWindowResizeFallback();
            }
          } else {
            console.warn('Editor element not available for ResizeObserver');
            this.initWindowResizeFallback();
          }
        } else {
          console.warn('ResizeObserver not supported in this browser');
          // Fallback to window resize events
          this.initWindowResizeFallback();
        }
      } catch (error) {
        console.error('Error initializing ResizeObserver:', error);
        // Fallback to window resize events
        this.initWindowResizeFallback();
      }
    },

    initWindowResizeFallback() {
      // Fallback for browsers that don't support ResizeObserver with enhanced error handling
      try {
        this.windowResizeHandler = this.debounce(() => {
          try {
            this.recalculateEditorHeight();
          } catch (heightError) {
            console.error('Error in window resize height calculation:', heightError);
            // Attempt JavaScript-based fallback calculation
            this.fallbackHeightCalculation();
          }
        }, 150);

        window.addEventListener('resize', this.windowResizeHandler);
        console.log('Window resize fallback initialized successfully');
      } catch (error) {
        console.error('Error initializing window resize fallback:', error);
        // Last resort: try manual height calculation on a timer
        this.initManualHeightFallback();
      }
    },

    handleContainerResize(entries) {
      // Handle ResizeObserver entries with debouncing and error handling
      try {
        // Validate entries before processing
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
          console.warn('Invalid ResizeObserver entries received');
          this.fallbackHeightCalculation();
          return;
        }

        // Use debouncing to avoid excessive recalculations
        if (this.resizeDebounceTimer) {
          clearTimeout(this.resizeDebounceTimer);
        }

        this.resizeDebounceTimer = setTimeout(() => {
          try {
            this.recalculateEditorHeight();
          } catch (heightError) {
            console.error('Error in debounced height recalculation:', heightError);
            this.fallbackHeightCalculation();
          }
        }, 100);
      } catch (error) {
        console.error('Error handling container resize:', error);
        // Attempt immediate fallback calculation
        this.fallbackHeightCalculation();
      }
    },

    recalculateEditorHeight() {
      // Recalculate and update editor height when container changes with comprehensive error handling
      try {
        if (!this.editorView || !this.$refs.editor) {
          console.warn('Editor view or editor element not available for height calculation');
          this.fallbackHeightCalculation();
          return;
        }

        // Validate DOM elements before proceeding
        const editorContainer = this.$refs.editor;
        if (!editorContainer || !editorContainer.parentElement) {
          console.warn('Editor container or parent not available');
          this.fallbackHeightCalculation();
          return;
        }

        // Force CodeMirror to recalculate its dimensions with error handling
        try {
          this.editorView.requestMeasure();
        } catch (measureError) {
          console.error('Error requesting CodeMirror measure:', measureError);
          // Continue with manual height calculation
        }

        // Additional height recalculation with enhanced validation
        const editorPane = editorContainer.closest('.editor-pane');

        if (editorPane) {
          try {
            const filenameBar = editorPane.querySelector('.editor-filename-bar');
            const paneHeight = editorPane.clientHeight;
            const filenameBarHeight = filenameBar ? filenameBar.offsetHeight : 0;
            const availableHeight = paneHeight - filenameBarHeight;

            // Validate calculated height
            if (availableHeight > 50 && availableHeight < window.innerHeight) {
              editorContainer.style.height = `${availableHeight}px`;
              console.log(`Editor height set to: ${availableHeight}px`);
            } else {
              console.warn(`Invalid calculated height: ${availableHeight}px, using fallback`);
              this.fallbackHeightCalculation();
            }
          } catch (calculationError) {
            console.error('Error in height calculation:', calculationError);
            this.fallbackHeightCalculation();
          }
        } else {
          console.warn('Editor pane not found, using fallback height calculation');
          this.fallbackHeightCalculation();
        }
      } catch (error) {
        console.error('Error recalculating editor height:', error);
        this.fallbackHeightCalculation();
      }
    },

    fallbackHeightCalculation() {
      // JavaScript-based fallback height calculation for unsupported browsers or CSS failures
      try {
        console.log('Attempting fallback height calculation');

        if (!this.$refs.editor) {
          console.error('Editor element not available for fallback calculation');
          return;
        }

        const editorContainer = this.$refs.editor;
        const editorPane = editorContainer.closest('.editor-pane');

        if (!editorPane) {
          // Last resort: use viewport-based calculation
          const viewportHeight = window.innerHeight;
          const fallbackHeight = Math.max(200, viewportHeight * 0.4); // 40% of viewport
          editorContainer.style.height = `${fallbackHeight}px`;
          console.log(`Applied viewport-based fallback height: ${fallbackHeight}px`);
          return;
        }

        // Calculate height using JavaScript measurements
        const containerRect = this.$el.getBoundingClientRect();
        const paneRect = editorPane.getBoundingClientRect();
        const filenameBar = editorPane.querySelector('.editor-filename-bar');

        let calculatedHeight;

        if (this.isMobile) {
          // Mobile-specific fallback calculation
          calculatedHeight = Math.max(150, window.innerHeight * 0.3);
        } else {
          // Desktop fallback calculation
          const filenameBarHeight = filenameBar ? filenameBar.offsetHeight : 0;
          const notificationHeight = this.notification.show ? 60 : 0;
          const availableHeight = paneRect.height - filenameBarHeight - notificationHeight;
          calculatedHeight = Math.max(200, availableHeight);
        }

        // Apply calculated height with bounds checking
        if (calculatedHeight > 50 && calculatedHeight < window.innerHeight) {
          editorContainer.style.height = `${calculatedHeight}px`;
          editorContainer.style.minHeight = '150px';
          editorContainer.style.maxHeight = '80vh';

          // Force CodeMirror refresh if available
          if (this.editorView) {
            try {
              this.editorView.requestMeasure();
            } catch (refreshError) {
              console.warn('Could not refresh CodeMirror after fallback height calculation');
            }
          }

          console.log(`Applied JavaScript fallback height: ${calculatedHeight}px`);
        } else {
          console.error(`Invalid fallback height calculated: ${calculatedHeight}px`);
          this.emergencyHeightFallback();
        }

      } catch (error) {
        console.error('Error in fallback height calculation:', error);
        this.emergencyHeightFallback();
      }
    },

    emergencyHeightFallback() {
      // Emergency fallback for when all height calculations fail
      try {
        console.log('Applying emergency height fallback');

        if (this.$refs.editor) {
          // Apply fixed height as absolute last resort
          const emergencyHeight = this.isMobile ? '200px' : '400px';
          this.$refs.editor.style.height = emergencyHeight;
          this.$refs.editor.style.minHeight = '150px';
          this.$refs.editor.style.overflow = 'auto';

          console.log(`Applied emergency height: ${emergencyHeight}`);

          // Show user notification about degraded functionality
          this.showWarningMessage('Editor height calculation failed. Using fixed height. Try refreshing the page if the editor appears too small.');
        }
      } catch (error) {
        console.error('Emergency height fallback failed:', error);
        // At this point, we've exhausted all options
        this.showErrorMessage('Critical error: Unable to set editor height. Please refresh the page.');
      }
    },

    initManualHeightFallback() {
      // Manual height calculation fallback using periodic checks
      try {
        console.log('Initializing manual height fallback with periodic checks');

        // Set up periodic height checks as absolute last resort
        const manualHeightInterval = setInterval(() => {
          try {
            if (this.$refs.editor && this.editorView) {
              const currentHeight = this.$refs.editor.offsetHeight;

              // Check if height seems unreasonably small
              if (currentHeight < 100) {
                console.warn('Detected abnormally small editor height, attempting correction');
                this.fallbackHeightCalculation();
              }
            }
          } catch (intervalError) {
            console.error('Error in manual height check:', intervalError);
          }
        }, 5000); // Check every 5 seconds

        // Store interval ID for cleanup
        this.manualHeightInterval = manualHeightInterval;

        // Clean up after 60 seconds to avoid infinite checking
        setTimeout(() => {
          if (this.manualHeightInterval) {
            clearInterval(this.manualHeightInterval);
            this.manualHeightInterval = null;
            console.log('Manual height fallback checks completed');
          }
        }, 60000);

      } catch (error) {
        console.error('Error initializing manual height fallback:', error);
      }
    },

    validateBrowserCompatibility() {
      // Check browser compatibility for CSS flexbox and other required features
      try {
        const compatibility = {
          flexbox: CSS.supports('display', 'flex'),
          resizeObserver: 'ResizeObserver' in window,
          customProperties: CSS.supports('--custom-property', 'value'),
          calc: CSS.supports('height', 'calc(100% - 50px)'),
          vh: CSS.supports('height', '100vh')
        };

        console.log('Browser compatibility check:', compatibility);

        // Warn about potential issues
        if (!compatibility.flexbox) {
          console.warn('Flexbox not supported - height calculations may fail');
          this.showWarningMessage('Your browser has limited CSS support. The editor may not display correctly.');
          return false;
        }

        if (!compatibility.resizeObserver) {
          console.warn('ResizeObserver not supported - using window resize fallback');
        }

        if (!compatibility.calc) {
          console.warn('CSS calc() not supported - using JavaScript calculations');
        }

        return true;
      } catch (error) {
        console.error('Error checking browser compatibility:', error);
        return false;
      }
    },

    // localStorage error handling and validation methods
    isLocalStorageAvailable() {
      // Check if localStorage is available and functional
      try {
        const testKey = '__localStorage_test__';
        const testValue = 'test';

        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        return retrieved === testValue;
      } catch (error) {
        console.warn('localStorage not available:', error.message);
        return false;
      }
    },

    validateAutoSaveData(data) {
      // Validate auto-save data structure and content
      try {
        if (!data || typeof data !== 'object') {
          console.warn('Invalid auto-save data: not an object');
          return false;
        }

        // Check required fields
        if (typeof data.content !== 'string') {
          console.warn('Invalid auto-save data: content is not a string');
          return false;
        }

        if (typeof data.timestamp !== 'number' || data.timestamp <= 0) {
          console.warn('Invalid auto-save data: invalid timestamp');
          return false;
        }

        // Check content length (prevent extremely large saves)
        if (data.content.length > 1000000) { // 1MB limit
          console.warn('Auto-save data too large:', data.content.length, 'characters');
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error validating auto-save data:', error);
        return false;
      }
    },

    checkStorageQuota(dataString) {
      // Check if there's enough storage space for the data
      try {
        // Estimate current localStorage usage
        let currentSize = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            currentSize += localStorage[key].length + key.length;
          }
        }

        const newDataSize = dataString.length;
        const estimatedTotal = currentSize + newDataSize;

        // Most browsers have a 5-10MB limit for localStorage
        const storageLimit = 5 * 1024 * 1024; // 5MB conservative estimate

        if (estimatedTotal > storageLimit * 0.9) { // Use 90% as threshold
          console.warn('Approaching storage quota limit:', estimatedTotal, 'bytes');
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error checking storage quota:', error);
        return false;
      }
    },

    verifyStoredData(storageKey, originalData) {
      // Verify that data was stored correctly
      try {
        const storedData = localStorage.getItem(storageKey);
        return storedData === originalData;
      } catch (error) {
        console.error('Error verifying stored data:', error);
        return false;
      }
    },

    handleStorageQuotaExceeded() {
      // Handle storage quota exceeded by cleaning up old data
      try {
        console.log('Attempting to free up storage space');

        // Find and remove old auto-save entries
        const keysToRemove = [];
        const currentTime = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mermaid-file-') && key.includes('-autosave')) {
            try {
              const data = JSON.parse(localStorage.getItem(key));
              if (data.timestamp && (currentTime - data.timestamp > maxAge)) {
                keysToRemove.push(key);
              }
            } catch (parseError) {
              // If we can't parse it, it's probably corrupted - remove it
              keysToRemove.push(key);
            }
          }
        }

        // Remove old entries
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log('Removed old auto-save entry:', key);
          } catch (removeError) {
            console.error('Error removing old entry:', key, removeError);
          }
        });

        if (keysToRemove.length > 0) {
          this.showInfoMessage(`Cleaned up ${keysToRemove.length} old auto-save entries to free up space.`);
        } else {
          this.showWarningMessage('Storage space is full. Please manually clear some browser data or save your work to a file.');
        }

      } catch (error) {
        console.error('Error handling storage quota exceeded:', error);
        this.showErrorMessage('Storage space is full and cleanup failed. Please save your work to a file.');
      }
    },

    handleLocalStorageError(error, operation) {
      // Centralized localStorage error handling
      console.error(`localStorage error during ${operation}:`, error);

      let errorMessage = `Failed to ${operation}`;
      let showNotification = true;

      switch (error.name) {
        case 'QuotaExceededError':
          errorMessage = 'Storage space is full. Auto-save has been disabled.';
          this.handleStorageQuotaExceeded();
          break;

        case 'SecurityError':
          errorMessage = 'Storage access denied by browser security settings.';
          break;

        case 'InvalidStateError':
          errorMessage = 'Storage is in an invalid state. Please refresh the page.';
          break;

        case 'DataError':
          errorMessage = 'Data corruption detected in storage.';
          this.handleCorruptedStorage();
          break;

        case 'NotSupportedError':
          errorMessage = 'Storage not supported in this browser.';
          break;

        default:
          if (error.message.includes('quota')) {
            errorMessage = 'Storage quota exceeded. Please free up space.';
            this.handleStorageQuotaExceeded();
          } else if (error.message.includes('security')) {
            errorMessage = 'Storage access blocked by security policy.';
          } else {
            errorMessage = `Storage error: ${error.message}`;
          }
      }

      if (showNotification) {
        if (operation === 'auto-save') {
          // For auto-save, show warning instead of error to be less intrusive
          this.showWarningMessage(errorMessage);
        } else {
          this.showErrorMessage(errorMessage);
        }
      }
    },

    handleCorruptedStorage() {
      // Handle corrupted localStorage data
      try {
        console.log('Attempting to recover from corrupted storage');

        const corruptedKeys = [];

        // Check all mermaid-related keys for corruption
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mermaid-')) {
            try {
              const data = localStorage.getItem(key);
              JSON.parse(data); // Test if it's valid JSON
            } catch (parseError) {
              corruptedKeys.push(key);
            }
          }
        }

        // Remove corrupted entries
        corruptedKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log('Removed corrupted entry:', key);
          } catch (removeError) {
            console.error('Error removing corrupted entry:', key, removeError);
          }
        });

        if (corruptedKeys.length > 0) {
          this.showWarningMessage(`Removed ${corruptedKeys.length} corrupted storage entries. Some auto-saved data may have been lost.`);
        }

      } catch (error) {
        console.error('Error handling corrupted storage:', error);
        this.showErrorMessage('Storage corruption detected but cleanup failed. Please clear your browser data manually.');
      }
    },

    createStorageFallback() {
      // Create in-memory fallback when localStorage is unavailable
      if (!this.memoryStorage) {
        this.memoryStorage = new Map();
        console.log('Created in-memory storage fallback');
      }
      return this.memoryStorage;
    },

    safeLocalStorageOperation(operation, key, value = null) {
      // Safely perform localStorage operations with fallback
      try {
        if (!this.isLocalStorageAvailable()) {
          const fallback = this.createStorageFallback();

          switch (operation) {
            case 'getItem':
              return fallback.get(key) || null;
            case 'setItem':
              fallback.set(key, value);
              return true;
            case 'removeItem':
              fallback.delete(key);
              return true;
            default:
              return null;
          }
        }

        switch (operation) {
          case 'getItem':
            return localStorage.getItem(key);
          case 'setItem':
            localStorage.setItem(key, value);
            return true;
          case 'removeItem':
            localStorage.removeItem(key);
            return true;
          default:
            return null;
        }
      } catch (error) {
        this.handleLocalStorageError(error, operation);
        return null;
      }
    },

    debounce(func, wait) {
      // Utility function for debouncing
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // File hash generation utility methods
    async generateFileHash(content, fileName = null) {
      // Generate SHA-256 based hash for file content
      try {
        // Create hash input combining content and metadata
        const hashInput = this.createHashInput(content, fileName);

        // Use Web Crypto API for SHA-256 hashing
        if ('crypto' in window && 'subtle' in window.crypto) {
          const encoder = new TextEncoder();
          const data = encoder.encode(hashInput);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Return first 16 characters for storage key (sufficient for uniqueness)
          return hashHex.substring(0, 16);
        } else {
          // Fallback to simple hash for browsers without Web Crypto API
          return this.generateSimpleHash(hashInput);
        }
      } catch (error) {
        console.error('Error generating file hash:', error);
        // Fallback to timestamp-based hash
        return this.generateFallbackHash(content, fileName);
      }
    },

    createHashInput(content, fileName) {
      // Create consistent hash input combining content and metadata
      const timestamp = Date.now();
      const contentLength = content.length;
      const fileNamePart = fileName || 'untitled';

      // Combine content with metadata for more unique hash
      return `${content}|${fileNamePart}|${contentLength}|${timestamp}`;
    },

    generateSimpleHash(input) {
      // Simple hash function fallback for browsers without Web Crypto API
      let hash = 0;
      if (input.length === 0) return '0000000000000000';

      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      // Convert to positive hex string with padding
      const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
      return hashHex.padEnd(16, '0').substring(0, 16);
    },

    generateFallbackHash(content, fileName) {
      // Fallback hash generation using timestamp and content length
      const timestamp = Date.now().toString(16);
      const contentHash = content.length.toString(16).padStart(4, '0');
      const fileHash = fileName ? fileName.length.toString(16).padStart(2, '0') : '00';

      return `${timestamp.substring(-8)}${contentHash}${fileHash}`.substring(0, 16);
    },

    getStorageKey(hash, type = 'autosave') {
      // Generate storage key using file hash
      const validTypes = ['autosave', 'manual'];
      const storageType = validTypes.includes(type) ? type : 'autosave';

      return `mermaid-file-${hash}-${storageType}`;
    },

    async getCurrentFileHash() {
      // Get hash for current file content
      try {
        return await this.generateFileHash(this.mermaidText, this.currentFileName);
      } catch (error) {
        console.error('Error getting current file hash:', error);
        return this.generateFallbackHash(this.mermaidText, this.currentFileName);
      }
    },

    handleHashCollision(hash, type) {
      // Handle potential hash collisions by appending random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const newHash = `${hash.substring(0, 12)}${randomSuffix}`;

      console.warn(`Hash collision detected for ${hash}, using ${newHash}`);
      return this.getStorageKey(newHash, type);
    },

    // Migration utility methods
    async migrateExistingData() {
      try {
        // Check if there's legacy auto-save data to migrate
        const legacyAutoSave = localStorage.getItem(this.autoSaveKey);
        const legacyManualSave = localStorage.getItem('lastMermaidDiagram');

        if (legacyAutoSave || legacyManualSave) {
          console.log('Found legacy localStorage data, starting migration...');

          // Migrate auto-save data if it exists
          if (legacyAutoSave) {
            await this.migrateLegacyAutoSave(legacyAutoSave);
          }

          // Migrate manual save data if it exists
          if (legacyManualSave) {
            await this.migrateLegacyManualSave(legacyManualSave);
          }

          console.log('Legacy data migration completed');
        }
      } catch (error) {
        console.error('Error during data migration:', error);
        // Continue without migration - existing functionality will still work
      }
    },

    async migrateLegacyAutoSave(legacyData) {
      try {
        const autoSaveData = JSON.parse(legacyData);

        if (autoSaveData.content) {
          // Generate hash for the legacy content
          const fileHash = await this.generateFileHash(
            autoSaveData.content,
            autoSaveData.fileName || null
          );

          // Create new storage key
          const newStorageKey = this.getStorageKey(fileHash, 'autosave');

          // Check if new key already exists to avoid overwriting
          const existingData = localStorage.getItem(newStorageKey);
          if (!existingData) {
            // Migrate the data to new key format
            localStorage.setItem(newStorageKey, legacyData);
            console.log(`Migrated auto-save data to key: ${newStorageKey}`);
          }
        }
      } catch (error) {
        console.error('Error migrating legacy auto-save data:', error);
      }
    },

    async migrateLegacyManualSave(legacyData) {
      try {
        const manualSaveData = JSON.parse(legacyData);

        if (manualSaveData.code) {
          // Generate hash for the legacy content
          const fileHash = await this.generateFileHash(manualSaveData.code, null);

          // Create new storage key for manual save
          const newStorageKey = this.getStorageKey(fileHash, 'manual');

          // Check if new key already exists to avoid overwriting
          const existingData = localStorage.getItem(newStorageKey);
          if (!existingData) {
            // Convert to new format and migrate
            const newManualSaveData = {
              content: manualSaveData.code,
              timestamp: Date.now(),
              fileName: null
            };

            localStorage.setItem(newStorageKey, JSON.stringify(newManualSaveData));
            console.log(`Migrated manual save data to key: ${newStorageKey}`);
          }
        }
      } catch (error) {
        console.error('Error migrating legacy manual save data:', error);
      }
    },

    async completeMigration(autoSaveData) {
      try {
        // This method is called when auto-save data was loaded from legacy key
        // and needs to be migrated to the new hash-based key

        if (autoSaveData.content) {
          // Generate hash for the content
          const fileHash = await this.generateFileHash(
            autoSaveData.content,
            autoSaveData.fileName || null
          );

          // Create new storage key
          const newStorageKey = this.getStorageKey(fileHash, 'autosave');

          // Remove the migration flag and save to new key
          const cleanedData = { ...autoSaveData };
          delete cleanedData._needsMigration;

          localStorage.setItem(newStorageKey, JSON.stringify(cleanedData));

          // Update current file hash
          this.currentFileHash = fileHash;

          console.log(`Completed migration of auto-save data to key: ${newStorageKey}`);

          // Optionally remove legacy data after successful migration
          // We'll keep it for now to ensure backward compatibility
        }
      } catch (error) {
        console.error('Error completing auto-save data migration:', error);
      }
    },

    // Cleanup methods for enhanced lifecycle management
    cleanupKeyboardShortcuts() {
      try {
        // Remove global keyboard event listener
        document.removeEventListener('keydown', this.handleGlobalKeyboardShortcuts);
        console.log('Keyboard shortcuts cleaned up');
      } catch (error) {
        console.error('Error cleaning up keyboard shortcuts:', error);
      }
    },

    cleanupAllTimers() {
      try {
        // Clean up any remaining timers that might have been missed
        const timerProperties = ['autoSaveTimer', 'debounceTimer'];

        timerProperties.forEach(prop => {
          if (this[prop]) {
            clearTimeout(this[prop]);
            this[prop] = null;
          }
        });

        console.log('All timers cleaned up');
      } catch (error) {
        console.error('Error cleaning up timers:', error);
      }
    },

    handleGlobalKeyboardShortcuts(event) {
      // Handle global keyboard shortcuts that need to work outside the editor
      try {
        // Currently, most shortcuts are handled within CodeMirror
        // This is for future expansion if needed

        // Example: Handle Escape key to hide notifications
        if (event.key === 'Escape' && this.notification.show) {
          this.hideNotification();
          event.preventDefault();
        }
      } catch (error) {
        console.error('Error handling global keyboard shortcut:', error);
      }
    },

    handleBeforeUnload(event) {
      // Warn user about unsaved changes before leaving the page
      try {
        if (this.isFileModified) {
          const message = 'You have unsaved changes. Are you sure you want to leave?';
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      } catch (error) {
        console.error('Error handling beforeunload:', error);
      }
    },

    loadDefault() {
      this.mermaidText = this.getDefaultText();
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: this.mermaidText }
        });
      }
      this.renderDiagram();

      // Initialize file state for default content
      this.lastSavedContent = this.mermaidText;
      this.updateFileState();
    },
    getDefaultText() {
      const defaults = {
        'sequenceDiagram': `sequenceDiagram\n    participant Client\n    participant Server\n    \n    Client->>Server: GET /data\n    Server-->>Client: 200 OK\n    Client->>Server: POST /update\n    Server-->>Client: 403 Forbidden`,
        'graph TD': `graph TD\n    Α[Καλωσήρθατε] --> Β{Είστε νέος;}\n    Β -->|Ναι| Γ[Εγγραφή]\n    Β -->|Όχι| Δ[Σύνδεση]\n    Γ --> Ε[Προφίλ]\n    Δ --> Ε`,
        'pie': `pie title Πλατφόρμες\n    "Android" : 45\n    "iOS" : 30\n    "Windows" : 15\n    "Άλλο" : 10`,
        'gantt': `gantt\n    title Πρόγραμμα Έργου\n    dateFormat  YYYY-MM-DD\n    section Ανάπτυξη\n    Σχεδίαση :done, des1, 2023-01-01, 14d\n    Κώδικας :active, des2, 2023-01-15, 21d\n    Τεστ : des3, after des2, 7d`
      };
      return defaults['graph TD']; // Default to flowchart if diagramType is removed
    },
    async renderDiagram() {
      try {
        mermaid.parse(this.mermaidText);
        const { svg } = await mermaid.render('mermaid-svg', this.mermaidText);
        this.$refs.diagramContainer.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid rendering error:', error);

        // Create user-friendly error message based on error type
        let errorMessage = 'Diagram syntax error';
        if (error.message) {
          // Extract meaningful part of error message
          const cleanMessage = error.message.replace(/^Error: /, '').replace(/\n.*$/, '');
          errorMessage = `Syntax error: ${cleanMessage}`;
        }

        this.$refs.diagramContainer.innerHTML =
          `<div class="error">
            <strong>Unable to render diagram</strong><br>
            ${errorMessage}<br>
            <small>Please check your Mermaid syntax and try again.</small>
          </div>`;
      }
    },
    renderWithDebounce() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.renderDiagram();
      }, 500);
    },
    autoSaveContent() {
      // Clear existing auto-save timer
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }

      // Set new timer with 2-second debounce
      this.autoSaveTimer = setTimeout(async () => {
        await this.saveAutoSaveData();
      }, 2000);
    },
    async saveAutoSaveData() {
      try {
        // Validate localStorage availability first
        if (!this.isLocalStorageAvailable()) {
          console.warn('localStorage not available, skipping auto-save');
          return;
        }

        const autoSaveData = {
          content: this.mermaidText,
          timestamp: Date.now(),
          fileName: this.currentFileName || null
        };

        // Validate data before saving
        if (!this.validateAutoSaveData(autoSaveData)) {
          console.warn('Invalid auto-save data, skipping save');
          return;
        }

        // Generate file-specific storage key using hash
        const fileHash = await this.getCurrentFileHash();
        const storageKey = this.getStorageKey(fileHash, 'autosave');
        const dataString = JSON.stringify(autoSaveData);

        // Check storage quota before saving
        if (!this.checkStorageQuota(dataString)) {
          console.warn('Insufficient storage space for auto-save');
          this.handleStorageQuotaExceeded();
          return;
        }

        localStorage.setItem(storageKey, dataString);

        // Also store the current hash for migration purposes
        this.currentFileHash = fileHash;

        // Verify the data was saved correctly
        if (!this.verifyStoredData(storageKey, dataString)) {
          console.error('Auto-save data verification failed');
          this.showWarningMessage('Auto-save may have failed. Please save manually to ensure your work is preserved.');
        }

      } catch (error) {
        this.handleLocalStorageError(error, 'auto-save');
      }
    },
    async loadAutoSaveData(fileHash = null) {
      try {
        // Check localStorage availability first
        if (!this.isLocalStorageAvailable()) {
          console.warn('localStorage not available for loading auto-save data');
          return null;
        }

        let storageKey;
        let autoSaveData = null;

        if (fileHash) {
          // Load auto-save data for specific file hash
          storageKey = this.getStorageKey(fileHash, 'autosave');
          const saved = this.safeLocalStorageOperation('getItem', storageKey);
          if (saved) {
            try {
              autoSaveData = JSON.parse(saved);
            } catch (parseError) {
              console.error('Error parsing auto-save data:', parseError);
              this.handleCorruptedStorage();
              return null;
            }
          }
        } else {
          // Try to load from current file hash first
          if (this.currentFileHash) {
            storageKey = this.getStorageKey(this.currentFileHash, 'autosave');
            const saved = this.safeLocalStorageOperation('getItem', storageKey);
            if (saved) {
              try {
                autoSaveData = JSON.parse(saved);
              } catch (parseError) {
                console.error('Error parsing current file auto-save data:', parseError);
                this.clearAutoSaveData(this.currentFileHash);
              }
            }
          }

          // Fallback to legacy auto-save key for migration
          if (!autoSaveData) {
            const legacySaved = this.safeLocalStorageOperation('getItem', this.autoSaveKey);
            if (legacySaved) {
              try {
                autoSaveData = JSON.parse(legacySaved);
                // Mark for migration
                autoSaveData._needsMigration = true;
              } catch (parseError) {
                console.error('Error parsing legacy auto-save data:', parseError);
                this.safeLocalStorageOperation('removeItem', this.autoSaveKey);
              }
            }
          }
        }

        if (autoSaveData) {
          // Validate the loaded data structure
          if (!this.validateAutoSaveData(autoSaveData)) {
            console.warn('Invalid auto-save data structure detected');
            if (fileHash) {
              this.clearAutoSaveData(fileHash);
            } else {
              this.clearAutoSaveData();
            }
            return null;
          }

          // Check if auto-save data is valid and not too old (e.g., older than 7 days)
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          const isStale = autoSaveData.timestamp && (Date.now() - autoSaveData.timestamp > maxAge);

          if (isStale) {
            console.log('Auto-save data is stale, removing');
            // Clear stale auto-save data
            if (fileHash) {
              this.clearAutoSaveData(fileHash);
            } else {
              this.clearAutoSaveData();
            }
            return null;
          }

          return autoSaveData;
        }
      } catch (error) {
        this.handleLocalStorageError(error, 'load auto-save data');
        // Clear potentially corrupted auto-save data
        if (fileHash) {
          this.clearAutoSaveData(fileHash);
        } else {
          this.clearAutoSaveData();
        }
      }

      return null;
    },
    clearAutoSaveData(fileHash = null) {
      try {
        if (!this.isLocalStorageAvailable()) {
          console.warn('localStorage not available for clearing auto-save data');
          return;
        }

        if (fileHash) {
          // Clear auto-save data for specific file hash
          const storageKey = this.getStorageKey(fileHash, 'autosave');
          this.safeLocalStorageOperation('removeItem', storageKey);
        } else {
          // Clear legacy auto-save data and current file hash data
          this.safeLocalStorageOperation('removeItem', this.autoSaveKey);
          if (this.currentFileHash) {
            const storageKey = this.getStorageKey(this.currentFileHash, 'autosave');
            this.safeLocalStorageOperation('removeItem', storageKey);
          }
        }
      } catch (error) {
        this.handleLocalStorageError(error, 'clear auto-save data');
      }
    },
    // async initAutoSave() {
    //   try {
    //     // First, attempt to migrate existing localStorage data
    //     await this.migrateExistingData();

    //     // Check if there's any manually saved content first
    //     const manualSave = localStorage.getItem('lastMermaidDiagram');

    //     // Only restore auto-save if no manual save exists or if auto-save is newer
    //     const autoSaveData = await this.loadAutoSaveData();

    //     if (autoSaveData && autoSaveData.content) {
    //       let shouldRestoreAutoSave = true;

    //       if (manualSave) {
    //         try {
    //           JSON.parse(manualSave); // Validate manual save data
    //           // If manual save exists but auto-save has content and is more recent, prefer auto-save
    //           // For now, we'll be conservative and only restore auto-save if no manual save exists
    //           shouldRestoreAutoSave = false;
    //         } catch (error) {
    //           // If manual save is corrupted, restore auto-save
    //           shouldRestoreAutoSave = true;
    //         }
    //       }

    //       if (shouldRestoreAutoSave) {
    //         // Restore auto-saved content
    //         this.mermaidText = autoSaveData.content;
    //         this.currentFileName = autoSaveData.fileName;

    //         // Update editor with restored content
    //         if (this.editorView) {
    //           this.editorView.dispatch({
    //             changes: { from: 0, to: this.editorView.state.doc.length, insert: this.mermaidText }
    //           });
    //         }

    //         // Render the restored diagram
    //         this.renderDiagram();

    //         // Initialize file state for restored content
    //         this.lastSavedContent = this.mermaidText;
    //         this.updateFileState();

    //         // Handle migration if needed
    //         if (autoSaveData._needsMigration) {
    //           await this.completeMigration(autoSaveData);
    //         }

    //         console.log('Auto-saved content restored');
    //       }
    //     } else {
    //       // No auto-save data, load default content
    //       this.loadDefault();
    //     }
    //   } catch (error) {
    //     console.error('Error during auto-save initialization:', error);
    //     // Fallback to loading default content
    //     this.loadDefault();
    //   }
    // },
    async saveDiagram() {
      try {
        // Check localStorage availability first
        if (!this.isLocalStorageAvailable()) {
          this.showErrorMessage('Storage not available. Please save to a file instead.');
          return;
        }

        // Generate file hash for current content
        const fileHash = await this.getCurrentFileHash();

        // Save to file-specific localStorage key
        const manualSaveKey = this.getStorageKey(fileHash, 'manual');
        const saveData = {
          content: this.mermaidText,
          timestamp: Date.now(),
          fileName: this.currentFileName || null
        };

        // Validate save data before storing
        if (!this.validateAutoSaveData(saveData)) {
          this.showErrorMessage('Invalid diagram data. Cannot save.');
          return;
        }

        const saveDataString = JSON.stringify(saveData);
        const legacyDataString = JSON.stringify({ code: this.mermaidText });

        // Check storage quota before saving
        if (!this.checkStorageQuota(saveDataString + legacyDataString)) {
          this.handleStorageQuotaExceeded();
          return;
        }

        // Save to file-specific key
        const saveSuccess = this.safeLocalStorageOperation('setItem', manualSaveKey, saveDataString);
        if (!saveSuccess) {
          this.showErrorMessage('Failed to save diagram to storage.');
          return;
        }

        // Also save to legacy key for backward compatibility
        const legacySaveSuccess = this.safeLocalStorageOperation('setItem', 'lastMermaidDiagram', legacyDataString);
        if (!legacySaveSuccess) {
          console.warn('Failed to save to legacy key, but main save succeeded');
        }

        // Verify the data was saved correctly
        if (!this.verifyStoredData(manualSaveKey, saveDataString)) {
          this.showWarningMessage('Diagram saved but verification failed. Please save to a file as backup.');
        }

        // Update file state to reflect that content is now saved
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.currentFileHash = fileHash;
        this.updateDocumentTitle();

        // Update auto-save storage to match manual save
        await this.saveAutoSaveData();

        this.showSuccessMessage('Diagram saved successfully!');

      } catch (error) {
        this.handleLocalStorageError(error, 'save diagram');
      }
    },
    setEditorContent(text) {
      this.mermaidText = text;
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: text }
        });
      }
      this.renderDiagram();

    },
    async loadDiagram() {
      try {
        // Check localStorage availability first
        if (!this.isLocalStorageAvailable()) {
          this.showErrorMessage('Storage not available. Please load a file instead.');
          return;
        }

        // First try to load from legacy key for backward compatibility
        const legacySaved = this.safeLocalStorageOperation('getItem', 'lastMermaidDiagram');
        let loadedContent = null;
        let loadedData = null;

        if (legacySaved) {
          try {
            const legacyData = JSON.parse(legacySaved);
            loadedContent = legacyData.code;

            // Validate loaded content
            if (typeof loadedContent !== 'string') {
              throw new Error('Invalid content type in saved data');
            }

            // Try to find corresponding file-specific data
            if (loadedContent) {
              const fileHash = await this.generateFileHash(loadedContent, null);
              const manualSaveKey = this.getStorageKey(fileHash, 'manual');
              const fileSpecificSaved = this.safeLocalStorageOperation('getItem', manualSaveKey);

              if (fileSpecificSaved) {
                try {
                  // Use file-specific data if available (more recent format)
                  loadedData = JSON.parse(fileSpecificSaved);

                  // Validate file-specific data structure
                  if (this.validateAutoSaveData(loadedData)) {
                    loadedContent = loadedData.content;
                  } else {
                    console.warn('File-specific data is invalid, using legacy data');
                  }
                } catch (fileParseError) {
                  console.error('Error parsing file-specific data:', fileParseError);
                  // Continue with legacy data
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing saved diagram:', parseError);
            this.handleCorruptedStorage();
            this.showErrorMessage('Saved diagram data is corrupted. Please try loading a file instead.');
            return;
          }
        }

        if (loadedContent && loadedContent.trim()) {
          // Validate content length
          if (loadedContent.length > 1000000) { // 1MB limit
            this.showErrorMessage('Saved diagram is too large to load safely.');
            return;
          }

          this.mermaidText = loadedContent;
          if (this.editorView) {
            this.editorView.dispatch({
              changes: { from: 0, to: this.editorView.state.doc.length, insert: loadedContent }
            });
          }

          // Clear any existing file state since we're loading from localStorage
          this.clearFileState();

          // Set the loaded content as the baseline for tracking modifications
          this.lastSavedContent = loadedContent;

          // Set filename if available from file-specific data
          if (loadedData && loadedData.fileName && typeof loadedData.fileName === 'string') {
            this.currentFileName = loadedData.fileName;
          }

          this.updateFileState();

          // Update auto-save storage to match loaded content
          await this.saveAutoSaveData();

          this.renderDiagram();
          this.showSuccessMessage('Diagram loaded successfully!');

        } else {
          // No saved diagram found, inform user
          this.showInfoMessage('No saved diagram found. Create a new diagram or load a file.');
        }
      } catch (error) {
        this.handleLocalStorageError(error, 'load diagram');
      }
    },
    async exportImage(filename = 'diagram.png') {
      await this.exportImageWithErrorHandling(filename);
    },
    startDrag(e) {
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.dragStartWidth = this.leftWidth;
      document.body.style.cursor = 'col-resize';
    },
    onDrag(e) {
      if (!this.dragging) return;
      const delta = e.clientX - this.dragStartX;
      const container = this.$el.querySelector('.split-pane');
      const totalWidth = container.offsetWidth;
      let newLeftWidth = this.dragStartWidth + (delta / totalWidth) * 100;
      newLeftWidth = Math.max(10, Math.min(90, newLeftWidth));
      this.leftWidth = newLeftWidth;
    },
    stopDrag() {
      if (this.dragging) {
        this.dragging = false;
        document.body.style.cursor = '';
      }
    },
    getEditorContent() {
      return this.mermaidText;
    },
    handleKeyboardShortcuts(event) {
      try {
        // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
        const isCtrlS = (event.ctrlKey || event.metaKey) && event.key === 's';

        if (isCtrlS) {
          event.preventDefault(); // Prevent default browser save behavior

          // Use the enhanced save functionality with error handling
          this.saveFileWithErrorHandling();

          return true; // Indicate that the shortcut was handled
        }

        return false; // Shortcut not handled
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
        this.showErrorMessage('Keyboard shortcut failed. Please try using the menu instead.');
        return false;
      }
    },

    // File state tracking methods
    updateFileState() {
      // Check if current content differs from last saved content
      const currentContent = this.mermaidText;
      const hasChanges = currentContent !== this.lastSavedContent;

      // Update modification state
      this.isFileModified = hasChanges;

      // Update document title with modification indicator
      this.updateDocumentTitle();
    },

    updateDocumentTitle() {
      // Get base title (file name or default)
      let baseTitle = this.currentFileName || 'Mermaid Editor';

      // Add modification indicator if file is modified
      if (this.isFileModified) {
        baseTitle = '* ' + baseTitle;
      }

      // Update document title
      document.title = baseTitle;
    },

    setFileState(fileName, fileHandle, content) {
      // Set file information
      this.currentFileName = fileName;
      this.currentFileHandle = fileHandle;
      this.lastSavedContent = content;
      this.isFileModified = false;

      // Update UI indicators
      this.updateDocumentTitle();
    },

    clearFileState() {
      // Clear file information
      this.currentFileName = null;
      this.currentFileHandle = null;
      this.lastSavedContent = '';
      this.isFileModified = false;

      // Update UI indicators
      this.updateDocumentTitle();
    },

    // File System Access API integration
    isFileSystemAccessSupported() {
      // Check if File System Access API is supported
      return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    },

    async loadFile() {
      try {
        if (!this.isFileSystemAccessSupported()) {
          // Fallback for unsupported browsers
          return this.loadFileFallback();
        }

        // Use File System Access API
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Mermaid files',
            accept: {
              'text/plain': ['.mmd', '.mermaid', '.txt'],
              'text/markdown': ['.md']
            }
          }],
          multiple: false
        });

        const file = await fileHandle.getFile();
        const content = await file.text();

        // Update editor content
        this.mermaidText = content;
        if (this.editorView) {
          this.editorView.dispatch({
            changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
          });
        }

        // Set file state
        this.setFileState(file.name, fileHandle, content);

        // Render the diagram
        this.renderDiagram();

        // Update auto-save storage to match loaded file
        await this.saveAutoSaveData();

        console.log('File loaded successfully:', file.name);

      } catch (error) {
        if (error.name === 'AbortError') {
          // User cancelled the file picker
          console.log('File loading cancelled by user');
          return;
        }

        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
      }
    },

    loadFileFallback() {
      // Fallback method for browsers that don't support File System Access API
      return new Promise(async (resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mmd,.mermaid,.txt,.md';

        input.onchange = async (event) => {
          try {
            const file = event.target.files[0];
            if (!file) {
              resolve();
              return;
            }

            const content = await file.text();

            // Update editor content
            this.mermaidText = content;
            if (this.editorView) {
              this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
              });
            }

            // Set file state (no file handle in fallback mode)
            this.setFileState(file.name, null, content);

            // Render the diagram
            this.renderDiagram();

            // Update auto-save storage to match loaded file
            await this.saveAutoSaveData();

            console.log('File loaded successfully (fallback):', file.name);
            resolve();

          } catch (error) {
            console.error('Error loading file (fallback):', error);
            alert('Error loading file: ' + error.message);
            reject(error);
          }
        };

        input.oncancel = () => {
          console.log('File loading cancelled by user (fallback)');
          resolve();
        };

        // Trigger file picker
        input.click();
      });
    },

    // Smart save functionality
    async saveFile() {
      try {
        if (this.currentFileHandle && this.isFileSystemAccessSupported()) {
          // Update existing file
          await this.updateExistingFile();
        } else {
          // Create new file or use fallback
          await this.saveAsFile();
        }
      } catch (error) {
        console.error('Error saving file:', error);
        alert('Error saving file: ' + error.message);
      }
    },

    async saveAsFile() {
      try {
        if (!this.isFileSystemAccessSupported()) {
          // Fallback for unsupported browsers
          return this.saveFileFallback();
        }

        // Use File System Access API for save-as
        const fileHandle = await window.showSaveFilePicker({
          types: [{
            description: 'Mermaid files',
            accept: {
              'text/plain': ['.mmd', '.mermaid', '.txt'],
              'text/markdown': ['.md']
            }
          }],
          suggestedName: this.currentFileName || 'diagram.mmd'
        });

        // Write content to file
        const writable = await fileHandle.createWritable();
        await writable.write(this.mermaidText);
        await writable.close();

        // Get file info
        const file = await fileHandle.getFile();

        // Update file state
        this.setFileState(file.name, fileHandle, this.mermaidText);

        // Update auto-save storage
        await this.saveAutoSaveData();

        console.log('File saved successfully:', file.name);
        alert('File saved successfully!');

      } catch (error) {
        if (error.name === 'AbortError') {
          // User cancelled the save dialog
          console.log('File saving cancelled by user');
          return;
        }

        throw error;
      }
    },

    async updateExistingFile() {
      try {
        if (!this.currentFileHandle) {
          throw new Error('No file handle available for update');
        }

        // Check if we still have permission to write to the file
        const permission = await this.currentFileHandle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const requestPermission = await this.currentFileHandle.requestPermission({ mode: 'readwrite' });
          if (requestPermission !== 'granted') {
            throw new Error('Permission denied to write to file');
          }
        }

        // Write content to existing file
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(this.mermaidText);
        await writable.close();

        // Update file state (content is now saved)
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.updateDocumentTitle();

        // Update auto-save storage
        await this.saveAutoSaveData();

        console.log('File updated successfully:', this.currentFileName);
        alert('File updated successfully!');

      } catch (error) {
        console.error('Error updating existing file:', error);

        // If updating fails, fall back to save-as
        console.log('Falling back to save-as due to update error');
        await this.saveAsFile();
      }
    },

    async saveFileFallback() {
      // Fallback method for browsers that don't support File System Access API
      try {
        const blob = new Blob([this.mermaidText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = this.currentFileName || 'diagram.mmd';

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(url);

        // Update file state (mark as saved, but no file handle in fallback)
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.updateDocumentTitle();

        // Update auto-save storage
        await this.saveAutoSaveData();

        console.log('File downloaded successfully (fallback):', this.currentFileName || 'diagram.mmd');
        this.showSuccessMessage('File downloaded successfully!');

      } catch (error) {
        console.error('Error downloading file (fallback):', error);
        this.showErrorMessage('Error downloading file: ' + error.message);
      }
    },

    // User feedback methods
    showSuccessMessage(message) {
      // Create a user-friendly success notification
      this.showNotification(message, 'success');
    },

    showErrorMessage(message) {
      // Create a user-friendly error notification
      this.showNotification(message, 'error');
    },

    showInfoMessage(message) {
      // Create a user-friendly info notification
      this.showNotification(message, 'info');
    },

    showWarningMessage(message) {
      // Create a user-friendly warning notification
      this.showNotification(message, 'warning');
    },

    showNotification(message, type = 'info', duration = 4000) {
      // Clear any existing notification timeout
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }

      // Set notification icons
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };

      // Update notification state
      this.notification.show = true;
      this.notification.message = message;
      this.notification.type = type;
      this.notification.icon = icons[type] || icons.info;

      // Auto-hide notification after duration (except for errors which stay longer)
      const autoHideDuration = type === 'error' ? duration * 2 : duration;
      this.notification.timeout = setTimeout(() => {
        this.hideNotification();
      }, autoHideDuration);
    },

    hideNotification() {
      this.notification.show = false;
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
        this.notification.timeout = null;
      }
    },

    // Enhanced error handling for CodeMirror initialization
    initCodeMirrorWithErrorHandling() {
      try {
        this.initCodeMirror();
      } catch (error) {
        console.error('Error initializing CodeMirror:', error);

        // Try to initialize with basic configuration
        try {
          this.initBasicCodeMirror();
          this.showWarningMessage('Editor initialized with reduced functionality due to configuration issues.');
        } catch (fallbackError) {
          console.error('Error initializing basic CodeMirror:', fallbackError);
          this.showErrorMessage('Unable to initialize the code editor. Please refresh the page and try again.');
        }
      }
    },

    initBasicCodeMirror() {
      // Fallback CodeMirror initialization with minimal configuration
      const self = this;

      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.mermaidText,
          extensions: [
            basicSetup,
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                self.mermaidText = update.state.doc.toString();
                self.renderWithDebounce();
                self.autoSaveContent();
                self.updateFileState();
              }
            })
          ]
        }),
        parent: this.$refs.editor
      });
    },

    // Enhanced error handling for file operations
    async loadFileWithErrorHandling() {
      try {
        await this.loadFile();
        this.showSuccessMessage('File loaded successfully!');
      } catch (error) {
        console.error('Error in loadFileWithErrorHandling:', error);

        let errorMessage = 'Failed to load file';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'File access permission denied. Please try again and allow file access.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error: Unable to access the selected file.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'The selected file could not be found.';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'File system is in an invalid state. Please try again.';
        } else if (error.message) {
          errorMessage = `Failed to load file: ${error.message}`;
        }

        this.showErrorMessage(errorMessage);
      }
    },

    async saveFileWithErrorHandling() {
      try {
        await this.saveFile();
      } catch (error) {
        console.error('Error in saveFileWithErrorHandling:', error);

        let errorMessage = 'Failed to save file';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'File save permission denied. Please try again and allow file access.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error: Unable to save to the selected location.';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'File system is in an invalid state. Please try again.';
        } else if (error.name === 'QuotaExceededError') {
          errorMessage = 'Storage quota exceeded. Please free up some space and try again.';
        } else if (error.message) {
          errorMessage = `Failed to save file: ${error.message}`;
        }

        this.showErrorMessage(errorMessage);
      }
    },

    // Enhanced error handling for export operations
    async exportImageWithErrorHandling(filename = 'diagram.png') {
      try {
        const svg = this.$refs.diagramContainer.querySelector('svg');
        if (!svg) {
          this.showErrorMessage('No diagram available to export. Please create a diagram first.');
          return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Unable to create canvas context for image export');
        }

        const img = new Image();

        // Use Promise to handle image loading
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              canvas.width = img.width;
              canvas.height = img.height;

              // Get computed background color of diagram-container
              const bg = window.getComputedStyle(this.$refs.diagramContainer).backgroundColor || '#ffffff';
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);

              const png = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = filename;
              link.href = png;
              link.click();

              resolve();
            } catch (drawError) {
              reject(drawError);
            }
          };

          img.onerror = () => {
            reject(new Error('Failed to load SVG for image export'));
          };

          // Use decodeURIComponent instead of deprecated unescape
          img.src = 'data:image/svg+xml;base64,' + btoa(decodeURIComponent(encodeURIComponent(svgData)));
        });

        this.showSuccessMessage('Image exported successfully!');

      } catch (error) {
        console.error('Error exporting image:', error);

        let errorMessage = 'Failed to export image';
        if (error.message.includes('canvas')) {
          errorMessage = 'Unable to create image canvas. Your browser may not support this feature.';
        } else if (error.message.includes('SVG')) {
          errorMessage = 'Unable to process diagram for export. Please ensure the diagram is valid.';
        } else if (error.message) {
          errorMessage = `Export failed: ${error.message}`;
        }

        this.showErrorMessage(errorMessage);
      }
    }
  }
});
</script>

<style scoped>
.mermaid-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f9f9f9;
  margin: 0;
  padding: 0;
}

.split-pane {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  position: relative;
  background: #eaeaea;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.pane {
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

.editor-pane {
  background: #f5f5ff;
  border-right: 1px solid #ccc;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.diagram-pane {
  background: #fff;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.split-bar {
  width: 6px;
  background: #bbb;
  cursor: col-resize;
  z-index: 2;
  transition: background 0.2s;
}

.split-bar:hover,
.split-bar:active {
  background: #888;
}

.mermaid-codemirror {
  flex: 1 1 auto;
  height: 0;
  /* Force flex calculation */
  width: 100%;
  font-size: 1rem;
  border: none;
  border-radius: 0;
  background: #f8f9fa;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.diagram-container {
  flex: 1;
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  background-color: thistle;
  height: 100%;
  box-sizing: border-box;
}

.error {
  color: #ff4444;
  padding: 1rem;
  background-color: #ffeeee;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .split-pane {
    flex-direction: column;
    height: 100vh !important;
  }

  .editor-pane,
  .diagram-pane {
    width: 100% !important;
    min-width: 0;
    max-width: 100%;
    height: calc(50vh - 3px);
    min-height: 150px;
  }

  .split-bar {
    width: 100%;
    height: 6px;
    cursor: row-resize;
    background: #999;
    flex-shrink: 0;
  }

  .split-bar:hover,
  .split-bar:active {
    background: #666;
  }

  .mermaid-codemirror {
    font-size: 0.9rem;
  }

  .diagram-container {
    padding: 0.5rem;
  }
}



/***** Editor Toolbar Styles *****/
.editor-toolbar {
  flex: 0 0 auto;
  height: 40px;
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  gap: 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-operations {
  flex: 0 0 auto;
}

.theme-selection {
  flex: 0 0 auto;
}

.current-file-display {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.file-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.file-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-dot {
  color: #dc3545;
  font-weight: bold;
  font-size: 1.2em;
  flex-shrink: 0;
  line-height: 1;
}

.compatibility-badge {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  font-size: 0.7rem;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.toolbar-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.toolbar-btn:active {
  background: #dee2e6;
  transform: translateY(1px);
}

.toolbar-btn:disabled {
  background: #f8f9fa;
  border-color: #dee2e6;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.theme-label {
  font-size: 0.8rem;
  color: #495057;
  font-weight: 500;
  margin-right: 4px;
}

.theme-select {
  background: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  min-width: 80px;
}

.theme-select:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.filename-info {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.filename-text {
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-indicator {
  color: #dc3545;
  font-weight: bold;
  font-size: 1.1em;
  flex-shrink: 0;
}

.compatibility-warning {
  color: #856404;
  font-size: 0.75rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 3px;
  padding: 1px 4px;
  flex-shrink: 0;
}

/***** Notification Styles *****/
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  animation: slideInRight 0.3s ease-out;
}

.notification.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.notification.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.notification.warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.notification.info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.notification-icon {
  font-size: 1.1em;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/***** Enhanced Error Styles *****/
.error {
  color: #721c24;
  padding: 1rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  line-height: 1.5;
}

.error strong {
  display: block;
  margin-bottom: 8px;
  font-size: 1.1em;
}

.error small {
  display: block;
  margin-top: 8px;
  opacity: 0.8;
  font-style: italic;
}

/***** Mermaid Theme Styles *****/
.mermaid-theme-default {
  background-color: thistle;
  color: #222;
}

.mermaid-theme-dark {
  background-color: #1e1e1e;
  color: #eee;
}

.mermaid-theme-forest {
  background-color: #e4f1e1;
  color: #234d20;
}

.mermaid-theme-neutral {
  background-color: #f4f4f4;
  color: #222;
}

/***** Responsive Adjustments *****/

/* Tablet and small desktop adjustments */
@media (max-width: 1024px) and (min-width: 769px) {
  .editor-filename-bar {
    height: 30px;
    padding: 5px 10px;
    font-size: 0.82rem;
  }

  .filename-info {
    gap: 8px;
  }

  .compatibility-warning {
    font-size: 0.72rem;
  }
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .editor-filename-bar {
    height: 28px;
    padding: 4px 8px;
    font-size: 0.8rem;
    flex-wrap: wrap;
    min-height: 28px;
  }

  .filename-info {
    gap: 6px;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .filename-text {
    font-size: 0.8rem;
    max-width: 70%;
  }

  .modified-indicator {
    font-size: 1em;
  }

  .compatibility-warning {
    font-size: 0.7rem;
    padding: 1px 3px;
    margin-top: 2px;
    order: 2;
    flex-basis: 100%;
  }

  .editor-toolbar {
    height: auto;
    min-height: 36px;
    padding: 3px 6px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-section {
    gap: 4px;
  }

  .file-info {
    flex: 1 1 100%;
    order: 1;
  }

  .file-operations {
    flex: 1 1 auto;
    order: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .theme-selection {
    flex: 0 0 auto;
    order: 3;
  }

  .toolbar-btn {
    padding: 3px 6px;
    font-size: 0.75rem;
    min-width: auto;
  }

  .file-name {
    font-size: 0.8rem;
  }

  .theme-select {
    font-size: 0.75rem;
    padding: 3px 6px;
    min-width: 70px;
  }

  .theme-label {
    font-size: 0.75rem;
  }

  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
    font-size: 0.85rem;
  }
}

/* Small mobile adjustments */
@media (max-width: 480px) {
  .editor-filename-bar {
    height: 26px;
    padding: 3px 6px;
    font-size: 0.75rem;
  }

  .filename-text {
    font-size: 0.75rem;
    max-width: 65%;
  }

  .modified-indicator {
    font-size: 0.9em;
  }

  .compatibility-warning {
    font-size: 0.65rem;
    padding: 1px 2px;
  }

  .notification {
    font-size: 0.8rem;
    padding: 10px 12px;
  }
}

/* Landscape mobile adjustments */
@media (max-width: 768px) and (orientation: landscape) {
  .editor-filename-bar {
    height: 24px;
    padding: 2px 6px;
    font-size: 0.75rem;
  }

  .filename-info {
    gap: 4px;
  }

  .filename-text {
    max-width: 75%;
  }

  .compatibility-warning {
    font-size: 0.65rem;
    margin-top: 0;
    flex-basis: auto;
    order: 0;
  }
}
</style>