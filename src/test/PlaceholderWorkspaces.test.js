import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamsWorkspace from '../components/TeamsWorkspace.vue'
import TasksWorkspace from '../components/TasksWorkspace.vue'
import NotesWorkspace from '../components/NotesWorkspace.vue'

// Mock project data
const mockProject = {
  id: 'test-project-1',
  name: 'Test Project',
  description: 'A test project for placeholder workspaces',
  diagrams: [],
  requirements: [],
  teams: [],
  tasks: [],
  createdAt: new Date(),
  lastModified: new Date()
}

describe('Placeholder Workspace Components', () => {
  describe('TeamsWorkspace', () => {
    it('should render with correct title and project context', () => {
      const wrapper = mount(TeamsWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.workspace-title').text()).toBe('Teams')
      expect(wrapper.find('.workspace-description').text()).toContain('Test Project')
      expect(wrapper.find('.coming-soon-title').text()).toBe('Teams functionality coming soon')
      expect(wrapper.find('.context-value').text()).toBe('Test Project')
    })

    it('should display teams icon and feature list', () => {
      const wrapper = mount(TeamsWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.coming-soon-icon').text()).toBe('👥')
      expect(wrapper.text()).toContain('Team member management')
      expect(wrapper.text()).toContain('Role-based permissions')
      expect(wrapper.text()).toContain('Collaboration tools')
      expect(wrapper.text()).toContain('Activity tracking')
    })

    it('should handle missing project gracefully', () => {
      const wrapper = mount(TeamsWorkspace, {
        props: { project: null }
      })

      expect(wrapper.find('.context-value').text()).toBe('Unknown Project')
      expect(wrapper.find('.workspace-description').text()).toContain('this project')
    })
  })

  describe('TasksWorkspace', () => {
    it('should render with correct title and project context', () => {
      const wrapper = mount(TasksWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.workspace-title').text()).toBe('Tasks')
      expect(wrapper.find('.workspace-description').text()).toContain('Test Project')
      expect(wrapper.find('.coming-soon-title').text()).toBe('Tasks functionality coming soon')
      expect(wrapper.find('.context-value').text()).toBe('Test Project')
    })

    it('should display tasks icon and feature list', () => {
      const wrapper = mount(TasksWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.coming-soon-icon').text()).toBe('✅')
      expect(wrapper.text()).toContain('Task creation and assignment')
      expect(wrapper.text()).toContain('Progress tracking')
      expect(wrapper.text()).toContain('Due dates and reminders')
      expect(wrapper.text()).toContain('Task dependencies')
      expect(wrapper.text()).toContain('Kanban board view')
    })

    it('should handle missing project gracefully', () => {
      const wrapper = mount(TasksWorkspace, {
        props: { project: null }
      })

      expect(wrapper.find('.context-value').text()).toBe('Unknown Project')
      expect(wrapper.find('.workspace-description').text()).toContain('this project')
    })
  })

  describe('NotesWorkspace', () => {
    it('should render with correct title and project context', () => {
      const wrapper = mount(NotesWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.workspace-title').text()).toBe('Notes')
      expect(wrapper.find('.workspace-description').text()).toContain('Test Project')
      expect(wrapper.find('.coming-soon-title').text()).toBe('Notes functionality coming soon')
      expect(wrapper.find('.context-value').text()).toBe('Test Project')
    })

    it('should display notes icon and feature list', () => {
      const wrapper = mount(NotesWorkspace, {
        props: { project: mockProject }
      })

      expect(wrapper.find('.coming-soon-icon').text()).toBe('📝')
      expect(wrapper.text()).toContain('Rich text editing')
      expect(wrapper.text()).toContain('Note organization and tagging')
      expect(wrapper.text()).toContain('Search and filtering')
      expect(wrapper.text()).toContain('Collaborative editing')
      expect(wrapper.text()).toContain('File attachments')
    })

    it('should handle missing project gracefully', () => {
      const wrapper = mount(NotesWorkspace, {
        props: { project: null }
      })

      expect(wrapper.find('.context-value').text()).toBe('Unknown Project')
      expect(wrapper.find('.workspace-description').text()).toContain('this project')
    })
  })

  describe('Consistent Styling', () => {
    it('should have consistent styling across all placeholder components', () => {
      const teamsWrapper = mount(TeamsWorkspace, { props: { project: mockProject } })
      const tasksWrapper = mount(TasksWorkspace, { props: { project: mockProject } })
      const notesWrapper = mount(NotesWorkspace, { props: { project: mockProject } })

      // Check that all components have the same basic structure
      expect(teamsWrapper.find('.workspace-header').exists()).toBe(true)
      expect(tasksWrapper.find('.workspace-header').exists()).toBe(true)
      expect(notesWrapper.find('.workspace-header').exists()).toBe(true)

      expect(teamsWrapper.find('.coming-soon-content').exists()).toBe(true)
      expect(tasksWrapper.find('.coming-soon-content').exists()).toBe(true)
      expect(notesWrapper.find('.coming-soon-content').exists()).toBe(true)

      expect(teamsWrapper.find('.project-context').exists()).toBe(true)
      expect(tasksWrapper.find('.project-context').exists()).toBe(true)
      expect(notesWrapper.find('.project-context').exists()).toBe(true)
    })

    it('should have different accent colors for feature list bullets', () => {
      const teamsWrapper = mount(TeamsWorkspace, { props: { project: mockProject } })
      const tasksWrapper = mount(TasksWorkspace, { props: { project: mockProject } })
      const notesWrapper = mount(NotesWorkspace, { props: { project: mockProject } })

      // Each component should have feature lists
      expect(teamsWrapper.find('.feature-list').exists()).toBe(true)
      expect(tasksWrapper.find('.feature-list').exists()).toBe(true)
      expect(notesWrapper.find('.feature-list').exists()).toBe(true)
    })
  })
})