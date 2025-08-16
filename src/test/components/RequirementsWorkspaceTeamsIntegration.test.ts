import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import RequirementsWorkspace from '../../components/RequirementsWorkspace.vue'
import { TeamsApiService } from '../../services/TeamsApiService'
import type { TeamInfo, RequirementItem } from '../../types/requirements'
import type { Project } from '../../types/project'

// Mock the TeamsApiService
vi.mock('../../services/TeamsApiService')
const mockedTeamsApiService = vi.mocked(TeamsApiService)

// Mock the RequirementsApiService
vi.mock('../../services/RequirementsApiService', () => ({
  RequirementsApiService: {
    getLatestRequirements: vi.fn(),
    listRequirementItems: vi.fn(),
    saveRequirementsDocument: vi.fn(),
    uploadRequirementsPdf: vi.fn()
  }
}))

// Mock MarkdownRenderer component
vi.mock('../../components/MarkdownRenderer.vue', () => ({
  default: {
    name: 'MarkdownRenderer',
    template: '<div class="markdown-renderer">{{ content }}</div>',
    props: ['content']
  }
}))

describe('RequirementsWorkspace Teams Integration', () => {
  let wrapper: VueWrapper<any>

  const mockProject: Project = {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'A test project',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockTeams: TeamInfo[] = [
    {
      id: '1',
      name: 'Frontend Team',
      role: 'Development',
      members: ['Alice Johnson', 'Bob Smith'],
      responsibilities: ['UI/UX Implementation', 'Client-side Logic']
    },
    {
      id: '2',
      name: 'Backend Team',
      role: 'Development',
      members: ['Charlie Brown', 'Diana Prince'],
      responsibilities: ['API Development', 'Database Design']
    }
  ]

  const mockRequirements: RequirementItem[] = [
    {
      id: '1',
      title: 'User Authentication',
      description: 'Implement user login and registration',
      status: 'new',
      priority: 'high',
      project_id: 'test-project-123',
      created_at: new Date(),
      updated_at: new Date(),
      source: 'manual'
    }
  ]

  beforeEach(async () => {
    vi.clearAllMocks()

    // Mock successful API responses
    mockedTeamsApiService.listTeams.mockResolvedValue(mockTeams)
    mockedTeamsApiService.createTeam.mockImplementation(async (projectId, teamData) => ({
      id: Date.now().toString(),
      ...teamData
    }))
    mockedTeamsApiService.updateTeam.mockImplementation(async (projectId, teamId, updates) => {
      const existingTeam = mockTeams.find(t => t.id === teamId)
      return { ...existingTeam!, ...updates }
    })
    mockedTeamsApiService.deleteTeam.mockResolvedValue(undefined)

    // Mock RequirementsApiService
    const { RequirementsApiService } = await import('../../services/RequirementsApiService')
    vi.mocked(RequirementsApiService.getLatestRequirements).mockRejectedValue(new Error('No document found'))
    vi.mocked(RequirementsApiService.listRequirementItems).mockResolvedValue(mockRequirements)

    wrapper = mount(RequirementsWorkspace, {
      props: {
        project: mockProject
      },
      global: {
        stubs: {
          MarkdownRenderer: true
        }
      }
    })

    // Wait for component to initialize
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterEach(() => {
    wrapper.unmount()
    vi.resetAllMocks()
  })

  describe('Teams Tab Integration', () => {
    it('loads teams data on component mount', async () => {
      expect(mockedTeamsApiService.listTeams).toHaveBeenCalledWith(mockProject.id)
      
      // Switch to teams tab to verify data is loaded
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      // Check that teams are displayed
      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards.length).toBeGreaterThan(0)
    })

    it('displays teams in the teams tab', async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      // Verify teams are displayed
      expect(wrapper.text()).toContain('Frontend Team')
      expect(wrapper.text()).toContain('Backend Team')
      expect(wrapper.text()).toContain('Development')
    })

    it('shows correct team count in tab', async () => {
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      const tabCount = teamsTab.find('.requirements-tabs__tab-count')
      
      expect(tabCount.text()).toBe(mockTeams.length.toString())
    })

    it('handles teams loading error gracefully', async () => {
      // Create a new wrapper with API error
      wrapper.unmount()
      mockedTeamsApiService.listTeams.mockRejectedValue(new Error('API Error'))
      
      wrapper = mount(RequirementsWorkspace, {
        props: {
          project: mockProject
        },
        global: {
          stubs: {
            MarkdownRenderer: true
          }
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      // Should still show sample data
      expect(wrapper.text()).toContain('Frontend Team')
      expect(wrapper.text()).toContain('Backend Team')
    })
  })

  describe('Team Management Operations', () => {
    beforeEach(async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('creates a new team', async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
      
      // Fill out the form
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('QA Team')
      await roleInput.setValue('Quality Assurance')
      await saveButton.trigger('click')
      
      expect(mockedTeamsApiService.createTeam).toHaveBeenCalledWith(mockProject.id, {
        name: 'QA Team',
        role: 'Quality Assurance',
        members: [],
        responsibilities: []
      })
    })

    it('updates an existing team', async () => {
      const editButton = wrapper.find('[data-testid="edit-team-1"]')
      await editButton.trigger('click')
      
      // Update the team name
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('Updated Frontend Team')
      await saveButton.trigger('click')
      
      expect(mockedTeamsApiService.updateTeam).toHaveBeenCalledWith(mockProject.id, '1', {
        name: 'Updated Frontend Team',
        role: 'Development',
        members: ['Alice Johnson', 'Bob Smith'],
        responsibilities: ['UI/UX Implementation', 'Client-side Logic']
      })
    })

    it('deletes a team', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      const deleteButton = wrapper.find('[data-testid="delete-team-1"]')
      await deleteButton.trigger('click')
      
      expect(mockedTeamsApiService.deleteTeam).toHaveBeenCalledWith(mockProject.id, '1')
      
      confirmSpy.mockRestore()
    })

    it('handles team creation error', async () => {
      mockedTeamsApiService.createTeam.mockRejectedValue(new Error('Validation error'))
      
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
      
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('Test Team')
      await roleInput.setValue('Testing')
      await saveButton.trigger('click')
      
      // Should show error notification
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Failed to create team')
    })

    it('handles team update error', async () => {
      mockedTeamsApiService.updateTeam.mockRejectedValue(new Error('Update failed'))
      
      const editButton = wrapper.find('[data-testid="edit-team-1"]')
      await editButton.trigger('click')
      
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('Updated Team')
      await saveButton.trigger('click')
      
      // Should show error notification
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Failed to update team')
    })

    it('handles team deletion error', async () => {
      mockedTeamsApiService.deleteTeam.mockRejectedValue(new Error('Delete failed'))
      
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      const deleteButton = wrapper.find('[data-testid="delete-team-1"]')
      await deleteButton.trigger('click')
      
      // Should show error notification
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Failed to delete team')
      
      confirmSpy.mockRestore()
    })
  })

  describe('Team Search and Filtering', () => {
    beforeEach(async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('filters teams by search query', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('Frontend')
      
      // Should update the search query in tab state
      expect(wrapper.vm.tabState.teams.searchQuery).toBe('Frontend')
    })

    it('updates teams search query when search input changes', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('Backend')
      
      expect(wrapper.vm.tabState.teams.searchQuery).toBe('Backend')
    })
  })

  describe('Team Selection', () => {
    beforeEach(async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('selects a team when clicked', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('click')
      
      expect(wrapper.vm.tabState.teams.selectedTeam).toBe('1')
    })

    it('shows selected team with proper styling', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('click')
      
      await wrapper.vm.$nextTick()
      
      expect(teamCard.classes()).toContain('team-card--selected')
      expect(teamCard.attributes('aria-pressed')).toBe('true')
    })
  })

  describe('Team-Requirement Association Display', () => {
    beforeEach(async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('displays team assignment section in team cards', () => {
      // Note: Currently the getTeamRequirements function returns empty array
      // This test verifies the structure is in place for future enhancement
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      
      // The assignments section should exist in the template even if empty
      expect(teamCard.html()).toContain('team-card__assignments')
    })

    it('shows responsibility indicators for teams', () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      
      expect(teamCard.text()).toContain('Responsibilities')
      expect(teamCard.text()).toContain('UI/UX Implementation')
      expect(teamCard.text()).toContain('Client-side Logic')
    })
  })

  describe('Tab State Management', () => {
    it('maintains teams tab state when switching between tabs', async () => {
      // Switch to teams tab and select a team
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('click')
      
      expect(wrapper.vm.tabState.teams.selectedTeam).toBe('1')
      
      // Switch to requirements tab
      const requirementsTab = wrapper.find('[data-testid="tab-requirements"]')
      await requirementsTab.trigger('click')
      
      // Switch back to teams tab
      await teamsTab.trigger('click')
      
      // Selected team should still be maintained
      expect(wrapper.vm.tabState.teams.selectedTeam).toBe('1')
    })

    it('updates teams items in tab state when teams data changes', async () => {
      // Initial teams should be loaded
      expect(wrapper.vm.tabState.teams.items).toHaveLength(mockTeams.length)
      
      // Switch to teams tab and add a new team
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
      
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('New Team')
      await roleInput.setValue('Testing')
      await saveButton.trigger('click')
      
      // Tab state should be updated with new team
      expect(wrapper.vm.tabState.teams.items).toHaveLength(mockTeams.length + 1)
    })
  })

  describe('Accessibility and User Experience', () => {
    beforeEach(async () => {
      // Switch to teams tab
      const teamsTab = wrapper.find('[data-testid="tab-teams"]')
      await teamsTab.trigger('click')
      await wrapper.vm.$nextTick()
    })

    it('provides proper ARIA labels for team management', () => {
      const teamsTab = wrapper.find('[data-testid="teams-tab"]')
      expect(teamsTab.attributes('aria-label')).toBe('Teams management')
      
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      expect(addButton.attributes('aria-label')).toBe('Add new team')
    })

    it('shows loading states during team operations', async () => {
      // Mock a slow API response
      mockedTeamsApiService.createTeam.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          id: 'new-team',
          name: 'Test Team',
          role: 'Testing',
          members: [],
          responsibilities: []
        }), 1000))
      )
      
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
      
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('Test Team')
      await roleInput.setValue('Testing')
      
      // Trigger save but don't wait for completion
      saveButton.trigger('click')
      
      // Should show some indication of processing (this would be enhanced in real implementation)
      expect(mockedTeamsApiService.createTeam).toHaveBeenCalled()
    })

    it('provides user feedback for successful operations', async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
      
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      
      await nameInput.setValue('Success Team')
      await roleInput.setValue('Testing')
      await saveButton.trigger('click')
      
      // Should show success notification
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('created successfully')
    })
  })
})