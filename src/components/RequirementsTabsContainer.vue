<template>
  <div 
    class="requirements-tabs-container"
    :data-testid="'requirements-tabs-container'"
    role="region"
    aria-label="Requirements workspace tabs"
  >
    <!-- Tab navigation -->
    <div 
      class="requirements-tabs__nav"
      role="tablist"
      aria-label="Requirements workspace sections"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="requirements-tabs__tab"
        :class="{ 'requirements-tabs__tab--active': activeTab === tab.id }"
        :data-testid="`tab-${tab.id}`"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`tabpanel-${tab.id}`"
        :id="`tab-${tab.id}`"
        @click="handleTabClick(tab.id)"
        @keydown="handleTabKeydown(tab.id, $event)"
      >
        <span class="requirements-tabs__tab-icon">{{ tab.icon }}</span>
        <span class="requirements-tabs__tab-label">{{ tab.label }}</span>
        <span 
          v-if="tab.count !== undefined" 
          class="requirements-tabs__tab-count"
          :aria-label="`${tab.count} items`"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Tab content -->
    <div class="requirements-tabs__content">
      <!-- Requirements tab -->
      <div
        v-show="activeTab === 'requirements'"
        class="requirements-tabs__panel"
        :id="'tabpanel-requirements'"
        role="tabpanel"
        :aria-labelledby="'tab-requirements'"
        :data-testid="'requirements-panel'"
      >
        <RequirementsList
          :items="requirementItems"
          :filter="tabState.requirements.filter"
          :search-query="tabState.requirements.searchQuery"
          :readonly="readonly"
          @item-update="handleRequirementUpdate"
          @item-delete="handleRequirementDelete"
          @item-create="handleRequirementCreate"
          @filter-change="handleRequirementsFilterChange"
          @search-change="handleRequirementsSearchChange"
        />
      </div>

      <!-- Systems tab -->
      <div
        v-show="activeTab === 'systems'"
        class="requirements-tabs__panel"
        :id="'tabpanel-systems'"
        role="tabpanel"
        :aria-labelledby="'tab-systems'"
        :data-testid="'systems-panel'"
      >
        <SystemsList
          :items="systemsData"
          :selected-system="tabState.systems.selectedSystem"
          :search-query="tabState.systems.searchQuery"
          :filter="tabState.systems.filter"
          :readonly="readonly"
          @system-select="handleSystemSelect"
          @system-create="handleSystemCreate"
          @system-update="handleSystemUpdate"
          @system-delete="handleSystemDelete"
          @search-change="handleSystemsSearchChange"
          @filter-change="handleSystemsFilterChange"
        />
      </div>

      <!-- Teams tab -->
      <div
        v-show="activeTab === 'teams'"
        class="requirements-tabs__panel"
        :id="'tabpanel-teams'"
        role="tabpanel"
        :aria-labelledby="'tab-teams'"
        :data-testid="'teams-panel'"
      >
        <TeamsTab
          :items="teamsData"
          :selected-team="tabState.teams.selectedTeam"
          :search-query="tabState.teams.searchQuery"
          :readonly="readonly"
          :requirement-items="requirementItems"
          @team-select="handleTeamSelect"
          @team-create="handleTeamCreate"
          @team-update="handleTeamUpdate"
          @team-delete="handleTeamDelete"
          @search-change="handleTeamsSearchChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import RequirementsList from './RequirementsList.vue'
import SystemsList from './SystemsList.vue'
import TeamsTab from './TeamsTab.vue'
import type { RequirementItem, SystemInfo, TeamInfo, TabState } from '../types/requirements'

interface Tab {
  id: 'requirements' | 'systems' | 'teams';
  label: string;
  icon: string;
  count?: number;
}

