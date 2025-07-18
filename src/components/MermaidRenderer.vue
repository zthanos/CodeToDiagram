<template>
  <div class="mermaid-editor">
    <!-- File status indicator -->
    <div class="file-status-bar" v-if="currentFileName || isFileModified">
      <div class="file-info">
        <span class="file-name">
          {{ currentFileName || 'Untitled' }}
          <span v-if="isFileModified" class="modified-indicator" title="File has unsaved changes">*</span>
        </span>
        <span v-if="!isFileSystemAccessSupported()" class="compatibility-warning" title="Advanced file features not supported in this browser">
          ⚠️ Limited file support
        </span>
      </div>
    </div>
    
    <!-- Notification area -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <span class="notification-icon">{{ notification.icon }}</span>
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="hideNotification">×</button>
    </div>
    
    <div class="split-pane" :style="{height: '100%'}">
      <div class="pane editor-pane" :style="{width: leftWidth + '%'}">
        <div ref="editor" class="mermaid-codemirror"></div>
      </div>
      <div class="split-bar" @mousedown="startDrag"></div>
      <div class="pane diagram-pane" :style="{width: (100 - leftWidth) + '%'}">
        <div class="diagram-container" :class="themeClass">
          <div class="mermaid" ref="diagramContainer"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import mermaid from 'mermaid';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';

