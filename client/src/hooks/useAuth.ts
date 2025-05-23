import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Try the new authentication endpoint first, fall back to old one
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: (failureCount, error: any) => {
      // If new endpoint fails, try the old one
      if (failureCount === 0 && error?.status === 404) {
        return false; // Don't retry, we'll handle fallback
      }
      return false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fallback to old authentication endpoint if new one fails
  const { data: fallbackUser, isLoading: fallbackLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !user && !isLoading, // Only try fallback if primary failed
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest('POST', '/api/auth/login', credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string; 
      companyName: string;
      phone?: string;
    }) => {
      return apiRequest('POST', '/api/auth/email-register', userData);
    },
    onSuccess: (userData) => {
      // Directly set the user data in cache after successful registration
      queryClient.setQueryData(["/api/auth/me"], userData);
      queryClient.setQueryData(["/api/auth/user"], userData);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      window.location.href = '/'; // Redirect to landing page
    },
  });

  const currentUser = user || fallbackUser;
  const currentLoading = isLoading || (!user && fallbackLoading);

  // Debug logging
  console.log('Auth State Debug:', {
    user,
    fallbackUser,
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    fallbackLoading
  });

  return {
    user: currentUser,
    isLoading: currentLoading,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isGuide: currentUser?.role === 'guide',
    
    // Authentication actions
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    
    // Loading states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    
    // Error states
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,
  };
}