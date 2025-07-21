import { describe, it, expect, vi } from 'vitest';
import { ProjectApiService, ApiErrorType } from '../services/ProjectApiService';

describe('ProjectApiService Error Handling', () => {
  describe('Network Connectivity Detection', () => {
    it('should detect network availability', () => {
      const isAvailable = ProjectApiService.isNetworkAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('Retry Logic', () => {
    it('should retry requests with exponential backoff', async () => {
      let callCount = 0;
      const mockRequest = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw { type: ApiErrorType.SERVER, canRetry: true, message: 'Server error' };
        }
        return Promise.resolve({ data: 'success' });
      });

      const result = await ProjectApiService.retryRequest(mockRequest, 3);
      
      expect(callCount).toBe(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = {
        type: ApiErrorType.VALIDATION,
        canRetry: false,
        message: 'Validation error'
      };

      const mockRequest = vi.fn().mockRejectedValue(nonRetryableError);

      try {
        await ProjectApiService.retryRequest(mockRequest, 3);
      } catch (error) {
        expect(mockRequest).toHaveBeenCalledTimes(1);
        expect(error).toEqual(nonRetryableError);
      }
    });

    it('should stop retrying after max attempts', async () => {
      const retryableError = {
        type: ApiErrorType.SERVER,
        canRetry: true,
        message: 'Server error'
      };

      const mockRequest = vi.fn().mockRejectedValue(retryableError);

      try {
        await ProjectApiService.retryRequest(mockRequest, 2);
      } catch (error) {
        expect(mockRequest).toHaveBeenCalledTimes(2);
        expect(error).toEqual(retryableError);
      }
    });
  });

  describe('Error Types', () => {
    it('should have all required error types defined', () => {
      expect(ApiErrorType.NETWORK).toBe('network');
      expect(ApiErrorType.VALIDATION).toBe('validation');
      expect(ApiErrorType.SERVER).toBe('server');
      expect(ApiErrorType.CLIENT).toBe('client');
      expect(ApiErrorType.TIMEOUT).toBe('timeout');
      expect(ApiErrorType.UNKNOWN).toBe('unknown');
    });
  });

  describe('Service Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        ProjectApiService.initialize();
      }).not.toThrow();
    });
  });
});