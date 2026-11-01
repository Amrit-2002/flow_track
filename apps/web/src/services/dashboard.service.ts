import { apiClient } from './api';
import { DashboardStatsDTO, ApiResponse } from '@flowtrack/shared';

export const dashboardService = {
  async getStats(projectId?: string): Promise<DashboardStatsDTO> {
    const response = await apiClient.get<ApiResponse<DashboardStatsDTO>>('/dashboard/stats', {
      params: projectId ? { projectId } : undefined,
    });
    if (!response.data.data) {
      throw new Error('Failed to load dashboard statistics');
    }
    return response.data.data;
  },
};
