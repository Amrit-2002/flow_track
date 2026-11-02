import { apiClient } from './api';
import {
  TaskDTO,
  CreateTaskInput,
  UpdateTaskInput,
  PaginatedResponse,
  ApiResponse,
} from '@flowtrack/shared';

export interface TaskListParams {
  page?: number;
  limit?: number;
  client?: string;
  devStatus?: string;
  priority?: string;
  search?: string;
}

export const taskService = {
  async getTasks(params?: TaskListParams): Promise<PaginatedResponse<TaskDTO>> {
    const response = await apiClient.get<PaginatedResponse<TaskDTO>>('/tasks', {
      params,
    });
    return response.data;
  },

  async getTaskById(id: string): Promise<TaskDTO> {
    const response = await apiClient.get<ApiResponse<TaskDTO>>(`/tasks/${id}`);
    if (!response.data.data) {
      throw new Error('Task not found');
    }
    return response.data.data;
  },

  async createTask(data: CreateTaskInput): Promise<TaskDTO> {
    const response = await apiClient.post<ApiResponse<TaskDTO>>('/tasks', data);
    if (!response.data.data) {
      throw new Error('Failed to create task');
    }
    return response.data.data;
  },

  async updateTask(id: string, data: UpdateTaskInput): Promise<TaskDTO> {
    const response = await apiClient.patch<ApiResponse<TaskDTO>>(`/tasks/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update task');
    }
    return response.data.data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};

