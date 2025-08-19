<template>
  <WorkspaceErrorBoundary workspace-name="Project Overview" component-name="ProjectOverviewWorkspace"
    :show-recovery-options="true" :max-retries="3" @retry="handleErrorRetry" @reset="handleWorkspaceReset"
    @clear-data="handleClearData">
    <div class="project-overview-workspace">
      <!-- Header -->
      <div class="workspace-header">
        <h2 class="workspace-title">Project Overview</h2>
        <div class="header-actions">
          <button class="refresh-btn" @click="refreshAllData" :disabled="errorHandling.isLoading.value"
            :class="{ 'loading': errorHandling.isLoading.value }">
            <span v-if="errorHandling.isLoading.value" class="spinner"></span>
            {{ errorHandling.isLoading.value ? 'Refreshing...' : '🔄 Refresh' }}
          </button>

          <!-- Last updated indicator -->
          <div v-if="lastUpdated" class="last-updated">
            Last updated: {{ formatTime(lastUpdated) }}
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <WorkspaceLoadingOverlay :show="errorHandling.isLoading.value && !hasAnyData" type="spinner" size="large"
        message="Loading Project Overview" subtitle="Fetching project data from all sources..."
        :details="errorHandling.loadingState.value.loadingDetails" :show-details="true" :timeout="30000"
        @timeout="handleLoadingTimeout" />

      <!-- Main Content -->
      <div class="main-content">
        <!-- Skeleton Loading State -->
        <WorkspaceSkeletonLoader v-if="errorHandling.isLoading.value && !hasAnyData" type="project-overview" />

        <!-- Dashboard Content -->
        <div v-else class="dashboard-content">
          <!-- Status Cards Grid -->
          <div class="status-cards-grid">
            <!-- Solution Outline Card -->
            <div class="status-card solution-outline-card">
              <div class="card-header">
                <h3 class="card-title">🎯 Solution Outline</h3>
                <div class="card-status" :class="solutionOutlineStatusClass">
                  {{ solutionOutlineStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="projectOutlineLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading outline...</span>
                </div>
                <div v-else-if="projectOutlineError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ projectOutlineError }}</span>
                  <button class="retry-btn small" @click="loadProjectOutline">Retry</button>
                </div>
                <div v-else-if="projectOutline" class="outline-info">
                  <div class="version-info">
                    <span class="version-label">Working Version:</span>
                    <span class="version-number">v{{ projectOutline.working_version }}</span>
                  </div>
                  <div class="status-info">
                    <span class="status-label">Status:</span>
                    <span class="status-value" :class="projectOutline.status">
                      {{ capitalizeFirst(projectOutline.status) }}
                    </span>
                  </div>
                  <div class="last-updated">
                    Updated: {{ formatTime(new Date(projectOutline.updated_at)) }}
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">📝</span>
                  <span class="no-data-text">No solution outline available</span>
                </div>
              </div>
            </div>

            <!-- Requirements Card -->
            <div class="status-card requirements-card">
              <div class="card-header">
                <h3 class="card-title">📋 Requirements</h3>
                <div class="card-status" :class="requirementsStatusClass">
                  {{ requirementsStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="requirementsLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading requirements...</span>
                </div>
                <div v-else-if="requirementsError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ requirementsError }}</span>
                  <button class="retry-btn small" @click="loadRequirementsSummary">Retry</button>
                </div>
                <div v-else-if="requirementsSummary" class="requirements-info">
                  <div class="summary-stats">
                    <div class="stat-item">
                      <span class="stat-value">{{ requirementsSummary.total || 0 }}</span>
                      <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ requirementsSummary.accepted || 0 }}</span>
                      <span class="stat-label">Accepted</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ requirementsSummary.pending || 0 }}</span>
                      <span class="stat-label">Pending</span>
                    </div>
                  </div>
                  <div class="document-info" v-if="requirementsDocument">
                    <div class="version-info">
                      <span class="version-label">Document Version:</span>
                      <span class="version-number">v{{ requirementsDocument.version }}</span>
                    </div>
                    <div class="status-info">
                      <span class="status-label">Status:</span>
                      <span class="status-value" :class="requirementsDocument.status">
                        {{ capitalizeFirst(requirementsDocument.status) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">📋</span>
                  <span class="no-data-text">No requirements data available</span>
                </div>
              </div>
            </div>

            <!-- Teams Card -->
            <div class="status-card teams-card">
              <div class="card-header">
                <h3 class="card-title">👥 Teams</h3>
                <div class="card-status" :class="teamsStatusClass">
                  {{ teamsStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="teamsLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading teams...</span>
                </div>
                <div v-else-if="teamsError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ teamsError }}</span>
                  <button class="retry-btn small" @click="loadTeamsData">Retry</button>
                </div>
                <div v-else-if="teamsData.length > 0" class="teams-info">
                  <div class="teams-summary">
                    <div class="stat-item">
                      <span class="stat-value">{{ teamsData.length }}</span>
                      <span class="stat-label">Teams</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ totalTeamMembers }}</span>
                      <span class="stat-label">Members</span>
                    </div>
                  </div>
                  <div class="teams-list">
                    <div v-for="team in teamsData.slice(0, 3)" :key="team.id" class="team-item">
                      <span class="team-name">{{ team.name }}</span>
                      <span class="team-role">{{ team.role }}</span>
                    </div>
                    <div v-if="teamsData.length > 3" class="more-teams">
                      +{{ teamsData.length - 3 }} more teams
                    </div>
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">👥</span>
                  <span class="no-data-text">No teams configured</span>
                </div>
              </div>
            </div>

            <!-- Systems Card -->
            <div class="status-card systems-card">
              <div class="card-header">
                <h3 class="card-title">🏗️ Systems</h3>
                <div class="card-status" :class="systemsStatusClass">
                  {{ systemsStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="systemsLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading systems...</span>
                </div>
                <div v-else-if="systemsError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ systemsError }}</span>
                  <button class="retry-btn small" @click="loadSystemsData">Retry</button>
                </div>
                <div v-else-if="systemsData.length > 0" class="systems-info">
                  <div class="systems-summary">
                    <div class="stat-item">
                      <span class="stat-value">{{ systemsData.length }}</span>
                      <span class="stat-label">Systems</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ internalSystemsCount }}</span>
                      <span class="stat-label">Internal</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ externalSystemsCount }}</span>
                      <span class="stat-label">External</span>
                    </div>
                  </div>
                  <div class="systems-list">
                    <div v-for="system in systemsData.slice(0, 3)" :key="system.id" class="system-item">
                      <span class="system-name">{{ system.name }}</span>
                      <span class="system-type" :class="system.type">{{ system.type }}</span>
                    </div>
                    <div v-if="systemsData.length > 3" class="more-systems">
                      +{{ systemsData.length - 3 }} more systems
                    </div>
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">🏗️</span>
                  <span class="no-data-text">No systems defined</span>
                </div>
              </div>
            </div>

            <!-- ADRs Card -->
            <div class="status-card adrs-card">
              <div class="card-header">
                <h3 class="card-title">📚 ADRs</h3>
                <div class="card-status" :class="adrsStatusClass">
                  {{ adrsStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="adrsLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading ADRs...</span>
                </div>
                <div v-else-if="adrsError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ adrsError }}</span>
                  <button class="retry-btn small" @click="loadADRsData">Retry</button>
                </div>
                <div v-else-if="adrsData.length > 0" class="adrs-info">
                  <div class="adrs-summary">
                    <div class="stat-item">
                      <span class="stat-value">{{ adrsData.length }}</span>
                      <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ acceptedADRsCount }}</span>
                      <span class="stat-label">Accepted</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ proposedADRsCount }}</span>
                      <span class="stat-label">Proposed</span>
                    </div>
                  </div>
                  <div class="adrs-list">
                    <div v-for="adr in adrsData.slice(0, 3)" :key="adr.id" class="adr-item">
                      <span class="adr-title">{{ adr.title }}</span>
                      <span class="adr-status" :class="adr.status">{{ adr.status }}</span>
                    </div>
                    <div v-if="adrsData.length > 3" class="more-adrs">
                      +{{ adrsData.length - 3 }} more ADRs
                    </div>
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">📚</span>
                  <span class="no-data-text">No ADRs created</span>
                </div>
              </div>
            </div>

            <!-- Notes Card -->
            <div class="status-card notes-card">
              <div class="card-header">
                <h3 class="card-title">📝 Notes</h3>
                <div class="card-status" :class="notesStatusClass">
                  {{ notesStatusText }}
                </div>
              </div>
              <div class="card-content">
                <div v-if="notesLoading" class="card-loading">
                  <div class="loading-spinner small"></div>
                  <span>Loading notes...</span>
                </div>
                <div v-else-if="notesError" class="card-error">
                  <span class="error-icon">⚠️</span>
                  <span class="error-text">{{ notesError }}</span>
                  <button class="retry-btn small" @click="loadNotesData">Retry</button>
                </div>
                <div v-else-if="notesData.length > 0" class="notes-info">
                  <div class="notes-summary">
                    <div class="stat-item">
                      <span class="stat-value">{{ notesData.length }}</span>
                      <span class="stat-label">Notes</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-value">{{ recentNotesCount }}</span>
                      <span class="stat-label">Recent</span>
                    </div>
                  </div>
                  <div class="notes-list">
                    <div v-for="note in notesData.slice(0, 3)" :key="note.id" class="note-item">
                      <span class="note-title">{{ note.title }}</span>
                      <span class="note-date">{{ formatTime(new Date(note.updated_at)) }}</span>
                    </div>
                    <div v-if="notesData.length > 3" class="more-notes">
                      +{{ notesData.length - 3 }} more notes
                    </div>
                  </div>
                </div>
                <div v-else class="no-data">
                  <span class="no-data-icon">📝</span>
                  <span class="no-data-text">No notes available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Notification -->
      <div v-if="notification" class="notification" :class="notification.type">
        <div class="notification-content">
          <span class="notification-icon">{{ notification.type === 'success' ? '✅' : '❌' }}</span>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
        <button class="notification-close" @click="closeNotification">×</button>
      </div>
    </div>
  </WorkspaceErrorBoundary>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ProjectOutlineApiService } from '../services/ProjectOutlineApiService'
