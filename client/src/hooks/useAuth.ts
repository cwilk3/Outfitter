import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  // Check URL for role parameter to enable testing
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role');
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user", roleParam],
    queryFn: async () => {
      const url = roleParam ? `/api/auth/user?role=${roleParam}` : '/api/auth/user';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isGuide: user?.role === 'guide',
  };
}