import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SystemsList from '../../components/SystemsList.vue'
import type { SystemInfo } from '../../types/requirements'

// Mock data
const mockSystems: SystemInfo[] = [
  {
    id: 'system-1',
    name: 'User Management System',
    description: 'Handles user authentication and authorization',
    type: 'internal',
    dependencies: ['Database', 'Auth Service']
  },
  {
    id: 'system-2',
    name: 'Payment Gateway',
    description: 'External payment processing system',
    type: 'external',
    dependencies: ['Stripe API']
  },
  {
    id: 'system-3',
    name: 'Data Sync Service',
    description: 'Synchronizes data between systems',
    type: 'integration',
    dependencies: ['System A', 'System B']
  }
]

describe('SystemsList.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(SystemsList, {
      props: {
        items: mockSystems,
        selectedSystem: null,
        searchQuery: '',
        filter: 'all',
        readonly: false
      }
    })
  })

  describe('Component Rendering', () => {
    it('renders the systems list container', () => {
      expect(wrapper.find('[data-testid="systems-list"]').exists()).toBe(true)
    })

    it('displays the correct number of systems', () => {
      const systemCards = wrapper.findAll('[data-testid^="system-card-"]')
      expect(systemCards).toHaveLength(3)
    })

    it('shows the systems summary', () => {
      const summary = wrapper.find('[data-testid="systems-summary"]')
      expect(summary.text()).toContain('Showing 3 of 3 systems')
    })

    it('renders system cards with correct information', () => {
      const firstCard = wrapper.find('[data-testid="system-card-system-1"]')
      expect(firstCard.text()).toContain('User Management System')
      expect(firstCard.text()).toContain('Handles user authentication and authorization')
      expect(firstCard.text()).toContain('internal')
      expect(firstCard.text()).toContain('Database')
      expect(firstCard.text()).toContain('Auth Service')
    })
  })

  describe('Search Functionality', () => {
    it('filters systems by search query', async () => {
      const searchInput = wrapper.find('[data-testid="systems-search"]')
      await searchInput.setValue('Payment')

      // Should emit search-change event
      expect(wrapper.emitted('search-change')).toBeTruthy()
      expect(wrapper.emitted('search-change')[0]).toEqual(['Payment'])
    })

    it('shows empty state when no systems match search', async () => {
      wrapper = mount(SystemsList, {
        props: {
          items: mockSystems,
          searchQuery: 'nonexistent',
          readonly: false
        }
      })

      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="systems-empty"]').exists()).toBe(true)
    })
  })

  describe('Filter Functionality', () => {
    it('filters systems by type', async () => {
      const filterSelect = wrapper.find('[data-testid="systems-filter"]')
      await filterSelect.setValue('external')

      expect(wrapper.emitted('filter-change')).toBeTruthy()
      expect(wrapper.emitted('filter-change')[0]).toEqual(['external'])
    })

    it('shows all filter options', () => {
      const filterSelect = wrapper.find('[data-testid="systems-filter"]')
      const options = filterSelect.findAll('option')
      
      expect(options).toHaveLength(4)
      expect(options[0].text()).toBe('All Systems')
      expect(options[1].text()).toBe('Internal')
      expect(options[2].text()).toBe('External')
      expect(options[3].text()).toBe('Integration')
    })
  })

  describe('System Selection', () => {
    it('emits system-select event when system is clicked', async () => {
      const systemCard = wrapper.find('[data-testid="system-card-system-1"]')
      await systemCard.trigger('click')

      expect(wrapper.emitted('system-select')).toBeTruthy()
      expect(wrapper.emitted('system-select')[0]).toEqual(['system-1'])
    })

    it('handles keyboard navigation for system selection', async () => {
      const systemCard = wrapper.find('[data-testid="system-card-system-1"]')
      
      // Test Enter key
      await systemCard.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('system-select')).toBeTruthy()
      
      // Test Space key
      await systemCard.trigger('keydown', { key: ' ' })
      expect(wrapper.emitted('system-select')).toHaveLength(2)
    })

    it('shows selected system with correct styling', async () => {
      wrapper = mount(SystemsList, {
        props: {
          items: mockSystems,
          selectedSystem: 'system-1',
          readonly: false
        }
      })

      const selectedCard = wrapper.find('[data-testid="system-card-system-1"]')
      expect(selectedCard.classes()).toContain('system-card--selected')
    })
  })

  describe('System Management', () => {
    it('shows add system button when not readonly', () => {
      expect(wrapper.find('[data-testid="add-system-btn"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="add-system-btn"]').attributes('disabled')).toBeUndefined()
    })

    it('disables add system button when readonly', async () => {
      await wrapper.setProps({ readonly: true })
      expect(wrapper.find('[data-testid="add-system-btn"]').attributes('disabled')).toBeDefined()
    })

    it('opens system modal when add button is clicked', async () => {
      const addButton = wrapper.find('[data-testid="add-system-btn"]')
      await addButton.trigger('click')

      expect(wrapper.find('[data-testid="system-modal"]').exists()).toBe(true)
    })

    it('shows edit and delete buttons for each system', () => {
      const editButton = wrapper.find('[data-testid="edit-system-system-1"]')
      const deleteButton = wrapper.find('[data-testid="delete-system-system-1"]')
      
      expect(editButton.exists()).toBe(true)
      expect(deleteButton.exists()).toBe(true)
    })

    it('disables edit and delete buttons when readonly', async () => {
      await wrapper.setProps({ readonly: true })
      
      const editButton = wrapper.find('[data-testid="edit-system-system-1"]')
      const deleteButton = wrapper.find('[data-testid="delete-system-system-1"]')
      
      expect(editButton.attributes('disabled')).toBeDefined()
      expect(deleteButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('System Form', () => {
    beforeEach(async () => {
      const addButton = wrapper.find('[data-testid="add-system-btn"]')
      await addButton.trigger('click')
    })

    it('shows system form in modal', () => {
      expect(wrapper.find('[data-testid="system-name-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="system-description-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="system-type-select"]').exists()).toBe(true)
    })

    it('validates required fields', async () => {
      const saveButton = wrapper.find('[data-testid="save-system-btn"]')
      expect(saveButton.attributes('disabled')).toBeDefined()

      // Fill in required fields
      await wrapper.find('[data-testid="system-name-input"]').setValue('Test System')
      await wrapper.find('[data-testid="system-description-input"]').setValue('Test Description')
      
      await wrapper.vm.$nextTick()
      expect(saveButton.attributes('disabled')).toBeUndefined()
    })

    it('allows adding and removing dependencies', async () => {
      const dependencyInput = wrapper.find('[data-testid="system-dependency-input"]')
      const addButton = wrapper.find('[data-testid="add-dependency-btn"]')

      await dependencyInput.setValue('Test Dependency')
      await addButton.trigger('click')

      expect(wrapper.text()).toContain('Test Dependency')

      const removeButton = wrapper.find('[data-testid="remove-dependency-0"]')
      await removeButton.trigger('click')

      expect(wrapper.text()).not.toContain('Test Dependency')
    })

    it('emits system-create event when form is submitted', async () => {
      await wrapper.find('[data-testid="system-name-input"]').setValue('New System')
      await wrapper.find('[data-testid="system-description-input"]').setValue('New Description')
      await wrapper.find('[data-testid="system-type-select"]').setValue('internal')

      const saveButton = wrapper.find('[data-testid="save-system-btn"]')
      await saveButton.trigger('click')

      expect(wrapper.emitted('system-create')).toBeTruthy()
      expect(wrapper.emitted('system-create')[0][0]).toEqual({
        name: 'New System',
        description: 'New Description',
        type: 'internal',
        dependencies: []
      })
    })

    it('closes modal when cancel button is clicked', async () => {
      const cancelButton = wrapper.find('[data-testid="cancel-system-btn"]')
      await cancelButton.trigger('click')

      expect(wrapper.find('[data-testid="system-modal"]').exists()).toBe(false)
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no systems exist', async () => {
      wrapper = mount(SystemsList, {
        props: {
          items: [],
          readonly: false
        }
      })

      expect(wrapper.find('[data-testid="systems-empty"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('No systems yet')
    })

    it('shows empty add button in empty state', async () => {
      wrapper = mount(SystemsList, {
        props: {
          items: [],
          readonly: false
        }
      })

      expect(wrapper.find('[data-testid="empty-add-system-btn"]').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(wrapper.find('[data-testid="systems-list"]').attributes('aria-label')).toBe('Systems list')
      expect(wrapper.find('[data-testid="systems-search"]').attributes('aria-label')).toBe('Search systems')
      expect(wrapper.find('[data-testid="systems-filter"]').attributes('aria-label')).toBe('Filter systems by type')
    })

    it('has proper role attributes', () => {
      expect(wrapper.find('[data-testid="systems-list"]').attributes('role')).toBe('region')
      
      const systemCards = wrapper.findAll('[data-testid^="system-card-"]')
      systemCards.forEach(card => {
        expect(card.attributes('role')).toBe('button')
        expect(card.attributes('tabindex')).toBe('0')
      })
    })

    it('has proper aria-pressed attributes for selected systems', async () => {
      wrapper = mount(SystemsList, {
        props: {
          items: mockSystems,
          selectedSystem: 'system-1',
          readonly: false
        }
      })

      const selectedCard = wrapper.find('[data-testid="system-card-system-1"]')
      const unselectedCard = wrapper.find('[data-testid="system-card-system-2"]')
      
      expect(selectedCard.attributes('aria-pressed')).toBe('true')
      expect(unselectedCard.attributes('aria-pressed')).toBe('false')
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      expect(wrapper.find('.systems-list__grid').exists()).toBe(true)
      expect(wrapper.find('.systems-list__controls').exists()).toBe(true)
    })
  })
})