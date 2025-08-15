<template>
  <div class="requirements-error-boundary">
    <div v-if="hasError" class="error-boundary-content">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">{{ errorTitle }}</h3>
      <p class="error-message">{{ errorMessage }}</p>
      
      <!-- Network status indicator -->
      <div v-if="!isOnline" class="network-status offline">
        <span class="network-icon">📡</span>
        <span class="network-text">You're currently offline</span>
      </div>
      
      <!-- Error details (collapsible) -->
      <div v-if="showDetails" class="error-details">
        <h4>Technical Details:</h4>
        <div class="error-info">
          <div class="error-info-item">
            <strong>Error Type:</strong> {{ error?.name || 'Unknown' }}
          </div>
          <div class="error-info-item">
            <strong>Component:</strong> {{ componentName }}
          </div>
          <div class="error-info-item">
            <strong>Operation:</strong> {{ lastOperation || 'Unknown' }}
          </div>
          <div class="error-info-item">
            <strong>Time:</strong> {{ formatTime(errorTimestamp) }}
          </div>
          <div class="error-info-item">
            <strong>Network:</strong> {{ isOnline ? 'Online' : 'Offline' }}
          </div>
        </div>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </div>
      
      <!-- Suggested actions -->
      <div class="error-suggestions">
        <h4>What you can try:</h4>
        <ul class="suggestions-list">
          <li v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-item">
            <span class="suggestion-icon">{{ suggestion.icon }}</span>
            <span class="suggestion-text">{{ suggestion.text }}</span>
            <button 
              v-if="suggestion.action" 
              @click="suggestion.action"
              class="suggestion-action"
              :disabled="suggestion.disabled"
            >
              {{ suggestion.actionText }}
            </button>
          </li>
        </ul>
      </div>
      
      <!-- Action buttons -->
      <div class="error-actions">
        <button 
          @click="retry" 
          class="error-btn error-btn-primary"
          :disabled="isRetrying"
        >
          <span v-if="isRetrying" class="btn-spinner"></span>
          <span class="btn-icon">🔄</span>
          {{ isRetrying ? 'Retrying...' : 'Try Again' }}
        </button>
        
        <button 
          @click="toggleDetails" 
          class="error-btn error-btn-secondary"
        >
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </button>
        
        <button 
          @click="reportError" 
          class="error-btn error-btn-secondary"
          :disabled="!canReportError"
        >
          <span class="btn-icon">📧</span>
          Report Issue
        </button>
        
        <button 
          v-if="canGoBack"
          @click="goBack" 
          class="error-btn error-btn-secondary"
        >
          <span class="btn-icon">←</span>
          Go Back
        </button>
      </div>
      
      <!-- Recovery options -->
      <div v-if="showRecoveryOptions" class="recovery-options">
        <h4>Recovery Options:</h4>
        <div class="recovery-buttons">
          <button 
            @click="clearLocalData" 
            class="recovery-btn"
            :disabled="isClearingData"
          >
            <span v-if="isClearingData" class="btn-spinner"></span>
            Clear Local Data
          </button>
          <button 
            @click="refreshPage" 
            class="recovery-btn"
          >
            Refresh Page
          </button>
          <button 
            @click="resetWorkspace" 
            class="recovery-btn recovery-btn-danger"
            :disabled="isResetting"
          >
            <span v-if="isResetting" class="btn-spinner"></span>
            Reset Workspace
          </button>
        </div>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import { useComponentErrorHandling } from '../composables/useErrorHandling'
import { NetworkValidator } from '../utils/validation'
import NotificationService from '../services/NotificationService'

interface Props {
  componentName?: string
  fallbackTitle?: string
  fallbackMessage?: string
  showRetry?: boolean
  showRecoveryOptions?: boolean
  onRetry?: () => void | Promise<void>
  onReset?: () => void | Promise<void>
}

