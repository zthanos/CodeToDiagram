<template>
    <div v-if="showDialog" class="create-dialog-overlay">
        <h3>Create New Diagram</h3>
        <div class="form-group">
            <label for="diagram-name">Diagram Name:</label>
            <input id="diagram-name" v-model="diagramName" class="diagram-name-input"
                placeholder="Enter diagram name..." maxlength="100" />
            <div class="input-hint">
                Valid characters: letters, numbers, spaces, hyphens, and underscores
            </div>
        </div>
        <div class="dialog-actions">
            <button class="btn-cancel" @click="cancel">Cancel</button>
            <button class="btn-create" @click="save">Create Diagram</button>
        </div>
    </div>
    <div v-else-if="isSaving" class="saving-overlay">
        <div class="saving-message">💾 Saving...</div>
    </div>

</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ProjectManager } from '@/services/ProjectManager';

const props = defineProps<{
    projectId: string
    diagramId: number | null
    content: string
}>()

const localContent = ref(props.content)

watch(() => props.content, (newContent) => {
    console.log("SaveDialog", newContent)
    localContent.value = newContent
})


const emit = defineEmits<{
    (e: 'saved', data: any): void
    (e: 'cancelled'): void
}>()

const showDialog = ref(false)
const diagramName = ref('')
const isSaving = ref(false)




async function save(newContent: string) {
    console.log(newContent)
    if (!diagramName.value.trim()) {
        alert('Please enter a diagram name.')
        return
    }
    try {
        const response = await ProjectManager.getInstance().saveDiagram(props.projectId, null, diagramName.value.trim(), localContent.value)
        emit('saved', response)
        showDialog.value = false
    } catch (error) {
        console.error('Error creating diagram:', error)
        alert('Failed to create diagram.')
    }
}

async function saveToBackend(diagramId: number | null, title:string, content: string) {
    isSaving.value = true;
    try {
        const response = await ProjectManager.getInstance().saveDiagram(props.projectId, diagramId, title, content);
        emit('saved', response);
    } catch (error) {
        console.error('Error updating diagram:', error);
        alert('Failed to update diagram.');
    } finally {
        isSaving.value = false;
    }
}


function cancel() {
    emit('cancelled')
    showDialog.value = false
}

async function saveData(diagramId: number | null, title: string, newContent: string) {
    if (diagramId === null) {
        localContent.value = newContent
        showDialog.value = true
    }
    else {
        await saveToBackend(diagramId, title, newContent)
    }
}

defineExpose({
    saveData
})
</script>

<style scoped>
.create-dialog {
    background-color: #fff;
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.create-dialog h3 {
    margin: 0 0 1rem 0;
    color: #24292f;
    font-size: 1.25rem;
}


.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #24292f;
    font-weight: 600;
    font-size: 0.875rem;
}


.form-group {
    margin-bottom: 1rem;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.btn-cancel,
.btn-create {
    padding: 0.5rem 1rem;
    cursor: pointer;
}

.create-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
</style>