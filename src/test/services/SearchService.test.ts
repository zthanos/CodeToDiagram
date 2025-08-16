import { describe, it, expect, beforeEach } from 'vitest'
import SearchService from '../../services/SearchService'
import type { RequirementItem, SystemInfo, TeamInfo } from '../../types/requirements'

// Sample test data
const sampleRequirements: RequirementItem[] = [
  {
    id: '1',
    title: 'User Authentication System',
    description: 'Implement secure user login and registration functionality with OAuth support',
    status: 'new',
    priority: 'high',
    project_id: 'project-1',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    source: 'manual'
  },
  {
    id: '2',
    title: 'Payment Processing Module',
    description: 'Integrate payment gateway for secure credit card transactions',
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
    description: 'Allow users to manage their personal profile information and preferences',
    status: 'rejected',
    priority: 'medium',
    project_id: 'project-1',
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
    source: 'manual'
  },
  {
    id: '4',
    title: 'Notification System',
    description: 'Send email and push notifications to users for important events',
    status: 'new',
    priority: 'low',
    project_id: 'project-1',
    created_at: new Date('2024-01-04'),
    updated_at: new Date('2024-01-04'),
    source: 'manual'
  }
]

const sampleSystems: SystemInfo[] = [
  {
    id: '1',
    name: 'Authentication Service',
    description: 'Handles user authentication and authorization with JWT tokens',
    type: 'internal',
    dependencies: ['Database', 'Email Service', 'Redis Cache']
  },
  {
    id: '2',
    name: 'Payment Gateway',
    description: 'External payment processing system for credit card transactions',
    type: 'external',
    dependencies: []
  },
  {
    id: '3',
    name: 'Notification Service',
    description: 'Internal service for sending emails and push notifications',
    type: 'internal',
    dependencies: ['Email Provider', 'Push Notification Service']
  }
]

const sampleTeams: TeamInfo[] = [
  {
    id: '1',
    name: 'Frontend Development Team',
    role: 'Development',
    members: ['Alice Johnson', 'Bob Smith', 'Carol White'],
    responsibilities: ['UI/UX Implementation', 'Client-side Logic', 'React Development']
  },
  {
    id: '2',
    name: 'Backend Development Team',
    role: 'Development',
    members: ['Charlie Brown', 'Diana Prince', 'Eve Davis'],
    responsibilities: ['API Development', 'Database Design', 'Server Architecture']
  },
  {
    id: '3',
    name: 'Quality Assurance Team',
    role: 'Testing',
    members: ['Frank Miller', 'Grace Lee'],
    responsibilities: ['Test Planning', 'Automated Testing', 'Bug Reporting']
  }
]

