import { describe, it, expect, vi } from 'vitest';
import { ADRApiService } from '../../services/ADRApiService';
import { ADR, ADRStatus } from '../../types/adr';

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

      expect(result.alternatives).toBeUndefined();
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
      })).toThrow('Invalid ADR: status must be proposed, accepted, deprecated, or superseded');
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