import { RequirementsApiService } from '../services/RequirementsApiService'
import { ADRApiService } from '@/services/ADRApiService'
import WorkspaceErrorBoundary from './WorkspaceErrorBoundary.vue'
import WorkspaceLoadingOverlay from './WorkspaceLoadingOverlay.vue'
import WorkspaceSkeletonLoader from './WorkspaceSkeletonLoader.vue'
import useWorkspaceErrorHandling from '../composables/useWorkspaceErrorHandling'
import type { Project } from '../types/project'
import type { ProjectOutline } from '../types/projectOutline'
import type { RequirementsDocument, RequirementItem, SystemInfo, TeamInfo } from '../types/requirements'
import { TeamsApiService } from '@/services/TeamsApiService'
import { RequiredSystemApiService } from '@/services/SystemsApiService'

// Props interface
interface Props {
  project: Project
  theme: string
}

// Props
const props = defineProps<Props>()

// Error handling and loading
const errorHandling = useWorkspaceErrorHandling({
  workspaceName: 'Project Overview',
  componentName: 'ProjectOverviewWorkspace',
  maxRetries: 3,
  showNotifications: true,
  autoRetry: false,
  onError: (error, context) => {
    console.error('Project Overview error:', error, context)
  },
  onRetry: (attempt) => {
    console.log(`Project Overview retry attempt ${attempt}`)
  },
  onRecover: async () => {
    await loadAllData()
  }
})