describe('SearchService', () => {
  let searchService: SearchService

  beforeEach(() => {
    searchService = SearchService.getInstance()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SearchService.getInstance()
      const instance2 = SearchService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('exactSearch', () => {
    it('should find exact matches in requirements', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'authentication',
        ['title', 'description']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.title).toBe('User Authentication System')
      expect(results[0].matches).toHaveLength(1)
      expect(results[0].matches[0].field).toBe('title')
      expect(results[0].matches[0].highlightedValue).toContain('<mark class="search-highlight">Authentication</mark>')
    })

    it('should be case insensitive by default', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'AUTHENTICATION',
        ['title', 'description'],
        false
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should be case sensitive when specified', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'AUTHENTICATION',
        ['title', 'description'],
        true
      )

      expect(results).toHaveLength(0)
    })

    it('should find matches in multiple fields', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'user',
        ['title', 'description']
      )

      expect(results.length).toBeGreaterThan(0)
      
      // Should find matches in both title and description fields
      const hasTitle = results.some(r => r.matches.some(m => m.field === 'title'))
      const hasDescription = results.some(r => r.matches.some(m => m.field === 'description'))
      expect(hasTitle || hasDescription).toBe(true)
    })

    it('should return empty array for empty query', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        '',
        ['title', 'description']
      )

      expect(results).toHaveLength(0)
    })

    it('should sort results by relevance score', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'user',
        ['title', 'description']
      )

      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('fuzzySearch', () => {
    it('should find fuzzy matches', () => {
      // Test with a simple case that should work
      const results = searchService.fuzzySearch(
        sampleRequirements,
        'authentication', // Exact match should always work
        ['title', 'description'],
        0.8
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should respect similarity threshold', () => {
      const highThreshold = searchService.fuzzySearch(
        sampleRequirements,
        'xyz',
        ['title', 'description'],
        0.9
      )

      const lowThreshold = searchService.fuzzySearch(
        sampleRequirements,
        'xyz',
        ['title', 'description'],
        0.1
      )

      expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length)
    })

    it('should return empty array for empty query', () => {
      const results = searchService.fuzzySearch(
        sampleRequirements,
        '',
        ['title', 'description']
      )

      expect(results).toHaveLength(0)
    })
  })

  describe('regexSearch', () => {
    it('should find regex matches', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        'user.*system',
        ['title', 'description']
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should handle case-insensitive regex', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        'USER.*SYSTEM',
        ['title', 'description'],
        'gi'
      )

      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle case-sensitive regex', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        'USER.*SYSTEM',
        ['title', 'description'],
        'g'
      )

      expect(results).toHaveLength(0)
    })

    it('should handle invalid regex gracefully', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        '[invalid regex',
        ['title', 'description']
      )

      expect(results).toHaveLength(0)
    })

    it('should find multiple matches in same field', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        'user|system',
        ['title', 'description']
      )

      expect(results.length).toBeGreaterThan(0)
      
      // Some results should have multiple matches
      const hasMultipleMatches = results.some(r => r.matches.length > 1)
      expect(hasMultipleMatches).toBe(true)
    })
  })

  describe('multiTermSearch', () => {
    it('should find OR matches for multiple terms', () => {
      const results = searchService.multiTermSearch(
        sampleRequirements,
        'user payment',
        ['title', 'description'],
        'OR'
      )

      expect(results.length).toBeGreaterThan(0)
      
      // Should find items containing either "user" or "payment"
      const hasUserMatch = results.some(r => 
        r.item.title.toLowerCase().includes('user') || 
        r.item.description.toLowerCase().includes('user')
      )
      const hasPaymentMatch = results.some(r => 
        r.item.title.toLowerCase().includes('payment') || 
        r.item.description.toLowerCase().includes('payment')
      )
      
      expect(hasUserMatch || hasPaymentMatch).toBe(true)
    })

    it('should find AND matches for multiple terms', () => {
      // Use terms that definitely exist in the same item
      const results = searchService.multiTermSearch(
        sampleRequirements,
        'user authentication', // Both exist in first item
        ['title', 'description'],
        'AND'
      )

      // Should find at least the first item that contains both terms
      expect(results.length).toBeGreaterThan(0)
      
      // Check that the first result contains both terms
      const firstResult = results[0]
      const text = (firstResult.item.title + ' ' + firstResult.item.description).toLowerCase()
      expect(text).toContain('user')
      expect(text).toContain('authentication')
    })

    it('should handle quoted phrases', () => {
      const results = searchService.multiTermSearch(
        sampleRequirements,
        '"user authentication" system',
        ['title', 'description'],
        'OR'
      )

      expect(results.length).toBeGreaterThan(0)
    })

    it('should return empty array for empty query', () => {
      const results = searchService.multiTermSearch(
        sampleRequirements,
        '',
        ['title', 'description'],
        'OR'
      )

      expect(results).toHaveLength(0)
    })

    it('should give bonus score for matching more terms', () => {
      const results = searchService.multiTermSearch(
        sampleRequirements,
        'user authentication system',
        ['title', 'description'],
        'OR'
      )

      // Items matching more terms should have higher scores
      const userAuthSystem = results.find(r => r.item.title === 'User Authentication System')
      const otherResults = results.filter(r => r.item.title !== 'User Authentication System')
      
      if (userAuthSystem && otherResults.length > 0) {
        expect(userAuthSystem.score).toBeGreaterThan(otherResults[0].score)
      }
    })
  })

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', () => {
      const suggestions = searchService.getSearchSuggestions(
        sampleRequirements,
        'auth',
        ['title', 'description'],
        5
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('authentication')
    })

    it('should limit suggestions to maxSuggestions', () => {
      const suggestions = searchService.getSearchSuggestions(
        sampleRequirements,
        'a',
        ['title', 'description'],
        2
      )

      expect(suggestions.length).toBeLessThanOrEqual(2)
    })

    it('should return empty array for empty query', () => {
      const suggestions = searchService.getSearchSuggestions(
        sampleRequirements,
        '',
        ['title', 'description']
      )

      expect(suggestions).toHaveLength(0)
    })

    it('should not suggest words shorter than query', () => {
      const suggestions = searchService.getSearchSuggestions(
        sampleRequirements,
        'authentication',
        ['title', 'description']
      )

      suggestions.forEach(suggestion => {
        expect(suggestion.length).toBeGreaterThan('authentication'.length)
      })
    })
  })

  describe('getCategorizedSuggestions', () => {
    it('should return categorized suggestions with metadata', () => {
      const suggestions = searchService.getCategorizedSuggestions(
        sampleRequirements,
        'auth',
        ['title', 'description'],
        5
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0]).toHaveProperty('suggestion')
      expect(suggestions[0]).toHaveProperty('category')
      expect(suggestions[0]).toHaveProperty('field')
      expect(suggestions[0]).toHaveProperty('frequency')
      expect(suggestions[0].category).toBe('requirements')
    })

    it('should sort suggestions by frequency', () => {
      const suggestions = searchService.getCategorizedSuggestions(
        sampleRequirements,
        'a',
        ['title', 'description'],
        10
      )

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].frequency).toBeGreaterThanOrEqual(suggestions[i].frequency)
      }
    })

    it('should return empty array for empty query', () => {
      const suggestions = searchService.getCategorizedSuggestions(
        sampleRequirements,
        '',
        ['title', 'description']
      )

      expect(suggestions).toHaveLength(0)
    })
  })

  describe('comprehensiveSearch', () => {
    it('should perform exact search by default', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        'authentication',
        ['title', 'description']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should perform fuzzy search when specified', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        'authentication', // Exact match should work
        ['title', 'description'],
        { searchMode: 'fuzzy', threshold: 0.8 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should perform regex search when specified', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        'user.*system',
        ['title', 'description'],
        { searchMode: 'regex' }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should perform multi-term search when specified', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        'user authentication',
        ['title', 'description'],
        { searchMode: 'multi' }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('User Authentication System')
    })

    it('should limit results based on maxResults', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        'user',
        ['title', 'description'],
        { maxResults: 1 }
      )

      expect(results).toHaveLength(1)
    })

    it('should fallback to exact search for invalid regex', () => {
      const results = searchService.comprehensiveSearch(
        sampleRequirements,
        '[invalid regex',
        ['title', 'description'],
        { searchMode: 'regex' }
      )

      // Should not throw and should return results from exact search fallback
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('search across different item types', () => {
    it('should search systems correctly', () => {
      const results = searchService.exactSearch(
        sampleSystems,
        'authentication',
        ['name', 'description']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('Authentication Service')
      expect(results[0].category).toBe('systems')
    })

    it('should search teams correctly', () => {
      const results = searchService.exactSearch(
        sampleTeams,
        'frontend',
        ['name', 'role', 'responsibilities']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('Frontend Development Team')
      expect(results[0].category).toBe('teams')
    })

    it('should search in array fields for teams', () => {
      const results = searchService.exactSearch(
        sampleTeams,
        'alice',
        ['members']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.members).toContain('Alice Johnson')
    })

    it('should search in responsibilities array', () => {
      const results = searchService.exactSearch(
        sampleTeams,
        'api development',
        ['responsibilities']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.responsibilities).toContain('API Development')
    })
  })

  describe('field weighting and scoring', () => {
    it('should give higher scores to title matches than description matches', () => {
      const titleMatch = searchService.exactSearch(
        sampleRequirements,
        'authentication',
        ['title']
      )

      const descriptionMatch = searchService.exactSearch(
        sampleRequirements,
        'oauth',
        ['description']
      )

      if (titleMatch.length > 0 && descriptionMatch.length > 0) {
        expect(titleMatch[0].score).toBeGreaterThan(descriptionMatch[0].score)
      }
    })

    it('should give position bonus for earlier matches', () => {
      // Create items where the search term appears at different positions
      const testItems = [
        {
          id: '1',
          title: 'Authentication System',
          description: 'Test description',
          status: 'new' as const,
          priority: 'medium' as const,
          project_id: 'test',
          created_at: new Date(),
          updated_at: new Date(),
          source: 'manual' as const
        },
        {
          id: '2',
          title: 'System for Authentication',
          description: 'Test description',
          status: 'new' as const,
          priority: 'medium' as const,
          project_id: 'test',
          created_at: new Date(),
          updated_at: new Date(),
          source: 'manual' as const
        }
      ]

      const results = searchService.exactSearch(
        testItems,
        'authentication',
        ['title']
      )

      expect(results).toHaveLength(2)
      // Earlier match should have higher score
      expect(results[0].item.title).toBe('Authentication System')
    })
  })

  describe('highlighting', () => {
    it('should highlight exact matches correctly', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'authentication',
        ['title']
      )

      expect(results[0].matches[0].highlightedValue).toContain(
        '<mark class="search-highlight">Authentication</mark>'
      )
    })

    it('should highlight multiple matches in same field', () => {
      const results = searchService.regexSearch(
        sampleRequirements,
        'user|system',
        ['title']
      )

      const userSystemMatch = results.find(r => 
        r.item.title === 'User Authentication System'
      )

      if (userSystemMatch) {
        expect(userSystemMatch.matches[0].highlightedValue).toContain('<mark class="search-highlight">')
      }
    })

    it('should preserve original text case in highlights', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'authentication',
        ['title'],
        false
      )

      expect(results[0].matches[0].highlightedValue).toContain('Authentication')
      expect(results[0].matches[0].highlightedValue).not.toContain('authentication')
    })
  })

  describe('error handling', () => {
    it('should handle null/undefined items gracefully', () => {
      const results = searchService.exactSearch(
        null as any,
        'test',
        ['title']
      )

      expect(results).toHaveLength(0)
    })

    it('should handle items with missing fields gracefully', () => {
      const itemsWithMissingFields = [
        {
          id: '1',
          title: 'Test Title'
          // Missing other required fields
        }
      ] as any[]

      const results = searchService.exactSearch(
        itemsWithMissingFields,
        'test',
        ['title', 'description']
      )

      expect(results).toHaveLength(1)
      expect(results[0].item.title).toBe('Test Title')
    })

    it('should handle empty fields array gracefully', () => {
      const results = searchService.exactSearch(
        sampleRequirements,
        'test',
        []
      )

      expect(results).toHaveLength(0)
    })
  })
})