/**
 * Teams API Service
 * Handles all team-related API operations for the requirements workspace
 */

import axios, { AxiosResponse } from 'axios';
import type { AxiosError } from 'axios'
import type { TeamInfo } from '../types/requirements'
import { apiConfig, getVersionedPath } from '../config/api';

export interface CreateTeamRequest {
  name: string
  role: string
  members?: string[]
  responsibilities?: string[]
  project_id: string
}

export interface UpdateTeamRequest {
  name?: string
  role?: string
  members?: string[]
  responsibilities?: string[]
}

export interface TeamAssignmentRequest {
  team_id: string
  requirement_id: string
  assignment_type?: 'primary' | 'secondary' | 'reviewer'
}

export interface TeamAssignment {
  id: string
  team_id: string
  requirement_id: string
  assignment_type: 'primary' | 'secondary' | 'reviewer'
  assigned_at: string
  assigned_by: string
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});


export class TeamsApiService {
  /**
   * Get all teams for a project
   */
  static async listTeams(projectId: string): Promise<TeamInfo[]> {
    try {
      const response = await apiClient.get<TeamInfo[]>(
        getVersionedPath(`projects/${projectId}/teams`)
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Get a specific team by ID
   */
  static async getTeam(projectId: string, teamId: string): Promise<TeamInfo> {
    try {
      const response = await apiClient.get<TeamInfo>(
        getVersionedPath(`projects/${projectId}/teams/${teamId}`)
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Create a new team
   */
  static async createTeam(projectId: string, teamData: Omit<CreateTeamRequest, 'project_id'>): Promise<TeamInfo> {
    try {
      const requestData: CreateTeamRequest = {
        ...teamData,
        project_id: projectId
      }

      const response = await apiClient.post<TeamInfo>(
        getVersionedPath(`projects/${projectId}/teams`),
        requestData
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Update an existing team
   */
  static async updateTeam(projectId: string, teamId: string, teamData: UpdateTeamRequest): Promise<TeamInfo> {
    try {
      const response = await apiClient.put<TeamInfo>(
        getVersionedPath(`projects/${projectId}/teams/${teamId}`),
        teamData
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Delete a team
   */
  static async deleteTeam(projectId: string, teamId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`projects/${projectId}/teams/${teamId}`)
      )
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Assign a team to a requirement
   */
  static async assignTeamToRequirement(
    projectId: string, 
    assignmentData: TeamAssignmentRequest
  ): Promise<TeamAssignment> {
    try {
      const response = await apiClient.post<TeamAssignment>(
        getVersionedPath(`projects/${projectId}/teams/assign`),
        assignmentData
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Remove team assignment from a requirement
   */
  static async removeTeamAssignment(projectId: string, assignmentId: string): Promise<void> {
    try {
      await apiClient.delete(
        getVersionedPath(`projects/${projectId}/teams/assignments/${assignmentId}`)
      )
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Get team assignments for a project
   */
  static async getTeamAssignments(projectId: string): Promise<TeamAssignment[]> {
    try {
      const response = await apiClient.get<TeamAssignment[]>(
        getVersionedPath(`projects/${projectId}/teams/assignments`)
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Get team assignments for a specific requirement
   */
  static async getRequirementAssignments(projectId: string, requirementId: string): Promise<TeamAssignment[]> {
    try {
      const response = await apiClient.get<TeamAssignment[]>(
        getVersionedPath(`projects/${projectId}/requirements/${requirementId}/assignments`)
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Search teams by name, role, or member
   */
  static async searchTeams(projectId: string, query: string): Promise<TeamInfo[]> {
    try {
      const response = await apiClient.get<TeamInfo[]>(
        getVersionedPath(`projects/${projectId}/teams/search`),
        {
          params: { q: query }
        }
      )
      return response.data
    } catch (error) {
      throw this.handleApiError(error as AxiosError)
    }
  }

  /**
   * Handle API errors and convert them to a consistent format
   */
  private static handleApiError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data as any

      switch (status) {
        case 400:
          return new Error(`Invalid request: ${data?.message || 'Bad request'}`)
        case 401:
          return new Error('Authentication required')
        case 403:
          return new Error('Access denied')
        case 404:
          return new Error('Team not found')
        case 409:
          return new Error(`Conflict: ${data?.message || 'Team already exists'}`)
        case 422:
          return new Error(`Validation error: ${data?.message || 'Invalid data'}`)
        case 500:
          return new Error('Server error occurred')
        default:
          return new Error(`API error: ${data?.message || 'Unknown error'}`)
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error: Unable to connect to server')
    } else {
      // Other error
      return new Error(`Request error: ${error.message}`)
    }
  }
}