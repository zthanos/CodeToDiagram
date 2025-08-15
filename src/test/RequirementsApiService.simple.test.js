// src/test/RequirementsApiService.simple.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RequirementsApiService', () => {
  let RequirementsApiService;

  beforeEach(async () => {
    // Mock axios and dependencies
    vi.doMock('axios', () => ({
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

    vi.doMock('../config/api', () => ({
      apiConfig: {
        baseUrl: 'http://localhost:8000',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
      },
      getVersionedPath: (path) => `/api/v1/${path}`
    }));

    // Import after mocking
    const module = await import('../services/RequirementsApiService');
    RequirementsApiService = module.RequirementsApiService;
  });

  describe('data validation', () => {
    it('should validate RequirementsDocument mapping', () => {
      // Test valid data
      const validData = {
        content: '# Test Requirements',
        status: 'draft',
        id: 1,
        project_id: 'test-project',
        version: 1,
        source_type: 'manual',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = RequirementsApiService.mapToRequirementsDocument(validData);
      expect(result).toEqual({
        content: '# Test Requirements',
        status: 'draft',
        id: 1,
        project_id: 'test-project',
        version: 1,
        source_type: 'manual',
        original_filename: undefined,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      });
    });

    it('should throw error for invalid RequirementsDocument data', () => {
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
      // Test valid data
      const validData = {
        id: 'req-123',
        title: 'Test Requirement',
        description: 'Test description',
        status: 'new',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        source: 'manual'
      };

      const result = RequirementsApiService.mapToRequirementItem(validData);
      expect(result).toEqual({
        id: 'req-123',
        title: 'Test Requirement',
        description: 'Test description',
        status: 'new',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        source: 'manual'
      });
    });

    it('should throw error for invalid RequirementItem data', () => {
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
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      expect(RequirementsApiService.isNetworkAvailable()).toBe(true);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      expect(RequirementsApiService.isNetworkAvailable()).toBe(false);
    });

    it('should retry requests with exponential backoff', async () => {
      let attemptCount = 0;
      const mockRequestFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw { canRetry: true, type: 'server' };
        }
        return Promise.resolve('success');
      });

      const result = await RequirementsApiService.retryRequest(mockRequestFn, 3);
      expect(result).toBe('success');
      expect(mockRequestFn).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying on non-retryable errors', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue({
        canRetry: false,
        type: 'validation'
      });

      await expect(RequirementsApiService.retryRequest(mockRequestFn, 3))
        .rejects.toMatchObject({
          canRetry: false,
          type: 'validation'
        });
      
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('API methods structure', () => {
    it('should have all required API methods', () => {
      expect(typeof RequirementsApiService.getLatestRequirements).toBe('function');
      expect(typeof RequirementsApiService.uploadRequirementsPdf).toBe('function');
      expect(typeof RequirementsApiService.saveRequirementsDocument).toBe('function');
      expect(typeof RequirementsApiService.createRequirementItem).toBe('function');
      expect(typeof RequirementsApiService.updateRequirementItem).toBe('function');
      expect(typeof RequirementsApiService.deleteRequirementItem).toBe('function');
      expect(typeof RequirementsApiService.listRequirementItems).toBe('function');
    });

    it('should have utility methods', () => {
      expect(typeof RequirementsApiService.isNetworkAvailable).toBe('function');
      expect(typeof RequirementsApiService.retryRequest).toBe('function');
      expect(typeof RequirementsApiService.initialize).toBe('function');
    });

    it('should have data mapping methods', () => {
      expect(typeof RequirementsApiService.mapToRequirementsDocument).toBe('function');
      expect(typeof RequirementsApiService.mapToRequirementItem).toBe('function');
    });
  });
});