interface Props {
  activeTab: 'requirements' | 'systems' | 'teams';
  requirementItems: RequirementItem[];
  systemsData: SystemInfo[];
  teamsData: TeamInfo[];
  tabState: TabState;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  'tab-change': [tabId: 'requirements' | 'systems' | 'teams'];
  'requirement-update': [requirement: RequirementItem];
  'requirement-delete': [requirementId: string];
  'requirement-create': [requirement: Partial<RequirementItem>];
  'requirements-filter-change': [filter: 'all' | 'new' | 'accepted' | 'rejected'];
  'requirements-search-change': [query: string];
  'system-select': [systemId: string];
  'system-create': [system: Omit<SystemInfo, 'id'>];
  'system-update': [systemId: string, system: Partial<SystemInfo>];
  'system-delete': [systemId: string];
  'systems-search-change': [query: string];
  'systems-filter-change': [filter: 'all' | 'internal' | 'external' | 'integration'];
  'team-select': [teamId: string];
  'team-create': [team: Omit<TeamInfo, 'id'>];
  'team-update': [teamId: string, team: Partial<TeamInfo>];
  'team-delete': [teamId: string];
  'teams-search-change': [query: string];
}>()

// Computed properties
const tabs = computed<Tab[]>(() => [
  {
    id: 'requirements',
    label: 'Requirements',
    icon: '📋',
    count: props.requirementItems.length
  },
  {
    id: 'systems',
    label: 'Systems',
    icon: '🏗️',
    count: props.systemsData.length
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: '👥',
    count: props.teamsData.length
  }
])

// Event handlers
const handleTabClick = (tabId: 'requirements' | 'systems' | 'teams') => {
  if (tabId !== props.activeTab) {
    emit('tab-change', tabId)
  }
}

const handleTabKeydown = (tabId: 'requirements' | 'systems' | 'teams', event: KeyboardEvent) => {
  const currentIndex = tabs.value.findIndex(tab => tab.id === props.activeTab)
  let newIndex = currentIndex

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.value.length - 1
      break
    case 'ArrowRight':
      event.preventDefault()
      newIndex = currentIndex < tabs.value.length - 1 ? currentIndex + 1 : 0
      break
    case 'Home':
      event.preventDefault()
      newIndex = 0
      break
    case 'End':
      event.preventDefault()
      newIndex = tabs.value.length - 1
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      handleTabClick(tabId)
      return
    default:
      return
  }

  const newTab = tabs.value[newIndex]
  if (newTab) {
    emit('tab-change', newTab.id)
    // Focus the new tab
    const newTabElement = document.getElementById(`tab-${newTab.id}`)
    if (newTabElement) {
      newTabElement.focus()
    }
  }
}

// Requirements event handlers
const handleRequirementUpdate = (requirement: RequirementItem) => {
  emit('requirement-update', requirement)
}

const handleRequirementDelete = (requirementId: string) => {
  emit('requirement-delete', requirementId)
}

const handleRequirementCreate = (requirement: Partial<RequirementItem>) => {
  emit('requirement-create', requirement)
}

const handleRequirementsFilterChange = (filter: 'all' | 'new' | 'accepted' | 'rejected') => {
  emit('requirements-filter-change', filter)
}

const handleRequirementsSearchChange = (query: string) => {
  emit('requirements-search-change', query)
}

// Systems event handlers
const handleSystemSelect = (systemId: string) => {
  emit('system-select', systemId)
}

const handleSystemCreate = (system: Omit<SystemInfo, 'id'>) => {
  emit('system-create', system)
}

const handleSystemUpdate = (systemId: string, system: Partial<SystemInfo>) => {
  emit('system-update', systemId, system)
}

const handleSystemDelete = (systemId: string) => {
  emit('system-delete', systemId)
}

const handleSystemsSearchChange = (query: string) => {
  emit('systems-search-change', query)
}

const handleSystemsFilterChange = (filter: 'all' | 'internal' | 'external' | 'integration') => {
  emit('systems-filter-change', filter)
}

// Teams event handlers
const handleTeamSelect = (teamId: string) => {
  emit('team-select', teamId)
}

