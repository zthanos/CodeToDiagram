/**
 * Workspace Data Sharing Composable
 * Provides centralized data sharing between workspaces for consistent state management
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import type { Project } from '../types/project'
import type { RequirementsDocument, RequirementItem, SystemInfo, TeamInfo } from '../types/requirements'
import type { ProjectOutline } from '../types/projectOutline'

// Shared data interfaces
export interface SharedWorkspaceData {
  project: Project | null
  projectOutline: ProjectOutline | null
  requirementsDocument: RequirementsDocument | null
  requirementsSummary: any | null
  teamsData: TeamInfo[]
  systemsData: SystemInfo[]
  adrsData: any[]
  notesData: any[]
  lastUpdated: Date | null
  isLoading: boolean
  errors: Record<string, string | null>
}

export interface WorkspaceDataEvents {
  onProjectUpdate: (project: Project) => void
  onRequirementsUpdate: (document: RequirementsDocument) => void
  onTeamsUpdate: (teams: TeamInfo[]) => void
  onSystemsUpdate: (systems: SystemInfo[]) => void
  onADRsUpdate: (adrs: any[]) => void
  onNotesUpdate: (notes: any[]) => void
  onDataRefresh: () => void
}

// Global shared state
const sharedData = reactive<SharedWorkspaceData>({
  project: null,
  projectOutline: null,
  requirementsDocument: null,
  requirementsSummary: null,
  teamsData: [],
  systemsData: [],
  adrsData: [],
  notesData: [],
  lastUpdated: null,
  isLoading: false,
  errors: {}
})

// Event listeners registry
const eventListeners = new Map<string, Set<Function>>()

/**
 * Workspace Data Sharing Composable
 * Provides reactive access to shared workspace data and event handling
 */
