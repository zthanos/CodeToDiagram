<template>
    <div class="requirements-workspace">
        <!-- Header -->
        <div class="workspace-header">
            <h2 class="workspace-title">Requirements</h2>
            <p class="workspace-description">Upload files to automatically generate requirements or add them manually.
            </p>
        </div>

        <!-- File Upload Section -->
        <div class="upload-section">
            <div class="upload-section-header" @click="toggleUploadSection">
                <h3>Upload Files for Requirements Generation</h3>
                <button class="collapse-btn" :class="{ 'collapsed': !isUploadSectionExpanded }">
                    {{ isUploadSectionExpanded ? '▼' : '▶' }}
                </button>
            </div>
            
            <div v-show="isUploadSectionExpanded" class="upload-section-content">
            <div class="upload-area" :class="{ 'drag-over': isDragOver, 'uploading': isProcessing }" @drop="handleDrop"
                @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @click="triggerFileInput">
                <input ref="fileInput" type="file" multiple accept=".txt,.md,.pdf,.docx" @change="handleFileSelect"
                    style="display: none;" />

                <div v-if="!isProcessing" class="upload-content">
                    <div class="upload-icon">📁</div>
                    <p class="upload-text">
                        <strong>Click to upload</strong> or drag and drop files here
                    </p>
                    <p class="upload-hint">
                        Supported formats: .txt, .md, .pdf, .docx (max 10MB per file)
                    </p>
                </div>

                <div v-else class="processing-content">
                    <div class="spinner"></div>
                    <p>Processing files and generating requirements...</p>
                </div>
            </div>

            <!-- Selected Files Display -->
            <div v-if="selectedFiles.length > 0 && !isProcessing" class="selected-files">
                <h4>Selected Files:</h4>
                <div class="file-list">
                    <div v-for="file in selectedFiles" :key="file.name" class="file-item">
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">({{ formatFileSize(file.size) }})</span>
                        <button @click="removeFile(file)" class="remove-file-btn">×</button>
                    </div>
                </div>
                <button @click="processFiles" class="process-btn" :disabled="selectedFiles.length === 0">
                    Generate Requirements
                </button>
            </div>
            </div>
        </div>

        <!-- Requirements List Section -->
        <div class="requirements-section">
            <div class="section-header">
                <h3>Requirements List</h3>
                <button @click="addNewRequirement" class="add-requirement-btn">
                    + Add Requirement
                </button>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingRequirements" class="loading-state">
                <div class="spinner"></div>
                <p>Loading requirements...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>Failed to Load Requirements</h4>
                <p class="error-message">{{ error }}</p>
                <div class="error-actions">
                    <button @click="loadRequirements" class="retry-btn">
                        <span class="retry-icon">🔄</span>
                        Retry
                    </button>
                    <button @click="clearError" class="dismiss-btn">Dismiss</button>
                </div>
            </div>

            <!-- Requirements List -->
            <div v-else-if="requirements.length > 0" class="requirements-list">
                <div v-for="requirement in requirements" :key="requirement.id" class="requirement-item"
                    :class="{ 'editing': editingRequirement?.id === requirement.id }">
                    <!-- View Mode -->
                    <div v-if="editingRequirement?.id !== requirement.id" class="requirement-view">
                        <div class="requirement-content">
                            <span class="requirement-category" :class="requirement.category.toLowerCase()">
                                {{ requirement.category }}
                            </span>
                            <p class="requirement-description">{{ requirement.description }}</p>
                            <div class="requirement-meta">
                                <span v-if="requirement.source" class="requirement-source">
                                    Source: {{ requirement.source }}
                                </span>
                                <span v-if="requirement.createdAt || requirement.created_at" class="requirement-date">
                                    Created: {{ formatDate(requirement.createdAt || requirement.created_at) }}
                                </span>
                            </div>
                        </div>
                        <div class="requirement-actions">
                            <button @click="startEditRequirement(requirement)" class="edit-btn">Edit</button>
                            <button @click="deleteRequirement(requirement.id)" class="delete-btn">Delete</button>
                        </div>
                    </div>

                    <!-- Edit Mode -->
                    <div v-else class="requirement-edit">
                        <div class="edit-form">
                            <select v-model="editingRequirement.category" class="category-select">
                                <option value="Functional">Functional</option>
                                <option value="Non-Functional">Non-Functional</option>
                            </select>
                            <textarea v-model="editingRequirement.description" class="description-textarea"
                                placeholder="Enter requirement description..." rows="3"></textarea>
                            <div class="edit-actions">
                                <button @click="saveRequirement" class="save-btn">Save</button>
                                <button @click="cancelEdit" class="cancel-btn">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
                <div class="empty-icon">📋</div>
                <p class="empty-message">No requirements yet</p>
                <p class="empty-hint">Upload files to generate requirements automatically or add them manually.</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ProjectApiService, ApiErrorInfo } from '../services/ProjectApiService'
