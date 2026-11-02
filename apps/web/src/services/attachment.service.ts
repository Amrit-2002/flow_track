import { apiClient } from './api';
import { AttachmentDTO, ApiResponse } from '@flowtrack/shared';

export const attachmentService = {
  async uploadAttachment(issueId: string, file: File): Promise<AttachmentDTO> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiResponse<AttachmentDTO>>(
      `/issues/${issueId}/attachments`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    if (!response.data.data) {
      throw new Error('Failed to upload attachment');
    }

    return response.data.data;
  },

  async deleteAttachment(id: string): Promise<void> {
    await apiClient.delete(`/attachments/${id}`);
  },

  getDownloadUrl(id: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/attachments/${id}/download`;
  },
};

