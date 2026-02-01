import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const tokensStr = await SecureStore.getItemAsync('tokens');
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    } catch (error) {
      console.error('Error getting tokens:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokensStr = await SecureStore.getItemAsync('tokens');
        if (tokensStr) {
          const tokens = JSON.parse(tokensStr);
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });

          const newTokens = response.data;
          await SecureStore.setItemAsync('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        await SecureStore.deleteItemAsync('tokens');
        // The auth context will handle redirecting to login
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
