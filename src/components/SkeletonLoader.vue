<template>
  <div :class="['skeleton-container', `skeleton-${type}`]">
    <!-- List skeleton -->
    <div v-if="type === 'list'" class="skeleton-list">
      <div 
        v-for="i in count" 
        :key="i" 
        class="skeleton-list-item"
      >
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
        </div>
      </div>
    </div>
    
    <!-- Card skeleton -->
    <div v-else-if="type === 'card'" class="skeleton-card">
      <div class="skeleton-card-header">
        <div class="skeleton-line skeleton-title"></div>
      </div>
      <div class="skeleton-card-body">
        <div class="skeleton-line skeleton-full"></div>
        <div class="skeleton-line skeleton-half"></div>
        <div class="skeleton-line skeleton-quarter"></div>
      </div>
    </div>
    
    <!-- Text skeleton -->
    <div v-else-if="type === 'text'" class="skeleton-text">
      <div 
        v-for="i in lines" 
        :key="i" 
        :class="[
          'skeleton-line',
          i === lines ? 'skeleton-last-line' : 'skeleton-full'
        ]"
      ></div>
    </div>
    
    <!-- Table skeleton -->
    <div v-else-if="type === 'table'" class="skeleton-table">
      <div class="skeleton-table-header">
        <div 
          v-for="i in columns" 
          :key="i" 
          class="skeleton-table-cell skeleton-header-cell"
        ></div>
      </div>
      <div 
        v-for="i in rows" 
        :key="i" 
        class="skeleton-table-row"
      >
        <div 
          v-for="j in columns" 
          :key="j" 
          class="skeleton-table-cell"
        ></div>
      </div>
    </div>
    
    <!-- Custom skeleton -->
    <div v-else class="skeleton-custom">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'list' | 'card' | 'text' | 'table' | 'custom'
  count?: number
  lines?: number
  rows?: number
  columns?: number
  animated?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  count: 3,
  lines: 3,
  rows: 5,
  columns: 4,
  animated: true
})
</script>

<style scoped>
.skeleton-container {
  width: 100%;
}

.skeleton-line,
.skeleton-avatar,
.skeleton-table-cell {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* List skeleton */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  height: 16px;
  width: 70%;
}

.skeleton-subtitle {
  height: 14px;
  width: 50%;
}

/* Card skeleton */
.skeleton-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-card-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Text skeleton */
.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-full {
  height: 16px;
  width: 100%;
}

.skeleton-half {
  height: 16px;
  width: 50%;
}

.skeleton-quarter {
  height: 16px;
  width: 25%;
}

.skeleton-last-line {
  height: 16px;
  width: 60%;
}

/* Table skeleton */
.skeleton-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-table-header {
  display: flex;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-table-row {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-cell {
  flex: 1;
  height: 20px;
  margin: 12px;
}

.skeleton-header-cell {
  height: 16px;
  margin: 16px 12px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .skeleton-line,
  .skeleton-avatar,
  .skeleton-table-cell {
    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
    background-size: 200% 100%;
  }
  
  .skeleton-list-item,
  .skeleton-card,
  .skeleton-table {
    border-color: #4b5563;
  }
  
  .skeleton-card-header {
    border-bottom-color: #4b5563;
  }
  
  .skeleton-table-header {
    background: #374151;
    border-bottom-color: #4b5563;
  }
  
  .skeleton-table-row {
    border-bottom-color: #4b5563;
  }
}

/* Disable animation if user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-avatar,
  .skeleton-table-cell {
    animation: none;
    background: #f0f0f0;
  }
  
  @media (prefers-color-scheme: dark) {
    .skeleton-line,
    .skeleton-avatar,
    .skeleton-table-cell {
      background: #374151;
    }
  }
}
</style>