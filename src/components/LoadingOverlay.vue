<template>
  <div v-if="show" class="loading-overlay" :class="{ 'loading-overlay-fullscreen': fullscreen }">
    <div class="loading-content">
      <div class="loading-spinner" :class="`loading-spinner-${size}`">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      
      <div v-if="message" class="loading-message">{{ message }}</div>
      
      <div v-if="progress !== undefined" class="loading-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
          ></div>
        </div>
        <div class="progress-text">{{ Math.round(progress) }}%</div>
      </div>
      
      <div v-if="details" class="loading-details">{{ details }}</div>
      
      <button 
        v-if="cancellable && onCancel" 
        class="loading-cancel-btn"
        @click="handleCancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show?: boolean
  message?: string
  details?: string
  size?: 'small' | 'medium' | 'large'
  fullscreen?: boolean
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
  blur?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  size: 'medium',
  fullscreen: false,
  cancellable: false,
  blur: true
})

const emit = defineEmits<{
  cancel: []
}>()

function handleCancel() {
  if (props.onCancel) {
    props.onCancel()
  }
  emit('cancel')
}
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.loading-overlay-fullscreen {
  position: fixed;
  z-index: 1000;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
}

.loading-spinner {
  position: relative;
  display: inline-block;
}

.loading-spinner-small {
  width: 24px;
  height: 24px;
}

.loading-spinner-medium {
  width: 40px;
  height: 40px;
}

.loading-spinner-large {
  width: 60px;
  height: 60px;
}

.spinner-ring {
  position: absolute;
  border: 3px solid transparent;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.loading-spinner-small .spinner-ring {
  width: 24px;
  height: 24px;
  border-width: 2px;
  border-top-width: 2px;
}

.loading-spinner-medium .spinner-ring {
  width: 40px;
  height: 40px;
  border-width: 3px;
  border-top-width: 3px;
}

.loading-spinner-large .spinner-ring {
  width: 60px;
  height: 60px;
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

.loading-message {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
  max-width: 300px;
  line-height: 1.4;
}

.loading-details {
  font-size: 14px;
  color: #6b7280;
  max-width: 300px;
  line-height: 1.4;
}

.loading-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 250px;
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

.loading-cancel-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.loading-cancel-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: rgba(31, 41, 55, 0.9);
  }
  
  .loading-content {
    background: #1f2937;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
  
  .loading-message {
    color: #f9fafb;
  }
  
  .loading-details {
    color: #d1d5db;
  }
  
  .progress-bar {
    background: #374151;
  }
  
  .progress-text {
    color: #9ca3af;
  }
  
  .loading-cancel-btn {
    background: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .loading-cancel-btn:hover {
    background: #4b5563;
    border-color: #6b7280;
  }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .loading-content {
    padding: 24px 20px;
    gap: 12px;
  }
  
  .loading-message {
    font-size: 14px;
    max-width: 250px;
  }
  
  .loading-details {
    font-size: 13px;
    max-width: 250px;
  }
  
  .loading-progress {
    max-width: 200px;
  }
}

/* Animation for smooth appearance */
.loading-overlay {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>