interface ErrorSuggestion {
  id: string
  icon: string
  text: string
  action?: () => void
  actionText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  componentName: 'RequirementsWorkspace',
  fallbackTitle: 'Requirements Workspace Error',
  fallbackMessage: 'An error occurred in the requirements workspace. Please try again or contact support if the problem persists.',
  showRetry: true,
  showRecoveryOptions: false
})

const emit = defineEmits<{
  error: [error: Error, instance: any, info: string]
  retry: []
  reset: []
}>()

// State
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const errorTimestamp = ref<Date>(new Date())
const showDetails = ref(false)
const isRetrying = ref(false)
const isClearingData = ref(false)
const isResetting = ref(false)
const lastOperation = ref<string>('')
const isOnline = ref(NetworkValidator.isNetworkAvailable())

// Composables
const errorHandler = useComponentErrorHandling(props.componentName)

// Network status monitoring
const handleNetworkChange = (online: boolean) => {
  isOnline.value = online
  if (online && hasError.value) {
    // Network came back online, suggest retry
    NotificationService.info('Network Restored', 'Your internet connection has been restored. You may want to try again.')
  }
}

onMounted(() => {
  NetworkValidator.addNetworkListener(handleNetworkChange)
})

onUnmounted(() => {
  NetworkValidator.removeNetworkListener(handleNetworkChange)
})

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
  if (error.value.message?.includes('Network') || error.value.message?.includes('fetch')) {
    return 'Network Error'
  }
  if (error.value.message?.includes('validation')) {
    return 'Validation Error'
  }
  if (error.value.message?.includes('PDF')) {
    return 'PDF Processing Error'
  }
  
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  if (!error.value) return props.fallbackMessage
  
  // Provide user-friendly messages for common errors
  if (error.value.name === 'ChunkLoadError') {
    return 'Failed to load application resources. This might be due to a network issue or an application update.'
  }
  if (error.value.name === 'TypeError') {
    return 'An application error occurred. The requirements workspace encountered an unexpected issue.'
  }
  if (error.value.message?.includes('Network') || error.value.message?.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }
  if (error.value.message?.includes('validation')) {
    return 'A validation error occurred. Please check your input and try again.'
  }
  if (error.value.message?.includes('PDF')) {
    return 'There was an issue processing the PDF file. Please check the file and try again.'
  }
  
  return props.fallbackMessage
})

const errorDetails = computed(() => {
  if (!error.value) return ''
  
  return `Error: ${error.value.name}
Message: ${error.value.message}
Stack: ${error.value.stack || 'No stack trace available'}
Component Info: ${errorInfo.value}
Timestamp: ${errorTimestamp.value.toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Network Status: ${isOnline.value ? 'Online' : 'Offline'}`
})

const suggestions = computed((): ErrorSuggestion[] => {
  const baseSuggestions: ErrorSuggestion[] = []
  
  if (!isOnline.value) {
    baseSuggestions.push({
      id: 'network',
      icon: '📡',
      text: 'Check your internet connection',
      action: () => window.open('https://www.google.com', '_blank'),
      actionText: 'Test Connection'
    })
  }
  
  if (error.value?.name === 'ChunkLoadError') {
    baseSuggestions.push({
      id: 'refresh',
      icon: '🔄',
      text: 'Refresh the page to load the latest version',
      action: refreshPage,
      actionText: 'Refresh'
    })
  }
  
  if (error.value?.message?.includes('PDF')) {
    baseSuggestions.push({
      id: 'pdf',
      icon: '📄',
      text: 'Try uploading a different PDF file or check if the file is corrupted',
      action: () => emit('retry'),
      actionText: 'Try Different File'
    })
  }
  
  if (error.value?.message?.includes('validation')) {
    baseSuggestions.push({
      id: 'validation',
      icon: '✏️',
      text: 'Check your input for any invalid characters or missing required fields',
      action: () => emit('retry'),
      actionText: 'Review Input'
    })
  }
  
  baseSuggestions.push({
    id: 'wait',
    icon: '⏱️',
    text: 'Wait a moment and try again - the issue might be temporary'
  })
  
  if (hasError.value) {
    baseSuggestions.push({
      id: 'support',
      icon: '💬',
      text: 'Contact support if the problem continues',
      action: reportError,
      actionText: 'Contact Support'
    })
  }
  
  return baseSuggestions
})

