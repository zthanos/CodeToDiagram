<template>
  <div :class="['workspace-skeleton-container', `skeleton-${type}`]">
    <!-- Project Overview Workspace skeleton -->
    <div v-if="type === 'project-overview'" class="project-overview-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-actions">
          <div class="skeleton-button"></div>
          <div class="skeleton-button"></div>
        </div>
      </div>
      
      <div class="skeleton-cards-grid">
        <div 
          v-for="i in 6" 
          :key="i" 
          class="skeleton-card"
        >
          <div class="skeleton-card-header">
            <div class="skeleton-line skeleton-card-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-card-body">
            <div class="skeleton-stats">
              <div v-for="j in 3" :key="j" class="skeleton-stat">
                <div class="skeleton-stat-value"></div>
                <div class="skeleton-stat-label"></div>
              </div>
            </div>
            <div class="skeleton-content-lines">
              <div class="skeleton-line skeleton-full"></div>
              <div class="skeleton-line skeleton-half"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ADR Workspace skeleton -->
    <div v-else-if="type === 'adr-workspace'" class="adr-workspace-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-header-left">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
        </div>
        <div class="skeleton-stats">
          <div v-for="i in 3" :key="i" class="skeleton-stat">
            <div class="skeleton-stat-value"></div>
            <div class="skeleton-stat-label"></div>
          </div>
        </div>
      </div>
      
      <div class="skeleton-toolbar">
        <div class="skeleton-search"></div>
        <div class="skeleton-filters">
          <div v-for="i in 3" :key="i" class="skeleton-filter"></div>
        </div>
        <div class="skeleton-button skeleton-primary"></div>
      </div>
      
      <div class="skeleton-list">
        <div 
          v-for="i in count" 
          :key="i" 
          class="skeleton-adr-item"
        >
          <div class="skeleton-adr-header">
            <div class="skeleton-line skeleton-adr-title"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-adr-meta">
            <div class="skeleton-line skeleton-quarter"></div>
            <div class="skeleton-line skeleton-quarter"></div>
          </div>
          <div class="skeleton-adr-content">
            <div class="skeleton-line skeleton-full"></div>
            <div class="skeleton-line skeleton-three-quarters"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Requirements Workspace skeleton -->
    <div v-else-if="type === 'requirements-workspace'" class="requirements-workspace-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-actions">
          <div class="skeleton-button"></div>
          <div class="skeleton-button skeleton-primary"></div>
        </div>
      </div>
      
      <div class="skeleton-main-content">
        <div class="skeleton-editor-panel">
          <div class="skeleton-editor-header">
            <div class="skeleton-line skeleton-editor-title"></div>
            <div class="skeleton-editor-controls">
              <div class="skeleton-select"></div>
              <div class="skeleton-button"></div>
            </div>
          </div>
          <div class="skeleton-editor-content">
            <div v-for="i in 15" :key="i" class="skeleton-line skeleton-editor-line"></div>
          </div>
        </div>
        
        <div class="skeleton-right-panel">
          <div class="skeleton-tabs">
            <div v-for="i in 3" :key="i" class="skeleton-tab"></div>
          </div>
          <div class="skeleton-tab-content">
            <div class="skeleton-search"></div>
            <div class="skeleton-list">
              <div 
                v-for="i in 5" 
                :key="i" 
                class="skeleton-list-item"
              >
                <div class="skeleton-item-header">
                  <div class="skeleton-line skeleton-item-title"></div>
                  <div class="skeleton-badge"></div>
                </div>
                <div class="skeleton-line skeleton-half"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Generic workspace skeleton -->
    <div v-else class="generic-workspace-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-actions">
          <div v-for="i in 2" :key="i" class="skeleton-button"></div>
        </div>
      </div>
      
      <div class="skeleton-content">
        <div class="skeleton-sidebar">
          <div v-for="i in 5" :key="i" class="skeleton-nav-item"></div>
        </div>
        <div class="skeleton-main">
          <div v-for="i in 8" :key="i" class="skeleton-line skeleton-content-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'project-overview' | 'adr-workspace' | 'requirements-workspace' | 'generic'
  count?: number
  animated?: boolean
  message?: string
}

withDefaults(defineProps<Props>(), {
  type: 'generic',
  count: 5,
  animated: true
})
</script>

<style scoped>
.workspace-skeleton-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  background: #ffffff;
}

.skeleton-line,
.skeleton-button,
.skeleton-badge,
.skeleton-card,
.skeleton-stat-value,
.skeleton-stat-label,
.skeleton-search,
.skeleton-filter,
.skeleton-select,
.skeleton-tab,
.skeleton-nav-item {
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

/* Project Overview Skeleton */
.project-overview-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-title {
  height: 32px;
  width: 300px;
}

.skeleton-actions {
  display: flex;
  gap: 12px;
}

.skeleton-button {
  height: 36px;
  width: 120px;
  border-radius: 6px;
}

.skeleton-button.skeleton-primary {
  width: 140px;
}

.skeleton-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  flex: 1;
}

