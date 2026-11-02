import { apiClient } from './api';
import {
  ClientDTO,
  CreateClientInput,
  UpdateClientInput,
  ApiResponse,
} from '@flowtrack/shared';

export const clientService = {
  async getClients(): Promise<ClientDTO[]> {
    const response = await apiClient.get<ApiResponse<ClientDTO[]>>('/clients');
    return response.data.data || [];
  },

  async createClient(data: CreateClientInput): Promise<ClientDTO> {
    const response = await apiClient.post<ApiResponse<ClientDTO>>('/clients', data);
    if (!response.data.data) {
      throw new Error('Failed to create client');
    }
    return response.data.data;
  },

  async updateClient(id: string, data: UpdateClientInput): Promise<ClientDTO> {
    const response = await apiClient.patch<ApiResponse<ClientDTO>>(`/clients/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update client');
    }
    return response.data.data;
  },

  async deleteClient(id: string): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },
};
