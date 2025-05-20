import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { 
  ChevronDown, 
  User, 
  X, 
  UserCheck, 
  Shield, 
  Star, 
  Plus 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch available guides with the guide role
  const { data: availableGuides = [], isLoading } = useQuery({
    queryKey: ['/api/users', { role: 'guide' }],
  });

  // Get unassigned guides (those not already selected)
  const getUnassignedGuides = () => {
    if (!availableGuides) return [];
    
    return availableGuides.filter((guide: Guide) => 
      !selectedGuideIds.includes(guide.id) &&
      (searchQuery === "" || 
       `${guide.firstName || ""} ${guide.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (guide.email && guide.email.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  };

  // Get details of currently selected guides
  const getSelectedGuideDetails = () => {
    if (!availableGuides) return [];
    
    return availableGuides.filter((guide: Guide) => 
      selectedGuideIds.includes(guide.id)
    );
  };

  // Handle adding a guide to the experience
  const handleAddGuide = (guideId: string) => {
    onChange([...selectedGuideIds, guideId]);
    
    // If this is the first guide added, automatically make them primary
    if (selectedGuideIds.length === 0 || primaryGuideId === null) {
      onPrimaryChange(guideId);
    }
    
    setMenuOpen(false);
  };

  // Handle removing a guide from the experience
  const handleRemoveGuide = (guideId: string) => {
    onChange(selectedGuideIds.filter(id => id !== guideId));
    
    // If the primary guide is removed, set a new primary guide if possible
    if (guideId === primaryGuideId && selectedGuideIds.length > 1) {
      const newPrimaryGuideId = selectedGuideIds.find(id => id !== guideId);
      if (newPrimaryGuideId) {
        onPrimaryChange(newPrimaryGuideId);
      }
    } else if (guideId === primaryGuideId) {
      // If we're removing the last primary guide, set to null instead of empty string
      onPrimaryChange(null);
    }
  };

  // Format guide name for display
  const formatGuideName = (guide: Guide) => {
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
  const getGuideInitials = (guide: Guide) => {
    if (guide.firstName && guide.lastName) {
      return `${guide.firstName[0]}${guide.lastName[0]}`.toUpperCase();
    } else if (guide.firstName) {
      return guide.firstName[0].toUpperCase();
    } else if (guide.email) {
      return guide.email[0].toUpperCase();
    }
    return "G";
  };

  return (
    <div className="space-y-4">
      {/* Already selected guides */}
      <div className="space-y-2">
        {getSelectedGuideDetails().map((guide: Guide) => (
          <Card key={guide.id} className={`${primaryGuideId === guide.id ? 'border-primary' : ''}`}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {guide.profileImageUrl ? (
                    <AvatarImage src={guide.profileImageUrl} alt={formatGuideName(guide)} />
                  ) : (
                    <AvatarFallback>{getGuideInitials(guide)}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="font-medium">{formatGuideName(guide)}</div>
                  <div className="text-xs text-muted-foreground">{guide.email}</div>
                </div>
                {primaryGuideId === guide.id && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {primaryGuideId !== guide.id && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onPrimaryChange(guide.id)}
                    title="Set as primary guide"
                  >
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveGuide(guide.id)}
                  title="Remove guide"
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading guides...
                  </div>
                ) : getUnassignedGuides().length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No guides match your search" : "No available guides"}
                  </div>
                ) : (
                  getUnassignedGuides().map((guide: Guide) => (
                    <CommandItem
                      key={guide.id}
                      onSelect={() => handleAddGuide(guide.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        {guide.profileImageUrl ? (
                          <AvatarImage src={guide.profileImageUrl} alt={formatGuideName(guide)} />
                        ) : (
                          <AvatarFallback>{getGuideInitials(guide)}</AvatarFallback>
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

      {selectedGuideIds.length === 0 && (
        <div className="text-sm text-muted-foreground mt-2">
          No guides assigned yet. Assign at least one guide to lead this experience.
        </div>
      )}
    </div>
  );
}