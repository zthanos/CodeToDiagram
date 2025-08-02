<template>
  <div class="solution-outline-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <h2 class="workspace-title">Solution Outline</h2>
      <div class="header-actions">
        <button 
          class="save-btn" 
          @click="saveSolutionOutline"
          :disabled="isSaving || !hasChanges"
          :class="{ 'saving': isSaving }"
        >
          <span v-if="isSaving" class="spinner"></span>
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
        <span v-if="lastSaved" class="last-saved">
          Last saved: {{ formatTime(lastSaved) }}
        </span>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel - Markdown Editor (60%) -->
      <div class="editor-panel">
        <div class="editor-header">
          <h3>📝 Solution Outline</h3>
          <div class="editor-status">
            <span v-if="hasChanges" class="unsaved-indicator">●</span>
            <span class="status-text">{{ solutionOutline?.status || 'draft' }}</span>
          </div>
        </div>
        
        <div class="editor-container">
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading solution outline...</p>
          </div>
          
          <textarea
            v-else
            ref="markdownEditor"
            v-model="editorContent"
            class="markdown-editor"
            placeholder="# Solution Outline

## Overview
Describe the high-level solution approach...

## Architecture
Detail the system architecture and key components...

## Implementation Plan
Outline the development phases and milestones...

## Technical Requirements
List the technical specifications and constraints..."
            @input="handleEditorChange"
            @keydown="handleKeyDown"
          ></textarea>
        </div>
      </div>

      <!-- Right Panel - Tabbed Area (40%) -->
      <div class="right-panel">
        <div class="tab-header">
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'chat' }"
            @click="activeTab = 'chat'"
          >
            💬 AI Assistant
          </button>
          <button 
            class="tab-btn"
            :class="{ active: activeTab === 'preview' }"
            @click="activeTab = 'preview'"
          >
            👁️ Preview
          </button>
        </div>

        <div class="tab-content">
          <!-- Chat Tab -->
          <div v-if="activeTab === 'chat'" class="chat-tab">
            <div class="chat-container">
              <div class="chat-messages" ref="chatMessages">
                <div v-if="chatMessages.length === 0" class="empty-chat">
                  <div class="welcome-message">
                    <h4>🤖 AI Assistant</h4>
                    <p>Ask me anything about your solution outline. I can help you:</p>
                    <ul>
                      <li>Improve the structure and content</li>
                      <li>Suggest technical approaches</li>
                      <li>Review architecture decisions</li>
                      <li>Generate implementation details</li>
                    </ul>
                  </div>
                </div>
                
                <div 
                  v-for="(message, index) in chatMessages" 
                  :key="index" 
                  class="message"
                  :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }"
                >
                  <div class="message-avatar">
                    {{ message.type === 'user' ? '👤' : '🤖' }}
                  </div>
                  <div class="message-content">
                    <div class="message-text" v-html="formatMessage(message.content)"></div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                  </div>
                </div>

                <div v-if="isStreaming" class="message ai-message streaming">
                  <div class="message-avatar">🤖</div>
                  <div class="message-content">
                    <div class="message-text">
                      <span v-if="streamingContent">{{ streamingContent }}</span>
                      <span v-else class="typing-indicator">
                        <span></span><span></span><span></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="chat-input-container">
                <div class="chat-input-wrapper">
                  <textarea
                    ref="chatInput"
                    v-model="currentMessage"
                    class="chat-input"
                    placeholder="Ask about your solution outline..."
                    @keydown="handleChatKeyDown"
                    @input="adjustTextareaHeight"
                    rows="1"
                  ></textarea>
                  <button 
                    class="send-btn"
                    @click="sendMessage"
                    :disabled="!currentMessage.trim() || isStreaming"
                  >
                    <span v-if="isStreaming">⏹️</span>
                    <span v-else>📤</span>
                  </button>
                </div>
                <div class="chat-actions">
                  <button 
                    class="action-btn"
                    @click="insertContextPrompt"
                    :disabled="isStreaming"
                  >
                    📋 Add Context
                  </button>
                  <button 
                    class="action-btn"
                    @click="clearChat"
                    :disabled="isStreaming"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Tab -->
          <div v-if="activeTab === 'preview'" class="preview-tab">
            <div class="preview-container">
              <div v-if="editorContent" class="markdown-preview" v-html="renderedMarkdown"></div>
              <div v-else class="empty-preview">
                <p>Start writing in the editor to see a preview here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { ProjectApiService } from '../services/ProjectApiService'
import { marked } from 'marked'

