import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

// Development mode flag
const DEV_MODE = true;

// Mock user for development
const mockAdminUser: User = {
  id: "dev-admin-1",
  email: "admin@example.com",
  firstName: "Admin",
  lastName: "User",
  profileImageUrl: null,
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  phone: null
};

export function useAuth() {
  // In development mode, we'll bypass the authentication API call
  // and use a mock admin user instead
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // In development mode, return a mock admin user immediately
    enabled: !DEV_MODE,
  });

  return {
    user: DEV_MODE ? mockAdminUser : user,
    isLoading: DEV_MODE ? false : isLoading,
    isAuthenticated: DEV_MODE ? true : !!user,
    isAdmin: DEV_MODE ? true : user?.role === 'admin',
  };
}