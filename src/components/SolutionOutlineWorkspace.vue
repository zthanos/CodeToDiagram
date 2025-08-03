<template>
  <div class="solution-outline-workspace">
    <!-- Header -->
    <div class="workspace-header">
      <h2 class="workspace-title">Solution Outline</h2>
      <div class="header-actions">
        <button class="save-btn" @click="saveSolutionOutline" :disabled="isSaving || !hasChanges"
          :class="{ 'saving': isSaving }">
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
          <div class="editor-controls">
            <div class="editor-status">
              <span v-if="hasChanges" class="unsaved-indicator">●</span>
              <select v-model="currentStatus" class="status-select" @change="handleStatusChange">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="view-toggle">
              <button class="toggle-btn" @click="toggleViewMode">
                {{ viewMode === 'edit' ? '👁️ Show' : '✏️ Edit' }}
              </button>
            </div>
          </div>
        </div>

        <div class="editor-container">
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading solution outline...</p>
          </div>

          <!-- Preview Mode - Full Width MarkdownRenderer -->
          <div v-else-if="viewMode === 'view'" class="preview-mode">
            <div class="preview-content-full">
              <MarkdownRenderer v-if="editorContent" :content="editorContent" />
              <div v-else class="empty-preview">
                <p>Start writing to see a preview here.</p>
              </div>
            </div>
          </div>

          <!-- Edit Mode - Full Width Editor -->
          <div v-else class="edit-mode">
            <textarea ref="markdownEditor" v-model="editorContent" class="markdown-editor" placeholder="# Solution Outline

## Overview
Describe the high-level solution approach...

## Architecture
Detail the system architecture and key components...

## Implementation Plan
Outline the development phases and milestones...

## Technical Requirements
List the technical specifications and constraints..." @input="handleEditorChange" @keydown="handleKeyDown"></textarea>
          </div>
        </div>
      </div>

      <!-- Right Panel - Tabbed Area (40%) -->
      <div class="right-panel">
        <div class="tab-header">
          <button class="tab-btn" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
            💬 AI Assistant
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'review' }" @click="activeTab = 'review'">
            � Revieiw
          </button>
        </div>

        <div class="tab-content">
          <!-- Chat Tab -->
          <div v-if="activeTab === 'chat'" class="chat-tab">
            <div class="chat-container">
              <div class="chat-messages" ref="chatMessagesContainer">
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

                <div v-for="(message, index) in chatMessages" :key="index" class="message"
                  :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }">
                  <div class="message-avatar">
                    {{ message.type === 'user' ? '👤' : '🤖' }}
                  </div>
                  <div class="message-content">
                    <div class="message-text">
                      <MarkdownRenderer v-if="message.type === 'ai'" :content="message.content" />

                      <!-- Use VueMarkdownRender for AI messages -->
                      <!-- <VueMarkdownRender 
                        v-if="message.type === 'ai'" 
                        :source="message.content"
                        class="markdown-content"
                      /> -->
                      <!-- Keep simple formatting for user messages -->
                      <div v-else v-html="formatMessage(message.content)"></div>
                    </div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                  </div>
                </div>

                <div v-if="isStreaming" class="message ai-message streaming">
                  <div class="message-avatar">🤖</div>
                  <div class="message-content">
                    <div class="message-text">
                      <MarkdownRenderer v-if="streamingContent" :content="streamingContent" />
                      <span v-else class="typing-indicator">
                        <span></span><span></span><span></span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="chat-input-container">
                <div class="chat-input-wrapper">
                  <textarea ref="chatInput" v-model="currentMessage" class="chat-input"
                    placeholder="Ask about your solution outline..." @keydown="handleChatKeyDown"
                    @input="adjustTextareaHeight" rows="1"></textarea>
                  <button class="send-btn" @click="sendMessage" :disabled="!currentMessage.trim() || isStreaming">
                    <span v-if="isStreaming">⏹️</span>
                    <span v-else>📤</span>
                  </button>
                </div>
                <div class="chat-actions">
                  <button class="action-btn" @click="insertContextPrompt" :disabled="isStreaming">
                    📋 Add Context
                  </button>
                  <button class="action-btn" @click="clearChat" :disabled="isStreaming">
                    🗑️ Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Review Tab -->
          <div v-if="activeTab === 'review'" class="review-tab">
            <div class="review-header">
              <div class="review-status">
                <h4>📋 Review Status</h4>
                <span class="status-badge" :class="reviewStatus.toLowerCase()">
                  {{ reviewStatus }}
                </span>
              </div>
              <button class="review-btn" @click="startReview" :disabled="!editorContent.trim()">
                🔍 Start Review
              </button>
            </div>

            <div class="review-content">
              <div v-if="reviewComments.length === 0" class="empty-review">
                <div class="empty-review-message">
                  <h4>No reviews yet</h4>
                  <p>Click "Start Review" to generate suggestions and comments for your solution outline.</p>
                </div>
              </div>

              <div v-else class="comments-list">
                <div v-for="(comment, index) in reviewComments" :key="index" class="comment-item"
                  :class="comment.state.toLowerCase()">
                  <div class="comment-header">
                    <div class="comment-meta">
                      <span class="comment-type">{{ comment.type }}</span>
                      <span class="comment-line" v-if="comment.line">Line {{ comment.line }}</span>
                    </div>
                    <div class="comment-state">
                      <select v-model="comment.state" @change="updateCommentState(comment)" class="state-select">
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>

                  <div class="comment-content">
                    <h5 class="comment-title">{{ comment.title }}</h5>
                    <p class="comment-description">{{ comment.description }}</p>

                    <div v-if="comment.suggestion" class="comment-suggestion">
                      <h6>💡 Suggestion:</h6>
                      <div class="suggestion-content">
                        <MarkdownRenderer :content="comment.suggestion" />
                      </div>
                    </div>
                  </div>

                  <div class="comment-actions">
                    <button v-if="comment.state === 'Open'" class="action-btn implement-btn"
                      @click="implementSuggestion(comment)">
                      ✅ Implement
                    </button>
                    <button class="action-btn dismiss-btn" @click="dismissComment(comment)">
                      ❌ Dismiss
                    </button>
                  </div>
                </div>
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
import VueMarkdownRender from 'vue-markdown-render'
import MarkdownRenderer from './MarkdownRenderer.vue'

