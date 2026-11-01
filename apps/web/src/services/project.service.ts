import { apiClient } from './api';
import {
  ProjectDTO,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  PaginatedResponse,
  ApiResponse,
  ProjectMemberDTO,
} from '@flowtrack/shared';

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  isArchived?: boolean;
}

export const projectService = {
  async getProjects(params?: ProjectListParams): Promise<PaginatedResponse<ProjectDTO>> {
    const response = await apiClient.get<PaginatedResponse<ProjectDTO>>('/projects', {
      params,
    });
    return response.data;
  },

  async getProjectById(id: string): Promise<ProjectDTO> {
    const response = await apiClient.get<ApiResponse<ProjectDTO>>(`/projects/${id}`);
    if (!response.data.data) {
      throw new Error('Project not found');
    }
    return response.data.data;
  },

  async createProject(data: CreateProjectInput): Promise<ProjectDTO> {
    const response = await apiClient.post<ApiResponse<ProjectDTO>>('/projects', data);
    if (!response.data.data) {
      throw new Error('Failed to create project');
    }
    return response.data.data;
  },

  async updateProject(id: string, data: UpdateProjectInput): Promise<ProjectDTO> {
    const response = await apiClient.patch<ApiResponse<ProjectDTO>>(`/projects/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update project');
    }
    return response.data.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async addMember(projectId: string, data: AddProjectMemberInput): Promise<ProjectMemberDTO> {
    const response = await apiClient.post<ApiResponse<ProjectMemberDTO>>(
      `/projects/${projectId}/members`,
      data
    );
    if (!response.data.data) {
      throw new Error('Failed to add project member');
    }
    return response.data.data;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  },
};