import { Requirement, Project } from '../types/project'
import { useUnsavedChanges } from '../composables/useUnsavedChanges'
import { createApiRetry } from '../composables/useRetry'

// Props
interface Props {
    project: Project
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
    'requirements-updated': [requirements: Requirement[]]
    'unsaved-changes': [hasChanges: boolean]
}>()

// Reactive state
const requirements = ref<Requirement[]>([])
const selectedFiles = ref<File[]>([])
const isProcessing = ref(false)
const isLoadingRequirements = ref(false)
const isDragOver = ref(false)
const error = ref<string | null>(null)
const editingRequirement = ref<Requirement | null>(null)
const isUploadSectionExpanded = ref(true)

// Refs
const fileInput = ref<HTMLInputElement>()

// Composables
const retry = createApiRetry({
    maxAttempts: 3,
    onRetry: (attempt, error) => {
        console.log(`Retrying requirements operation, attempt ${attempt}:`, error)
    }
})

const unsavedChanges = useUnsavedChanges({
    message: 'You have unsaved requirement changes. Do you want to save them before leaving?',
    confirmSave: true,
    onSave: async () => {
        if (editingRequirement.value) {
            await saveRequirement()
        }
    },
    onDiscard: () => {
        editingRequirement.value = null
    }
})

// Computed
const hasRequirements = computed(() => requirements.value.length > 0)

// Methods
const loadRequirements = async () => {
    if (!props.project?.id) return

    isLoadingRequirements.value = true
    error.value = null

    try {
        const loadedRequirements = await retry.executeWithRetry(async () => {
            return await ProjectApiService.listRequirements(props.project.id)
        })
        requirements.value = loadedRequirements
        emit('requirements-updated', loadedRequirements)
    } catch (err) {
        const apiError = err as ApiErrorInfo
        error.value = apiError.message || 'Failed to load requirements'
        console.error('Error loading requirements:', err)
    } finally {
        isLoadingRequirements.value = false
    }
}

const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = true
}

const handleDragLeave = () => {
    isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = false

    const files = Array.from(event.dataTransfer?.files || [])
    addFiles(files)
}

const triggerFileInput = () => {
    if (!isProcessing.value) {
        fileInput.value?.click()
    }
}

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = Array.from(target.files || [])
    addFiles(files)
}

const addFiles = (files: File[]) => {
    const errors: string[] = []
    const validFiles = files.filter(file => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            errors.push(`File "${file.name}" is too large. Maximum size is 10MB.`)
            return false
        }

        // Check file type
        const validTypes = ['.txt', '.md', '.pdf', '.docx']
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!validTypes.includes(fileExtension)) {
            errors.push(`File "${file.name}" has an unsupported format. Supported formats: ${validTypes.join(', ')}`)
            return false
        }

        return true
    })

    // Show errors if any
    if (errors.length > 0) {
        error.value = errors.join('\n')
    }

    // Add files, avoiding duplicates
    validFiles.forEach(file => {
        if (!selectedFiles.value.some(existing => existing.name === file.name && existing.size === file.size)) {
            selectedFiles.value.push(file)
        }
    })
}

