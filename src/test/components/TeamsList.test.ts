import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamsList from '../../components/TeamsList.vue'
import type { TeamInfo } from '../../types/requirements'

// Mock data
const mockTeams: TeamInfo[] = [
  {
    id: 'team-1',
    name: 'Development Team',
    role: 'Software Development',
    members: ['John Doe', 'Jane Smith', 'Bob Johnson'],
    responsibilities: ['Frontend Development', 'Backend Development', 'Code Review']
  },
  {
    id: 'team-2',
    name: 'QA Team',
    role: 'Quality Assurance',
    members: ['Alice Brown', 'Charlie Wilson'],
    responsibilities: ['Test Planning', 'Manual Testing', 'Automation Testing']
  },
  {
    id: 'team-3',
    name: 'Design Team',
    role: 'User Experience',
    members: ['Eva Davis'],
    responsibilities: ['UI Design', 'UX Research', 'Prototyping']
  }
]

describe('TeamsList.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TeamsList, {
      props: {
        items: mockTeams,
        selectedTeam: null,
        searchQuery: '',
        readonly: false
      }
    })
  })

  describe('Component Rendering', () => {
    it('renders the teams list container', () => {
      expect(wrapper.find('[data-testid="teams-list"]').exists()).toBe(true)
    })

    it('displays the correct number of teams', () => {
      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(3)
    })

    it('shows the teams summary', () => {
      const summary = wrapper.find('[data-testid="teams-summary"]')
      expect(summary.text()).toContain('Showing 3 of 3 teams')
    })

    it('renders team cards with correct information', () => {
      const firstCard = wrapper.find('[data-testid="team-card-team-1"]')
      expect(firstCard.text()).toContain('Development Team')
      expect(firstCard.text()).toContain('Software Development')
      expect(firstCard.text()).toContain('Members (3)')
      expect(firstCard.text()).toContain('John Doe')
      expect(firstCard.text()).toContain('Frontend Development')
    })

    it('displays member avatars with initials', () => {
      const firstCard = wrapper.find('[data-testid="team-card-team-1"]')
      const avatars = firstCard.findAll('.team-card__member-avatar')
      
      expect(avatars).toHaveLength(3)
      expect(avatars[0].text()).toBe('JD') // John Doe
      expect(avatars[1].text()).toBe('JS') // Jane Smith
      expect(avatars[2].text()).toBe('BJ') // Bob Johnson
    })
  })

  describe('Search Functionality', () => {
    it('filters teams by search query', async () => {
      const searchInput = wrapper.find('[data-testid="teams-search"]')
      await searchInput.setValue('QA')

      // Should emit search-change event
      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change')[0]).toEqual(['QA'])
    })

    it('searches across team name, role, members, and responsibilities', async () => {
      // Test searching by member name
      wrapper = mount(TeamsList, {
        props: {
          items: mockTeams,
          searchQuery: 'Alice',
          readonly: false
        }
      })

      await wrapper.vm.$nextTick()
      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      expect(teamCards).toHaveLength(1)
      expect(teamCards[0].text()).toContain('QA Team')
    })

    it('shows empty state when no teams match search', async () => {
      wrapper = mount(TeamsList, {
        props: {
          items: mockTeams,
          searchQuery: 'nonexistent',
          readonly: false
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="teams-empty"]').exists()).toBe(true)
    })
  })

  describe('Team Selection', () => {
    it('emits team-select event when team is clicked', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-team-1"]')
      await teamCard.trigger('click')

      expect(wrapper.emitted('team-select')).toBeTruthy()
      expect(wrapper.emitted('team-select')[0]).toEqual(['team-1'])
    })

    it('handles keyboard navigation for team selection', async () => {
      const teamCard = wrapper.find('[data-testid="team-card-team-1"]')
      
      // Test Enter key
      await teamCard.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('team-select')).toBeTruthy()
      
      // Test Space key
      await teamCard.trigger('keydown', { key: ' ' })
      expect(wrapper.emitted('team-select')).toHaveLength(2)
    })

    it('shows selected team with correct styling', async () => {
      wrapper = mount(TeamsList, {
        props: {
          items: mockTeams,
          selectedTeam: 'team-1',
          readonly: false
        }
      })

      const selectedCard = wrapper.find('[data-testid="team-card-team-1"]')
      expect(selectedCard.classes()).toContain('team-card--selected')
    })
  })

  describe('Team Management', () => {
    it('shows add team button when not readonly', () => {
      expect(wrapper.find('[data-testid="add-team-btn"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-team-btn"]').attributes('disabled')).toBeUndefined()
    })

    it('disables add team button when readonly', async () => {
      await wrapper.setProps({ readonly: true })
      expect(wrapper.find('[data-testid="add-team-btn"]').attributes('disabled')).toBeDefined()
    })

    it('opens team modal when add button is clicked', async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      expect(wrapper.find('[data-testid="team-modal"]').exists()).toBe(true)
    })

    it('shows edit and delete buttons for each team', () => {
      const editButton = wrapper.find('[data-testid="edit-team-team-1"]')
      const deleteButton = wrapper.find('[data-testid="delete-team-team-1"]')
      
      expect(editButton.exists()).toBe(true)
      expect(deleteButton.exists()).toBe(true)
    })

    it('disables edit and delete buttons when readonly', async () => {
      await wrapper.setProps({ readonly: true })
      
      const editButton = wrapper.find('[data-testid="edit-team-team-1"]')
      const deleteButton = wrapper.find('[data-testid="delete-team-team-1"]')
      
      expect(editButton.attributes('disabled')).toBeDefined()
      expect(deleteButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Team Form', () => {
    beforeEach(async () => {
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')
    })

    it('shows team form in modal', () => {
      expect(wrapper.find('[data-testid="team-name-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="team-role-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="team-member-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="team-responsibility-input"]').exists()).toBe(true)
    })

    it('validates required fields', async () => {
      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      expect(saveButton.attributes('disabled')).toBeDefined()

      // Fill in required fields
      await wrapper.find('[data-testid="team-name-input"]').setValue('Test Team')
      await wrapper.find('[data-testid="team-role-input"]').setValue('Test Role')
      
      await wrapper.vm.$nextTick()
      expect(saveButton.attributes('disabled')).toBeUndefined()
    })

    it('allows adding and removing members', async () => {
      const memberInput = wrapper.find('[data-testid="team-member-input"]')
      const addButton = wrapper.find('[data-testid="add-member-btn"]')

      await memberInput.setValue('Test Member')
      await addButton.trigger('click')

      expect(wrapper.text()).toContain('Test Member')

      const removeButton = wrapper.find('[data-testid="remove-member-0"]')
      await removeButton.trigger('click')

      expect(wrapper.text()).not.toContain('Test Member')
    })

    it('allows adding and removing responsibilities', async () => {
      const responsibilityInput = wrapper.find('[data-testid="team-responsibility-input"]')
      const addButton = wrapper.find('[data-testid="add-responsibility-btn"]')

      await responsibilityInput.setValue('Test Responsibility')
      await addButton.trigger('click')

      expect(wrapper.text()).toContain('Test Responsibility')

      const removeButton = wrapper.find('[data-testid="remove-responsibility-0"]')
      await removeButton.trigger('click')

      expect(wrapper.text()).not.toContain('Test Responsibility')
    })

    it('emits team-create event when form is submitted', async () => {
      await wrapper.find('[data-testid="team-name-input"]').setValue('New Team')
      await wrapper.find('[data-testid="team-role-input"]').setValue('New Role')

      const saveButton = wrapper.find('[data-testid="save-team-btn"]')
      await saveButton.trigger('click')

      expect(wrapper.emitted('team-create')).toBeTruthy()
      expect(wrapper.emitted('team-create')[0][0]).toEqual({
        name: 'New Team',
        role: 'New Role',
        members: [],
        responsibilities: []
      })
    })

    it('closes modal when cancel button is clicked', async () => {
      const cancelButton = wrapper.find('[data-testid="cancel-team-btn"]')
      await cancelButton.trigger('click')

      expect(wrapper.find('[data-testid="team-modal"]').exists()).toBe(false)
    })
  })

  describe('Helper Functions', () => {
    it('generates correct initials for member names', () => {
      // Test the getInitials function through the component
      const firstCard = wrapper.find('[data-testid="team-card-team-1"]')
      const avatars = firstCard.findAll('.team-card__member-avatar')
      
      // John Doe -> JD
      expect(avatars[0].text()).toBe('JD')
      // Jane Smith -> JS
      expect(avatars[1].text()).toBe('JS')
      // Bob Johnson -> BJ
      expect(avatars[2].text()).toBe('BJ')
    })

    it('handles single name correctly', async () => {
      // Add a member with single name through the form
      const addButton = wrapper.find('[data-testid="add-team-btn"]')
      await addButton.trigger('click')

      const memberInput = wrapper.find('[data-testid="team-member-input"]')
      const addMemberButton = wrapper.find('[data-testid="add-member-btn"]')

      await memberInput.setValue('Madonna')
      await addMemberButton.trigger('click')

      const avatar = wrapper.find('.teams-list__member-avatar')
      expect(avatar.text()).toBe('M')
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no teams exist', async () => {
      wrapper = mount(TeamsList, {
        props: {
          items: [],
          readonly: false
        }
      })

      expect(wrapper.find('[data-testid="teams-empty"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('No teams yet')
    })

    it('shows empty add button in empty state', async () => {
      wrapper = mount(TeamsList, {
        props: {
          items: [],
          readonly: false
        }
      })

      expect(wrapper.find('[data-testid="empty-add-team-btn"]').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(wrapper.find('[data-testid="teams-list"]').attributes('aria-label')).toBe('Teams list')
      expect(wrapper.find('[data-testid="teams-search"]').attributes('aria-label')).toBe('Search teams')
    })

    it('has proper role attributes', () => {
      expect(wrapper.find('[data-testid="teams-list"]').attributes('role')).toBe('region')
      
      const teamCards = wrapper.findAll('[data-testid^="team-card-"]')
      teamCards.forEach(card => {
        expect(card.attributes('role')).toBe('button')
        expect(card.attributes('tabindex')).toBe('0')
      })
    })

    it('has proper aria-pressed attributes for selected teams', async () => {
      wrapper = mount(TeamsList, {
        props: {
          items: mockTeams,
          selectedTeam: 'team-1',
          readonly: false
        }
      })

      const selectedCard = wrapper.find('[data-testid="team-card-team-1"]')
      const unselectedCard = wrapper.find('[data-testid="team-card-team-2"]')
      
      expect(selectedCard.attributes('aria-pressed')).toBe('true')
      expect(unselectedCard.attributes('aria-pressed')).toBe('false')
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      expect(wrapper.find('.teams-list__grid').exists()).toBe(true)
      expect(wrapper.find('.teams-list__controls').exists()).toBe(true)
    })
  })
})