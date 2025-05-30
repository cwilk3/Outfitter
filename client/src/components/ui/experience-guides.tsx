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

// For draft mode - temporary guide assignments during creation
interface DraftGuideAssignment {
  tempId: number; // Local identifier for draft mode
  guideId: string;
  isPrimary: boolean;
}

interface ExperienceGuidesProps {
  experienceId: number;
  onChange?: (guides: ExperienceGuide[] | DraftGuideAssignment[]) => void;
  readOnly?: boolean;
  draftMode?: boolean; // New prop to indicate we're in creation flow
  initialDraftGuides?: DraftGuideAssignment[]; // For restoring draft state
}

export function ExperienceGuides({ 
  experienceId, 
  onChange, 
  readOnly = false, 
  draftMode = false,
  initialDraftGuides = []
}: ExperienceGuidesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGuideId, setSelectedGuideId] = useState<string>('');
  
  // For draft mode - local state for guide assignments
  const [draftGuides, setDraftGuides] = useState<DraftGuideAssignment[]>(initialDraftGuides);
  const [nextTempId, setNextTempId] = useState<number>(initialDraftGuides.length + 1);

  // Fetch available guides with 'admin' and 'guide' roles
  const { data: availableGuides = [] } = useQuery({
    queryKey: ['/api/users', { roles: ['admin', 'guide'] }],
    queryFn: async () => {
      const response = await fetch('/api/users?role=admin,guide');
      if (!response.ok) throw new Error('Failed to fetch guides');
      return response.json();
    },
    enabled: !readOnly,
  });

  // Fetch currently assigned guides for this experience (only in non-draft mode)
  const { 
    data: assignedGuides = [], 
    isLoading,
    refetch: refetchAssignedGuides 
  } = useQuery({
    queryKey: ['/api/experiences', experienceId, 'guides'],
    queryFn: async () => {
      // Handle case for new experiences (no ID yet) or draft mode
      if (!experienceId || draftMode) return [];
      
      const response = await fetch(`/api/experiences/${experienceId}/guides`);
      if (!response.ok) throw new Error('Failed to fetch assigned guides');
      return response.json();
    },
  });

  // Assign a guide to the experience
  const assignGuideMutation = useMutation({
    mutationFn: async (data: { guideId: string; isPrimary: boolean }) => {
      // --- START NEW MUTATIONFN DIAGNOSTIC LOGGING ---
      console.log('🔍 [MUTATION_FN_DEBUG] MutationFn called.');
      console.log('🔍 [MUTATION_FN_DEBUG] Payload received by mutationFn:', { guideId: data.guideId, isPrimary: data.isPrimary, experienceId });
      // --- END NEW MUTATIONFN DIAGNOSTIC LOGGING ---

      console.log(`[CLIENT] Assigning guide ${data.guideId} to experience ID ${experienceId}`);
      console.log(`[CLIENT] Experience ID type: ${typeof experienceId}, value: ${experienceId}`);
      
      try {
        // --- START FETCH DIAGNOSTIC LOGGING ---
        console.log('🔍 [FETCH_DEBUG] About to perform experience verification fetch.');
        console.log('🔍 [FETCH_DEBUG] Experience check URL:', `/api/experiences/${experienceId}`);
        // --- END FETCH DIAGNOSTIC LOGGING ---

        // First, try to get the actual experience details to ensure it exists
        const experienceCheck = await fetch(`/api/experiences/${experienceId}`);
        
        if (!experienceCheck.ok) {
          console.error(`[CLIENT] Experience ${experienceId} check failed: ${experienceCheck.status}`);
          throw new Error(`Cannot find experience with ID ${experienceId}`);
        }
        
        const experienceData = await experienceCheck.json();
        console.log(`[CLIENT] Verified experience exists: ${experienceData.name} (ID: ${experienceData.id})`);
        
        // --- START GUIDE ASSIGNMENT FETCH DIAGNOSTIC LOGGING ---
        console.log('🔍 [FETCH_DEBUG] About to perform guide assignment fetch.');
        console.log('🔍 [FETCH_DEBUG] Assignment URL:', `/api/experiences/${experienceId}/guides`);
        console.log('🔍 [FETCH_DEBUG] Assignment Method: POST');
        console.log('🔍 [FETCH_DEBUG] Assignment Headers:', { 'Content-Type': 'application/json' });
        console.log('🔍 [FETCH_DEBUG] Assignment Body:', JSON.stringify(data));
        // --- END GUIDE ASSIGNMENT FETCH DIAGNOSTIC LOGGING ---

        // Now perform the guide assignment
        const response = await fetch(`/api/experiences/${experienceId}/guides`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Note: No Authorization header - this might be the issue!
          },
          body: JSON.stringify(data),
        });
        
        console.log('🔍 [FETCH_DEBUG] Guide assignment response received. Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[CLIENT] Guide assignment failed: ${response.status} ${errorText}`);
          throw new Error(`Failed to assign guide: ${errorText || response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`[CLIENT] Guide assignment successful:`, result);
        
        // Verify the assignment was successful by immediately checking
        const verifyResponse = await fetch(`/api/experiences/${experienceId}/guides`);
        if (verifyResponse.ok) {
          const guides = await verifyResponse.json();
          console.log(`[CLIENT] Verification - found ${guides.length} guides, checking for new assignment:`, guides);
          
          const assigned = guides.some((g: any) => g.guideId === data.guideId);
          if (!assigned) {
            console.warn(`[CLIENT] Verification failed - newly assigned guide ${data.guideId} not found in response!`);
            // We'll continue anyway since the assignment API returned success
          } else {
            console.log(`[CLIENT] Verification successful - guide ${data.guideId} found in assigned guides`);
          }
        }
        
        return result;
      } catch (error) {
        console.error('[CLIENT] Error in guide assignment process:', error);
        // --- START ENHANCED ERROR LOGGING ---
        if (error instanceof Error) {
          console.error('❌ [MUTATION_FN_DEBUG] Error message:', error.message);
          console.error('❌ [MUTATION_FN_DEBUG] Error stack:', error.stack);
        } else {
          console.error('❌ [MUTATION_FN_DEBUG] Non-Error object thrown:', error);
        }
        // --- END ENHANCED ERROR LOGGING ---
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`[CLIENT] Guide assignment mutation succeeded:`, data);
      
      // Aggressively invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      
      // Force multiple refetches to ensure UI is updated - this helps with in-memory storage
      const performRefetch = () => {
        console.log(`[CLIENT] Forcing guide assignments refetch for experience ${experienceId}`);
        refetchAssignedGuides();
      };
      
      // Stagger the refetches to ensure data is up-to-date
      setTimeout(performRefetch, 100);
      setTimeout(performRefetch, 500);
      
      toast({
        title: 'Guide assigned',
        description: 'The guide has been successfully assigned to this experience.',
      });
      setSelectedGuideId('');
    },
    onError: (error) => {
      // --- START ENHANCED MUTATION ERROR LOGGING ---
      console.error('❌ [MUTATION_ERROR] Error during guide assignment mutation:', error);
      if (error instanceof Error) {
        console.error('❌ [MUTATION_ERROR] Error message:', error.message);
        console.error('❌ [MUTATION_ERROR] Error stack:', error.stack);
      } else if (typeof error === 'object' && error !== null) {
        console.error('❌ [MUTATION_ERROR] Full error object:', JSON.stringify(error, null, 2));
      } else {
        console.error('❌ [MUTATION_ERROR] Unknown error type:', error);
      }
      // --- END ENHANCED MUTATION ERROR LOGGING ---

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign guide. Please try again.',
        variant: 'destructive',
      });
      console.error('[CLIENT] Error assigning guide:', error);
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
      console.log(`Removing guide assignment with ID: ${id}`);
      const response = await fetch(`/api/experience-guides/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error removing guide: ${response.status} ${errorText}`);
        throw new Error(`Failed to remove guide: ${errorText || response.statusText}`);
      }
      
      // Success - return the ID that was deleted since the endpoint returns 204 No Content
      return id;
    },
    onSuccess: (deletedId) => {
      console.log(`Guide assignment ${deletedId} successfully removed`);
      
      // Force invalidate all related queries to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      
      // Wait a moment then explicitly refetch to ensure UI is updated immediately
      setTimeout(() => {
        refetchAssignedGuides();
      }, 100);
      
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
    
    if (draftMode) {
      // In draft mode, add to local state instead of making API call
      
      // Check if guide is already assigned in draft state
      if (draftGuides.some(g => g.guideId === selectedGuideId)) {
        toast({
          title: 'Guide already assigned',
          description: 'This guide is already assigned to this experience.',
          variant: 'destructive',
        });
        return;
      }
      
      // Determine if this should be primary (make first guide primary by default)
      const isPrimary = draftGuides.length === 0;
      
      // Create a new draft assignment with a temporary ID
      const newDraftGuide: DraftGuideAssignment = {
        tempId: nextTempId,
        guideId: selectedGuideId,
        isPrimary
      };
      
      // Update local state
      const updatedDraftGuides = [...draftGuides, newDraftGuide];
      setDraftGuides(updatedDraftGuides);
      setNextTempId(nextTempId + 1);
      setSelectedGuideId('');
      
      // Notify parent component
      if (onChange) {
        onChange(updatedDraftGuides);
      }
    } else {
      // In normal mode, make API call
      
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
      
      // --- START NEW FRONTEND DIAGNOSTIC LOGGING ---
      console.log('🔍 [FRONTEND_ASSIGN_DEBUG] Attempting guide assignment API call.');
      console.log('🔍 [FRONTEND_ASSIGN_DEBUG] Guide ID being sent:', selectedGuideId);
      console.log('🔍 [FRONTEND_ASSIGN_DEBUG] Experience ID:', experienceId);
      console.log('🔍 [FRONTEND_ASSIGN_DEBUG] isPrimary flag:', isPrimary);
      console.log('🔍 [FRONTEND_ASSIGN_DEBUG] Request Payload for Mutation:', {
        guideId: selectedGuideId,
        isPrimary: isPrimary,
        experienceId: experienceId
      });
      // --- END NEW FRONTEND DIAGNOSTIC LOGGING ---
      
      assignGuideMutation.mutate({ 
        guideId: selectedGuideId, 
        isPrimary 
      });
    }
  };

  // Handle setting a guide as primary
  const handleSetPrimary = (id: number) => {
    if (draftMode) {
      // In draft mode, update local state
      const updatedDraftGuides = draftGuides.map(guide => ({
        ...guide,
        isPrimary: guide.tempId === id
      }));
      
      setDraftGuides(updatedDraftGuides);
      
      // Notify parent component
      if (onChange) {
        onChange(updatedDraftGuides);
      }
    } else {
      // In normal mode, make API call
      updateGuideMutation.mutate({ id, isPrimary: true });
    }
  };

  // Handle removing a guide
  const handleRemoveGuide = (id: number) => {
    if (draftMode) {
      // In draft mode, remove from local state
      const updatedDraftGuides = draftGuides.filter(guide => guide.tempId !== id);
      
      // If we removed the primary guide, make the first guide primary (if any)
      if (updatedDraftGuides.length > 0 && !updatedDraftGuides.some(g => g.isPrimary)) {
        updatedDraftGuides[0].isPrimary = true;
      }
      
      setDraftGuides(updatedDraftGuides);
      
      // Notify parent component
      if (onChange) {
        onChange(updatedDraftGuides);
      }
    } else {
      // In normal mode, make API call and handle the UI update
      console.log(`[CLIENT] Removing guide with ID ${id} in normal mode`);
      
      // Find the guide being removed from current assignments (for better logging)
      const guideBeingRemoved = assignedGuides.find((g: ExperienceGuide) => g.id === id);
      if (guideBeingRemoved) {
        console.log(`[CLIENT] Removing guide ${guideBeingRemoved.guideId} from experience ${experienceId}`);
      }
      
      // Show loading state while deletion is in progress
      toast({
        title: 'Removing guide...',
        description: 'Please wait while we remove the guide assignment.',
      });
      
      // Call the mutation to remove guide on server
      removeGuideMutation.mutate(id, {
        onSuccess: () => {
          console.log(`[CLIENT] Guide removal success for ID ${id}`);
          
          // Perform an eager update of the UI - just log for now since we rely on refetch
          console.log(`[CLIENT] Would filter out guide with ID ${id} from current list:`, 
                      assignedGuides.filter((g: ExperienceGuide) => g.id !== id));
          
          // After a short delay, force a complete refresh to ensure sync with server
          setTimeout(() => {
            console.log('[CLIENT] Performing forced refetch after guide removal');
            refetchAssignedGuides();
          }, 500);
        }
      });
    }
  };

  // Get guide name from available guides
  const getGuideName = (guideId: string) => {
    const guide = availableGuides.find((g: Guide) => g.id === guideId);
    if (!guide) return 'Unknown Guide';
    return `${guide.firstName || ''} ${guide.lastName || ''}`.trim() || guide.email || 'No Name';
  };

  // Update parent component when assigned guides change (in non-draft mode)
  useEffect(() => {
    if (onChange && !draftMode) {
      onChange(assignedGuides);
    }
  }, [assignedGuides, onChange, draftMode]);

  // Determine which guides to display based on mode
  const guidesToDisplay = draftMode ? draftGuides : assignedGuides;
  
  // Filter out already assigned guides from the selection dropdown
  const availableForSelection = availableGuides.filter(
    (guide: Guide) => !guidesToDisplay.some((g: any) => g.guideId === guide.id)
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
              disabled={!selectedGuideId || (!draftMode && assignGuideMutation.isPending)}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              {(!draftMode && assignGuideMutation.isPending) ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Assigned Guides</Label>
        
        {(!draftMode && isLoading) ? (
          <div className="py-4 text-center text-muted-foreground">Loading guides...</div>
        ) : guidesToDisplay.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">No guides assigned to this experience</div>
        ) : (
          <div className="space-y-2">
            {guidesToDisplay.map((assignment: any) => (
              <Card key={draftMode ? assignment.tempId : assignment.id} className="overflow-hidden">
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
                          onClick={() => handleSetPrimary(draftMode ? assignment.tempId : assignment.id)}
                          disabled={!draftMode && updateGuideMutation.isPending}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Make Primary
                        </Button>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleRemoveGuide(draftMode ? assignment.tempId : assignment.id)}
                        disabled={!draftMode && removeGuideMutation.isPending}
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