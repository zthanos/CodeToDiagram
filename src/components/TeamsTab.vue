<template>
  <div 
    class="teams-tab"
    :data-testid="'teams-tab'"
    role="region"
    aria-label="Teams management"
  >
    <!-- Header with controls -->
    <div class="teams-tab__header">
      <div class="teams-tab__controls">
        <!-- Search input -->
        <div class="teams-tab__search">
          <input
            v-model="localSearchQuery"
            type="text"
            class="teams-tab__search-input"
            placeholder="Search teams..."
            :data-testid="'teams-search'"
            @input="handleSearchChange"
            aria-label="Search teams"
          />
          <div class="teams-tab__search-icon">🔍</div>
        </div>

        <!-- Add new team button -->
        <button
          class="teams-tab__add-btn"
          :disabled="readonly"
          @click="handleAddTeam"
          :data-testid="'add-team-btn'"
          aria-label="Add new team"
        >
          + Add Team
        </button>
      </div>
    </div>

    <!-- Results summary -->
    <div class="teams-tab__summary" :data-testid="'teams-summary'">
      Showing {{ filteredItems.length }} of {{ (items || []).length }} teams
    </div>

    <!-- Teams grid -->
    <div class="teams-tab__grid" :data-testid="'teams-grid'">
      <div
        v-for="team in filteredItems"
        :key="team.id"
        class="team-card"
        :class="{ 'team-card--selected': selectedTeam === team.id }"
        :data-testid="`team-card-${team.id}`"
        @click="handleTeamSelect(team.id)"
        @keydown="handleTeamKeydown(team.id, $event)"
        tabindex="0"
        role="button"
        :aria-label="`Select team: ${team.name}`"
        :aria-pressed="selectedTeam === team.id"
      >
        <!-- Team header -->
        <div class="team-card__header">
          <h3 class="team-card__name">{{ team.name }}</h3>
          <div class="team-card__role">{{ team.role }}</div>
        </div>

        <!-- Team members -->
        <div v-if="team.members.length > 0" class="team-card__members">
          <h4 class="team-card__members-title">Members ({{ team.members.length }}):</h4>
          <ul class="team-card__members-list">
            <li
              v-for="member in team.members"
              :key="member"
              class="team-card__member"
            >
              <div class="team-card__member-avatar">{{ getInitials(member) }}</div>
              <span class="team-card__member-name">{{ member }}</span>
            </li>
          </ul>
        </div>

        <!-- Team responsibilities -->
        <div v-if="team.responsibilities.length > 0" class="team-card__responsibilities">
          <h4 class="team-card__responsibilities-title">Responsibilities:</h4>
          <ul class="team-card__responsibilities-list">
            <li
              v-for="responsibility in team.responsibilities"
              :key="responsibility"
              class="team-card__responsibility"
            >
              {{ responsibility }}
            </li>
          </ul>
        </div>

        <!-- Team assignments to requirements -->
        <div v-if="getTeamRequirements(team.id).length > 0" class="team-card__assignments">
          <h4 class="team-card__assignments-title">Assigned Requirements:</h4>
          <ul class="team-card__assignments-list">
            <li
              v-for="requirement in getTeamRequirements(team.id)"
              :key="requirement.id"
              class="team-card__assignment"
              :title="requirement.description"
            >
              <span class="team-card__assignment-status" :class="`status-${requirement.status}`">
                {{ getStatusIcon(requirement.status) }}
              </span>
              <span class="team-card__assignment-title">{{ requirement.title }}</span>
            </li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="team-card__actions">
          <button
            class="team-card__action-btn team-card__action-btn--edit"
            :disabled="readonly"
            @click.stop="handleEditTeam(team.id)"
            :data-testid="`edit-team-${team.id}`"
            aria-label="Edit team"
          >
            ✏️
          </button>
          <button
            class="team-card__action-btn team-card__action-btn--delete"
            :disabled="readonly"
            @click.stop="handleDeleteTeam(team.id)"
            :data-testid="`delete-team-${team.id}`"
            aria-label="Delete team"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div 
      v-if="filteredItems.length === 0"
      class="teams-tab__empty"
      :data-testid="'teams-empty'"
    >
      <div class="teams-tab__empty-icon">👥</div>
      <h3 class="teams-tab__empty-title">
        {{ (items || []).length === 0 ? 'No teams yet' : 'No matching teams' }}
      </h3>
      <p class="teams-tab__empty-description">
        {{ (items || []).length === 0 
          ? 'Get started by adding your first team.' 
          : 'Try adjusting your search criteria.' 
        }}
      </p>
      <button
        v-if="(items || []).length === 0 && !readonly"
        class="teams-tab__empty-btn"
        @click="handleAddTeam"
        :data-testid="'empty-add-team-btn'"
      >
        Add First Team
      </button>
    </div>

    <!-- Team details modal -->
    <div 
      v-if="showTeamModal"
      class="teams-tab__modal-overlay"
      @click="closeTeamModal"
      :data-testid="'team-modal'"
    >
      <div 
        class="teams-tab__modal"
        @click.stop
      >
        <h3 class="teams-tab__modal-title">
          {{ editingTeam ? 'Edit Team' : 'Add New Team' }}
        </h3>
        
        <form @submit.prevent="handleSaveTeam" class="teams-tab__form">
          <!-- Team name -->
          <div class="teams-tab__form-group">
            <label for="team-name" class="teams-tab__form-label">Name *</label>
            <input
              id="team-name"
              v-model="teamForm.name"
              type="text"
              class="teams-tab__form-input"
              :class="{ 'teams-tab__form-input--error': teamFormErrors.name }"
              placeholder="Enter team name"
              required
              :data-testid="'team-name-input'"
            />
            <div v-if="teamFormErrors.name" class="teams-tab__form-error">
              {{ teamFormErrors.name }}
            </div>
          </div>

          <!-- Team role -->
          <div class="teams-tab__form-group">
            <label for="team-role" class="teams-tab__form-label">Role *</label>
            <input
              id="team-role"
              v-model="teamForm.role"
              type="text"
              class="teams-tab__form-input"
              :class="{ 'teams-tab__form-input--error': teamFormErrors.role }"
              placeholder="Enter team role (e.g., Development, QA, Design)"
              required
              :data-testid="'team-role-input'"
            />
            <div v-if="teamFormErrors.role" class="teams-tab__form-error">
              {{ teamFormErrors.role }}
            </div>
          </div>

          <!-- Team members -->
          <div class="teams-tab__form-group">
            <label for="team-members" class="teams-tab__form-label">Members</label>
            <div class="teams-tab__members-input">
              <input
                v-model="newMember"
                type="text"
                class="teams-tab__form-input"
                placeholder="Add member name and press Enter"
                @keydown.enter.prevent="addMember"
                :data-testid="'team-member-input'"
              />
              <button
                type="button"
                class="teams-tab__add-member-btn"
                @click="addMember"
                :disabled="!newMember.trim()"
                :data-testid="'add-member-btn'"
              >
                Add
              </button>
            </div>
            <ul v-if="teamForm.members.length > 0" class="teams-tab__members-list">
              <li
                v-for="(member, index) in teamForm.members"
                :key="index"
                class="teams-tab__member-item"
              >
                <div class="teams-tab__member-avatar">{{ getInitials(member) }}</div>
                <span class="teams-tab__member-name">{{ member }}</span>
                <button
                  type="button"
                  class="teams-tab__remove-member-btn"
                  @click="removeMember(index)"
                  :data-testid="`remove-member-${index}`"
                  aria-label="Remove member"
                >
                  ×
                </button>
              </li>
            </ul>
          </div>

          <!-- Team responsibilities -->
          <div class="teams-tab__form-group">
            <label for="team-responsibilities" class="teams-tab__form-label">Responsibilities</label>
            <div class="teams-tab__responsibilities-input">
              <input
                v-model="newResponsibility"
                type="text"
                class="teams-tab__form-input"
                placeholder="Add responsibility and press Enter"
                @keydown.enter.prevent="addResponsibility"
                :data-testid="'team-responsibility-input'"
              />
              <button
                type="button"
                class="teams-tab__add-responsibility-btn"
                @click="addResponsibility"
                :disabled="!newResponsibility.trim()"
                :data-testid="'add-responsibility-btn'"
              >
                Add
              </button>
            </div>
            <ul v-if="teamForm.responsibilities.length > 0" class="teams-tab__responsibilities-list">
              <li
                v-for="(responsibility, index) in teamForm.responsibilities"
                :key="index"
                class="teams-tab__responsibility-item"
              >
                <span>{{ responsibility }}</span>
                <button
                  type="button"
                  class="teams-tab__remove-responsibility-btn"
                  @click="removeResponsibility(index)"
                  :data-testid="`remove-responsibility-${index}`"
                  aria-label="Remove responsibility"
                >
                  ×
                </button>
              </li>
            </ul>
          </div>

          <!-- Form actions -->
          <div class="teams-tab__form-actions">
            <button
              type="submit"
              class="teams-tab__form-btn teams-tab__form-btn--primary"
              :disabled="!isFormValid"
              :data-testid="'save-team-btn'"
            >
              {{ editingTeam ? 'Update Team' : 'Add Team' }}
            </button>
            <button
              type="button"
              class="teams-tab__form-btn teams-tab__form-btn--secondary"
              @click="closeTeamModal"
              :data-testid="'cancel-team-btn'"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TeamInfo, RequirementItem } from '../types/requirements'

