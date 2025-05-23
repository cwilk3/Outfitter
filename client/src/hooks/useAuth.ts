import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useState, useEffect } from "react";

export function useAuth() {
  const [devUser, setDevUser] = useState<any>(null);
  
  // Check for development user in localStorage
  useEffect(() => {
    const storedDevUser = localStorage.getItem('dev-user');
    if (storedDevUser) {
      setDevUser(JSON.parse(storedDevUser));
    }
  }, []);

  const { data: apiUser, isLoading: apiLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !devUser, // Only query API if no dev user
  });

  // Use dev user if available, otherwise use API user
  const user = devUser || apiUser;
  const isLoading = !devUser && apiLoading;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isGuide: user?.role === 'guide',
  };
}