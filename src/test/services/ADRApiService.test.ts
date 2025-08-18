import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ADRApiService } from '../../services/ADRApiService';
import { ADR, ADRStatus, UpsertADRRequest, ADRListResponse } from '../../types/adr';

// Mock the API config
vi.mock('../../config/api', () => ({
  apiConfig: {
    baseUrl: 'http://localhost:8000',
    version: 'v1',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  getVersionedPath: (path: string) => `/api/v1/${path.startsWith('/') ? path.slice(1) : path}`
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}));

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

describe('ADRApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock axios.create to return our mock instance
    const mockedAxios = vi.mocked(axios);
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    ADRApiService.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('upsertADR', () => {
    it('should create a new ADR when adr_id is not provided', async () => {
      const projectId = 'project-123';
      const upsertRequest: UpsertADRRequest = {
        title: 'Test ADR',
        status: 'proposed',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        alternatives: 'Test alternatives',
        author: 'Test Author',
        tags: ['test', 'example'],
        content: 'Test content'
      };

      const mockResponse = {
        data: {
          id: 123,
          project_id: projectId,
          title: 'Test ADR',
          status: 'proposed',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
          alternatives: 'Test alternatives',
          author: 'Test Author',
          tags: ['test', 'example'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ADRApiService.upsertADR(projectId, upsertRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/projects/project-123/adrs',
        {
          title: 'Test ADR',
          status: 'proposed',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
          alternatives: 'Test alternatives',
          author: 'Test Author',
          tags: ['test', 'example'],
          content: 'Test content'
        }
      );

      expect(result.id).toBe('123');
      expect(result.title).toBe('Test ADR');
      expect(result.status).toBe('proposed');
    });

    it('should update an existing ADR when adr_id is provided', async () => {
      const projectId = 'project-123';
      const upsertRequest: UpsertADRRequest = {
        title: 'Updated ADR',
        status: 'accepted',
        context: 'Updated context',
        decision: 'Updated decision',
        consequences: 'Updated consequences',
        alternatives: 'Updated alternatives',
        author: 'Test Author',
        tags: ['updated', 'example'],
        content: 'Updated content',
        adr_id: 123
      };

      const mockResponse = {
        data: {
          id: 123,
          project_id: projectId,
          title: 'Updated ADR',
          status: 'accepted',
          context: 'Updated context',
          decision: 'Updated decision',
          consequences: 'Updated consequences',
          alternatives: 'Updated alternatives',
          author: 'Test Author',
          tags: ['updated', 'example'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await ADRApiService.upsertADR(projectId, upsertRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/projects/project-123/adrs',
        {
          title: 'Updated ADR',
          status: 'accepted',
          context: 'Updated context',
          decision: 'Updated decision',
          consequences: 'Updated consequences',
          alternatives: 'Updated alternatives',
          author: 'Test Author',
          tags: ['updated', 'example'],
          content: 'Updated content',
          adr_id: 123
        }
      );

      expect(result.id).toBe('123');
      expect(result.title).toBe('Updated ADR');
      expect(result.status).toBe('accepted');
    });

    it('should validate required fields before sending request', async () => {
      const projectId = 'project-123';
      const invalidRequest = {
        title: '',
        status: 'proposed' as ADRStatus,
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        tags: [],
        content: 'Test content'
      };

      await expect(ADRApiService.upsertADR(projectId, invalidRequest)).rejects.toThrow(
        'Invalid ADR: title must be a non-empty string'
      );

      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it('should handle API errors properly', async () => {
      const projectId = 'project-123';
      const upsertRequest: UpsertADRRequest = {
        title: 'Test ADR',
        status: 'proposed',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        tags: [],
        content: 'Test content'
      };

      const mockError = {
        response: {
          status: 422,
          data: {
            detail: [
              {
                loc: ['title'],
                msg: 'Title is required',
                type: 'value_error'
              }
            ]
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(ADRApiService.upsertADR(projectId, upsertRequest)).rejects.toMatchObject({
        type: 'validation'
      });
    });
  });

  describe('listADRs', () => {
    it('should list ADRs with pagination support', async () => {
      const projectId = 'project-123';
      const mockResponse: ADRListResponse = {
        success: true,
        message: 'ADRs retrieved successfully',
        data: [
          {
            id: '1',
            project_id: projectId,
            title: 'Test ADR 1',
            status: 'proposed',
            context: 'Context 1',
            decision: 'Decision 1',
            consequences: 'Consequences 1',
            author: 'Author 1',
            created_at: new Date('2023-01-01'),
            updated_at: new Date('2023-01-01'),
            tags: ['test'],
            supersedes: []
          }
        ],
        timestamp: '2023-01-01T00:00:00Z',
        meta: {
          page: 1,
          per_page: 10,
          total: 1,
          pages: 1,
          has_next: false,
          has_prev: false
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await ADRApiService.listADRs(projectId, {
        page: 1,
        per_page: 10,
        sort_by: 'created_at',
        sort_order: 'desc',
        search: 'test'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/projects/project-123/adrs?page=1&per_page=10&sort_by=created_at&sort_order=desc&search=test'
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should list ADRs without query parameters', async () => {
      const projectId = 'project-123';
      const mockResponse: ADRListResponse = {
        success: true,
        message: 'ADRs retrieved successfully',
        data: [],
        timestamp: '2023-01-01T00:00:00Z',
        meta: {
          page: 1,
          per_page: 10,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false
        }
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await ADRApiService.listADRs(projectId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/projects/project-123/adrs');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });
});

describe('ADRApiService - Data Mapping', () => {
  describe('mapToADR', () => {
    it('should map valid API response to ADR interface', () => {
      const apiResponse = {
        id: 'adr-123',
        project_id: 'project-456',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        alternatives: 'Test alternatives',
        author: 'Test Author',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        tags: ['test', 'example'],
        superseded_by: 'adr-456',
        supersedes: ['adr-001']
      };

      const result = ADRApiService.mapToADR(apiResponse);

      expect(result.id).toBe('adr-123');
      expect(result.project_id).toBe('project-456');
      expect(result.title).toBe('Test ADR');
      expect(result.status).toBe('accepted');
      expect(result.context).toBe('Test context');
      expect(result.decision).toBe('Test decision');
      expect(result.consequences).toBe('Test consequences');
      expect(result.alternatives).toBe('Test alternatives');
      expect(result.author).toBe('Test Author');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.tags).toEqual(['test', 'example']);
      expect(result.superseded_by).toBe('adr-456');
      expect(result.supersedes).toEqual(['adr-001']);
    });

    it('should handle missing optional fields', () => {
      const apiResponse = {
        id: 'adr-123',
        project_id: 'project-456',
        title: 'Test ADR',
        status: 'proposed',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };

      const result = ADRApiService.mapToADR(apiResponse);

      expect(result.alternatives).toBe('');
      expect(result.tags).toEqual([]);
      expect(result.superseded_by).toBeUndefined();
      expect(result.supersedes).toEqual([]);
    });

    it('should throw error for invalid data', () => {
      expect(() => ADRApiService.mapToADR(null)).toThrow('Invalid ADR data: data is null or undefined');
      expect(() => ADRApiService.mapToADR({})).toThrow('Invalid ADR: id is required');
      expect(() => ADRApiService.mapToADR({ id: 'test' })).toThrow('Invalid ADR: title must be a non-empty string');
      expect(() => ADRApiService.mapToADR({ 
        id: 'test', 
        title: 'Test', 
        status: 'invalid' 
      })).toThrow('Invalid ADR: status must be proposed, accepted, rejected, deprecated, or superseded');
    });

    it('should handle invalid date formats gracefully', () => {
      const apiResponse = {
        id: 'adr-123',
        project_id: 'project-456',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        created_at: 'invalid-date',
        updated_at: 'invalid-date',
        tags: [],
        supersedes: []
      };

      const result = ADRApiService.mapToADR(apiResponse);

      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should filter invalid array elements', () => {
      const apiResponse = {
        id: 'adr-123',
        project_id: 'project-456',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        tags: ['valid', null, 123, 'another-valid'],
        supersedes: ['valid-id', null, 456, 'another-valid-id']
      };

      const result = ADRApiService.mapToADR(apiResponse);

      expect(result.tags).toEqual(['valid', 'another-valid']);
      expect(result.supersedes).toEqual(['valid-id', 'another-valid-id']);
    });

    it('should trim whitespace from string fields', () => {
      const apiResponse = {
        id: 'adr-123',
        project_id: 'project-456',
        title: '  Test ADR  ',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: '  Test Author  ',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        tags: [],
        supersedes: []
      };

      const result = ADRApiService.mapToADR(apiResponse);

      expect(result.title).toBe('Test ADR');
      expect(result.author).toBe('Test Author');
    });

    it('should validate required string fields are not empty', () => {
      expect(() => ADRApiService.mapToADR({
        id: 'test',
        title: '   ',
        status: 'accepted',
        context: 'context',
        decision: 'decision',
        consequences: 'consequences',
        author: 'author'
      })).toThrow('Invalid ADR: title must be a non-empty string');

      expect(() => ADRApiService.mapToADR({
        id: 'test',
        title: 'title',
        status: 'accepted',
        context: 'context',
        decision: 'decision',
        consequences: 'consequences',
        author: '   '
      })).toThrow('Invalid ADR: author must be a non-empty string');
    });

    it('should validate all required fields are present', () => {
      const baseData = {
        id: 'test',
        title: 'title',
        status: 'accepted',
        author: 'author'
      };

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        decision: 'decision',
        consequences: 'consequences'
      })).toThrow('Invalid ADR: context must be a string');

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        context: 'context',
        consequences: 'consequences'
      })).toThrow('Invalid ADR: decision must be a string');

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        context: 'context',
        decision: 'decision'
      })).toThrow('Invalid ADR: consequences must be a string');
    });

    it('should validate author field', () => {
      const baseData = {
        id: 'test',
        title: 'title',
        status: 'accepted',
        context: 'context',
        decision: 'decision',
        consequences: 'consequences'
      };

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        author: ''
      })).toThrow('Invalid ADR: author must be a non-empty string');

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        author: '   '
      })).toThrow('Invalid ADR: author must be a non-empty string');

      expect(() => ADRApiService.mapToADR({
        ...baseData,
        author: 123
      })).toThrow('Invalid ADR: author must be a non-empty string');
    });
  });

  describe('Utility Methods', () => {
    it('should check network availability', () => {
      // The service uses navigator.onLine directly in isNetworkAvailable method
      // We can test that it returns the current navigator.onLine value
      const currentOnlineStatus = navigator.onLine;
      expect(ADRApiService.isNetworkAvailable()).toBe(currentOnlineStatus);
    });

    it('should retry requests with exponential backoff', async () => {
      let attemptCount = 0;
      const mockRequestFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw { canRetry: true, type: 'network' };
        }
        return Promise.resolve('success');
      });

      const result = await ADRApiService.retryRequest(mockRequestFn, 3);

      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying after max attempts', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue({ 
        canRetry: true, 
        type: 'network',
        message: 'Network error'
      });

      await expect(ADRApiService.retryRequest(mockRequestFn, 2)).rejects.toMatchObject({
        canRetry: true,
        type: 'network'
      });

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue({ 
        canRetry: false, 
        type: 'validation',
        message: 'Validation error'
      });

      await expect(ADRApiService.retryRequest(mockRequestFn, 3)).rejects.toMatchObject({
        canRetry: false,
        type: 'validation'
      });

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });
});