interface Props {
  items: TeamInfo[];
  selectedTeam?: string | null;
  searchQuery?: string;
  readonly?: boolean;
  requirementItems?: RequirementItem[];
}

const props = withDefaults(defineProps<Props>(), {
  selectedTeam: null,
  searchQuery: '',
  readonly: false,
  requirementItems: () => []
})

const emit = defineEmits<{
  'team-select': [teamId: string];
  'team-create': [team: Omit<TeamInfo, 'id'>];
  'team-update': [teamId: string, team: Partial<TeamInfo>];
  'team-delete': [teamId: string];
  'search-change': [query: string];
}>()

// Local state
const localSearchQuery = ref(props.searchQuery)
const showTeamModal = ref(false)
const editingTeam = ref<string | null>(null)
const newMember = ref('')
const newResponsibility = ref('')

// Team form state
const teamForm = ref({
  name: '',
  role: '',
  members: [] as string[],
  responsibilities: [] as string[]
})

const teamFormErrors = ref({
  name: '',
  role: ''
})

// Watch for prop changes
watch(() => props.searchQuery, (newQuery) => {
  localSearchQuery.value = newQuery
})

// Computed properties
const filteredItems = computed(() => {
  let filtered = props.items || []

  // Apply search filter
  if (localSearchQuery.value.trim()) {
    const query = localSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query) ||
      item.members.some(member => member.toLowerCase().includes(query)) ||
      item.responsibilities.some(resp => resp.toLowerCase().includes(query))
    )
  }

  return filtered
})