// Core state
const lastUpdated = ref<Date | null>(null)

// Project outline state
const projectOutline = ref<ProjectOutline | null>(null)
const projectOutlineLoading = ref(false)
const projectOutlineError = ref<string | null>(null)

// Requirements state
const requirementsDocument = ref<RequirementsDocument | null>(null)
const requirementsSummary = ref<any>(null)
const requirementsLoading = ref(false)
const requirementsError = ref<string | null>(null)

// Teams state
const teamsData = ref<TeamInfo[]>([])
const teamsLoading = ref(false)
const teamsError = ref<string | null>(null)

// Systems state
const systemsData = ref<SystemInfo[]>([])
const systemsLoading = ref(false)
const systemsError = ref<string | null>(null)

// ADRs state (placeholder for now since API service doesn't exist yet)
const adrsData = ref<any[]>([])
const adrsLoading = ref(false)
const adrsError = ref<string | null>(null)

// Notes state (placeholder for now since API service doesn't exist yet)
const notesData = ref<any[]>([])
const notesLoading = ref(false)
const notesError = ref<string | null>(null)

// Notification state
const notification = ref<{
  type: 'success' | 'error'
  message: string
} | null>(null)

// Auto-refresh timer
let refreshTimer: number | null = null
const refreshInterval = 300000 // 5 minutes

