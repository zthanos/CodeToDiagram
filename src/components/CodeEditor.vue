<template>
  <div ref="editor" class="editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { initEditor, destroyEditor } from '@/services/editorService'

interface Props {
  modelValue: string
  language?: string
  theme?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'changed', value: string): void
  (e: 'save', value: string): void
}>()

const editor = ref<HTMLElement | null>(null)
let editorInstance: any = null

onMounted(() => {
  editorInstance = initEditor(editor.value, props.language || 'mermaid', props.modelValue, props.theme || 'light', {
    onChange: (newValue: string) => {
      emit('update:modelValue', newValue)
      emit('changed', newValue)
    },
    onSave: (currentValue: string) => {
      emit('save', currentValue)
    }
  })
})

watch(() => props.modelValue, (newValue) => {
  if (editorInstance) {
    const currentValue = editorInstance.state.doc.toString();

    if (currentValue !== newValue) {
      editorInstance.dispatch({
        changes: { from: 0, to: editorInstance.state.doc.length, insert: newValue }
      });
    }
  }
});


onBeforeUnmount(() => {
  destroyEditor(editorInstance)
})
</script>

<style scoped>
.editor-container {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
