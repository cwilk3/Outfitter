import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck, UserX, Star, PlusCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Guide {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface ExperienceGuide {
  id: number;
  experienceId: number;
  guideId: string;
  isPrimary: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ExperienceGuidesProps {
  experienceId: number;
  onChange?: (guides: ExperienceGuide[]) => void;
  readOnly?: boolean;
}

export function ExperienceGuides({ experienceId, onChange, readOnly = false }: ExperienceGuidesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGuideId, setSelectedGuideId] = useState<string>('');

  // Fetch available guides with 'guide' role
  const { data: availableGuides = [] } = useQuery({
    queryKey: ['/api/users', { role: 'guide' }],
    queryFn: async () => {
      const response = await fetch('/api/users?role=guide');
      if (!response.ok) throw new Error('Failed to fetch guides');
      return response.json();
    },
    enabled: !readOnly,
  });

  // Fetch currently assigned guides for this experience
  const { 
    data: assignedGuides = [], 
    isLoading,
    refetch: refetchAssignedGuides 
  } = useQuery({
    queryKey: ['/api/experiences', experienceId, 'guides'],
    queryFn: async () => {
      // Handle case for new experiences (no ID yet)
      if (!experienceId) return [];
      
      const response = await fetch(`/api/experiences/${experienceId}/guides`);
      if (!response.ok) throw new Error('Failed to fetch assigned guides');
      return response.json();
    },
  });

  // Assign a guide to the experience
  const assignGuideMutation = useMutation({
    mutationFn: async (data: { guideId: string; isPrimary: boolean }) => {
      const response = await fetch(`/api/experiences/${experienceId}/guides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign guide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      toast({
        title: 'Guide assigned',
        description: 'The guide has been successfully assigned to this experience.',
      });
      setSelectedGuideId('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to assign guide. Please try again.',
        variant: 'destructive',
      });
      console.error('Error assigning guide:', error);
    },
  });

  // Update a guide assignment (set primary)
  const updateGuideMutation = useMutation({
    mutationFn: async (data: { id: number; isPrimary: boolean }) => {
      const response = await fetch(`/api/experience-guides/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPrimary: data.isPrimary }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update guide assignment');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      toast({
        title: 'Guide updated',
        description: 'The guide assignment has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update guide assignment. Please try again.',
        variant: 'destructive',
      });
      console.error('Error updating guide assignment:', error);
    },
  });

  // Remove a guide assignment
  const removeGuideMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/experience-guides/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove guide');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      toast({
        title: 'Guide removed',
        description: 'The guide has been removed from this experience.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove guide. Please try again.',
        variant: 'destructive',
      });
      console.error('Error removing guide:', error);
    },
  });

  // Handle guide selection and assignment
  const handleAssignGuide = () => {
    if (!selectedGuideId) return;
    
    // Check if guide is already assigned
    if (assignedGuides.some((g: ExperienceGuide) => g.guideId === selectedGuideId)) {
      toast({
        title: 'Guide already assigned',
        description: 'This guide is already assigned to this experience.',
        variant: 'destructive',
      });
      return;
    }

    // Determine if this should be primary (make first guide primary by default)
    const isPrimary = assignedGuides.length === 0;
    
    assignGuideMutation.mutate({ 
      guideId: selectedGuideId, 
      isPrimary 
    });
  };

  // Handle setting a guide as primary
  const handleSetPrimary = (guideId: number) => {
    updateGuideMutation.mutate({ id: guideId, isPrimary: true });
  };

  // Handle removing a guide
  const handleRemoveGuide = (guideId: number) => {
    removeGuideMutation.mutate(guideId);
  };

  // Get guide name from available guides
  const getGuideName = (guideId: string) => {
    const guide = availableGuides.find((g: Guide) => g.id === guideId);
    if (!guide) return 'Unknown Guide';
    return `${guide.firstName || ''} ${guide.lastName || ''}`.trim() || guide.email || 'No Name';
  };

  // Update parent component when assigned guides change
  useEffect(() => {
    if (onChange) {
      onChange(assignedGuides);
    }
  }, [assignedGuides, onChange]);

  // Filter out already assigned guides from the selection dropdown
  const availableForSelection = availableGuides.filter(
    (guide: Guide) => !assignedGuides.some((g: ExperienceGuide) => g.guideId === guide.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="guides-select">Assign Guides</Label>
        
        {!readOnly && (
          <div className="flex gap-2">
            <Select 
              value={selectedGuideId} 
              onValueChange={setSelectedGuideId}
              disabled={availableForSelection.length === 0}
            >
              <SelectTrigger id="guides-select" className="flex-1">
                <SelectValue placeholder="Select a guide to assign" />
              </SelectTrigger>
              <SelectContent>
                {availableForSelection.length === 0 ? (
                  <SelectItem value="none" disabled>No guides available</SelectItem>
                ) : (
                  availableForSelection.map((guide: Guide) => (
                    <SelectItem key={guide.id} value={guide.id}>
                      {`${guide.firstName || ''} ${guide.lastName || ''}`.trim() || guide.email || 'No Name'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAssignGuide} 
              disabled={!selectedGuideId || assignGuideMutation.isPending}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              {assignGuideMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Assigned Guides</Label>
        
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">Loading guides...</div>
        ) : assignedGuides.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">No guides assigned to this experience</div>
        ) : (
          <div className="space-y-2">
            {assignedGuides.map((assignment: ExperienceGuide) => (
              <Card key={assignment.id} className="overflow-hidden">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <span>{getGuideName(assignment.guideId)}</span>
                    {assignment.isPrimary && (
                      <Badge variant="default" className="ml-2 bg-amber-500">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  
                  {!readOnly && (
                    <div className="flex gap-2">
                      {!assignment.isPrimary && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSetPrimary(assignment.id)}
                          disabled={updateGuideMutation.isPending}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Make Primary
                        </Button>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveGuide(assignment.id)}
                        disabled={removeGuideMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}