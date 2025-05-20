import React from "react";
import { useQuery } from "@tanstack/react-query";
import { User, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExperienceGuide } from "@/types";

interface GuideAssignmentIndicatorProps {
  experienceId: number;
  showEmpty?: boolean;
}

export function GuideAssignmentIndicator({ experienceId, showEmpty = false }: GuideAssignmentIndicatorProps) {
  // Fetch guide assignments for this experience
  const { data: guideAssignments = [], isLoading } = useQuery<ExperienceGuide[]>({
    queryKey: ['/api/experiences', experienceId, 'guides'],
    queryFn: async () => {
      const response = await fetch(`/api/experiences/${experienceId}/guides`);
      if (!response.ok) throw new Error('Failed to fetch guide assignments');
      return response.json();
    },
  });

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
      </div>
    );
  }

  // Show empty state
  return (
    <div className="flex items-center mt-2">
      <User className="h-3.5 w-3.5 text-gray-300 mr-1.5" />
      <span className="text-xs text-gray-300">No guides assigned</span>
    </div>
  );
}