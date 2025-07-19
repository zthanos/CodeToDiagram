<template>
  <div 
    class="navigation-pane" 
    :class="{ 
      'collapsed': isCollapsed,
      'mobile-layout': isMobileLayout 
    }"
    :style="navigationPaneStyle"
    ref="navigationPane"
  >
    <!-- Navigation Toggle Button (Mobile) -->
    <div class="nav-toggle-mobile" v-if="isMobileLayout">
      <button 
        class="nav-toggle-btn" 
        @click="toggleCollapse"
        :title="isCollapsed ? 'Show Navigation' : 'Hide Navigation'"
        :aria-label="isCollapsed ? 'Show Navigation' : 'Hide Navigation'"
        :aria-expanded="!isCollapsed"
      >
        <span class="toggle-icon" :class="{ 'collapsed': isCollapsed }">
          {{ isCollapsed ? '▼' : '▲' }}
        </span>
        <span class="toggle-text">{{ isCollapsed ? 'Show Navigation' : 'Hide Navigation' }}</span>
      </button>
    </div>

    <!-- Navigation Content -->
    <div class="navigation-content" :class="{ 'collapsed': isCollapsed }">
      <!-- Project Toolbar Slot -->
      <div class="project-toolbar-container">
        <slot name="project-toolbar">
          <div class="default-toolbar">
            <div class="project-name">No Project</div>
          </div>
        </slot>
      </div>

      <!-- Diagram List Slot -->
      <div class="diagram-list-container">
        <slot name="diagram-list">
          <div class="default-diagram-list">
            <div class="empty-state">
              <p>No diagrams available</p>
            </div>
          </div>
        </slot>
      </div>
    </div>

    <!-- Collapse Toggle Button (Desktop) -->
    <div class="collapse-toggle-desktop" v-if="!isMobileLayout">
      <button 
        class="collapse-btn" 
        @click="toggleCollapse"
        :title="isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'"
        :aria-label="isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'"
        :aria-expanded="!isCollapsed"
      >
        <span class="collapse-icon" :class="{ 'collapsed': isCollapsed }">
          {{ isCollapsed ? '▶' : '◀' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'NavigationPane',
  props: {
    initialCollapsed: {
      type: Boolean,
      default: false
    },
    width: {
      type: Number,
      default: 300,
      validator: (value) => value >= 200 && value <= 600
    },
    minWidth: {
      type: Number,
      default: 200
    },
    maxWidth: {
      type: Number,
      default: 600
    },
    persistState: {
      type: Boolean,
      default: true
    },
    storageKey: {
      type: String,
      default: 'navigationPaneState'
    },
    enableKeyboardShortcuts: {
      type: Boolean,
      default: true
    },
    mobileBreakpoint: {
      type: Number,
      default: 768
    }
  },
  emits: [
    'collapse-changed',
    'width-changed',
    'toggle',
    'expand',
    'collapse'
  ],
  data() {
    return {
      isCollapsed: false,
      currentWidth: 300,
      isMobileLayout: false,
      resizeObserver: null,
      keyboardHandler: null,
      animationDuration: 300, // ms
      debounceTimer: null
    }
  },
  computed: {
    navigationPaneStyle() {
      if (this.isMobileLayout) {
        return {
          '--nav-width': this.isCollapsed ? '0px' : '100%',
          '--nav-height': this.isCollapsed ? '0px' : 'auto',
          '--animation-duration': `${this.animationDuration}ms`
        }
      }
      
      return {
        '--nav-width': this.isCollapsed ? '0px' : `${this.currentWidth}px`,
        '--nav-min-width': `${this.minWidth}px`,
        '--nav-max-width': `${this.maxWidth}px`,
        '--animation-duration': `${this.animationDuration}ms`
      }
    }
  },
  watch: {
    isCollapsed(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.handleCollapseChange(newValue)
      }
    },
    currentWidth(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.$emit('width-changed', newValue)
        if (this.persistState) {
          this.debouncedPersistState()
        }
      }
    }
  },
  mounted() {
    this.initializeComponent()
  },
  beforeUnmount() {
    this.cleanupComponent()
  },
  methods: {
    // Component initialization
    initializeComponent() {
      try {
        // Set initial values from props
        this.isCollapsed = this.initialCollapsed
        this.currentWidth = this.width
        
        // Restore state from storage if enabled
        if (this.persistState) {
          this.restoreState()
        }
        
        // Setup responsive behavior
        this.setupResponsiveLayout()
        
        // Setup keyboard shortcuts
        if (this.enableKeyboardShortcuts) {
          this.setupKeyboardShortcuts()
        }
        
        // Setup resize observer for responsive behavior
        this.setupResizeObserver()
        
        console.log('NavigationPane initialized successfully')
      } catch (error) {
        console.error('Error initializing NavigationPane:', error)
      }
    },

    // Cleanup component
    cleanupComponent() {
      // Remove keyboard event listeners
      if (this.keyboardHandler) {
        document.removeEventListener('keydown', this.keyboardHandler)
        this.keyboardHandler = null
      }
      
      // Disconnect resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
      
      // Clear debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = null
      }
    },

    // Toggle collapse state
    toggleCollapse() {
      const wasCollapsed = this.isCollapsed
      this.isCollapsed = !this.isCollapsed
      
      // Emit specific events
      this.$emit('toggle', this.isCollapsed)
      if (this.isCollapsed) {
        this.$emit('collapse')
      } else {
        this.$emit('expand')
      }
      
      // Persist state if enabled
      if (this.persistState) {
        this.debouncedPersistState()
      }
      
      // Log for debugging
      console.log(`Navigation pane ${this.isCollapsed ? 'collapsed' : 'expanded'}`)
    },

    // Programmatic expand
    expand() {
      if (this.isCollapsed) {
        this.isCollapsed = false
        this.$emit('expand')
        this.$emit('toggle', false)
      }
    },

    // Programmatic collapse
    collapse() {
      if (!this.isCollapsed) {
        this.isCollapsed = true
        this.$emit('collapse')
        this.$emit('toggle', true)
      }
    },

    // Handle collapse state change
    handleCollapseChange(isCollapsed) {
      this.$emit('collapse-changed', isCollapsed)
      
      // Update CSS custom properties for smooth animations
      this.updateCSSCustomProperties()
      
      // Focus management for accessibility
      this.$nextTick(() => {
        if (!isCollapsed) {
          // When expanding, focus the first focusable element
          this.focusFirstElement()
        }
      })
    },

    // Update CSS custom properties
    updateCSSCustomProperties() {
      if (this.$refs.navigationPane) {
        const element = this.$refs.navigationPane
        element.style.setProperty('--nav-width', 
          this.isCollapsed ? '0px' : 
          this.isMobileLayout ? '100%' : `${this.currentWidth}px`
        )
        element.style.setProperty('--nav-height', 
          this.isMobileLayout && this.isCollapsed ? '0px' : 'auto'
        )
      }
    },

    // Focus first focusable element
    focusFirstElement() {
      if (this.$refs.navigationPane && !this.isCollapsed) {
        const focusableElements = this.$refs.navigationPane.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    },

    // Setup responsive layout detection
    setupResponsiveLayout() {
      this.checkMobileLayout()
      window.addEventListener('resize', this.handleWindowResize)
    },

    // Handle window resize
    handleWindowResize() {
      // Debounce resize handling
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      
      this.debounceTimer = setTimeout(() => {
        this.checkMobileLayout()
        this.updateCSSCustomProperties()
      }, 100)
    },

    // Check if mobile layout should be used
    checkMobileLayout() {
      const wasMobile = this.isMobileLayout
      this.isMobileLayout = window.innerWidth < this.mobileBreakpoint
      
      // If layout changed, update CSS properties
      if (wasMobile !== this.isMobileLayout) {
        this.$nextTick(() => {
          this.updateCSSCustomProperties()
        })
      }
    },

    // Setup resize observer for container size changes
    setupResizeObserver() {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            // Handle container resize if needed
            this.handleContainerResize(entry)
          }
        })
        
        if (this.$refs.navigationPane) {
          this.resizeObserver.observe(this.$refs.navigationPane)
        }
      }
    },

    // Handle container resize
    handleContainerResize(entry) {
      // This can be used for advanced responsive behavior
      // Currently just ensures CSS properties are up to date
      this.$nextTick(() => {
        this.updateCSSCustomProperties()
      })
    },

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
      this.keyboardHandler = (event) => {
        // Ctrl/Cmd + B to toggle navigation (common IDE shortcut)
        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
          event.preventDefault()
          this.toggleCollapse()
          return
        }
        
        // Escape to collapse when focused inside navigation
        if (event.key === 'Escape' && !this.isCollapsed) {
          const navigationPane = this.$refs.navigationPane
          if (navigationPane && navigationPane.contains(event.target)) {
            event.preventDefault()
            this.collapse()
          }
        }
      }
      
      document.addEventListener('keydown', this.keyboardHandler)
    },

    // Persist state to localStorage
    persistState() {
      try {
        const state = {
          isCollapsed: this.isCollapsed,
          width: this.currentWidth,
          timestamp: Date.now()
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to persist NavigationPane state:', error)
      }
    },

    // Debounced persist state
    debouncedPersistState() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      
      this.debounceTimer = setTimeout(() => {
        this.persistState()
      }, 500)
    },

    // Restore state from localStorage
    restoreState() {
      try {
        const savedState = localStorage.getItem(this.storageKey)
        if (savedState) {
          const state = JSON.parse(savedState)
          
          // Validate and apply saved state
          if (typeof state.isCollapsed === 'boolean') {
            this.isCollapsed = state.isCollapsed
          }
          
          if (typeof state.width === 'number' && 
              state.width >= this.minWidth && 
              state.width <= this.maxWidth) {
            this.currentWidth = state.width
          }
          
          console.log('NavigationPane state restored successfully')
        }
      } catch (error) {
        console.warn('Failed to restore NavigationPane state:', error)
      }
    },

    // Public API methods
    getState() {
      return {
        isCollapsed: this.isCollapsed,
        width: this.currentWidth,
        isMobileLayout: this.isMobileLayout
      }
    },

    setState(state) {
      if (typeof state.isCollapsed === 'boolean') {
        this.isCollapsed = state.isCollapsed
      }
      
      if (typeof state.width === 'number' && 
          state.width >= this.minWidth && 
          state.width <= this.maxWidth) {
        this.currentWidth = state.width
      }
    },

    // Update width (for external splitter control)
    updateWidth(newWidth) {
      const constrainedWidth = Math.max(
        this.minWidth, 
        Math.min(this.maxWidth, newWidth)
      )
      
      if (constrainedWidth !== this.currentWidth) {
        this.currentWidth = constrainedWidth
        this.updateCSSCustomProperties()
      }
    }
  }
})
</script>