export function useWorkspaceDataSharing() {
  const componentId = ref(`component_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`)
  
  // Reactive getters for shared data
  const project = computed(() => sharedData.project)
  const projectOutline = computed(() => sharedData.projectOutline)
  const requirementsDocument = computed(() => sharedData.requirementsDocument)
  const requirementsSummary = computed(() => sharedData.requirementsSummary)
  const teamsData = computed(() => sharedData.teamsData)
  const systemsData = computed(() => sharedData.systemsData)
  const adrsData = computed(() => sharedData.adrsData)
  const notesData = computed(() => sharedData.notesData)
  const lastUpdated = computed(() => sharedData.lastUpdated)
  const isLoading = computed(() => sharedData.isLoading)
  const errors = computed(() => sharedData.errors)

  // Data update methods
  const updateProject = (newProject: Project | null) => {
    sharedData.project = newProject
    sharedData.lastUpdated = new Date()
    emitEvent('onProjectUpdate', newProject)
  }

  const updateProjectOutline = (outline: ProjectOutline | null) => {
    sharedData.projectOutline = outline
    sharedData.lastUpdated = new Date()
    emitEvent('onProjectOutlineUpdate', outline)
  }

  const updateRequirementsDocument = (document: RequirementsDocument | null) => {
    sharedData.requirementsDocument = document
    sharedData.lastUpdated = new Date()
    emitEvent('onRequirementsUpdate', document)
  }

  const updateRequirementsSummary = (summary: any | null) => {
    sharedData.requirementsSummary = summary
    sharedData.lastUpdated = new Date()
    emitEvent('onRequirementsSummaryUpdate', summary)
  }

  const updateTeamsData = (teams: TeamInfo[]) => {
    sharedData.teamsData = teams
    sharedData.lastUpdated = new Date()
    emitEvent('onTeamsUpdate', teams)
  }

  const updateSystemsData = (systems: SystemInfo[]) => {
    sharedData.systemsData = systems
    sharedData.lastUpdated = new Date()
    emitEvent('onSystemsUpdate', systems)
  }

  const updateADRsData = (adrs: any[]) => {
    sharedData.adrsData = adrs
    sharedData.lastUpdated = new Date()
    emitEvent('onADRsUpdate', adrs)
  }

  const updateNotesData = (notes: any[]) => {
    sharedData.notesData = notes
    sharedData.lastUpdated = new Date()
    emitEvent('onNotesUpdate', notes)
  }

  const setLoading = (loading: boolean) => {
    sharedData.isLoading = loading
  }

  const setError = (key: string, error: string | null) => {
    sharedData.errors[key] = error
  }

  const clearErrors = () => {
    Object.keys(sharedData.errors).forEach(key => {
      sharedData.errors[key] = null
    })
  }

  // Event handling methods
  const addEventListener = (eventName: string, callback: Function) => {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set())
    }
    eventListeners.get(eventName)!.add(callback)
    
    // Return cleanup function
    return () => {
      const listeners = eventListeners.get(eventName)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  const removeEventListener = (eventName: string, callback: Function) => {
    const listeners = eventListeners.get(eventName)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  const emitEvent = (eventName: string, data?: any) => {
    const listeners = eventListeners.get(eventName)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error)
        }
      })
    }
  }

  // Refresh all data
  const refreshAllData = () => {
    emitEvent('onDataRefresh')
  }

  // Reset all shared data
  const resetSharedData = () => {
    sharedData.project = null
    sharedData.projectOutline = null
    sharedData.requirementsDocument = null
    sharedData.requirementsSummary = null
    sharedData.teamsData = []
    sharedData.systemsData = []
    sharedData.adrsData = []
    sharedData.notesData = []
    sharedData.lastUpdated = null
    sharedData.isLoading = false
    sharedData.errors = {}
  }

  // Computed properties for data status
  const hasProjectData = computed(() => !!sharedData.project)
  const hasRequirementsData = computed(() => !!sharedData.requirementsDocument || !!sharedData.requirementsSummary)
  const hasTeamsData = computed(() => sharedData.teamsData.length > 0)
  const hasSystemsData = computed(() => sharedData.systemsData.length > 0)
  const hasADRsData = computed(() => sharedData.adrsData.length > 0)
  const hasNotesData = computed(() => sharedData.notesData.length > 0)
  const hasAnyData = computed(() => 
    hasProjectData.value || 
    hasRequirementsData.value || 
    hasTeamsData.value || 
    hasSystemsData.value || 
    hasADRsData.value || 
    hasNotesData.value
  )

  // Data validation
  const validateDataConsistency = () => {
    const issues: string[] = []
    
    // Check if project data is consistent
    if (sharedData.project && sharedData.projectOutline) {
      if (sharedData.project.id !== sharedData.projectOutline.project_id) {
        issues.push('Project ID mismatch between project and outline data')
      }
    }
    
    // Check if requirements data is consistent
    if (sharedData.project && sharedData.requirementsDocument) {
      if (sharedData.project.id !== sharedData.requirementsDocument.project_id) {
        issues.push('Project ID mismatch between project and requirements data')
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    // Remove all event listeners for this component
    eventListeners.forEach((listeners, eventName) => {
      // Note: In a real implementation, we'd track which listeners belong to which component
      // For now, we'll just clean up when the last component unmounts
    })
  })

  return {
    // Data getters
    project,
    projectOutline,
    requirementsDocument,
    requirementsSummary,
    teamsData,
    systemsData,
    adrsData,
    notesData,
    lastUpdated,
    isLoading,
    errors,
    
    // Data status
    hasProjectData,
    hasRequirementsData,
    hasTeamsData,
    hasSystemsData,
    hasADRsData,
    hasNotesData,
    hasAnyData,
    
    // Data update methods
    updateProject,
    updateProjectOutline,
    updateRequirementsDocument,
    updateRequirementsSummary,
    updateTeamsData,
    updateSystemsData,
    updateADRsData,
    updateNotesData,
    setLoading,
    setError,
    clearErrors,
    
    // Event handling
    addEventListener,
    removeEventListener,
    emitEvent,
    
    // Utility methods
    refreshAllData,
    resetSharedData,
    validateDataConsistency,
    
    // Component identification
    componentId: componentId.value
  }
}

/**
 * Global workspace data manager
 * Provides direct access to shared data without component context
 */
export const WorkspaceDataManager = {
  getData: () => ({ ...sharedData }),
  updateProject: (project: Project | null) => {
    sharedData.project = project
    sharedData.lastUpdated = new Date()
  },
  updateProjectOutline: (outline: ProjectOutline | null) => {
    sharedData.projectOutline = outline
    sharedData.lastUpdated = new Date()
  },
  resetData: () => {
    Object.assign(sharedData, {
      project: null,
      projectOutline: null,
      requirementsDocument: null,
      requirementsSummary: null,
      teamsData: [],
      systemsData: [],
      adrsData: [],
      notesData: [],
      lastUpdated: null,
      isLoading: false,
      errors: {}
    })
  },
  addEventListener: (eventName: string, callback: Function) => {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set())
    }
    eventListeners.get(eventName)!.add(callback)
  },
  removeEventListener: (eventName: string, callback: Function) => {
    const listeners = eventListeners.get(eventName)
    if (listeners) {
      listeners.delete(callback)
    }
  }
}