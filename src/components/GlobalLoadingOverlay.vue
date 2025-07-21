<template>
  <div v-if="activeStates.length > 0" class="global-loading-overlay">
    <div class="loading-states">
      <div 
        v-for="state in activeStates" 
        :key="state.id"
        class="loading-state-item"
      >
        <LoadingSpinner 
          :show="true"
          :message="state.message"
          :progress="state.progress"
          :cancellable="state.cancellable"
          :onCancel="state.onCancel"
          size="medium"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'
import { useLoading } from '../composables/useLoading'

const { allStates } = useLoading()

// Only show overlay-worthy loading states (long-running operations)
const activeStates = computed(() => {
  const now = new Date()
  const filtered = allStates.value.filter(state => {
    // Only show states that have been running for more than 500ms
    const duration = now.getTime() - state.startTime.getTime()
    return duration > 500
  })
  
  // Debug: log when loading states are active
  if (filtered.length > 0) {
    console.log('GlobalLoadingOverlay active states:', filtered.map(s => ({ id: s.id, message: s.message })))
  }
  
  return filtered
})
</script>

<style scoped>
.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-states {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 400px;
  width: 90%;
}

.loading-state-item {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .global-loading-overlay {
    background: rgba(31, 41, 55, 0.8);
  }
  
  .loading-state-item {
    background: #1f2937;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  }
}
</style>