const removeFile = (fileToRemove: File) => {
    selectedFiles.value = selectedFiles.value.filter(file => file !== fileToRemove)
}

const processFiles = async () => {
    if (!props.project?.id || selectedFiles.value.length === 0) return

    isProcessing.value = true
    error.value = null

    try {
        const apiResponse = await ProjectApiService.uploadFilesForRequirements(
            props.project.id,
            selectedFiles.value
        )

        // Map the API response to Requirement format
        const generatedRequirements = mapApiResponseToRequirements(apiResponse)

        // Add generated requirements to the list
        requirements.value = [...requirements.value, ...generatedRequirements]
        emit('requirements-updated', requirements.value)

        // Clear selected files
        selectedFiles.value = []

        // Reset file input
        if (fileInput.value) {
            fileInput.value.value = ''
        }

    } catch (err) {
        const apiError = err as ApiErrorInfo
        error.value = apiError.message || 'Failed to process files and generate requirements'
        console.error('Error processing files:', err)
    } finally {
        isProcessing.value = false
    }
}

const addNewRequirement = () => {
    const newRequirement: Requirement = {
        id: 0, // Temporary ID for new requirement
        description: '',
        category: 'Functional',
        source: 'manual'
    }
    editingRequirement.value = newRequirement
}

const startEditRequirement = (requirement: Requirement) => {
    editingRequirement.value = { ...requirement }
    emit('unsaved-changes', true)
}

const saveRequirement = async () => {
    if (!editingRequirement.value || !props.project?.id) return

    try {
        let savedRequirement: Requirement

        if (editingRequirement.value.id === 0) {
            // Create new requirement
            savedRequirement = await ProjectApiService.addRequirement(
                props.project.id,
                editingRequirement.value.description,
                editingRequirement.value.category
            )
            requirements.value.push(savedRequirement)
        } else {
            // Update existing requirement
            savedRequirement = await ProjectApiService.updateRequirement(
                props.project.id,
                editingRequirement.value.id,
                editingRequirement.value.description,
                editingRequirement.value.category
            )

            const index = requirements.value.findIndex(r => r.id === savedRequirement.id)
            if (index !== -1) {
                requirements.value[index] = savedRequirement
            }
        }

        emit('requirements-updated', requirements.value)
        emit('unsaved-changes', false)
        editingRequirement.value = null

    } catch (err) {
        const apiError = err as ApiErrorInfo
        error.value = apiError.message || 'Failed to save requirement'
        console.error('Error saving requirement:', err)
    }
}

const cancelEdit = () => {
    editingRequirement.value = null
}

const deleteRequirement = async (requirementId: number) => {
    if (!props.project?.id) return

    if (!confirm('Are you sure you want to delete this requirement?')) {
        return
    }

    try {
        await ProjectApiService.deleteRequirement(props.project.id, requirementId)
        requirements.value = requirements.value.filter(r => r.id !== requirementId)
        emit('requirements-updated', requirements.value)
    } catch (err) {
        const apiError = err as ApiErrorInfo
        error.value = apiError.message || 'Failed to delete requirement'
        console.error('Error deleting requirement:', err)
    }
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date | string | undefined): string => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString()
}

const clearError = () => {
    error.value = null
}

const toggleUploadSection = () => {
    isUploadSectionExpanded.value = !isUploadSectionExpanded.value
}

// Helper function to map API response to Requirement format
const mapApiResponseToRequirements = (apiResponse: any[]): Requirement[] => {
    return apiResponse.map((item, index) => {
        // Generate a temporary negative ID for new requirements from file upload
        // This will be replaced with a real ID when the requirement is saved to the backend
        const tempId = -(Date.now() + index)
        
        return {
            id: tempId,
            description: item.description || item.title || '',
            category: item.functional ? 'Functional' : 'Non-Functional',
            source: 'file_upload',
            createdAt: new Date(),
            // Store original title if different from description
            title: item.title !== item.description ? item.title : undefined
        } as Requirement
    })
}

// Lifecycle
onMounted(() => {
    loadRequirements()
})
</script>

