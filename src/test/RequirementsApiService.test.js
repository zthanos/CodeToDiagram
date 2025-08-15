// src/test/RequirementsApiService.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire RequirementsApiService module
vi.mock('../services/RequirementsApiService', async () => {
  const actual = await vi.importActual('../services/RequirementsApiService');
  return {
    ...actual,
    RequirementsApiService: {
      ...actual.RequirementsApiService,
      initialize: vi.fn(),
      getLatestRequirements: vi.fn(),
      uploadRequirementsPdf: vi.fn(),
      saveRequirementsDocument: vi.fn(),
      createRequirementItem: vi.fn(),
      updateRequirementItem: vi.fn(),
      deleteRequirementItem: vi.fn(),
      listRequirementItems: vi.fn(),
      isNetworkAvailable: vi.fn(),
      retryRequest: vi.fn(),
      mapToRequirementsDocument: vi.fn(),
      mapToRequirementItem: vi.fn()
    }
  };
});

import { RequirementsApiService } from '../services/RequirementsApiService';
import { ApiErrorType } from '../services/ProjectApiService';

describe('RequirementsApiService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLatestRequirements', () => {
    it('should fetch latest requirements document successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockResponse = {
        data: {
          content: '# Test Requirements',
          status: 'draft',
          id: 1,
          project_id: projectId,
          version: 1,
          source_type: 'manual',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.getLatestRequirements(projectId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/latest`
      );
      expect(result).toEqual({
        content: '# Test Requirements',
        status: 'draft',
        id: 1,
        project_id: projectId,
        version: 1,
        source_type: 'manual',
        original_filename: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      });
    });

    it('should handle API errors properly', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Requirements not found' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(mockError);

      // Act & Assert
      await expect(RequirementsApiService.getLatestRequirements(projectId))
        .rejects.toMatchObject({
          type: ApiErrorType.CLIENT,
          message: 'Requirements not found',
          canRetry: false
        });
    });

    it('should validate response data', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockResponse = {
        data: {
          // Missing required fields
          content: null,
          status: 'invalid-status'
        }
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(RequirementsApiService.getLatestRequirements(projectId))
        .rejects.toThrow('Invalid requirements document: content must be a string');
    });
  });

  describe('uploadRequirementsPdf', () => {
    it('should upload PDF file successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const status = 'draft';
      
      const mockResponse = {
        data: {
          content: '# Extracted Requirements',
          status: 'draft',
          id: 2,
          project_id: projectId,
          version: 1,
          source_type: 'pdf',
          original_filename: 'test.pdf',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.uploadRequirementsPdf(projectId, mockFile, status);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/upload-pdf`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000
        }
      );
      
      // Verify FormData contents
      const formDataCall = mockAxiosInstance.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
      
      expect(result).toEqual({
        content: '# Extracted Requirements',
        status: 'draft',
        id: 2,
        project_id: projectId,
        version: 1,
        source_type: 'pdf',
        original_filename: 'test.pdf',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      });
    });

    it('should use default status when not provided', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      const mockResponse = {
        data: {
          content: '# Extracted Requirements',
          status: 'draft',
          id: 2,
          project_id: projectId,
          version: 1,
          source_type: 'pdf',
          original_filename: 'test.pdf',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      await RequirementsApiService.uploadRequirementsPdf(projectId, mockFile);

      // Assert
      const formDataCall = mockAxiosInstance.post.mock.calls[0][1];
      expect(formDataCall).toBeInstanceOf(FormData);
    });

    it('should handle upload errors', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockError = {
        response: {
          status: 422,
          data: { 
            message: 'Invalid PDF file',
            details: { file: ['File format not supported'] }
          }
        }
      };
      
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(RequirementsApiService.uploadRequirementsPdf(projectId, mockFile))
        .rejects.toMatchObject({
          type: ApiErrorType.VALIDATION,
          message: 'Invalid PDF file',
          details: { file: ['File format not supported'] },
          canRetry: false
        });
    });
  });

  describe('saveRequirementsDocument', () => {
    it('should save requirements document successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const content = '# Updated Requirements';
      const status = 'published';
      
      const mockResponse = {
        data: {
          content,
          status,
          id: 1,
          project_id: projectId,
          version: 2,
          source_type: 'manual',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.saveRequirementsDocument(projectId, content, status);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements`,
        {
          content,
          status
        }
      );
      expect(result.content).toBe(content);
      expect(result.status).toBe(status);
      expect(result.version).toBe(2);
    });

    it('should use default status when not provided', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const content = '# Updated Requirements';
      
      const mockResponse = {
        data: {
          content,
          status: 'draft',
          id: 1,
          project_id: projectId,
          version: 2,
          source_type: 'manual',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      await RequirementsApiService.saveRequirementsDocument(projectId, content);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements`,
        {
          content,
          status: 'draft'
        }
      );
    });
  });

  describe('createRequirementItem', () => {
    it('should create requirement item successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const itemData = {
        title: 'New Requirement',
        description: 'This is a new requirement',
        status: 'new'
      };
      
      const mockResponse = {
        data: {
          id: 'req-123',
          title: itemData.title,
          description: itemData.description,
          status: itemData.status,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          source: 'manual'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.createRequirementItem(projectId, itemData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/items`,
        {
          title: itemData.title,
          description: itemData.description,
          status: itemData.status
        }
      );
      expect(result).toEqual({
        id: 'req-123',
        title: itemData.title,
        description: itemData.description,
        status: itemData.status,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        source: 'manual'
      });
    });

    it('should use default status when not provided', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const itemData = {
        title: 'New Requirement',
        description: 'This is a new requirement'
      };
      
      const mockResponse = {
        data: {
          id: 'req-123',
          title: itemData.title,
          description: itemData.description,
          status: 'new',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          source: 'manual'
        }
      };
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Act
      await RequirementsApiService.createRequirementItem(projectId, itemData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/items`,
        {
          title: itemData.title,
          description: itemData.description,
          status: 'new'
        }
      );
    });
  });

  describe('updateRequirementItem', () => {
    it('should update requirement item successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const itemId = 'req-123';
      const updates = {
        title: 'Updated Requirement',
        status: 'accepted'
      };
      
      const mockResponse = {
        data: {
          id: itemId,
          title: updates.title,
          description: 'Original description',
          status: updates.status,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          source: 'manual'
        }
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.updateRequirementItem(projectId, itemId, updates);

      // Assert
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/items/${itemId}`,
        updates
      );
      expect(result.title).toBe(updates.title);
      expect(result.status).toBe(updates.status);
    });
  });

  describe('deleteRequirementItem', () => {
    it('should delete requirement item successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const itemId = 'req-123';
      
      mockAxiosInstance.delete.mockResolvedValue({});

      // Act
      await RequirementsApiService.deleteRequirementItem(projectId, itemId);

      // Assert
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/items/${itemId}`
      );
    });
  });

  describe('listRequirementItems', () => {
    it('should list requirement items successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const mockResponse = {
        data: [
          {
            id: 'req-1',
            title: 'Requirement 1',
            description: 'Description 1',
            status: 'new',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            source: 'manual'
          },
          {
            id: 'req-2',
            title: 'Requirement 2',
            description: 'Description 2',
            status: 'accepted',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            source: 'pdf'
          }
        ]
      };
      
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.listRequirementItems(projectId);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/items`
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req-1');
      expect(result[1].id).toBe('req-2');
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
      await expect(RequirementsApiService.getLatestRequirements(projectId))
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
      await expect(RequirementsApiService.getLatestRequirements(projectId))
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
      await expect(RequirementsApiService.getLatestRequirements(projectId))
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

  describe('data validation', () => {
    it('should validate RequirementsDocument mapping', () => {
      // Test invalid data scenarios
      expect(() => {
        RequirementsApiService.mapToRequirementsDocument(null);
      }).toThrow('Invalid requirements document data: data is null or undefined');

      expect(() => {
        RequirementsApiService.mapToRequirementsDocument({
          content: null,
          status: 'draft'
        });
      }).toThrow('Invalid requirements document: content must be a string');

      expect(() => {
        RequirementsApiService.mapToRequirementsDocument({
          content: 'test',
          status: 'invalid-status'
        });
      }).toThrow('Invalid requirements document: status must be draft, published, or archived');
    });

    it('should validate RequirementItem mapping', () => {
      // Test invalid data scenarios
      expect(() => {
        RequirementsApiService.mapToRequirementItem(null);
      }).toThrow('Invalid requirement item data: data is null or undefined');

      expect(() => {
        RequirementsApiService.mapToRequirementItem({
          id: 'test',
          title: '',
          description: 'test'
        });
      }).toThrow('Invalid requirement item: title must be a non-empty string');

      expect(() => {
        RequirementsApiService.mapToRequirementItem({
          id: 'test',
          title: 'test',
          description: 'test',
          status: 'invalid-status'
        });
      }).toThrow('Invalid requirement item: status must be new, accepted, or rejected');
    });
  });

  describe('utility methods', () => {
    it('should check network availability', () => {
      // Test online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      expect(RequirementsApiService.isNetworkAvailable()).toBe(true);

      // Test offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      expect(RequirementsApiService.isNetworkAvailable()).toBe(false);
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
      const result = await RequirementsApiService.retryRequest(mockRequestFn, 3);

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
      await expect(RequirementsApiService.retryRequest(mockRequestFn, 3))
        .rejects.toMatchObject({
          canRetry: false,
          type: ApiErrorType.VALIDATION
        });
      
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });
});