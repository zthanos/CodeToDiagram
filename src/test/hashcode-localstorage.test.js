import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MermaidRenderer from '../components/MermaidRenderer.vue';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    store,
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => Object.keys(store)[index] || null)
  };
})();

// Mock Web Crypto API for consistent testing
const mockCrypto = {
  subtle: {
    digest: vi.fn(async (algorithm, data) => {
      // Simple mock hash for testing - converts data to consistent hash
      const text = new TextDecoder().decode(data);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      // Convert to ArrayBuffer to match Web Crypto API
      const hashArray = new Uint8Array(32); // SHA-256 produces 32 bytes
      const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
      for (let i = 0; i < 8 && i < hashArray.length; i++) {
        hashArray[i] = parseInt(hashHex.substr(i * 2, 2), 16) || 0;
      }

      return hashArray.buffer;
    })
  }
};

describe('Hashcode-based localStorage System', () => {
  let wrapper;
  let component;

  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    Object.defineProperty(window, 'crypto', {
      value: mockCrypto,
      writable: true
    });

    // Clear localStorage before each test
    localStorageMock.clear();
    localStorageMock.store = {};
    vi.clearAllMocks();

    // Reset localStorage mock functions
    localStorageMock.setItem = vi.fn((key, value) => {
      localStorageMock.store[key] = value.toString();
    });

    // Mount component
    wrapper = mount(MermaidRenderer, {
      props: {
        theme: 'default'
      }
    });
    component = wrapper.vm;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  describe('Hash Generation Consistency', () => {
    it('should generate consistent hashes for identical content', async () => {
      const content = 'graph TD\n    A --> B\n    B --> C';
      const fileName = 'test.mmd';

      const hash1 = await component.generateFileHash(content, fileName);
      const hash2 = await component.generateFileHash(content, fileName);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should generate different hashes for different content', async () => {
      const content1 = 'graph TD\n    A --> B';
      const content2 = 'graph TD\n    A --> C';
      const fileName = 'test.mmd';

      const hash1 = await component.generateFileHash(content1, fileName);
      const hash2 = await component.generateFileHash(content2, fileName);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different filenames with same content', async () => {
      const content = 'graph TD\n    A --> B';
      const fileName1 = 'test1.mmd';
      const fileName2 = 'test2.mmd';

      const hash1 = await component.generateFileHash(content, fileName1);
      const hash2 = await component.generateFileHash(content, fileName2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle null filename gracefully', async () => {
      const content = 'graph TD\n    A --> B';

      const hash1 = await component.generateFileHash(content, null);
      const hash2 = await component.generateFileHash(content, undefined);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should fallback to simple hash when Web Crypto API is not available', async () => {
      // Temporarily remove crypto API
      const originalCrypto = window.crypto;
      delete window.crypto;

      const content = 'graph TD\n    A --> B';
      const fileName = 'test.mmd';

      const hash = await component.generateFileHash(content, fileName);

      expect(hash).toHaveLength(16);
      expect(typeof hash).toBe('string');

      // Restore crypto API
      window.crypto = originalCrypto;
    });
  });

  describe('Storage Key Generation', () => {
    it('should generate correct storage keys for autosave', () => {
      const hash = 'abcd1234efgh5678';
      const key = component.getStorageKey(hash, 'autosave');

      expect(key).toBe('mermaid-file-abcd1234efgh5678-autosave');
    });

    it('should generate correct storage keys for manual save', () => {
      const hash = 'abcd1234efgh5678';
      const key = component.getStorageKey(hash, 'manual');

      expect(key).toBe('mermaid-file-abcd1234efgh5678-manual');
    });

    it('should default to autosave type for invalid types', () => {
      const hash = 'abcd1234efgh5678';
      const key = component.getStorageKey(hash, 'invalid');

      expect(key).toBe('mermaid-file-abcd1234efgh5678-autosave');
    });
  });

  describe('localStorage Isolation', () => {
    it('should store and retrieve file-specific auto-save data', async () => {
      const content = 'graph TD\n    A --> B';
      const fileName = 'test.mmd';

      // Set up component state
      component.mermaidText = content;
      component.currentFileName = fileName;

      // Save auto-save data
      await component.saveAutoSaveData();

      // Verify data was stored with hash-based key
      const calls = localStorageMock.setItem.mock.calls;
      const hashBasedCall = calls.find(call => 
        call[0].startsWith('mermaid-file-') && call[0].endsWith('-autosave')
      );
      
      expect(hashBasedCall).toBeTruthy();
      expect(hashBasedCall[1]).toContain(content);
    });

    it('should load file-specific auto-save data', async () => {
      const content = 'graph TD\n    A --> B';
      const fileName = 'test.mmd';
      const hash = await component.generateFileHash(content, fileName);
      const storageKey = component.getStorageKey(hash, 'autosave');

      // Mock stored data
      const storedData = {
        content: content,
        timestamp: Date.now(),
        fileName: fileName
      };
      localStorageMock.setItem(storageKey, JSON.stringify(storedData));

      // Load auto-save data
      const loadedData = await component.loadAutoSaveData(hash);

      expect(loadedData).toEqual(storedData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(storageKey);
    });

    it('should isolate different files with different hashes', async () => {
      const content1 = 'graph TD\n    A --> B';
      const content2 = 'graph TD\n    A --> C';
      const fileName = 'test.mmd';

      const hash1 = await component.generateFileHash(content1, fileName);
      const hash2 = await component.generateFileHash(content2, fileName);

      const key1 = component.getStorageKey(hash1, 'autosave');
      const key2 = component.getStorageKey(hash2, 'autosave');

      expect(key1).not.toBe(key2);

      // Store data for both files
      const data1 = { content: content1, timestamp: Date.now(), fileName };
      const data2 = { content: content2, timestamp: Date.now(), fileName };

      localStorageMock.setItem(key1, JSON.stringify(data1));
      localStorageMock.setItem(key2, JSON.stringify(data2));

      // Verify isolation
      const loaded1 = await component.loadAutoSaveData(hash1);
      const loaded2 = await component.loadAutoSaveData(hash2);

      expect(loaded1.content).toBe(content1);
      expect(loaded2.content).toBe(content2);
    });

    it('should handle stale auto-save data correctly', async () => {
      const content = 'graph TD\n    A --> B';
      const fileName = 'test.mmd';
      const hash = await component.generateFileHash(content, fileName);
      const storageKey = component.getStorageKey(hash, 'autosave');

      // Create stale data (older than 7 days)
      const staleTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const staleData = {
        content: content,
        timestamp: staleTimestamp,
        fileName: fileName
      };
      localStorageMock.setItem(storageKey, JSON.stringify(staleData));

      // Try to load stale data
      const loadedData = await component.loadAutoSaveData(hash);

      expect(loadedData).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
    });
  });

  describe('Data Migration', () => {
    it('should migrate legacy auto-save data to hash-based keys', async () => {
      const content = 'graph TD\n    A --> B';
      const legacyKey = 'mermaid-autosave-content';
      const legacyData = {
        content: content,
        timestamp: Date.now(),
        fileName: null
      };

      // Set up legacy data
      localStorageMock.setItem(legacyKey, JSON.stringify(legacyData));

      // Run migration
      await component.migrateExistingData();

      // Verify migration occurred
      const hash = await component.generateFileHash(content, null);
      const newKey = component.getStorageKey(hash, 'autosave');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        newKey,
        JSON.stringify(legacyData)
      );
    });

    it('should migrate legacy manual save data to hash-based keys', async () => {
      const content = 'graph TD\n    A --> B';
      const legacyKey = 'lastMermaidDiagram';
      const legacyData = {
        code: content
      };

      // Set up legacy data
      localStorageMock.setItem(legacyKey, JSON.stringify(legacyData));

      // Run migration
      await component.migrateExistingData();

      // Verify migration occurred - check that a hash-based manual key was created
      const calls = localStorageMock.setItem.mock.calls;
      const hashBasedCall = calls.find(call => 
        call[0].startsWith('mermaid-file-') && call[0].endsWith('-manual')
      );
      
      expect(hashBasedCall).toBeTruthy();
      expect(hashBasedCall[1]).toContain(content);
    });

    it('should not overwrite existing hash-based data during migration', async () => {
      const content = 'graph TD\n    A --> B';
      const hash = await component.generateFileHash(content, null);
      const newKey = component.getStorageKey(hash, 'autosave');

      // Set up existing hash-based data
      const existingData = {
        content: content,
        timestamp: Date.now(),
        fileName: null
      };
      localStorageMock.setItem(newKey, JSON.stringify(existingData));

      // Set up legacy data
      const legacyKey = 'mermaid-autosave-content';
      const legacyData = {
        content: content,
        timestamp: Date.now() - 1000, // Older timestamp
        fileName: null
      };
      localStorageMock.setItem(legacyKey, JSON.stringify(legacyData));

      // Clear the setItem mock to track new calls
      localStorageMock.setItem.mockClear();

      // Run migration
      await component.migrateExistingData();

      // Verify existing data was not overwritten
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        newKey,
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      // Mock quota exceeded error
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const content = 'graph TD\n    A --> B';
      component.mermaidText = content;

      // Should not throw error
      await expect(component.saveAutoSaveData()).resolves.not.toThrow();
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      const hash = 'abcd1234efgh5678';
      const storageKey = component.getStorageKey(hash, 'autosave');

      // Set corrupted data directly in the store
      localStorageMock.store[storageKey] = 'invalid json data';

      // Should return null for corrupted data
      const loadedData = await component.loadAutoSaveData(hash);
      expect(loadedData).toBeNull();

      // Should clean up corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
    });

    it('should handle hash generation errors gracefully', async () => {
      // Mock crypto API to throw error
      mockCrypto.subtle.digest.mockRejectedValue(new Error('Crypto error'));

      const content = 'graph TD\n    A --> B';
      const fileName = 'test.mmd';

      // Should fallback to alternative hash generation
      const hash = await component.generateFileHash(content, fileName);

      expect(hash).toHaveLength(16);
      expect(typeof hash).toBe('string');
    });
  });

  describe('Browser Instance Isolation Simulation', () => {
    it('should simulate different browser instances with different localStorage', async () => {
      // Simulate Browser Instance 1
      const browser1Storage = {};
      const browser1Mock = {
        getItem: (key) => browser1Storage[key] || null,
        setItem: (key, value) => { browser1Storage[key] = value; },
        removeItem: (key) => { delete browser1Storage[key]; }
      };

      // Simulate Browser Instance 2
      const browser2Storage = {};
      const browser2Mock = {
        getItem: (key) => browser2Storage[key] || null,
        setItem: (key, value) => { browser2Storage[key] = value; },
        removeItem: (key) => { delete browser2Storage[key]; }
      };

      const content1 = 'graph TD\n    A --> B';
      const content2 = 'graph TD\n    A --> C';
      const fileName1 = 'test1.mmd'; // Different filenames to ensure different hashes
      const fileName2 = 'test2.mmd';

      // Generate hashes (should be different for different content and filenames)
      const hash1 = await component.generateFileHash(content1, fileName1);
      const hash2 = await component.generateFileHash(content2, fileName2);

      const key1 = component.getStorageKey(hash1, 'autosave');
      const key2 = component.getStorageKey(hash2, 'autosave');

      // Ensure keys are different
      expect(key1).not.toBe(key2);

      // Store different content in different "browser instances"
      browser1Mock.setItem(key1, JSON.stringify({
        content: content1,
        timestamp: Date.now(),
        fileName: fileName1
      }));

      browser2Mock.setItem(key2, JSON.stringify({
        content: content2,
        timestamp: Date.now(),
        fileName: fileName2
      }));

      // Verify isolation - each browser instance has its own data
      expect(browser1Mock.getItem(key1)).toBeTruthy();
      expect(browser1Mock.getItem(key2)).toBeNull();

      expect(browser2Mock.getItem(key2)).toBeTruthy();
      expect(browser2Mock.getItem(key1)).toBeNull();

      // Verify same file in different instances would share the same key
      const sameContentHash = await component.generateFileHash(content1, fileName1);
      expect(sameContentHash).toBe(hash1);
    });
  });
});