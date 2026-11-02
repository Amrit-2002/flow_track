import api from './api';
import { NotificationDTO, NotificationsListResponseDTO } from '@flowtrack/shared';

export const notificationService = {
  /**
   * Fetch current user's notifications and unread count
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
  }): Promise<NotificationsListResponseDTO> {
    const response = await api.get<{
      success: boolean;
      data: NotificationsListResponseDTO;
    }>('/notifications', { params });
    return response.data.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<NotificationDTO> {
    const response = await api.patch<{
      success: boolean;
      data: NotificationDTO;
    }>(`/notifications/${id}/read`);
    return response.data.data;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const response = await api.post<{
      success: boolean;
      data: { count: number };
    }>('/notifications/read-all');
    return response.data.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};

