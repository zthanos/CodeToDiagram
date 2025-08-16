import type { RequirementItem, SystemInfo, TeamInfo } from '../types/requirements'
import type { SearchResult, SearchMatch, SearchConfig, FilterConfig } from '../composables/useAdvancedSearch'

/**
 * Advanced search service with fuzzy matching and relevance scoring
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class SearchService {
  private static instance: SearchService | null = null

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService()
    }
    return SearchService.instance
  }

  /**
   * Perform fuzzy search with Levenshtein distance
   */
  public fuzzySearch<T>(
    items: T[],
    query: string,
    fields: string[],
    threshold: number = 0.6
  ): SearchResult<T>[] {
    const results: SearchResult<T>[] = []
    const normalizedQuery = query.toLowerCase().trim()

    if (!normalizedQuery || !items || !Array.isArray(items)) {
      return results
    }

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0

      for (const field of fields) {
        const fieldValue = this.getFieldValue(item, field)
        if (fieldValue) {
          const similarity = this.calculateSimilarity(normalizedQuery, fieldValue.toLowerCase())
          
          if (similarity >= threshold) {
            const match: SearchMatch = {
              field,
              value: fieldValue,
              highlightedValue: this.highlightFuzzyMatch(fieldValue, normalizedQuery),
              startIndex: 0,
              endIndex: fieldValue.length
            }
            
            matches.push(match)
            totalScore += similarity * this.getFieldWeight(field)
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          item,
          score: totalScore,
          matches,
          category: this.getCategoryForItem(item)
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Perform exact phrase search
   */
  public exactSearch<T>(
    items: T[],
    query: string,
    fields: string[],
    caseSensitive: boolean = false
  ): SearchResult<T>[] {
    const results: SearchResult<T>[] = []
    const searchQuery = caseSensitive ? query : query.toLowerCase()

    if (!searchQuery.trim() || !items || !Array.isArray(items)) {
      return results
    }

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0

      for (const field of fields) {
        const fieldValue = this.getFieldValue(item, field)
        if (fieldValue) {
          const searchText = caseSensitive ? fieldValue : fieldValue.toLowerCase()
          const index = searchText.indexOf(searchQuery)

          if (index !== -1) {
            const match: SearchMatch = {
              field,
              value: fieldValue,
              highlightedValue: this.highlightExactMatch(fieldValue, index, index + searchQuery.length),
              startIndex: index,
              endIndex: index + searchQuery.length
            }

            matches.push(match)
            totalScore += this.calculateExactMatchScore(field, index, fieldValue.length)
          }
        }
      }

      if (matches.length > 0) {
        results.push({
          item,
          score: totalScore,
          matches,
          category: this.getCategoryForItem(item)
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Perform regex-based search
   */
  public regexSearch<T>(
    items: T[],
    pattern: string,
    fields: string[],
    flags: string = 'gi'
  ): SearchResult<T>[] {
    const results: SearchResult<T>[] = []

    if (!items || !Array.isArray(items)) {
      return results
    }

    try {
      const regex = new RegExp(pattern, flags)

      for (const item of items) {
        const matches: SearchMatch[] = []
        let totalScore = 0

        for (const field of fields) {
          const fieldValue = this.getFieldValue(item, field)
          if (fieldValue) {
            const regexMatches = Array.from(fieldValue.matchAll(regex))

            for (const regexMatch of regexMatches) {
              if (regexMatch.index !== undefined) {
                const match: SearchMatch = {
                  field,
                  value: fieldValue,
                  highlightedValue: this.highlightRegexMatch(fieldValue, regexMatch),
                  startIndex: regexMatch.index,
                  endIndex: regexMatch.index + regexMatch[0].length
                }

                matches.push(match)
                totalScore += this.getFieldWeight(field) * 10
              }
            }
          }
        }

        if (matches.length > 0) {
          results.push({
            item,
            score: totalScore,
            matches,
            category: this.getCategoryForItem(item)
          })
        }
      }
    } catch (error) {
      console.warn('Invalid regex pattern:', pattern, error)
      return []
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Perform multi-term search with AND/OR logic
   */
  public multiTermSearch<T>(
    items: T[],
    query: string,
    fields: string[],
    operator: 'AND' | 'OR' = 'OR',
    caseSensitive: boolean = false
  ): SearchResult<T>[] {
    const terms = this.parseSearchTerms(query)
    if (terms.length === 0 || !items || !Array.isArray(items)) {
      return []
    }

    const results: SearchResult<T>[] = []

    for (const item of items) {
      const matches: SearchMatch[] = []
      let totalScore = 0
      let matchedTerms = 0

      for (const field of fields) {
        const fieldValue = this.getFieldValue(item, field)
        if (fieldValue) {
          const searchText = caseSensitive ? fieldValue : fieldValue.toLowerCase()

          for (const term of terms) {
            const searchTerm = caseSensitive ? term : term.toLowerCase()
            const index = searchText.indexOf(searchTerm)

            if (index !== -1) {
              matchedTerms++
              const match: SearchMatch = {
                field,
                value: fieldValue,
                highlightedValue: this.highlightExactMatch(fieldValue, index, index + searchTerm.length),
                startIndex: index,
                endIndex: index + searchTerm.length
              }

              matches.push(match)
              totalScore += this.calculateExactMatchScore(field, index, fieldValue.length)
            }
          }
        }
      }

      // Apply AND/OR logic
      const shouldInclude = operator === 'OR' 
        ? matchedTerms > 0 
        : matchedTerms === terms.length

      if (shouldInclude && matches.length > 0) {
        // Bonus for matching more terms
        const termMatchBonus = (matchedTerms / terms.length) * 20
        totalScore += termMatchBonus

        results.push({
          item,
          score: totalScore,
          matches,
          category: this.getCategoryForItem(item)
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Get search suggestions based on partial input with enhanced categorization
   */
  public getSearchSuggestions<T>(
    items: T[],
    partialQuery: string,
    fields: string[],
    maxSuggestions: number = 5
  ): string[] {
    const suggestions = new Set<string>()
    const normalizedQuery = partialQuery.toLowerCase().trim()

    if (!normalizedQuery) {
      return []
    }

    for (const item of items) {
      for (const field of fields) {
        const fieldValue = this.getFieldValue(item, field)
        if (fieldValue) {
          const words = fieldValue.toLowerCase().split(/\s+/)
          
          for (const word of words) {
            if (word.startsWith(normalizedQuery) && word.length > normalizedQuery.length) {
              suggestions.add(word)
              
              if (suggestions.size >= maxSuggestions) {
                return Array.from(suggestions).slice(0, maxSuggestions)
              }
            }
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, maxSuggestions)
  }

  /**
   * Get categorized search suggestions with metadata
   */
  public getCategorizedSuggestions<T>(
    items: T[],
    partialQuery: string,
    fields: string[],
    maxSuggestions: number = 5
  ): Array<{ suggestion: string; category: string; field: string; frequency: number }> {
    const suggestionMap = new Map<string, { category: string; field: string; frequency: number }>()
    const normalizedQuery = partialQuery.toLowerCase().trim()

    if (!normalizedQuery) {
      return []
    }

    for (const item of items) {
      const category = this.getCategoryForItem(item)
      
      for (const field of fields) {
        const fieldValue = this.getFieldValue(item, field)
        if (fieldValue) {
          const words = fieldValue.toLowerCase().split(/\s+/)
          
          for (const word of words) {
            if (word.startsWith(normalizedQuery) && word.length > normalizedQuery.length) {
              const existing = suggestionMap.get(word)
              if (existing) {
                existing.frequency++
              } else {
                suggestionMap.set(word, { category, field, frequency: 1 })
              }
            }
          }
        }
      }
    }

    return Array.from(suggestionMap.entries())
      .map(([suggestion, metadata]) => ({ suggestion, ...metadata }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxSuggestions)
  }

  /**
   * Perform comprehensive search across all categories with real-time filtering
   */
  public comprehensiveSearch<T>(
    items: T[],
    query: string,
    fields: string[],
    options: {
      searchMode?: 'exact' | 'fuzzy' | 'regex' | 'multi'
      caseSensitive?: boolean
      wholeWords?: boolean
      threshold?: number
      maxResults?: number
    } = {}
  ): SearchResult<T>[] {
    const {
      searchMode = 'exact',
      caseSensitive = false,
      wholeWords = false,
      threshold = 0.6,
      maxResults = 100
    } = options

    let results: SearchResult<T>[] = []

    switch (searchMode) {
      case 'fuzzy':
        results = this.fuzzySearch(items, query, fields, threshold)
        break
      case 'regex':
        try {
          const flags = caseSensitive ? 'g' : 'gi'
          results = this.regexSearch(items, query, fields, flags)
        } catch (error) {
          // Fallback to exact search if regex is invalid
          results = this.exactSearch(items, query, fields, caseSensitive)
        }
        break
      case 'multi':
        results = this.multiTermSearch(items, query, fields, 'OR', caseSensitive)
        break
      default:
        results = this.exactSearch(items, query, fields, caseSensitive)
    }

    return results.slice(0, maxResults)
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    const distance = matrix[len1][len2]
    const maxLength = Math.max(len1, len2)
    return 1 - (distance / maxLength)
  }

  /**
   * Parse search terms from query string
   */
  private parseSearchTerms(query: string): string[] {
    // Handle quoted phrases
    const quotedPhrases = query.match(/"([^"]+)"/g) || []
    let remainingQuery = query

    // Remove quoted phrases from remaining query
    for (const phrase of quotedPhrases) {
      remainingQuery = remainingQuery.replace(phrase, '')
    }

    // Split remaining query into individual terms
    const individualTerms = remainingQuery
      .split(/\s+/)
      .filter(term => term.trim().length > 0)

    // Combine quoted phrases (without quotes) and individual terms
    const allTerms = [
      ...quotedPhrases.map(phrase => phrase.slice(1, -1)), // Remove quotes
      ...individualTerms
    ]

    return allTerms.filter(term => term.length > 0)
  }

  /**
   * Get field value from item
   */
  private getFieldValue(item: any, field: string): string {
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

  /**
   * Get field weight for scoring
   */
  private getFieldWeight(field: string): number {
    const weights: Record<string, number> = {
      title: 3,
      name: 3,
      description: 2,
      role: 2,
      responsibilities: 1.5,
      members: 1,
      type: 1.5,
      dependencies: 1
    }
    return weights[field] || 1
  }

  /**
   * Calculate exact match score
   */
  private calculateExactMatchScore(field: string, position: number, totalLength: number): number {
    const baseScore = this.getFieldWeight(field) * 10
    
    // Position bonus (earlier matches score higher)
    const positionBonus = Math.max(0, 10 - (position / totalLength) * 10)
    
    return baseScore + positionBonus
  }

  /**
   * Get category for item type
   */
  private getCategoryForItem(item: any): 'requirements' | 'systems' | 'teams' {
    if ('status' in item && 'priority' in item) {
      return 'requirements'
    } else if ('type' in item && 'dependencies' in item) {
      return 'systems'
    } else if ('role' in item && 'members' in item) {
      return 'teams'
    }
    return 'requirements' // default
  }

  /**
   * Highlight exact match in text
   */
  private highlightExactMatch(text: string, startIndex: number, endIndex: number): string {
    const before = text.substring(0, startIndex)
    const match = text.substring(startIndex, endIndex)
    const after = text.substring(endIndex)
    return `${before}<mark class="search-highlight">${match}</mark>${after}`
  }

  /**
   * Highlight fuzzy match in text
   */
  private highlightFuzzyMatch(text: string, query: string): string {
    // Simple highlighting for fuzzy matches - could be enhanced with more sophisticated algorithms
    const words = query.split(/\s+/)
    let highlightedText = text

    for (const word of words) {
      const regex = new RegExp(`(${this.escapeRegExp(word)})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>')
    }

    return highlightedText
  }

  /**
   * Highlight regex match in text
   */
  private highlightRegexMatch(text: string, match: RegExpMatchArray): string {
    if (match.index === undefined) {
      return text
    }

    const before = text.substring(0, match.index)
    const matchText = match[0]
    const after = text.substring(match.index + matchText.length)
    return `${before}<mark class="search-highlight">${matchText}</mark>${after}`
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export default SearchService