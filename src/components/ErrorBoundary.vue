<template>
  <div class="error-boundary">
    <div v-if="hasError" class="error-boundary-content">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">{{ errorTitle }}</h3>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div v-if="showDetails" class="error-details">
        <h4>Technical Details:</h4>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </div>
      
      <div class="error-actions">
        <button @click="retry" class="error-btn error-btn-primary">
          <span class="btn-icon">🔄</span>
          Try Again
        </button>
        <button @click="toggleDetails" class="error-btn error-btn-secondary">
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </button>
        <button @click="reportError" class="error-btn error-btn-secondary">
          <span class="btn-icon">📧</span>
          Report Issue
        </button>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'
import { useComponentErrorHandling } from '../composables/useErrorHandling'
import NotificationService from '../services/NotificationService'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showRetry?: boolean
  onRetry?: () => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: 'Something went wrong',
  fallbackMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  showRetry: true
})

const emit = defineEmits<{
  error: [error: Error, instance: any, info: string]
  retry: []
}>()

// State
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const showDetails = ref(false)

// Composables
const errorHandler = useComponentErrorHandling('ErrorBoundary')

// Computed
const errorTitle = computed(() => {
  if (!error.value) return props.fallbackTitle
  
  // Categorize error types for better user messaging
  if (error.value.name === 'ChunkLoadError') {
    return 'Loading Error'
  }
  if (error.value.name === 'TypeError') {
    return 'Application Error'
  }
  if (error.value.message?.includes('Network')) {
    return 'Network Error'
  }
  
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  if (!error.value) return props.fallbackMessage
  
  // Provide user-friendly messages for common errors
  if (error.value.name === 'ChunkLoadError') {
    return 'Failed to load application resources. This might be due to a network issue or an application update. Please refresh the page.'
  }
  if (error.value.name === 'TypeError') {
    return 'An application error occurred. Please refresh the page or try again.'
  }
  if (error.value.message?.includes('Network')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }
  
  return props.fallbackMessage
})

const errorDetails = computed(() => {
  if (!error.value) return ''
  
  return `Error: ${error.value.name}
Message: ${error.value.message}
Stack: ${error.value.stack || 'No stack trace available'}
Component Info: ${errorInfo.value}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}`
})

// Error capture
onErrorCaptured((err: Error, instance: any, info: string) => {
  console.error('ErrorBoundary caught error:', err, info)
  
  hasError.value = true
  error.value = err
  errorInfo.value = info
  
  // Handle error with error handling service
  errorHandler.handleError(err, {
    operation: 'component_render',
    component: instance?.$options?.name || 'Unknown',
    additionalInfo: info
  })
  
  // Show notification
  NotificationService.error(
    'Component Error',
    'A component error occurred. The error boundary has caught it to prevent the entire application from crashing.'
  )
  
  // Emit error event
  emit('error', err, instance, info)
  
  // Prevent the error from propagating further
  return false
})

// Methods
async function retry() {
  try {
    hasError.value = false
    error.value = null
    errorInfo.value = ''
    showDetails.value = false
    
    if (props.onRetry) {
      await props.onRetry()
    }
    
    emit('retry')
    
    NotificationService.success('Retry', 'Component has been reset. Please try your action again.')
  } catch (retryError) {
    console.error('Error during retry:', retryError)
    hasError.value = true
    error.value = retryError instanceof Error ? retryError : new Error('Retry failed')
    
    NotificationService.error('Retry Failed', 'Failed to reset the component. Please refresh the page.')
  }
}

function toggleDetails() {
  showDetails.value = !showDetails.value
}

function reportError() {
  const subject = encodeURIComponent(`Error Report: ${error.value?.name || 'Unknown Error'}`)
  const body = encodeURIComponent(`Please describe what you were doing when this error occurred:

[Your description here]

Technical Details:
${errorDetails.value}`)
  
  const mailtoUrl = `mailto:support@example.com?subject=${subject}&body=${body}`
  window.open(mailtoUrl, '_blank')
  
  NotificationService.info('Report Sent', 'Your email client should open with the error report. Please add a description of what you were doing when the error occurred.')
}

// Expose methods for parent components
defineExpose({
  retry,
  hasError: () => hasError.value,
  clearError: () => {
    hasError.value = false
    error.value = null
    errorInfo.value = ''
    showDetails.value = false
  }
})
</script>

<style scoped>
.error-boundary {
  height: 100%;
  width: 100%;
}

.error-boundary-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 400px;
  background: #fefefe;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.8;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.error-message {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 0 32px 0;
}

.error-details {
  width: 100%;
  max-width: 800px;
  margin-bottom: 32px;
  text-align: left;
}

.error-details h4 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.error-stack {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  font-size: 12px;
  color: #6b7280;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.error-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.error-btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.error-btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.error-btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.error-btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-icon {
  font-size: 12px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .error-boundary-content {
    background: #1f2937;
    border-color: #374151;
  }
  
  .error-title {
    color: #f9fafb;
  }
  
  .error-message {
    color: #d1d5db;
  }
  
  .error-details h4 {
    color: #e5e7eb;
  }
  
  .error-stack {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .error-btn-secondary {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .error-btn-secondary:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .error-boundary-content {
    padding: 20px 16px;
    min-height: 300px;
  }
  
  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .error-title {
    font-size: 20px;
  }
  
  .error-message {
    font-size: 14px;
    margin-bottom: 24px;
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .error-btn {
    width: 100%;
    justify-content: center;
  }
  
  .error-stack {
    font-size: 11px;
    padding: 12px;
  }
}
</style>