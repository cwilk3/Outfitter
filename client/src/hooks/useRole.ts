import { useAuth } from "./useAuth";

export function useRole() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Direct check on user role - the user object is directly returned from the API
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
