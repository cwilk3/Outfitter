import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get stored access token
const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem('access_token');
  } catch {
    return null;
  }
};

// Refresh token utility
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const tokens = localStorage.getItem('auth_tokens');
    if (!tokens) return null;
    
    const { refreshToken } = JSON.parse(tokens);
    if (!refreshToken) return null;
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (response.ok) {
      const { accessToken } = await response.json();
      
      // Update stored tokens
      const newTokens = { accessToken, refreshToken };
      localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
      localStorage.setItem('access_token', accessToken);
      
      return accessToken;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  // Clear invalid tokens
  localStorage.removeItem('auth_tokens');
  localStorage.removeItem('access_token');
  return null;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = Response>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const makeRequest = async (token?: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return fetch(url, {
      method,
      headers: data ? headers : { Authorization: headers.Authorization || '' },
      body: data ? JSON.stringify(data) : undefined,
    });
  };

  let token = getAccessToken();
  let res = await makeRequest(token);

  // If token expired, try to refresh
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    }
  }

  await throwIfResNotOk(res);
  
  try {
    return await res.json() as T;
  } catch (error) {
    return res as unknown as T;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const makeRequest = async (token?: string | null): Promise<Response> => {
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      return fetch(queryKey[0] as string, { headers });
    };

    let token = getAccessToken();
    let res = await makeRequest(token);

    // If token expired, try to refresh
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        res = await makeRequest(newToken);
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
