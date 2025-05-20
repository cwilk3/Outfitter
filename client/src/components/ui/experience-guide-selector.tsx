import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, User, UserCheck, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Guide {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

interface TempGuideAssignment {
  guideId: string;
  isPrimary: boolean;
}

interface ExperienceGuideSelectorProps {
  selectedGuideIds: string[];
  onChange: (guideIds: string[]) => void;
  primaryGuideId: string | null;
  onPrimaryChange: (guideId: string) => void;
}

export function ExperienceGuideSelector({ 
  selectedGuideIds,
  onChange,
  primaryGuideId,
  onPrimaryChange
}: ExperienceGuideSelectorProps) {
  const [showAddGuideDialog, setShowAddGuideDialog] = React.useState(false);
  
  // Fetch available guides
  const { data: availableGuides, isLoading: loadingGuides } = useQuery({
    queryKey: ['/api/users', { role: 'guide' }]
  });
  
  const handleAssignGuide = (guideId: string) => {
    // Add the guide ID to the selected guides list
    if (!selectedGuideIds.includes(guideId)) {
      const newSelectedGuideIds = [...selectedGuideIds, guideId];
      onChange(newSelectedGuideIds);
      
      // If this is the first guide, make them primary
      if (newSelectedGuideIds.length === 1 && !primaryGuideId) {
        onPrimaryChange(guideId);
      }
      
      setShowAddGuideDialog(false);
    }
  };
  
  const handleRemoveGuide = (guideId: string) => {
    // Remove the guide ID from the selected guides list
    const newSelectedGuideIds = selectedGuideIds.filter(id => id !== guideId);
    onChange(newSelectedGuideIds);
    
    // If removing the primary guide, set a new one if available
    if (primaryGuideId === guideId && newSelectedGuideIds.length > 0) {
      onPrimaryChange(newSelectedGuideIds[0]);
    } else if (primaryGuideId === guideId) {
      onPrimaryChange("");
    }
  };
  
  const handleSetPrimaryGuide = (guideId: string) => {
    onPrimaryChange(guideId);
  };
  
  // Filter out guides that are already assigned
  const getUnassignedGuides = () => {
    if (!availableGuides) return [];
    
    return Array.isArray(availableGuides) 
      ? availableGuides.filter((guide: Guide) => !selectedGuideIds.includes(guide.id))
      : [];
  };
  
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "GD";
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
  };
  
  // Get selected guide details from the available guides
  const getSelectedGuideDetails = (): Guide[] => {
    if (!availableGuides || !Array.isArray(availableGuides)) return [];
    
    return availableGuides.filter((guide: Guide) => 
      selectedGuideIds.includes(guide.id)
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Assigned Guides</h3>
        <Button
          onClick={() => setShowAddGuideDialog(true)}
          size="sm"
          disabled={loadingGuides}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Assign Guide
        </Button>
      </div>
      
      {loadingGuides ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !selectedGuideIds.length ? (
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
          {getSelectedGuideDetails().map((guide: Guide) => (
            <div key={guide.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={guide.profileImageUrl || undefined} />
                    <AvatarFallback className={cn(
                      primaryGuideId === guide.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {getInitials(guide.firstName, guide.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {guide.firstName} {guide.lastName}
                      </h4>
                      {primaryGuideId === guide.id && (
                        <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-800">
                          PRIMARY
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {guide.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {primaryGuideId !== guide.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimaryGuide(guide.id)}
                      className="text-xs h-8 px-2 text-amber-700 border-amber-100 hover:bg-amber-50"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      Set Primary
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveGuide(guide.id)}
                    className="text-xs h-8 px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Dialog for adding guides */}
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
                  getUnassignedGuides().map((guide: Guide) => (
                    <div
                      key={guide.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleAssignGuide(guide.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={guide.profileImageUrl || undefined} />
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
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Select
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