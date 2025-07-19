/**
 * Test file for file operations functionality
 * Tests the Add Diagram, Create Diagram, and Create Project workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProjectWorkspace from '../components/ProjectWorkspace.vue';

// Mock the ProjectManager
vi.mock('../services/ProjectManager', () => ({
  ProjectManager: {
    getInstance: () => ({
      createProject: vi.fn().mockResolvedValue({
        id: 'test-project-1',
        name: 'Test Project',
        description: 'Test Description',
        diagrams: [],
        createdAt: new Date(),
        lastModified: new Date(),
        settings: {
          theme: 'default',
          autoSave: true,
          defaultDiagramType: 'flowchart',
          editorSettings: {
            theme: 'default',
            fontSize: 14,
            lineNumbers: true,
            wordWrap: true,
            autoSave: true,
            autoSaveInterval: 30000
          }
        },
        metadata: {
          version: '1.0.0',
          tags: [],
          lastOpenedDiagrams: [],
          workspaceLayout: {
            navigationPaneWidth: 300,
            navigationPaneCollapsed: false,
            lastOpenedTabs: [],
            activeTabId: undefined
          }
        }
      }),
      saveProject: vi.fn().mockResolvedValue(undefined),
      setCurrentProject: vi.fn()
    })
  }
}));

describe('ProjectWorkspace File Operations', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ProjectWorkspace, {
      props: {
        theme: 'default'
      }
    });
    
    // Set up a mock current project
    wrapper.vm.currentProject = {
      id: 'test-project',
      name: 'Test Project',
      diagrams: [],
      settings: {
        defaultDiagramType: 'flowchart'
      }
    };
  });

  describe('Diagram Name Validation', () => {
    it('should validate diagram names correctly', () => {
      const { validateDiagramName } = wrapper.vm;

      // Valid names
      expect(validateDiagramName('Valid Name').isValid).toBe(true);
      expect(validateDiagramName('Valid_Name_123').isValid).toBe(true);
      expect(validateDiagramName('Valid-Name-123').isValid).toBe(true);

      // Invalid names
      expect(validateDiagramName('').isValid).toBe(false);
      expect(validateDiagramName('   ').isValid).toBe(false);
      expect(validateDiagramName('Invalid@Name').isValid).toBe(false);
      expect(validateDiagramName('Invalid/Name').isValid).toBe(false);
      expect(validateDiagramName('con').isValid).toBe(false); // Reserved name
    });
  });

  describe('Project Name Validation', () => {
    it('should validate project names correctly', () => {
      const { validateProjectName } = wrapper.vm;

      // Valid names
      expect(validateProjectName('Valid Project').isValid).toBe(true);
      expect(validateProjectName('Valid_Project_123').isValid).toBe(true);
      expect(validateProjectName('Valid-Project-123').isValid).toBe(true);

      // Invalid names
      expect(validateProjectName('').isValid).toBe(false);
      expect(validateProjectName('   ').isValid).toBe(false);
      expect(validateProjectName('Invalid@Project').isValid).toBe(false);
      expect(validateProjectName('Invalid/Project').isValid).toBe(false);
      expect(validateProjectName('aux').isValid).toBe(false); // Reserved name
    });
  });

  describe('File Type Validation', () => {
    it('should validate diagram file types correctly', () => {
      const { isValidDiagramFile } = wrapper.vm;

      // Valid files
      expect(isValidDiagramFile({ name: 'diagram.mmd' })).toBe(true);
      expect(isValidDiagramFile({ name: 'diagram.md' })).toBe(true);
      expect(isValidDiagramFile({ name: 'diagram.txt' })).toBe(true);
      expect(isValidDiagramFile({ name: 'DIAGRAM.MMD' })).toBe(true); // Case insensitive

      // Invalid files
      expect(isValidDiagramFile({ name: 'diagram.pdf' })).toBe(false);
      expect(isValidDiagramFile({ name: 'diagram.docx' })).toBe(false);
      expect(isValidDiagramFile({ name: 'diagram' })).toBe(false); // No extension
    });
  });

  describe('Diagram Creation', () => {
    it('should create new diagram with default content', () => {
      const { createNewDiagram } = wrapper.vm;
      
      const diagram = createNewDiagram('Test Diagram');
      
      expect(diagram.name).toBe('Test Diagram');
      expect(diagram.content).toContain('flowchart TD'); // Default flowchart content
      expect(diagram.type).toBe('flowchart');
      expect(diagram.isModified).toBe(false);
      expect(diagram.metadata.contentHash).toBeDefined();
      expect(diagram.metadata.size).toBeGreaterThan(0);
      expect(diagram.metadata.lineCount).toBeGreaterThan(0);
    });
  });

  describe('Default Diagram Content', () => {
    it('should generate correct default content for different diagram types', () => {
      const { getDefaultDiagramContent } = wrapper.vm;
      
      // Set different default types and test
      wrapper.vm.currentProject.settings.defaultDiagramType = 'sequence';
      expect(getDefaultDiagramContent()).toContain('sequenceDiagram');
      
      wrapper.vm.currentProject.settings.defaultDiagramType = 'class';
      expect(getDefaultDiagramContent()).toContain('classDiagram');
      
      wrapper.vm.currentProject.settings.defaultDiagramType = 'flowchart';
      expect(getDefaultDiagramContent()).toContain('flowchart TD');
    });
  });

  describe('Diagram Type Detection', () => {
    it('should detect diagram types from content correctly', () => {
      const { detectDiagramType } = wrapper.vm;

      expect(detectDiagramType('flowchart TD\nA --> B')).toBe('flowchart');
      expect(detectDiagramType('graph LR\nA --> B')).toBe('flowchart');
      expect(detectDiagramType('sequenceDiagram\nA->>B: Hello')).toBe('sequence');
      expect(detectDiagramType('classDiagram\nclass Animal')).toBe('class');
      expect(detectDiagramType('stateDiagram-v2\n[*] --> Still')).toBe('state');
      expect(detectDiagramType('erDiagram\nCUSTOMER ||--o{ ORDER')).toBe('er');
      expect(detectDiagramType('gantt\ntitle A Gantt')).toBe('gantt');
      expect(detectDiagramType('pie title Pets\n"Dogs" : 386')).toBe('pie');
      expect(detectDiagramType('journey\ntitle My day')).toBe('journey');
      
      // Unknown content should default to flowchart
      expect(detectDiagramType('unknown content')).toBe('flowchart');
    });
  });

  describe('Unique Filename Generation', () => {
    it('should generate unique filenames when conflicts exist', () => {
      const { generateUniqueFileName } = wrapper.vm;
      
      // Add some existing diagrams
      wrapper.vm.currentProject.diagrams = [
        { name: 'Test Diagram' },
        { name: 'Test Diagram (1)' },
        { name: 'Test Diagram (2)' }
      ];
      
      const uniqueName = generateUniqueFileName('Test Diagram');
      expect(uniqueName).toBe('Test Diagram (3)');
    });
  });

  describe('Content Hash Generation', () => {
    it('should generate consistent hashes for same content', () => {
      const { generateContentHash } = wrapper.vm;
      
      const content1 = 'flowchart TD\nA --> B';
      const content2 = 'flowchart TD\nA --> B';
      const content3 = 'flowchart TD\nA --> C';
      
      expect(generateContentHash(content1)).toBe(generateContentHash(content2));
      expect(generateContentHash(content1)).not.toBe(generateContentHash(content3));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing current project gracefully', async () => {
      wrapper.vm.currentProject = null;
      
      const showNotificationSpy = vi.spyOn(wrapper.vm, 'showNotification');
      
      await wrapper.vm.addDiagram();
      expect(showNotificationSpy).toHaveBeenCalledWith('error', 'No Project', 'Please create or load a project first');
      
      await wrapper.vm.createDiagram();
      expect(showNotificationSpy).toHaveBeenCalledWith('error', 'No Project', 'Please create or load a project first');
    });
  });
});