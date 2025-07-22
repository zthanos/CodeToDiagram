import { ref, onBeforeUnmount, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useDialog } from './useDialog'
import NotificationService from '../services/NotificationService'

export interface UnsavedChangesOptions {
  message?: string
  confirmSave?: boolean
  onSave?: () => Promise<void> | void
  onDiscard?: () => Promise<void> | void
  autoSave?: boolean
  autoSaveInterval?: number
}

export function useUnsavedChanges(options: UnsavedChangesOptions = {}) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
    confirmSave = true,
    onSave,
    onDiscard,
    autoSave = false,
    autoSaveInterval = 30000 // 30 seconds
  } = options

  const router = useRouter()
  const dialog = useDialog()
  
  const hasUnsavedChanges = ref(false)
  const isSaving = ref(false)
  const lastSaved = ref<Date | null>(null)
  const autoSaveTimer = ref<NodeJS.Timeout | null>(null)

  // Browser beforeunload handler
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = message
      return message
    }
  }

  // Vue Router navigation guard
  onBeforeRouteLeave(async (to, from, next) => {
    if (!hasUnsavedChanges.value) {
      next()
      return
    }

    if (confirmSave && onSave) {
      const shouldSave = await dialog.confirmSave(hasUnsavedChanges.value)
      if (shouldSave) {
        try {
          isSaving.value = true
          await onSave()
          hasUnsavedChanges.value = false
          lastSaved.value = new Date()
          NotificationService.success('Saved', 'Changes saved successfully')
          next()
        } catch (error) {
          console.error('Failed to save changes:', error)
          const shouldContinue = await dialog.warning(
            'Save Failed',
            'Failed to save changes. Do you want to continue without saving?'
          )
          if (shouldContinue) {
            hasUnsavedChanges.value = false
            if (onDiscard) {
              await onDiscard()
            }
            next()
          } else {
            next(false)
          }
        } finally {
          isSaving.value = false
        }
      } else {
        hasUnsavedChanges.value = false
        if (onDiscard) {
          await onDiscard()
        }
        next()
      }
    } else {
      const shouldLeave = await dialog.warning('Unsaved Changes', message)
      if (shouldLeave) {
        hasUnsavedChanges.value = false
        if (onDiscard) {
          await onDiscard()
        }
        next()
      } else {
        next(false)
      }
    }
  })

  // Auto-save functionality
  const startAutoSave = () => {
    if (!autoSave || !onSave) return

    stopAutoSave()
    autoSaveTimer.value = setInterval(async () => {
      if (hasUnsavedChanges.value && !isSaving.value) {
        try {
          isSaving.value = true
          await onSave()
          hasUnsavedChanges.value = false
          lastSaved.value = new Date()
          NotificationService.info('Auto-saved', 'Changes auto-saved')
        } catch (error) {
          console.error('Auto-save failed:', error)
          NotificationService.warning('Auto-save Failed', 'Failed to auto-save changes')
        } finally {
          isSaving.value = false
        }
      }
    }, autoSaveInterval)
  }

  const stopAutoSave = () => {
    if (autoSaveTimer.value) {
      clearInterval(autoSaveTimer.value)
      autoSaveTimer.value = null
    }
  }

  // Watch for unsaved changes to start/stop auto-save
  watch(hasUnsavedChanges, (newValue) => {
    if (newValue && autoSave) {
      startAutoSave()
    } else if (!newValue) {
      stopAutoSave()
    }
  })

  // Setup and cleanup
  const setup = () => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    if (autoSave && hasUnsavedChanges.value) {
      startAutoSave()
    }
  }

  const cleanup = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    stopAutoSave()
  }

  // Lifecycle
  setup()
  onBeforeUnmount(cleanup)

  // Manual save function
  const save = async () => {
    if (!onSave || !hasUnsavedChanges.value) return

    try {
      isSaving.value = true
      await onSave()
      hasUnsavedChanges.value = false
      lastSaved.value = new Date()
      NotificationService.success('Saved', 'Changes saved successfully')
    } catch (error) {
      console.error('Failed to save:', error)
      NotificationService.error('Save Failed', 'Failed to save changes')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // Discard changes function
  const discard = async () => {
    if (onDiscard) {
      await onDiscard()
    }
    hasUnsavedChanges.value = false
    NotificationService.info('Discarded', 'Changes discarded')
  }

  // Mark as changed
  const markAsChanged = () => {
    hasUnsavedChanges.value = true
  }

  // Mark as saved
  const markAsSaved = () => {
    hasUnsavedChanges.value = false
    lastSaved.value = new Date()
  }

  // Check if can leave
  const canLeave = async (): Promise<boolean> => {
    if (!hasUnsavedChanges.value) return true

    if (confirmSave && onSave) {
      const shouldSave = await dialog.confirmSave(hasUnsavedChanges.value)
      if (shouldSave) {
        try {
          await save()
          return true
        } catch (error) {
          const shouldContinue = await dialog.warning(
            'Save Failed',
            'Failed to save changes. Do you want to continue without saving?'
          )
          return shouldContinue
        }
      } else {
        if (onDiscard) {
          await onDiscard()
        }
        hasUnsavedChanges.value = false
        return true
      }
    } else {
      return await dialog.warning('Unsaved Changes', message)
    }
  }

  return {
    // State
    hasUnsavedChanges,
    isSaving,
    lastSaved,

    // Methods
    save,
    discard,
    markAsChanged,
    markAsSaved,
    canLeave,
    startAutoSave,
    stopAutoSave,

    // Utilities
    setup,
    cleanup
  }
}

export default useUnsavedChanges