import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAdvancedSearch } from '../../composables/useAdvancedSearch'
import type { RequirementItem, SystemInfo, TeamInfo } from '../../types/requirements'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Sample test data
const sampleRequirements: RequirementItem[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure user login and registration functionality',
    status: 'new',
    priority: 'high',
    project_id: 'project-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    source: 'manual'
  },
  {
    id: '2',
    title: 'Payment Processing',
    description: 'Integrate payment gateway for secure transactions',
    status: 'accepted',
    priority: 'critical',
    project_id: 'project-1',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
    source: 'pdf'
  },
  {
    id: '3',
    title: 'User Profile Management',
    description: 'Allow users to manage their profile information',
    status: 'rejected',
    priority: 'medium',
    project_id: 'project-1',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
    source: 'manual'
  }
]

const sampleSystems: SystemInfo[] = [
  {
    id: '1',
    name: 'Authentication Service',
    description: 'Handles user authentication and authorization',
    type: 'internal',
    dependencies: ['Database', 'Email Service']
  },
  {
    id: '2',
    name: 'Payment Gateway',
    description: 'External payment processing system',
    type: 'external',
    dependencies: []
  }
]

const sampleTeams: TeamInfo[] = [
  {
    id: '1',
    name: 'Frontend Team',
    role: 'Development',
    members: ['Alice Johnson', 'Bob Smith'],
    responsibilities: ['UI/UX Implementation', 'Client-side Logic']
  },
  {
    id: '2',
    name: 'Backend Team',
    role: 'Development',
    members: ['Charlie Brown', 'Diana Prince'],
    responsibilities: ['API Development', 'Database Design']
  }
]

