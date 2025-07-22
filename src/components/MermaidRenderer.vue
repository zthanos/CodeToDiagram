<template>
  <div class="mermaid-renderer">
    <!-- Notifications -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <span class="notification-icon">{{ notification.icon }}</span>
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="hideNotification">×</button>
    </div>

    <!-- Editor Section (Collapsible) -->
    <div class="editor-section">
      <div class="editor-section-header" @click="toggleEditorSection">
        <h3>Mermaid Code Editor</h3>
        <button class="collapse-btn" :class="{ 'collapsed': !isEditorSectionExpanded }">
          {{ isEditorSectionExpanded ? '▼' : '▶' }}
        </button>
      </div>

      <div v-show="isEditorSectionExpanded" class="editor-section-content">
        <div class="editor-toolbar">
          <div class="toolbar-section file-info">
            <div class="current-file-display">
              <span class="file-icon">📄</span>
              <span class="file-name">{{ currentFileName }}</span>
            </div>
          </div>
          <div class="toolbar-section file-operations">
            <button class="toolbar-btn" @click="onSave" title="Save File (Ctrl+S)">
              💾 Save
            </button>
            <button class="toolbar-btn" @click="exportImageWithErrorHandling" title="Export as PNG">
              🖼️ Export
            </button>
          </div>
        </div>

        <div class="editor-container">
          <CodeEditor v-model="code" :language="'mermaid'" :theme="theme" @changed="onChanged" />
        </div>
      </div>
    </div>

    <!-- Diagram Renderer Section -->
    <div class="renderer-section">
      <div class="section-header">
        <h3>Diagram Preview</h3>
        <div class="renderer-actions">
          <button @click="refreshDiagram" class="refresh-btn" title="Refresh Diagram">
            🔄 Refresh
          </button>
          <button @click="exportImageWithErrorHandling" class="export-btn" title="Export as PNG">
            🖼️ Export
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isRendering" class="loading-state">
        <div class="spinner"></div>
        <p>Rendering diagram...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="renderError" class="error-state">
        <div class="error-icon">⚠️</div>
        <h4>Diagram Render Error</h4>
        <p class="error-message">{{ renderError }}</p>
        <div class="error-actions">
          <button @click="refreshDiagram" class="retry-btn">
            <span class="retry-icon">🔄</span>
            Retry
          </button>
          <button @click="clearRenderError" class="dismiss-btn">Dismiss</button>
        </div>
      </div>

      <!-- Diagram Container -->
      <div v-else class="diagram-container" :class="`mermaid-theme-${theme}`">
        <div class="mermaid-wrapper">
          <div class="mermaid" ref="diagramContainer"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import mermaid from 'mermaid';
import CodeEditor from './CodeEditor.vue'; // import your CodeEditor component
import { ProjectManager } from '../services/ProjectManager';
import NotificationService from '../services/NotificationService';



const props = defineProps<{
  theme: string;
  diagramId: number | null
}>();

const emit = defineEmits<{
  (e: 'update:theme', theme: string): void;
  (e: 'content-changed', content: string): void;
  (e: 'request-save', content: string): void;
}>();

const showCreateDialog = ref(false)
const code = ref(`graph TD\n  A --> B\n  B --> C`);
const leftWidth = ref(50);
const diagramContainer = ref<HTMLDivElement | null>(null);
const isEditorSectionExpanded = ref(true);
const isRendering = ref(false);
const renderError = ref<string | null>(null);
const currentFileName = ref('Untitled Document');


onMounted(async () => {
  try {
    const currentProject = ProjectManager.getInstance().getCurrentProject();
    if (!currentProject) throw new Error('No active project');
    if (props.diagramId) {
      const diagram = await ProjectManager.getInstance().loadDiagram(props.diagramId);
      code.value = diagram.content; // ή diagram.diagramContent ανάλογα το API
    }
  } catch (error) {
    notification.value = {
      show: true,
      message: `Failed to load diagram: ${error.message}`,
      type: 'error',
      icon: '❌',
    };
    code.value = 'graph TD\n  A --> B\n  B --> C'; // fallback example
  }
});

const notification = ref({
  show: false,
  message: '',
  type: 'info',
  icon: 'ℹ️',
});

// // Watch for initial content changes from parent
// watch(() => props.initialContent, (newContent) => {
//   if (newContent !== undefined && newContent !== code.value) {
//     code.value = newContent;
//   }
// }, { immediate: true });

watch([code, () => props.theme], async () => {
  await nextTick();
  renderDiagram();
}, { immediate: true });

function onChanged(newCode: string) {
  code.value = newCode;
  // Emit content changes to parent component
  emit('content-changed', newCode);
}

function emitNotification(msg, msgType, icon) {
  notification.value = {
    show: true,
    message: msg,
    type: msgType,
    icon: icon,
  };
}

function onSave() {
  emit('request-save', code.value);
}


