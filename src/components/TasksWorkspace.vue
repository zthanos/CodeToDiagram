<template>
  <div class="tasks-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <h2 class="workspace-title">Tasks</h2>
      <p class="workspace-description">Track and manage tasks for {{ project?.name || 'this project' }}.</p>
    </div>

    <!-- Coming Soon Content -->
    <div class="coming-soon-content">
      <div class="coming-soon-icon">✅</div>
      <h3 class="coming-soon-title">Tasks functionality coming soon</h3>
      <p class="coming-soon-description">
        We're building comprehensive task management features including:
      </p>
      <ul class="feature-list">
        <li>Task creation and assignment</li>
        <li>Progress tracking</li>
        <li>Due dates and reminders</li>
        <li>Task dependencies</li>
        <li>Kanban board view</li>
      </ul>
      <div class="project-context">
        <span class="context-label">Current Project:</span>
        <span class="context-value">{{ project?.name || 'Unknown Project' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Project } from '../types/project'

// Props
interface Props {
  project: Project
}

const props = defineProps<Props>()
</script>

<style scoped>
.tasks-workspace {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-header {
  margin-bottom: 32px;
}

.workspace-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.workspace-description {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.coming-soon-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 48px 24px;
  border: 1px solid #e5e7eb;
}

.coming-soon-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.8;
}

.coming-soon-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.coming-soon-description {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px 0;
  max-width: 500px;
  line-height: 1.5;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
  text-align: left;
}

.feature-list li {
  font-size: 14px;
  color: #666;
  margin: 8px 0;
  padding-left: 20px;
  position: relative;
}

.feature-list li::before {
  content: "•";
  color: #10b981;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.project-context {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.context-label {
  color: #666;
  font-weight: 500;
}

.context-value {
  color: #1a1a1a;
  font-weight: 600;
}
</style>