import { apiClient } from './api';
import { StatusDTO, ApiResponse } from '@flowtrack/shared';

export const statusService = {
  async getStatuses(): Promise<StatusDTO[]> {
    const response = await apiClient.get<ApiResponse<StatusDTO[]>>('/statuses');
    return response.data.data || [];
  },
};