const canReportError = computed(() => {
  return hasError.value && error.value !== null
})

const canGoBack = computed(() => {
  return window.history.length > 1
})

// Error capture
onErrorCaptured((err: Error, instance: any, info: string) => {
  console.error('RequirementsErrorBoundary caught error:', err, info)
  
  hasError.value = true
  error.value = err
  errorInfo.value = info
  errorTimestamp.value = new Date()
  lastOperation.value = extractOperationFromError(err, info)
  
  // Handle error with error handling service
  errorHandler.handleError(err, {
    operation: lastOperation.value || 'component_render',
    component: instance?.$options?.name || props.componentName,
    additionalInfo: info
  })
  
  // Show notification
  NotificationService.error(
    'Requirements Workspace Error',
    'An error occurred in the requirements workspace. The error has been contained to prevent data loss.'
  )
  
  // Emit error event
  emit('error', err, instance, info)
  
  // Prevent the error from propagating further
  return false
})

// Methods
async function retry() {
  if (isRetrying.value) return
  
  try {
    isRetrying.value = true
    
    // Clear error state
    hasError.value = false
    error.value = null
    errorInfo.value = ''
    showDetails.value = false
    
    // Call custom retry handler if provided
    if (props.onRetry) {
      await props.onRetry()
    }
    
    emit('retry')
    
    NotificationService.success('Retry Successful', 'The requirements workspace has been reset. Please try your action again.')
  } catch (retryError) {
    console.error('Error during retry:', retryError)
    hasError.value = true
    error.value = retryError instanceof Error ? retryError : new Error('Retry failed')
    errorTimestamp.value = new Date()
    
    NotificationService.error('Retry Failed', 'Failed to reset the requirements workspace. Please try refreshing the page.')
  } finally {
    isRetrying.value = false
  }
}

function toggleDetails() {
  showDetails.value = !showDetails.value
}

function reportError() {
  if (!canReportError.value) return
  
  const subject = encodeURIComponent(`Requirements Workspace Error: ${error.value?.name || 'Unknown Error'}`)
  const body = encodeURIComponent(`Please describe what you were doing when this error occurred:

[Your description here]

Technical Details:
${errorDetails.value}`)
  
  const mailtoUrl = `mailto:support@example.com?subject=${subject}&body=${body}`
  window.open(mailtoUrl, '_blank')
  
  NotificationService.info('Report Prepared', 'Your email client should open with the error report. Please add a description of what you were doing when the error occurred.')
}

function goBack() {
  if (canGoBack.value) {
    window.history.back()
  }
}

function refreshPage() {
  window.location.reload()
}

async function clearLocalData() {
  if (isClearingData.value) return
  
  try {
    isClearingData.value = true
    
    // Clear localStorage data related to requirements
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('requirements') || key.includes('workspace'))) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // Clear sessionStorage as well
    const sessionKeysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('requirements') || key.includes('workspace'))) {
        sessionKeysToRemove.push(key)
      }
    }
    
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
    
    NotificationService.success('Data Cleared', 'Local data has been cleared. Please refresh the page to start fresh.')
    
    // Suggest page refresh
    setTimeout(() => {
      if (confirm('Local data has been cleared. Would you like to refresh the page now?')) {
        refreshPage()
      }
    }, 1000)
    
  } catch (clearError) {
    console.error('Error clearing local data:', clearError)
    NotificationService.error('Clear Failed', 'Failed to clear local data. Please try refreshing the page manually.')
  } finally {
    isClearingData.value = false
  }
}

