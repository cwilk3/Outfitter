import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck, UserX, Star, PlusCircle, X, Info as InfoIcon } from 'lucide-react';
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
  
  // draftGuides and nextTempId states are removed

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

  // Fetch currently assigned guides for this experience internally
  const { 
    data: internalAssignedGuides = [], 
    isLoading: isLoadingInternalAssignedGuides,
    refetch: refetchInternalAssignedGuides
  } = useQuery<ExperienceGuide[]>({
    queryKey: ['/api/experiences', experienceId, 'guides'],
    queryFn: async () => {
      if (!experienceId || draftMode) return [];

      const response = await fetch(`/api/experiences/${experienceId}/guides`);
      if (!response.ok) throw new Error('Failed to fetch assigned guides');
      return response.json();
    },
    enabled: !!experienceId && !draftMode,
  });

  // --- REMOVED: useEffect for draftGuides initialization (now obsolete) ---

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
    onSuccess: (data, variables) => {
      // Invalidate queries to re-fetch the latest assigned guides
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/users', { roles: ['admin', 'guide'] }] }); 
      
      // No manual state updates. Rely on query invalidation.
      
      toast({
        title: 'Guide added!',
        description: 'The guide has been successfully assigned to this experience.',
      });
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
      // Rollback the optimistic update on error
      queryClient.setQueryData(['/api/experiences', experienceId, 'guides'], context?.previousAssignedGuides);
      
      // No onChange rollback call here. Rely on queryClient.setQueryData for rollback.
      
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update primary guide.',
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
      
      // No manual state updates. Rely on query invalidation.
      
      // Force refetch to ensure UI consistency
      setTimeout(() => {
        refetchInternalAssignedGuides();
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

  // Add a guide to an existing experience
  const addGuideMutation = useMutation({
    mutationFn: async ({ experienceId, guideId, isPrimary }: { experienceId: number; guideId: string; isPrimary: boolean }) => {
      console.log('🔍 [ADD_GUIDE_MUT_DEBUG] MutationFn called for guide addition.');
      console.log('🔍 [ADD_GUIDE_MUT_DEBUG] Payload:', { experienceId, guideId, isPrimary });
      
      // Make the POST API call to add a guide
      const response = await apiRequest('POST', `/api/experiences/${experienceId}/guides`, { guideId, isPrimary });
      
      console.log('🔍 [ADD_GUIDE_MUT_DEBUG] API response:', response);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to re-fetch the latest assigned guides
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', experienceId, 'guides'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/users', { roles: ['admin', 'guide'] }] }); 
      
      // No manual state updates. Rely on query invalidation.
      
      toast({
        title: 'Guide added!',
        description: 'The guide has been successfully assigned to this experience.',
      });
    },
    onError: (error) => {
      console.error('❌ [ADD_GUIDE_MUT_ERROR] Error during guide addition mutation:', error);
      toast({
        title: 'Addition failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during guide addition.',
        variant: 'destructive',
      });
    },
  });

  // Handle guide selection and assignment
  const handleAssignGuide = () => {
    if (!selectedGuideId) return;

    // Determine current guides and check for primary status correctly based on mode
    const currentGuides = draftMode ? initialDraftGuides : internalAssignedGuides;
    const isPrimary = currentGuides.length === 0;

    // Check if guide is already assigned in current state
    if (currentGuides.some((g: any) => g.guideId === selectedGuideId)) {
      toast({ title: 'Guide already assigned', description: 'This guide is already assigned to this experience.', variant: 'destructive' });
      return;
    }

    if (draftMode) {
      // In creation mode, notify parent to add guide to form state
      const newGuideAssignment = { tempId: Date.now(), guideId: selectedGuideId, isPrimary };
      const updatedGuides = [...initialDraftGuides, newGuideAssignment];
      if (onChange) onChange(updatedGuides);
      setSelectedGuideId('');
    } else {
      // In edit mode, call API immediately
      addGuideMutation.mutate({ 
        experienceId: experienceId!, 
        guideId: selectedGuideId, 
        isPrimary: isPrimary 
      });
      setSelectedGuideId('');
    }
  };

  // Handle setting a guide as primary
  const handleSetPrimary = (id: number) => {
    if (draftMode) {
      // In creation mode, update parent form state
      const updatedGuides = initialDraftGuides.map(guide => ({
        ...guide,
        isPrimary: guide.tempId === id
      }));
      if (onChange) onChange(updatedGuides);
    } else {
      // In edit mode, make API call
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
      onChange(internalAssignedGuides);
    }
  }, [internalAssignedGuides, onChange, draftMode]);

  // In pure query-based approach, guidesToDisplay comes directly from the query
  const guidesToDisplay = draftMode ? initialDraftGuides : internalAssignedGuides;
  
  // Filter out already assigned guides from the selection dropdown
  const availableForSelection = availableGuides.filter(
    (guide: Guide) => !guidesToDisplay.some((g: any) => g.guideId === guide.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="guides-select">Assign Guides</Label>
        
        {/* Display currently assigned guides as tags */}
        {guidesToDisplay.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
            {guidesToDisplay.map((assignment: any) => (
              <Badge 
                key={draftMode ? assignment.tempId : assignment.id} 
                variant={assignment.isPrimary ? "default" : "secondary"}
                className="flex items-center gap-1 px-2 py-1"
              >
                {assignment.isPrimary && <Star className="h-3 w-3" />}
                <span className="text-sm">{getGuideName(assignment.guideId)}</span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (draftMode) {
                        const updatedGuides = initialDraftGuides.filter(guide => guide.tempId !== assignment.tempId);
                        if (updatedGuides.length > 0 && !updatedGuides.some(g => g.isPrimary)) {
                          updatedGuides[0].isPrimary = true;
                        }
                        if (onChange) onChange(updatedGuides);
                      } else {
                        removeGuideMutation.mutate({ 
                          experienceId: experienceId!, 
                          guideId: assignment.guideId 
                        });
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        )}
        
        {!readOnly && (
          <div className="flex gap-2">
            <Select 
              value={selectedGuideId} 
              onValueChange={setSelectedGuideId}
              disabled={availableForSelection.length === 0}
            >
              <SelectTrigger id="guides-select" className="flex-1">
                <SelectValue placeholder={
                  availableForSelection.length === 0 
                    ? "All available guides assigned" 
                    : "Select a guide to assign"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableForSelection.length === 0 ? (
                  <SelectItem value="none" disabled>No more guides available</SelectItem>
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
              {(!draftMode && assignGuideMutation.isPending) ? 'Assigning...' : 'Add Guide'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Guide Details & Management</Label>
        
        {(!draftMode && isLoadingInternalAssignedGuides) ? (
          <div className="py-4 text-center text-muted-foreground">Loading guides...</div>
        ) : guidesToDisplay.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <UserX className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p>No guides assigned to this experience</p>
            <p className="text-xs">Use the dropdown above to assign guides</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guidesToDisplay.map((assignment: any) => (
              <Card key={draftMode ? assignment.tempId : assignment.id} className="overflow-hidden border-l-4" 
                    style={{ borderLeftColor: assignment.isPrimary ? '#f59e0b' : '#e5e7eb' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-green-600" />
                          <span className="font-medium">{getGuideName(assignment.guideId)}</span>
                          {assignment.isPrimary && (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                              <Star className="h-3 w-3 mr-1" />
                              Primary Guide
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground ml-7">
                          {assignment.isPrimary ? 'Lead guide for this experience' : 'Supporting guide'}
                        </p>
                      </div>
                    </div>
                    
                    {!readOnly && (
                      <div className="flex gap-2">
                        {!assignment.isPrimary && guidesToDisplay.length > 1 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();   
                              e.stopPropagation();  
                              handleSetPrimary(draftMode ? assignment.tempId : assignment.id);
                            }}
                            disabled={!draftMode && updateGuideMutation.isPending}
                            className="hover:bg-amber-50 hover:border-amber-300"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Make Primary
                          </Button>
                        )}
                        
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            if (draftMode) {
                              const updatedGuides = initialDraftGuides.filter(guide => guide.tempId !== assignment.tempId);
                              if (updatedGuides.length > 0 && !updatedGuides.some(g => g.isPrimary)) {
                                updatedGuides[0].isPrimary = true;
                              }
                              if (onChange) onChange(updatedGuides);
                            } else {
                              removeGuideMutation.mutate({ 
                                experienceId: experienceId!, 
                                guideId: assignment.guideId 
                              });
                            }
                          }}
                          disabled={!draftMode && removeGuideMutation.isPending}
                          className="hover:bg-destructive/90"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Guide assignment summary */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InfoIcon className="h-4 w-4" />
                <span>
                  {guidesToDisplay.length} guide{guidesToDisplay.length !== 1 ? 's' : ''} assigned
                  {guidesToDisplay.some(g => g.isPrimary) && ' • Primary guide highlighted'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}