interface ChatMessage {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface SolutionOutline {
  content: string
  status: string
  id: number
  project_id: string
  version: number
  created_at: string
  updated_at: string
}

const props = defineProps<{
  project: any
}>()

const emit = defineEmits<{
  'project-updated': [project: any]
  'unsaved-changes': [hasChanges: boolean]
}>()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const hasChanges = ref(false)
const lastSaved = ref<Date | null>(null)
const activeTab = ref<'chat' | 'preview'>('chat')

// Editor state
const editorContent = ref('')
const solutionOutline = ref<SolutionOutline | null>(null)
const markdownEditor = ref<HTMLTextAreaElement>()

// Chat state
const chatMessages = ref<ChatMessage[]>([])
const currentMessage = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const chatInput = ref<HTMLTextAreaElement>()
const chatMessages_ref = ref<HTMLDivElement>()
const eventSource = ref<EventSource | null>(null)

// Auto-save timer
let autoSaveTimer: NodeJS.Timeout | null = null

// Computed
const renderedMarkdown = computed(() => {
  if (!editorContent.value) return ''
  try {
    return marked(editorContent.value)
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return '<p>Error parsing markdown</p>'
  }
})

// Lifecycle
onMounted(async () => {
  await loadSolutionOutline()
  setupAutoSave()
})

onBeforeUnmount(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  if (eventSource.value) {
    eventSource.value.close()
  }
})

// Watch for changes
watch(editorContent, () => {
  hasChanges.value = true
  emit('unsaved-changes', true)
  resetAutoSaveTimer()
})

// Methods
async function loadSolutionOutline() {
  if (!props.project?.id) return
  
  isLoading.value = true
  try {
    const outline = await ProjectApiService.getLatestSolutionOutline(props.project.id)
    solutionOutline.value = outline
    editorContent.value = outline.content || ''
    hasChanges.value = false
    emit('unsaved-changes', false)
  } catch (error) {
    console.error('Failed to load solution outline:', error)
    // Initialize with empty content if no outline exists
    editorContent.value = ''
    hasChanges.value = false
  } finally {
    isLoading.value = false
  }
}

async function saveSolutionOutline() {
  if (!props.project?.id || !hasChanges.value) return
  
  isSaving.value = true
  try {
    const saved = await ProjectApiService.saveSolutionOutline(
      props.project.id,
      editorContent.value,
      'draft'
    )
    solutionOutline.value = saved
    hasChanges.value = false
    lastSaved.value = new Date()
    emit('unsaved-changes', false)
  } catch (error) {
    console.error('Failed to save solution outline:', error)
    // Could show a notification here
  } finally {
    isSaving.value = false
  }
}

function handleEditorChange() {
  // Changes are handled by the watcher
}

function handleKeyDown(event: KeyboardEvent) {
  // Handle Ctrl+S for save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveSolutionOutline()
  }
  
  // Handle Tab for indentation
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // Insert tab character
    const value = textarea.value
    textarea.value = value.substring(0, start) + '  ' + value.substring(end)
    
    // Move cursor
    textarea.selectionStart = textarea.selectionEnd = start + 2
    
    // Trigger input event to update v-model
    textarea.dispatchEvent(new Event('input'))
  }
}

function setupAutoSave() {
  // Auto-save every 30 seconds if there are changes
  autoSaveTimer = setInterval(() => {
    if (hasChanges.value && !isSaving.value) {
      saveSolutionOutline()
    }
  }, 30000)
}

function resetAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  setupAutoSave()
}

// Chat methods
async function sendMessage() {
  if (!currentMessage.value.trim() || isStreaming.value) return
  
  const userMessage: ChatMessage = {
    type: 'user',
    content: currentMessage.value.trim(),
    timestamp: new Date()
  }
  
  chatMessages.value.push(userMessage)
  const prompt = currentMessage.value.trim()
  currentMessage.value = ''
  
  // Scroll to bottom
  await nextTick()
  scrollChatToBottom()
  
  // Start streaming response
  await streamLLMResponse(prompt)
}

