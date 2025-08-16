/**
 * ADR Search and Filtering Composable
 * Provides advanced search and filtering capabilities for ADRs
 * Requirements: 9.5, 9.6
 */

import { ref, computed, watch } from 'vue'
import type { ADR, ADRSearchResult, ADRSearchMatch, ADRFilterConfig } from '../types/adr'

// Search configuration interface
export interface ADRSearchConfig {
  query: string
  fields: string[]
  fuzzySearch: boolean
  caseSensitive: boolean
  wholeWords: boolean
  maxResults: number
}

// Default configurations
const DEFAULT_FILTER_CONFIG: ADRFilterConfig = {
  status: 'all',
  tags: [],
  author: ''
}

const DEFAULT_SEARCH_CONFIG: ADRSearchConfig = {
  query: '',
  fields: ['title', 'context', 'decision', 'consequences', 'alternatives'],
  fuzzySearch: false,
  caseSensitive: false,
  wholeWords: false,
  maxResults: 50
}

/**
 * ADR search and filtering composable
 * Requirements: 9.5, 9.6
 */
export function useADRSearch() {
  // Reactive state
  const searchConfig = ref<ADRSearchConfig>({ ...DEFAULT_SEARCH_CONFIG })
  const filterConfig = ref<ADRFilterConfig>({ ...DEFAULT_FILTER_CONFIG })
  const isSearching = ref(false)
  const searchResults = ref<ADRSearchResult[]>([])
  const searchHistory = ref<string[]>([])
  const filterHistory = ref<ADRFilterConfig[]>([])

  // Computed properties
  const hasActiveFilters = computed(() => {
    const filters = filterConfig.value
    return (
      filters.status !== 'all' ||
      filters.tags.length > 0 ||
      filters.author !== '' ||
      filters.dateRange !== undefined
    )
  })

  const hasActiveSearch = computed(() => {
    return searchConfig.value.query.trim().length > 0
  })

  const availableTags = computed(() => {
    // This would be populated from the ADRs data
    return [] as string[]
  })

  const availableAuthors = computed(() => {
    // This would be populated from the ADRs data
    return [] as string[]
  })

  // Search methods
  const performSearch = async (adrs: ADR[] = []): Promise<ADRSearchResult[]> => {
    if (!hasActiveSearch.value) {
      return []
    }

    isSearching.value = true
    const results: ADRSearchResult[] = []

    try {
      const query = searchConfig.value.query.toLowerCase()
      const fields = searchConfig.value.fields

      for (const adr of adrs) {
        const matches: ADRSearchMatch[] = []
        let totalScore = 0

        // Search in specified fields
        for (const field of fields) {
          const fieldValue = getFieldValue(adr, field)
          if (fieldValue) {
            const match = findMatches(fieldValue, query, field)
            if (match) {
              matches.push(match)
              totalScore += calculateFieldScore(field, match)
            }
          }
        }

        // Search in tags
        if (adr.tags && adr.tags.length > 0) {
          for (const tag of adr.tags) {
            const match = findMatches(tag, query, 'tags')
            if (match) {
              matches.push(match)
              totalScore += calculateFieldScore('tags', match)
            }
          }
        }

        // Search in author
        if (adr.author) {
          const match = findMatches(adr.author, query, 'author')
          if (match) {
            matches.push(match)
            totalScore += calculateFieldScore('author', match)
          }
        }

        if (matches.length > 0) {
          results.push({
            adr,
            score: totalScore,
            matches
          })
        }
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

  // Filter methods
  const applyFilters = (adrs: ADR[]): ADR[] => {
    const filters = filterConfig.value
    
    return adrs.filter(adr => {
      // Status filter
      if (filters.status !== 'all' && adr.status !== filters.status) {
        return false
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          adr.tags.some(adrTag => 
            adrTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
        if (!hasMatchingTag) {
          return false
        }
      }

      // Author filter
      if (filters.author && !adr.author.toLowerCase().includes(filters.author.toLowerCase())) {
        return false
      }

      // Date range filter
      if (filters.dateRange) {
        const adrDate = new Date(adr.created_at)
        if (adrDate < filters.dateRange.start || adrDate > filters.dateRange.end) {
          return false
        }
      }

      return true
    })
  }

  // Utility methods
  const getFieldValue = (adr: ADR, field: string): string => {
    const value = (adr as any)[field]
    if (typeof value === 'string') {
      return value
    } else if (Array.isArray(value)) {
      return value.join(' ')
    } else if (value !== null && value !== undefined) {
      return String(value)
    }
    return ''
  }

  const findMatches = (text: string, query: string, field: string): ADRSearchMatch | null => {
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

  const calculateFieldScore = (field: string, match: ADRSearchMatch): number => {
    // Base score
    let score = 10

    // Field importance multiplier
    const fieldWeights: Record<string, number> = {
      title: 3,
      decision: 2.5,
      context: 2,
      consequences: 2,
      alternatives: 1.5,
      tags: 2,
      author: 1
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

  const addToFilterHistory = (config: ADRFilterConfig) => {
    filterHistory.value.unshift({ ...config })
    // Keep only last 5 filter configurations
    if (filterHistory.value.length > 5) {
      filterHistory.value = filterHistory.value.slice(0, 5)
    }
  }

  // State management methods
  const updateSearchConfig = (updates: Partial<ADRSearchConfig>) => {
    searchConfig.value = { ...searchConfig.value, ...updates }
  }

  const updateFilterConfig = (updates: Partial<ADRFilterConfig>) => {
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

  // Sorting methods
  const sortADRs = (adrs: ADR[], sortBy: 'date' | 'title' | 'status', sortOrder: 'asc' | 'desc' = 'desc'): ADR[] => {
    const sorted = [...adrs].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status':
          const statusOrder = { 'proposed': 0, 'accepted': 1, 'deprecated': 2, 'superseded': 3 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  // Persistence methods
  const saveState = () => {
    try {
      const stateData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        searchConfig: searchConfig.value,
        filterConfig: filterConfig.value,
        searchHistory: searchHistory.value,
        filterHistory: filterHistory.value
      }
      
      localStorage.setItem('adrSearch_state', JSON.stringify(stateData))
    } catch (error) {
      console.warn('Failed to save ADR search state to localStorage:', error)
    }
  }

  const loadState = () => {
    try {
      const savedState = localStorage.getItem('adrSearch_state')
      if (savedState) {
        const stateData = JSON.parse(savedState)
        
        if (stateData.version && stateData.searchConfig && stateData.filterConfig) {
          searchConfig.value = { ...DEFAULT_SEARCH_CONFIG, ...stateData.searchConfig }
          filterConfig.value = { ...DEFAULT_FILTER_CONFIG, ...stateData.filterConfig }
          searchHistory.value = stateData.searchHistory || []
          filterHistory.value = stateData.filterHistory || []
        }
      }
    } catch (error) {
      console.warn('Failed to load ADR search state from localStorage:', error)
      // Reset to defaults on error
      searchConfig.value = { ...DEFAULT_SEARCH_CONFIG }
      filterConfig.value = { ...DEFAULT_FILTER_CONFIG }
      searchHistory.value = []
      filterHistory.value = []
    }
  }

  const clearPersistedState = () => {
    try {
      localStorage.removeItem('adrSearch_state')
    } catch (error) {
      console.warn('Failed to clear persisted ADR search state:', error)
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
    availableTags,
    availableAuthors,

    // Methods
    performSearch,
    applyFilters,
    sortADRs,
    updateSearchConfig,
    updateFilterConfig,
    resetSearch,
    resetFilters,
    resetAll,
    saveState,
    loadState,
    clearPersistedState,

    // Utility methods for external use
    highlightMatch,
    getFieldValue
  }
}

export default useADRSearch