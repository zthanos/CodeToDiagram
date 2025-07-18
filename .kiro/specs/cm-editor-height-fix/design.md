# Design Document

## Overview

This design addresses the UI bug where the CodeMirror editor (cm-editor) in the MermaidRenderer component does not extend to the full available height, along with several UX enhancements including a filename bar, isolated localStorage management, and Mermaid syntax highlighting.

The solution involves restructuring the editor pane layout, implementing proper CSS flexbox constraints, adding a filename information bar, enhancing the localStorage system with file-specific hashcodes, and integrating Mermaid-specific syntax highlighting.

## Architecture

### Current Architecture Issues
- The CodeMirror editor container lacks proper height constraints
- CSS flexbox properties are not properly cascaded to the editor instance
- File status information is displayed at the top level rather than in the editor pane
- localStorage uses global keys that conflict between browser instances
- Editor uses generic markdown highlighting instead of Mermaid-specific syntax

### Proposed Architecture Changes
- Restructure the editor pane to include a dedicated filename bar
- Implement proper CSS height inheritance chain from parent to CodeMirror instance
- Create a file-specific localStorage management system using content hashcodes
- Integrate Mermaid syntax highlighting with theme-aware color schemes
- Maintain backward compatibility with existing functionality

## Components and Interfaces

### 1. Layout Structure Enhancement

**Current Structure:**
```
.mermaid-editor
├── .file-status-bar (conditional, top-level)
├── .notification (conditional)
└── .split-pane
    ├── .editor-pane
    │   └── .mermaid-codemirror
    └── .diagram-pane
```

**New Structure:**
```
.mermaid-editor
├── .notification (conditional)
└── .split-pane
    ├── .editor-pane
    │   ├── .editor-filename-bar (new)
    │   └── .mermaid-codemirror
    └── .diagram-pane
```

### 2. CSS Height Inheritance Chain

**Target CSS Structure:**
```css
.mermaid-editor { height: 100%; }
.split-pane { height: 100%; }
.editor-pane { 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
}
.editor-filename-bar { 
  flex: 0 0 auto; 
  height: 32px; 
}
.mermaid-codemirror { 
  flex: 1 1 auto; 
  height: 0; /* Force flex calculation */
}
```

### 3. File Management System

**HashCode Generation Interface:**
```javascript
interface FileHashManager {
  generateFileHash(content: string, fileName?: string): string;
  getStorageKey(hash: string, type: 'autosave' | 'manual'): string;
  migrateExistingData(): void;
}
```

**Storage Key Structure:**
- Current: `mermaid-autosave-content`, `lastMermaidDiagram`
- New: `mermaid-file-${hash}-autosave`, `mermaid-file-${hash}-manual`

### 4. Syntax Highlighting System

**CodeMirror Extension Structure:**
```javascript
interface MermaidHighlighting {
  createMermaidLanguage(): LanguageSupport;
  createThemeAwareHighlighting(theme: string): Extension;
  getMermaidTokens(): TokenSet;
}
```

## Data Models

### 1. File State Model
```javascript
interface FileState {
  fileName: string | null;
  fileHandle: FileSystemFileHandle | null;
  contentHash: string;
  isModified: boolean;
  lastSavedContent: string;
  storageKeys: {
    autosave: string;
    manual: string;
  };
}
```

### 2. Editor Configuration Model
```javascript
interface EditorConfig {
  height: string;
  theme: string;
  extensions: Extension[];
  syntaxHighlighting: boolean;
  autoSave: boolean;
}
```

### 3. Filename Bar Model
```javascript
interface FilenameBarState {
  visible: boolean;
  fileName: string;
  isModified: boolean;
  showCompatibilityWarning: boolean;
}
```

## Error Handling

### 1. Height Calculation Errors
- **Issue**: Browser compatibility with CSS flexbox
- **Solution**: Fallback to JavaScript-based height calculation
- **Implementation**: ResizeObserver for dynamic height updates

### 2. HashCode Collision Handling
- **Issue**: Multiple files generating same hash
- **Solution**: Include timestamp and file size in hash calculation
- **Fallback**: Append random suffix for true collisions

### 3. Syntax Highlighting Failures
- **Issue**: Mermaid syntax parsing errors
- **Solution**: Graceful fallback to markdown highlighting
- **Recovery**: Error boundary around highlighting extensions

### 4. localStorage Migration Errors
- **Issue**: Existing data corruption during migration
- **Solution**: Backup existing data before migration
- **Recovery**: Restore from backup if migration fails

## Testing Strategy

### 1. Unit Tests
- **CSS Height Calculation**: Test height inheritance chain
- **HashCode Generation**: Test uniqueness and consistency
- **File State Management**: Test state transitions
- **Syntax Highlighting**: Test token recognition

### 2. Integration Tests
- **Editor Initialization**: Test full editor setup with all extensions
- **File Loading**: Test file loading with hash generation
- **Theme Switching**: Test syntax highlighting theme adaptation
- **Responsive Behavior**: Test height adjustment on window resize

### 3. Visual Regression Tests
- **Height Utilization**: Compare before/after screenshots
- **Filename Bar Display**: Test various filename scenarios
- **Syntax Highlighting**: Test color scheme application
- **Mobile Responsiveness**: Test on different screen sizes

### 4. Browser Compatibility Tests
- **CSS Flexbox Support**: Test on older browsers
- **File System API**: Test fallback behavior
- **localStorage Limits**: Test storage quota handling
- **CodeMirror Extensions**: Test extension compatibility

## Implementation Approach

### Phase 1: CSS Height Fix
1. Restructure editor pane layout
2. Implement proper flexbox height inheritance
3. Add ResizeObserver for dynamic updates
4. Test height behavior across browsers

### Phase 2: Filename Bar Integration
1. Move file status from top-level to editor pane
2. Create dedicated filename bar component
3. Implement modification status indicators
4. Test visual integration

### Phase 3: localStorage Enhancement
1. Implement hashcode generation system
2. Create migration utility for existing data
3. Update all storage operations to use file-specific keys
4. Test multi-browser isolation

### Phase 4: Syntax Highlighting
1. Research and implement Mermaid language support
2. Create theme-aware highlighting system
3. Integrate with existing CodeMirror setup
4. Test syntax recognition and performance

### Phase 5: Integration and Testing
1. Combine all enhancements
2. Comprehensive testing across requirements
3. Performance optimization
4. Documentation updates

## Performance Considerations

### 1. Height Calculation Performance
- Use CSS-based solutions where possible
- Minimize JavaScript-based height calculations
- Debounce resize event handlers

### 2. HashCode Generation Performance
- Use efficient hashing algorithm (SHA-256 subset)
- Cache hash values for unchanged content
- Avoid rehashing on every keystroke

### 3. Syntax Highlighting Performance
- Lazy load Mermaid language extensions
- Optimize token recognition patterns
- Use incremental parsing for large documents

### 4. localStorage Performance
- Batch storage operations
- Implement storage cleanup for old entries
- Monitor storage quota usage

## Security Considerations

### 1. HashCode Security
- Use cryptographically secure hash function
- Prevent hash collision attacks
- Sanitize file content before hashing

### 2. localStorage Security
- Validate data before storage/retrieval
- Implement data integrity checks
- Handle storage quota exceeded gracefully

### 3. File System API Security
- Validate file permissions
- Handle permission denied scenarios
- Sanitize file names and paths