// Computed properties
const hasAnyData = computed(() => {
  return projectOutline.value ||
    requirementsDocument.value ||
    teamsData.value.length > 0 ||
    systemsData.value.length > 0 ||
    adrsData.value.length > 0 ||
    notesData.value.length > 0
})

// Solution Outline computed properties
const solutionOutlineStatusClass = computed(() => {
  if (projectOutlineLoading.value) return 'loading'
  if (projectOutlineError.value) return 'error'
  if (!projectOutline.value) return 'empty'
  return projectOutline.value.status
})

const solutionOutlineStatusText = computed(() => {
  if (projectOutlineLoading.value) return 'Loading...'
  if (projectOutlineError.value) return 'Error'
  if (!projectOutline.value) return 'No Data'
  return capitalizeFirst(projectOutline.value.status)
})

// Requirements computed properties
const requirementsStatusClass = computed(() => {
  if (requirementsLoading.value) return 'loading'
  if (requirementsError.value) return 'error'
  if (!requirementsDocument.value) return 'empty'
  return requirementsDocument.value.status
})

const requirementsStatusText = computed(() => {
  if (requirementsLoading.value) return 'Loading...'
  if (requirementsError.value) return 'Error'
  if (!requirementsDocument.value) return 'No Data'
  return capitalizeFirst(requirementsDocument.value.status)
})

// Teams computed properties
const teamsStatusClass = computed(() => {
  if (teamsLoading.value) return 'loading'
  if (teamsError.value) return 'error'
  if (teamsData.value.length === 0) return 'empty'
  return 'active'
})

const teamsStatusText = computed(() => {
  if (teamsLoading.value) return 'Loading...'
  if (teamsError.value) return 'Error'
  if (teamsData.value.length === 0) return 'No Teams'
  return `${teamsData.value.length} Teams`
})

const totalTeamMembers = computed(() => {
  return teamsData.value.reduce((total, team) => total + (team.members?.length || 0), 0)
})

// Systems computed properties
const systemsStatusClass = computed(() => {
  if (systemsLoading.value) return 'loading'
  if (systemsError.value) return 'error'
  if (systemsData.value.length === 0) return 'empty'
  return 'active'
})

const systemsStatusText = computed(() => {
  if (systemsLoading.value) return 'Loading...'
  if (systemsError.value) return 'Error'
  if (systemsData.value.length === 0) return 'No Systems'
  return `${systemsData.value.length} Systems`
})

const internalSystemsCount = computed(() => {
  return systemsData.value.filter(system => system.type === 'internal').length
})

const externalSystemsCount = computed(() => {
  return systemsData.value.filter(system => system.type === 'external').length
})

// ADRs computed properties
const adrsStatusClass = computed(() => {
  if (adrsLoading.value) return 'loading'
  if (adrsError.value) return 'error'
  if (adrsData.value.length === 0) return 'empty'
  return 'active'
})

const adrsStatusText = computed(() => {
  if (adrsLoading.value) return 'Loading...'
  if (adrsError.value) return 'Error'
  if (adrsData.value.length === 0) return 'No ADRs'
  return `${adrsData.value.length} ADRs`
})

const acceptedADRsCount = computed(() => {
  return adrsData.value.filter(adr => adr.status === 'accepted').length
})

const proposedADRsCount = computed(() => {
  return adrsData.value.filter(adr => adr.status === 'proposed').length
})

// Notes computed properties
const notesStatusClass = computed(() => {
  if (notesLoading.value) return 'loading'
  if (notesError.value) return 'error'
  if (notesData.value.length === 0) return 'empty'
  return 'active'
})

