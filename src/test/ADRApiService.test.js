// src/test/ADRApiService.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock axios
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

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

import { ADRApiService } from '../services/ADRApiService';
import { ApiErrorType } from '../services/ProjectApiService';

describe('ADRApiService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listADRs', () => {
    it('should fetch ADRs for a project successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockResponse = {
        data: [
          {
            id: 'adr-1',
            project_id: projectId,
            title: 'Use React for Frontend',
            status: 'accepted',
            context: 'We need to choose a frontend framework',
            decision: 'We will use React',
            consequences: 'Better developer experience',
            alternatives: 'Vue.js, Angular',
            author: 'John Doe',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tags: ['frontend', 'framework']
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.listADRs(projectId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs`
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'adr-1',
        project_id: projectId,
        title: 'Use React for Frontend',
        status: 'accepted',
        context: 'We need to choose a frontend framework',
        decision: 'We will use React',
        consequences: 'Better developer experience',
        alternatives: 'Vue.js, Angular',
        author: 'John Doe',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        tags: ['frontend', 'framework'],
        superseded_by: undefined,
        supersedes: []
      });
    });

    it('should handle API errors properly', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Project not found' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(ADRApiService.listADRs(projectId))
        .rejects.toMatchObject({
          type: ApiErrorType.CLIENT,
          message: 'Project not found',
          canRetry: false
        });
    });
  });

  describe('getADR', () => {
    it('should fetch a specific ADR successfully', async () => {
      // Arrange
      const adrId = 'adr-123';
      const mockResponse = {
        data: {
          id: adrId,
          project_id: 'test-project-123',
          title: 'Use PostgreSQL for Database',
          status: 'proposed',
          context: 'We need to choose a database',
          decision: 'We will use PostgreSQL',
          consequences: 'ACID compliance and reliability',
          author: 'Jane Smith',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tags: ['database', 'backend']
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.getADR(adrId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/adrs/${adrId}`);
      expect(result.id).toBe(adrId);
      expect(result.title).toBe('Use PostgreSQL for Database');
      expect(result.status).toBe('proposed');
    });

    it('should handle ADR not found', async () => {
      // Arrange
      const adrId = 'non-existent-adr';
      const mockError = {
        response: {
          status: 404,
          data: { message: 'The requested ADR was not found.' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(ADRApiService.getADR(adrId))
        .rejects.toMatchObject({
          type: ApiErrorType.CLIENT,
          message: 'The requested ADR was not found.',
          canRetry: false
        });
    });
  });

  describe('createADR', () => {
    it('should create a new ADR successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const adrData = {
        title: 'Use Microservices Architecture',
        context: 'We need to scale our application',
        decision: 'We will adopt microservices',
        consequences: 'Better scalability but increased complexity',
        alternatives: 'Monolithic architecture',
        author: 'Bob Johnson',
        tags: ['architecture', 'scalability']
      };
      
      const mockResponse = {
        data: {
          id: 'adr-new-123',
          project_id: projectId,
          title: adrData.title,
          status: 'proposed',
          context: adrData.context,
          decision: adrData.decision,
          consequences: adrData.consequences,
          alternatives: adrData.alternatives,
          author: adrData.author,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tags: adrData.tags
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.createADR(projectId, adrData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs`,
        {
          title: adrData.title,
          status: 'proposed',
          context: adrData.context,
          decision: adrData.decision,
          consequences: adrData.consequences,
          alternatives: adrData.alternatives,
          author: adrData.author,
          tags: adrData.tags,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        }
      );
      expect(result.id).toBe('adr-new-123');
      expect(result.title).toBe(adrData.title);
      expect(result.status).toBe('proposed');
    });

    it('should use default status when not provided', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const adrData = {
        title: 'Test ADR',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author'
      };
      
      const mockResponse = {
        data: {
          id: 'adr-new-123',
          project_id: projectId,
          title: adrData.title,
          status: 'proposed',
          context: adrData.context,
          decision: adrData.decision,
          consequences: adrData.consequences,
          author: adrData.author,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          tags: []
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      await ADRApiService.createADR(projectId, adrData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs`,
        expect.objectContaining({
          status: 'proposed',
          tags: []
        })
      );
    });

    it('should handle validation errors', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const adrData = {
        title: '', // Invalid empty title
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author'
      };
      
      const mockError = {
        response: {
          status: 422,
          data: { 
            message: 'Validation error. Please check your input.',
            details: { title: ['Title is required'] }
          }
        }
      };
      
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(ADRApiService.createADR(projectId, adrData))
        .rejects.toMatchObject({
          type: ApiErrorType.VALIDATION,
          message: 'Validation error. Please check your input.',
          details: { title: ['Title is required'] },
          canRetry: false
        });
    });
  });

  describe('updateADR', () => {
    it('should update an existing ADR successfully', async () => {
      // Arrange
      const adrId = 'adr-123';
      const updates = {
        title: 'Updated ADR Title',
        status: 'accepted',
        tags: ['updated', 'architecture']
      };
      
      const mockResponse = {
        data: {
          id: adrId,
          project_id: 'test-project-123',
          title: updates.title,
          status: updates.status,
          context: 'Original context',
          decision: 'Original decision',
          consequences: 'Original consequences',
          author: 'Original Author',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          tags: updates.tags
        }
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.updateADR(adrId, updates);

      // Assert
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/v1/adrs/${adrId}`,
        {
          ...updates,
          updated_at: expect.any(String)
        }
      );
      expect(result.title).toBe(updates.title);
      expect(result.status).toBe(updates.status);
      expect(result.tags).toEqual(updates.tags);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const adrId = 'adr-123';
      const updates = {
        status: 'deprecated'
      };
      
      const mockResponse = {
        data: {
          id: adrId,
          project_id: 'test-project-123',
          title: 'Original Title',
          status: updates.status,
          context: 'Original context',
          decision: 'Original decision',
          consequences: 'Original consequences',
          author: 'Original Author',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          tags: []
        }
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.updateADR(adrId, updates);

      // Assert
      expect(result.status).toBe('deprecated');
      expect(result.title).toBe('Original Title'); // Should remain unchanged
    });
  });

  describe('deleteADR', () => {
    it('should delete an ADR successfully', async () => {
      // Arrange
      const adrId = 'adr-123';
      mockAxiosInstance.delete.mockResolvedValue({});

      // Act
      await ADRApiService.deleteADR(adrId);

      // Assert
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/api/v1/adrs/${adrId}`);
    });

    it('should handle delete errors', async () => {
      // Arrange
      const adrId = 'adr-123';
      const mockError = {
        response: {
          status: 404,
          data: { message: 'ADR not found' }
        }
      };
      
      mockAxiosInstance.delete.mockRejectedValue(mockError);

      // Act & Assert
      await expect(ADRApiService.deleteADR(adrId))
        .rejects.toMatchObject({
          type: ApiErrorType.CLIENT,
          message: 'ADR not found',
          canRetry: false
        });
    });
  });

  describe('searchADRs', () => {
    it('should search ADRs successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const query = 'database';
      const mockResponse = {
        data: [
          {
            id: 'adr-1',
            project_id: projectId,
            title: 'Use PostgreSQL Database',
            status: 'accepted',
            context: 'We need a reliable database',
            decision: 'Use PostgreSQL',
            consequences: 'Better performance',
            author: 'John Doe',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tags: ['database']
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.searchADRs(projectId, query);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs/search?q=${query}`
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('Database');
    });

    it('should handle empty search results', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const query = 'nonexistent';
      const mockResponse = { data: [] };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.searchADRs(projectId, query);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('filterADRs', () => {
    it('should filter ADRs by status', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const options = { status: 'accepted' };
      const mockResponse = {
        data: [
          {
            id: 'adr-1',
            project_id: projectId,
            title: 'Accepted ADR',
            status: 'accepted',
            context: 'Context',
            decision: 'Decision',
            consequences: 'Consequences',
            author: 'Author',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tags: []
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.filterADRs(projectId, options);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs?status=accepted`
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('accepted');
    });

    it('should filter ADRs by multiple criteria', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const options = {
        status: 'accepted',
        tags: ['database', 'backend'],
        author: 'John Doe',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31'
      };
      
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      await ADRApiService.filterADRs(projectId, options);

      // Assert
      const expectedUrl = `/api/v1/projects/${projectId}/adrs?status=accepted&tags=database&tags=backend&author=John%20Doe&date_from=2025-01-01&date_to=2025-12-31`;
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(expectedUrl);
    });

    it('should handle empty filter options', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const options = {};
      const mockResponse = { data: [] };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      await ADRApiService.filterADRs(projectId, options);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs?`
      );
    });
  });

  describe('getADRStats', () => {
    it('should fetch ADR statistics successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockResponse = {
        data: {
          total: 10,
          proposed: 3,
          accepted: 5,
          deprecated: 1,
          superseded: 1
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await ADRApiService.getADRStats(projectId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/adrs/stats`
      );
      expect(result).toEqual({
        total: 10,
        proposed: 3,
        accepted: 5,
        deprecated: 1,
        superseded: 1
      });
    });
  });

  describe('data validation', () => {
    it('should validate ADR mapping with valid data', () => {
      // Arrange
      const validData = {
        id: 'adr-123',
        project_id: 'project-123',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        author: 'Test Author',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        tags: ['test']
      };

      // Act
      const result = ADRApiService.mapToADR(validData);

      // Assert
      expect(result).toEqual({
        id: 'adr-123',
        project_id: 'project-123',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        alternatives: '',
        author: 'Test Author',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        tags: ['test'],
        superseded_by: undefined,
        supersedes: []
      });
    });

    it('should handle invalid ADR data', () => {
      // Test null data
      expect(() => {
        ADRApiService.mapToADR(null);
      }).toThrow('Invalid ADR data: data is null or undefined');

      // Test missing ID
      expect(() => {
        ADRApiService.mapToADR({
          title: 'Test',
          status: 'accepted',
          context: 'Context',
          decision: 'Decision',
          consequences: 'Consequences'
        });
      }).toThrow('Invalid ADR: id is required');

      // Test empty title
      expect(() => {
        ADRApiService.mapToADR({
          id: 'adr-123',
          title: '',
          status: 'accepted',
          context: 'Context',
          decision: 'Decision',
          consequences: 'Consequences'
        });
      }).toThrow('Invalid ADR: title must be a non-empty string');

      // Test invalid status
      expect(() => {
        ADRApiService.mapToADR({
          id: 'adr-123',
          title: 'Test',
          status: 'invalid-status',
          context: 'Context',
          decision: 'Decision',
          consequences: 'Consequences'
        });
      }).toThrow('Invalid ADR: status must be proposed, accepted, deprecated, or superseded');

      // Test missing context
      expect(() => {
        ADRApiService.mapToADR({
          id: 'adr-123',
          title: 'Test',
          status: 'accepted',
          decision: 'Decision',
          consequences: 'Consequences'
        });
      }).toThrow('Invalid ADR: context must be a string');
    });

    it('should handle date parsing errors gracefully', () => {
      // Arrange
      const dataWithInvalidDates = {
        id: 'adr-123',
        project_id: 'project-123',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
        created_at: 'invalid-date',
        updated_at: 'invalid-date'
      };

      // Act
      const result = ADRApiService.mapToADR(dataWithInvalidDates);

      // Assert
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const minimalData = {
        id: 'adr-123',
        project_id: 'project-123',
        title: 'Test ADR',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences'
      };

      // Act
      const result = ADRApiService.mapToADR(minimalData);

      // Assert
      expect(result.alternatives).toBe('');
      expect(result.author).toBe('Unknown');
      expect(result.tags).toEqual([]);
      expect(result.superseded_by).toBeUndefined();
      expect(result.supersedes).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const networkError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };
      
      mockAxiosInstance.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ADRApiService.listADRs(projectId))
        .rejects.toMatchObject({
          type: ApiErrorType.TIMEOUT,
          message: 'Request timed out. The server may be busy.',
          canRetry: true
        });
    });

    it('should handle server errors', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(serverError);

      // Act & Assert
      await expect(ADRApiService.listADRs(projectId))
        .rejects.toMatchObject({
          type: ApiErrorType.SERVER,
          message: 'Internal server error',
          canRetry: true
        });
    });

    it('should handle offline scenarios', async () => {
      // Arrange
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      const projectId = 'test-project-123';
      const networkError = {
        message: 'Network Error'
      };
      
      mockAxiosInstance.get.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ADRApiService.listADRs(projectId))
        .rejects.toMatchObject({
          type: ApiErrorType.NETWORK,
          message: 'No internet connection. Please check your network and try again.',
          canRetry: true
        });

      // Cleanup
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    });
  });

  describe('utility methods', () => {
    it('should check network availability', () => {
      // Test online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      expect(ADRApiService.isNetworkAvailable()).toBe(true);

      // Test offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      expect(ADRApiService.isNetworkAvailable()).toBe(false);
    });

    it('should retry requests with exponential backoff', async () => {
      // Arrange
      let attemptCount = 0;
      const mockRequestFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw { canRetry: true, type: ApiErrorType.SERVER };
        }
        return Promise.resolve('success');
      });

      // Act
      const result = await ADRApiService.retryRequest(mockRequestFn, 3);

      // Assert
      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying on non-retryable errors', async () => {
      // Arrange
      const mockRequestFn = vi.fn().mockRejectedValue({
        canRetry: false,
        type: ApiErrorType.VALIDATION
      });

      // Act & Assert
      await expect(ADRApiService.retryRequest(mockRequestFn, 3))
        .rejects.toMatchObject({
          canRetry: false,
          type: ApiErrorType.VALIDATION
        });
      
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });
});