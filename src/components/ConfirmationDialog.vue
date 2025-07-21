<template>
  <Teleport to="body">
    <div v-if="isVisible" class="dialog-overlay" @click="handleOverlayClick">
      <div class="dialog-container" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="dialog-header">
          <div class="dialog-icon" :class="`dialog-icon-${type}`">
            <component :is="getIcon(type)" />
          </div>
          <h3 :id="titleId" class="dialog-title">{{ title }}</h3>
        </div>
        
        <div class="dialog-content">
          <p class="dialog-message">{{ message }}</p>
          <div v-if="details" class="dialog-details">{{ details }}</div>
        </div>
        
        <div class="dialog-actions">
          <button
            v-if="showCancel"
            class="dialog-btn dialog-btn-secondary"
            @click="handleCancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button
            class="dialog-btn dialog-btn-primary"
            :class="{ 'dialog-btn-danger': type === 'error' }"
            @click="handleConfirm"
            :disabled="loading"
          >
            <span v-if="loading" class="dialog-spinner"></span>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

export interface ConfirmationDialogOptions {
  title: string
  message: string
  details?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  persistent?: boolean
}

// Icons
const InfoIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path fill-rule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  `
}

const WarningIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  `
}

const ErrorIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  `
}

const SuccessIcon = {
  template: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  `
}

const props = withDefaults(defineProps<{
  title: string
  message: string
  details?: string
  type?: 'info' | 'warning' | 'error' | 'success'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  persistent?: boolean
}>(), {
  type: 'info',
  confirmText: 'OK',
  cancelText: 'Cancel',
  showCancel: true,
  persistent: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const isVisible = ref(false)
const loading = ref(false)
const titleId = `dialog-title-${Math.random().toString(36).substr(2, 9)}`

const getIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return WarningIcon
    case 'error':
      return ErrorIcon
    case 'success':
      return SuccessIcon
    case 'info':
    default:
      return InfoIcon
  }
}

function show() {
  isVisible.value = true
  nextTick(() => {
    // Focus the confirm button for accessibility
    const confirmBtn = document.querySelector('.dialog-btn-primary') as HTMLButtonElement
    confirmBtn?.focus()
  })
}

function hide() {
  isVisible.value = false
  loading.value = false
}

function handleConfirm() {
  loading.value = true
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  hide()
}

function handleOverlayClick(event: MouseEvent) {
  if (!props.persistent && event.target === event.currentTarget) {
    handleCancel()
  }
}

// Handle escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !props.persistent) {
    handleCancel()
  }
}

// Add/remove event listeners
function addEventListeners() {
  document.addEventListener('keydown', handleKeydown)
}

function removeEventListeners() {
  document.removeEventListener('keydown', handleKeydown)
}

// Lifecycle
import { onMounted, onUnmounted, watch } from 'vue'

watch(isVisible, (visible) => {
  if (visible) {
    addEventListeners()
  } else {
    removeEventListeners()
    emit('close')
  }
})

onUnmounted(() => {
  removeEventListeners()
})

// Expose methods
defineExpose({
  show,
  hide,
  setLoading: (value: boolean) => {
    loading.value = value
  }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.dialog-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  animation: dialog-enter 0.2s ease-out;
}

@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 16px;
}

.dialog-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon-info {
  background: #dbeafe;
  color: #3b82f6;
}

.dialog-icon-warning {
  background: #fef3c7;
  color: #f59e0b;
}

.dialog-icon-error {
  background: #fee2e2;
  color: #ef4444;
}

.dialog-icon-success {
  background: #d1fae5;
  color: #10b981;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.dialog-content {
  padding: 0 24px 24px;
}

.dialog-message {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 12px;
}

.dialog-details {
  font-size: 13px;
  color: #9ca3af;
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #e5e7eb;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px 24px;
  border-top: 1px solid #f3f4f6;
}

.dialog-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  justify-content: center;
}

.dialog-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.dialog-btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.dialog-btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.dialog-btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.dialog-btn-danger {
  background: #ef4444;
  border-color: #ef4444;
}

.dialog-btn-danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

.dialog-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dialog-container {
    background: #1f2937;
  }
  
  .dialog-title {
    color: #f9fafb;
  }
  
  .dialog-message {
    color: #d1d5db;
  }
  
  .dialog-details {
    background: #374151;
    color: #e5e7eb;
    border-left-color: #4b5563;
  }
  
  .dialog-actions {
    border-top-color: #374151;
  }
  
  .dialog-btn-secondary {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .dialog-btn-secondary:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .dialog-overlay {
    padding: 10px;
  }
  
  .dialog-header {
    padding: 20px 20px 12px;
  }
  
  .dialog-content {
    padding: 0 20px 20px;
  }
  
  .dialog-actions {
    padding: 12px 20px 20px;
    flex-direction: column-reverse;
  }
  
  .dialog-btn {
    width: 100%;
  }
}
</style>