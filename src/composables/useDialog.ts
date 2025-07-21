import { ref, createApp, type App } from 'vue'
import ConfirmationDialog, { type ConfirmationDialogOptions } from '../components/ConfirmationDialog.vue'

interface DialogInstance {
  show(): void
  hide(): void
  setLoading(loading: boolean): void
}

class DialogService {
  private dialogInstances: Map<string, { app: App; instance: DialogInstance }> = new Map()

  /**
   * Show a confirmation dialog
   */
  async confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const dialogId = `dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Create a container for the dialog
      const container = document.createElement('div')
      document.body.appendChild(container)
      
      // Create Vue app instance
      const app = createApp(ConfirmationDialog, {
        ...options,
        onConfirm: () => {
          this.cleanup(dialogId, container)
          resolve(true)
        },
        onCancel: () => {
          this.cleanup(dialogId, container)
          resolve(false)
        },
        onClose: () => {
          this.cleanup(dialogId, container)
          resolve(false)
        }
      })
      
      // Mount and show
      const instance = app.mount(container) as DialogInstance
      this.dialogInstances.set(dialogId, { app, instance })
      
      // Show the dialog
      instance.show()
    })
  }

  /**
   * Show an alert dialog (OK only)
   */
  async alert(title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): Promise<void> {
    await this.confirm({
      title,
      message,
      type,
      showCancel: false,
      confirmText: 'OK'
    })
  }

  /**
   * Show an error dialog with details
   */
  async error(title: string, message: string, details?: string): Promise<void> {
    await this.alert(title, message, 'error')
  }

  /**
   * Show a warning dialog
   */
  async warning(title: string, message: string): Promise<boolean> {
    return this.confirm({
      title,
      message,
      type: 'warning',
      confirmText: 'Continue',
      cancelText: 'Cancel'
    })
  }

  /**
   * Show a delete confirmation dialog
   */
  async confirmDelete(itemName: string, itemType: string = 'item'): Promise<boolean> {
    return this.confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      type: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
  }

  /**
   * Show a save confirmation dialog
   */
  async confirmSave(hasUnsavedChanges: boolean = true): Promise<boolean> {
    if (!hasUnsavedChanges) return true
    
    return this.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save them before continuing?',
      type: 'warning',
      confirmText: 'Save',
      cancelText: 'Discard'
    })
  }

  /**
   * Show a retry dialog for failed operations
   */
  async retry(title: string, message: string, error?: string): Promise<boolean> {
    return this.confirm({
      title,
      message,
      details: error,
      type: 'error',
      confirmText: 'Retry',
      cancelText: 'Cancel'
    })
  }

  private cleanup(dialogId: string, container: HTMLElement) {
    const dialogData = this.dialogInstances.get(dialogId)
    if (dialogData) {
      dialogData.app.unmount()
      this.dialogInstances.delete(dialogId)
    }
    
    // Remove container from DOM
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

// Create singleton instance
const dialogService = new DialogService()

/**
 * Composable for using dialogs
 */
export function useDialog() {
  return {
    confirm: dialogService.confirm.bind(dialogService),
    alert: dialogService.alert.bind(dialogService),
    error: dialogService.error.bind(dialogService),
    warning: dialogService.warning.bind(dialogService),
    confirmDelete: dialogService.confirmDelete.bind(dialogService),
    confirmSave: dialogService.confirmSave.bind(dialogService),
    retry: dialogService.retry.bind(dialogService)
  }
}

export default useDialog