export default defineComponent({
  name: 'MermaidEditor',
  props: {
    theme: {
      type: String,
      default: 'default'
    }
  },
  data() {
    return {
      // Existing properties
      mermaidText: '',
      debounceTimer: null,
      leftWidth: 50, // Changed from 30 to 50 for better editor visibility
      dragging: false,
      dragStartX: 0,
      dragStartWidth: 50, // Updated to match new default
      editorView: null,
      
      // New auto-save properties
      autoSaveTimer: null,
      autoSaveKey: 'mermaid-autosave-content',
      
      // New file management properties
      currentFileName: null,
      currentFileHandle: null, // File System Access API handle
      isFileModified: false,
      lastSavedContent: '',
      
      // Notification system
      notification: {
        show: false,
        message: '',
        type: 'info',
        icon: 'ℹ️',
        timeout: null
      }
    }
  },
  computed: {
    themeClass() {
      return `mermaid-theme-${this.theme || 'default'}`;
    }
  },
  watch: {
    theme: {
      immediate: true,
      handler(newTheme) {
        this.$nextTick(() => {
          if (window.mermaid) {
            window.mermaid.initialize({
              startOnLoad: false,
              theme: newTheme || 'default',
              securityLevel: 'loose'
            });
            this.renderDiagram();
          }
        });
      }
    }
  },
  mounted() {
    try {
      // Initialize Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: this.theme || 'default',
        securityLevel: 'loose'
      });
      
      // Initialize all new features in proper order
      this.initCodeMirrorWithErrorHandling();
      this.initAutoSave();
      this.initKeyboardShortcuts();
      this.initFileSystemFeatures();
      
      // Initialize existing drag functionality
      window.addEventListener('mousemove', this.onDrag);
      window.addEventListener('mouseup', this.stopDrag);
      
      // Initialize notification cleanup
      this.initNotificationSystem();
      
      console.log('MermaidRenderer component mounted successfully with all features');
      
    } catch (error) {
      console.error('Error during component mounting:', error);
      this.showErrorMessage('Failed to initialize the editor. Please refresh the page and try again.');
    }
  },
  beforeUnmount() {
    try {
      // Clean up window event listeners
      window.removeEventListener('mousemove', this.onDrag);
      window.removeEventListener('mouseup', this.stopDrag);
      
      // Clean up CodeMirror editor
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null;
      }
      
      // Clean up auto-save timer
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
      
      // Clean up debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      // Clean up notification timeout
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
        this.notification.timeout = null;
      }
      
      // Clean up File System API handles (they don't need explicit cleanup but good practice)
      this.currentFileHandle = null;
      
      // Clean up beforeunload event listener
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      
      // Clean up keyboard event listeners if any were added globally
      this.cleanupKeyboardShortcuts();
      
      // Clean up any remaining timers or intervals
      this.cleanupAllTimers();
      
      console.log('MermaidRenderer component unmounted and cleaned up successfully');
      
    } catch (error) {
      console.error('Error during component cleanup:', error);
      // Continue with cleanup even if some parts fail
    }
  },
  methods: {
    initCodeMirror() {
      const self = this;
      
      // Custom keymap for keyboard shortcuts
      const customKeymap = keymap.of([
        indentWithTab,
        {
          key: 'Ctrl-s',
          mac: 'Cmd-s',
          run: () => {
            self.handleKeyboardShortcuts({ ctrlKey: true, key: 's', preventDefault: () => {} });
            return true; // Prevent default behavior
          }
        }
      ]);
      
      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.mermaidText,
          extensions: [
            basicSetup,
            markdown(),
            oneDark,
            customKeymap,
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                self.mermaidText = update.state.doc.toString();
                self.renderWithDebounce();
                self.autoSaveContent();
                self.updateFileState(); // Track file modifications
              }
            })
          ]
        }),
        parent: this.$refs.editor
      });
    },
    
    // New initialization methods for enhanced lifecycle management
    initKeyboardShortcuts() {
      // Initialize global keyboard shortcuts if needed
      // Most keyboard shortcuts are handled within CodeMirror keymap
      // This method is for any additional global shortcuts
      try {
        // Add global keyboard event listener for shortcuts that need to work outside the editor
        document.addEventListener('keydown', this.handleGlobalKeyboardShortcuts);
        console.log('Keyboard shortcuts initialized');
      } catch (error) {
        console.error('Error initializing keyboard shortcuts:', error);
        // Continue without global shortcuts
      }
    },
    
    initFileSystemFeatures() {
      // Initialize File System Access API features
      try {
        // Check browser compatibility and log status
        const isSupported = this.isFileSystemAccessSupported();
        console.log('File System Access API supported:', isSupported);
        
        // Initialize file state tracking
        this.updateDocumentTitle();
        
        // Set up beforeunload handler to warn about unsaved changes
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        console.log('File system features initialized');
      } catch (error) {
        console.error('Error initializing file system features:', error);
        // Continue with reduced functionality
      }
    },
    
    initNotificationSystem() {
      // Initialize the notification system
      try {
        // Ensure notification state is properly initialized
        this.notification.show = false;
        this.notification.timeout = null;
        
        console.log('Notification system initialized');
      } catch (error) {
        console.error('Error initializing notification system:', error);
        // Continue without notifications
      }
    },
    
    // Cleanup methods for enhanced lifecycle management
    cleanupKeyboardShortcuts() {
      try {
        // Remove global keyboard event listener
        document.removeEventListener('keydown', this.handleGlobalKeyboardShortcuts);
        console.log('Keyboard shortcuts cleaned up');
      } catch (error) {
        console.error('Error cleaning up keyboard shortcuts:', error);
      }
    },
    
    cleanupAllTimers() {
      try {
        // Clean up any remaining timers that might have been missed
        const timerProperties = ['autoSaveTimer', 'debounceTimer'];
        
        timerProperties.forEach(prop => {
          if (this[prop]) {
            clearTimeout(this[prop]);
            this[prop] = null;
          }
        });
        
        console.log('All timers cleaned up');
      } catch (error) {
        console.error('Error cleaning up timers:', error);
      }
    },
    
    handleGlobalKeyboardShortcuts(event) {
      // Handle global keyboard shortcuts that need to work outside the editor
      try {
        // Currently, most shortcuts are handled within CodeMirror
        // This is for future expansion if needed
        
        // Example: Handle Escape key to hide notifications
        if (event.key === 'Escape' && this.notification.show) {
          this.hideNotification();
          event.preventDefault();
        }
      } catch (error) {
        console.error('Error handling global keyboard shortcut:', error);
      }
    },
    
    handleBeforeUnload(event) {
      // Warn user about unsaved changes before leaving the page
      try {
        if (this.isFileModified) {
          const message = 'You have unsaved changes. Are you sure you want to leave?';
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      } catch (error) {
        console.error('Error handling beforeunload:', error);
      }
    },
    
    loadDefault() {
      this.mermaidText = this.getDefaultText();
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: this.mermaidText }
        });
      }
      this.renderDiagram();
      
      // Initialize file state for default content
      this.lastSavedContent = this.mermaidText;
      this.updateFileState();
    },
    getDefaultText() {
      const defaults = {
        'sequenceDiagram': `sequenceDiagram\n    participant Client\n    participant Server\n    \n    Client->>Server: GET /data\n    Server-->>Client: 200 OK\n    Client->>Server: POST /update\n    Server-->>Client: 403 Forbidden`,
        'graph TD': `graph TD\n    Α[Καλωσήρθατε] --> Β{Είστε νέος;}\n    Β -->|Ναι| Γ[Εγγραφή]\n    Β -->|Όχι| Δ[Σύνδεση]\n    Γ --> Ε[Προφίλ]\n    Δ --> Ε`,
        'pie': `pie title Πλατφόρμες\n    "Android" : 45\n    "iOS" : 30\n    "Windows" : 15\n    "Άλλο" : 10`,
        'gantt': `gantt\n    title Πρόγραμμα Έργου\n    dateFormat  YYYY-MM-DD\n    section Ανάπτυξη\n    Σχεδίαση :done, des1, 2023-01-01, 14d\n    Κώδικας :active, des2, 2023-01-15, 21d\n    Τεστ : des3, after des2, 7d`
      };
      return defaults['graph TD']; // Default to flowchart if diagramType is removed
    },
    async renderDiagram() {
      try {
        mermaid.parse(this.mermaidText);
        const { svg } = await mermaid.render('mermaid-svg', this.mermaidText);
        this.$refs.diagramContainer.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        
        // Create user-friendly error message based on error type
        let errorMessage = 'Diagram syntax error';
        if (error.message) {
          // Extract meaningful part of error message
          const cleanMessage = error.message.replace(/^Error: /, '').replace(/\n.*$/, '');
          errorMessage = `Syntax error: ${cleanMessage}`;
        }
        
        this.$refs.diagramContainer.innerHTML = 
          `<div class="error">
            <strong>Unable to render diagram</strong><br>
            ${errorMessage}<br>
            <small>Please check your Mermaid syntax and try again.</small>
          </div>`;
      }
    },
    renderWithDebounce() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.renderDiagram();
      }, 500);
    },
    autoSaveContent() {
      // Clear existing auto-save timer
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
      
      // Set new timer with 2-second debounce
      this.autoSaveTimer = setTimeout(() => {
        this.saveAutoSaveData();
      }, 2000);
    },
    saveAutoSaveData() {
      try {
        const autoSaveData = {
          content: this.mermaidText,
          timestamp: Date.now(),
          fileName: this.currentFileName || null
        };
        
        localStorage.setItem(this.autoSaveKey, JSON.stringify(autoSaveData));
      } catch (error) {
        // Handle storage quota exceeded or access denied
        console.warn('Auto-save failed:', error.message);
        
        if (error.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded. Auto-save disabled.');
        } else if (error.name === 'SecurityError') {
          console.warn('Storage access denied. Auto-save disabled.');
        }
        
        // Continue functioning without auto-save
      }
    },
    loadAutoSaveData() {
      try {
        const saved = localStorage.getItem(this.autoSaveKey);
        if (saved) {
          const autoSaveData = JSON.parse(saved);
          
          // Check if auto-save data is valid and not too old (e.g., older than 7 days)
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
          const isStale = autoSaveData.timestamp && (Date.now() - autoSaveData.timestamp > maxAge);
          
          if (isStale) {
            // Clear stale auto-save data
            this.clearAutoSaveData();
            return null;
          }
          
          return autoSaveData;
        }
      } catch (error) {
        console.warn('Failed to load auto-save data:', error.message);
        // Clear corrupted auto-save data
        this.clearAutoSaveData();
      }
      
      return null;
    },
    clearAutoSaveData() {
      try {
        localStorage.removeItem(this.autoSaveKey);
      } catch (error) {
        console.warn('Failed to clear auto-save data:', error.message);
      }
    },
    initAutoSave() {
      // Check if there's any manually saved content first
      const manualSave = localStorage.getItem('lastMermaidDiagram');
      
      // Only restore auto-save if no manual save exists or if auto-save is newer
      const autoSaveData = this.loadAutoSaveData();
      
      if (autoSaveData && autoSaveData.content) {
        let shouldRestoreAutoSave = true;
        
        if (manualSave) {
          try {
            JSON.parse(manualSave); // Validate manual save data
            // If manual save exists but auto-save has content and is more recent, prefer auto-save
            // For now, we'll be conservative and only restore auto-save if no manual save exists
            shouldRestoreAutoSave = false;
          } catch (error) {
            // If manual save is corrupted, restore auto-save
            shouldRestoreAutoSave = true;
          }
        }
        
        if (shouldRestoreAutoSave) {
          // Restore auto-saved content
          this.mermaidText = autoSaveData.content;
          this.currentFileName = autoSaveData.fileName;
          
          // Update editor with restored content
          if (this.editorView) {
            this.editorView.dispatch({
              changes: { from: 0, to: this.editorView.state.doc.length, insert: this.mermaidText }
            });
          }
          
          // Render the restored diagram
          this.renderDiagram();
          
          // Initialize file state for restored content
          this.lastSavedContent = this.mermaidText;
          this.updateFileState();
          
          console.log('Auto-saved content restored');
        }
      } else {
        // No auto-save data, load default content
        this.loadDefault();
      }
    },
    saveDiagram() {
      try {
        // Save to localStorage for backward compatibility
        localStorage.setItem('lastMermaidDiagram', JSON.stringify({
          code: this.mermaidText
        }));
        
        // Update file state to reflect that content is now saved
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.updateDocumentTitle();
        
        // Update auto-save storage to match manual save
        this.saveAutoSaveData();
        
        this.showSuccessMessage('Diagram saved successfully!');
        
      } catch (error) {
        console.error('Error saving diagram to localStorage:', error);
        
        let errorMessage = 'Failed to save diagram';
        if (error.name === 'QuotaExceededError') {
          errorMessage = 'Storage quota exceeded. Please free up some space and try again.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Storage access denied. Please check your browser settings.';
        }
        
        this.showErrorMessage(errorMessage);
      }
    },
    setEditorContent(text) {
      this.mermaidText = text;
      if (this.editorView) {
        this.editorView.dispatch({
          changes: { from: 0, to: this.editorView.state.doc.length, insert: text }
        });
      }
      this.renderDiagram();
    },
    loadDiagram() {
      try {
        const saved = localStorage.getItem('lastMermaidDiagram');
        if (saved) {
          try {
            const { code } = JSON.parse(saved);
            this.mermaidText = code;
            if (this.editorView) {
              this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: code }
              });
            }
            
            // Clear any existing file state since we're loading from localStorage
            this.clearFileState();
            
            // Set the loaded content as the baseline for tracking modifications
            this.lastSavedContent = code;
            this.updateFileState();
            
            // Update auto-save storage to match loaded content
            this.saveAutoSaveData();
            
            this.renderDiagram();
            this.showSuccessMessage('Diagram loaded successfully!');
            
          } catch (parseError) {
            console.error('Error parsing saved diagram:', parseError);
            this.showErrorMessage('Saved diagram data is corrupted. Please try loading a file instead.');
          }
        } else {
          // No saved diagram found, inform user
          this.showInfoMessage('No saved diagram found. Create a new diagram or load a file.');
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        this.showErrorMessage('Unable to access saved diagrams. Please check your browser settings.');
      }
    },
    async exportImage(filename = 'diagram.png') {
      await this.exportImageWithErrorHandling(filename);
    },
    startDrag(e) {
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.dragStartWidth = this.leftWidth;
      document.body.style.cursor = 'col-resize';
    },
    onDrag(e) {
      if (!this.dragging) return;
      const delta = e.clientX - this.dragStartX;
      const container = this.$el.querySelector('.split-pane');
      const totalWidth = container.offsetWidth;
      let newLeftWidth = this.dragStartWidth + (delta / totalWidth) * 100;
      newLeftWidth = Math.max(10, Math.min(90, newLeftWidth));
      this.leftWidth = newLeftWidth;
    },
    stopDrag() {
      if (this.dragging) {
        this.dragging = false;
        document.body.style.cursor = '';
      }
    },
    getEditorContent() {
      return this.mermaidText;
    },
    handleKeyboardShortcuts(event) {
      try {
        // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
        const isCtrlS = (event.ctrlKey || event.metaKey) && event.key === 's';
        
        if (isCtrlS) {
          event.preventDefault(); // Prevent default browser save behavior
          
          // Use the enhanced save functionality with error handling
          this.saveFileWithErrorHandling();
          
          return true; // Indicate that the shortcut was handled
        }
        
        return false; // Shortcut not handled
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
        this.showErrorMessage('Keyboard shortcut failed. Please try using the menu instead.');
        return false;
      }
    },
    
    // File state tracking methods
    updateFileState() {
      // Check if current content differs from last saved content
      const currentContent = this.mermaidText;
      const hasChanges = currentContent !== this.lastSavedContent;
      
      // Update modification state
      this.isFileModified = hasChanges;
      
      // Update document title with modification indicator
      this.updateDocumentTitle();
    },
    
    updateDocumentTitle() {
      // Get base title (file name or default)
      let baseTitle = this.currentFileName || 'Mermaid Editor';
      
      // Add modification indicator if file is modified
      if (this.isFileModified) {
        baseTitle = '* ' + baseTitle;
      }
      
      // Update document title
      document.title = baseTitle;
    },
    
    setFileState(fileName, fileHandle, content) {
      // Set file information
      this.currentFileName = fileName;
      this.currentFileHandle = fileHandle;
      this.lastSavedContent = content;
      this.isFileModified = false;
      
      // Update UI indicators
      this.updateDocumentTitle();
    },
    
    clearFileState() {
      // Clear file information
      this.currentFileName = null;
      this.currentFileHandle = null;
      this.lastSavedContent = '';
      this.isFileModified = false;
      
      // Update UI indicators
      this.updateDocumentTitle();
    },
    
    // File System Access API integration
    isFileSystemAccessSupported() {
      // Check if File System Access API is supported
      return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
    },
    
    async loadFile() {
      try {
        if (!this.isFileSystemAccessSupported()) {
          // Fallback for unsupported browsers
          return this.loadFileFallback();
        }
        
        // Use File System Access API
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Mermaid files',
            accept: {
              'text/plain': ['.mmd', '.mermaid', '.txt'],
              'text/markdown': ['.md']
            }
          }],
          multiple: false
        });
        
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        // Update editor content
        this.mermaidText = content;
        if (this.editorView) {
          this.editorView.dispatch({
            changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
          });
        }
        
        // Set file state
        this.setFileState(file.name, fileHandle, content);
        
        // Render the diagram
        this.renderDiagram();
        
        // Update auto-save storage to match loaded file
        this.saveAutoSaveData();
        
        console.log('File loaded successfully:', file.name);
        
      } catch (error) {
        if (error.name === 'AbortError') {
          // User cancelled the file picker
          console.log('File loading cancelled by user');
          return;
        }
        
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
      }
    },
    
    loadFileFallback() {
      // Fallback method for browsers that don't support File System Access API
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mmd,.mermaid,.txt,.md';
        
        input.onchange = async (event) => {
          try {
            const file = event.target.files[0];
            if (!file) {
              resolve();
              return;
            }
            
            const content = await file.text();
            
            // Update editor content
            this.mermaidText = content;
            if (this.editorView) {
              this.editorView.dispatch({
                changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
              });
            }
            
            // Set file state (no file handle in fallback mode)
            this.setFileState(file.name, null, content);
            
            // Render the diagram
            this.renderDiagram();
            
            // Update auto-save storage to match loaded file
            this.saveAutoSaveData();
            
            console.log('File loaded successfully (fallback):', file.name);
            resolve();
            
          } catch (error) {
            console.error('Error loading file (fallback):', error);
            alert('Error loading file: ' + error.message);
            reject(error);
          }
        };
        
        input.oncancel = () => {
          console.log('File loading cancelled by user (fallback)');
          resolve();
        };
        
        // Trigger file picker
        input.click();
      });
    },
    
    // Smart save functionality
    async saveFile() {
      try {
        if (this.currentFileHandle && this.isFileSystemAccessSupported()) {
          // Update existing file
          await this.updateExistingFile();
        } else {
          // Create new file or use fallback
          await this.saveAsFile();
        }
      } catch (error) {
        console.error('Error saving file:', error);
        alert('Error saving file: ' + error.message);
      }
    },
    
    async saveAsFile() {
      try {
        if (!this.isFileSystemAccessSupported()) {
          // Fallback for unsupported browsers
          return this.saveFileFallback();
        }
        
        // Use File System Access API for save-as
        const fileHandle = await window.showSaveFilePicker({
          types: [{
            description: 'Mermaid files',
            accept: {
              'text/plain': ['.mmd', '.mermaid', '.txt'],
              'text/markdown': ['.md']
            }
          }],
          suggestedName: this.currentFileName || 'diagram.mmd'
        });
        
        // Write content to file
        const writable = await fileHandle.createWritable();
        await writable.write(this.mermaidText);
        await writable.close();
        
        // Get file info
        const file = await fileHandle.getFile();
        
        // Update file state
        this.setFileState(file.name, fileHandle, this.mermaidText);
        
        // Update auto-save storage
        this.saveAutoSaveData();
        
        console.log('File saved successfully:', file.name);
        alert('File saved successfully!');
        
      } catch (error) {
        if (error.name === 'AbortError') {
          // User cancelled the save dialog
          console.log('File saving cancelled by user');
          return;
        }
        
        throw error;
      }
    },
    
    async updateExistingFile() {
      try {
        if (!this.currentFileHandle) {
          throw new Error('No file handle available for update');
        }
        
        // Check if we still have permission to write to the file
        const permission = await this.currentFileHandle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const requestPermission = await this.currentFileHandle.requestPermission({ mode: 'readwrite' });
          if (requestPermission !== 'granted') {
            throw new Error('Permission denied to write to file');
          }
        }
        
        // Write content to existing file
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(this.mermaidText);
        await writable.close();
        
        // Update file state (content is now saved)
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.updateDocumentTitle();
        
        // Update auto-save storage
        this.saveAutoSaveData();
        
        console.log('File updated successfully:', this.currentFileName);
        alert('File updated successfully!');
        
      } catch (error) {
        console.error('Error updating existing file:', error);
        
        // If updating fails, fall back to save-as
        console.log('Falling back to save-as due to update error');
        await this.saveAsFile();
      }
    },
    
    saveFileFallback() {
      // Fallback method for browsers that don't support File System Access API
      try {
        const blob = new Blob([this.mermaidText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = this.currentFileName || 'diagram.mmd';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        // Update file state (mark as saved, but no file handle in fallback)
        this.lastSavedContent = this.mermaidText;
        this.isFileModified = false;
        this.updateDocumentTitle();
        
        // Update auto-save storage
        this.saveAutoSaveData();
        
        console.log('File downloaded successfully (fallback):', this.currentFileName || 'diagram.mmd');
        this.showSuccessMessage('File downloaded successfully!');
        
      } catch (error) {
        console.error('Error downloading file (fallback):', error);
        this.showErrorMessage('Error downloading file: ' + error.message);
      }
    },

    // User feedback methods
    showSuccessMessage(message) {
      // Create a user-friendly success notification
      this.showNotification(message, 'success');
    },

    showErrorMessage(message) {
      // Create a user-friendly error notification
      this.showNotification(message, 'error');
    },

    showInfoMessage(message) {
      // Create a user-friendly info notification
      this.showNotification(message, 'info');
    },

    showWarningMessage(message) {
      // Create a user-friendly warning notification
      this.showNotification(message, 'warning');
    },

    showNotification(message, type = 'info', duration = 4000) {
      // Clear any existing notification timeout
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }
      
      // Set notification icons
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      
      // Update notification state
      this.notification.show = true;
      this.notification.message = message;
      this.notification.type = type;
      this.notification.icon = icons[type] || icons.info;
      
      // Auto-hide notification after duration (except for errors which stay longer)
      const autoHideDuration = type === 'error' ? duration * 2 : duration;
      this.notification.timeout = setTimeout(() => {
        this.hideNotification();
      }, autoHideDuration);
    },

    hideNotification() {
      this.notification.show = false;
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
        this.notification.timeout = null;
      }
    },

    // Enhanced error handling for CodeMirror initialization
    initCodeMirrorWithErrorHandling() {
      try {
        this.initCodeMirror();
      } catch (error) {
        console.error('Error initializing CodeMirror:', error);
        
        // Try to initialize with basic configuration
        try {
          this.initBasicCodeMirror();
          this.showWarningMessage('Editor initialized with reduced functionality due to configuration issues.');
        } catch (fallbackError) {
          console.error('Error initializing basic CodeMirror:', fallbackError);
          this.showErrorMessage('Unable to initialize the code editor. Please refresh the page and try again.');
        }
      }
    },

    initBasicCodeMirror() {
      // Fallback CodeMirror initialization with minimal configuration
      const self = this;
      
      this.editorView = new EditorView({
        state: EditorState.create({
          doc: this.mermaidText,
          extensions: [
            basicSetup,
            EditorView.updateListener.of(update => {
              if (update.docChanged) {
                self.mermaidText = update.state.doc.toString();
                self.renderWithDebounce();
                self.autoSaveContent();
                self.updateFileState();
              }
            })
          ]
        }),
        parent: this.$refs.editor
      });
    },

    // Enhanced error handling for file operations
    async loadFileWithErrorHandling() {
      try {
        await this.loadFile();
        this.showSuccessMessage('File loaded successfully!');
      } catch (error) {
        console.error('Error in loadFileWithErrorHandling:', error);
        
        let errorMessage = 'Failed to load file';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'File access permission denied. Please try again and allow file access.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error: Unable to access the selected file.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'The selected file could not be found.';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'File system is in an invalid state. Please try again.';
        } else if (error.message) {
          errorMessage = `Failed to load file: ${error.message}`;
        }
        
        this.showErrorMessage(errorMessage);
      }
    },

    async saveFileWithErrorHandling() {
      try {
        await this.saveFile();
      } catch (error) {
        console.error('Error in saveFileWithErrorHandling:', error);
        
        let errorMessage = 'Failed to save file';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'File save permission denied. Please try again and allow file access.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error: Unable to save to the selected location.';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'File system is in an invalid state. Please try again.';
        } else if (error.name === 'QuotaExceededError') {
          errorMessage = 'Storage quota exceeded. Please free up some space and try again.';
        } else if (error.message) {
          errorMessage = `Failed to save file: ${error.message}`;
        }
        
        this.showErrorMessage(errorMessage);
      }
    },

    // Enhanced error handling for export operations
    async exportImageWithErrorHandling(filename = 'diagram.png') {
      try {
        const svg = this.$refs.diagramContainer.querySelector('svg');
        if (!svg) {
          this.showErrorMessage('No diagram available to export. Please create a diagram first.');
          return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Unable to create canvas context for image export');
        }

        const img = new Image();
        
        // Use Promise to handle image loading
        await new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              canvas.width = img.width;
              canvas.height = img.height;
              
              // Get computed background color of diagram-container
              const bg = window.getComputedStyle(this.$refs.diagramContainer).backgroundColor || '#ffffff';
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              const png = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = filename;
              link.href = png;
              link.click();
              
              resolve();
            } catch (drawError) {
              reject(drawError);
            }
          };
          
          img.onerror = () => {
            reject(new Error('Failed to load SVG for image export'));
          };
          
          // Use decodeURIComponent instead of deprecated unescape
          img.src = 'data:image/svg+xml;base64,' + btoa(decodeURIComponent(encodeURIComponent(svgData)));
        });

        this.showSuccessMessage('Image exported successfully!');
        
      } catch (error) {
        console.error('Error exporting image:', error);
        
        let errorMessage = 'Failed to export image';
        if (error.message.includes('canvas')) {
          errorMessage = 'Unable to create image canvas. Your browser may not support this feature.';
        } else if (error.message.includes('SVG')) {
          errorMessage = 'Unable to process diagram for export. Please ensure the diagram is valid.';
        } else if (error.message) {
          errorMessage = `Export failed: ${error.message}`;
        }
        
        this.showErrorMessage(errorMessage);
      }
    }
  }
});
</script>

