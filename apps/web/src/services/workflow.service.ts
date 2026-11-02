import { apiClient } from './api';
import { StatusDTO, WorkflowTransitionDTO, ApiResponse } from '@flowtrack/shared';

export const workflowService = {
  async getStatuses(): Promise<StatusDTO[]> {
    const response = await apiClient.get<ApiResponse<StatusDTO[]>>('/workflows/statuses');
    return response.data.data || [];
  },

  async getTransitions(): Promise<WorkflowTransitionDTO[]> {
    const response = await apiClient.get<ApiResponse<WorkflowTransitionDTO[]>>('/workflows/transitions');
    return response.data.data || [];
  },

  async validateTransition(fromStatusId: string, toStatusId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<ApiResponse<{ allowed: boolean }>>('/workflows/validate', {
        fromStatusId,
        toStatusId,
      });
      return !!response.data.data?.allowed;
    } catch {
      return false;
    }
  },
};