<style scoped>
.navigation-pane {
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-right: 1px solid #e1e4e8;
  overflow: hidden;
  width: var(--nav-width, 300px);
  min-width: var(--nav-min-width, 200px);
  max-width: var(--nav-max-width, 600px);
  transition: all var(--animation-duration, 300ms) cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Collapsed state */
.navigation-pane.collapsed {
  width: 0;
  min-width: 0;
  opacity: 0;
  transform: translateX(-10px);
  border-right-width: 0;
}

/* Navigation content */
.navigation-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: all var(--animation-duration, 300ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.navigation-content.collapsed {
  opacity: 0;
  transform: translateX(-20px);
}

/* Project toolbar container */
.project-toolbar-container {
  flex-shrink: 0;
  border-bottom: 1px solid #e1e4e8;
}

.default-toolbar {
  padding: 1rem;
  background-color: #fff;
}

.project-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: #24292f;
}

/* Diagram list container */
.diagram-list-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.default-diagram-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #656d76;
}

.empty-state p {
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

/* Desktop collapse toggle */
.collapse-toggle-desktop {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  z-index: 10;
}

.collapse-btn {
  width: 24px;
  height: 48px;
  background-color: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  color: #656d76;
}

.collapse-btn:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
  color: #24292f;
}

.collapse-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.collapse-icon {
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: scaleX(-1);
}

