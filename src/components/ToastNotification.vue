<template>
  <div class="toast-container">
    <TransitionGroup name="toast" tag="div" class="toast-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'toast',
          `toast-${notification.type}`,
          { 'toast-persistent': notification.persistent }
        ]"
        role="alert"
        :aria-live="notification.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="toast-icon">
          <component :is="getIcon(notification.type)" />
        </div>
        
        <div class="toast-content">
          <div class="toast-title">{{ notification.title }}</div>
          <div class="toast-message">{{ notification.message }}</div>
          
          <div v-if="notification.actions && notification.actions.length" class="toast-actions">
            <button
              v-for="action in notification.actions"
              :key="action.label"
              :class="[
                'toast-action-btn',
                `toast-action-${action.style || 'secondary'}`
              ]"
              @click="handleAction(notification.id, action)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        
        <button
          class="toast-close"
          @click="dismiss(notification.id)"
          :aria-label="`Dismiss ${notification.title} notification`"
        >
          <CloseIcon />
        </button>
        
        <div
          v-if="!notification.persistent && notification.duration"
          class="toast-progress"
          :style="{ animationDuration: `${notification.duration}ms` }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NotificationService, NotificationType, type Notification, type NotificationAction } from '../services/NotificationService'

// Icons (using h function for runtime compatibility)
const CheckIcon = () => h('svg', {
  width: '20',
  height: '20',
  viewBox: '0 0 20 20',
  fill: 'currentColor'
}, [
  h('path', {
    'fill-rule': 'evenodd',
    d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
    'clip-rule': 'evenodd'
  })
])

const ErrorIcon = () => h('svg', {
  width: '20',
  height: '20',
  viewBox: '0 0 20 20',
  fill: 'currentColor'
}, [
  h('path', {
    'fill-rule': 'evenodd',
    d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z',
    'clip-rule': 'evenodd'
  })
])

const WarningIcon = () => h('svg', {
  width: '20',
  height: '20',
  viewBox: '0 0 20 20',
  fill: 'currentColor'
}, [
  h('path', {
    'fill-rule': 'evenodd',
    d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
    'clip-rule': 'evenodd'
  })
])

const InfoIcon = () => h('svg', {
  width: '20',
  height: '20',
  viewBox: '0 0 20 20',
  fill: 'currentColor'
}, [
  h('path', {
    'fill-rule': 'evenodd',
    d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
    'clip-rule': 'evenodd'
  })
])

const CloseIcon = () => h('svg', {
  width: '16',
  height: '16',
  viewBox: '0 0 16 16',
  fill: 'currentColor'
}, [
  h('path', {
    d: 'M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z'
  })
])

const notifications = computed(() => NotificationService.getNotifications())

function getIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.SUCCESS:
      return CheckIcon
    case NotificationType.ERROR:
      return ErrorIcon
    case NotificationType.WARNING:
      return WarningIcon
    case NotificationType.INFO:
    default:
      return InfoIcon
  }
}

function dismiss(id: string) {
  NotificationService.dismiss(id)
}

function handleAction(notificationId: string, action: NotificationAction) {
  action.action()
  if (action.label !== 'Retry') {
    dismiss(notificationId)
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  pointer-events: auto;
  overflow: hidden;
}

.toast-success {
  border-left-color: #10b981;
}

.toast-error {
  border-left-color: #ef4444;
}

.toast-warning {
  border-left-color: #f59e0b;
}

.toast-info {
  border-left-color: #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-success .toast-icon {
  color: #10b981;
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.toast-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.toast-action-btn {
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toast-action-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.toast-action-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.toast-action-secondary {
  background: transparent;
  border-color: #d1d5db;
  color: #6b7280;
}

.toast-action-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: toast-progress linear forwards;
}

.toast-success .toast-progress {
  color: #10b981;
}

.toast-error .toast-progress {
  color: #ef4444;
}

.toast-warning .toast-progress {
  color: #f59e0b;
}

.toast-info .toast-progress {
  color: #3b82f6;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Transition animations */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .toast {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .toast-title {
    color: #f9fafb;
  }
  
  .toast-message {
    color: #d1d5db;
  }
  
  .toast-action-secondary {
    color: #d1d5db;
    border-color: #4b5563;
  }
  
  .toast-action-secondary:hover {
    background: #374151;
    border-color: #6b7280;
  }
  
  .toast-close {
    color: #9ca3af;
  }
  
  .toast-close:hover {
    background: #374151;
    color: #d1d5db;
  }
}

/* Responsive design */
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .toast-list {
    max-width: none;
  }
  
  .toast {
    padding: 12px;
  }
  
  .toast-actions {
    flex-direction: column;
  }
  
  .toast-action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>