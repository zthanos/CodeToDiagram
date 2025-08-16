import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import TeamsTab from '../../components/TeamsTab.vue'
import type { TeamInfo, RequirementItem } from '../../types/requirements'

// Mock data
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
  },
  {
    id: '3',
    name: 'QA Team',
    role: 'Quality Assurance',
    members: ['Eve Wilson'],
    responsibilities: ['Testing', 'Quality Control']
  }
]

const mockRequirements: RequirementItem[] = [
  {
    id: '1',
    title: 'User Authentication',
    description: 'Implement user login and registration',
    status: 'new',
    priority: 'high',
    project_id: 'project-1',
    created_at: new Date(),
    updated_at: new Date(),
    source: 'manual'
  },
  {
    id: '2',
    title: 'Payment Processing',
    description: 'Integrate payment gateway',
    status: 'accepted',
    priority: 'medium',
    project_id: 'project-1',
    created_at: new Date(),
    updated_at: new Date(),
    source: 'manual'
  }
]

describe('TeamsTab', () => {
  let wrapper: VueWrapper<any>

  const defaultProps = {
    items: mockTeams,
    selectedTeam: null,
    searchQuery: '',
    readonly: false,
    requirementItems: mockRequirements
  }

  beforeEach(() => {
    wrapper = mount(TeamsTab, {
      props: defaultProps
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('renders the teams tab component', () => {
      expect(wrapper.find('[data-testid="teams-tab"]').exists()).toBe(true)
    })

    it('displays the correct number of teams', () => {
      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(mockTeams.length)
    })

    it('shows teams summary with correct count', () => {
      const summary = wrapper.find('[data-testid="teams-summary"]')
      expect(summary.text()).toContain(`Showing ${mockTeams.length} of ${mockTeams.length} teams`)
    })

    it('renders search input', () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('Search teams...')
    })

    it('renders add team button when not readonly', () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toBe('+ Add Team')
      expect(addButton.attributes('disabled')).toBeUndefined()
    })

    it('disables add team button when readonly', async () => {
      await wrapper.setProps({ readonly: true })
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      expect(addButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Team Cards', () => {
    it('displays team information correctly', () => {
      const firstTeamCard = wrapper.find('[data-testid="team-card-1"]')
      expect(firstTeamCard.exists()).toBe(true)

      // Check team name and role
      expect(firstTeamCard.text()).toContain('Frontend Team')
      expect(firstTeamCard.text()).toContain('Development')

      // Check members
      expect(firstTeamCard.text()).toContain('Members (2)')
      expect(firstTeamCard.text()).toContain('Alice Johnson')
      expect(firstTeamCard.text()).toContain('Bob Smith')

      // Check responsibilities
      expect(firstTeamCard.text()).toContain('Responsibilities')
      expect(firstTeamCard.text()).toContain('UI/UX Implementation')
      expect(firstTeamCard.text()).toContain('Client-side Logic')
    })

    it('generates correct initials for team members', () => {
      const firstTeamCard = wrapper.find('[data-testid="team-card-1"]')
      const avatars = firstTeamCard.findAll('.team-card__member-avatar')

      expect(avatars[0].text()).toBe('AJ') // Alice Johnson
      expect(avatars[1].text()).toBe('BS') // Bob Smith
    })

    it('shows selected state when team is selected', async () => {
      await wrapper.setProps({ selectedTeam: '1' })

      const selectedCard = wrapper.find('[data-testid="team-card-1"]')
      expect(selectedCard.classes()).toContain('team-card--selected')
      expect(selectedCard.attributes('aria-pressed')).toBe('true')
    })

    it('renders action buttons for each team', () => {
      const firstTeamCard = wrapper.find('[data-testid="team-card-1"]')

      const editButton = firstTeamCard.find('[data-testid="edit-team-1"]')
      const deleteButton = firstTeamCard.find('[data-testid="delete-team-1"]')

      expect(editButton.exists()).toBe(true)
      expect(deleteButton.exists()).toBe(true)
    })

    it('disables action buttons when readonly', async () => {
      await wrapper.setProps({ readonly: true })

      const editButton = wrapper.find('[data-testid="edit-team-1"]')
      const deleteButton = wrapper.find('[data-testid="delete-team-1"]')

      expect(editButton.attributes('disabled')).toBeDefined()
      expect(deleteButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Search Functionality', () => {
    it('filters teams by name', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('Frontend')

      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(1)
      expect(teamCards[0].text()).toContain('Frontend Team')
    })

    it('filters teams by role', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('Quality Assurance')

      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(1)
      expect(teamCards[0].text()).toContain('QA Team')
    })

    it('filters teams by member name', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('Alice')

      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(1)
      expect(teamCards[0].text()).toContain('Frontend Team')
    })

    it('filters teams by responsibility', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('API Development')

      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(1)
      expect(teamCards[0].text()).toContain('Backend Team')
    })

    it('shows no results when search matches nothing', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('NonexistentTeam')

      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(0)

      const emptyState = wrapper.find('[data-testid="teams-empty"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No matching teams')
    })

    it('emits search-change event when search input changes', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('test query')

      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change')?.[0]).toEqual(['test query'])
    })
  })

  describe('Team Selection', () => {
    it('emits team-select event when team card is clicked', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('click')

      expect(wrapper.emitted('team-select')).toBeTruthy()
      expect(wrapper.emitted('team-select')?.[0]).toEqual(['1'])
    })

    it('emits team-select event when Enter key is pressed on team card', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('team-select')).toBeTruthy()
      expect(wrapper.emitted('team-select')?.[0]).toEqual(['1'])
    })

    it('emits team-select event when Space key is pressed on team card', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')
      await teamCard.trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('team-select')).toBeTruthy()
      expect(wrapper.emitted('team-select')?.[0]).toEqual(['1'])
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no teams exist', async () => {
      await wrapper.setProps({ items: [] })

      const emptyState = wrapper.find('[data-testid="teams-empty"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No teams yet')
      expect(emptyState.text()).toContain('Get started by adding your first team.')

      const addButton = emptyState.find('[data-testid="empty-add-team-btn"]')
      expect(addButton.exists()).toBe(true)
    })

    it('hides add button in empty state when readonly', async () => {
      await wrapper.setProps({ items: [], readonly: true })

      const addButton = wrapper.find('[data-testid="empty-add-team-btn"]')
      expect(addButton.exists()).toBe(false)
    })
  })

  describe('Team Modal', () => {
    it('opens modal when add team button is clicked', async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      const modal = wrapper.find('[data-testid="team-modal"]')
      expect(modal.exists()).toBe(true)

      const modalTitle = wrapper.find('.teams-tab__modal-title')
      expect(modalTitle.text()).toBe('Add New Team')
    })

    it('opens modal in edit mode when edit button is clicked', async () => {
      const editButton = wrapper.find('[data-testid="edit-team-1"]')
      await editButton.trigger('click')

      const modal = wrapper.find('[data-testid="team-modal"]')
      expect(modal.exists()).toBe(true)

      const modalTitle = wrapper.find('.teams-tab__modal-title')
      expect(modalTitle.text()).toBe('Edit Team')

      // Check that form is pre-populated
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')

      expect((nameInput.element as HTMLInputElement).value).toBe('Frontend Team')
      expect((roleInput.element as HTMLInputElement).value).toBe('Development')
    })

    it('closes modal when cancel button is clicked', async () => {
      // Open modal first
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      // Close modal
      const cancelButton = wrapper.find('[data-testid="cancel-team-btn"]')
      await cancelButton.trigger('click')

      const modal = wrapper.find('[data-testid="team-modal"]')
      expect(modal.exists()).toBe(false)
    })

    it('closes modal when overlay is clicked', async () => {
      // Open modal first
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      // Click overlay
      const overlay = wrapper.find('.teams-tab__modal-overlay')
      await overlay.trigger('click')

      const modal = wrapper.find('[data-testid="team-modal"]')
      expect(modal.exists()).toBe(false)
    })
  })

  describe('Team Form', () => {
    beforeEach(async () => {
      // Open the modal
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
    })

    it('validates required fields', async () => {
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      expect(saveButton.attributes('disabled')).toBeDefined()

      // Fill in name only
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      await nameInput.setValue('Test Team')

      // Should still be disabled without role
      expect(saveButton.attributes('disabled')).toBeDefined()

      // Fill in role
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      await roleInput.setValue('Testing')

      // Should now be enabled
      expect(saveButton.attributes('disabled')).toBeUndefined()
    })

    it('adds team members', async () => {
      const memberInput = wrapper.find('[data-testid="team-member-input"]')
      const addMemberButton = wrapper.find('[data-testid="add-member-btn"]')

      await memberInput.setValue('John Doe')
      await addMemberButton.trigger('click')

      const membersList = wrapper.find('.teams-tab__members-list')
      expect(membersList.text()).toContain('John Doe')

      // Input should be cleared
      expect((memberInput.element as HTMLInputElement).value).toBe('')
    })

    it('adds team members with Enter key', async () => {
      const memberInput = wrapper.find('[data-testid="team-member-input"]')

      await memberInput.setValue('Jane Smith')
      await memberInput.trigger('keydown', { key: 'Enter' })

      const membersList = wrapper.find('.teams-tab__members-list')
      expect(membersList.text()).toContain('Jane Smith')
    })

    it('removes team members', async () => {
      const memberInput = wrapper.find('[data-testid="team-member-input"]')
      const addMemberButton = wrapper.find('[data-testid="add-member-btn"]')

      // Add a member
      await memberInput.setValue('John Doe')
      await addMemberButton.trigger('click')

      // Remove the member
      const removeButton = wrapper.find('[data-testid="remove-member-0"]')
      await removeButton.trigger('click')

      const membersList = wrapper.find('.teams-tab__members-list')
      expect(membersList.exists()).toBe(false)
    })

    it('adds team responsibilities', async () => {
      const responsibilityInput = wrapper.find('[data-testid="team-responsibility-input"]')
      const addResponsibilityButton = wrapper.find('[data-testid="add-responsibility-btn"]')

      await responsibilityInput.setValue('Code Review')
      await addResponsibilityButton.trigger('click')

      const responsibilitiesList = wrapper.find('.teams-tab__responsibilities-list')
      expect(responsibilitiesList.text()).toContain('Code Review')

      // Input should be cleared
      expect((responsibilityInput.element as HTMLInputElement).value).toBe('')
    })

    it('removes team responsibilities', async () => {
      const responsibilityInput = wrapper.find('[data-testid="team-responsibility-input"]')
      const addResponsibilityButton = wrapper.find('[data-testid="add-responsibility-btn"]')

      // Add a responsibility
      await responsibilityInput.setValue('Code Review')
      await addResponsibilityButton.trigger('click')

      // Remove the responsibility
      const removeButton = wrapper.find('[data-testid="remove-responsibility-0"]')
      await removeButton.trigger('click')

      const responsibilitiesList = wrapper.find('.teams-tab__responsibilities-list')
      expect(responsibilitiesList.exists()).toBe(false)
    })

    it('emits team-create event when form is submitted', async () => {
      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')
      const form = wrapper.find('.teams-tab__form')

      await nameInput.setValue('New Team')
      await roleInput.setValue('Development')

      // Wait for form validation to complete
      await wrapper.vm.$nextTick()

      // Trigger form submit instead of button click
      await form.trigger('submit')

      expect(wrapper.emitted('team-create')).toBeTruthy()
      expect(wrapper.emitted('team-create')?.[0]).toEqual([{
        name: 'New Team',
        role: 'Development',
        members: [],
        responsibilities: []
      }])
    })

    it('emits team-update event when editing existing team', async () => {
      // Close the add modal and open edit modal
      const cancelButton = wrapper.find('[data-testid="cancel-team-btn"]')
      await cancelButton.trigger('click')

      const editButton = wrapper.find('[data-testid="edit-team-1"]')
      await editButton.trigger('click')

      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const form = wrapper.find('.teams-tab__form')

      await nameInput.setValue('Updated Frontend Team')

      // Wait for form validation to complete
      await wrapper.vm.$nextTick()

      // Trigger form submit instead of button click
      await form.trigger('submit')

      expect(wrapper.emitted('team-update')).toBeTruthy()
      expect(wrapper.emitted('team-update')?.[0]).toEqual(['1', {
        name: 'Updated Frontend Team',
        role: 'Development',
        members: ['Alice Johnson', 'Bob Smith'],
        responsibilities: ['UI/UX Implementation', 'Client-side Logic']
      }])
    })
  })

  describe('Team Deletion', () => {
    it('shows confirmation dialog and emits team-delete event', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const deleteButton = wrapper.find('[data-testid="delete-team-1"]')
      await deleteButton.trigger('click')

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete the team "Frontend Team"?')
      expect(wrapper.emitted('team-delete')).toBeTruthy()
      expect(wrapper.emitted('team-delete')?.[0]).toEqual(['1'])

      confirmSpy.mockRestore()
    })

    it('does not emit team-delete event when confirmation is cancelled', async () => {
      // Mock window.confirm to return false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const deleteButton = wrapper.find('[data-testid="delete-team-1"]')
      await deleteButton.trigger('click')

      expect(confirmSpy).toHaveBeenCalled()
      expect(wrapper.emitted('team-delete')).toBeFalsy()

      confirmSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes on team cards', () => {
      const teamCard = wrapper.find('[data-testid="team-card-1"]')

      expect(teamCard.attributes('role')).toBe('button')
      expect(teamCard.attributes('tabindex')).toBe('0')
      expect(teamCard.attributes('aria-label')).toBe('Select team: Frontend Team')
      expect(teamCard.attributes('aria-pressed')).toBe('false')
    })

    it('has proper ARIA attributes on form inputs', async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      const nameInput = wrapper.find('[data-testid="team-name-input"]')
      const roleInput = wrapper.find('[data-testid="team-role-input"]')

      expect(nameInput.attributes('id')).toBe('team-name')
      expect(roleInput.attributes('id')).toBe('team-role')
      expect(nameInput.attributes('required')).toBeDefined()
      expect(roleInput.attributes('required')).toBeDefined()
    })

    it('has proper region labels', () => {
      const teamsTab = wrapper.find('[data-testid="teams-tab"]')
      expect(teamsTab.attributes('role')).toBe('region')
      expect(teamsTab.attributes('aria-label')).toBe('Teams management')
    })
  })
})