/* Mobile navigation toggle */
.nav-toggle-mobile {
  display: none;
  padding: 0.5rem;
  background-color: #fff;
  border-bottom: 1px solid #e1e4e8;
}

.nav-toggle-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: #24292f;
}

.nav-toggle-btn:hover {
  background-color: #f3f4f6;
  border-color: #c9d1d9;
}

.nav-toggle-btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.toggle-icon {
  transition: transform 0.2s ease;
  font-size: 0.75rem;
}

.toggle-icon.collapsed {
  transform: rotate(180deg);
}

.toggle-text {
  font-weight: 500;
}

/* Mobile layout */
.navigation-pane.mobile-layout {
  width: 100%;
  max-width: 100%;
  height: var(--nav-height, auto);
  max-height: 50vh;
  border-right: none;
  border-bottom: 1px solid #e1e4e8;
  transform: none;
}

.navigation-pane.mobile-layout.collapsed {
  height: 0;
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
  border-bottom-width: 0;
}

.navigation-pane.mobile-layout .nav-toggle-mobile {
  display: block;
}

.navigation-pane.mobile-layout .collapse-toggle-desktop {
  display: none;
}

.navigation-pane.mobile-layout .diagram-list-container {
  max-height: calc(50vh - 120px);
}

/* Responsive breakpoints */