const notesStatusText = computed(() => {
  if (notesLoading.value) return 'Loading...'
  if (notesError.value) return 'Error'
  if (notesData.value.length === 0) return 'No Notes'
  return `${notesData.value.length} Notes`
})

const recentNotesCount = computed(() => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  return notesData.value.filter(note => new Date(note.updated_at) > oneWeekAgo).length
})

// Lifecycle
onMounted(async () => {
  await loadAllData()
  setupAutoRefresh()
})

onBeforeUnmount(() => {
  cleanupAutoRefresh()
})

// Methods
async function loadAllData() {
  if (!props.project?.id) {
    console.warn('Cannot load project overview: project ID is missing')
    return
  }

  await errorHandling.withLoadingAndErrorHandling(
    async () => {
      // Add loading details for each data source
      errorHandling.addLoadingDetail('Loading project outline', 'loading')
      errorHandling.addLoadingDetail('Loading requirements summary', 'pending')
      errorHandling.addLoadingDetail('Loading teams data', 'pending')
      errorHandling.addLoadingDetail('Loading systems data', 'pending')
      errorHandling.addLoadingDetail('Loading ADRs', 'pending')
      errorHandling.addLoadingDetail('Loading notes', 'pending')

      // Load all data sources in parallel with progress tracking
      const results = await Promise.allSettled([
        loadProjectOutline().then(() => errorHandling.updateLoadingDetail(0, 'success')),
        loadRequirementsSummary().then(() => errorHandling.updateLoadingDetail(1, 'success')),
        loadTeamsData().then(() => errorHandling.updateLoadingDetail(2, 'success')),
        loadSystemsData().then(() => errorHandling.updateLoadingDetail(3, 'success')),
        loadADRsData().then(() => errorHandling.updateLoadingDetail(4, 'success')),
        loadNotesData().then(() => errorHandling.updateLoadingDetail(5, 'success'))
      ])

      // Check for any failures and mark them as errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errorHandling.updateLoadingDetail(index, 'error')
        }
      })

      lastUpdated.value = new Date()
      console.log('Project overview data loaded successfully')
    },
    'Loading Project Overview',
    'load_all_data'
  )
}

async function loadProjectOutline() {
  if (!props.project?.id) return

  await errorHandling.withErrorHandling(
    async () => {
      projectOutlineLoading.value = true
      projectOutlineError.value = null

      const outline = await ProjectOutlineApiService.getProjectOutline(props.project.id)
      projectOutline.value = outline
      console.log('Project outline loaded:', outline)
    },
    'load_project_outline',
    { section: 'project_outline' }
  ).finally(() => {
    projectOutlineLoading.value = false
  })
}

async function loadRequirementsSummary() {
  if (!props.project?.id) return

  requirementsLoading.value = true
  requirementsError.value = null

  try {
    // Load both the document and summary
    const [document, summary] = await Promise.allSettled([
      RequirementsApiService.getLatestRequirements(props.project.id),
      RequirementsApiService.getRequirementItemsSummary(props.project.id)
    ])

    if (document.status === 'fulfilled') {
      requirementsDocument.value = document.value
    }

    if (summary.status === 'fulfilled') {
      requirementsSummary.value = summary.value
    }

    console.log('Requirements data loaded:', { document: requirementsDocument.value, summary: requirementsSummary.value })
  } catch (error: any) {
    console.error('Failed to load requirements data:', error)
    requirementsError.value = error.message || 'Failed to load requirements data'

    if (!isLoading.value) {
      showNotification('error', 'Failed to load requirements data')
    }
  } finally {
    requirementsLoading.value = false
  }
}

