import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  UserPlus, 
  User, 
  Shield, 
  UserCheck, 
  Trash2,
  Star,
  X,
  Plus,
  ChevronDown 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";

interface ExperienceGuide {
  id: number;
  experienceId: number;
  guideId: string;
  guide: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  isPrimary: boolean;
}

interface ExperienceGuidesProps {
  experienceId: number;
}

export function ExperienceGuides({ experienceId }: ExperienceGuidesProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  // Fetch experience guides
  const { data: experienceGuides, isLoading } = useQuery({
    queryKey: ['/api/experience-guides', experienceId],
    enabled: !!experienceId,
    staleTime: 0, // Don't cache at all, always refetch
    refetchOnWindowFocus: true
  });
  
  // Fetch available guides - ensuring we get all guides with the 'guide' role
  const { data: availableGuides, isLoading: loadingGuides } = useQuery({
    queryKey: ['/api/users'],
    select: (data) => data.filter((user: any) => user.role === 'guide'),
    enabled: true
  });
  
  // Assign guide mutation
  const assignGuideMutation = useMutation({
    mutationFn: async (guideId: string) => {
      const response = await apiRequest('/api/experience-guides', 'POST', {
        experienceId,
        guideId,
      });
      console.log("Guide assignment response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Guide assignment successful:", data);
      toast({
        title: "Guide assigned",
        description: "Guide has been assigned to this experience",
      });
      
      // Force refetch the guide data to ensure we get the latest
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
      queryClient.refetchQueries({ queryKey: ['/api/experience-guides', experienceId] });
      
      setMenuOpen(false);
    },
    onError: (error) => {
      console.error("Guide assignment error:", error);
      toast({
        title: "Error",
        description: "Failed to assign guide to experience",
        variant: "destructive",
      });
    },
  });
  
  // Remove guide mutation
  const removeGuideMutation = useMutation({
    mutationFn: async (guideAssignment: {experienceId: number, guideId: string}) => {
      return apiRequest(`/api/experience-guides/${guideAssignment.experienceId}/${guideAssignment.guideId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Guide removed",
        description: "Guide has been removed from this experience",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove guide from experience",
        variant: "destructive",
      });
    },
  });
  
  // Set primary guide mutation
  const setPrimaryGuideMutation = useMutation({
    mutationFn: async (guideAssignment: {experienceId: number, guideId: string}) => {
      return apiRequest(`/api/experience-guides/${guideAssignment.experienceId}/${guideAssignment.guideId}/primary`, 'PATCH', {
        isPrimary: true
      });
    },
    onSuccess: () => {
      toast({
        title: "Primary guide updated",
        description: "Primary guide has been updated for this experience",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update primary guide",
        variant: "destructive",
      });
    },
  });
  
  const handleAssignGuide = (guideId: string) => {
    assignGuideMutation.mutate(guideId);
  };
  
  const handleRemoveGuide = (guideId: string) => {
    removeGuideMutation.mutate({
      experienceId: experienceId,
      guideId: guideId
    });
  };
  
  const handleSetPrimaryGuide = (guideId: string) => {
    setPrimaryGuideMutation.mutate({
      experienceId: experienceId,
      guideId: guideId
    });
  };
  
  // Filter out guides that are already assigned
  const getUnassignedGuides = () => {
    // Debug logging to help trace issue
    console.log("Available guides:", availableGuides);
    console.log("Experience guides:", experienceGuides);
    
    if (!availableGuides) return [];
    
    // Make sure we're dealing with the correct structure for assigned guides
    const assignedGuideIds = Array.isArray(experienceGuides) 
      ? experienceGuides.map((eg: any) => eg.guideId || eg.id)
      : [];
      
    console.log("Assigned guide IDs:", assignedGuideIds);
    
    // Make sure we properly filter out already assigned guides
    const unassignedGuides = Array.isArray(availableGuides) 
      ? availableGuides.filter((guide: any) => 
          !assignedGuideIds.includes(guide.id) &&
          (searchQuery === "" || 
           `${guide.firstName || ""} ${guide.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (guide.email && guide.email.toLowerCase().includes(searchQuery.toLowerCase()))))
      : [];
      
    console.log("Unassigned guides after filtering:", unassignedGuides);
    return unassignedGuides;
  };
  
  // Format guide name for display
  const formatGuideName = (guide: any) => {
    if (guide.firstName && guide.lastName) {
      return `${guide.firstName} ${guide.lastName}`;
    } else if (guide.firstName) {
      return guide.firstName;
    } else if (guide.email) {
      return guide.email;
    }
    return "Unknown Guide";
  };
  
  // Get guide initials for avatar fallback
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "GD";
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
  };

  // Check if there's a primary guide
  const getPrimaryGuideId = () => {
    if (!experienceGuides || !Array.isArray(experienceGuides)) return null;
    const primaryGuide = experienceGuides.find(guide => guide.isPrimary);
    return primaryGuide ? primaryGuide.guideId : null;
  };
  
  const primaryGuideId = getPrimaryGuideId();
  
  return (
    <div className="space-y-4">
      {/* Already selected guides */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !experienceGuides || !Array.isArray(experienceGuides) || experienceGuides.length === 0 ? (
          <div className="text-sm text-muted-foreground mt-2">
            No guides assigned yet. Assign at least one guide to lead this experience.
          </div>
        ) : (
          experienceGuides.map((eg: ExperienceGuide) => (
            <Card key={eg.id} className={`${eg.isPrimary ? 'border-primary' : ''}`}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {eg.guide && eg.guide.avatarUrl ? (
                      <AvatarImage src={eg.guide.avatarUrl} alt={eg.guide ? formatGuideName(eg.guide) : 'Guide'} />
                    ) : (
                      <AvatarFallback>
                        {eg.guide ? getInitials(eg.guide.firstName, eg.guide.lastName) : 'GD'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {eg.guide ? formatGuideName(eg.guide) : `Guide ${eg.guideId}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eg.guide ? eg.guide.email : ''}
                    </div>
                  </div>
                  {eg.isPrimary && (
                    <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!eg.isPrimary && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleSetPrimaryGuide(eg.guideId)}
                      title="Set as primary guide"
                    >
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveGuide(eg.guideId)}
                    title="Remove guide"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Guide selector dropdown */}
      <div className="mt-4">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                <span>Add Guide</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[300px]" align="start">
            <Command>
              <CommandInput 
                placeholder="Search guides..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <div className="py-2 px-2 text-sm text-muted-foreground">
                  Available Guides
                </div>
                {loadingGuides ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading guides...
                  </div>
                ) : getUnassignedGuides().length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No guides match your search" : "No available guides"}
                  </div>
                ) : (
                  getUnassignedGuides().map((guide: any) => (
                    <CommandItem
                      key={guide.id}
                      onSelect={() => handleAssignGuide(guide.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        {guide.avatarUrl ? (
                          <AvatarImage src={guide.avatarUrl} alt={formatGuideName(guide)} />
                        ) : (
                          <AvatarFallback>{getInitials(guide.firstName, guide.lastName)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span>{formatGuideName(guide)}</span>
                    </CommandItem>
                  ))
                )}
              </CommandList>
            </Command>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}