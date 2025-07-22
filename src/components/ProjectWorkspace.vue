<template>
  <div class="project-workspace">
    <!-- Navigation Sidebar -->
    <div class="navigation-sidebar">
      <div class="project-header">
        <div class="project-info">
          <h2 class="project-name">{{ currentProject?.name || 'Loading...' }}</h2>
          <p class="project-description">{{ currentProject?.description || '' }}</p>
        </div>
      </div>

      <nav class="workspace-navigation">
        <ul class="nav-menu">
          <li class="nav-item">
            <button 
              class="nav-button" 
              :class="{ active: activeSection === 'requirements' }"
              @click="setActiveSection('requirements')"
            >
              📋 Requirements
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-button" 
              :class="{ active: activeSection === 'diagrams' }"
              @click="setActiveSection('diagrams')"
            >
              📊 Diagrams
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-button" 
              :class="{ active: activeSection === 'teams' }"
              @click="setActiveSection('teams')"
            >
              👥 Teams
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-button" 
              :class="{ active: activeSection === 'tasks' }"
              @click="setActiveSection('tasks')"
            >
              ✅ Tasks
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-button" 
              :class="{ active: activeSection === 'notes' }"
              @click="setActiveSection('notes')"
            >
              📝 Notes
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading project...</p>
      </div>
      
      <div v-else-if="!currentProject" class="error-state">
        <h3>Project Not Found</h3>
        <p>The requested project could not be loaded.</p>
        <button @click="$router.push('/')" class="btn-primary">
          Return to Projects
        </button>
      </div>

      <div v-else class="workspace-content">
        <!-- Requirements Section -->
        <RequirementsWorkspace 
          v-if="activeSection === 'requirements'"
          :project="currentProject"
          @project-updated="handleProjectUpdated"
          @unsaved-changes="setUnsavedChanges"
        />

        <!-- Diagrams Section -->
        <DiagramsWorkspace 
          v-if="activeSection === 'diagrams'"
          :project="currentProject"
          :theme="theme"
          @update:theme="$emit('update:theme', $event)"
          @project-updated="handleProjectUpdated"
        />

        <!-- Teams Section -->
        <TeamsWorkspace 
          v-if="activeSection === 'teams'"
          :project="currentProject"
        />

        <!-- Tasks Section -->
        <TasksWorkspace 
          v-if="activeSection === 'tasks'"
          :project="currentProject"
        />

        <!-- Notes Section -->
        <NotesWorkspace 
          v-if="activeSection === 'notes'"
          :project="currentProject"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DiagramsWorkspace from './DiagramsWorkspace.vue'
import RequirementsWorkspace from './RequirementsWorkspace.vue'
import TeamsWorkspace from './TeamsWorkspace.vue'
import TasksWorkspace from './TasksWorkspace.vue'
import NotesWorkspace from './NotesWorkspace.vue'
import { Project } from '../types/project'
import NotificationService from '../services/NotificationService'
import { useLoading } from '../composables/useLoading'
import { useComponentErrorHandling } from '../composables/useErrorHandling'
import { navigateToHome } from '../router'
import { useDialog } from '../composables/useDialog'

const props = defineProps<{ 
  theme: string
  id?: string 
}>()

const emit = defineEmits<{
  (e: 'update:theme', theme: string): void
}>()

// State
const route = useRoute()
const router = useRouter()
const currentProject = ref<Project | null>(null)
const activeSection = ref<string>('diagrams') // Default to diagrams section
const isLoading = ref(false)
const hasUnsavedChanges = ref(false)
const loadError = ref<string | null>(null)

// Composables
const loading = useLoading('project-workspace')
const errorHandler = useComponentErrorHandling('ProjectWorkspace')
const dialog = useDialog()

// Lifecycle
onMounted(() => {
  initializeWorkspace()
  setupUnsavedChangesWarning()
})

onBeforeUnmount(() => {
  cleanupUnsavedChangesWarning()
})

// Watch for route changes to load different projects
watch(() => route?.params?.id, (newId) => {
  if (newId && typeof newId === 'string') {
    loadProject(newId)
  }
}, { immediate: true })

// Methods
async function initializeWorkspace() {
  const projectId = route?.params?.id as string
  if (projectId) {
    await loadProject(projectId)
  }
}

async function loadProject(projectId: string) {
  await errorHandler.withErrorHandling(async () => {
    await loading.withLoading(async () => {
      isLoading.value = true
      try {
        const projectManager = await import('../services/ProjectManager')
        const manager = projectManager.ProjectManager.getInstance()
        const project = await manager.loadProject(projectId)
        currentProject.value = project
        
        // Restore last active section if available
        const savedSection = localStorage.getItem(`project-${projectId}-active-section`)
        if (savedSection && ['requirements', 'diagrams', 'teams', 'tasks', 'notes'].includes(savedSection)) {
          activeSection.value = savedSection
        }
        
        NotificationService.success('Project Loaded', `Successfully loaded project "${project.name}"`)
      } catch (error) {
        console.error('Failed to load project in workspace:', error)
        NotificationService.error('Load Failed', 'Failed to load project')
        
        // Use navigation helper with error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await navigateToHome('project-load-failed', `Failed to load project: ${errorMessage}`)
        throw error
      } finally {
        isLoading.value = false
      }
    }, 'Loading project...')
  }, 'load_project')
}