const isFormValid = computed(() => {
  return teamForm.value.name.trim() && 
         teamForm.value.role.trim() &&
         !teamFormErrors.value.name &&
         !teamFormErrors.value.role
})

// Helper functions
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'new': return '🆕'
    case 'accepted': return '✅'
    case 'rejected': return '❌'
    default: return '📋'
  }
}

const getTeamRequirements = (teamId: string): RequirementItem[] => {
  // For now, return empty array since team-requirement associations aren't implemented yet
  // This will be enhanced when team assignment functionality is added
  return []
}

// Event handlers
const handleSearchChange = () => {
  emit('search-change', localSearchQuery.value)
}

const handleTeamSelect = (teamId: string) => {
  emit('team-select', teamId)
}

const handleTeamKeydown = (teamId: string, event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleTeamSelect(teamId)
  }
}

const handleAddTeam = () => {
  resetTeamForm()
  editingTeam.value = null
  showTeamModal.value = true
}

const handleEditTeam = (teamId: string) => {
  const team = props.items.find(t => t.id === teamId)
  if (team) {
    teamForm.value = {
      name: team.name,
      role: team.role,
      members: [...team.members],
      responsibilities: [...team.responsibilities]
    }
    editingTeam.value = teamId
    showTeamModal.value = true
  }
}

const handleDeleteTeam = (teamId: string) => {
  const team = props.items.find(t => t.id === teamId)
  if (team && confirm(`Are you sure you want to delete the team "${team.name}"?`)) {
    emit('team-delete', teamId)
  }
}

