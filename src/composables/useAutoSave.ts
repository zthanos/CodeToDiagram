import { ref, readonly, onUnmounted } from 'vue'
import { ProjectManager } from '../services/ProjectManager'
import NotificationService from '../services/NotificationService'

export type SaveStatus = 'saved' | 'modified' | 'saving' | 'error'

export interface AutoSaveOptions {
  delay?: number // Debounce delay in milliseconds
  projectId: string
  diagramId: number | null
  diagramTitle: string
  onStatusChange?: (status: SaveStatus) => void
  onSaveSuccess?: (savedDiagram: any) => void
  onSaveError?: (error: any) => void
}

export function useAutoSave(options: AutoSaveOptions) {
  const {
    delay = 2000, // 2 seconds default
    projectId,
    diagramId,
    diagramTitle,
    onStatusChange,
    onSaveSuccess,
    onSaveError
  } = options

  const saveStatus = ref<SaveStatus>('saved')
  const lastSavedContent = ref('')
  const pendingContent = ref('')
  const saveTimeoutId = ref<number | null>(null)
  const isSaving = ref(false)

  // Update save status and notify parent
  function updateStatus(status: SaveStatus) {
    saveStatus.value = status
    onStatusChange?.(status)
  }

  // Debounced save function
  async function debouncedSave(content: string) {
    // Clear existing timeout
    if (saveTimeoutId.value) {
      clearTimeout(saveTimeoutId.value)
    }

    // Store pending content
    pendingContent.value = content

    // Mark as modified if content changed
    if (content !== lastSavedContent.value && !isSaving.value) {
      updateStatus('modified')
    }

    // Set new timeout for auto-save
    saveTimeoutId.value = window.setTimeout(async () => {
      await performSave(content)
    }, delay)
  }

  // Perform the actual save operation
  async function performSave(content: string) {
    if (isSaving.value || content === lastSavedContent.value) {
      return
    }

    try {
      isSaving.value = true
      updateStatus('saving')

      const projectManager = ProjectManager.getInstance()
      const savedDiagram = await projectManager.saveDiagram(
        projectId,
        diagramId,
        diagramTitle,
        content
      )

      // Update last saved content
      lastSavedContent.value = content
      updateStatus('saved')

      // Notify success
      onSaveSuccess?.(savedDiagram)

      // Show discrete notification for auto-save
      if (diagramId !== null) { // Only show for existing diagrams, not new ones
        NotificationService.info('Auto-saved', `"${diagramTitle}" has been automatically saved`, {
          duration: 2000,
          position: 'bottom-right'
        })
      }

    } catch (error) {
      updateStatus('error')
      onSaveError?.(error)

      // Show error notification
      NotificationService.error('Auto-save Failed', 
        `Failed to auto-save "${diagramTitle}". Your changes are preserved locally.`, {
          actions: [{
            label: 'Retry',
            action: () => performSave(content),
            style: 'primary'
          }]
        }
      )
    } finally {
      isSaving.value = false
    }
  }

  // Force immediate save (for manual save operations)
  async function forceSave(content: string) {
    // Clear any pending auto-save
    if (saveTimeoutId.value) {
      clearTimeout(saveTimeoutId.value)
      saveTimeoutId.value = null
    }

    await performSave(content)
  }

  // Check if there are unsaved changes
  function hasUnsavedChanges(currentContent: string): boolean {
    return currentContent !== lastSavedContent.value && !isSaving.value
  }

  // Initialize with current content
  function initialize(initialContent: string) {
    lastSavedContent.value = initialContent
    pendingContent.value = initialContent
    updateStatus('saved')
  }

  // Cleanup function (to be called manually when needed)
  function cleanup() {
    if (saveTimeoutId.value) {
      clearTimeout(saveTimeoutId.value)
      saveTimeoutId.value = null
    }
  }

  return {
    saveStatus: readonly(saveStatus),
    debouncedSave,
    forceSave,
    hasUnsavedChanges,
    initialize,
    cleanup,
    isSaving: readonly(isSaving)
  }
}