async function loadTeamsData() {
  teamsLoading.value = true
  teamsError.value = null

  try {
    // For now, use sample data since teams API service doesn't exist yet
    // This will be replaced with actual API call when teams service is implemented
    // await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    const teams = await TeamsApiService.listTeams(props.project.id)


    teamsData.value  = teams


    // teamsData.value = [
    //   {
    //     id: '1',
    //     name: 'Frontend Team',
    //     role: 'Development',
    //     members: ['Alice Johnson', 'Bob Smith'],
    //     responsibilities: ['UI/UX Implementation', 'Client-side Logic']
    //   },
    //   {
    //     id: '2',
    //     name: 'Backend Team',
    //     role: 'Development',
    //     members: ['Charlie Brown', 'Diana Prince'],
    //     responsibilities: ['API Development', 'Database Design']
    //   },
    //   {
    //     id: '3',
    //     name: 'QA Team',
    //     role: 'Quality Assurance',
    //     members: ['Eve Wilson'],
    //     responsibilities: ['Testing', 'Quality Control']
    //   }
    // ]

    console.log('Teams data loaded:', teamsData.value)
  } catch (error: any) {
    console.error('Failed to load teams data:', error)
    teamsError.value = error.message || 'Failed to load teams data'

    if (!isLoading.value) {
      showNotification('error', 'Failed to load teams data')
    }
  } finally {
    teamsLoading.value = false
  }
}

async function loadSystemsData() {
  systemsLoading.value = true
  systemsError.value = null

  try {
    // For now, use sample data since systems API service doesn't exist yet
    // This will be replaced with actual API call when systems service is implemented
    // await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    const systems = await RequiredSystemApiService.listRequiredSystems(props.project.id)


    systemsData.value  = systems
    // .data.map(r => ({
    //   id: String(r.id),
    //   name: r.name,
    //   description: r.description,
    //   type: (r.system_type ?? '').toLowerCase(),
    //   dependencies: r.dependencies,
    //   // prefer updated_at for recency, fall back to created_at
    //   created_at: r.updated_at || r.created_at,
    // }))

    // systemsData.value = [
    //   {
    //     id: '1',
    //     name: 'Authentication Service',
    //     description: 'Handles user authentication and authorization',
    //     type: 'internal',
    //     dependencies: ['Database', 'Email Service']
    //   },
    //   {
    //     id: '2',
    //     name: 'Payment Gateway',
    //     description: 'External payment processing system',
    //     type: 'external',
    //     dependencies: []
    //   },
    //   {
    //     id: '3',
    //     name: 'Notification Service',
    //     description: 'Handles email and push notifications',
    //     type: 'internal',
    //     dependencies: ['Email Service', 'Push Service']
    //   },
    //   {
    //     id: '4',
    //     name: 'Third-party Analytics',
    //     description: 'External analytics and reporting service',
    //     type: 'external',
    //     dependencies: []
    //   }
    // ]

    console.log('Systems data loaded:', systemsData.value)
  } catch (error: any) {
    console.error('Failed to load systems data:', error)
    systemsError.value = error.message || 'Failed to load systems data'

    if (!isLoading.value) {
      showNotification('error', 'Failed to load systems data')
    }
  } finally {
    systemsLoading.value = false
  }
}

async function loadADRsData() {
  adrsLoading.value = true
  adrsError.value = null

  try {
    // For now, use sample data since ADR API service doesn't exist yet
    // This will be replaced with actual API call when ADR service is implemented
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
    const adrs = await ADRApiService.listADRs(props.project.id)


    adrsData.value = adrs.data.map(r => ({
      id: String(r.id),
      title: r.title,
      status: (r.status ?? '').toLowerCase(),
      // prefer updated_at for recency, fall back to created_at
      created_at: r.updated_at || r.created_at,
      author: r.author ?? '—'
    }))


    // adrsData.value = [
    //   {
    //     id: '1',
    //     title: 'Use React for Frontend Framework',
    //     status: 'accepted',
    //     created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    //     author: 'Tech Lead'
    //   },
    //   {
    //     id: '2',
    //     title: 'Adopt Microservices Architecture',
    //     status: 'proposed',
    //     created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    //     author: 'Solution Architect'
    //   },
    //   {
    //     id: '3',
    //     title: 'Use PostgreSQL as Primary Database',
    //     status: 'accepted',
    //     created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    //     author: 'Database Architect'
    //   }
    // ]

    console.log('ADRs data loaded:', adrsData.value)
  } catch (error: any) {
    console.error('Failed to load ADRs data:', error)
    adrsError.value = error.message || 'Failed to load ADRs data'

    if (!isLoading.value) {
      showNotification('error', 'Failed to load ADRs data')
    }
  } finally {
    adrsLoading.value = false
  }
}

