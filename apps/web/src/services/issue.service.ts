import { apiClient } from './api';
import {
  IssueDTO,
  CreateIssueInput,
  UpdateIssueInput,
  PaginatedResponse,
  ApiResponse,
  IssuePriority,
  IssueType,
} from '@flowtrack/shared';

export interface IssueListParams {
  page?: number;
  limit?: number;
  projectId?: string;
  statusId?: string;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId?: string;
  parentId?: string | null;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export const issueService = {
  async getIssues(params?: IssueListParams): Promise<PaginatedResponse<IssueDTO>> {
    const response = await apiClient.get<PaginatedResponse<IssueDTO>>('/issues', {
      params,
    });
    return response.data;
  },

  async getIssueById(id: string): Promise<IssueDTO> {
    const response = await apiClient.get<ApiResponse<IssueDTO>>(`/issues/${id}`);
    if (!response.data.data) {
      throw new Error('Issue not found');
    }
    return response.data.data;
  },

  async createIssue(data: CreateIssueInput): Promise<IssueDTO> {
    const response = await apiClient.post<ApiResponse<IssueDTO>>('/issues', data);
    if (!response.data.data) {
      throw new Error('Failed to create issue');
    }
    return response.data.data;
  },

  async updateIssue(id: string, data: UpdateIssueInput): Promise<IssueDTO> {
    const response = await apiClient.patch<ApiResponse<IssueDTO>>(`/issues/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update issue');
    }
    return response.data.data;
  },

  async transitionIssue(id: string, statusId: string): Promise<IssueDTO> {
    const response = await apiClient.patch<ApiResponse<IssueDTO>>(`/issues/${id}/status`, {
      statusId,
    });
    if (!response.data.data) {
      throw new Error('Failed to transition issue status');
    }
    return response.data.data;
  },

  async deleteIssue(id: string): Promise<void> {
    await apiClient.delete(`/issues/${id}`);
  },
};
