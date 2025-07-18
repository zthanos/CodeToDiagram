# Design Document

## Overview

This design enhances the existing MermaidRenderer.vue component with three main improvements: automatic temporary storage for content persistence, improved UI/UX with full-screen editor layout, and enhanced file management with proper save/update functionality. The solution builds upon the existing Vue 3 Composition API structure and CodeMirror 6 editor integration.

## Architecture

The enhanced component maintains the existing split-pane architecture while adding new reactive data properties and methods to handle:

1. **Auto-save System**: Debounced automatic saving to localStorage with separate keys for temporary and manual saves
2. **File Management**: File reference tracking, edit state management, and proper save/update operations
3. **Enhanced Editor**: Full-height layout, tab key handling, and keyboard shortcuts
4. **UI Indicators**: Visual feedback for file edit status and save operations

### Component Structure

```
MermaidRenderer.vue
├── Template (unchanged split-pane layout)
├── Script (enhanced with new features)
│   ├── Existing functionality (preserved)
│   ├── Auto-save system
│   ├── File management
│   ├── Keyboard shortcuts
│   └── Enhanced editor configuration
└── Styles (updated for full-height editor)
```

## Components and Interfaces

### Data Properties (New/Modified)

```javascript
data() {
  return {
    // Existing properties...
    mermaidText: '',
    debounceTimer: null,
    leftWidth: 50, // Changed from 30 to 50 for better default
    editorView: null,
    
    // New properties
    autoSaveTimer: null,
    currentFileName: null,
    currentFileHandle: null, // File System Access API handle
    isFileModified: false,
    lastSavedContent: '',
    autoSaveKey: 'mermaid-autosave-content'
  }
}
```

### Methods (New/Enhanced)

#### Auto-save System
- `initAutoSave()`: Initialize auto-save functionality on component mount
- `autoSaveContent()`: Debounced auto-save to localStorage
- `loadAutoSavedContent()`: Restore content from localStorage on component load
- `clearAutoSave()`: Clean up auto-save data

#### File Management
- `loadFile()`: Enhanced file loading with File System Access API
- `saveFile()`: Smart save (update existing or create new)
- `saveAsFile()`: Force save as new file
- `updateFileState()`: Track file modifications and update UI indicators
- `handleKeyboardShortcuts()`: Handle Ctrl+S and other shortcuts

#### Editor Enhancements
- `initCodeMirror()`: Enhanced with tab handling and keyboard shortcuts
- `configureEditorExtensions()`: Configure CodeMirror extensions for better UX

## Data Models

### File State Model
```javascript
{
  fileName: String,           // Current file name
  fileHandle: FileSystemFileHandle, // Browser File System API handle
  isModified: Boolean,        // Has unsaved changes
  lastSavedContent: String,   // Content when last saved
  autoSaveContent: String     // Auto-saved content
}
```

### Auto-save Storage Model
```javascript
{
  content: String,            // Editor content
  timestamp: Number,          // When auto-saved
  fileName: String,           // Associated file name (if any)
}
```

## Error Handling

### Auto-save Errors
- **Storage Quota Exceeded**: Graceful degradation, continue without auto-save
- **Storage Access Denied**: Log warning, continue with manual save only
- **Corrupted Auto-save Data**: Clear corrupted data, start fresh

### File System Errors
- **File Access Denied**: Show user-friendly error message
- **File Not Found**: Handle gracefully, offer to save as new file
- **Write Permission Denied**: Fall back to download method
- **Browser Compatibility**: Detect File System Access API support, fall back to traditional methods

### Editor Errors
- **CodeMirror Initialization**: Retry with basic configuration
- **Extension Loading**: Continue with reduced functionality
- **Keyboard Event Conflicts**: Prevent default browser behavior appropriately

## Testing Strategy

### Unit Tests
1. **Auto-save Functionality**
   - Test debounced saving behavior
   - Test localStorage operations
   - Test auto-save restoration on component mount
   - Test cleanup on component unmount

2. **File Management**
   - Test file loading and saving operations
   - Test file modification tracking
   - Test keyboard shortcut handling
   - Test File System Access API integration

3. **Editor Enhancements**
   - Test tab key behavior in editor
   - Test full-height layout rendering
   - Test CodeMirror configuration

### Integration Tests
1. **Component Lifecycle**
   - Test auto-save during normal editing workflow
   - Test file operations with real file interactions
   - Test browser refresh scenarios

2. **User Interactions**
   - Test split-pane resizing with new layout
   - Test keyboard shortcuts in various scenarios
   - Test file modification indicators

### Browser Compatibility Tests
1. **File System Access API**
   - Test in supported browsers (Chrome, Edge)
   - Test fallback behavior in unsupported browsers
   - Test permission handling

2. **localStorage Operations**
   - Test in various browsers
   - Test with storage limitations
   - Test in private/incognito mode

## Implementation Notes

### CodeMirror Extensions
The editor will be enhanced with:
- `keymap.of([...])`: Custom keybindings for tab handling and shortcuts
- `EditorView.domEventHandlers`: Handle keyboard events
- `indentWithTab`: Enable proper tab behavior

### File System Access API Integration
- Use `window.showOpenFilePicker()` for file loading
- Use `window.showSaveFilePicker()` for save-as operations
- Store file handles for direct file updates
- Implement fallback for unsupported browsers

### Auto-save Implementation
- Debounce timer of 2 seconds after user stops typing
- Separate localStorage key from manual saves
- Include timestamp for data freshness validation
- Clean up on component unmount

### UI/UX Improvements
- Change default left pane width from 30% to 50%
- Ensure editor fills entire left pane height
- Add visual indicator for modified files (e.g., asterisk in title)
- Provide feedback for save operations