const handleTeamCreate = (team: Omit<TeamInfo, 'id'>) => {
  emit('team-create', team)
}

const handleTeamUpdate = (teamId: string, team: Partial<TeamInfo>) => {
  emit('team-update', teamId, team)
}

const handleTeamDelete = (teamId: string) => {
  emit('team-delete', teamId)
}

const handleTeamsSearchChange = (query: string) => {
  emit('teams-search-change', query)
}
</script>

<style scoped>
.requirements-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

/* Tab navigation */
.requirements-tabs__nav {
  display: flex;
  background: #f6f8fa;
  border-bottom: 1px solid #e1e5e9;
  padding: 0 16px;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.requirements-tabs__nav::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.requirements-tabs__tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6a737d;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: 0;
  position: relative;
}

.requirements-tabs__tab:hover {
  color: #24292e;
  background: rgba(3, 102, 214, 0.05);
}

.requirements-tabs__tab:focus {
  outline: none;
  color: #24292e;
  box-shadow: inset 0 0 0 2px #0366d6;
  border-radius: 4px;
}

.requirements-tabs__tab--active {
  color: #0366d6;
  border-bottom-color: #0366d6;
  background: #ffffff;
}

.requirements-tabs__tab--active:hover {
  color: #0366d6;
  background: #ffffff;
}

.requirements-tabs__tab-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.requirements-tabs__tab-label {
  flex-shrink: 0;
}

.requirements-tabs__tab-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #e1e5e9;
  color: #6a737d;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
}

.requirements-tabs__tab--active .requirements-tabs__tab-count {
  background: #0366d6;
  color: #ffffff;
}

/* Tab content */
.requirements-tabs__content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.requirements-tabs__panel {
  height: 100%;
  overflow: hidden;
}

/* Responsive design */
@media (max-width: 768px) {
  .requirements-tabs__nav {
    padding: 0 8px;
  }
  
  .requirements-tabs__tab {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .requirements-tabs__tab-icon {
    font-size: 14px;
  }
  
  .requirements-tabs__tab-count {
    min-width: 18px;
    height: 18px;
    font-size: 10px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .requirements-tabs__nav {
    border-bottom-width: 2px;
  }
  
  .requirements-tabs__tab--active {
    border-bottom-width: 3px;
  }
  
  .requirements-tabs__tab:focus {
    box-shadow: inset 0 0 0 3px #0366d6;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .requirements-tabs__tab {
    transition: none;
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .requirements-tabs-container {
    background: #0d1117;
  }
  
  .requirements-tabs__nav {
    background: #161b22;
    border-bottom-color: #30363d;
  }
  
  .requirements-tabs__tab {
    color: #8b949e;
  }
  
  .requirements-tabs__tab:hover {
    color: #f0f6fc;
    background: rgba(56, 139, 253, 0.1);
  }
  
  .requirements-tabs__tab:focus {
    color: #f0f6fc;
    box-shadow: inset 0 0 0 2px #388bfd;
  }
  
  .requirements-tabs__tab--active {
    color: #388bfd;
    border-bottom-color: #388bfd;
    background: #0d1117;
  }
  
  .requirements-tabs__tab--active:hover {
    color: #388bfd;
    background: #0d1117;
  }
  
  .requirements-tabs__tab-count {
    background: #30363d;
    color: #8b949e;
  }
  
  .requirements-tabs__tab--active .requirements-tabs__tab-count {
    background: #388bfd;
    color: #ffffff;
  }
}

/* Focus management for accessibility */
.requirements-tabs__tab[aria-selected="true"] {
  position: relative;
}

.requirements-tabs__tab[aria-selected="true"]::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #0366d6;
}

/* Keyboard navigation indicators */
.requirements-tabs__tab:focus-visible {
  outline: 2px solid #0366d6;
  outline-offset: -2px;
  border-radius: 4px;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>