<style scoped>
.mermaid-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f9f9f9;
  margin: 0;
  padding: 0;
}
.split-pane {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  background: #eaeaea;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.pane {
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.editor-pane {
  background: #f5f5ff;
  border-right: 1px solid #ccc;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}
.diagram-pane {
  background: #fff;
  min-width: 120px;
  max-width: 90%;
  transition: width 0.1s;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.split-bar {
  width: 6px;
  background: #bbb;
  cursor: col-resize;
  z-index: 2;
  transition: background 0.2s;
}
.split-bar:hover, .split-bar:active {
  background: #888;
}
.mermaid-codemirror {
  height: 100%;
  width: 100%;
  font-size: 1rem;
  border: none;
  border-radius: 0;
  background: #1e1e1e;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.diagram-container {
  flex: 1;
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  background-color: thistle;
  height: 100%;
  box-sizing: border-box;
}
.error {
  color: #ff4444;
  padding: 1rem;
  background-color: #ffeeee;
  border-radius: 4px;
}
@media (max-width: 768px) {
  .split-pane {
    flex-direction: column;
  }
  .editor-pane, .diagram-pane {
    width: 100% !important;
    min-width: 0;
    max-width: 100%;
    height: 40vh;
  }
  .split-bar {
    width: 100%;
    height: 6px;
    cursor: row-resize;
  }
}

/***** File Status Bar Styles *****/
.file-status-bar {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 8px 16px;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 36px;
  box-sizing: border-box;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
}

.modified-indicator {
  color: #dc3545;
  font-weight: bold;
  font-size: 1.1em;
}

.compatibility-warning {
  color: #856404;
  font-size: 0.8rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 2px 6px;
}

/***** Notification Styles *****/
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  animation: slideInRight 0.3s ease-out;
}

.notification.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.notification.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.notification.warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.notification.info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.notification-icon {
  font-size: 1.1em;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/***** Enhanced Error Styles *****/
.error {
  color: #721c24;
  padding: 1rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  line-height: 1.5;
}

.error strong {
  display: block;
  margin-bottom: 8px;
  font-size: 1.1em;
}

.error small {
  display: block;
  margin-top: 8px;
  opacity: 0.8;
  font-style: italic;
}

/***** Mermaid Theme Styles *****/
.mermaid-theme-default {
  background-color: thistle;
  color: #222;
}
.mermaid-theme-dark {
  background-color: #1e1e1e;
  color: #eee;
}
.mermaid-theme-forest {
  background-color: #e4f1e1;
  color: #234d20;
}
.mermaid-theme-neutral {
  background-color: #f4f4f4;
  color: #222;
}

/***** Responsive Adjustments *****/
@media (max-width: 768px) {
  .file-status-bar {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
  
  .notification {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: auto;
    max-width: none;
  }
  
  .file-info {
    gap: 8px;
  }
  
  .compatibility-warning {
    font-size: 0.7rem;
    padding: 1px 4px;
  }
}
</style>