# Solution Outline Dependencies

## Required Package Installation

To support the markdown preview functionality in the Solution Outline workspace, you need to install the `marked` package:

```bash
npm install marked
npm install --save-dev @types/marked
```

## Package Details

### marked
- **Purpose**: Markdown parser and compiler
- **Usage**: Converts markdown text to HTML for the preview tab
- **Version**: Latest stable version
- **Documentation**: https://marked.js.org/

### @types/marked
- **Purpose**: TypeScript type definitions for marked
- **Usage**: Provides type safety for TypeScript development
- **Version**: Compatible with installed marked version

## Alternative Implementation

If you prefer not to add the `marked` dependency, you can replace the markdown preview with a simple text preview by updating the computed property:

```typescript
const renderedMarkdown = computed(() => {
  if (!editorContent.value) return ''
  // Simple text formatting instead of full markdown parsing
  return editorContent.value
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
})
```

This provides basic formatting without requiring an external dependency.

## Installation Command

Run this command in your project root:

```bash
npm install marked @types/marked
```

After installation, the Solution Outline workspace will be fully functional with markdown preview capabilities.