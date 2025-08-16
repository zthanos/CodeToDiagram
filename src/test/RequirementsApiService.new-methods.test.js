// src/test/RequirementsApiService.new-methods.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Mock the API config
vi.mock('../config/api', () => ({
  apiConfig: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  getVersionedPath: vi.fn((path) => `/api/v1/${path}`)
}));

import { RequirementsApiService } from '../services/RequirementsApiService';
import axios from 'axios';

// Get the mocked axios instance
const mockAxiosInstance = axios.create();

describe('RequirementsApiService - New Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveRequirementsSystem', () => {
    it('should save requirements system data successfully', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const systemData = {
        document: {
          content: '# Requirements Document',
          status: 'draft',
          id: 1,
          project_id: projectId,
          version: 1,
          source_type: 'manual',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        items: [
          {
            id: 'req-1',
            title: 'Test Requirement',
            description: 'Test Description',
            status: 'new',
            priority: 'medium',
            project_id: projectId,
            created_at: new Date(),
            updated_at: new Date(),
            source: 'manual'
          }
        ],
        systems: [{ id: 'sys-1', name: 'Test System' }],
        teams: [{ id: 'team-1', name: 'Test Team' }],
        metadata: { version: '1.0' }
      };
      
      mockAxiosInstance.post.mockResolvedValue({});

      // Act
      await RequirementsApiService.saveRequirementsSystem(projectId, systemData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements-system`,
        {
          document: systemData.document,
          items: systemData.items,
          systems: systemData.systems,
          teams: systemData.teams,
          metadata: systemData.metadata,
          updated_at: expect.any(String)
        }
      );
    });

    it('should handle empty system data', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const systemData = {};
      
      mockAxiosInstance.post.mockResolvedValue({});

      // Act
      await RequirementsApiService.saveRequirementsSystem(projectId, systemData);

      // Assert
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements-system`,
        {
          document: undefined,
          items: undefined,
          systems: undefined,
          teams: undefined,
          metadata: {},
          updated_at: expect.any(String)
        }
      );
    });

    it('should handle API errors when saving system data', async () => {
      // Arrange
      const projectId = 'test-project-123';
      const systemData = { metadata: { test: true } };
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Failed to save requirements system' }
        }
      };
      
      mockAxiosInstance.post.mockRejectedValue(mockError);

      // Act & Assert
      await expect(RequirementsApiService.saveRequirementsSystem(projectId, systemData))
        .rejects.toMatchObject({
          type: 'server',
          message: 'Failed to save requirements system',
          canRetry: true
        });
    });
  });

  describe('updateRequirementStatus', () => {
    it('should update requirement status successfully', async () => {
      // Arrange
      const itemId = 'req-123';
      const newStatus = 'accepted';
      const mockResponse = {
        data: {
          id: itemId,
          title: 'Test Requirement',
          description: 'Test Description',
          status: newStatus,
          priority: 'medium',
          project_id: 'test-project-123',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T01:00:00Z',
          source: 'manual'
        }
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.updateRequirementStatus(itemId, newStatus);

      // Assert
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/v1/requirement-items/${itemId}/status`,
        {
          status: newStatus,
          updated_at: expect.any(String)
        }
      );
      expect(result.status).toBe(newStatus);
      expect(result.id).toBe(itemId);
    });

    it('should handle all valid status values', async () => {
      // Arrange
      const itemId = 'req-123';
      const statuses = ['new', 'accepted', 'rejected'];
      
      for (const status of statuses) {
        const mockResponse = {
          data: {
            id: itemId,
            title: 'Test Requirement',
            description: 'Test Description',
            status: status,
            priority: 'medium',
            project_id: 'test-project-123',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            source: 'manual'
          }
        };
        
        mockAxiosInstance.put.mockResolvedValue(mockResponse);

        // Act
        const result = await RequirementsApiService.updateRequirementStatus(itemId, status);

        // Assert
        expect(result.status).toBe(status);
      }
    });

    it('should handle API errors when updating status', async () => {
      // Arrange
      const itemId = 'req-123';
      const status = 'accepted';
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Requirement item not found' }
        }
      };
      
      mockAxiosInstance.put.mockRejectedValue(mockError);

      // Act & Assert
      await expect(RequirementsApiService.updateRequirementStatus(itemId, status))
        .rejects.toMatchObject({
          type: 'client',
          message: 'Requirement item not found',
          canRetry: false
        });
    });
  });

  describe('bulkUpdateRequirements', () => {
    it('should perform bulk updates successfully', async () => {
      // Arrange
      const updates = [
        {
          id: 'req-1',
          title: 'Updated Requirement 1',
          status: 'accepted'
        },
        {
          id: 'req-2',
          description: 'Updated Description 2',
          priority: 'high'
        },
        {
          id: 'req-3',
          status: 'rejected'
        }
      ];
      
      const mockResponse = {
        data: [
          {
            id: 'req-1',
            title: 'Updated Requirement 1',
            description: 'Original Description 1',
            status: 'accepted',
            priority: 'medium',
            project_id: 'test-project-123',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            source: 'manual'
          },
          {
            id: 'req-2',
            title: 'Original Title 2',
            description: 'Updated Description 2',
            status: 'new',
            priority: 'high',
            project_id: 'test-project-123',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            source: 'manual'
          },
          {
            id: 'req-3',
            title: 'Original Title 3',
            description: 'Original Description 3',
            status: 'rejected',
            priority: 'medium',
            project_id: 'test-project-123',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            source: 'manual'
          }
        ]
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.bulkUpdateRequirements(updates);

      // Assert
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/api/v1/requirement-items/bulk-update`,
        {
          updates: updates.map(update => ({
            ...update,
            updated_at: expect.any(String)
          }))
        }
      );
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Updated Requirement 1');
      expect(result[0].status).toBe('accepted');
      expect(result[1].description).toBe('Updated Description 2');
      expect(result[1].priority).toBe('high');
      expect(result[2].status).toBe('rejected');
    });

    it('should validate updates array is not empty', async () => {
      // Act & Assert
      await expect(RequirementsApiService.bulkUpdateRequirements([]))
        .rejects.toThrow('Updates array must be non-empty');
    });

    it('should validate each update has a valid id', async () => {
      // Arrange
      const invalidUpdates = [
        [{ title: 'No ID' }],
        [{ id: '', title: 'Empty ID' }],
        [{ id: null, title: 'Null ID' }]
      ];

      // Act & Assert
      for (const updates of invalidUpdates) {
        await expect(RequirementsApiService.bulkUpdateRequirements(updates))
          .rejects.toThrow('Each update must have a valid id');
      }
    });

    it('should handle API errors during bulk update', async () => {
      // Arrange
      const updates = [{ id: 'req-1', title: 'Updated Title' }];
      const mockError = {
        response: {
          status: 422,
          data: { 
            message: 'Validation failed',
            details: { 'req-1': ['Title is too long'] }
          }
        }
      };
      
      mockAxiosInstance.put.mockRejectedValue(mockError);

      // Act & Assert
      await expect(RequirementsApiService.bulkUpdateRequirements(updates))
        .rejects.toMatchObject({
          type: 'validation',
          message: 'Validation failed',
          details: { 'req-1': ['Title is too long'] },
          canRetry: false
        });
    });

    it('should handle partial failures in bulk update', async () => {
      // Arrange
      const updates = [
        { id: 'req-1', title: 'Valid Update' },
        { id: 'req-2', title: 'Another Valid Update' }
      ];
      
      const mockResponse = {
        data: [
          {
            id: 'req-1',
            title: 'Valid Update',
            description: 'Description 1',
            status: 'new',
            priority: 'medium',
            project_id: 'test-project-123',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            source: 'manual'
          }
          // Note: Only one item returned, simulating partial success
        ]
      };
      
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      // Act
      const result = await RequirementsApiService.bulkUpdateRequirements(updates);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
      expect(result[0].title).toBe('Valid Update');
    });
  });
});