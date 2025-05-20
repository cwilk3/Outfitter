import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, User, Shield, UserCheck, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  const [showAddGuideDialog, setShowAddGuideDialog] = React.useState(false);
  
  // Fetch experience guides
  const { data: experienceGuides, isLoading } = useQuery({
    queryKey: ['/api/experience-guides', experienceId],
    enabled: !!experienceId
  });
  
  // Fetch available guides
  const { data: availableGuides, isLoading: loadingGuides } = useQuery({
    queryKey: ['/api/guides']
  });
  
  // Assign guide mutation
  const assignGuideMutation = useMutation({
    mutationFn: async (guideId: string) => {
      return apiRequest('/api/experience-guides', {
        method: 'POST',
        body: JSON.stringify({
          experienceId,
          guideId,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Guide assigned",
        description: "Guide has been assigned to this experience",
      });
      setShowAddGuideDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/experience-guides', experienceId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to assign guide to experience",
        variant: "destructive",
      });
    },
  });
  
  // Remove guide mutation
  const removeGuideMutation = useMutation({
    mutationFn: async (guideAssignmentId: number) => {
      return apiRequest(`/api/experience-guides/${guideAssignmentId}`, {
        method: 'DELETE',
      });
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
    mutationFn: async (guideAssignmentId: number) => {
      return apiRequest(`/api/experience-guides/${guideAssignmentId}/primary`, {
        method: 'PUT',
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
  
  const handleRemoveGuide = (guideAssignmentId: number) => {
    removeGuideMutation.mutate(guideAssignmentId);
  };
  
  const handleSetPrimaryGuide = (guideAssignmentId: number) => {
    setPrimaryGuideMutation.mutate(guideAssignmentId);
  };
  
  // Filter out guides that are already assigned
  const getUnassignedGuides = () => {
    if (!availableGuides || !experienceGuides) return [];
    
    const assignedGuideIds = experienceGuides.map((eg: ExperienceGuide) => eg.guideId);
    return availableGuides.filter((guide: any) => !assignedGuideIds.includes(guide.id));
  };
  
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "GD";
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Assigned Guides</h3>
        <Button
          onClick={() => setShowAddGuideDialog(true)}
          size="sm"
          disabled={isLoading || loadingGuides}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Assign Guide
        </Button>
      </div>
      
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !experienceGuides || experienceGuides.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-md bg-muted/30">
          <User className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-sm font-medium mb-1">No Guides Assigned</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Assign guides who will lead this experience
          </p>
          <Button
            onClick={() => setShowAddGuideDialog(true)}
            variant="outline"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Assign Guide
          </Button>
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {experienceGuides.map((eg: ExperienceGuide) => (
            <div key={eg.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={eg.guide.avatarUrl} />
                    <AvatarFallback className={cn(
                      eg.isPrimary ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {getInitials(eg.guide.firstName, eg.guide.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {eg.guide.firstName} {eg.guide.lastName}
                      </h4>
                      {eg.isPrimary && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {eg.guide.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {!eg.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => handleSetPrimaryGuide(eg.id)}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Make Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => handleRemoveGuide(eg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Guide Dialog */}
      <Dialog open={showAddGuideDialog} onOpenChange={setShowAddGuideDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Guide to Experience</DialogTitle>
            <DialogDescription>
              Select a guide to assign to this experience. They will be responsible for leading the experience.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingGuides ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1">
                {getUnassignedGuides().length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      All available guides are already assigned to this experience.
                    </p>
                  </div>
                ) : (
                  getUnassignedGuides().map((guide: any) => (
                    <div
                      key={guide.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleAssignGuide(guide.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={guide.avatarUrl} />
                          <AvatarFallback className="bg-muted">
                            {getInitials(guide.firstName, guide.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <h4 className="font-medium">
                            {guide.firstName} {guide.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {guide.email}
                          </p>
                        </div>
                      </div>
                      
                      <Button size="sm" variant="ghost">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}