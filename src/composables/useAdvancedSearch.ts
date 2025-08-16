import { ref, computed, watch, nextTick } from 'vue'
import type { RequirementItem, SystemInfo, TeamInfo } from '../types/requirements'

// Search result interface with highlighting
export interface SearchResult<T = any> {
  item: T
  score: number
  matches: SearchMatch[]
  category: 'requirements' | 'systems' | 'teams'
}

export interface SearchMatch {
  field: string
  value: string
  highlightedValue: string
  startIndex: number
  endIndex: number
}

// Filter configuration interface
export interface FilterConfig {
  requirements: {
    status: 'all' | 'new' | 'accepted' | 'rejected'
    priority: 'all' | 'low' | 'medium' | 'high' | 'critical'
    source: 'all' | 'manual' | 'pdf'
    dateRange?: {
      start: Date
      end: Date
    }
  }
  systems: {
    type: 'all' | 'internal' | 'external' | 'integration'
    hasDependencies: 'all' | 'yes' | 'no'
  }
  teams: {
    role: 'all' | string
    hasMembers: 'all' | 'yes' | 'no'
  }
}

// Search configuration interface
export interface SearchConfig {
  query: string
  categories: ('requirements' | 'systems' | 'teams')[]
  fields: {
    requirements: string[]
    systems: string[]
    teams: string[]
  }
  fuzzySearch: boolean
  caseSensitive: boolean
  wholeWords: boolean
  maxResults: number
}

// Default configurations
const DEFAULT_FILTER_CONFIG: FilterConfig = {
  requirements: {
    status: 'all',
    priority: 'all',
    source: 'all'
  },
  systems: {
    type: 'all',
    hasDependencies: 'all'
  },
  teams: {
    role: 'all',
    hasMembers: 'all'
  }
}

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  query: '',
  categories: ['requirements', 'systems', 'teams'],
  fields: {
    requirements: ['title', 'description'],
    systems: ['name', 'description'],
    teams: ['name', 'role', 'responsibilities']
  },
  fuzzySearch: false,
  caseSensitive: false,
  wholeWords: false,
  maxResults: 100
}