const handleSaveTeam = () => {
  // Validate form
  validateForm()
  
  if (!isFormValid.value) {
    return
  }

  const teamData = {
    name: teamForm.value.name.trim(),
    role: teamForm.value.role.trim(),
    members: teamForm.value.members,
    responsibilities: teamForm.value.responsibilities
  }

  if (editingTeam.value) {
    emit('team-update', editingTeam.value, teamData)
  } else {
    emit('team-create', teamData)
  }

  closeTeamModal()
}

const closeTeamModal = () => {
  showTeamModal.value = false
  editingTeam.value = null
  resetTeamForm()
}

const resetTeamForm = () => {
  teamForm.value = {
    name: '',
    role: '',
    members: [],
    responsibilities: []
  }
  teamFormErrors.value = {
    name: '',
    role: ''
  }
  newMember.value = ''
  newResponsibility.value = ''
}

const validateForm = () => {
  teamFormErrors.value.name = ''
  teamFormErrors.value.role = ''

  if (!teamForm.value.name.trim()) {
    teamFormErrors.value.name = 'Name is required'
  } else if (teamForm.value.name.length > 100) {
    teamFormErrors.value.name = 'Name must be less than 100 characters'
  }

  if (!teamForm.value.role.trim()) {
    teamFormErrors.value.role = 'Role is required'
  } else if (teamForm.value.role.length > 100) {
    teamFormErrors.value.role = 'Role must be less than 100 characters'
  }
}

const addMember = () => {
  const member = newMember.value.trim()
  if (member && !teamForm.value.members.includes(member)) {
    teamForm.value.members.push(member)
    newMember.value = ''
  }
}

const removeMember = (index: number) => {
  teamForm.value.members.splice(index, 1)
}

const addResponsibility = () => {
  const responsibility = newResponsibility.value.trim()
  if (responsibility && !teamForm.value.responsibilities.includes(responsibility)) {
    teamForm.value.responsibilities.push(responsibility)
    newResponsibility.value = ''
  }
}

const removeResponsibility = (index: number) => {
  teamForm.value.responsibilities.splice(index, 1)
}
</script>

<style scoped>
.teams-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

/* Header */
.teams-tab__header {
  padding: 16px;
  border-bottom: 1px solid #e1e5e9;
  background: #f6f8fa;
}

.teams-tab__controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.teams-tab__search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.teams-tab__search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
  transition: border-color 0.2s ease;
}

.teams-tab__search-input:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.teams-tab__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6a737d;
  pointer-events: none;
}

.teams-tab__add-btn {
  padding: 8px 16px;
  background: #28a745;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.teams-tab__add-btn:hover:not(:disabled) {
  background: #218838;
}

.teams-tab__add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25);
}

.teams-tab__add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Summary */
.teams-tab__summary {
  padding: 8px 16px;
  font-size: 12px;
  color: #6a737d;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e5e9;
}

/* Grid */
.teams-tab__grid {
  flex: 1;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

/* Team Card */
.team-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.team-card:hover {
  border-color: #0366d6;
  box-shadow: 0 2px 8px rgba(3, 102, 214, 0.1);
}

.team-card:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.team-card--selected {
  border-color: #0366d6;
  background: #f0f8ff;
  box-shadow: 0 2px 8px rgba(3, 102, 214, 0.15);
}

.team-card__header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e1e5e9;
}

.team-card__name {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #24292e;
}

.team-card__role {
  font-size: 14px;
  color: #6a737d;
  font-style: italic;
}

/* Members */
.team-card__members {
  margin-bottom: 16px;
}

.team-card__members-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #24292e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.team-card__members-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.team-card__member {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.team-card__member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #0366d6;
  color: #ffffff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.team-card__member-name {
  color: #24292e;
}

/* Responsibilities */
.team-card__responsibilities {
  margin-bottom: 16px;
}

.team-card__responsibilities-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #24292e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.team-card__responsibilities-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-card__responsibility {
  padding: 4px 8px;
  background: #f6f8fa;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-size: 12px;
  color: #6a737d;
  line-height: 1.4;
}

/* Team assignments */
.team-card__assignments {
  margin-bottom: 16px;
}

.team-card__assignments-title {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #24292e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.team-card__assignments-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.team-card__assignment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.team-card__assignment-status {
  flex-shrink: 0;
  font-size: 14px;
}

