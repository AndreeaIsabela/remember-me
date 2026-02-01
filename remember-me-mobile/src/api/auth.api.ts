import apiClient from './client';
import { AuthResponse } from '../types';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ message: string; user: { id: string; name: string; email: string } }> {
    const response = await apiClient.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};
