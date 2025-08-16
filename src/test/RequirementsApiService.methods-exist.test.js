// src/test/RequirementsApiService.methods-exist.test.js

import { describe, it, expect } from 'vitest';
import { RequirementsApiService } from '../services/RequirementsApiService';

describe('RequirementsApiService - New Methods Exist', () => {
  it('should have saveRequirementsSystem method', () => {
    expect(typeof RequirementsApiService.saveRequirementsSystem).toBe('function');
  });

  it('should have updateRequirementStatus method', () => {
    expect(typeof RequirementsApiService.updateRequirementStatus).toBe('function');
  });

  it('should have bulkUpdateRequirements method', () => {
    expect(typeof RequirementsApiService.bulkUpdateRequirements).toBe('function');
  });

  it('should validate bulkUpdateRequirements input', async () => {
    // Test empty array validation
    await expect(RequirementsApiService.bulkUpdateRequirements([]))
      .rejects.toThrow('Updates array must be non-empty');
  });

  it('should validate bulkUpdateRequirements requires valid ids', async () => {
    // Test missing id validation
    await expect(RequirementsApiService.bulkUpdateRequirements([{ title: 'No ID' }]))
      .rejects.toThrow('Each update must have a valid id');
      
    // Test empty id validation
    await expect(RequirementsApiService.bulkUpdateRequirements([{ id: '', title: 'Empty ID' }]))
      .rejects.toThrow('Each update must have a valid id');
  });
});