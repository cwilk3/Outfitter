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
import { apiRequest } from '@/lib/queryClient';

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
      console.log(`[CLIENT] Assigning guide ${data.guideId} to experience ID ${experienceId}`);
      console.log(`[CLIENT] Experience ID type: ${typeof experienceId}, value: ${experienceId}`);
      
      try {
        const result = await apiRequest('POST', `/api/experiences/${experienceId}/guides`, data);
        console.log(`[CLIENT] Guide assignment successful:`, result);
        return result;
      } catch (error) {
        console.error('[CLIENT] Error in guide assignment process:', error);
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
    mutationFn: async ({ id, isPrimary }: { id: number; isPrimary: boolean }) => {
      const response = await apiRequest('PUT', `/api/experience-guides/${id}`, { isPrimary });
      return response;
    },
    
    onMutate: async (newGuideData: { id: number; isPrimary: boolean }) => {
      // Cancel any outgoing refetches for the guides query to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });

      // Snapshot the previous value
      const previousAssignedGuides = queryClient.getQueryData<ExperienceGuide[]>(['/api/experiences', experienceId, 'guides']);
      
      // Optimistically update the cache
      queryClient.setQueryData<ExperienceGuide[]>(
        ['/api/experiences', experienceId, 'guides'],
        (oldGuides) => {
          if (!oldGuides) return [];
          const updated = oldGuides.map(guide => ({
            ...guide,
            isPrimary: guide.id === newGuideData.id // Set the current guide as primary
          }));
          // If setting primary to true, ensure others are false
          if (newGuideData.isPrimary) {
            updated.forEach(guide => {
              if (guide.id !== newGuideData.id) {
                guide.isPrimary = false;
              }
            });
          }
          return updated;
        }
      );
      
      // Also update the local assignedGuides state and notify parent immediately
      // This is the part that updates the UI directly, before the API call returns
      const updatedAssignedGuidesOptimistic = (assignedGuides || []).map((g: ExperienceGuide) => ({
          ...g,
          isPrimary: g.id === newGuideData.id // Set the selected guide as primary
      }));
      if (newGuideData.isPrimary) {
          updatedAssignedGuidesOptimistic.forEach((g: ExperienceGuide) => {
              if (g.id !== newGuideData.id) {
                  g.isPrimary = false;
              }
          });
      }
      if (onChange) {
          onChange(updatedAssignedGuidesOptimistic);
      }

      return { previousAssignedGuides }; // Return a context object with the old data
    },
    
    onSuccess: (data, variables, context) => {
      // Invalidate queries to re-fetch latest assigned guides (this will confirm optimistic update or correct state)
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] }); // May need to invalidate main experiences too
      queryClient.invalidateQueries({ queryKey: ['/api/users', { roles: ['admin', 'guide'] }] }); // Invalidate available guides if needed
      
      toast({
        title: 'Guide updated!',
        description: `Guide ${variables.isPrimary ? 'made primary' : 'status updated'}.`,
      });
    },
    
    onError: (error, newGuideData, context) => {
      // If the mutation fails, use the context to roll back the optimistic update
      if (context?.previousAssignedGuides) {
        queryClient.setQueryData(
          ['/api/experiences', experienceId, 'guides'],
          context.previousAssignedGuides
        );
        // Also roll back local state if onChange was called
        if (onChange) {
            onChange(context.previousAssignedGuides);
        }
      }
      
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    },
  });

  // Remove a guide assignment
  const removeGuideMutation = useMutation({
    mutationFn: async ({ experienceId, guideId }: { experienceId: number; guideId: string }) => {
      const response = await apiRequest('DELETE', `/api/experiences/${experienceId}/guides/${guideId}`);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', { roles: ['admin', 'guide'] }] });
      
      // Update local state by filtering the removed guide
      const updatedAssignedGuides = (assignedGuides || []).filter(
        (g: ExperienceGuide) => g.guideId !== variables.guideId
      );
      
      // Notify parent component about the change in assigned guides
      if (onChange) {
        onChange(updatedAssignedGuides); 
      }
      
      // Force refetch to ensure UI consistency
      setTimeout(() => {
        refetchAssignedGuides();
      }, 100);
      
      toast({
        title: 'Guide unassigned!',
        description: 'The guide has been successfully removed from this experience.',
      });
    },
    onError: (error) => {
      console.error('❌ [FRONTEND_UNASSIGN_ERROR] Error during guide unassignment mutation:', error);
      toast({
        title: 'Unassignment failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during unassignment.',
        variant: 'destructive',
      });
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

  // --- REMOVED handleRemoveGuide FUNCTION ---
  // This function was not being executed by the UI button clicks.
  // Guide removal is handled through a different code path.
  // --- END REMOVED handleRemoveGuide FUNCTION ---

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
                          onClick={(e) => {
                            e.preventDefault();   
                            e.stopPropagation();  
                            

                            
                            handleSetPrimary(draftMode ? assignment.tempId : assignment.id);
                          }}
                          disabled={!draftMode && updateGuideMutation.isPending}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Make Primary
                        </Button>
                      )}
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={(e) => {
                          // Prevent event bubbling and default behavior
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // --- START NEW ONCLICK DIAGNOSTIC LOGGING ---
                          console.log('--- DIAGNOSTIC: X Button onClick Handler Called ---');
                          console.log('🔍 [ONCLICK_DEBUG] Assignment object passed:', JSON.stringify(assignment, null, 2));
                          console.log('🔍 [ONCLICK_DEBUG] current draftMode:', draftMode);
                          console.log('🔍 [ONCLICK_DEBUG] current experienceId:', experienceId);
                          // --- END NEW ONCLICK DIAGNOSTIC LOGGING ---

                          if (draftMode) {
                            // In draft mode, remove from local state
                            const updatedDraftGuides = draftGuides.filter(guide => guide.tempId !== assignment.tempId);
                            
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
                            // In normal mode, call API and update state
                            removeGuideMutation.mutate({ 
                              experienceId: experienceId!, 
                              guideId: assignment.guideId 
                            }, {
                              onSuccess: () => {
                                // Update local draftGuides state immediately
                                const updatedDraftGuides = draftGuides.filter(
                                  (g: any) => g.guideId !== assignment.guideId
                                );
                                // Call onChange to notify parent component
                                if (onChange) {
                                  onChange(updatedDraftGuides);
                                }
                              }
                            });
                          }
                        }}
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