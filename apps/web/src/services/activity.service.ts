import api from './api';
import { ActivityDTO } from '@flowtrack/shared';

export const activityService = {
  /**
   * Get chronological activity timeline for an issue
   */
  async getIssueActivities(issueId: string): Promise<ActivityDTO[]> {
    const response = await api.get<{ success: boolean; data: ActivityDTO[] }>(
      `/issues/${issueId}/activities`
    );
    return response.data.data;
  },

  /**
   * Get recent project-level activity stream
   */
  async getProjectActivities(projectId: string): Promise<ActivityDTO[]> {
    const response = await api.get<{ success: boolean; data: ActivityDTO[] }>(
      `/projects/${projectId}/activities`
    );
    return response.data.data;
  },
};
