<template>
  <div class="mermaid-editor">
    <div v-if="notification.show" class="notification" :class="notification.type">
      <span class="notification-icon">{{ notification.icon }}</span>
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="hideNotification">×</button>
    </div>

    <div class="split-pane">
      <div class="pane editor-pane" :style="{ width: leftWidth + '%' }">
        <div class="editor-toolbar">
          <div class="toolbar-section file-info">
            <div class="current-file-display">
              <span class="file-icon">📄</span>
              <span class="file-name">Untitled Document</span>
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

        <!-- CodeEditor component -->
        <CodeEditor v-model="code" :language="'mermaid'" :theme="theme" @changed="onChanged" />

      </div>

      <div class="split-bar" @mousedown="startDrag"></div>

      <div class="pane diagram-pane" :style="{ width: (100 - leftWidth) + '%' }">
        <div class="diagram-container" :class="`mermaid-theme-${theme}`">
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
import { ProjectManager } from '@/services/ProjectManager';



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

function onSave(newCode: string) {
  console.log('Save triggered', code.value);
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
async function handleDiagramSaved(savedDiagram: any) {
  emitNotification('Diagram created successfully', 'success', '✅')
  showCreateDialog.value = false
  // Optionally, emit to parent to update tab state:
  emit('content-changed', savedDiagram.mermaid_code)
}

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

/***** Editor Toolbar Styles *****/
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
  flex: 1 1 auto;
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
  flex: 1 1 auto;
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

.split-bar:hover,
.split-bar:active {
  background: #888;
}

.diagram-container {
  flex: 1;
  border: 1px solid #eee;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  background-color: rgb(226, 218, 226);
  height: 100%;
  box-sizing: border-box;
}

.toolbar-btn {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.toolbar-btn:active {
  background: #dee2e6;
  transform: translateY(1px);
}

.toolbar-btn:disabled {
  background: #f8f9fa;
  border-color: #dee2e6;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}


.filename-info {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.filename-text {
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modified-indicator {
  color: #dc3545;
  font-weight: bold;
  font-size: 1.1em;
  flex-shrink: 0;
}

.theme-label {
  font-size: 0.8rem;
  color: #495057;
  font-weight: 500;
  margin-right: 4px;
}

.theme-select {
  background: #ffffff;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  min-width: 80px;
}

.theme-select:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.current-file-display {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.file-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.file-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/***** Editor Toolbar Styles *****/
.editor-toolbar {
  flex: 0 0 auto;
  height: 40px;
  background-color: #ffffff;
  border-bottom: 1px solid #e9ecef;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  gap: 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-operations {
  flex: 0 0 auto;
}

.theme-selection {
  flex: 0 0 auto;
}
</style>
