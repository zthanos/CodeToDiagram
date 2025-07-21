<template>
  <div v-if="show" :class="['loading-container', { 'loading-overlay': overlay }]">
    <div class="loading-content">
      <div :class="['spinner', `spinner-${size}`]">
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
      
      <button 
        v-if="cancellable && onCancel" 
        class="loading-cancel-btn"
        @click="onCancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show?: boolean
  message?: string
  size?: 'small' | 'medium' | 'large'
  overlay?: boolean
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
}

withDefaults(defineProps<Props>(), {
  show: true,
  size: 'medium',
  overlay: false,
  cancellable: false
})
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.spinner {
  position: relative;
  display: inline-block;
}

.spinner-small {
  width: 24px;
  height: 24px;
}

.spinner-medium {
  width: 40px;
  height: 40px;
}

.spinner-large {
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

.spinner-small .spinner-ring {
  width: 24px;
  height: 24px;
  border-width: 2px;
  border-top-width: 2px;
}

.spinner-medium .spinner-ring {
  width: 40px;
  height: 40px;
  border-width: 3px;
  border-top-width: 3px;
}

.spinner-large .spinner-ring {
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
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  max-width: 300px;
}

.loading-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 200px;
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
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
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
  
  .loading-message {
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

/* Responsive design */
@media (max-width: 640px) {
  .loading-content {
    gap: 12px;
  }
  
  .loading-message {
    font-size: 13px;
    max-width: 250px;
  }
  
  .loading-progress {
    width: 150px;
  }
}
</style>