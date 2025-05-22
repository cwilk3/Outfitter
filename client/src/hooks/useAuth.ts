import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useState, useEffect } from "react";

export function useAuth() {
  const [devUser, setDevUser] = useState<any>(null);
  
  // Check for development user in localStorage (synchronous check every render)
  const currentDevUser = (() => {
    const storedDevUser = localStorage.getItem('dev-user');
    return storedDevUser ? JSON.parse(storedDevUser) : null;
  })();
  
  // Update state if localStorage changed
  useEffect(() => {
    setDevUser(currentDevUser);
  }, [JSON.stringify(currentDevUser)]);

  const { data: apiUser, isLoading: apiLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !currentDevUser, // Only query API if no dev user
  });

  // Use current dev user if available, otherwise use API user
  const user = currentDevUser || apiUser;
  const isLoading = !currentDevUser && apiLoading;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isGuide: user?.role === 'guide',
  };
}