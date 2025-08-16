import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { TeamsApiService } from '../../services/TeamsApiService'
import type { TeamInfo } from '../../types/requirements'

// Mock the api config first
vi.mock('../../config/api', () => {
  const mockApiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
  
  return {
    apiClient: mockApiClient,
    getVersionedPath: (path: string) => `/api/v1/${path}`
  }
})

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('TeamsApiService', () => {
  const projectId = 'test-project-123'
  const teamId = 'team-456'
  
  // Get the mocked API client
  let mockApiClient: any
  
  beforeAll(async () => {
    const apiModule = await import('../../config/api')
    mockApiClient = apiModule.apiClient
  })

  const mockTeam: TeamInfo = {
    id: teamId,
    name: 'Frontend Team',
    role: 'Development',
    members: ['Alice Johnson', 'Bob Smith'],
    responsibilities: ['UI/UX Implementation', 'Client-side Logic']
  }

  const mockTeams: TeamInfo[] = [
    mockTeam,
    {
      id: 'team-789',
      name: 'Backend Team',
      role: 'Development',
      members: ['Charlie Brown', 'Diana Prince'],
      responsibilities: ['API Development', 'Database Design']
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('listTeams', () => {
    it('should fetch all teams for a project', async () => {
      const mockResponse: AxiosResponse<TeamInfo[]> = {
        data: mockTeams,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.listTeams(projectId)

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/teams`)
      expect(result).toEqual(mockTeams)
    })

    it('should handle API errors when fetching teams', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Server error occurred')
    })

    it('should handle network errors when fetching teams', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Network error: Unable to connect to server')
    })
  })

  describe('getTeam', () => {
    it('should fetch a specific team by ID', async () => {
      const mockResponse: AxiosResponse<TeamInfo> = {
        data: mockTeam,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.getTeam(projectId, teamId)

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/teams/${teamId}`)
      expect(result).toEqual(mockTeam)
    })

    it('should handle team not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Team not found' }
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.getTeam(projectId, teamId)).rejects.toThrow('Team not found')
    })
  })

  describe('createTeam', () => {
    it('should create a new team', async () => {
      const teamData = {
        name: 'QA Team',
        role: 'Quality Assurance',
        members: ['Eve Wilson'],
        responsibilities: ['Testing', 'Quality Control']
      }

      const createdTeam: TeamInfo = {
        id: 'team-new',
        ...teamData
      }

      const mockResponse: AxiosResponse<TeamInfo> = {
        data: createdTeam,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.createTeam(projectId, teamData)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/teams`,
        {
          ...teamData,
          project_id: projectId
        }
      )
      expect(result).toEqual(createdTeam)
    })

    it('should handle validation errors when creating team', async () => {
      const teamData = {
        name: '',
        role: 'Development',
        members: [],
        responsibilities: []
      }

      const mockError = {
        response: {
          status: 422,
          data: { message: 'Team name is required' }
        }
      }

      mockApiClient.post.mockRejectedValue(mockError)

      await expect(TeamsApiService.createTeam(projectId, teamData)).rejects.toThrow('Validation error: Team name is required')
    })

    it('should handle conflict errors when creating team', async () => {
      const teamData = {
        name: 'Frontend Team',
        role: 'Development',
        members: [],
        responsibilities: []
      }

      const mockError = {
        response: {
          status: 409,
          data: { message: 'Team with this name already exists' }
        }
      }

      mockApiClient.post.mockRejectedValue(mockError)

      await expect(TeamsApiService.createTeam(projectId, teamData)).rejects.toThrow('Conflict: Team with this name already exists')
    })
  })

  describe('updateTeam', () => {
    it('should update an existing team', async () => {
      const updateData = {
        name: 'Updated Frontend Team',
        members: ['Alice Johnson', 'Bob Smith', 'Carol White']
      }

      const updatedTeam: TeamInfo = {
        ...mockTeam,
        ...updateData
      }

      const mockResponse: AxiosResponse<TeamInfo> = {
        data: updatedTeam,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.put.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.updateTeam(projectId, teamId, updateData)

      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/teams/${teamId}`,
        updateData
      )
      expect(result).toEqual(updatedTeam)
    })

    it('should handle team not found error when updating', async () => {
      const updateData = { name: 'Updated Team' }

      const mockError = {
        response: {
          status: 404,
          data: { message: 'Team not found' }
        }
      }

      mockApiClient.put.mockRejectedValue(mockError)

      await expect(TeamsApiService.updateTeam(projectId, teamId, updateData)).rejects.toThrow('Team not found')
    })
  })

  describe('deleteTeam', () => {
    it('should delete a team', async () => {
      const mockResponse: AxiosResponse<void> = {
        data: undefined,
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: {} as any
      }

      mockApiClient.delete.mockResolvedValue(mockResponse)

      await TeamsApiService.deleteTeam(projectId, teamId)

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/teams/${teamId}`)
    })

    it('should handle team not found error when deleting', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Team not found' }
        }
      }

      mockApiClient.delete.mockRejectedValue(mockError)

      await expect(TeamsApiService.deleteTeam(projectId, teamId)).rejects.toThrow('Team not found')
    })
  })

  describe('assignTeamToRequirement', () => {
    it('should assign a team to a requirement', async () => {
      const assignmentData = {
        team_id: teamId,
        requirement_id: 'req-123',
        assignment_type: 'primary' as const
      }

      const mockAssignment = {
        id: 'assignment-456',
        ...assignmentData,
        assigned_at: '2024-01-01T00:00:00Z',
        assigned_by: 'user-123'
      }

      const mockResponse: AxiosResponse<any> = {
        data: mockAssignment,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.assignTeamToRequirement(projectId, assignmentData)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/teams/assign`,
        assignmentData
      )
      expect(result).toEqual(mockAssignment)
    })
  })

  describe('removeTeamAssignment', () => {
    it('should remove a team assignment', async () => {
      const assignmentId = 'assignment-456'

      const mockResponse: AxiosResponse<void> = {
        data: undefined,
        status: 204,
        statusText: 'No Content',
        headers: {},
        config: {} as any
      }

      mockApiClient.delete.mockResolvedValue(mockResponse)

      await TeamsApiService.removeTeamAssignment(projectId, assignmentId)

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/teams/assignments/${assignmentId}`
      )
    })
  })

  describe('getTeamAssignments', () => {
    it('should fetch all team assignments for a project', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          team_id: 'team-1',
          requirement_id: 'req-1',
          assignment_type: 'primary',
          assigned_at: '2024-01-01T00:00:00Z',
          assigned_by: 'user-123'
        }
      ]

      const mockResponse: AxiosResponse<any[]> = {
        data: mockAssignments,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.getTeamAssignments(projectId)

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/teams/assignments`)
      expect(result).toEqual(mockAssignments)
    })
  })

  describe('getRequirementAssignments', () => {
    it('should fetch team assignments for a specific requirement', async () => {
      const requirementId = 'req-123'
      const mockAssignments = [
        {
          id: 'assignment-1',
          team_id: 'team-1',
          requirement_id: requirementId,
          assignment_type: 'primary',
          assigned_at: '2024-01-01T00:00:00Z',
          assigned_by: 'user-123'
        }
      ]

      const mockResponse: AxiosResponse<any[]> = {
        data: mockAssignments,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.getRequirementAssignments(projectId, requirementId)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/requirements/${requirementId}/assignments`
      )
      expect(result).toEqual(mockAssignments)
    })
  })

  describe('searchTeams', () => {
    it('should search teams by query', async () => {
      const query = 'Frontend'
      const mockSearchResults = [mockTeam]

      const mockResponse: AxiosResponse<TeamInfo[]> = {
        data: mockSearchResults,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await TeamsApiService.searchTeams(projectId, query)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/teams/search`,
        { params: { q: query } }
      )
      expect(result).toEqual(mockSearchResults)
    })
  })

  describe('Error Handling', () => {
    it('should handle 400 Bad Request errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid request data' }
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Invalid request: Invalid request data')
    })

    it('should handle 401 Unauthorized errors', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {}
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Authentication required')
    })

    it('should handle 403 Forbidden errors', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {}
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Access denied')
    })

    it('should handle unknown status codes', async () => {
      const mockError = {
        response: {
          status: 418,
          data: { message: "I'm a teapot" }
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow("API error: I'm a teapot")
    })

    it('should handle errors without response data', async () => {
      const mockError = {
        response: {
          status: 500,
          data: null
        }
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Server error occurred')
    })

    it('should handle generic request errors', async () => {
      const mockError = {
        message: 'Request failed'
      }

      mockApiClient.get.mockRejectedValue(mockError)

      await expect(TeamsApiService.listTeams(projectId)).rejects.toThrow('Request error: Request failed')
    })
  })
})