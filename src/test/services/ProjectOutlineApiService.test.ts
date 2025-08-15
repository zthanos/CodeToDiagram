// src/test/services/ProjectOutlineApiService.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { ProjectOutlineApiService } from '../../services/ProjectOutlineApiService';
import { ProjectOutline, OutlineVersion } from '../../types/projectOutline';
import { ApiErrorType } from '../../services/ProjectApiService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock API config
vi.mock('../../config/api', () => ({
  apiConfig: {
    baseUrl: 'http://localhost:8000',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },
  getVersionedPath: (path: string) => `/api/v1/${path}`
}));

// Create a global mock axios instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

describe('ProjectOutlineApiService', () => {
  const mockProjectId = 'test-project-123';
  const mockOutlineData = {
    id: '1',
    project_id: mockProjectId,
    content: '# Test Project Outline\n\nThis is a test outline.',
    status: 'draft',
    version: 1,
    working_version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockVersionData = {
    version: 1,
    content: '# Test Project Outline\n\nThis is a test outline.',
    status: 'draft',
    created_at: '2024-01-01T00:00:00Z',
    changes_summary: 'Initial version'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock functions
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockAxiosInstance.interceptors.request.use.mockReset();
    mockAxiosInstance.interceptors.response.use.mockReset();
    
    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    // Initialize the service to set up interceptors
    ProjectOutlineApiService.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Model Mapping', () => {
    describe('mapToProjectOutline', () => {
      it('should map valid API response to ProjectOutline interface', () => {
        const result = ProjectOutlineApiService.mapToProjectOutline(mockOutlineData);

        expect(result).toEqual({
          id: '1',
          project_id: mockProjectId,
          content: '# Test Project Outline\n\nThis is a test outline.',
          status: 'draft',
          version: 1,
          working_version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          versions: undefined
        });
      });

      it('should handle numeric ID and convert to string', () => {
        const dataWithNumericId = { ...mockOutlineData, id: 123 };
        const result = ProjectOutlineApiService.mapToProjectOutline(dataWithNumericId);

        expect(result.id).toBe('123');
        expect(typeof result.id).toBe('string');
      });

      it('should set default version values when missing', () => {
        const dataWithoutVersions = {
          ...mockOutlineData,
          version: undefined,
          working_version: undefined
        };
        const result = ProjectOutlineApiService.mapToProjectOutline(dataWithoutVersions);

        expect(result.version).toBe(1);
        expect(result.working_version).toBe(1);
      });

      it('should set default timestamps when missing', () => {
        const dataWithoutTimestamps = {
          ...mockOutlineData,
          created_at: undefined,
          updated_at: undefined
        };
        const result = ProjectOutlineApiService.mapToProjectOutline(dataWithoutTimestamps);

        expect(result.created_at).toBeDefined();
        expect(result.updated_at).toBeDefined();
        expect(new Date(result.created_at).getTime()).toBeGreaterThan(0);
        expect(new Date(result.updated_at).getTime()).toBeGreaterThan(0);
      });

      it('should throw error for null or undefined data', () => {
        expect(() => ProjectOutlineApiService.mapToProjectOutline(null)).toThrow(
          'Invalid project outline data: data is null or undefined'
        );
        expect(() => ProjectOutlineApiService.mapToProjectOutline(undefined)).toThrow(
          'Invalid project outline data: data is null or undefined'
        );
      });

      it('should throw error for missing required fields', () => {
        expect(() => ProjectOutlineApiService.mapToProjectOutline({})).toThrow(
          'Invalid project outline: project_id is required'
        );

        expect(() => ProjectOutlineApiService.mapToProjectOutline({ project_id: 'test' })).toThrow(
          'Invalid project outline: content must be a string'
        );

        expect(() => ProjectOutlineApiService.mapToProjectOutline({
          project_id: 'test',
          content: 'test content'
        })).toThrow(
          'Invalid project outline: status must be draft, active, or archived'
        );
      });

      it('should throw error for invalid status values', () => {
        const invalidStatusData = { ...mockOutlineData, status: 'invalid' };
        expect(() => ProjectOutlineApiService.mapToProjectOutline(invalidStatusData)).toThrow(
          'Invalid project outline: status must be draft, active, or archived'
        );
      });

      it('should throw error for invalid ID types', () => {
        const invalidIdData = { ...mockOutlineData, id: null };
        expect(() => ProjectOutlineApiService.mapToProjectOutline(invalidIdData)).toThrow(
          'Invalid project outline: id is required and must be a string or number'
        );
      });
    });

    describe('mapToOutlineVersion', () => {
      it('should map valid API response to OutlineVersion interface', () => {
        const result = ProjectOutlineApiService.mapToOutlineVersion(mockVersionData);

        expect(result).toEqual({
          version: 1,
          content: '# Test Project Outline\n\nThis is a test outline.',
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          changes_summary: 'Initial version'
        });
      });

      it('should set default values for optional fields', () => {
        const minimalVersionData = {
          version: 2,
          content: 'Updated content'
        };
        const result = ProjectOutlineApiService.mapToOutlineVersion(minimalVersionData);

        expect(result.status).toBe('draft');
        expect(result.created_at).toBeDefined();
        expect(result.changes_summary).toBeUndefined();
      });

      it('should throw error for null or undefined data', () => {
        expect(() => ProjectOutlineApiService.mapToOutlineVersion(null)).toThrow(
          'Invalid outline version data: data is null or undefined'
        );
      });

      it('should throw error for invalid version number', () => {
        const invalidVersionData = { ...mockVersionData, version: 'invalid' };
        expect(() => ProjectOutlineApiService.mapToOutlineVersion(invalidVersionData)).toThrow(
          'Invalid outline version: version must be a number'
        );
      });

      it('should throw error for invalid content type', () => {
        const invalidContentData = { ...mockVersionData, content: 123 };
        expect(() => ProjectOutlineApiService.mapToOutlineVersion(invalidContentData)).toThrow(
          'Invalid outline version: content must be a string'
        );
      });
    });
  });

  describe('API Methods', () => {

    describe('getProjectOutline', () => {
      it('should fetch project outline successfully', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockOutlineData
        });

        const result = await ProjectOutlineApiService.getProjectOutline(mockProjectId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/projects/${mockProjectId}/outline`);
        expect(result).toEqual(expect.objectContaining({
          id: '1',
          project_id: mockProjectId,
          content: mockOutlineData.content,
          status: 'draft'
        }));
      });

      it('should handle API errors properly', async () => {
        const mockError = new Error('Network Error') as any;
        mockError.response = {
          status: 404,
          data: { message: 'Project not found' }
        };
        mockAxiosInstance.get.mockRejectedValue(mockError);

        await expect(ProjectOutlineApiService.getProjectOutline(mockProjectId))
          .rejects.toMatchObject({
            type: ApiErrorType.CLIENT,
            message: 'Project not found'
          });
      });
    });

    describe('getOutlineVersions', () => {
      it('should fetch outline versions successfully', async () => {
        const mockVersionsResponse = {
          data: {
            data: [mockVersionData, { ...mockVersionData, version: 2 }]
          }
        };
        mockAxiosInstance.get.mockResolvedValue(mockVersionsResponse);

        const result = await ProjectOutlineApiService.getOutlineVersions(mockProjectId);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/projects/${mockProjectId}/solution-outlines`);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(expect.objectContaining({
          version: 1,
          content: mockVersionData.content
        }));
      });

      it('should handle non-paginated response', async () => {
        const mockVersionsResponse = {
          data: [mockVersionData]
        };
        mockAxiosInstance.get.mockResolvedValue(mockVersionsResponse);

        const result = await ProjectOutlineApiService.getOutlineVersions(mockProjectId);

        expect(result).toHaveLength(1);
        expect(result[0].version).toBe(1);
      });

      it('should return empty array for invalid response', async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: null });

        const result = await ProjectOutlineApiService.getOutlineVersions(mockProjectId);

        expect(result).toEqual([]);
      });
    });

    describe('getOutlineVersion', () => {
      it('should fetch specific outline version successfully', async () => {
        mockAxiosInstance.get.mockResolvedValue({
          data: mockOutlineData
        });

        const result = await ProjectOutlineApiService.getOutlineVersion(mockProjectId, 1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/projects/${mockProjectId}/solution-outlines/1`);
        expect(result.version).toBe(1);
      });
    });

    describe('updateOutlineStatus', () => {
      it('should update outline status successfully', async () => {
        // Mock the initial getProjectOutline call
        mockAxiosInstance.get.mockResolvedValue({
          data: mockOutlineData
        });

        // Mock the status update call
        const updatedOutlineData = { ...mockOutlineData, status: 'active' };
        mockAxiosInstance.patch.mockResolvedValue({
          data: updatedOutlineData
        });

        const result = await ProjectOutlineApiService.updateOutlineStatus(mockProjectId, 'active');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/api/v1/projects/${mockProjectId}/outline`);
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          `/api/v1/solution-outlines/1/status`,
          null,
          { params: { status: 'active' } }
        );
        expect(result.status).toBe('active');
      });
    });

    describe('saveProjectOutline', () => {
      it('should save project outline successfully', async () => {
        const newContent = '# Updated Project Outline\n\nThis is updated content.';
        const savedOutlineData = { ...mockOutlineData, content: newContent };
        
        mockAxiosInstance.post.mockResolvedValue({
          data: savedOutlineData
        });

        const result = await ProjectOutlineApiService.saveProjectOutline(
          mockProjectId,
          newContent,
          'draft'
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          `/api/v1/projects/${mockProjectId}/solution-outlines`,
          null,
          {
            params: {
              content: newContent,
              status: 'draft'
            }
          }
        );
        expect(result.content).toBe(newContent);
      });

      it('should use default status when not provided', async () => {
        const newContent = '# New Content';
        mockAxiosInstance.post.mockResolvedValue({
          data: { ...mockOutlineData, content: newContent }
        });

        await ProjectOutlineApiService.saveProjectOutline(mockProjectId, newContent);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          expect.any(String),
          null,
          expect.objectContaining({
            params: expect.objectContaining({
              status: 'draft'
            })
          })
        );
      });
    });
  });

  describe('Error Handling', () => {

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error') as any;
      networkError.code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(ProjectOutlineApiService.getProjectOutline(mockProjectId))
        .rejects.toMatchObject({
          type: ApiErrorType.TIMEOUT,
          canRetry: true
        });
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation Error') as any;
      validationError.response = {
        status: 422,
        data: {
          message: 'Validation failed',
          details: ['Content is required']
        }
      };
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(ProjectOutlineApiService.saveProjectOutline(mockProjectId, ''))
        .rejects.toMatchObject({
          type: ApiErrorType.VALIDATION,
          canRetry: false,
          details: ['Content is required']
        });
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server Error') as any;
      serverError.response = {
        status: 500,
        data: { message: 'Internal server error' }
      };
      mockAxiosInstance.get.mockRejectedValue(serverError);

      await expect(ProjectOutlineApiService.getProjectOutline(mockProjectId))
        .rejects.toMatchObject({
          type: ApiErrorType.SERVER,
          canRetry: true
        });
    });
  });

  describe('Utility Methods', () => {
    it('should check network availability', () => {
      // Mock navigator.onLine
      const originalOnLine = navigator.onLine;
      
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      expect(ProjectOutlineApiService.isNetworkAvailable()).toBe(true);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      expect(ProjectOutlineApiService.isNetworkAvailable()).toBe(false);
      
      // Restore original value
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnLine
      });
    });

    it('should retry requests with exponential backoff', async () => {
      const mockRequestFn = vi.fn()
        .mockRejectedValueOnce({ canRetry: true })
        .mockRejectedValueOnce({ canRetry: true })
        .mockResolvedValueOnce('success');

      const result = await ProjectOutlineApiService.retryRequest(mockRequestFn, 3);

      expect(mockRequestFn).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    it('should stop retrying for non-retryable errors', async () => {
      const mockRequestFn = vi.fn()
        .mockRejectedValue({ canRetry: false, message: 'Non-retryable error' });

      await expect(ProjectOutlineApiService.retryRequest(mockRequestFn, 3))
        .rejects.toMatchObject({
          canRetry: false,
          message: 'Non-retryable error'
        });

      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const mockRequestFn = vi.fn()
        .mockRejectedValue({ canRetry: true, message: 'Retryable error' });

      await expect(ProjectOutlineApiService.retryRequest(mockRequestFn, 2))
        .rejects.toMatchObject({
          canRetry: true,
          message: 'Retryable error'
        });

      expect(mockRequestFn).toHaveBeenCalledTimes(2);
    });
  });
});