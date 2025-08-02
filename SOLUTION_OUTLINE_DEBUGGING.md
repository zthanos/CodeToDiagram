# Solution Outline Debugging Guide

## Issue Fixed: chatMessages.value.push is not a function

### Root Cause
The error was caused by a naming conflict between the template ref `ref="chatMessages"` and the reactive variable `chatMessages`. This caused Vue to overwrite the reactive array with the DOM element reference.

### Fix Applied
1. **Renamed template ref**: Changed `ref="chatMessages"` to `ref="chatMessagesContainer"`
2. **Updated ref declaration**: Changed `chatMessages_ref` to `chatMessagesContainer`
3. **Updated scroll function**: Updated `scrollChatToBottom()` to use the new ref name
4. **Added safety checks**: Added array validation in `sendMessage()` function

### Code Changes Made

#### Template Reference Fix
```vue
<!-- Before -->
<div class="chat-messages" ref="chatMessages">

<!-- After -->
<div class="chat-messages" ref="chatMessagesContainer">
```

#### Script Reference Fix
```typescript
// Before
const chatMessages_ref = ref<HTMLDivElement>()

// After  
const chatMessagesContainer = ref<HTMLDivElement>()
```

#### Function Update
```typescript
// Before
function scrollChatToBottom() {
  const container = chatMessages_ref.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

// After
function scrollChatToBottom() {
  const container = chatMessagesContainer.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}
```

#### Safety Check Added
```typescript
async function sendMessage() {
  if (!currentMessage.value.trim() || isStreaming.value) return
  
  // Ensure chatMessages is properly initialized
  if (!Array.isArray(chatMessages.value)) {
    console.error('chatMessages is not an array:', chatMessages.value)
    chatMessages.value = []
  }
  
  const userMessage: ChatMessage = {
    type: 'user',
    content: currentMessage.value.trim(),
    timestamp: new Date()
  }
  
  chatMessages.value.push(userMessage)
  // ... rest of function
}
```

## Additional Fixes Applied

### 1. Marked.js Import Fix
Added fallback for when marked package is not installed:

```typescript
// Import marked with fallback
let marked: any
try {
  marked = require('marked').marked
} catch (e) {
  // Fallback if marked is not installed
  marked = (text: string) => text.replace(/\n/g, '<br>')
}
```

### 2. API URL Fix
Fixed hardcoded API URL for better reliability:

```typescript
// Use direct URL since apiConfig might not be available
const baseUrl = 'http://localhost:8000'
const response = await fetch(`${baseUrl}/api/v1/llm/stream`, {
  // ... request config
})
```

### 3. Response Handling Fix
Improved response handling for LLM API:

```typescript
const aiMessage: ChatMessage = {
  type: 'ai',
  content: response.content || response.response || 'Sorry, I encountered an error processing your request.',
  timestamp: new Date()
}
```

## Testing Steps

1. **Verify Chat Functionality**:
   - Open Solution Outline workspace
   - Switch to AI Assistant tab
   - Type a message and press Enter
   - Verify message appears in chat history

2. **Test Streaming**:
   - Send a message to the AI
   - Verify streaming response appears
   - Check browser console for any errors

3. **Test Markdown Editor**:
   - Type content in the left editor
   - Switch to Preview tab
   - Verify markdown is rendered correctly

## Common Issues and Solutions

### Issue: "marked is not defined"
**Solution**: Install the marked package:
```bash
npm install marked @types/marked
```

### Issue: API connection errors
**Solution**: Verify backend is running on `http://localhost:8000` and endpoints are available

### Issue: Streaming not working
**Solution**: Check browser console for CORS errors or network issues

### Issue: Auto-save not working
**Solution**: Verify the solution outline API endpoints are working:
- `GET /api/v1/projects/{project_id}/solution-outlines/latest`
- `POST /api/v1/projects/{project_id}/solution-outlines`

## Debug Console Commands

To debug the component state in browser console:

```javascript
// Check if chatMessages is properly initialized
console.log('chatMessages:', chatMessages.value)

// Check component state
console.log('Component state:', {
  isLoading: isLoading.value,
  hasChanges: hasChanges.value,
  activeTab: activeTab.value,
  editorContent: editorContent.value?.length
})

// Test message sending
sendMessage()
```

## Next Steps

1. Install required dependencies: `npm install marked @types/marked`
2. Verify backend API endpoints are working
3. Test the chat functionality
4. Test the markdown editor and preview
5. Verify auto-save functionality

The component should now work correctly without the `push is not a function` error.