.team-card__assignment-status.status-new {
  color: #3182ce;
}

.team-card__assignment-status.status-accepted {
  color: #38a169;
}

.team-card__assignment-status.status-rejected {
  color: #e53e3e;
}

.team-card__assignment-title {
  color: #2d3748;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions */
.team-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: auto;
}

.team-card__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.team-card__action-btn:hover:not(:disabled) {
  border-color: #0366d6;
  background: #f0f8ff;
}

.team-card__action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.team-card__action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.team-card__action-btn--delete:hover:not(:disabled) {
  border-color: #d73a49;
  background: #ffeef0;
}

/* Empty state */
.teams-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6a737d;
}

.teams-tab__empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.teams-tab__empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
}

.teams-tab__empty-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
}

.teams-tab__empty-btn {
  padding: 10px 20px;
  background: #28a745;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.teams-tab__empty-btn:hover {
  background: #218838;
}

/* Modal */
.teams-tab__modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.teams-tab__modal {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.teams-tab__modal-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #24292e;
}

/* Form */
.teams-tab__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.teams-tab__form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.teams-tab__form-label {
  font-size: 14px;
  font-weight: 500;
  color: #24292e;
}

.teams-tab__form-input {
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.teams-tab__form-input:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.teams-tab__form-input--error {
  border-color: #d73a49;
}

.teams-tab__form-error {
  font-size: 12px;
  color: #d73a49;
  margin-top: 4px;
}

/* Members input */
.teams-tab__members-input,
.teams-tab__responsibilities-input {
  display: flex;
  gap: 8px;
}

.teams-tab__members-input .teams-tab__form-input,
.teams-tab__responsibilities-input .teams-tab__form-input {
  flex: 1;
}

.teams-tab__add-member-btn,
.teams-tab__add-responsibility-btn {
  padding: 8px 16px;
  background: #0366d6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.teams-tab__add-member-btn:hover:not(:disabled),
.teams-tab__add-responsibility-btn:hover:not(:disabled) {
  background: #0256cc;
}

.teams-tab__add-member-btn:disabled,
.teams-tab__add-responsibility-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.teams-tab__members-list,
.teams-tab__responsibilities-list {
  margin: 8px 0 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.teams-tab__member-item,
.teams-tab__responsibility-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f6f8fa;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 13px;
}

.teams-tab__member-item {
  gap: 8px;
}

.teams-tab__member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #0366d6;
  color: #ffffff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.teams-tab__member-name {
  flex: 1;
  color: #24292e;
}

.teams-tab__remove-member-btn,
.teams-tab__remove-responsibility-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 16px;
  color: #6a737d;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.teams-tab__remove-member-btn:hover,
.teams-tab__remove-responsibility-btn:hover {
  background: #d73a49;
  color: #ffffff;
}

/* Form actions */
.teams-tab__form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.teams-tab__form-btn {
  padding: 10px 20px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.teams-tab__form-btn--primary {
  background: #28a745;
  border-color: #28a745;
  color: #ffffff;
}

.teams-tab__form-btn--primary:hover:not(:disabled) {
  background: #218838;
  border-color: #218838;
}

.teams-tab__form-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.teams-tab__form-btn--secondary {
  background: #ffffff;
  color: #24292e;
}

.teams-tab__form-btn--secondary:hover {
  background: #f6f8fa;
}

/* Responsive design */
@media (max-width: 768px) {
  .teams-tab__controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .teams-tab__search {
    min-width: auto;
  }
  
  .teams-tab__grid {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
  
  .team-card {
    min-height: auto;
  }
  
  .team-card__name {
    font-size: 18px;
  }
  
  .teams-tab__modal {
    margin: 16px;
    width: calc(100% - 32px);
  }
  
  .teams-tab__form-actions {
    flex-direction: column;
  }
  
  .teams-tab__members-input,
  .teams-tab__responsibilities-input {
    flex-direction: column;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .teams-tab__header,
  .teams-tab__summary {
    border-width: 2px;
  }
  
  .team-card {
    border-width: 2px;
  }
  
  .teams-tab__form-input:focus {
    outline-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .teams-tab__search-input,
  .teams-tab__add-btn,
  .team-card,
  .teams-tab__form-btn {
    transition: none;
  }
}
</style>