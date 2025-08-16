// src/test/composables/useADRSearch.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useADRSearch } from '../../composables/useADRSearch';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useADRSearch', () => {
  let searchComposable;

  const mockADRs = [
    {
      id: 'adr-1',
      project_id: 'project-123',
      title: 'Use React for Frontend Development',
      status: 'accepted',
      context: 'We need to choose a frontend framework for our web application. The team has experience with React.',
      decision: 'We will use React as our primary frontend framework for building user interfaces.',
      consequences: 'This will provide better developer experience, strong community support, and easier maintenance.',
      alternatives: 'Vue.js and Angular were also considered but React has better team familiarity.',
      author: 'John Doe',
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
      tags: ['frontend', 'framework', 'react'],
      superseded_by: undefined,
      supersedes: []
    },
    {
      id: 'adr-2',
      project_id: 'project-123',
      title: 'Use PostgreSQL for Database',
      status: 'proposed',
      context: 'We need to choose a database for our application. We require ACID compliance and strong consistency.',
      decision: 'We will use PostgreSQL as our primary database management system.',
      consequences: 'This will provide reliability, ACID compliance, and excellent performance for complex queries.',
      alternatives: 'MySQL and MongoDB were considered but PostgreSQL offers better feature set.',
      author: 'Jane Smith',
      created_at: new Date('2025-01-02'),
      updated_at: new Date('2025-01-02'),
      tags: ['database', 'backend', 'postgresql'],
      superseded_by: undefined,
      supersedes: []
    },
    {
      id: 'adr-3',
      project_id: 'project-123',
      title: 'Use REST API Architecture',
      status: 'deprecated',
      context: 'We needed to define our API architecture for client-server communication.',
      decision: 'We used REST API architecture for our web services.',
      consequences: 'Simple to implement and understand, but limited flexibility for complex operations.',
      alternatives: 'GraphQL was considered but REST was simpler to start with.',
      author: 'Bob Johnson',
      created_at: new Date('2025-01-03'),
      updated_at: new Date('2025-01-03'),
      tags: ['api', 'architecture', 'rest'],
      superseded_by: 'adr-4',
      supersedes: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    searchComposable = useADRSearch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(searchComposable.searchConfig.value.query).toBe('');
      expect(searchComposable.searchConfig.value.fields).toEqual(['title', 'context', 'decision', 'consequences', 'alternatives']);
      expect(searchComposable.searchConfig.value.fuzzySearch).toBe(false);
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(false);
      expect(searchComposable.searchConfig.value.maxResults).toBe(50);
    });

    it('should initialize with default filter configuration', () => {
      expect(searchComposable.filterConfig.value.status).toBe('all');
      expect(searchComposable.filterConfig.value.tags).toEqual([]);
      expect(searchComposable.filterConfig.value.author).toBe('');
    });

    it('should initialize computed properties correctly', () => {
      expect(searchComposable.hasActiveFilters.value).toBe(false);
      expect(searchComposable.hasActiveSearch.value).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('should perform basic text search', async () => {
      searchComposable.updateSearchConfig({ query: 'React' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(1);
      expect(results[0].adr.id).toBe('adr-1');
      expect(results[0].matches.length).toBeGreaterThan(0);
    });

    it('should search across multiple fields', async () => {
      searchComposable.updateSearchConfig({ query: 'database' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(1);
      expect(results[0].adr.id).toBe('adr-2');
    });

    it('should search in tags', async () => {
      searchComposable.updateSearchConfig({ query: 'frontend' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(1);
      expect(results[0].adr.id).toBe('adr-1');
    });

    it('should search in author field', async () => {
      searchComposable.updateSearchConfig({ query: 'Jane' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(1);
      expect(results[0].adr.id).toBe('adr-2');
    });

    it('should return empty results for no matches', async () => {
      searchComposable.updateSearchConfig({ query: 'nonexistent' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(0);
    });

    it('should return empty results when no query', async () => {
      searchComposable.updateSearchConfig({ query: '' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(0);
    });

    it('should sort results by relevance score', async () => {
      searchComposable.updateSearchConfig({ query: 'API' });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      // Should be sorted by score (highest first)
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should limit results to maxResults', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'a', // Very broad search
        maxResults: 2 
      });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle case sensitivity', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'REACT',
        caseSensitive: true
      });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(0); // Should not match lowercase 'react'
    });

    it('should handle whole word search', async () => {
      searchComposable.updateSearchConfig({ 
        query: 'act',
        wholeWords: true
      });
      
      const results = await searchComposable.performSearch(mockADRs);
      
      expect(results).toHaveLength(0); // Should not match 'React' partially
    });

    it('should add search queries to history', async () => {
      searchComposable.updateSearchConfig({ query: 'React' });
      await searchComposable.performSearch(mockADRs);
      
      expect(searchComposable.searchHistory.value).toContain('React');
    });

    it('should not add duplicate queries to history', async () => {
      searchComposable.updateSearchConfig({ query: 'React' });
      await searchComposable.performSearch(mockADRs);
      await searchComposable.performSearch(mockADRs);
      
      const reactCount = searchComposable.searchHistory.value.filter(q => q === 'React').length;
      expect(reactCount).toBe(1);
    });

    it('should limit search history to 10 items', async () => {
      for (let i = 0; i < 15; i++) {
        searchComposable.updateSearchConfig({ query: `query${i}` });
        await searchComposable.performSearch(mockADRs);
      }
      
      expect(searchComposable.searchHistory.value.length).toBe(10);
    });
  });

  describe('Filter Functionality', () => {
    it('should filter by status', () => {
      searchComposable.updateFilterConfig({ status: 'accepted' });
      
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('accepted');
    });

    it('should filter by tags', () => {
      searchComposable.updateFilterConfig({ tags: ['frontend'] });
      
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tags).toContain('frontend');
    });

    it('should filter by author', () => {
      searchComposable.updateFilterConfig({ author: 'Jane' });
      
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].author).toContain('Jane');
    });

    it('should filter by date range', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-01')
      };
      searchComposable.updateFilterConfig({ dateRange });
      
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('adr-1');
    });

    it('should apply multiple filters', () => {
      searchComposable.updateFilterConfig({ 
        status: 'accepted',
        tags: ['frontend']
      });
      
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('accepted');
      expect(filtered[0].tags).toContain('frontend');
    });

    it('should return all items when no filters applied', () => {
      const filtered = searchComposable.applyFilters(mockADRs);
      
      expect(filtered).toHaveLength(3);
    });

    it('should update hasActiveFilters computed property', () => {
      expect(searchComposable.hasActiveFilters.value).toBe(false);
      
      searchComposable.updateFilterConfig({ status: 'accepted' });
      
      expect(searchComposable.hasActiveFilters.value).toBe(true);
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort by date descending by default', () => {
      const sorted = searchComposable.sortADRs(mockADRs, 'date', 'desc');
      
      expect(sorted[0].id).toBe('adr-3'); // Latest date
      expect(sorted[2].id).toBe('adr-1'); // Earliest date
    });

    it('should sort by date ascending', () => {
      const sorted = searchComposable.sortADRs(mockADRs, 'date', 'asc');
      
      expect(sorted[0].id).toBe('adr-1'); // Earliest date
      expect(sorted[2].id).toBe('adr-3'); // Latest date
    });

    it('should sort by title alphabetically', () => {
      const sorted = searchComposable.sortADRs(mockADRs, 'title', 'asc');
      
      expect(sorted[0].title).toBe('Use PostgreSQL for Database');
      expect(sorted[1].title).toBe('Use REST API Architecture');
      expect(sorted[2].title).toBe('Use React for Frontend Development');
    });

    it('should sort by status', () => {
      const sorted = searchComposable.sortADRs(mockADRs, 'status', 'asc');
      
      // Status order: proposed, accepted, deprecated, superseded
      expect(sorted[0].status).toBe('proposed');
      expect(sorted[1].status).toBe('accepted');
      expect(sorted[2].status).toBe('deprecated');
    });
  });

  describe('State Management', () => {
    it('should update search configuration', () => {
      const updates = { query: 'test', caseSensitive: true };
      
      searchComposable.updateSearchConfig(updates);
      
      expect(searchComposable.searchConfig.value.query).toBe('test');
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(true);
    });

    it('should update filter configuration', () => {
      const updates = { status: 'accepted', tags: ['test'] };
      
      searchComposable.updateFilterConfig(updates);
      
      expect(searchComposable.filterConfig.value.status).toBe('accepted');
      expect(searchComposable.filterConfig.value.tags).toEqual(['test']);
    });

    it('should add filter configuration to history', () => {
      const oldConfig = { ...searchComposable.filterConfig.value };
      
      searchComposable.updateFilterConfig({ status: 'accepted' });
      
      expect(searchComposable.filterHistory.value).toContain(oldConfig);
    });

    it('should limit filter history to 5 items', () => {
      for (let i = 0; i < 10; i++) {
        searchComposable.updateFilterConfig({ status: 'accepted', author: `author${i}` });
      }
      
      expect(searchComposable.filterHistory.value.length).toBe(5);
    });

    it('should reset search configuration', () => {
      searchComposable.updateSearchConfig({ query: 'test', caseSensitive: true });
      
      searchComposable.resetSearch();
      
      expect(searchComposable.searchConfig.value.query).toBe('');
      expect(searchComposable.searchConfig.value.caseSensitive).toBe(false);
      expect(searchComposable.searchResults.value).toEqual([]);
    });

    it('should reset filter configuration', () => {
      searchComposable.updateFilterConfig({ status: 'accepted', tags: ['test'] });
      
      searchComposable.resetFilters();
      
      expect(searchComposable.filterConfig.value.status).toBe('all');
      expect(searchComposable.filterConfig.value.tags).toEqual([]);
    });

    it('should reset all configurations', () => {
      searchComposable.updateSearchConfig({ query: 'test' });
      searchComposable.updateFilterConfig({ status: 'accepted' });
      
      searchComposable.resetAll();
      
      expect(searchComposable.searchConfig.value.query).toBe('');
      expect(searchComposable.filterConfig.value.status).toBe('all');
    });
  });

  describe('Persistence', () => {
    it('should save state to localStorage', () => {
      searchComposable.updateSearchConfig({ query: 'test' });
      searchComposable.saveState();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'adrSearch_state',
        expect.stringContaining('"query":"test"')
      );
    });

    it('should load state from localStorage', () => {
      const savedState = {
        version: '1.0',
        searchConfig: { query: 'saved query' },
        filterConfig: { status: 'accepted' },
        searchHistory: ['query1'],
        filterHistory: []
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));
      
      const newComposable = useADRSearch();
      
      expect(newComposable.searchConfig.value.query).toBe('saved query');
      expect(newComposable.filterConfig.value.status).toBe('accepted');
      expect(newComposable.searchHistory.value).toEqual(['query1']);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw error and use defaults
      const newComposable = useADRSearch();
      
      expect(newComposable.searchConfig.value.query).toBe('');
      expect(newComposable.filterConfig.value.status).toBe('all');
    });

    it('should clear persisted state', () => {
      searchComposable.clearPersistedState();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('adrSearch_state');
    });

    it('should export state', () => {
      searchComposable.updateSearchConfig({ query: 'test' });
      
      const exported = searchComposable.exportState();
      
      expect(exported).toMatchObject({
        version: '1.0',
        searchConfig: expect.objectContaining({ query: 'test' }),
        filterConfig: expect.any(Object),
        searchHistory: expect.any(Array),
        filterHistory: expect.any(Array)
      });
    });

    it('should import state', () => {
      const stateToImport = {
        searchConfig: { query: 'imported' },
        filterConfig: { status: 'accepted' },
        searchHistory: ['imported query'],
        filterHistory: []
      };
      
      searchComposable.importState(stateToImport);
      
      expect(searchComposable.searchConfig.value.query).toBe('imported');
      expect(searchComposable.filterConfig.value.status).toBe('accepted');
      expect(searchComposable.searchHistory.value).toEqual(['imported query']);
    });

    it('should handle invalid import data', () => {
      expect(() => {
        searchComposable.importState({ invalid: 'data' });
      }).toThrow('Invalid state data format');
    });
  });

  describe('Utility Methods', () => {
    it('should get field value from object', () => {
      const adr = mockADRs[0];
      
      expect(searchComposable.getFieldValue(adr, 'title')).toBe(adr.title);
      expect(searchComposable.getFieldValue(adr, 'tags')).toBe(adr.tags.join(' '));
      expect(searchComposable.getFieldValue(adr, 'nonexistent')).toBe('');
    });

    it('should highlight matches in text', () => {
      const text = 'This is a test string';
      const highlighted = searchComposable.highlightMatch(text, 10, 14);
      
      expect(highlighted).toBe('This is a <mark class="search-highlight">test</mark> string');
    });
  });

  describe('Computed Properties', () => {
    it('should update hasActiveSearch when query changes', () => {
      expect(searchComposable.hasActiveSearch.value).toBe(false);
      
      searchComposable.updateSearchConfig({ query: 'test' });
      
      expect(searchComposable.hasActiveSearch.value).toBe(true);
    });

    it('should update hasActiveFilters when filters change', () => {
      expect(searchComposable.hasActiveFilters.value).toBe(false);
      
      searchComposable.updateFilterConfig({ status: 'accepted' });
      
      expect(searchComposable.hasActiveFilters.value).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      // Mock an error in search
      const invalidADRs = [{ invalid: 'data' }];
      
      // Should not throw error
      const results = await searchComposable.performSearch(invalidADRs);
      
      expect(results).toEqual([]);
    });

    it('should handle filter errors gracefully', () => {
      const invalidADRs = [{ invalid: 'data' }];
      
      // Should not throw error
      const filtered = searchComposable.applyFilters(invalidADRs);
      
      expect(filtered).toEqual([{ invalid: 'data' }]);
    });
  });
});