function renderDiagram() {
  if (!diagramContainer.value) return;
  try {
    mermaid.initialize({ startOnLoad: false, theme: props.theme || 'default' });
    const uniqueId = `mermaid-svg-${Date.now()}`;
    mermaid.render(uniqueId, code.value).then(({ svg }) => {
      if (diagramContainer.value) {
        diagramContainer.value.innerHTML = svg;
      }
    });
  } catch (error) {
    diagramContainer.value!.innerHTML = `<div class="error">Error rendering diagram: ${error.message}</div>`;
  }
}


const dragging = ref(false);
let dragStartX = 0;
let dragStartWidth = 50;

function startDrag(e: MouseEvent) {
  dragging.value = true;
  dragStartX = e.clientX;
  dragStartWidth = leftWidth.value;
  document.body.style.cursor = 'col-resize';

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!dragging.value) return;
  const delta = e.clientX - dragStartX;
  const totalWidth = document.body.clientWidth;
  let newWidth = dragStartWidth + (delta / totalWidth) * 100;
  newWidth = Math.max(10, Math.min(90, newWidth));
  leftWidth.value = newWidth;
}

function stopDrag() {
  dragging.value = false;
  document.body.style.cursor = '';
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

function hideNotification() {
  notification.value.show = false;
}
// New methods for the redesigned interface
function toggleEditorSection() {
  isEditorSectionExpanded.value = !isEditorSectionExpanded.value
}

function refreshDiagram() {
  renderError.value = null
  isRendering.value = true

  setTimeout(() => {
    try {
      renderDiagram()
      isRendering.value = false
      NotificationService.success('Refreshed', 'Diagram refreshed successfully')
    } catch (error) {
      renderError.value = error instanceof Error ? error.message : 'Failed to render diagram'
      isRendering.value = false
    }
  }, 500) // Small delay to show loading state
}

function clearRenderError() {
  renderError.value = null
}

async function exportImageWithErrorHandling() {
  try {
    // Implementation for exporting diagram as image
    NotificationService.info('Export', 'Export functionality will be implemented')
  } catch (error) {
    NotificationService.error('Export Failed', 'Failed to export diagram')
  }
}

async function handleDiagramSaved(savedDiagram: any) {
  emitNotification('Diagram created successfully', 'success', '✅')
  showCreateDialog.value = false
  // No need to emit content-changed after save - the content hasn't changed, it was just saved
  // The parent component will handle updating the tab state through the saved event
}

</script>

<style scoped>
.mermaid-renderer {
  padding: 24px;
  margin: 0 auto;
  height: 70vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f9fafb;
}

/* Notifications */
.notification {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  border-left: 4px solid;
}

.notification.success {
  background: #d1fae5;
  border-left-color: #10b981;
  color: #065f46;
}

.notification.error {
  background: #fee2e2;
  border-left-color: #ef4444;
  color: #991b1b;
}

.notification.info {
  background: #dbeafe;
  border-left-color: #3b82f6;
  color: #1e40af;
}

.notification-icon {
  font-size: 16px;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.notification-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-close:hover {
  opacity: 1;
}

/* Editor Section (Collapsible) */
.editor-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
}

.editor-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 16px;
  padding: 8px 0;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.editor-section-header:hover {
  background-color: rgba(59, 130, 246, 0.05);
}

.editor-section-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.collapse-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.collapse-btn.collapsed {
  transform: rotate(-90deg);
}

.editor-section-content {
  animation: slideDown 0.3s ease-out;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 16px;
  gap: 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-operations {
  flex: 0 0 auto;
}

.current-file-display {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.toolbar-btn:disabled {
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.editor-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  min-height: 300px;
}

/* Renderer Section */
.renderer-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.renderer-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn,
.export-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.refresh-btn:hover,
.export-btn:hover {
  background: #2563eb;
}

.export-btn {
  background: #10b981;
}

.export-btn:hover {
  background: #059669;
}

/* Loading and Error States */
.loading-state,
.error-state {
  padding: 48px 24px;
  text-align: center;
}

.error-state {
  color: #374151;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.error-message {
  color: #6b7280;
  margin: 0 0 24px 0;
  font-size: 14px;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.retry-btn,
.dismiss-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-btn {
  background: #3b82f6;
  color: white;
}

.retry-btn:hover {
  background: #2563eb;
}

.dismiss-btn {
  background: #f3f4f6;
  color: #374151;
}

.dismiss-btn:hover {
  background: #e5e7eb;
}

.retry-icon {
  font-size: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Diagram Container */
.diagram-container {
  padding: 24px;

}

.diagram-container::-webkit-scrollbar {
  width: 8px;
}

.diagram-container::-webkit-scrollbar-track {
  background: #f9fafb;
  border-radius: 4px;
}

.diagram-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.diagram-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.mermaid-wrapper {
  justify-content: center;
  align-items: flex-start;
  min-height: 200px;
  margin-bottom: 150px;
}

.mermaid {
  max-width: 100%;
  height: auto;
}

/* Theme-specific styling */
.mermaid-theme-default {
  background: #ffffff;
}

.mermaid-theme-dark {
  background: #1f2937;
  color: #f9fafb;
}

.mermaid-theme-forest {
  background: #f0f9f0;
}

.mermaid-theme-neutral {
  background: #f8f9fa;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }

  to {
    opacity: 1;
    max-height: 1000px;
  }
}
</style>