async function loadNotesData() {
  notesLoading.value = true
  notesError.value = null

  try {
    // For now, use sample data since notes API service doesn't exist yet
    // This will be replaced with actual API call when notes service is implemented
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call

    notesData.value = [
      {
        id: '1',
        title: 'Project Kickoff Meeting Notes',
        content: 'Key decisions and action items from kickoff meeting',
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        author: 'Project Manager'
      },
      {
        id: '2',
        title: 'Technical Architecture Discussion',
        content: 'Notes from architecture review session',
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        author: 'Solution Architect'
      },
      {
        id: '3',
        title: 'Client Feedback Summary',
        content: 'Summary of client feedback on initial mockups',
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        author: 'UX Designer'
      }
    ]

    console.log('Notes data loaded:', notesData.value)
  } catch (error: any) {
    console.error('Failed to load notes data:', error)
    notesError.value = error.message || 'Failed to load notes data'

    if (!isLoading.value) {
      showNotification('error', 'Failed to load notes data')
    }
  } finally {
    notesLoading.value = false
  }
}

async function refreshAllData() {
  await loadAllData()
  showNotification('success', 'Project overview data refreshed successfully')
}

async function retryLoadData() {
  if (retryCount.value >= maxRetries) {
    showNotification('error', 'Maximum retry attempts reached. Please refresh the page.')
    return
  }

  retryCount.value++
  console.log(`Retrying data load (attempt ${retryCount.value}/${maxRetries})`)

  await loadAllData()
}

function setupAutoRefresh() {
  refreshTimer = window.setInterval(async () => {
    if (!document.hidden) { // Only refresh if page is visible
      await loadAllData()
    }
  }, refreshInterval)
}

function cleanupAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }

  // Auto-hide success notifications after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (notification.value?.type === 'success') {
        notification.value = null
      }
    }, 3000)
  }
}

function closeNotification() {
  notification.value = null
}

function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function capitalizeFirst(str: string): string {
  if (str != undefined)
    return str.charAt(0).toUpperCase() + str.slice(1)
  return ""
}

// Error handling methods
function handleErrorRetry() {
  errorHandling.clearError()
  loadAllData()
}

function handleWorkspaceReset() {
  errorHandling.resetWorkspace()
  // Clear all component state
  projectOutline.value = null
  requirementsDocument.value = null
  requirementsSummary.value = null
  teamsData.value = []
  systemsData.value = []
  adrsData.value = []
  notesData.value = []
  lastUpdated.value = null
}

function handleClearData() {
  // Clear component-specific data
  projectOutline.value = null
  requirementsDocument.value = null
  requirementsSummary.value = null
  teamsData.value = []
  systemsData.value = []
  adrsData.value = []
  notesData.value = []
  lastUpdated.value = null
}

function handleLoadingTimeout() {
  console.warn('Project overview loading timed out')
  errorHandling.handleError(
    new Error('Loading timeout: Project overview data took too long to load'),
    'loading_timeout'
  )
}
</script>

<style scoped>
/* Project Overview Workspace Layout */
.project-overview-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  overflow: hidden;
}

/* Header */
.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e1e4e8;
  background-color: #f8f9fa;
  flex-shrink: 0;
}

.workspace-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #24292f;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #0969da;
  color: #ffffff;
  border: 1px solid #0969da;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #0860ca;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn.loading {
  background-color: #656d76;
  border-color: #656d76;
}

.last-updated {
  font-size: 0.75rem;
  color: #656d76;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
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

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-content {
  text-align: center;
}

.loading-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: #24292f;
}

.loading-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: #656d76;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  color: #656d76;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-content {
  max-width: 400px;
}

.error-title {
  margin: 0 0 0.5rem 0;
  color: #24292f;
  font-size: 1.25rem;
  font-weight: 500;
}

.error-message {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #0969da;
  color: #ffffff;
  border: 1px solid #0969da;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover:not(:disabled) {
  background-color: #0860ca;
}

.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-btn.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.retry-info {
  margin: 0;
  font-size: 0.75rem;
  color: #656d76;
}