// Configure marked for better rendering
marked.setOptions({
  breaks: true,        // Convert \n to <br>
  gfm: true,          // GitHub Flavored Markdown
  sanitize: false,    // Allow HTML (we trust our content)
  smartypants: false  // Don't convert quotes to smart quotes
})

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
const activeTab = ref<'chat' | 'review'>('chat')
const viewMode = ref<'edit' | 'view'>('edit')
const currentStatus = ref<'draft' | 'published' | 'archived'>('draft')

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
const chatMessagesContainer = ref<HTMLDivElement>()
const eventSource = ref<EventSource | null>(null)

// Review state
const reviewStatus = ref<'Draft' | 'In Review' | 'Approved' | 'Needs Changes'>('Draft')
const reviewComments = ref<ReviewComment[]>([])

// Review comment interface
interface ReviewComment {
  id: string
  type: 'Suggestion' | 'Issue' | 'Question' | 'Improvement'
  title: string
  description: string
  suggestion?: string
  line?: number
  state: 'Open' | 'In Progress' | 'Resolved' | 'Dismissed'
  timestamp: Date
}

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
  console.log('SolutionOutlineWorkspace mounted, chatMessages:', chatMessages.value)

  // Ensure chatMessages is properly initialized
  if (!Array.isArray(chatMessages.value)) {
    chatMessages.value = []
  }

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

