import { apiClient } from './api';
import { CommentDTO, ApiResponse } from '@flowtrack/shared';

export const commentService = {
  async getComments(issueId: string): Promise<CommentDTO[]> {
    const response = await apiClient.get<ApiResponse<CommentDTO[]>>(`/issues/${issueId}/comments`);
    return response.data.data || [];
  },

  async createComment(issueId: string, content: string, files?: File[]): Promise<CommentDTO> {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.post<ApiResponse<CommentDTO>>(
        `/issues/${issueId}/comments`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      if (!response.data.data) {
        throw new Error('Failed to create comment with attachments');
      }
      return response.data.data;
    }

    const response = await apiClient.post<ApiResponse<CommentDTO>>(`/issues/${issueId}/comments`, {
      content,
    });
    if (!response.data.data) {
      throw new Error('Failed to create comment');
    }
    return response.data.data;
  },

  async updateComment(id: string, content: string): Promise<CommentDTO> {
    const response = await apiClient.patch<ApiResponse<CommentDTO>>(`/comments/${id}`, {
      content,
    });
    if (!response.data.data) {
      throw new Error('Failed to update comment');
    }
    return response.data.data;
  },

  async deleteComment(id: string): Promise<void> {
    await apiClient.delete(`/comments/${id}`);
  },
};

