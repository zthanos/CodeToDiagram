<template>
  <div v-if="show" :class="['workspace-loading-overlay', { 'overlay-fullscreen': fullscreen }]">
    <div class="loading-backdrop" @click="handleBackdropClick"></div>
    
    <div class="loading-content">
      <!-- Loading icon/spinner -->
      <div class="loading-icon">
        <div v-if="type === 'spinner'" :class="['spinner', `spinner-${size}`]">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        
        <div v-else-if="type === 'dots'" class="dots-loader">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        
        <div v-else-if="type === 'pulse'" class="pulse-loader">
          <div class="pulse-circle"></div>
        </div>
        
        <div v-else class="default-icon">
          {{ icon || '⏳' }}
        </div>
      </div>
      
      <!-- Loading message -->
      <div v-if="message" class="loading-message">
        <h3 class="message-title">{{ message }}</h3>
        <p v-if="subtitle" class="message-subtitle">{{ subtitle }}</p>
      </div>
      
      <!-- Progress bar -->
      <div v-if="progress !== undefined" class="loading-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
          ></div>
        </div>
        <div class="progress-text">{{ Math.round(progress) }}%</div>
      </div>
      
      <!-- Operation details -->
      <div v-if="showDetails && details.length > 0" class="loading-details">
        <div class="details-toggle" @click="toggleDetails">
          <span class="toggle-icon">{{ detailsExpanded ? '▼' : '▶' }}</span>
          <span class="toggle-text">{{ detailsExpanded ? 'Hide' : 'Show' }} Details</span>
        </div>
        
        <div v-if="detailsExpanded" class="details-content">
          <ul class="details-list">
            <li 
              v-for="(detail, index) in details" 
              :key="index"
              :class="['detail-item', detail.status]"
            >
              <span class="detail-icon">{{ getDetailIcon(detail.status) }}</span>
              <span class="detail-text">{{ detail.text }}</span>
              <span v-if="detail.duration" class="detail-duration">{{ detail.duration }}ms</span>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- Action buttons -->
      <div v-if="cancellable || showRetry" class="loading-actions">
        <button 
          v-if="cancellable && onCancel" 
          class="loading-btn loading-btn-secondary"
          @click="handleCancel"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        
        <button 
          v-if="showRetry && onRetry" 
          class="loading-btn loading-btn-primary"
          @click="handleRetry"
          :disabled="isProcessing"
        >
          <span v-if="isRetrying" class="btn-spinner"></span>
          {{ isRetrying ? 'Retrying...' : 'Retry' }}
        </button>
      </div>
      
      <!-- Timeout warning -->
      <div v-if="showTimeoutWarning" class="timeout-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <p class="warning-text">This operation is taking longer than expected.</p>
          <p class="warning-subtext">Please check your internet connection or try again.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface LoadingDetail {
  text: string
  status: 'pending' | 'loading' | 'success' | 'error'
  duration?: number
}

interface Props {
  show?: boolean
  message?: string
  subtitle?: string
  type?: 'spinner' | 'dots' | 'pulse' | 'icon'
  size?: 'small' | 'medium' | 'large'
  icon?: string
  progress?: number
  cancellable?: boolean
  showRetry?: boolean
  fullscreen?: boolean
  showDetails?: boolean
  details?: LoadingDetail[]
  timeout?: number
  onCancel?: () => void
  onRetry?: () => void
  onTimeout?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  type: 'spinner',
  size: 'medium',
  fullscreen: true,
  showDetails: false,
  details: () => [],
  timeout: 30000 // 30 seconds default timeout
})

const emit = defineEmits<{
  cancel: []
  retry: []
  timeout: []
  'backdrop-click': []
}>()

// State
const detailsExpanded = ref(false)
const isRetrying = ref(false)
const isProcessing = ref(false)
const showTimeoutWarning = ref(false)
const timeoutTimer = ref<NodeJS.Timeout | null>(null)

// Computed
const hasActions = computed(() => props.cancellable || props.showRetry)

// Methods
const toggleDetails = () => {
  detailsExpanded.value = !detailsExpanded.value
}

const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel()
  }
  emit('cancel')
}

const handleRetry = async () => {
  if (props.onRetry) {
    isRetrying.value = true
    isProcessing.value = true
    
    try {
      await props.onRetry()
    } finally {
      isRetrying.value = false
      isProcessing.value = false
    }
  }
  emit('retry')
}

const handleBackdropClick = () => {
  emit('backdrop-click')
}

const getDetailIcon = (status: LoadingDetail['status']) => {
  switch (status) {
    case 'pending': return '⏳'
    case 'loading': return '🔄'
    case 'success': return '✅'
    case 'error': return '❌'
    default: return '•'
  }
}

const startTimeoutTimer = () => {
  if (props.timeout && props.timeout > 0) {
    timeoutTimer.value = setTimeout(() => {
      showTimeoutWarning.value = true
      if (props.onTimeout) {
        props.onTimeout()
      }
      emit('timeout')
    }, props.timeout)
  }
}

