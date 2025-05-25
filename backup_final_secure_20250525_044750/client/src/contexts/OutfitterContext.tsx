import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Outfitter {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
  isActive: boolean;
}

interface OutfitterContextType {
  outfitter: Outfitter | null;
  outfitterId: number | null;
  isLoading: boolean;
  error: string | null;
  refreshOutfitter: () => Promise<void>;
}

const OutfitterContext = createContext<OutfitterContextType | undefined>(undefined);

export function OutfitterProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [outfitter, setOutfitter] = useState<Outfitter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutfitter = async () => {
    if (!isAuthenticated || !user) {
      setOutfitter(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user's outfitter association
      const response = await fetch('/api/user-outfitters');
      if (!response.ok) {
        throw new Error('Failed to fetch outfitter data');
      }

      const userOutfitters = await response.json();
      
      // For now, use the first outfitter (users typically belong to one outfitter)
      if (userOutfitters.length > 0) {
        setOutfitter(userOutfitters[0].outfitter);
      } else {
        setOutfitter(null);
      }
    } catch (err) {
      console.error('Error fetching outfitter:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setOutfitter(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutfitter();
  }, [isAuthenticated, user]);

  const contextValue: OutfitterContextType = {
    outfitter,
    outfitterId: outfitter?.id || null,
    isLoading,
    error,
    refreshOutfitter: fetchOutfitter,
  };

  return (
    <OutfitterContext.Provider value={contextValue}>
      {children}
    </OutfitterContext.Provider>
  );
}

export function useOutfitter() {
  const context = useContext(OutfitterContext);
  if (context === undefined) {
    throw new Error('useOutfitter must be used within an OutfitterProvider');
  }
  return context;
}