/* Dashboard Content */
.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* Status Cards Grid */
.status-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Status Card */
.status-card {
  background-color: #ffffff;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.status-card:hover {
  border-color: #d1d9e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e1e4e8;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #24292f;
}

.card-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.card-status.draft {
  background-color: #fff8dc;
  color: #b08800;
}

.card-status.active,
.card-status.published {
  background-color: #dcfce7;
  color: #166534;
}

.card-status.archived {
  background-color: #f3f4f6;
  color: #6b7280;
}

.card-status.loading {
  background-color: #e0f2fe;
  color: #0369a1;
}

.card-status.error {
  background-color: #fee2e2;
  color: #dc2626;
}

.card-status.empty {
  background-color: #f9fafb;
  color: #9ca3af;
}

.card-content {
  padding: 1.25rem;
  min-height: 120px;
}

/* Card Loading State */
.card-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #656d76;
  font-size: 0.875rem;
}

/* Card Error State */
.card-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.card-error .error-icon {
  font-size: 1rem;
}

.card-error .error-text {
  flex: 1;
}

/* No Data State */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #9ca3af;
  height: 80px;
}

.no-data-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.no-data-text {
  font-size: 0.875rem;
}

/* Solution Outline Info */
.outline-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-info,
.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-label,
.status-label {
  font-size: 0.875rem;
  color: #656d76;
  font-weight: 500;
}

.version-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0969da;
  background-color: #dbeafe;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status-value {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: capitalize;
}

.status-value.draft {
  background-color: #fff8dc;
  color: #b08800;
}

.status-value.active {
  background-color: #dcfce7;
  color: #166534;
}

.status-value.archived {
  background-color: #f3f4f6;
  color: #6b7280;
}

.last-updated {
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  margin-top: 0.5rem;
}

/* Requirements Info */
.requirements-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0969da;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #656d76;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-top: 0.25rem;
}

.document-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e1e4e8;
}

/* Teams Info */
.teams-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.teams-summary {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.team-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.team-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #24292f;
}

.team-role {
  font-size: 0.75rem;
  color: #656d76;
  background-color: #e1e4e8;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.more-teams,
.more-systems,
.more-adrs,
.more-notes {
  font-size: 0.75rem;
  color: #656d76;
  text-align: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-top: 0.25rem;
}

/* Systems Info */
.systems-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.systems-summary {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.systems-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.system-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.system-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #24292f;
}

.system-type {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  text-transform: capitalize;
}

.system-type.internal {
  background-color: #dcfce7;
  color: #166534;
}

.system-type.external {
  background-color: #fef3c7;
  color: #d97706;
}

.system-type.integration {
  background-color: #e0f2fe;
  color: #0369a1;
}

/* ADRs Info */
.adrs-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.adrs-summary {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.adrs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.adr-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.adr-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #24292f;
  flex: 1;
  margin-right: 0.5rem;
}

.adr-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  text-transform: capitalize;
}

.adr-status.accepted {
  background-color: #dcfce7;
  color: #166534;
}

.adr-status.proposed {
  background-color: #fef3c7;
  color: #d97706;
}

.adr-status.deprecated {
  background-color: #fee2e2;
  color: #dc2626;
}

.adr-status.superseded {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* Notes Info */
.notes-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notes-summary {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.note-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.note-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #24292f;
  flex: 1;
  margin-right: 0.5rem;
}

.note-date {
  font-size: 0.75rem;
  color: #656d76;
}

/* Spinner */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Notification */
.notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-width: 400px;
}

.notification.success {
  background-color: #dcfce7;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.notification.error {
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.notification-icon {
  font-size: 1rem;
}

.notification-message {
  font-size: 0.875rem;
  font-weight: 500;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.notification-close:hover {
  opacity: 1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }

  .status-cards-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .workspace-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .summary-stats,
  .teams-summary,
  .systems-summary,
  .adrs-summary,
  .notes-summary {
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .notification {
    top: auto;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .status-cards-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    padding: 0.75rem 1rem;
  }

  .card-content {
    padding: 1rem;
    min-height: 100px;
  }

  .team-item,
  .system-item,
  .adr-item,
  .note-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>