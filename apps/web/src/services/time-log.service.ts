import api from './api';
import { CreateTimeLogInput, TimeLogDTO, TimeLogsResponseDTO } from '@flowtrack/shared';

export const timeLogService = {
  /**
   * Get all logged work entries and total minutes for an issue
   */
  async getTimeLogs(issueId: string): Promise<TimeLogsResponseDTO> {
    const response = await api.get<{ success: boolean; data: TimeLogsResponseDTO }>(
      `/issues/${issueId}/time-logs`
    );
    return response.data.data;
  },

  /**
   * Log time spent on an issue
   */
  async logTime(issueId: string, input: CreateTimeLogInput): Promise<TimeLogDTO> {
    const response = await api.post<{ success: boolean; data: TimeLogDTO }>(
      `/issues/${issueId}/time-logs`,
      input
    );
    return response.data.data;
  },

  /**
   * Delete a work log entry
   */
  async deleteTimeLog(id: string): Promise<void> {
    await api.delete(`/time-logs/${id}`);
  },
};
