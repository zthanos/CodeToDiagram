import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WorkspaceLoadingOverlay from '../../components/WorkspaceLoadingOverlay.vue'

describe('WorkspaceLoadingOverlay', () => {
  let wrapper
  let mockOnCancel
  let mockOnRetry
  let mockOnTimeout

  beforeEach(() => {
    mockOnCancel = vi.fn()
    mockOnRetry = vi.fn()
    mockOnTimeout = vi.fn()
    
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  const createWrapper = (props = {}) => {
    return mount(WorkspaceLoadingOverlay, {
      props: {
        show: true,
        message: 'Loading...',
        onCancel: mockOnCancel,
        onRetry: mockOnRetry,
        onTimeout: mockOnTimeout,
        ...props
      }
    })
  }

  describe('Visibility', () => {
    it('shows when show prop is true', () => {
      wrapper = createWrapper({ show: true })
      
      expect(wrapper.find('.workspace-loading-overlay').exists()).toBe(true)
      expect(wrapper.find('.loading-content').exists()).toBe(true)
    })

    it('hides when show prop is false', () => {
      wrapper = createWrapper({ show: false })
      
      expect(wrapper.find('.workspace-loading-overlay').exists()).toBe(false)
    })

    it('applies fullscreen class when fullscreen is true', () => {
      wrapper = createWrapper({ fullscreen: true })
      
      expect(wrapper.find('.overlay-fullscreen').exists()).toBe(true)
    })

    it('does not apply fullscreen class when fullscreen is false', () => {
      wrapper = createWrapper({ fullscreen: false })
      
      expect(wrapper.find('.overlay-fullscreen').exists()).toBe(false)
    })
  })

  describe('Loading Types', () => {
    it('shows spinner loader by default', () => {
      wrapper = createWrapper({ type: 'spinner' })
      
      expect(wrapper.find('.spinner').exists()).toBe(true)
      expect(wrapper.findAll('.spinner-ring')).toHaveLength(4)
    })

    it('shows dots loader when type is dots', () => {
      wrapper = createWrapper({ type: 'dots' })
      
      expect(wrapper.find('.dots-loader').exists()).toBe(true)
      expect(wrapper.findAll('.dot')).toHaveLength(3)
    })

    it('shows pulse loader when type is pulse', () => {
      wrapper = createWrapper({ type: 'pulse' })
      
      expect(wrapper.find('.pulse-loader').exists()).toBe(true)
      expect(wrapper.find('.pulse-circle').exists()).toBe(true)
    })

    it('shows icon loader when type is icon', () => {
      wrapper = createWrapper({ type: 'icon', icon: '🔄' })
      
      expect(wrapper.find('.default-icon').exists()).toBe(true)
      expect(wrapper.find('.default-icon').text()).toBe('🔄')
    })

    it('uses default icon when no icon provided', () => {
      wrapper = createWrapper({ type: 'icon' })
      
      expect(wrapper.find('.default-icon').text()).toBe('⏳')
    })
  })

  describe('Spinner Sizes', () => {
    it('applies small size class', () => {
      wrapper = createWrapper({ type: 'spinner', size: 'small' })
      
      expect(wrapper.find('.spinner-small').exists()).toBe(true)
    })

    it('applies medium size class by default', () => {
      wrapper = createWrapper({ type: 'spinner' })
      
      expect(wrapper.find('.spinner-medium').exists()).toBe(true)
    })

    it('applies large size class', () => {
      wrapper = createWrapper({ type: 'spinner', size: 'large' })
      
      expect(wrapper.find('.spinner-large').exists()).toBe(true)
    })
  })

  describe('Messages', () => {
    it('displays loading message', () => {
      wrapper = createWrapper({ message: 'Loading workspace data...' })
      
      expect(wrapper.find('.message-title').text()).toBe('Loading workspace data...')
    })

    it('displays subtitle when provided', () => {
      wrapper = createWrapper({ 
        message: 'Loading...',
        subtitle: 'Please wait while we fetch your data'
      })
      
      expect(wrapper.find('.message-subtitle').text()).toBe('Please wait while we fetch your data')
    })

    it('does not show message section when no message provided', () => {
      wrapper = createWrapper({ message: undefined })
      
      expect(wrapper.find('.loading-message').exists()).toBe(false)
    })
  })

  describe('Progress Bar', () => {
    it('shows progress bar when progress is provided', () => {
      wrapper = createWrapper({ progress: 50 })
      
      expect(wrapper.find('.loading-progress').exists()).toBe(true)
      expect(wrapper.find('.progress-bar').exists()).toBe(true)
      expect(wrapper.find('.progress-text').text()).toBe('50%')
    })

    it('updates progress bar width', () => {
      wrapper = createWrapper({ progress: 75 })
      
      const progressFill = wrapper.find('.progress-fill')
      expect(progressFill.attributes('style')).toContain('width: 75%')
    })

    it('clamps progress to 0-100 range', async () => {
      wrapper = createWrapper({ progress: 150 })
      
      const progressFill = wrapper.find('.progress-fill')
      expect(progressFill.attributes('style')).toContain('width: 100%')
      
      await wrapper.setProps({ progress: -10 })
      expect(progressFill.attributes('style')).toContain('width: 0%')
    })

    it('does not show progress bar when progress is undefined', () => {
      wrapper = createWrapper({ progress: undefined })
      
      expect(wrapper.find('.loading-progress').exists()).toBe(false)
    })
  })

  describe('Loading Details', () => {
    const mockDetails = [
      { text: 'Loading user data', status: 'success' },
      { text: 'Loading workspace settings', status: 'loading' },
      { text: 'Loading project files', status: 'pending' }
    ]

    it('shows details when showDetails is true and details provided', () => {
      wrapper = createWrapper({ 
        showDetails: true,
        details: mockDetails
      })
      
      expect(wrapper.find('.loading-details').exists()).toBe(true)
      expect(wrapper.find('.details-toggle').exists()).toBe(true)
    })

    it('toggles details visibility when toggle is clicked', async () => {
      wrapper = createWrapper({ 
        showDetails: true,
        details: mockDetails
      })
      
      expect(wrapper.find('.details-content').exists()).toBe(false)
      
      await wrapper.find('.details-toggle').trigger('click')
      
      expect(wrapper.find('.details-content').exists()).toBe(true)
      expect(wrapper.findAll('.detail-item')).toHaveLength(3)
    })

    it('displays correct icons for different statuses', async () => {
      wrapper = createWrapper({ 
        showDetails: true,
        details: mockDetails
      })
      
      await wrapper.find('.details-toggle').trigger('click')
      
      const detailItems = wrapper.findAll('.detail-item')
      expect(detailItems[0].find('.detail-icon').text()).toBe('✅') // success
      expect(detailItems[1].find('.detail-icon').text()).toBe('🔄') // loading
      expect(detailItems[2].find('.detail-icon').text()).toBe('⏳') // pending
    })

    it('shows duration when provided', async () => {
      const detailsWithDuration = [
        { text: 'Completed task', status: 'success', duration: 1500 }
      ]
      
      wrapper = createWrapper({ 
        showDetails: true,
        details: detailsWithDuration
      })
      
      await wrapper.find('.details-toggle').trigger('click')
      
      expect(wrapper.find('.detail-duration').text()).toBe('1500ms')
    })

    it('does not show details when showDetails is false', () => {
      wrapper = createWrapper({ 
        showDetails: false,
        details: mockDetails
      })
      
      expect(wrapper.find('.loading-details').exists()).toBe(false)
    })
  })

  describe('Action Buttons', () => {
    it('shows cancel button when cancellable is true', () => {
      wrapper = createWrapper({ cancellable: true })
      
      expect(wrapper.find('.loading-btn-secondary').exists()).toBe(true)
      expect(wrapper.find('.loading-btn-secondary').text()).toBe('Cancel')
    })

    it('shows retry button when showRetry is true', () => {
      wrapper = createWrapper({ showRetry: true })
      
      expect(wrapper.find('.loading-btn-primary').exists()).toBe(true)
      expect(wrapper.find('.loading-btn-primary').text()).toBe('Retry')
    })

    it('calls onCancel when cancel button is clicked', async () => {
      wrapper = createWrapper({ cancellable: true })
      
      await wrapper.find('.loading-btn-secondary').trigger('click')
      
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('calls onRetry when retry button is clicked', async () => {
      wrapper = createWrapper({ showRetry: true })
      
      await wrapper.find('.loading-btn-primary').trigger('click')
      
      expect(mockOnRetry).toHaveBeenCalled()
    })

    it('shows loading state on retry button when retrying', async () => {
      mockOnRetry.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      wrapper = createWrapper({ showRetry: true })
      
      const retryButton = wrapper.find('.loading-btn-primary')
      await retryButton.trigger('click')
      
      expect(wrapper.find('.btn-spinner').exists()).toBe(true)
      expect(retryButton.text()).toContain('Retrying...')
    })

    it('disables buttons when processing', async () => {
      wrapper = createWrapper({ 
        cancellable: true,
        showRetry: true
      })
      
      await wrapper.setData({ isProcessing: true })
      
      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    })
  })

  describe('Timeout Handling', () => {
    it('shows timeout warning after timeout period', async () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      expect(wrapper.find('.timeout-warning').exists()).toBe(false)
      
      vi.advanceTimersByTime(1000)
      await nextTick()
      
      expect(wrapper.find('.timeout-warning').exists()).toBe(true)
      expect(mockOnTimeout).toHaveBeenCalled()
    })

    it('does not show timeout warning when timeout is 0', async () => {
      wrapper = createWrapper({ 
        timeout: 0,
        show: true
      })
      
      vi.advanceTimersByTime(5000)
      await nextTick()
      
      expect(wrapper.find('.timeout-warning').exists()).toBe(false)
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })

    it('clears timeout when component is hidden', async () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      await wrapper.setProps({ show: false })
      
      vi.advanceTimersByTime(1000)
      await nextTick()
      
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })

    it('displays timeout warning content', async () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      vi.advanceTimersByTime(1000)
      await nextTick()
      
      const warning = wrapper.find('.timeout-warning')
      expect(warning.find('.warning-text').text()).toContain('taking longer than expected')
      expect(warning.find('.warning-subtext').text()).toContain('check your internet connection')
    })
  })

  describe('Events', () => {
    it('emits cancel event when cancel is triggered', async () => {
      wrapper = createWrapper({ cancellable: true })
      
      await wrapper.find('.loading-btn-secondary').trigger('click')
      
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('emits retry event when retry is triggered', async () => {
      wrapper = createWrapper({ showRetry: true })
      
      await wrapper.find('.loading-btn-primary').trigger('click')
      
      expect(wrapper.emitted('retry')).toBeTruthy()
    })

    it('emits timeout event when timeout occurs', async () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      vi.advanceTimersByTime(1000)
      await nextTick()
      
      expect(wrapper.emitted('timeout')).toBeTruthy()
    })

    it('emits backdrop-click event when backdrop is clicked', async () => {
      wrapper = createWrapper()
      
      await wrapper.find('.loading-backdrop').trigger('click')
      
      expect(wrapper.emitted('backdrop-click')).toBeTruthy()
    })
  })

  describe('Lifecycle', () => {
    it('starts timeout timer when mounted with show=true', () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      vi.advanceTimersByTime(999)
      expect(mockOnTimeout).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(1)
      expect(mockOnTimeout).toHaveBeenCalled()
    })

    it('does not start timeout timer when mounted with show=false', () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: false
      })
      
      vi.advanceTimersByTime(1000)
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })

    it('cleans up timeout timer on unmount', () => {
      wrapper = createWrapper({ 
        timeout: 1000,
        show: true
      })
      
      wrapper.unmount()
      
      vi.advanceTimersByTime(1000)
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper button types', () => {
      wrapper = createWrapper({ 
        cancellable: true,
        showRetry: true
      })
      
      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.attributes('type')).toBeDefined()
      })
    })

    it('maintains focus management for interactive elements', () => {
      wrapper = createWrapper({ 
        cancellable: true,
        showRetry: true,
        showDetails: true,
        details: [{ text: 'Test', status: 'pending' }]
      })
      
      const interactiveElements = wrapper.findAll('button, .details-toggle')
      expect(interactiveElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('applies correct CSS classes for mobile layout', () => {
      wrapper = createWrapper()
      
      // The responsive behavior is handled by CSS media queries
      // We can test that the necessary classes are present
      expect(wrapper.find('.loading-content').exists()).toBe(true)
      expect(wrapper.find('.loading-actions').exists()).toBe(false) // Only shows when there are actions
    })
  })

  describe('Props Validation', () => {
    it('handles undefined props gracefully', () => {
      wrapper = createWrapper({
        message: undefined,
        subtitle: undefined,
        progress: undefined,
        details: undefined
      })
      
      expect(wrapper.find('.loading-message').exists()).toBe(false)
      expect(wrapper.find('.loading-progress').exists()).toBe(false)
      expect(wrapper.find('.loading-details').exists()).toBe(false)
    })

    it('handles empty details array', () => {
      wrapper = createWrapper({
        showDetails: true,
        details: []
      })
      
      expect(wrapper.find('.loading-details').exists()).toBe(false)
    })
  })
})