function setActiveSection(section: string) {
  activeSection.value = section
  // Save section state for persistence
  if (currentProject.value) {
    localStorage.setItem(`project-${currentProject.value.id}-active-section`, section)
  }
}

function handleProjectUpdated(updatedProject: Project) {
  currentProject.value = updatedProject
  hasUnsavedChanges.value = false // Reset unsaved changes when project is updated
}

// Unsaved changes warning setup
function setupUnsavedChangesWarning() {
  // Add beforeunload event listener for browser navigation
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Add router navigation guard
  const removeGuard = router.beforeEach(async (to, from, next) => {
    if (hasUnsavedChanges.value && from.name === 'ProjectWorkspace') {
      const shouldSave = await dialog.confirmSave(hasUnsavedChanges.value)
      if (shouldSave) {
        // Try to save changes before navigation
        try {
          await saveCurrentChanges()
          next()
        } catch (error) {
          console.error('Failed to save changes:', error)
          const shouldContinue = await dialog.warning(
            'Save Failed',
            'Failed to save changes. Do you want to continue without saving?'
          )
          if (shouldContinue) {
            hasUnsavedChanges.value = false
            next()
          } else {
            next(false)
          }
        }
      } else {
        hasUnsavedChanges.value = false
        next()
      }
    } else {
      next()
    }
  })
  
  // Store the remove function for cleanup
  ;(window as any).__routerGuardRemover = removeGuard
}

function cleanupUnsavedChangesWarning() {
  // Remove beforeunload event listener
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // Remove router navigation guard
  const removeGuard = (window as any).__routerGuardRemover
  if (removeGuard) {
    removeGuard()
    delete (window as any).__routerGuardRemover
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    return event.returnValue
  }
}

async function saveCurrentChanges() {
  // This would be implemented based on the current active section
  // For now, we'll just simulate saving
  await new Promise(resolve => setTimeout(resolve, 1000))
}

// Method to set unsaved changes state (to be called by child components)
function setUnsavedChanges(hasChanges: boolean) {
  hasUnsavedChanges.value = hasChanges
}

// Retry mechanism for failed project loads
async function retryLoadProject() {
  const projectId = route?.params?.id as string
  if (projectId) {
    loadError.value = null
    await loadProject(projectId)
  }
}
</script>

<style scoped>
/* Project workspace layout */
.project-workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100vh;
  background-color: #ffffff;
}

/* Navigation Sidebar */
.navigation-sidebar {
  background-color: #f8f9fa;
  border-right: 1px solid #e1e4e8;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.project-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #ffffff;
}

.project-info {
  text-align: left;
}

.project-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #24292f;
  line-height: 1.2;
}

.project-description {
  margin: 0;
  font-size: 0.875rem;
  color: #656d76;
  line-height: 1.4;
}

/* Workspace Navigation */
.workspace-navigation {
  flex: 1;
  padding: 1rem 0;
}

.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 0;
}

.nav-button {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.875rem;
  color: #24292f;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-button:hover {
  background-color: #f6f8fa;
  color: #0969da;
}

.nav-button.active {
  background-color: #dbeafe;
  color: #0969da;
  border-left-color: #0969da;
  font-weight: 500;
}

.nav-button:focus {
  outline: 2px solid #0969da;
  outline-offset: -2px;
}

/* Main Content Area */
.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #ffffff;
}

.workspace-content {
  flex: 1;
  overflow: hidden;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #656d76;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #0969da;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #656d76;
  padding: 2rem;
}

.error-state h3 {
  margin: 0 0 0.5rem 0;
  color: #24292f;
  font-size: 1.25rem;
}

.error-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

.btn-primary {
  background-color: #0969da;
  color: #ffffff;
  border: 1px solid #0969da;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: #0860ca;
}

.btn-primary:focus {
  outline: 2px solid #0969da;
  outline-offset: 2px;
}

/* Placeholder Workspace Styling */
:deep(.placeholder-workspace) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #656d76;
  padding: 2rem;
}

:deep(.placeholder-workspace h3) {
  margin: 0 0 0.5rem 0;
  color: #24292f;
  font-size: 1.25rem;
}

:deep(.placeholder-workspace p) {
  margin: 0;
  font-size: 0.875rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .project-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .navigation-sidebar {
    border-right: none;
    border-bottom: 1px solid #e1e4e8;
  }
  
  .workspace-navigation {
    padding: 0.5rem 0;
  }
  
  .nav-menu {
    display: flex;
    overflow-x: auto;
    padding: 0 0.5rem;
  }
  
  .nav-item {
    flex-shrink: 0;
  }
  
  .nav-button {
    white-space: nowrap;
    padding: 0.5rem 1rem;
    border-left: none;
    border-bottom: 3px solid transparent;
  }
  
  .nav-button.active {
    border-left: none;
    border-bottom-color: #0969da;
  }
}
</style>