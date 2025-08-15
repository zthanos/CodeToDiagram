import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import RequirementsTabsContainer from '../../components/RequirementsTabsContainer.vue'
import RequirementsList from '../../components/RequirementsList.vue'
import SystemsList from '../../components/SystemsList.vue'
import TeamsList from '../../components/TeamsList.vue'
import type { RequirementItem, SystemInfo, TeamInfo, TabState } from '../../types/requirements'

// Mock child components
vi.mock('../../components/RequirementsList.vue', () => ({
  default: {
    name: 'RequirementsList',
    template: '<div data-testid="requirements-list-mock">Requirements List</div>',
    props: ['items', 'filter', 'searchQuery', 'readonly'],
    emits: ['item-update', 'item-delete', 'item-create', 'filter-change', 'search-change']
  }
}))

vi.mock('../../components/SystemsList.vue', () => ({
  default: {
    name: 'SystemsList',
    template: '<div data-testid="systems-list-mock">Systems List</div>',
    props: ['items', 'selectedSystem', 'searchQuery', 'filter', 'readonly'],
    emits: ['system-select', 'system-create', 'system-update', 'system-delete', 'search-change', 'filter-change']
  }
}))

vi.mock('../../components/TeamsList.vue', () => ({
  default: {
    name: 'TeamsList',
    template: '<div data-testid="teams-list-mock">Teams List</div>',
    props: ['items', 'selectedTeam', 'searchQuery', 'readonly'],
    emits: ['team-select', 'team-create', 'team-update', 'team-delete', 'search-change']
  }
}))

// Mock data
const mockRequirements: RequirementItem[] = [
  {
    id: 'req-1',
    title: 'User Authentication',
    description: 'Users should be able to log in',
    status: 'new',
    created_at: new Date(),
    updated_at: new Date(),
    source: 'manual'
  }
]

const mockSystems: SystemInfo[] = [
  {
    id: 'sys-1',
    name: 'Auth System',
    description: 'Authentication system',
    type: 'internal',
    dependencies: []
  }
]

const mockTeams: TeamInfo[] = [
  {
    id: 'team-1',
    name: 'Dev Team',
    role: 'Development',
    members: ['John Doe'],
    responsibilities: ['Coding']
  }
]

const mockTabState: TabState = {
  requirements: {
    items: [],
    filter: 'all',
    searchQuery: ''
  },
  systems: {
    items: [],
    selectedSystem: null,
    searchQuery: '',
    filter: 'all'
  },
  teams: {
    items: [],
    selectedTeam: null,
    searchQuery: ''
  }
}

