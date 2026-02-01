import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth.api';
import { User, Tokens } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tokens: Tokens | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);

  // Check stored tokens on app launch
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedTokens = await SecureStore.getItemAsync('tokens');
        const storedUser = await SecureStore.getItemAsync('user');

        if (storedTokens && storedUser) {
          const parsedTokens = JSON.parse(storedTokens);
          const parsedUser = JSON.parse(storedUser);
          setTokens(parsedTokens);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    const newTokens: Tokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };

    await SecureStore.setItemAsync('tokens', JSON.stringify(newTokens));
    await SecureStore.setItemAsync('user', JSON.stringify(response.user));

    setTokens(newTokens);
    setUser(response.user);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Try to logout on server (might fail if token expired)
      await authApi.logout();
    } catch (error) {
      // Ignore errors - we're logging out anyway
    }

    await SecureStore.deleteItemAsync('tokens');
    await SecureStore.deleteItemAsync('user');
    setTokens(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<string> => {
      const response = await authApi.register(name, email, password);
      return response.message;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        tokens,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
