<template>
    <div v-if="showDialog" class="create-dialog-overlay">
        <div class="create-dialog">
            <h3>{{ isRenaming ? 'Save Diagram' : 'Name Your Diagram' }}</h3>
            <div class="form-group">
                <label for="diagram-name">Diagram Name:</label>
                <input id="diagram-name" v-model="diagramName" class="diagram-name-input"
                    :class="{ 'error': validationError }" placeholder="Enter diagram name..." maxlength="100"
                    @input="validateDiagramName" @keydown.enter="save" @keydown.escape="cancel" />
                <div class="input-hint" :class="{ 'error': validationError }">
                    {{ validationError || 'Valid characters: letters, numbers, spaces, hyphens, and underscores' }}
                </div>
            </div>
            <div class="dialog-actions">
                <button class="btn-cancel" @click="cancel">Cancel</button>
                <button class="btn-create" @click="save" :disabled="!!validationError || !diagramName.trim()">
                    {{ isRenaming ? 'Save' : 'Create Diagram' }}
                </button>
            </div>
        </div>
    </div>
    <!-- Loading overlay only shows during actual save operation, not when dialog is closed -->
    <div v-if="!showDialog && isLoading" class="saving-overlay">
        <LoadingSpinner :show="true" message="Saving diagram..." size="medium" overlay />
    </div>

</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ProjectManager } from '../services/ProjectManager'
import NotificationService from '../services/NotificationService'
import { useDialog } from '../composables/useDialog'
import { useSingleLoading } from '../composables/useLoading'
import { useComponentErrorHandling } from '../composables/useErrorHandling'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps<{
    projectId: string
    diagramId: number | null
    content: string
}>()

const localContent = ref(props.content)

watch(() => props.content, (newContent) => {
    localContent.value = newContent
})


const emit = defineEmits<{
    (e: 'saved', data: any): void
    (e: 'cancelled'): void
}>()

const showDialog = ref(false)
const diagramName = ref('')
const validationError = ref('')
const isRenaming = ref(false)
const dialog = useDialog()
const isLoading = ref(false)
const errorHandler = useComponentErrorHandling('SaveDiagramDialog')

// Validation function for diagram names
function validateDiagramName() {
    const name = diagramName.value.trim();

    if (!name) {
        validationError.value = '';
        return;
    }

    // Check length
    if (name.length > 100) {
        validationError.value = 'Name cannot exceed 100 characters';
        return;
    }

    // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
    const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validNameRegex.test(name)) {
        validationError.value = 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
        return;
    }

    // Check for reserved names
    const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
    if (reservedNames.includes(name.toLowerCase())) {
        validationError.value = 'This name is reserved and cannot be used';
        return;
    }

    // Clear validation error if all checks pass
    validationError.value = '';
}

async function save() {
    // Validate input
    if (!diagramName.value.trim()) {
        await dialog.alert('Validation Error', 'Please enter a diagram name.', 'warning')
        return
    }

    // Check for validation errors
    if (validationError.value) {
        await dialog.alert('Validation Error', validationError.value, 'warning')
        return
    }

    await errorHandler.withErrorHandling(async () => {
        try {
            isLoading.value = true

            // Use the diagram ID from props (could be null for new diagrams)
            const response = await ProjectManager.getInstance().saveDiagram(
                props.projectId,
                props.diagramId,
                diagramName.value.trim(),
                localContent.value
            )

            emit('saved', response)
            showDialog.value = false

            const actionText = props.diagramId === null ? 'created' : 'saved';
            NotificationService.success(
                `Diagram ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
                `"${diagramName.value}" has been ${actionText} successfully`
            )
        } finally {
            isLoading.value = false
        }
    }, 'save_diagram')
}




function cancel() {
    emit('cancelled')
    showDialog.value = false
}

async function saveData(diagramId: number | null, title: string, newContent: string) {
    console.log('SaveDiagramDialog.saveData called with:', { diagramId, title, newContent: newContent.substring(0, 50) + '...' })

    localContent.value = newContent

    // Always show the naming dialog - no automatic saving
    // User must explicitly provide a name and click save
    console.log('Showing naming dialog for diagram')

    diagramName.value = title.startsWith('Untitled Diagram') ? '' : title;
    isRenaming.value = diagramId !== null; // It's renaming if it has an ID
    validationError.value = ''; // Clear any previous validation errors
    showDialog.value = true;
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

.diagram-name-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
}

.diagram-name-input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.1);
}

.diagram-name-input.error {
    border-color: #d73a49;
    box-shadow: 0 0 0 2px rgba(215, 58, 73, 0.1);
}

.input-hint {
    font-size: 0.75rem;
    color: #6a737d;
    margin-top: 0.25rem;
}

.input-hint.error {
    color: #d73a49;
}

.btn-create:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-cancel {
    background-color: #f6f8fa;
    border: 1px solid #d1d5da;
    color: #24292f;
}

.btn-cancel:hover:not(:disabled) {
    background-color: #f3f4f6;
}

.btn-create {
    background-color: #2ea043;
    border: 1px solid #2ea043;
    color: white;
}

.btn-create:hover:not(:disabled) {
    background-color: #2c974b;
}

.saving-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
</style>