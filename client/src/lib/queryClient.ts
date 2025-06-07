import { QueryClient, QueryFunction } from "@tanstack/react-query";

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


  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);

    // Handle 204 No Content status explicitly
    if (res.status === 204) {
      return null as T;
    }
    
    // Parse JSON response if we're expecting something other than Response
    if (typeof Response !== 'undefined' && Response === Object(Response) && !(res instanceof Response)) {
      return res as unknown as T;
    }
    
    try {
      return await res.json() as T;
    } catch (error) {
      console.warn('⚠️ [API_REQUEST_DEBUG] Failed to parse response as JSON, returning null for non-JSON OK status.');
      return null as T;
    }
  } catch (error) {
    console.error('❌ [API_REQUEST_DEBUG] Network or fetch error in apiRequest:', error);
    if (error instanceof Error) {
      console.error('❌ [API_REQUEST_DEBUG] Error message:', error.message);
      console.error('❌ [API_REQUEST_DEBUG] Error stack:', error.stack);
    }
    throw error; // Re-throw the error
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

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
