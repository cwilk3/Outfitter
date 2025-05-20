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
  id: number | string;
  experienceId: number;
  guideId: string;
  guide?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  // These properties might be directly on the guide or in the nested guide object
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  isPrimary: boolean;
}

interface ExperienceGuidesProps {
  experienceId: number;
}

export function ExperienceGuides({ experienceId }: ExperienceGuidesProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  // Define the fetch function before using it
  const fetchExperienceGuides = async (): Promise<any[]> => {
    if (!experienceId) return [];
    const response = await apiRequest(`/api/experience-guides/${experienceId}`, 'GET');
    console.log('Fetched guides for experience:', response);
    return response || [];
  };
  
  // Fetch experience guides with proper typing
  const { 
    data: experienceGuides, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['/api/experience-guides', experienceId],
    queryFn: fetchExperienceGuides,
    enabled: !!experienceId,
    retry: 1
  });
  
  // Fetch available guides - ensuring we get all guides with the 'guide' role
  const { 
    data: availableGuides, 
    isLoading: loadingGuides, 
    isError: guidesError 
  } = useQuery({
    queryKey: ['/api/users'],
    select: (data: any) => {
      console.log('All users data:', data);
      // Make sure data is an array before filtering
      if (Array.isArray(data)) {
        return data.filter((user: any) => user && user.role === 'guide');
      }
      console.error('Users data is not an array:', data);
      return [];
    },
    enabled: true
  });
  
  // Assign guide mutation
  const assignGuideMutation = useMutation({
    mutationFn: async (guideId: string) => {
      console.log("Assigning guide:", { experienceId, guideId });
      return apiRequest('/api/experience-guides', 'POST', {
        experienceId: parseInt(experienceId.toString()), // Ensure experienceId is a number
        guideId,
        isPrimary: false // Default to not primary, can be updated later
      });
    },
    onSuccess: (data) => {
      console.log("Guide assignment successful:", data);
      toast({
        title: "Guide assigned",
        description: "Guide has been assigned to this experience",
      });
      // Don't close the dialog so multiple guides can be added
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
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
      console.log("Setting primary guide:", guideAssignment);
      return apiRequest(`/api/experience-guides/${guideAssignment.experienceId}/${guideAssignment.guideId}/primary`, 'PATCH', {
        isPrimary: true
      });
    },
    onSuccess: (data) => {
      console.log("Primary guide update successful:", data);
      toast({
        title: "Primary guide updated",
        description: "Primary guide has been updated for this experience",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
    },
    onError: (error: any) => {
      console.error("Error setting primary guide:", error);
      let errorMessage = "Failed to update primary guide";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
    if (!availableGuides || !Array.isArray(availableGuides)) {
      console.log('No available guides or not an array:', availableGuides);
      return [];
    }
    
    // Make sure we're dealing with the correct structure for assigned guides
    const assignedGuideIds = Array.isArray(experienceGuides) 
      ? experienceGuides.map((eg: any) => eg.guideId)
      : [];
    
    console.log('Available guides:', availableGuides);
    console.log('Assigned guide IDs:', assignedGuideIds);
    
    // Make sure we properly filter out already assigned guides and apply search
    const filteredGuides = availableGuides.filter((guide: any) => 
      !assignedGuideIds.includes(guide.id) &&
      (searchQuery === "" || 
        `${guide.firstName || ""} ${guide.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guide.email && guide.email.toLowerCase().includes(searchQuery.toLowerCase())))
    );
    
    console.log('Filtered unassigned guides:', filteredGuides);
    return filteredGuides;
  };
  
  // Format guide name for display
  const formatGuideName = (guide: any) => {
    // Handle if we get guide info directly or nested
    const firstName = guide.firstName || (guide.guide && guide.guide.firstName);
    const lastName = guide.lastName || (guide.guide && guide.guide.lastName);
    const email = guide.email || (guide.guide && guide.guide.email);
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (email) {
      return email;
    }
    return "Unknown Guide";
  };
  
  // Get guide initials for avatar fallback
  const getInitials = (guide: any) => {
    const firstName = guide.firstName || (guide.guide && guide.guide.firstName);
    const lastName = guide.lastName || (guide.guide && guide.guide.lastName);
    
    if (!firstName && !lastName) return "GD";
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
  };

  // Fix queryFn return type to avoid TypeScript errors
  const fetchExperienceGuides = async (): Promise<any[]> => {
    if (!experienceId) return [];
    const response = await apiRequest(`/api/experience-guides/${experienceId}`, 'GET');
    console.log('Fetched guides for experience:', response);
    return response || [];
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
                      <AvatarImage src={eg.guide.avatarUrl} alt={formatGuideName(eg)} />
                    ) : (
                      <AvatarFallback>{getInitials(eg)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-medium">{formatGuideName(eg)}</div>
                    <div className="text-xs text-muted-foreground">
                      {eg.email || (eg.guide && eg.guide.email) || ""}
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