import apiClient from './api';
import {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ThemePreference,
  UserDTO,
  ApiResponse,
} from '@flowtrack/shared';

export interface AuthResponseData {
  user: UserDTO;
  accessToken: string;
}

export const authService = {
  async register(data: RegisterInput): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', data);
    return response.data.data!;
  },

  async login(data: LoginInput): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', data);
    return response.data.data!;
  },

  async refresh(): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/refresh');
    return response.data.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getMe(): Promise<UserDTO> {
    const response = await apiClient.get<ApiResponse<UserDTO>>('/users/me');
    return response.data.data!;
  },

  async updateProfile(data: UpdateProfileInput): Promise<UserDTO> {
    const response = await apiClient.patch<ApiResponse<UserDTO>>('/users/me', data);
    return response.data.data!;
  },

  async changePassword(data: ChangePasswordInput): Promise<void> {
    await apiClient.patch('/users/me/password', data);
  },

  async updateTheme(theme: ThemePreference): Promise<{ theme: ThemePreference }> {
    const response = await apiClient.patch<ApiResponse<{ theme: ThemePreference }>>('/users/me/theme', {
      theme,
    });
    return response.data.data!;
  },

  async listUsers(): Promise<UserDTO[]> {
    const response = await apiClient.get<ApiResponse<UserDTO[]>>('/users');
    return response.data.data!;
  },
};