async function streamLLMResponse(prompt: string) {
  isStreaming.value = true
  streamingContent.value = ''
  
  try {
    // Create system prompt with context
    const systemPrompt = `You are an AI assistant helping with solution outline development. 
    
Current solution outline content:
${editorContent.value}

Project context:
- Project: ${props.project?.name || 'Unknown'}
- Description: ${props.project?.description || 'No description'}

Please provide helpful, specific advice about the solution outline. Be concise and actionable.`

    // Use the direct streaming endpoint
    const response = await fetch(`${ProjectApiService.apiConfig?.baseUrl || 'http://localhost:8000'}/api/v1/llm/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        system_prompt: systemPrompt,
        prompt_key: 'unknown',
        options: {}
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (reader) {
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                streamingContent.value += parsed.content
                await nextTick()
                scrollChatToBottom()
              }
            } catch (e) {
              // Ignore parsing errors for SSE format
            }
          }
        }
      }
    }

    // Add the complete AI response to chat
    if (streamingContent.value) {
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: streamingContent.value,
        timestamp: new Date()
      }
      chatMessages.value.push(aiMessage)
    }

  } catch (error) {
    console.error('Streaming error:', error)
    
    // Fallback to non-streaming API
    try {
      const response = await ProjectApiService.generateLLMResponse(prompt, systemPrompt)
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: response.content || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }
      chatMessages.value.push(aiMessage)
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError)
      const errorMessage: ChatMessage = {
        type: 'ai',
        content: 'Sorry, I\'m currently unavailable. Please try again later.',
        timestamp: new Date()
      }
      chatMessages.value.push(errorMessage)
    }
  } finally {
    isStreaming.value = false
    streamingContent.value = ''
    await nextTick()
    scrollChatToBottom()
  }
}

function handleChatKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function adjustTextareaHeight() {
  const textarea = chatInput.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }
}

function scrollChatToBottom() {
  const container = chatMessages_ref.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

function insertContextPrompt() {
  const contextPrompt = `Please review my solution outline and suggest improvements for:\n\n1. Structure and organization\n2. Technical approach\n3. Missing components\n4. Implementation details\n\nCurrent outline:\n${editorContent.value.slice(0, 500)}${editorContent.value.length > 500 ? '...' : ''}`
  currentMessage.value = contextPrompt
}

function clearChat() {
  chatMessages.value = []
}

function formatMessage(content: string): string {
  // Simple markdown-like formatting for chat messages
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.solution-outline-workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.workspace-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #2563eb;
}

.save-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.save-btn.saving {
  background: #6b7280;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.last-saved {
  font-size: 0.75rem;
  color: #6b7280;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Left Panel - Editor (60%) */
.editor-panel {
  width: 60%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.editor-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.unsaved-indicator {
  color: #f59e0b;
  font-size: 1.2rem;
  line-height: 1;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.markdown-editor {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  padding: 1.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: white;
  color: #374151;
}

.markdown-editor::placeholder {
  color: #9ca3af;
}

/* Right Panel - Tabs (40%) */
.right-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  background: white;
}

.tab-header {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.tab-btn.active {
  color: #3b82f6;
  background: white;
  border-bottom-color: #3b82f6;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Chat Tab */
.chat-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.empty-chat {
  text-align: center;
  color: #6b7280;
  padding: 2rem 1rem;
}

.welcome-message h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.welcome-message ul {
  text-align: left;
  max-width: 300px;
  margin: 1rem auto 0;
}

.welcome-message li {
  margin-bottom: 0.5rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: #dbeafe;
}

.ai-message .message-avatar {
  background: #f3f4f6;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 0.25rem;
  word-wrap: break-word;
}

.user-message .message-text {
  background: #dbeafe;
  color: #1e40af;
}

.ai-message .message-text {
  background: #f3f4f6;
  color: #374151;
}

.message-time {
  font-size: 0.75rem;
  color: #9ca3af;
  padding: 0 1rem;
}

.streaming .message-text {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.typing-indicator {
  display: inline-flex;
  gap: 0.25rem;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input-container {
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  background: #f8fafc;
}

.chat-input-wrapper {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.chat-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.875rem;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.send-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
  min-width: 44px;
}

.send-btn:hover:not(:disabled) {
  background: #2563eb;
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #e5e7eb;
  color: #374151;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Preview Tab */
.preview-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.markdown-preview {
  color: #374151;
  line-height: 1.6;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  color: #1f2937;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.markdown-preview h1 {
  font-size: 1.875rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.markdown-preview h2 {
  font-size: 1.5rem;
}

.markdown-preview h3 {
  font-size: 1.25rem;
}

.markdown-preview p {
  margin-bottom: 1rem;
}

.markdown-preview ul,
.markdown-preview ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-preview li {
  margin-bottom: 0.25rem;
}

.markdown-preview code {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-size: 0.875rem;
}

.markdown-preview pre {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-preview blockquote {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #6b7280;
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .editor-panel,
  .right-panel {
    width: 100%;
  }
  
  .editor-panel {
    height: 60%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .right-panel {
    height: 40%;
  }
}

@media (max-width: 768px) {
  .workspace-header {
    padding: 0.75rem 1rem;
  }
  
  .workspace-title {
    font-size: 1.25rem;
  }
  
  .header-actions {
    gap: 0.5rem;
  }
  
  .save-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .markdown-editor {
    padding: 1rem;
    font-size: 13px;
  }
  
  .chat-messages {
    padding: 0.75rem;
  }
  
  .chat-input-container {
    padding: 0.75rem;
  }
}
</style>