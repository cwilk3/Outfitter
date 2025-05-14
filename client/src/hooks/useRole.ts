import { useAuth } from "./useAuth";

export function useRole() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const isAdmin = user?.user?.role === 'admin';
  const isGuide = user?.user?.role === 'guide';
  
  return {
    user: user?.user,
    isAdmin,
    isGuide,
    isLoading,
    isAuthenticated
  };
}