async function resetWorkspace() {
  if (isResetting.value) return
  
  if (!confirm('This will reset the entire requirements workspace and may cause data loss. Are you sure?')) {
    return
  }
  
  try {
    isResetting.value = true
    
    // Clear local data first
    await clearLocalData()
    
    // Call custom reset handler if provided
    if (props.onReset) {
      await props.onReset()
    }
    
    emit('reset')
    
    // Reset error state
    hasError.value = false
    error.value = null
    errorInfo.value = ''
    showDetails.value = false
    
    NotificationService.success('Workspace Reset', 'The requirements workspace has been reset. Please refresh the page.')
    
    // Auto-refresh after a delay
    setTimeout(refreshPage, 2000)
    
  } catch (resetError) {
    console.error('Error resetting workspace:', resetError)
    NotificationService.error('Reset Failed', 'Failed to reset the workspace. Please refresh the page manually.')
  } finally {
    isResetting.value = false
  }
}

function extractOperationFromError(error: Error, info: string): string {
  // Try to extract operation context from error message or info
  if (error.message?.includes('upload')) return 'pdf_upload'
  if (error.message?.includes('save')) return 'save_document'
  if (error.message?.includes('load')) return 'load_document'
  if (error.message?.includes('validation')) return 'validation'
  if (info?.includes('render')) return 'component_render'
  if (info?.includes('mount')) return 'component_mount'
  
  return 'unknown'
}

function formatTime(date: Date): string {
  return date.toLocaleString()
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
  },
  getErrorInfo: () => ({
    error: error.value,
    timestamp: errorTimestamp.value,
    operation: lastOperation.value
  })
})
</script>

<style scoped>
.requirements-error-boundary {
  height: 100%;
  width: 100%;
}

.error-boundary-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 32px 24px;
  text-align: center;
  min-height: 500px;
  background: #fefefe;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  max-width: 800px;
  margin: 0 auto;
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
  margin: 0 0 24px 0;
}

.network-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;
  font-weight: 500;
}

.network-status.offline {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.network-icon {
  font-size: 16px;
}

.error-details {
  width: 100%;
  max-width: 700px;
  margin-bottom: 24px;
  text-align: left;
}

.error-details h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.error-info {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.error-info-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.error-info-item:last-child {
  margin-bottom: 0;
}

.error-info-item strong {
  min-width: 100px;
  color: #374151;
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
  max-height: 200px;
  overflow-y: auto;
}

.error-suggestions {
  width: 100%;
  max-width: 600px;
  margin-bottom: 24px;
  text-align: left;
}

.error-suggestions h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.suggestion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.suggestion-text {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.suggestion-action {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.suggestion-action:hover:not(:disabled) {
  background: #2563eb;
}

.suggestion-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 24px;
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

.error-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.error-btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.error-btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.error-btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-icon {
  font-size: 12px;
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.recovery-options {
  width: 100%;
  max-width: 600px;
  text-align: left;
}

.recovery-options h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.recovery-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.recovery-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recovery-btn:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.recovery-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.recovery-btn-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.recovery-btn-danger:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  
  .error-details h4,
  .error-suggestions h4,
  .recovery-options h4 {
    color: #e5e7eb;
  }
  
  .error-info,
  .error-stack {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .suggestion-item {
    background: #374151;
    border-color: #4b5563;
  }
  
  .suggestion-text {
    color: #d1d5db;
  }
  
  .error-btn-secondary {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .error-btn-secondary:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }
  
  .recovery-btn {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .recovery-btn:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .error-boundary-content {
    padding: 20px 16px;
    min-height: 400px;
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
    margin-bottom: 20px;
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .error-btn {
    width: 100%;
    justify-content: center;
  }
  
  .recovery-buttons {
    flex-direction: column;
  }
  
  .recovery-btn {
    width: 100%;
    justify-content: center;
  }
  
  .suggestion-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .suggestion-action {
    align-self: flex-end;
  }
}
</style>