/* Tablet (768px - 991px) */
@media (min-width: 768px) and (max-width: 991px) {
  .navigation-pane {
    --nav-min-width: 200px;
    --nav-max-width: 400px;
  }
}

/* Mobile landscape (481px - 767px) */
@media (max-width: 767px) and (orientation: landscape) {
  .navigation-pane.mobile-layout {
    width: 250px;
    max-width: 250px;
    height: 100%;
    max-height: 100%;
    border-right: 1px solid #e1e4e8;
    border-bottom: none;
  }
  
  .navigation-pane.mobile-layout.collapsed {
    width: 0;
    height: 100%;
    max-height: 100%;
    transform: translateX(-10px);
    border-right-width: 0;
  }
  
  .navigation-pane.mobile-layout .nav-toggle-mobile {
    display: none;
  }
  
  .navigation-pane.mobile-layout .collapse-toggle-desktop {
    display: block;
    right: -12px;
  }
}

/* Mobile portrait (max 767px) */
@media (max-width: 767px) and (orientation: portrait) {
  .navigation-pane.mobile-layout {
    max-height: 45vh;
  }
  
  .navigation-pane.mobile-layout .diagram-list-container {
    max-height: calc(45vh - 100px);
  }
}

/* Small mobile (max 480px) */
@media (max-width: 480px) {
  .default-toolbar {
    padding: 0.75rem;
  }
  
  .project-name {
    font-size: 1rem;
  }
  
  .nav-toggle-btn {
    padding: 0.6rem;
    font-size: 0.8rem;
  }
  
  .toggle-text {
    display: none;
  }
  
  .collapse-btn {
    width: 20px;
    height: 40px;
    font-size: 0.7rem;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .navigation-pane,
  .navigation-content,
  .collapse-btn,
  .nav-toggle-btn,
  .toggle-icon,
  .collapse-icon {
    transition: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .navigation-pane {
    border-right-color: #000;
  }
  
  .collapse-btn,
  .nav-toggle-btn {
    border-color: #000;
  }
  
  .project-toolbar-container {
    border-bottom-color: #000;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .navigation-pane {
    background-color: #1f2937;
    border-right-color: #374151;
  }
  
  .default-toolbar {
    background-color: #111827;
    border-bottom-color: #374151;
  }
  
  .project-name {
    color: #f9fafb;
  }
  
  .collapse-btn,
  .nav-toggle-btn {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .collapse-btn:hover,
  .nav-toggle-btn:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }
  
  .empty-state {
    color: #9ca3af;
  }
  
  .nav-toggle-mobile {
    background-color: #111827;
    border-bottom-color: #374151;
  }
}

/* Focus visible for better keyboard navigation */
.collapse-btn:focus-visible,
.nav-toggle-btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Animation performance optimization */
.navigation-pane,
.navigation-content {
  will-change: transform, opacity, width;
}

/* Ensure proper stacking context */
.navigation-pane {
  z-index: 1;
}

.collapse-toggle-desktop {
  z-index: 2;
}
</style>