const clearTimeoutTimer = () => {
  if (timeoutTimer.value) {
    clearTimeout(timeoutTimer.value)
    timeoutTimer.value = null
  }
  showTimeoutWarning.value = false
}

// Watchers
watch(() => props.show, (newShow) => {
  if (newShow) {
    startTimeoutTimer()
  } else {
    clearTimeoutTimer()
  }
})

// Lifecycle
onMounted(() => {
  if (props.show) {
    startTimeoutTimer()
  }
})

onUnmounted(() => {
  clearTimeoutTimer()
})
</script>

<style scoped>
.workspace-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-fullscreen {
  position: fixed;
  z-index: 9999;
}

.loading-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
}

.loading-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

/* Loading Icons */
.loading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  position: relative;
  display: inline-block;
}

.spinner-small {
  width: 32px;
  height: 32px;
}

.spinner-medium {
  width: 48px;
  height: 48px;
}

.spinner-large {
  width: 64px;
  height: 64px;
}

.spinner-ring {
  position: absolute;
  border: 3px solid transparent;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-small .spinner-ring {
  width: 32px;
  height: 32px;
  border-width: 2px;
  border-top-width: 2px;
}

.spinner-medium .spinner-ring {
  width: 48px;
  height: 48px;
  border-width: 3px;
  border-top-width: 3px;
}

.spinner-large .spinner-ring {
  width: 64px;
  height: 64px;
  border-width: 4px;
  border-top-width: 4px;
}

.spinner-ring:nth-child(1) {
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  animation-delay: -0.3s;
}

.spinner-ring:nth-child(3) {
  animation-delay: -0.15s;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Dots Loader */
.dots-loader {
  display: flex;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  animation: dot-bounce 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Pulse Loader */
.pulse-loader {
  position: relative;
  width: 48px;
  height: 48px;
}

.pulse-circle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #3b82f6;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Default Icon */
.default-icon {
  font-size: 48px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* Loading Message */
.loading-message {
  max-width: 400px;
}

.message-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.message-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

/* Progress Bar */
.loading-progress {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

/* Loading Details */
.loading-details {
  width: 100%;
  max-width: 400px;
}

.details-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.details-toggle:hover {
  background: #f3f4f6;
}

.toggle-icon {
  font-size: 12px;
  color: #6b7280;
}

.toggle-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.details-content {
  margin-top: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.details-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}

.detail-item:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.detail-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.detail-text {
  flex: 1;
  color: #374151;
}

.detail-duration {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}

.detail-item.pending .detail-text {
  color: #9ca3af;
}

.detail-item.loading .detail-text {
  color: #3b82f6;
}

.detail-item.success .detail-text {
  color: #059669;
}

.detail-item.error .detail-text {
  color: #dc2626;
}

/* Action Buttons */
.loading-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.loading-btn {
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
}

.loading-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-btn-primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.loading-btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.loading-btn-secondary {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.loading-btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Timeout Warning */
.timeout-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  width: 100%;
  max-width: 400px;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
  text-align: left;
}

.warning-text {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #92400e;
}

.warning-subtext {
  margin: 0;
  font-size: 13px;
  color: #a16207;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .loading-backdrop {
    background: rgba(31, 41, 55, 0.95);
  }
  
  .loading-content {
    background: #1f2937;
    border-color: #374151;
  }
  
  .message-title {
    color: #f9fafb;
  }
  
  .message-subtitle {
    color: #d1d5db;
  }
  
  .progress-bar {
    background: #374151;
  }
  
  .progress-text {
    color: #9ca3af;
  }
  
  .details-toggle:hover {
    background: #374151;
  }
  
  .toggle-text {
    color: #e5e7eb;
  }
  
  .toggle-icon {
    color: #9ca3af;
  }
  
  .details-content {
    background: #374151;
    border-color: #4b5563;
  }
  
  .detail-item {
    border-bottom-color: #4b5563;
  }
  
  .detail-text {
    color: #d1d5db;
  }
  
  .loading-btn-secondary {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .loading-btn-secondary:hover:not(:disabled) {
    background: #4b5563;
    border-color: #6b7280;
  }
  
  .timeout-warning {
    background: #451a03;
    border-color: #92400e;
  }
  
  .warning-text {
    color: #fbbf24;
  }
  
  .warning-subtext {
    color: #f59e0b;
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .loading-content {
    padding: 24px 20px;
    margin: 20px;
    width: auto;
  }
  
  .message-title {
    font-size: 16px;
  }
  
  .message-subtitle {
    font-size: 13px;
  }
  
  .loading-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .loading-btn {
    width: 100%;
    justify-content: center;
  }
  
  .timeout-warning {
    flex-direction: column;
    text-align: center;
  }
  
  .warning-content {
    text-align: center;
  }
}
</style>