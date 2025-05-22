import { useAuth } from "./useAuth";

export function useRole() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Read role from user object returned by API
  const isAdmin = user?.role === 'admin';
  const isGuide = user?.role === 'guide';
  
  return {
    user,
    isAdmin,
    isGuide,
    isLoading,
    isAuthenticated
  };
}