describe('RequirementsTabsContainer.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(RequirementsTabsContainer, {
      props: {
        activeTab: 'requirements',
        requirementItems: mockRequirements,
        systemsData: mockSystems,
        teamsData: mockTeams,
        tabState: mockTabState,
        readonly: false
      }
    })
  })

  describe('Component Rendering', () => {
    it('renders the tabs container', () => {
      expect(wrapper.find('[data-testid="requirements-tabs-container"]').exists()).toBe(true)
    })

    it('renders all three tabs', () => {
      const tabs = wrapper.findAll('[data-testid^="tab-"]')
      expect(tabs).toHaveLength(3)
      
      expect(wrapper.find('[data-testid="tab-requirements"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-systems"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tab-teams"]').exists()).toBe(true)
    })

    it('displays correct tab labels and icons', () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')

      expect(requirementsTab.text()).toContain('📋')
      expect(requirementsTab.text()).toContain('Requirements')
      
      expect(systemsTab.text()).toContain('🏗️')
      expect(systemsTab.text()).toContain('Systems')
      
      expect(teamsTab.text()).toContain('👥')
      expect(teamsTab.text()).toContain('Teams')
    })

    it('displays item counts in tabs', () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')

      expect(requirementsTab.text()).toContain('1') // 1 requirement
      expect(systemsTab.text()).toContain('1') // 1 system
      expect(teamsTab.text()).toContain('1') // 1 team
    })

    it('shows active tab with correct styling', () => {
      const activeTab = wrapper.find('[data-testid="tab-requirements"]')
      expect(activeTab.classes()).toContain('requirements-tabs__tab--active')
    })
  })

  describe('Tab Navigation', () => {
    it('emits tab-change event when tab is clicked', async () => {
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      await systemsTab.trigger('click')

      expect(wrapper.emitted('tab-change')).toBeTruthy()
      expect(wrapper.emitted('tab-change')[0]).toEqual(['systems'])
    })

    it('does not emit tab-change when clicking already active tab', async () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      await requirementsTab.trigger('click')

      expect(wrapper.emitted('tab-change')).toBeFalsy()
    })

    it('handles keyboard navigation with arrow keys', async () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      
      // Arrow right should go to systems tab
      await requirementsTab.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.emitted('tab-change')).toBeTruthy()
      expect(wrapper.emitted('tab-change')[0]).toEqual(['systems'])
    })

    it('handles keyboard navigation with Home and End keys', async () => {
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      
      // Home should go to first tab (requirements)
      await systemsTab.trigger('keydown', { key: 'Home' })
      expect(wrapper.emitted('tab-change')).toBeTruthy()
      expect(wrapper.emitted('tab-change')[0]).toEqual(['requirements'])
      
      // End should go to last tab (teams)
      await systemsTab.trigger('keydown', { key: 'End' })
      expect(wrapper.emitted('tab-change')[1]).toEqual(['teams'])
    })

    it('handles Enter and Space keys for tab activation', async () => {
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      
      // Enter key
      await systemsTab.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('tab-change')).toBeTruthy()
      
      // Space key
      await systemsTab.trigger('keydown', { key: ' ' })
      expect(wrapper.emitted('tab-change')).toHaveLength(2)
    })

    it('wraps around when navigating with arrow keys', async () => {
      // Set active tab to teams (last tab)
      await wrapper.setProps({ activeTab: 'teams' })
      
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      
      // Arrow right from last tab should go to first tab
      await teamsTab.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.emitted('tab-change')).toBeTruthy()
      expect(wrapper.emitted('tab-change')[0]).toEqual(['requirements'])
    })
  })

  describe('Tab Content Display', () => {
    it('shows requirements panel when requirements tab is active', () => {
      expect(wrapper.find('[data-testid="requirements-panel"]').isVisible()).toBe(true)
      expect(wrapper.find('[data-testid="systems-panel"]').isVisible()).toBe(false)
      expect(wrapper.find('[data-testid="teams-panel"]').isVisible()).toBe(false)
    })

    it('shows systems panel when systems tab is active', async () => {
      await wrapper.setProps({ activeTab: 'systems' })
      
      expect(wrapper.find('[data-testid="requirements-panel"]').isVisible()).toBe(false)
      expect(wrapper.find('[data-testid="systems-panel"]').isVisible()).toBe(true)
      expect(wrapper.find('[data-testid="teams-panel"]').isVisible()).toBe(false)
    })

    it('shows teams panel when teams tab is active', async () => {
      await wrapper.setProps({ activeTab: 'teams' })
      
      expect(wrapper.find('[data-testid="requirements-panel"]').isVisible()).toBe(false)
      expect(wrapper.find('[data-testid="systems-panel"]').isVisible()).toBe(false)
      expect(wrapper.find('[data-testid="teams-panel"]').isVisible()).toBe(true)
    })

    it('renders child components with correct props', () => {
      const requirementsList = wrapper.findComponent({ name: 'RequirementsList' })
      const systemsList = wrapper.findComponent({ name: 'SystemsList' })
      const teamsList = wrapper.findComponent({ name: 'TeamsList' })

      expect(requirementsList.props('items')).toEqual(mockRequirements)
      expect(requirementsList.props('readonly')).toBe(false)
      
      expect(systemsList.props('items')).toEqual(mockSystems)
      expect(systemsList.props('readonly')).toBe(false)
      
      expect(teamsList.props('items')).toEqual(mockTeams)
      expect(teamsList.props('readonly')).toBe(false)
    })
  })

  describe('Event Forwarding', () => {
    it('forwards requirements events correctly', async () => {
      const requirementsList = wrapper.findComponent({ name: 'RequirementsList' })
      
      // Test requirement update
      const mockRequirement = { id: 'req-1', title: 'Updated' }
      await requirementsList.vm.$emit('item-update', mockRequirement)
      expect(wrapper.emitted('requirement-update')).toBeTruthy()
      expect(wrapper.emitted('requirement-update')[0]).toEqual([mockRequirement])
      
      // Test requirement delete
      await requirementsList.vm.$emit('item-delete', 'req-1')
      expect(wrapper.emitted('requirement-delete')).toBeTruthy()
      expect(wrapper.emitted('requirement-delete')[0]).toEqual(['req-1'])
      
      // Test filter change
      await requirementsList.vm.$emit('filter-change', 'accepted')
      expect(wrapper.emitted('requirements-filter-change')).toBeTruthy()
      expect(wrapper.emitted('requirements-filter-change')[0]).toEqual(['accepted'])
    })

    it('forwards systems events correctly', async () => {
      const systemsList = wrapper.findComponent({ name: 'SystemsList' })
      
      // Test system select
      await systemsList.vm.$emit('system-select', 'sys-1')
      expect(wrapper.emitted('system-select')).toBeTruthy()
      expect(wrapper.emitted('system-select')[0]).toEqual(['sys-1'])
      
      // Test system create
      const mockSystem = { name: 'New System', description: 'Test', type: 'internal', dependencies: [] }
      await systemsList.vm.$emit('system-create', mockSystem)
      expect(wrapper.emitted('system-create')).toBeTruthy()
      expect(wrapper.emitted('system-create')[0]).toEqual([mockSystem])
      
      // Test filter change
      await systemsList.vm.$emit('filter-change', 'external')
      expect(wrapper.emitted('systems-filter-change')).toBeTruthy()
      expect(wrapper.emitted('systems-filter-change')[0]).toEqual(['external'])
    })

    it('forwards teams events correctly', async () => {
      const teamsList = wrapper.findComponent({ name: 'TeamsList' })
      
      // Test team select
      await teamsList.vm.$emit('team-select', 'team-1')
      expect(wrapper.emitted('team-select')).toBeTruthy()
      expect(wrapper.emitted('team-select')[0]).toEqual(['team-1'])
      
      // Test team create
      const mockTeam = { name: 'New Team', role: 'Test', members: [], responsibilities: [] }
      await teamsList.vm.$emit('team-create', mockTeam)
      expect(wrapper.emitted('team-create')).toBeTruthy()
      expect(wrapper.emitted('team-create')[0]).toEqual([mockTeam])
      
      // Test search change
      await teamsList.vm.$emit('search-change', 'test query')
      expect(wrapper.emitted('teams-search-change')).toBeTruthy()
      expect(wrapper.emitted('teams-search-change')[0]).toEqual(['test query'])
    })
  })

  describe('State Preservation', () => {
    it('maintains tab state when switching between tabs', async () => {
      // Switch to systems tab
      await wrapper.setProps({ activeTab: 'systems' })
      expect(wrapper.find('[data-testid="systems-panel"]').isVisible()).toBe(true)
      
      // Switch back to requirements tab
      await wrapper.setProps({ activeTab: 'requirements' })
      expect(wrapper.find('[data-testid="requirements-panel"]').isVisible()).toBe(true)
      
      // Both components should still exist in DOM (just hidden)
      expect(wrapper.findComponent({ name: 'RequirementsList' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'SystemsList' }).exists()).toBe(true)
    })

    it('passes tab state to child components', () => {
      const requirementsList = wrapper.findComponent({ name: 'RequirementsList' })
      const systemsList = wrapper.findComponent({ name: 'SystemsList' })
      const teamsList = wrapper.findComponent({ name: 'TeamsList' })

      expect(requirementsList.props('filter')).toBe(mockTabState.requirements.filter)
      expect(requirementsList.props('searchQuery')).toBe(mockTabState.requirements.searchQuery)
      
      expect(systemsList.props('selectedSystem')).toBe(mockTabState.systems.selectedSystem)
      expect(systemsList.props('searchQuery')).toBe(mockTabState.systems.searchQuery)
      
      expect(teamsList.props('selectedTeam')).toBe(mockTabState.teams.selectedTeam)
      expect(teamsList.props('searchQuery')).toBe(mockTabState.teams.searchQuery)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for tabs', () => {
      const tabList = wrapper.find('.requirements-tabs__nav')
      expect(tabList.attributes('role')).toBe('tablist')
      expect(tabList.attributes('aria-label')).toBe('Requirements workspace sections')
      
      const tabs = wrapper.findAll('[data-testid^="tab-"]')
      tabs.forEach((tab, index) => {
        expect(tab.attributes('role')).toBe('tab')
        expect(tab.attributes('aria-controls')).toBeDefined()
        expect(tab.attributes('id')).toBeDefined()
      })
    })

    it('has proper ARIA attributes for tab panels', () => {
      const panels = wrapper.findAll('.requirements-tabs__panel')
      panels.forEach(panel => {
        expect(panel.attributes('role')).toBe('tabpanel')
        expect(panel.attributes('aria-labelledby')).toBeDefined()
        expect(panel.attributes('id')).toBeDefined()
      })
    })

    it('sets aria-selected correctly for active tab', () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      const systemsTab = wrapper.find('[data-testid="tab-systems"]')
      
      expect(requirementsTab.attributes('aria-selected')).toBe('true')
      expect(systemsTab.attributes('aria-selected')).toBe('false')
    })

    it('has proper aria-label for tab counts', () => {
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      const countElement = requirementsTab.find('.requirements-tabs__tab-count')
      
      expect(countElement.attributes('aria-label')).toBe('1 items')
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      expect(wrapper.find('.requirements-tabs__nav').exists()).toBe(true)
      expect(wrapper.find('.requirements-tabs__content').exists()).toBe(true)
    })
  })

  describe('Readonly Mode', () => {
    it('passes readonly prop to child components', async () => {
      await wrapper.setProps({ readonly: true })
      
      const requirementsList = wrapper.findComponent({ name: 'RequirementsList' })
      const systemsList = wrapper.findComponent({ name: 'SystemsList' })
      const teamsList = wrapper.findComponent({ name: 'TeamsList' })

      expect(requirementsList.props('readonly')).toBe(true)
      expect(systemsList.props('readonly')).toBe(true)
      expect(teamsList.props('readonly')).toBe(true)
    })
  })
})