// Watch for solution outline changes to sync status
watch(solutionOutline, (newOutline) => {
  if (newOutline?.status) {
    currentStatus.value = newOutline.status as 'draft' | 'published' | 'archived'
  }
}, { immediate: true })

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
      currentStatus.value
    )
    solutionOutline.value = saved
    hasChanges.value = false
    lastSaved.value = new Date()
    emit('unsaved-changes', false)

    console.log('Solution outline saved successfully:', {
      id: saved.id,
      version: saved.version,
      status: saved.status,
      project_id: saved.project_id
    })
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

  console.log('chatMessages before push:', chatMessages.value, 'type:', typeof chatMessages.value)

  const userMessage: ChatMessage = {
    type: 'user',
    content: currentMessage.value.trim(),
    timestamp: new Date()
  }

  // Ensure chatMessages is properly initialized
  if (!Array.isArray(chatMessages.value)) {
    console.error('chatMessages is not an array:', chatMessages.value)
    chatMessages.value = []
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

  console.log('Starting LLM streaming for prompt:', prompt.substring(0, 100) + '...')

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
    const baseUrl = 'http://localhost:8000' // Use direct URL since apiConfig might not be available
    const response = await fetch(`${baseUrl}/api/v1/llm/stream`, {
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
      const errorText = await response.text()
      console.error('HTTP error:', response.status, errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

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
                // Try to parse as JSON first
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  streamingContent.value += parsed.content
                  await nextTick()
                  scrollChatToBottom()
                }
              } catch (e) {
                // If JSON parsing fails, treat as plain text chunk
                console.log('Received plain text chunk:', data)
                if (data && data.trim()) {
                  streamingContent.value += data
                  await nextTick()
                  scrollChatToBottom()
                }
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

    // Add the complete AI response to chat
    if (streamingContent.value.trim()) {
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: streamingContent.value.trim(),
        timestamp: new Date()
      }
      chatMessages.value.push(aiMessage)
      console.log('Added complete AI message:', streamingContent.value.length, 'characters')
    } else {
      console.warn('No streaming content received')
    }

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
      try {
        console.log('Falling back to non-streaming API')
        const response = await ProjectApiService.generateLLMResponse(prompt, systemPrompt)
        const aiMessage: ChatMessage = {
          type: 'ai',
          content: response.content || response.response || 'Sorry, I encountered an error processing your request.',
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
  const container = chatMessagesContainer.value
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

// View mode toggle function
function toggleViewMode() {
  viewMode.value = viewMode.value === 'edit' ? 'view' : 'edit'
}

// Status change handler
function handleStatusChange() {
  hasChanges.value = true
  emit('unsaved-changes', true)
}

// Review functions
function startReview() {
  reviewStatus.value = 'In Review'

  // Generate sample review comments for now (UI only)
  reviewComments.value = [
    {
      id: '1',
      type: 'Suggestion',
      title: 'Add more detail to the Overview section',
      description: 'The overview section could benefit from more specific details about the problem being solved and the target audience.',
      suggestion: '**Consider adding:**\n- Problem statement\n- Target users/stakeholders\n- Success criteria\n- Key constraints',
      line: 3,
      state: 'Open',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'Issue',
      title: 'Architecture section needs technical details',
      description: 'The architecture section is missing key technical components and their relationships.',
      suggestion: '**Include:**\n- System components diagram\n- Data flow\n- Technology stack\n- Integration points',
      line: 8,
      state: 'Open',
      timestamp: new Date()
    },
    {
      id: '3',
      type: 'Improvement',
      title: 'Implementation plan could be more specific',
      description: 'Consider breaking down the implementation into more specific phases with timelines.',
      suggestion: '**Suggested structure:**\n- Phase 1: Foundation (2 weeks)\n- Phase 2: Core features (4 weeks)\n- Phase 3: Integration (2 weeks)\n- Phase 4: Testing & deployment (1 week)',
      line: 15,
      state: 'Open',
      timestamp: new Date()
    }
  ]
}

function updateCommentState(comment: ReviewComment) {
  console.log(`Comment ${comment.id} state updated to: ${comment.state}`)
  // In a real implementation, this would sync with the backend
}

function implementSuggestion(comment: ReviewComment) {
  comment.state = 'In Progress'
  console.log(`Implementing suggestion for comment: ${comment.id}`)
  // In a real implementation, this would apply the suggestion to the editor
  // For now, just mark as in progress
}

function dismissComment(comment: ReviewComment) {
  comment.state = 'Dismissed'
  console.log(`Dismissed comment: ${comment.id}`)
}

function formatMessage(content: string): string {
  // Full markdown rendering for chat messages
  try {
    console.log('Formatting content:', content.substring(0, 100) + '...')
    const result = marked(content)
    console.log('Marked result:', result.substring(0, 100) + '...')
    return result
  } catch (error) {
    console.error('Error rendering markdown:', error)
    console.log('Using fallback formatting for:', content.substring(0, 50))
    // Fallback to simple formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
  }
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
  to {
    transform: rotate(360deg);
  }
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

.status-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: border-color 0.2s;
}

.status-select:hover {
  border-color: #9ca3af;
}

.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
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
  height: 100%;
  min-height: 400px;
  border: none;
  outline: none;
  padding: 1.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: white;
  color: #374151;
  box-sizing: border-box;
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
  height: 100%;
  overflow: hidden;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  justify-content: space-between;
}

.chat-messages {
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  min-height: 0;
  scroll-behavior: smooth;
  height: 0;
}

/* Custom scrollbar styling */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
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

/* Markdown styling for chat messages */
.message-text h1,
.message-text h2,
.message-text h3,
.message-text h4,
.message-text h5,
.message-text h6 {
  margin: 0.5rem 0;
  color: #1f2937;
}

.message-text h1 {
  font-size: 1.5rem;
}

.message-text h2 {
  font-size: 1.3rem;
}

.message-text h3 {
  font-size: 1.1rem;
}

.message-text h4,
.message-text h5,
.message-text h6 {
  font-size: 1rem;
}

.message-text p {
  margin: 0.5rem 0;
  line-height: 1.5;
}

.message-text code {
  background: #e5e7eb;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

.message-text pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.message-text pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}

.message-text ul,
.message-text ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.message-text li {
  margin: 0.25rem 0;
  line-height: 1.4;
}

.message-text blockquote {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #6b7280;
  font-style: italic;
}

.message-text strong {
  font-weight: 600;
  color: #1f2937;
}

.message-text em {
  font-style: italic;
}

.message-text a {
  color: #2563eb;
  text-decoration: underline;
}

.message-text a:hover {
  color: #1d4ed8;
}

.message-text table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

.message-text th,
.message-text td {
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  text-align: left;
}

.message-text th {
  background: #f3f4f6;
  font-weight: 600;
}

/* Vue Markdown Render component styling */
.markdown-content {
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 0.5rem 0;
  color: #1f2937;
}

.markdown-content h1 {
  font-size: 1.5rem;
}

.markdown-content h2 {
  font-size: 1.3rem;
}

.markdown-content h3 {
  font-size: 1.1rem;
}

.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  font-size: 1rem;
}

.markdown-content p {
  margin: 0.5rem 0;
}

.markdown-content strong {
  font-weight: 600;
  color: #1f2937;
}

.markdown-content em {
  font-style: italic;
}

.markdown-content code {
  background: #e5e7eb;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
}

.markdown-content pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.markdown-content pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}

.markdown-content ul,
.markdown-content ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.markdown-content li {
  margin: 0.25rem 0;
}

.markdown-content blockquote {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  margin: 0.5rem 0;
  color: #6b7280;
  font-style: italic;
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

  0%,
  80%,
  100% {
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
  flex-shrink: 0;
  position: relative;
  z-index: 1;
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
  min-height: 120px;
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


/* Editor Controls and Toggle */
.editor-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.view-toggle {
  display: flex;
}

.toggle-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Full Width Modes */
.preview-mode,
.edit-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.preview-content-full {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding-bottom: 6rem;
}

.edit-mode .markdown-editor {
  flex: 1;
  height: 100%;

  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

/* Removed old split-view CSS - now using full-width modes */

/* Review Tab Styles */
.review-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.review-status h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #374151;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.draft {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.in.review {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.approved {
  background: #d1fae5;
  color: #059669;
}

.status-badge.needs.changes {
  background: #fee2e2;
  color: #dc2626;
}

.review-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.review-btn:hover:not(:disabled) {
  background: #2563eb;
}

.review-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.review-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-review {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-review-message h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.comment-item.open {
  border-left: 4px solid #3b82f6;
}

.comment-item.in.progress {
  border-left: 4px solid #f59e0b;
}

.comment-item.resolved {
  border-left: 4px solid #10b981;
  opacity: 0.7;
}

.comment-item.dismissed {
  border-left: 4px solid #6b7280;
  opacity: 0.5;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.comment-type {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e5e7eb;
  color: #374151;
}

.comment-line {
  font-size: 0.75rem;
  color: #6b7280;
}

.state-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  background: white;
}

.comment-content {
  padding: 1rem;
}

.comment-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #374151;
}

.comment-description {
  margin: 0 0 1rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.comment-suggestion {
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.comment-suggestion h6 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #0369a1;
}

.suggestion-content {
  font-size: 0.875rem;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.action-btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.implement-btn {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.implement-btn:hover {
  background: #059669;
}

.dismiss-btn {
  background: #6b7280;
  color: white;
  border-color: #6b7280;
}

.dismiss-btn:hover {
  background: #4b5563;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .preview-content-full {
    padding: 1rem;
    overflow: auto;
    padding-bottom: 6rem;
  }

  .toggle-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
  }
}
</style>