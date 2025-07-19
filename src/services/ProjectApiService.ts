// src/services/ProjectApiService.ts

import axios from 'axios';
import { Project, Diagram, Requirement, Task, Team } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export class ProjectApiService {
  public static async listProjects(): Promise<Project[]> {
    const response = await axios.get<Project[]>(`${API_BASE_URL}/projects/list`);
    return response.data;
  }

  public static async createProject(id: string, name: string, description?: string): Promise<Project> {
    const response = await axios.post<Project>(`${API_BASE_URL}/projects/create`, { id, name, description });
    return response.data;
  }

  public static async getProjectOutline(projectId: number): Promise<Project> {
    const response = await axios.get<Project>(`${API_BASE_URL}/projects/${projectId}/outline`);
    return response.data;
  }

  public static async addDiagram(projectId: number, title: string, mermaid_code: string, type: string): Promise<Diagram> {
    const response = await axios.post<Diagram>(`${API_BASE_URL}/projects/${projectId}/diagrams/add`, {
      title,
      mermaid_code,
      type,
    });
    return response.data;
  }

  public static async listDiagrams(projectId: number): Promise<Diagram[]> {
    const response = await axios.get<Diagram[]>(`${API_BASE_URL}/projects/${projectId}/diagrams/list`);
    return response.data;
  }

  public static async deleteDiagram(projectId: number, diagramId: number): Promise<any> {
    const response = await axios.delete(`${API_BASE_URL}/projects/${projectId}/diagrams/${diagramId}/delete`);
    return response.data;
  }

  public static async addRequirement(projectId: number, description: string, category: 'Functional' | 'Non-Functional'): Promise<Requirement> {
    const response = await axios.post<Requirement>(`${API_BASE_URL}/projects/${projectId}/requirements/add`, {
      description,
      category,
    });
    return response.data;
  }

  public static async assignTeam(projectId: number, name: string, members?: string): Promise<Team> {
    const response = await axios.post<Team>(`${API_BASE_URL}/projects/${projectId}/teams/assign`, {
      name,
      members,
    });
    return response.data;
  }

  public static async createTask(projectId: number, description: string, assigned_to_team_id?: number): Promise<Task> {
    const response = await axios.post<Task>(`${API_BASE_URL}/projects/${projectId}/tasks/create`, {
      description,
      assigned_to_team_id,
    });
    return response.data;
  }
}
