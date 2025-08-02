# SSE Streaming Fix for LLM Chat

## Issue Identified

The LLM streaming was not working properly because the client-side code was not correctly parsing the Server-Sent Events (SSE) format sent by the backend.

## Server-Side SSE Format

Based on your server logs, the backend sends SSE events in this format:

```
event: llm.start
data: {'message': 'Starting LLM processing', 'prompt_key': 'unknown'}

event: llm.chunk
data: {'content': 'Okay', 'prompt_key': 'unknown'}

event: llm.chunk
data: {'content': ',', 'prompt_key': 'unknown'}

event: llm.chunk
data: {'content': ' let', 'prompt_key': 'unknown'}

...

event: llm.complete
data: {'message': 'LLM processing complete', 'prompt_key': 'unknown'}
```

## Problem with Previous Implementation

The old code was:
1. Only looking for `data: ` lines
2. Not handling the `event: ` lines properly
3. Not distinguishing between different event types
4. Missing the proper JSON parsing for the data payload

## Fixed Implementation

### 1. Proper SSE Event Parsing

```typescript
if (reader) {
  let buffer = ''
  let currentEvent = ''
  
  while (true) {
    const { done, value } = await reader.read()
    
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('event: ')) {
        currentEvent = trimmedLine.slice(7)
      } else if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6)
        
        // Handle different event types
        if (currentEvent === 'llm.chunk') {
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              streamingContent.value += parsed.content
              await nextTick()
              scrollChatToBottom()
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data, e)
          }
        } else if (currentEvent === 'llm.complete') {
          console.log('LLM streaming complete')
          break
        } else if (currentEvent === 'llm.start') {
          console.log('LLM streaming started')
        }
        
        // Reset event after processing
        currentEvent = ''
      } else if (trimmedLine === '') {
        // Empty line indicates end of event
        currentEvent = ''
      }
    }
  }
}
```

### 2. Event Type Handling

The fix now properly handles different SSE event types:

- **`llm.start`**: Indicates streaming has begun
- **`llm.chunk`**: Contains content chunks to display
- **`llm.complete`**: Indicates streaming is finished

### 3. Improved Error Handling

```typescript
} catch (error) {
  console.error('Streaming error:', error)
  
  // If we got some streaming content before the error, use it
  if (streamingContent.value.trim()) {
    const aiMessage: ChatMessage = {
      type: 'ai',
      content: streamingContent.value.trim(),
      timestamp: new Date()
    }
    chatMessages.value.push(aiMessage)
    console.log('Used partial streaming content due to error')
  } else {
    // Fallback to non-streaming API
    // ... fallback logic
  }
}
```

### 4. Better Debugging

Added comprehensive logging to help debug streaming issues:

```typescript
console.log('Starting LLM streaming for prompt:', prompt.substring(0, 100) + '...')
console.log('Response headers:', Object.fromEntries(response.headers.entries()))
console.log('Added complete AI message:', streamingContent.value.length, 'characters')
```

## Testing the Fix

### 1. Open Browser Developer Tools
- Go to Console tab to see debug logs
- Go to Network tab to see the streaming request

### 2. Send a Chat Message
- Type a message in the AI Assistant chat
- Press Enter or click Send
- Watch the console for debug logs

### 3. Expected Behavior
You should see:
- "Starting LLM streaming for prompt: ..." log
- Response headers logged
- Real-time content appearing in the chat as it streams
- "LLM streaming complete" when finished
- "Added complete AI message: X characters" when done

### 4. Network Tab Verification
In the Network tab, you should see:
- A POST request to `/api/v1/llm/stream`
- Response type: `text/event-stream`
- Response showing the SSE events

## Common Issues and Solutions

### Issue: No streaming content appears
**Check**: Browser console for parsing errors
**Solution**: Verify the JSON format in SSE data matches expected structure

### Issue: Streaming stops early
**Check**: Console for "LLM streaming complete" message
**Solution**: Ensure the `llm.complete` event is being sent by the server

### Issue: Content appears all at once instead of streaming
**Check**: Network tab to verify SSE is being used
**Solution**: Ensure server is sending `Content-Type: text/event-stream`

### Issue: CORS errors
**Check**: Browser console for CORS-related errors
**Solution**: Ensure backend allows the frontend origin

## Server-Side Verification

To verify the server is working correctly, you can test the endpoint directly:

```bash
curl -X POST http://localhost:8000/api/v1/llm/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?",
    "system_prompt": "You are a helpful assistant",
    "prompt_key": "unknown",
    "options": {}
  }'
```

You should see the SSE events streaming in real-time.

## Next Steps

1. Test the chat functionality with the fixed implementation
2. Verify streaming works in different browsers
3. Test with longer prompts to ensure streaming continues properly
4. Monitor for any remaining parsing errors in the console

The streaming should now work correctly with your SSE-based LLM backend!