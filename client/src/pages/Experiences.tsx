import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Experience, Location, ExperienceLocation } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Edit, MapPin, Calendar, Users, DollarSign, Trash2, AlertTriangle } from "lucide-react";

// Define form validation schema
const experienceSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  duration: z.coerce.number().positive({ message: "Duration must be a positive number." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  capacity: z.coerce.number().positive({ message: "Capacity must be a positive number." }),
  location: z.string().min(2, { message: "Location must be at least 2 characters." }),
  category: z.enum([
    "deer_hunting", 
    "duck_hunting", 
    "elk_hunting", 
    "pheasant_hunting", 
    "bass_fishing", 
    "trout_fishing",
    "other_hunting",
    "other_fishing"
  ], {
    required_error: "Please select a category.",
  }),
  selectedLocationIds: z.array(z.number()).optional(),
});

type ExperienceFormValues = z.infer<typeof experienceSchema>;

export default function Experiences() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [experienceToDelete, setExperienceToDelete] = useState<Experience | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Fetch experiences
  const { data: experiences, isLoading, error } = useQuery({
    queryKey: ['/api/experiences'],
  });
  
  // Fetch all locations for the multi-select
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
  });
  
  // State for tracking selected locations and experience-location mappings
  const [selectedLocIds, setSelectedLocIds] = useState<number[]>([]);
  const [experienceLocations, setExperienceLocations] = useState<{ [experienceId: number]: number[] }>({});

  // Form handling
  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 1,
      price: 0,
      capacity: 1,
      location: "",
      category: "deer_hunting",
      selectedLocationIds: [],
    },
  });

  // Create experience mutation
  const createMutation = useMutation({
    mutationFn: (newExperience: ExperienceFormValues) => 
      apiRequest('POST', '/api/experiences', newExperience),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      toast({
        title: "Experience created",
        description: "Your new experience has been created successfully",
      });
      form.reset();
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create experience. Please try again.",
        variant: "destructive",
      });
      console.error("Create experience error:", error);
    },
  });

  // Update experience mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExperienceFormValues }) => 
      apiRequest('PATCH', `/api/experiences/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      toast({
        title: "Experience updated",
        description: "The experience has been updated successfully",
      });
      form.reset();
      setSelectedExperience(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update experience. Please try again.",
        variant: "destructive",
      });
      console.error("Update experience error:", error);
    },
  });
  
  // Delete experience mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/experiences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      toast({
        title: "Experience deleted",
        description: "The experience has been deleted successfully",
      });
      setExperienceToDelete(null);
      setIsDeleteAlertOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete experience. Please try again.",
        variant: "destructive",
      });
      console.error("Delete experience error:", error);
      setIsDeleteAlertOpen(false);
    },
  });

  const onSubmit = async (data: ExperienceFormValues) => {
    try {
      if (selectedExperience) {
        // Update experience
        const result = await updateMutation.mutateAsync({ id: selectedExperience.id, data });
        
        // If we have location IDs selected, update the experience-location associations
        if (data.selectedLocationIds && data.selectedLocationIds.length > 0) {
          // First, remove all existing associations
          await apiRequest('DELETE', `/api/experiences/${selectedExperience.id}/locations`);
          
          // Then add each new location association
          for (const locationId of data.selectedLocationIds) {
            await apiRequest('POST', `/api/experiences/${selectedExperience.id}/locations`, { locationId });
          }
          
          // Invalidate the experiences query to refresh the data
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
          
          // Update our local state for associated locations
          setExperienceLocations(prevState => ({
            ...prevState,
            [selectedExperience.id]: data.selectedLocationIds || []
          }));
        }
      } else {
        // Create experience
        const result = await createMutation.mutateAsync(data);
        
        // If we have location IDs selected, create the experience-location associations
        if (data.selectedLocationIds && data.selectedLocationIds.length > 0 && result && result.id) {
          for (const locationId of data.selectedLocationIds) {
            await apiRequest('POST', `/api/experiences/${result.id}/locations`, { locationId });
          }
          
          // Invalidate the experiences query to refresh the data
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
        }
      }
      
      // Reset form and close dialog
      form.reset();
      if (selectedExperience) {
        setSelectedExperience(null);
      } else {
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error submitting experience:", error);
      toast({
        title: "Error",
        description: "Failed to save experience. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (experience: Experience) => {
    setSelectedExperience(experience);
    
    // Fetch the locations associated with this experience
    try {
      const associatedLocations = await apiRequest('GET', `/api/experiences/${experience.id}/locations`);
      const locationIds = associatedLocations?.map((loc: ExperienceLocation) => loc.locationId) || [];
      
      // Update selected location IDs
      setSelectedLocIds(locationIds);
      
      // Reset the form with the experience data and selected location IDs
      form.reset({
        name: experience.name,
        description: experience.description,
        duration: experience.duration,
        price: experience.price,
        capacity: experience.capacity,
        location: experience.location,
        category: experience.category as any,
        selectedLocationIds: locationIds,
      });
    } catch (error) {
      console.error("Error fetching experience locations:", error);
      toast({
        title: "Error",
        description: "Failed to load experience locations. Please try again.",
        variant: "destructive",
      });
      
      // Still reset the form with basic experience data if there was an error
      form.reset({
        name: experience.name,
        description: experience.description,
        duration: experience.duration,
        price: experience.price,
        capacity: experience.capacity,
        location: experience.location,
        category: experience.category as any,
        selectedLocationIds: [],
      });
    }
  };

  const openCreateDialog = () => {
    setSelectedExperience(null);
    setSelectedLocIds([]);
    form.reset({
      name: "",
      description: "",
      duration: 1,
      price: 0,
      capacity: 1,
      location: "",
      category: "deer_hunting",
      selectedLocationIds: [],
    });
    setIsCreating(true);
  };

  const closeDialog = () => {
    setIsCreating(false);
    setSelectedExperience(null);
  };
  
  // Fetch associated locations for all experiences when the component mounts
  // or when the experiences data changes
  useEffect(() => {
    const fetchLocationMappings = async () => {
      if (!experiences || experiences.length === 0) return;
      
      const mappings: { [experienceId: number]: number[] } = {};
      
      for (const experience of experiences) {
        try {
          const locationData = await apiRequest('GET', `/api/experiences/${experience.id}/locations`);
          mappings[experience.id] = locationData?.map((loc: any) => loc.locationId) || [];
        } catch (error) {
          console.error(`Error fetching locations for experience ${experience.id}:`, error);
        }
      }
      
      setExperienceLocations(mappings);
    };
    
    fetchLocationMappings();
  }, [experiences]);

  // Format category for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Experiences</h2>
            <p className="text-sm text-gray-600">Manage your hunting and fishing experiences</p>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Experiences</h2>
          <p className="text-sm text-gray-600">Manage your hunting and fishing experiences</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-600">Error loading experiences. Please try again later.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Experiences</h2>
          <p className="text-sm text-gray-600">Manage your hunting and fishing experiences</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Create Experience
        </Button>
      </div>

      {experiences && experiences.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((experience: Experience) => (
            <Card key={experience.id} className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle>{experience.name}</CardTitle>
                <CardDescription>{formatCategory(experience.category)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{experience.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{experience.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{experience.duration} day{experience.duration > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-500" />
                    <span>Max {experience.capacity} people</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(experience.price)}
                    </span>
                  </div>
                </div>
                
                {/* Show associated locations */}
                {experienceLocations[experience.id] && experienceLocations[experience.id].length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Available in:</h4>
                    <div className="flex flex-wrap gap-1">
                      {experienceLocations[experience.id].map(locId => {
                        const location = locations.find((l: Location) => l.id === locId);
                        return location ? (
                          <span 
                            key={locId} 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {location.city}, {location.state}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {isAdmin ? (
                  <div className="flex gap-2 w-full">
                    <Button 
                      onClick={() => openEditDialog(experience)}
                      variant="outline" 
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button 
                      onClick={() => {
                        setExperienceToDelete(experience);
                        setIsDeleteAlertOpen(true);
                      }}
                      variant="outline" 
                      className="flex-none text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    View Details
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">No experiences found.</p>
          {isAdmin && (
            <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Create Your First Experience
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Experience Dialog */}
      <Dialog open={isCreating || !!selectedExperience} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle>{selectedExperience ? 'Edit Experience' : 'Create Experience'}</DialogTitle>
            <DialogDescription>
              {selectedExperience 
                ? 'Update the details of your experience.' 
                : 'Add a new hunting or fishing experience for your customers.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-1">
              {/* Name field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Duck Hunting Adventure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the experience..." 
                        {...field} 
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 3-column grid for shorter fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* 2-column grid for location fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deer_hunting">Deer Hunting</SelectItem>
                          <SelectItem value="duck_hunting">Duck Hunting</SelectItem>
                          <SelectItem value="elk_hunting">Elk Hunting</SelectItem>
                          <SelectItem value="pheasant_hunting">Pheasant Hunting</SelectItem>
                          <SelectItem value="bass_fishing">Bass Fishing</SelectItem>
                          <SelectItem value="trout_fishing">Trout Fishing</SelectItem>
                          <SelectItem value="other_hunting">Other Hunting</SelectItem>
                          <SelectItem value="other_fishing">Other Fishing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mountain Lake" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Available locations section with scrollable area */}
              <FormField
                control={form.control}
                name="selectedLocationIds"
                render={() => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Available In</FormLabel>
                      <small className="text-xs text-gray-500">Select where this experience is offered</small>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 border rounded-md p-2 max-h-28 overflow-y-auto">
                      {locations && locations.length > 0 ? (
                        locations.map((location: Location) => (
                          <div key={location.id} className="flex items-center space-x-1.5">
                            <Checkbox 
                              id={`location-${location.id}`}
                              checked={form.getValues().selectedLocationIds?.includes(location.id)}
                              onCheckedChange={(checked) => {
                                const currentLocations = form.getValues().selectedLocationIds || [];
                                const updatedLocations = checked 
                                  ? [...currentLocations, location.id]
                                  : currentLocations.filter(id => id !== location.id);
                                
                                form.setValue("selectedLocationIds", updatedLocations, { 
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                                
                                // Update our state for tracking too
                                setSelectedLocIds(updatedLocations);
                              }}
                            />
                            <label 
                              htmlFor={`location-${location.id}`}
                              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {location.name} ({location.city})
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No locations available. Create locations first.</p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-2 pt-2 border-t space-x-2 flex-col sm:flex-row">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeDialog}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{selectedExperience ? 'Update' : 'Create'}</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Experience Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experience</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{experienceToDelete?.name}</span>?
              This action cannot be undone. This will permanently delete this experience
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (experienceToDelete) {
                  deleteMutation.mutate(experienceToDelete.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