describe('useAdvancedSearch', () => {
  let searchComposable: ReturnType<typeof useAdvancedSearch>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    searchComposable = useAdvancedSearch()
  })

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(searchComposable.searchConfig.value.query).toBe('')
      expect(searchComposable.searchConfig.value.categories).toEqual(['requirements', 'systems', 'teams'])
      expect(searchComposable.searchConfig.value.fuzzySearch).toBe(false)
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(false)
      expect(searchComposable.searchConfig.value.wholeWords).toBe(false)
      expect(searchComposable.searchConfig.value.maxResults).toBe(100)
    })

    it('should initialize with default filter configuration', () => {
      expect(searchComposable.filterConfig.value.requirements.status).toBe('all')
      expect(searchComposable.filterConfig.value.requirements.priority).toBe('all')
      expect(searchComposable.filterConfig.value.requirements.source).toBe('all')
      expect(searchComposable.filterConfig.value.systems.type).toBe('all')
      expect(searchComposable.filterConfig.value.teams.role).toBe('all')
    })

    it('should load state from localStorage if available', () => {
      const savedSearchConfig = {
        query: 'test query',
        caseSensitive: true
      }
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'advancedSearch_searchConfig') {
          return JSON.stringify(savedSearchConfig)
        }
        return null
      })

      const newComposable = useAdvancedSearch()
      expect(newComposable.searchConfig.value.query).toBe('test query')
      expect(newComposable.searchConfig.value.caseSensitive).toBe(true)
    })
  })

  describe('search functionality', () => {
    it('should perform search on requirements', async () => {
      searchComposable.updateSearchConfig({ query: 'authentication' })
      
      const results = await searchComposable.performSearch(sampleRequirements, [], [])
      
      expect(results).toHaveLength(1)
      expect(results[0].item.title).toBe('User Authentication System')
      expect(results[0].category).toBe('requirements')
      expect(results[0].matches).toHaveLength(1)
      expect(results[0].matches[0].field).toBe('title')
    })

    it('should perform search on systems', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'payment',
        categories: ['systems']
      })
      
      const results = await searchComposable.performSearch([], sampleSystems, [])
      
      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('Payment Gateway')
      expect(results[0].category).toBe('systems')
    })

    it('should perform search on teams', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'frontend',
        categories: ['teams']
      })
      
      const results = await searchComposable.performSearch([], [], sampleTeams)
      
      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('Frontend Team')
      expect(results[0].category).toBe('teams')
    })

    it('should return empty results for empty query', async () => {
      searchComposable.updateSearchConfig({ query: '' })
      
      const results = await searchComposable.performSearch(sampleRequirements, sampleSystems, sampleTeams)
      
      expect(results).toHaveLength(0)
    })

    it('should limit results based on maxResults configuration', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'user',
        maxResults: 1
      })
      
      const results = await searchComposable.performSearch(sampleRequirements, [], [])
      
      expect(results).toHaveLength(1)
    })

    it('should sort results by relevance score', async () => {
      searchComposable.updateSearchConfig({ query: 'user' })
      
      const results = await searchComposable.performSearch(sampleRequirements, [], [])
      
      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('filtering functionality', () => {
    it('should filter requirements by status', () => {
      const filtered = searchComposable.applyFilters(sampleRequirements, 'requirements')
      expect(filtered).toHaveLength(3) // All items initially

      searchComposable.updateFilterConfig({
        requirements: {
          status: 'new',
          priority: 'all',
          source: 'all'
        }
      })

      const filteredNew = searchComposable.applyFilters(sampleRequirements, 'requirements')
      expect(filteredNew).toHaveLength(1)
      expect(filteredNew[0].status).toBe('new')
    })

    it('should filter requirements by priority', () => {
      searchComposable.updateFilterConfig({
        requirements: {
          status: 'all',
          priority: 'high',
          source: 'all'
        }
      })

      const filtered = searchComposable.applyFilters(sampleRequirements, 'requirements')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].priority).toBe('high')
    })

    it('should filter requirements by source', () => {
      searchComposable.updateFilterConfig({
        requirements: {
          status: 'all',
          priority: 'all',
          source: 'manual'
        }
      })

      const filtered = searchComposable.applyFilters(sampleRequirements, 'requirements')
      expect(filtered).toHaveLength(2)
      filtered.forEach(item => {
        expect(item.source).toBe('manual')
      })
    })

    it('should filter requirements by date range', () => {
      const startDate = new Date('2024-01-02')
      const endDate = new Date('2024-01-03')

      searchComposable.updateFilterConfig({
        requirements: {
          status: 'all',
          priority: 'all',
          source: 'all',
          dateRange: { start: startDate, end: endDate }
        }
      })

      const filtered = searchComposable.applyFilters(sampleRequirements, 'requirements')
      expect(filtered).toHaveLength(2)
    })

    it('should filter systems by type', () => {
      searchComposable.updateFilterConfig({
        systems: {
          type: 'internal',
          hasDependencies: 'all'
        }
      })

      const filtered = searchComposable.applyFilters(sampleSystems, 'systems')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].type).toBe('internal')
    })

    it('should filter systems by dependencies', () => {
      searchComposable.updateFilterConfig({
        systems: {
          type: 'all',
          hasDependencies: 'yes'
        }
      })

      const filtered = searchComposable.applyFilters(sampleSystems, 'systems')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].dependencies.length).toBeGreaterThan(0)
    })

    it('should filter teams by role', () => {
      searchComposable.updateFilterConfig({
        teams: {
          role: 'Development',
          hasMembers: 'all'
        }
      })

      const filtered = searchComposable.applyFilters(sampleTeams, 'teams')
      expect(filtered).toHaveLength(2)
      filtered.forEach(team => {
        expect(team.role).toBe('Development')
      })
    })

    it('should filter teams by members', () => {
      searchComposable.updateFilterConfig({
        teams: {
          role: 'all',
          hasMembers: 'yes'
        }
      })

      const filtered = searchComposable.applyFilters(sampleTeams, 'teams')
      expect(filtered).toHaveLength(2)
      filtered.forEach(team => {
        expect(team.members.length).toBeGreaterThan(0)
      })
    })
  })

  describe('computed properties', () => {
    it('should detect active filters', () => {
      expect(searchComposable.hasActiveFilters.value).toBe(false)

      searchComposable.updateFilterConfig({
        requirements: {
          status: 'new',
          priority: 'all',
          source: 'all'
        }
      })

      expect(searchComposable.hasActiveFilters.value).toBe(true)
    })

    it('should detect active search', () => {
      expect(searchComposable.hasActiveSearch.value).toBe(false)

      searchComposable.updateSearchConfig({ query: 'test' })

      expect(searchComposable.hasActiveSearch.value).toBe(true)
    })

    it('should categorize search results', async () => {
      searchComposable.updateSearchConfig({ query: 'user' })
      
      await searchComposable.performSearch(sampleRequirements, [], sampleTeams)
      
      const categorized = searchComposable.resultsByCategory.value
      expect(categorized.requirements.length).toBeGreaterThan(0)
      expect(categorized.systems.length).toBe(0)
      expect(categorized.teams.length).toBe(0)
    })
  })

  describe('state management', () => {
    it('should update search configuration', () => {
      const updates = {
        query: 'new query',
        caseSensitive: true,
        fuzzySearch: true
      }

      searchComposable.updateSearchConfig(updates)

      expect(searchComposable.searchConfig.value.query).toBe('new query')
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(true)
      expect(searchComposable.searchConfig.value.fuzzySearch).toBe(true)
    })

    it('should update filter configuration', () => {
      const updates = {
        requirements: {
          status: 'accepted' as const,
          priority: 'high' as const,
          source: 'pdf' as const
        }
      }

      searchComposable.updateFilterConfig(updates)

      expect(searchComposable.filterConfig.value.requirements.status).toBe('accepted')
      expect(searchComposable.filterConfig.value.requirements.priority).toBe('high')
      expect(searchComposable.filterConfig.value.requirements.source).toBe('pdf')
    })

    it('should reset search configuration', () => {
      searchComposable.updateSearchConfig({ 
        query: 'test',
        caseSensitive: true 
      })

      searchComposable.resetSearch()

      expect(searchComposable.searchConfig.value.query).toBe('')
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(false)
      expect(searchComposable.searchResults.value).toHaveLength(0)
    })

    it('should reset filter configuration', () => {
      searchComposable.updateFilterConfig({
        requirements: {
          status: 'accepted',
          priority: 'high',
          source: 'pdf'
        }
      })

      searchComposable.resetFilters()

      expect(searchComposable.filterConfig.value.requirements.status).toBe('all')
      expect(searchComposable.filterConfig.value.requirements.priority).toBe('all')
      expect(searchComposable.filterConfig.value.requirements.source).toBe('all')
    })

    it('should reset all configuration', () => {
      searchComposable.updateSearchConfig({ query: 'test' })
      searchComposable.updateFilterConfig({
        requirements: { status: 'accepted', priority: 'all', source: 'all' }
      })

      searchComposable.resetAll()

      expect(searchComposable.searchConfig.value.query).toBe('')
      expect(searchComposable.filterConfig.value.requirements.status).toBe('all')
      expect(searchComposable.searchResults.value).toHaveLength(0)
    })
  })

  describe('persistence', () => {
    it('should save state to localStorage with versioning', () => {
      searchComposable.updateSearchConfig({ query: 'test query' })
      searchComposable.saveState()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'advancedSearch_state',
        expect.stringContaining('test query')
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'advancedSearch_searchConfig',
        expect.stringContaining('test query')
      )
    })

    it('should load from unified state format', () => {
      const unifiedState = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        searchConfig: { query: 'unified test', caseSensitive: true },
        filterConfig: { requirements: { status: 'accepted', priority: 'all', source: 'all' } },
        searchHistory: ['unified search'],
        filterHistory: []
      }

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'advancedSearch_state') {
          return JSON.stringify(unifiedState)
        }
        return null
      })

      const newComposable = useAdvancedSearch()
      expect(newComposable.searchConfig.value.query).toBe('unified test')
      expect(newComposable.searchConfig.value.caseSensitive).toBe(true)
      expect(newComposable.filterConfig.value.requirements.status).toBe('accepted')
      expect(newComposable.searchHistory.value).toContain('unified search')
    })

    it('should fallback to individual items for backward compatibility', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'advancedSearch_state') {
          return null // No unified state
        }
        if (key === 'advancedSearch_searchConfig') {
          return JSON.stringify({ query: 'legacy test' })
        }
        return null
      })

      const newComposable = useAdvancedSearch()
      expect(newComposable.searchConfig.value.query).toBe('legacy test')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw
      expect(() => {
        searchComposable.saveState()
      }).not.toThrow()
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      // Should not throw and should use defaults
      expect(() => {
        const newComposable = useAdvancedSearch()
        expect(newComposable.searchConfig.value.query).toBe('')
      }).not.toThrow()
    })

    it('should clear all persisted state', () => {
      searchComposable.clearPersistedState()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('advancedSearch_state')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('advancedSearch_searchConfig')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('advancedSearch_filterConfig')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('advancedSearch_searchHistory')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('advancedSearch_filterHistory')
    })

    it('should export current state', () => {
      searchComposable.updateSearchConfig({ query: 'export test' })
      const exportedState = searchComposable.exportState()

      expect(exportedState).toHaveProperty('version')
      expect(exportedState).toHaveProperty('timestamp')
      expect(exportedState).toHaveProperty('searchConfig')
      expect(exportedState).toHaveProperty('filterConfig')
      expect(exportedState.searchConfig.query).toBe('export test')
    })

    it('should import state from backup', () => {
      const importState = {
        version: '1.0',
        searchConfig: { query: 'imported test', caseSensitive: true },
        filterConfig: { requirements: { status: 'new', priority: 'high', source: 'pdf' } },
        searchHistory: ['imported search'],
        filterHistory: []
      }

      searchComposable.importState(importState)

      expect(searchComposable.searchConfig.value.query).toBe('imported test')
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(true)
      expect(searchComposable.filterConfig.value.requirements.status).toBe('new')
      expect(searchComposable.searchHistory.value).toContain('imported search')
    })

    it('should handle invalid import state gracefully', () => {
      const invalidState = { invalid: 'data' }

      // The function should not throw for invalid data, it should handle it gracefully
      expect(() => {
        searchComposable.importState(invalidState)
      }).not.toThrow()
      
      // State should remain unchanged for invalid data
      expect(searchComposable.searchConfig.value.query).toBe('')
    })
  })

  describe('utility methods', () => {
    it('should highlight matches correctly', () => {
      const highlighted = searchComposable.highlightMatch('Hello world', 6, 11)
      expect(highlighted).toBe('Hello <mark class="search-highlight">world</mark>')
    })

    it('should get field values correctly', () => {
      const item = {
        title: 'Test Title',
        tags: ['tag1', 'tag2'],
        count: 42,
        empty: null
      }

      expect(searchComposable.getFieldValue(item, 'title')).toBe('Test Title')
      expect(searchComposable.getFieldValue(item, 'tags')).toBe('tag1 tag2')
      expect(searchComposable.getFieldValue(item, 'count')).toBe('42')
      expect(searchComposable.getFieldValue(item, 'empty')).toBe('')
      expect(searchComposable.getFieldValue(item, 'nonexistent')).toBe('')
    })
  })

  describe('search history', () => {
    it('should add search queries to history', async () => {
      searchComposable.updateSearchConfig({ query: 'first search' })
      await searchComposable.performSearch(sampleRequirements, [], [])

      searchComposable.updateSearchConfig({ query: 'second search' })
      await searchComposable.performSearch(sampleRequirements, [], [])

      expect(searchComposable.searchHistory.value).toContain('first search')
      expect(searchComposable.searchHistory.value).toContain('second search')
    })

    it('should not add duplicate queries to history', async () => {
      searchComposable.updateSearchConfig({ query: 'duplicate search' })
      await searchComposable.performSearch(sampleRequirements, [], [])
      await searchComposable.performSearch(sampleRequirements, [], [])

      const duplicateCount = searchComposable.searchHistory.value.filter(
        item => item === 'duplicate search'
      ).length

      expect(duplicateCount).toBe(1)
    })

    it('should limit search history to 10 items', async () => {
      // Add 15 different searches
      for (let i = 0; i < 15; i++) {
        searchComposable.updateSearchConfig({ query: `search ${i}` })
        await searchComposable.performSearch(sampleRequirements, [], [])
      }

      expect(searchComposable.searchHistory.value.length).toBe(10)
      expect(searchComposable.searchHistory.value[0]).toBe('search 14') // Most recent first
    })
  })
})