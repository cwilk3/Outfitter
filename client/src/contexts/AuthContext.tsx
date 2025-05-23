import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'guide';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token management utilities
const TOKEN_STORAGE_KEY = 'auth_tokens';
const ACCESS_TOKEN_KEY = 'access_token';

const getStoredTokens = (): AuthTokens | null => {
  try {
    const tokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    return tokens ? JSON.parse(tokens) : null;
  } catch {
    return null;
  }
};

const setStoredTokens = (tokens: AuthTokens | null) => {
  if (tokens) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    // Also store access token separately for easy API access
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

// API request utility with automatic token refresh
const apiRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const tokens = getStoredTokens();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401 && tokens?.refreshToken) {
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        const newTokens = { ...tokens, accessToken };
        setStoredTokens(newTokens);

        // Retry original request with new token
        headers.Authorization = `Bearer ${accessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setStoredTokens(null);
    }
  }

  return response;
};

export { apiRequest };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const tokens = getStoredTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setStoredTokens(null);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setStoredTokens(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const { user: userData, accessToken, refreshToken } = await response.json();
      
      setStoredTokens({ accessToken, refreshToken });
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const { user: userData, accessToken, refreshToken } = await response.json();
      
      setStoredTokens({ accessToken, refreshToken });
      setUser(userData);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const tokens = getStoredTokens();
      if (tokens?.refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setStoredTokens(null);
      setUser(null);
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    const tokens = getStoredTokens();
    if (!tokens?.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        const newTokens = { ...tokens, accessToken };
        setStoredTokens(newTokens);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    setStoredTokens(null);
    setUser(null);
    return false;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};