<style scoped>
.requirements-workspace {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
}

.workspace-header {
    margin-bottom: 32px;
}

.workspace-title {
    font-size: 28px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 8px 0;
}

.workspace-description {
    font-size: 16px;
    color: #666;
    margin: 0;
}

/* Upload Section */
.upload-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
}

.upload-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 16px;
    padding: 8px 0;
    border-radius: 6px;
    transition: background-color 0.2s ease;
}

.upload-section-header:hover {
    background-color: rgba(59, 130, 246, 0.05);
}

.upload-section-header h3 {
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

.upload-section-content {
    animation: slideDown 0.3s ease-out;
}

.upload-area {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 48px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
}

.upload-area:hover {
    border-color: #3b82f6;
    background: #f8faff;
}

.upload-area.drag-over {
    border-color: #3b82f6;
    background: #eff6ff;
}

.upload-area.uploading {
    cursor: not-allowed;
    opacity: 0.7;
}

.upload-content .upload-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.upload-text {
    font-size: 16px;
    color: #374151;
    margin: 0 0 8px 0;
}

.upload-hint {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
}

.processing-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* Selected Files */
.selected-files {
    margin-top: 24px;
}

.selected-files h4 {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 12px 0;
}

.file-list {
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    margin-bottom: 16px;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
}

.file-item:last-child {
    border-bottom: none;
}

.file-name {
    flex: 1;
    font-weight: 500;
    color: #1a1a1a;
}

.file-size {
    color: #6b7280;
    font-size: 14px;
    margin-left: 8px;
}

.remove-file-btn {
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-left: 12px;
    font-size: 16px;
    line-height: 1;
}

.remove-file-btn:hover {
    background: #dc2626;
}

.process-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.process-btn:hover:not(:disabled) {
    background: #2563eb;
}

.process-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
}

/* Requirements Section */
.requirements-section {
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

.add-requirement-btn {
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.add-requirement-btn:hover {
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

/* Requirements List */
.requirements-list {
    padding: 0;
    max-height: 500px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #d1d5db #f9fafb;
}

.requirements-list::-webkit-scrollbar {
    width: 8px;
}

.requirements-list::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 4px;
}

.requirements-list::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
    transition: background-color 0.2s ease;
}

.requirements-list::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}

.requirement-item {
    border-bottom: 1px solid #f3f4f6;
}

.requirement-item:last-child {
    border-bottom: none;
}

.requirement-view {
    display: flex;
    padding: 20px 24px;
}

.requirement-content {
    flex: 1;
}

.requirement-category {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.requirement-category.functional {
    background: #dbeafe;
    color: #1e40af;
}

.requirement-category.non-functional {
    background: #fef3c7;
    color: #92400e;
}

.requirement-description {
    font-size: 16px;
    color: #1a1a1a;
    margin: 0 0 8px 0;
    line-height: 1.5;
}

.requirement-meta {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #6b7280;
}

.requirement-actions {
    display: flex;
    gap: 8px;
    align-items: flex-start;
}

.edit-btn,
.delete-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.edit-btn {
    background: #f3f4f6;
    color: #374151;
}

.edit-btn:hover {
    background: #e5e7eb;
}

.delete-btn {
    background: #fef2f2;
    color: #dc2626;
}

.delete-btn:hover {
    background: #fee2e2;
}

/* Edit Form */
.requirement-edit {
    padding: 20px 24px;
    background: #f8f9fa;
}

.edit-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.category-select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    background: white;
}

.description-textarea {
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 16px;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

.save-btn,
.cancel-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.save-btn {
    background: #10b981;
    color: white;
}

.save-btn:hover {
    background: #059669;
}

.cancel-btn {
    background: #f3f4f6;
    color: #374151;
}

.cancel-btn:hover {
    background: #e5e7eb;
}

/* Empty State */
.empty-state {
    padding: 48px 24px;
    text-align: center;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.empty-message {
    font-size: 18px;
    font-weight: 500;
    color: #374151;
    margin: 0 0 8px 0;
}

.empty-hint {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
}
</style>