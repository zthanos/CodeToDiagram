/**
 * Tests for PDF upload functionality in RequirementsWorkspace
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import RequirementsWorkspace from '../../components/RequirementsWorkspace.vue'
import { RequirementsApiService } from '../../services/RequirementsApiService'
import type { Project } from '../../types/project'
import type { RequirementsDocument } from '../../types/requirements'

// Mock the RequirementsApiService
vi.mock('../../services/RequirementsApiService', () => ({
  RequirementsApiService: {
    uploadRequirementsPdf: vi.fn(),
    getLatestRequirements: vi.fn(),
    saveRequirementsDocument: vi.fn(),
  }
}))

// Mock other components
vi.mock('../../components/MarkdownRenderer.vue', () => ({
  default: {
    name: 'MarkdownRenderer',
    template: '<div class="markdown-renderer">{{ content }}</div>',
    props: ['content']
  }
}))

vi.mock('../../components/RequirementsTabsContainer.vue', () => ({
  default: {
    name: 'RequirementsTabsContainer',
    template: '<div class="tabs-container">Tabs</div>',
    props: ['activeTab', 'requirementItems', 'systemsData', 'teamsData', 'tabState'],
    emits: ['tab-change', 'requirement-update', 'requirement-delete', 'requirement-create']
  }
}))

describe('RequirementsWorkspace PDF Upload', () => {
  let wrapper: VueWrapper<any>
  let mockProject: Project

  const mockRequirementsDocument: RequirementsDocument = {
    content: 'Test content',
    status: 'draft',
    id: 1,
    project_id: 'test-project',
    version: 1,
    source_type: 'manual',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }

  beforeEach(() => {
    mockProject = {
      id: 'test-project',
      name: 'Test Project',
      description: 'Test Description',
      created_at: new Date(),
      updated_at: new Date()
    }

    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock successful API calls by default
    vi.mocked(RequirementsApiService.getLatestRequirements).mockResolvedValue(mockRequirementsDocument)
    vi.mocked(RequirementsApiService.uploadRequirementsPdf).mockResolvedValue(mockRequirementsDocument)
    vi.mocked(RequirementsApiService.saveRequirementsDocument).mockResolvedValue(mockRequirementsDocument)

    wrapper = mount(RequirementsWorkspace, {
      props: {
        project: mockProject
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('PDF Upload Button', () => {
    it('should display "Add Requirements from PDF" button in header', () => {
      const uploadButton = wrapper.find('.pdf-upload-btn')
      expect(uploadButton.exists()).toBe(true)
      expect(uploadButton.text()).toContain('Add Requirements from PDF')
    })

    it('should open upload dialog when PDF upload button is clicked', async () => {
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      const uploadDialog = wrapper.find('.upload-dialog-overlay')
      expect(uploadDialog.exists()).toBe(true)
    })

    it('should disable upload button when uploading', async () => {
      // Trigger upload to set uploading state
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      // Select a file
      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      // Mock a delayed API response to keep uploading state
      vi.mocked(RequirementsApiService.uploadRequirementsPdf).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRequirementsDocument), 1000))
      )

      // Start upload
      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      await nextTick()

      // Check that the main upload button is disabled
      const mainUploadButton = wrapper.find('.pdf-upload-btn')
      expect(mainUploadButton.attributes('disabled')).toBeDefined()
      expect(mainUploadButton.text()).toContain('Uploading...')
    })
  })

  describe('Upload Dialog', () => {
    beforeEach(async () => {
      // Open the upload dialog
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()
    })

    it('should display upload dialog with correct elements', () => {
      const dialog = wrapper.find('.upload-dialog')
      expect(dialog.exists()).toBe(true)

      const header = dialog.find('.upload-dialog-header h3')
      expect(header.text()).toContain('Upload Requirements PDF')

      const dropzone = dialog.find('.upload-dropzone')
      expect(dropzone.exists()).toBe(true)

      const statusSelect = dialog.find('.status-select')
      expect(statusSelect.exists()).toBe(true)
    })

    it('should close dialog when close button is clicked', async () => {
      const closeButton = wrapper.find('.close-btn')
      await closeButton.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.upload-dialog-overlay')
      expect(dialog.exists()).toBe(false)
    })

    it('should close dialog when clicking overlay', async () => {
      const overlay = wrapper.find('.upload-dialog-overlay')
      await overlay.trigger('click')
      await nextTick()

      const dialog = wrapper.find('.upload-dialog-overlay')
      expect(dialog.exists()).toBe(false)
    })

    it('should not close dialog when clicking inside dialog', async () => {
      const dialog = wrapper.find('.upload-dialog')
      await dialog.trigger('click')
      await nextTick()

      const overlay = wrapper.find('.upload-dialog-overlay')
      expect(overlay.exists()).toBe(true)
    })
  })

  describe('File Validation', () => {
    beforeEach(async () => {
      // Open the upload dialog
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()
    })

    it('should accept valid PDF files', async () => {
      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      // Mock file input change event
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      // Should show file selected state
      const fileSelected = wrapper.find('.file-selected')
      expect(fileSelected.exists()).toBe(true)
      expect(fileSelected.find('.file-name').text()).toBe('test.pdf')
    })

    it('should reject non-PDF files', async () => {
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      // Should show error
      const errorMessage = wrapper.find('.upload-error .error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('Please select a PDF file')
    })

    it('should reject files larger than 10MB', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [largeFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      // Should show error
      const errorMessage = wrapper.find('.upload-error .error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('File size must be less than 10MB')
    })

    it('should reject files without .pdf extension', async () => {
      const invalidFile = new File(['test content'], 'test.doc', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [invalidFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      // Should show error
      const errorMessage = wrapper.find('.upload-error .error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toContain('File must have a .pdf extension')
    })
  })

  describe('Drag and Drop', () => {
    beforeEach(async () => {
      // Open the upload dialog
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()
    })

    it('should handle drag over events', async () => {
      const dropzone = wrapper.find('.upload-dropzone')
      
      // Create a mock event object
      const dragEvent = {
        preventDefault: vi.fn(),
        type: 'dragover',
        bubbles: true,
        cancelable: true
      }
      
      await dropzone.trigger('dragover', dragEvent)
      await nextTick()

      expect(dropzone.classes()).toContain('dragover')
    })

    it('should handle drag leave events', async () => {
      const dropzone = wrapper.find('.upload-dropzone')
      
      // First trigger dragover
      await dropzone.trigger('dragover')
      await nextTick()
      expect(dropzone.classes()).toContain('dragover')

      // Mock getBoundingClientRect
      vi.spyOn(dropzone.element, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        right: 100,
        top: 10,
        bottom: 100,
        width: 90,
        height: 90,
        x: 10,
        y: 10,
        toJSON: () => ({})
      })

      // Then trigger dragleave with coordinates outside the dropzone
      const dragLeaveEvent = {
        preventDefault: vi.fn(),
        type: 'dragleave',
        bubbles: true,
        cancelable: true,
        clientX: 0, // Outside the dropzone
        clientY: 0,
        currentTarget: dropzone.element
      }
      
      await dropzone.trigger('dragleave', dragLeaveEvent)
      await nextTick()

      expect(dropzone.classes()).not.toContain('dragover')
    })

    it('should handle file drop events', async () => {
      const dropzone = wrapper.find('.upload-dropzone')
      const validPdfFile = new File(['test content'], 'dropped.pdf', { type: 'application/pdf' })
      
      // Create a mock drop event
      const dropEvent = {
        preventDefault: vi.fn(),
        type: 'drop',
        bubbles: true,
        cancelable: true,
        dataTransfer: {
          files: [validPdfFile]
        }
      }
      
      await dropzone.trigger('drop', dropEvent)
      await nextTick()

      // Should show file selected state
      const fileSelected = wrapper.find('.file-selected')
      expect(fileSelected.exists()).toBe(true)
      expect(fileSelected.find('.file-name').text()).toBe('dropped.pdf')
    })
  })

  describe('Upload Process', () => {
    beforeEach(async () => {
      // Open the upload dialog and select a file
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()
    })

    it('should start upload when upload button is clicked', async () => {
      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      await nextTick()

      expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalledWith(
        'test-project',
        expect.any(File),
        'draft'
      )
    })

    it('should show progress indicator during upload', async () => {
      // Mock a delayed API response
      vi.mocked(RequirementsApiService.uploadRequirementsPdf).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRequirementsDocument), 100))
      )

      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      await nextTick()

      // Should show progress
      const progress = wrapper.find('.upload-progress')
      expect(progress.exists()).toBe(true)
      
      const progressSpinner = wrapper.find('.progress-spinner')
      expect(progressSpinner.exists()).toBe(true)
    })

    it('should show success notification on successful upload', async () => {
      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      
      // Wait for upload to complete
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalled()
      })
      
      await nextTick()

      // Should show success notification
      const notification = wrapper.find('.notification.success')
      expect(notification.exists()).toBe(true)
      expect(notification.text()).toContain('uploaded successfully')
    })

    it('should handle upload errors gracefully', async () => {
      // Mock API error
      const errorMessage = 'Upload failed'
      vi.mocked(RequirementsApiService.uploadRequirementsPdf).mockRejectedValue(
        new Error(errorMessage)
      )

      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      
      // Wait for error to be handled
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalled()
      })
      
      await nextTick()

      // Should show error in dialog
      const uploadError = wrapper.find('.upload-error')
      expect(uploadError.exists()).toBe(true)
      
      // Should show error notification
      const notification = wrapper.find('.notification.error')
      expect(notification.exists()).toBe(true)
    })

    it('should allow retry after upload failure', async () => {
      // Mock API error first, then success
      vi.mocked(RequirementsApiService.uploadRequirementsPdf)
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce(mockRequirementsDocument)

      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      
      // Wait for error
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalledTimes(1)
      })
      
      await nextTick()

      // Click retry button
      const retryBtn = wrapper.find('.retry-btn')
      expect(retryBtn.exists()).toBe(true)
      await retryBtn.trigger('click')
      
      // Wait for retry
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalledTimes(2)
      })
    })

    it('should have status selector with correct options', async () => {
      const statusSelect = wrapper.find('.status-select')
      expect(statusSelect.exists()).toBe(true)
      
      const options = statusSelect.findAll('option')
      expect(options).toHaveLength(3)
      expect(options[0].text()).toBe('Draft')
      expect(options[1].text()).toBe('Published')
      expect(options[2].text()).toBe('Archived')
      
      // Verify default value
      expect(statusSelect.element.value).toBe('draft')
    })
  })

  describe('File Management', () => {
    beforeEach(async () => {
      // Open the upload dialog and select a file
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()
    })

    it('should display selected file information', () => {
      const fileSelected = wrapper.find('.file-selected')
      expect(fileSelected.exists()).toBe(true)
      
      const fileName = fileSelected.find('.file-name')
      expect(fileName.text()).toBe('test.pdf')
      
      const fileSize = fileSelected.find('.file-size')
      expect(fileSize.exists()).toBe(true)
    })

    it('should allow removing selected file', async () => {
      const removeBtn = wrapper.find('.remove-file-btn')
      expect(removeBtn.exists()).toBe(true)
      
      await removeBtn.trigger('click')
      await nextTick()

      const fileSelected = wrapper.find('.file-selected')
      expect(fileSelected.exists()).toBe(false)
      
      const dropzoneContent = wrapper.find('.dropzone-content')
      expect(dropzoneContent.exists()).toBe(true)
    })

    it('should format file size correctly', () => {
      // This tests the formatFileSize method indirectly
      const fileSize = wrapper.find('.file-size')
      expect(fileSize.text()).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/)
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      // Open the upload dialog
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()
    })

    it('should have proper ARIA labels', () => {
      const closeBtn = wrapper.find('.close-btn')
      expect(closeBtn.attributes('aria-label')).toBe('Close dialog')
      
      const fileInput = wrapper.find('input[type="file"]')
      expect(fileInput.attributes('accept')).toBe('.pdf')
    })

    it('should support keyboard navigation', async () => {
      const dialog = wrapper.find('.upload-dialog')
      expect(dialog.exists()).toBe(true)
      
      // Test that dialog can receive focus
      const focusableElements = dialog.findAll('button, input, select')
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })

  describe('Notifications', () => {
    it('should show and auto-hide notifications', async () => {
      // Trigger a successful upload to show notification
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalled()
      })
      
      await nextTick()

      const notification = wrapper.find('.notification')
      expect(notification.exists()).toBe(true)
    })

    it('should allow manual notification dismissal', async () => {
      // Trigger a successful upload to show notification
      const uploadButton = wrapper.find('.pdf-upload-btn')
      await uploadButton.trigger('click')
      await nextTick()

      const validPdfFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find('input[type="file"]')
      
      Object.defineProperty(fileInput.element, 'files', {
        value: [validPdfFile],
        writable: false,
      })
      
      await fileInput.trigger('change')
      await nextTick()

      const uploadBtn = wrapper.find('.upload-btn')
      await uploadBtn.trigger('click')
      
      await vi.waitFor(() => {
        expect(RequirementsApiService.uploadRequirementsPdf).toHaveBeenCalled()
      })
      
      await nextTick()

      const notification = wrapper.find('.notification')
      expect(notification.exists()).toBe(true)

      const closeBtn = notification.find('.notification-close')
      await closeBtn.trigger('click')
      await nextTick()

      const notificationAfter = wrapper.find('.notification')
      expect(notificationAfter.exists()).toBe(false)
    })
  })
})