/**
 * Advanced search and filtering composable
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function useAdvancedSearch() {
  // Reactive state
  const searchConfig = ref<SearchConfig>({ ...DEFAULT_SEARCH_CONFIG })
  const filterConfig = ref<FilterConfig>({ ...DEFAULT_FILTER_CONFIG })
  const isSearching = ref(false)
  const searchResults = ref<SearchResult[]>([])
  const searchHistory = ref<string[]>([])
  const filterHistory = ref<FilterConfig[]>([])

  // Computed properties
  const hasActiveFilters = computed(() => {
    const filters = filterConfig.value
    return (
      filters.requirements.status !== 'all' ||
      filters.requirements.priority !== 'all' ||
      filters.requirements.source !== 'all' ||
      filters.requirements.dateRange !== undefined ||
      filters.systems.type !== 'all' ||
      filters.systems.hasDependencies !== 'all' ||
      filters.teams.role !== 'all' ||
      filters.teams.hasMembers !== 'all'
    )
  })

  const hasActiveSearch = computed(() => {
    return searchConfig.value.query.trim().length > 0
  })

  const resultsByCategory = computed(() => {
    const results = {
      requirements: [] as SearchResult<RequirementItem>[],
      systems: [] as SearchResult<SystemInfo>[],
      teams: [] as SearchResult<TeamInfo>[]
    }

    searchResults.value.forEach(result => {
      if (result.category === 'requirements') {
        results.requirements.push(result as SearchResult<RequirementItem>)
      } else if (result.category === 'systems') {
        results.systems.push(result as SearchResult<SystemInfo>)
      } else if (result.category === 'teams') {
        results.teams.push(result as SearchResult<TeamInfo>)
      }
    })

    return results
  })

  // Search methods
  const performSearch = async (
    requirements: RequirementItem[] = [],
    systems: SystemInfo[] = [],
    teams: TeamInfo[] = []
  ): Promise<SearchResult[]> => {
    if (!hasActiveSearch.value) {
      return []
    }

    isSearching.value = true
    const results: SearchResult[] = []

    try {
      // Search requirements
      if (searchConfig.value.categories.includes('requirements')) {
        const reqResults = await searchRequirements(requirements)
        results.push(...reqResults)
      }

      // Search systems
      if (searchConfig.value.categories.includes('systems')) {
        const sysResults = await searchSystems(systems)
        results.push(...sysResults)
      }

      // Search teams
      if (searchConfig.value.categories.includes('teams')) {
        const teamResults = await searchTeams(teams)
        results.push(...teamResults)
      }

      // Sort by relevance score
      results.sort((a, b) => b.score - a.score)

      // Limit results
      const limitedResults = results.slice(0, searchConfig.value.maxResults)
      
      searchResults.value = limitedResults
      
      // Add to search history
      addToSearchHistory(searchConfig.value.query)
      
      return limitedResults
    } finally {
      isSearching.value = false
    }
  }

  const searchRequirements = async (items: RequirementItem[]): Promise<SearchResult<RequirementItem>[]> => {
    const results: SearchResult<RequirementItem>[] = []
    const query = searchConfig.value.query.toLowerCase()
    const fields = searchConfig.value.fields.requirements

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0

      // Search in specified fields
      for (const field of fields) {
        const fieldValue = getFieldValue(item, field)
        if (fieldValue) {
          const match = findMatches(fieldValue, query, field)
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore(field, match)
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          item,
          score: totalScore,
          matches,
          category: 'requirements'
        })
      }
    }

    return results
  }

  const searchSystems = async (items: SystemInfo[]): Promise<SearchResult<SystemInfo>[]> => {
    const results: SearchResult<SystemInfo>[] = []
    const query = searchConfig.value.query.toLowerCase()
    const fields = searchConfig.value.fields.systems

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0

      for (const field of fields) {
        const fieldValue = getFieldValue(item, field)
        if (fieldValue) {
          const match = findMatches(fieldValue, query, field)
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore(field, match)
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          item,
          score: totalScore,
          matches,
          category: 'systems'
        })
      }
    }

    return results
  }

  const searchTeams = async (items: TeamInfo[]): Promise<SearchResult<TeamInfo>[]> => {
    const results: SearchResult<TeamInfo>[] = []
    const query = searchConfig.value.query.toLowerCase()
    const fields = searchConfig.value.fields.teams

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0

      for (const field of fields) {
        const fieldValue = getFieldValue(item, field)
        if (fieldValue) {
          const match = findMatches(fieldValue, query, field)
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore(field, match)
          }
        }
      }

      // Special handling for array fields like responsibilities and members
      if (fields.includes('responsibilities') && Array.isArray(item.responsibilities)) {
        for (const responsibility of item.responsibilities) {
          const match = findMatches(responsibility, query, 'responsibilities')
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore('responsibilities', match)
          }
        }
      }

      if (fields.includes('members') && Array.isArray(item.members)) {
        for (const member of item.members) {
          const match = findMatches(member, query, 'members')
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore('members', match)
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          item,
          score: totalScore,
          matches,
          category: 'teams'
        })
      }
    }

    return results
  }

  // Filter methods
  const applyFilters = <T>(
    items: T[],
    category: 'requirements' | 'systems' | 'teams'
  ): T[] => {
    if (category === 'requirements') {
      return filterRequirements(items as RequirementItem[]) as T[]
    } else if (category === 'systems') {
      return filterSystems(items as SystemInfo[]) as T[]
    } else if (category === 'teams') {
      return filterTeams(items as TeamInfo[]) as T[]
    }
    return items
  }

  const filterRequirements = (items: RequirementItem[]): RequirementItem[] => {
    const filters = filterConfig.value.requirements
    
    return items.filter(item => {
      // Status filter
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false
      }

      // Priority filter
      if (filters.priority !== 'all' && item.priority !== filters.priority) {
        return false
      }

      // Source filter
      if (filters.source !== 'all' && item.source !== filters.source) {
        return false
      }

      // Date range filter
      if (filters.dateRange) {
        const itemDate = new Date(item.created_at)
        if (itemDate < filters.dateRange.start || itemDate > filters.dateRange.end) {
          return false
        }
      }

      return true
    })
  }

  const filterSystems = (items: SystemInfo[]): SystemInfo[] => {
    const filters = filterConfig.value.systems
    
    return items.filter(item => {
      // Type filter
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false
      }

      // Dependencies filter
      if (filters.hasDependencies !== 'all') {
        const hasDeps = item.dependencies && item.dependencies.length > 0
        if (filters.hasDependencies === 'yes' && !hasDeps) {
          return false
        }
        if (filters.hasDependencies === 'no' && hasDeps) {
          return false
        }
      }

      return true
    })
  }

  const filterTeams = (items: TeamInfo[]): TeamInfo[] => {
    const filters = filterConfig.value.teams
    
    return items.filter(item => {
      // Role filter
      if (filters.role !== 'all' && item.role !== filters.role) {
        return false
      }

      // Members filter
      if (filters.hasMembers !== 'all') {
        const hasMembers = item.members && item.members.length > 0
        if (filters.hasMembers === 'yes' && !hasMembers) {
          return false
        }
        if (filters.hasMembers === 'no' && hasMembers) {
          return false
        }
      }

      return true
    })
  }

  // Utility methods
  const getFieldValue = (item: any, field: string): string => {
    const value = item[field]
    if (typeof value === 'string') {
      return value
    } else if (Array.isArray(value)) {
      return value.join(' ')
    } else if (value !== null && value !== undefined) {
      return String(value)
    }
    return ''
  }

  const findMatches = (text: string, query: string, field: string): SearchMatch | null => {
    const searchText = searchConfig.value.caseSensitive ? text : text.toLowerCase()
    const searchQuery = searchConfig.value.caseSensitive ? query : query.toLowerCase()

    let index = -1
    
    if (searchConfig.value.wholeWords) {
      const regex = new RegExp(`\\b${escapeRegExp(searchQuery)}\\b`, searchConfig.value.caseSensitive ? 'g' : 'gi')
      const match = regex.exec(searchText)
      if (match) {
        index = match.index
      }
    } else {
      index = searchText.indexOf(searchQuery)
    }

    if (index === -1) {
      return null
    }

    const startIndex = index
    const endIndex = index + searchQuery.length
    const highlightedValue = highlightMatch(text, startIndex, endIndex)

    return {
      field,
      value: text,
      highlightedValue,
      startIndex,
      endIndex
    }
  }

  const highlightMatch = (text: string, startIndex: number, endIndex: number): string => {
    const before = text.substring(0, startIndex)
    const match = text.substring(startIndex, endIndex)
    const after = text.substring(endIndex)
    return `${before}<mark class="search-highlight">${match}</mark>${after}`
  }

  const calculateFieldScore = (field: string, match: SearchMatch): number => {
    // Base score
    let score = 10

    // Field importance multiplier
    const fieldWeights: Record<string, number> = {
      title: 3,
      name: 3,
      description: 2,
      role: 2,
      responsibilities: 1.5,
      members: 1
    }

    score *= fieldWeights[field] || 1

    // Match position bonus (earlier matches score higher)
    const positionBonus = Math.max(0, 10 - (match.startIndex / 10))
    score += positionBonus

    // Match length bonus (longer matches score higher for exact matches)
    const lengthBonus = match.endIndex - match.startIndex
    score += lengthBonus * 0.1

    return score
  }

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // History management
  const addToSearchHistory = (query: string) => {
    const trimmedQuery = query.trim()
    if (trimmedQuery && !searchHistory.value.includes(trimmedQuery)) {
      searchHistory.value.unshift(trimmedQuery)
      // Keep only last 10 searches
      if (searchHistory.value.length > 10) {
        searchHistory.value = searchHistory.value.slice(0, 10)
      }
    }
  }

  const addToFilterHistory = (config: FilterConfig) => {
    filterHistory.value.unshift({ ...config })
    // Keep only last 5 filter configurations
    if (filterHistory.value.length > 5) {
      filterHistory.value = filterHistory.value.slice(0, 5)
    }
  }

  // State management methods
  const updateSearchConfig = (updates: Partial<SearchConfig>) => {
    searchConfig.value = { ...searchConfig.value, ...updates }
  }

  const updateFilterConfig = (updates: Partial<FilterConfig>) => {
    const oldConfig = { ...filterConfig.value }
    filterConfig.value = { ...filterConfig.value, ...updates }
    
    // Add to history if significantly different
    if (JSON.stringify(oldConfig) !== JSON.stringify(filterConfig.value)) {
      addToFilterHistory(oldConfig)
    }
  }

  const resetSearch = () => {
    searchConfig.value = { ...DEFAULT_SEARCH_CONFIG }
    searchResults.value = []
  }

  const resetFilters = () => {
    const oldConfig = { ...filterConfig.value }
    filterConfig.value = { ...DEFAULT_FILTER_CONFIG }
    addToFilterHistory(oldConfig)
  }

  const resetAll = () => {
    resetSearch()
    resetFilters()
  }

  // Enhanced persistence methods with versioning and validation
  const saveState = () => {
    try {
      const stateVersion = '1.0'
      const timestamp = new Date().toISOString()
      
      const stateData = {
        version: stateVersion,
        timestamp,
        searchConfig: searchConfig.value,
        filterConfig: filterConfig.value,
        searchHistory: searchHistory.value,
        filterHistory: filterHistory.value
      }
      
      localStorage.setItem('advancedSearch_state', JSON.stringify(stateData))
      
      // Also save individual items for backward compatibility
      localStorage.setItem('advancedSearch_searchConfig', JSON.stringify(searchConfig.value))
      localStorage.setItem('advancedSearch_filterConfig', JSON.stringify(filterConfig.value))
      localStorage.setItem('advancedSearch_searchHistory', JSON.stringify(searchHistory.value))
      localStorage.setItem('advancedSearch_filterHistory', JSON.stringify(filterHistory.value))
    } catch (error) {
      console.warn('Failed to save search state to localStorage:', error)
    }
  }

  const loadState = () => {
    try {
      // Try to load from new unified state first
      const unifiedState = localStorage.getItem('advancedSearch_state')
      if (unifiedState) {
        const stateData = JSON.parse(unifiedState)
        
        // Validate state version and structure
        if (stateData.version && stateData.searchConfig && stateData.filterConfig) {
          searchConfig.value = { ...DEFAULT_SEARCH_CONFIG, ...stateData.searchConfig }
          filterConfig.value = { ...DEFAULT_FILTER_CONFIG, ...stateData.filterConfig }
          searchHistory.value = stateData.searchHistory || []
          filterHistory.value = stateData.filterHistory || []
          return
        }
      }
      
      // Fallback to individual items for backward compatibility
      const savedSearchConfig = localStorage.getItem('advancedSearch_searchConfig')
      if (savedSearchConfig) {
        const parsed = JSON.parse(savedSearchConfig)
        searchConfig.value = { ...DEFAULT_SEARCH_CONFIG, ...parsed }
      }

      const savedFilterConfig = localStorage.getItem('advancedSearch_filterConfig')
      if (savedFilterConfig) {
        const parsed = JSON.parse(savedFilterConfig)
        filterConfig.value = { ...DEFAULT_FILTER_CONFIG, ...parsed }
      }

      const savedSearchHistory = localStorage.getItem('advancedSearch_searchHistory')
      if (savedSearchHistory) {
        searchHistory.value = JSON.parse(savedSearchHistory)
      }

      const savedFilterHistory = localStorage.getItem('advancedSearch_filterHistory')
      if (savedFilterHistory) {
        filterHistory.value = JSON.parse(savedFilterHistory)
      }
    } catch (error) {
      console.warn('Failed to load search state from localStorage:', error)
      // Reset to defaults on error
      searchConfig.value = { ...DEFAULT_SEARCH_CONFIG }
      filterConfig.value = { ...DEFAULT_FILTER_CONFIG }
      searchHistory.value = []
      filterHistory.value = []
    }
  }

  // Clear all persisted state
  const clearPersistedState = () => {
    try {
      localStorage.removeItem('advancedSearch_state')
      localStorage.removeItem('advancedSearch_searchConfig')
      localStorage.removeItem('advancedSearch_filterConfig')
      localStorage.removeItem('advancedSearch_searchHistory')
      localStorage.removeItem('advancedSearch_filterHistory')
    } catch (error) {
      console.warn('Failed to clear persisted search state:', error)
    }
  }

  // Export current state for backup/sharing
  const exportState = () => {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      searchConfig: searchConfig.value,
      filterConfig: filterConfig.value,
      searchHistory: searchHistory.value,
      filterHistory: filterHistory.value
    }
  }

  // Import state from backup/sharing
  const importState = (stateData: any) => {
    try {
      if (stateData.searchConfig) {
        searchConfig.value = { ...DEFAULT_SEARCH_CONFIG, ...stateData.searchConfig }
      }
      if (stateData.filterConfig) {
        filterConfig.value = { ...DEFAULT_FILTER_CONFIG, ...stateData.filterConfig }
      }
      if (stateData.searchHistory) {
        searchHistory.value = stateData.searchHistory
      }
      if (stateData.filterHistory) {
        filterHistory.value = stateData.filterHistory
      }
      saveState()
    } catch (error) {
      console.warn('Failed to import search state:', error)
      throw new Error('Invalid state data format')
    }
  }

  // Auto-save state changes
  watch([searchConfig, filterConfig, searchHistory, filterHistory], () => {
    saveState()
  }, { deep: true })

  // Initialize state
  loadState()

  return {
    // State
    searchConfig,
    filterConfig,
    isSearching,
    searchResults,
    searchHistory,
    filterHistory,

    // Computed
    hasActiveFilters,
    hasActiveSearch,
    resultsByCategory,

    // Methods
    performSearch,
    applyFilters,
    updateSearchConfig,
    updateFilterConfig,
    resetSearch,
    resetFilters,
    resetAll,
    saveState,
    loadState,
    clearPersistedState,
    exportState,
    importState,

    // Utility methods for external use
    highlightMatch,
    getFieldValue
  }
}

export default useAdvancedSearch