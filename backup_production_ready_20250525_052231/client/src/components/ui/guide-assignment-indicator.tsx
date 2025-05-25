import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, BadgeCheck, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExperienceGuide } from "@/types";

interface GuideAssignmentIndicatorProps {
  experienceId: number;
  showEmpty?: boolean;
  experienceName?: string;
}

export function GuideAssignmentIndicator({ 
  experienceId, 
  showEmpty = false,
  experienceName 
}: GuideAssignmentIndicatorProps) {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);
  const [manualRefresh, setManualRefresh] = useState(false);
  
  // Enhanced query with more aggressive retry logic for in-memory storage
  const { 
    data: guideAssignments = [], 
    isLoading, 
    isError,
    refetch,
    error
  } = useQuery<ExperienceGuide[]>({
    queryKey: ['/api/experiences', experienceId, 'guides'],
    queryFn: async () => {
      console.log(`[GUIDE_INDICATOR] Fetching guides for experience ${experienceId}${experienceName ? ` (${experienceName})` : ''}`);
      try {
        const response = await fetch(`/api/experiences/${experienceId}/guides`);
        if (!response.ok) {
          console.warn(`[GUIDE_INDICATOR] Guide fetch failed with status: ${response.status}`);
          return [];
        }
        const guides = await response.json();
        console.log(`[GUIDE_INDICATOR] Fetched ${guides.length} guides for experience ${experienceId}`, guides);
        return guides;
      } catch (error) {
        console.error(`[GUIDE_INDICATOR] Error fetching guide assignments for experience ${experienceId}:`, error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 10000, // Shorter stale time to ensure fresher data
  });

  // For in-memory storage, we'll implement a more aggressive refetch strategy
  useEffect(() => {
    // When the component mounts or experienceId changes, try to fetch multiple times
    // This helps with in-memory storage inconsistencies
    let timeoutId: NodeJS.Timeout;
    
    const performRefetch = () => {
      if (retryCount < 3) {
        timeoutId = setTimeout(() => {
          console.log(`[GUIDE_INDICATOR] Auto-refetching guides attempt ${retryCount + 1}`);
          refetch();
          setRetryCount(prev => prev + 1);
        }, 500 * (retryCount + 1)); // Increasing backoff
      }
    };
    
    if (retryCount === 0 || manualRefresh) {
      performRefetch();
      setManualRefresh(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [experienceId, retryCount, refetch, manualRefresh]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log(`[GUIDE_INDICATOR] Manual refresh triggered for experience ${experienceId}`);
    setRetryCount(0);
    setManualRefresh(true);
    
    // Also invalidate all related queries to force fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
    queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId] });
    queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
  };

  // Show nothing if no guides assigned and showEmpty is false
  if (guideAssignments.length === 0 && !showEmpty) {
    return null;
  }

  // Show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center mt-2">
        <User className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
        <span className="text-xs text-gray-400">Loading guides...</span>
      </div>
    );
  }

  // Show guide assignments
  if (guideAssignments.length > 0) {
    return (
      <div className="flex items-center mt-2">
        <User className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
        <div className="flex -space-x-2 overflow-hidden">
          {guideAssignments.map((guide) => (
            <TooltipProvider key={guide.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative inline-block">
                    <Avatar className="h-5 w-5 border border-white">
                      <AvatarImage src={guide.profileImageUrl || ""} alt={guide.guideId} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {guide.guideId.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {guide.isPrimary && (
                      <span className="absolute -top-0.5 -right-0.5">
                        <BadgeCheck className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>Guide ID: {guide.guideId}</p>
                  {guide.isPrimary && <p className="text-amber-500 font-medium">Primary Guide</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-1">
          {guideAssignments.length} {guideAssignments.length === 1 ? 'guide' : 'guides'} assigned
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={handleManualRefresh} 
                className="ml-1 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="h-3 w-3 text-gray-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Refresh guide assignments</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Show empty state with refresh button
  return (
    <div className="flex items-center mt-2">
      <User className="h-3.5 w-3.5 text-gray-300 mr-1.5" />
      <span className="text-xs text-gray-300">No guides assigned</span>
      {isError && (
        <span className="text-xs text-red-400 ml-1">
          (Error loading)
        </span>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleManualRefresh} 
              className="ml-1 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="h-3 w-3 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Refresh guide assignments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}