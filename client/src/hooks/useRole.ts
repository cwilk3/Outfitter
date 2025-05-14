import { useAuth } from "./useAuth";

// Development mode flag - keep in sync with useAuth.ts
const DEV_MODE = true;

export function useRole() {
  const { user, isLoading, isAuthenticated, isAdmin: authIsAdmin } = useAuth();
  
  // If we're in development mode, always return admin role
  const isAdmin = DEV_MODE ? true : authIsAdmin || user?.role === 'admin';
  const isGuide = DEV_MODE ? false : user?.role === 'guide';
  
  return {
    user,
    isAdmin,
    isGuide,
    isLoading,
    isAuthenticated
  };
}