.skeleton-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #ffffff;
}

.skeleton-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.skeleton-card-title {
  height: 20px;
  width: 150px;
}

.skeleton-badge {
  height: 20px;
  width: 60px;
  border-radius: 10px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-stats {
  display: flex;
  gap: 16px;
}

.skeleton-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.skeleton-stat-value {
  height: 24px;
  width: 40px;
}

.skeleton-stat-label {
  height: 12px;
  width: 60px;
}

.skeleton-content-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ADR Workspace Skeleton */
.adr-workspace-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.skeleton-header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-subtitle {
  height: 16px;
  width: 400px;
}

.skeleton-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.skeleton-search {
  height: 36px;
  width: 300px;
  border-radius: 6px;
}

.skeleton-filters {
  display: flex;
  gap: 8px;
}

.skeleton-filter {
  height: 36px;
  width: 80px;
  border-radius: 6px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.skeleton-adr-item {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.skeleton-adr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skeleton-adr-title {
  height: 20px;
  width: 250px;
}

.skeleton-adr-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.skeleton-adr-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Requirements Workspace Skeleton */
.requirements-workspace-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.skeleton-main-content {
  display: flex;
  gap: 24px;
  flex: 1;
}

.skeleton-editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-editor-title {
  height: 20px;
  width: 200px;
}

.skeleton-editor-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.skeleton-select {
  height: 32px;
  width: 100px;
  border-radius: 4px;
}

.skeleton-editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.skeleton-editor-line {
  height: 16px;
}

.skeleton-editor-line:nth-child(3n) {
  width: 60%;
}

.skeleton-editor-line:nth-child(5n) {
  width: 80%;
}

.skeleton-right-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e5e7eb;
}

.skeleton-tab {
  height: 36px;
  width: 100px;
  border-radius: 4px 4px 0 0;
}

.skeleton-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.skeleton-list-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.skeleton-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.skeleton-item-title {
  height: 16px;
  width: 180px;
}

/* Generic Workspace Skeleton */
.generic-workspace-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
}

.skeleton-content {
  display: flex;
  gap: 24px;
  flex: 1;
}

.skeleton-sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-nav-item {
  height: 36px;
  border-radius: 6px;
}

.skeleton-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-content-line {
  height: 16px;
}

.skeleton-content-line:nth-child(odd) {
  width: 100%;
}

.skeleton-content-line:nth-child(even) {
  width: 75%;
}

/* Common skeleton line variations */
.skeleton-full {
  width: 100%;
  height: 16px;
}

.skeleton-three-quarters {
  width: 75%;
  height: 16px;
}

.skeleton-half {
  width: 50%;
  height: 16px;
}

.skeleton-quarter {
  width: 25%;
  height: 16px;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .workspace-skeleton-container {
    background: #1f2937;
  }
  
  .skeleton-line,
  .skeleton-button,
  .skeleton-badge,
  .skeleton-stat-value,
  .skeleton-stat-label,
  .skeleton-search,
  .skeleton-filter,
  .skeleton-select,
  .skeleton-tab,
  .skeleton-nav-item {
    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
    background-size: 200% 100%;
  }
  
  .skeleton-card,
  .skeleton-adr-item,
  .skeleton-list-item {
    background: #374151;
    border-color: #4b5563;
  }
  
  .skeleton-toolbar {
    background: #374151;
  }
  
  .skeleton-editor-content {
    border-color: #4b5563;
  }
  
  .skeleton-header {
    border-bottom-color: #4b5563;
  }
  
  .skeleton-editor-header {
    border-bottom-color: #4b5563;
  }
  
  .skeleton-tabs {
    border-bottom-color: #4b5563;
  }
}

/* Disable animation if user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-button,
  .skeleton-badge,
  .skeleton-stat-value,
  .skeleton-stat-label,
  .skeleton-search,
  .skeleton-filter,
  .skeleton-select,
  .skeleton-tab,
  .skeleton-nav-item {
    animation: none;
    background: #f0f0f0;
  }
  
  @media (prefers-color-scheme: dark) {
    .skeleton-line,
    .skeleton-button,
    .skeleton-badge,
    .skeleton-stat-value,
    .skeleton-stat-label,
    .skeleton-search,
    .skeleton-filter,
    .skeleton-select,
    .skeleton-tab,
    .skeleton-nav-item {
      background: #374151;
    }
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .workspace-skeleton-container {
    padding: 16px;
  }
  
  .skeleton-cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .skeleton-main-content {
    flex-direction: column;
  }
  
  .skeleton-right-panel {
    width: 100%;
  }
  
  .skeleton-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .skeleton-search {
    width: 100%;
  }
  
  .skeleton-filters {
    justify-content: center;
  }
  
  .skeleton-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .skeleton-actions {
    justify-content: center;
  }
}
</style>