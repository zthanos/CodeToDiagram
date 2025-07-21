import { reactive, ref } from 'vue'

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: NotificationAction[]
  timestamp: Date
}

export interface NotificationAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary'
}

class NotificationServiceClass {
  private notifications = reactive<Notification[]>([])
  private nextId = 1

  // Default durations in milliseconds
  private readonly defaultDurations = {
    [NotificationType.SUCCESS]: 4000,
    [NotificationType.INFO]: 5000,
    [NotificationType.WARNING]: 6000,
    [NotificationType.ERROR]: 8000
  }

  /**
   * Get all active notifications
   */
  getNotifications(): Notification[] {
    return this.notifications
  }

  /**
   * Show a success notification
   */
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.SUCCESS,
      title,
      message,
      ...options
    })
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.ERROR,
      title,
      message,
      persistent: true, // Errors are persistent by default
      ...options
    })
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.WARNING,
      title,
      message,
      ...options
    })
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: NotificationType.INFO,
      title,
      message,
      ...options
    })
  }

  /**
   * Show a notification with retry action
   */
  errorWithRetry(title: string, message: string, retryAction: () => void, options?: Partial<Notification>): string {
    return this.error(title, message, {
      actions: [
        {
          label: 'Retry',
          action: retryAction,
          style: 'primary'
        },
        {
          label: 'Dismiss',
          action: () => {}, // Will be handled by dismiss logic
          style: 'secondary'
        }
      ],
      ...options
    })
  }

  /**
   * Show a generic notification
   */
  private show(notification: Partial<Notification>): string {
    const id = `notification-${this.nextId++}`
    
    const fullNotification: Notification = {
      id,
      type: NotificationType.INFO,
      title: '',
      message: '',
      duration: this.defaultDurations[notification.type || NotificationType.INFO],
      persistent: false,
      timestamp: new Date(),
      ...notification
    }

    // Add to notifications array
    this.notifications.push(fullNotification)

    // Auto-dismiss if not persistent
    if (!fullNotification.persistent && fullNotification.duration) {
      setTimeout(() => {
        this.dismiss(id)
      }, fullNotification.duration)
    }

    return id
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id)
    if (index !== -1) {
      this.notifications.splice(index, 1)
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.notifications.splice(0)
  }

  /**
   * Dismiss all notifications of a specific type
   */
  dismissByType(type: NotificationType): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      if (this.notifications[i].type === type) {
        this.notifications.splice(i, 1)
      }
    }
  }

  /**
   * Update an existing notification
   */
  update(id: string, updates: Partial<Notification>): void {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      Object.assign(notification, updates)
    }
  }

  /**
   * Check if there are any notifications of a specific type
   */
  hasType(type: NotificationType): boolean {
    return this.notifications.some(n => n.type === type)
  }

  /**
   * Get count of notifications by type
   */
  getCountByType(type: NotificationType): number {
    return this.notifications.filter(n => n.type === type).length
  }
}

// Create singleton instance
export const NotificationService = new NotificationServiceClass()

// Export for use in components
export default NotificationService