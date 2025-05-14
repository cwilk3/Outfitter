import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Experience, Location, ExperienceLocation, ExperienceAddon } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LocationsContent from "@/pages/LocationsContent";
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
import { format } from "date-fns";
import { Steps } from "@/components/ui/steps";
import { ImageUpload } from "@/components/ui/image-upload";
import { DateAvailability } from "@/components/ui/date-availability";
import { ExperienceAddons, Addon } from "@/components/ui/experience-addons";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Calendar, 
  Users, 
  DollarSign, 
  Trash2, 
  AlertTriangle, 
  MapPin,
  BookOpen,
  Image,
  Clock,
  Tag,
  Check,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

// Define form validation schema
const experienceSchema = z.object({
  // Basic info
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
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
  
  // Details
  duration: z.coerce.number().positive({ message: "Duration must be a positive number." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  capacity: z.coerce.number().positive({ message: "Capacity must be a positive number." }),
  location: z.string().min(2, { message: "Location must be at least 2 characters." }),
  selectedLocationIds: z.array(z.number()).optional(),
  
  // Media & extras
  images: z.array(z.string()).optional(),
  availableDates: z.array(z.date()).optional(),
  addons: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number().min(0),
      isOptional: z.boolean().default(true),
    })
  ).optional(),
});

type ExperienceFormValues = z.infer<typeof experienceSchema>;

export default function Experiences() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [experienceToDelete, setExperienceToDelete] = useState<Experience | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  type AddonType = {
    name: string;
    description: string;
    price: number;
    isOptional: boolean;
  };
  
  // State for new form fields
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [addons, setAddons] = useState<AddonType[]>([]);

  // Fetch experiences
  const { data: experiences = [], isLoading, error } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });
  
  // Fetch all locations for the multi-select
  const { data: locations = [] } = useQuery<Location[]>({
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
      images: [],
      availableDates: [],
      addons: [],
    },
  });

  // Create experience
  const createMutation = useMutation({
    mutationFn: (data: ExperienceFormValues) => {
      return apiRequest<Experience>('POST', '/api/experiences', {
        ...data,
        selectedLocationIds: selectedLocIds,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Experience created successfully",
      });
      
      // If there are selected locations, associate them with the new experience
      if (selectedLocIds.length > 0) {
        const experienceId = response.id;
        
        for (const locationId of selectedLocIds) {
          addExperienceLocationMutation.mutate({
            experienceId,
            locationId,
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create experience",
        variant: "destructive",
      });
    },
  });

  // Update experience
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExperienceFormValues }) => {
      return apiRequest('PATCH', `/api/experiences/${id}`, {
        ...data,
        selectedLocationIds: selectedLocIds,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Experience updated successfully",
      });
      
      // Handle location associations
      if (selectedExperience) {
        const experienceId = selectedExperience.id;
        const existingLocations = experienceLocations[experienceId] || [];
        
        // Remove locations that were unselected
        for (const locationId of existingLocations) {
          if (!selectedLocIds.includes(locationId)) {
            removeExperienceLocationMutation.mutate({
              experienceId,
              locationId,
            });
          }
        }
        
        // Add newly selected locations
        for (const locationId of selectedLocIds) {
          if (!existingLocations.includes(locationId)) {
            addExperienceLocationMutation.mutate({
              experienceId,
              locationId,
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experienceLocations'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update experience",
        variant: "destructive",
      });
    },
  });

  // Delete experience
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/experiences/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Experience deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      setIsDeleteAlertOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete experience",
        variant: "destructive",
      });
    },
  });

  // Add experience-location association
  const addExperienceLocationMutation = useMutation({
    mutationFn: ({ experienceId, locationId }: { experienceId: number; locationId: number }) => {
      return apiRequest('POST', '/api/experienceLocations', { experienceId, locationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experienceLocations'] });
    },
  });

  // Remove experience-location association
  const removeExperienceLocationMutation = useMutation({
    mutationFn: ({ experienceId, locationId }: { experienceId: number; locationId: number }) => {
      return apiRequest('DELETE', `/api/experienceLocations/${experienceId}/${locationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experienceLocations'] });
    },
  });

  // Fetch experience-location associations
  const { data: experienceLocationData = [] } = useQuery<ExperienceLocation[]>({
    queryKey: ['/api/experienceLocations'],
  });

  // Format experience category for display
  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Process experience-location data when it changes
  useEffect(() => {
    if (experienceLocationData && experienceLocationData.length > 0) {
      const locationsMap: { [experienceId: number]: number[] } = {};
      
      for (const item of experienceLocationData) {
        if (!locationsMap[item.experienceId]) {
          locationsMap[item.experienceId] = [];
        }
        locationsMap[item.experienceId].push(item.locationId);
      }
      
      setExperienceLocations(locationsMap);
    }
  }, [experienceLocationData]);

  // Open dialog for creating a new experience
  const openCreateDialog = () => {
    setSelectedExperience(null);
    setSelectedLocIds([]);
    setSelectedImages([]);
    setSelectedDates([]);
    setAddons([]);
    setCurrentStep(1);
    
    form.reset({
      name: "",
      description: "",
      duration: 1,
      price: 0,
      capacity: 1,
      location: "",
      category: "deer_hunting",
      selectedLocationIds: [],
      images: [],
      availableDates: [],
      addons: [],
    });
    
    setIsCreating(true);
  };

  // Open dialog for editing an existing experience
  const openEditDialog = async (experience: Experience) => {
    setSelectedExperience(experience);
    setCurrentStep(1);
    
    // Get associated locations for this experience
    const associatedLocations = experienceLocationData?.filter(
      (el: ExperienceLocation) => el.experienceId === experience.id
    );
    
    // Set selected location IDs
    if (associatedLocations && associatedLocations.length > 0) {
      const locationIds = associatedLocations?.map((loc: ExperienceLocation) => loc.locationId) || [];
      setSelectedLocIds(locationIds);
    } else {
      setSelectedLocIds([]);
    }
    
    // Set images if available
    setSelectedImages(experience.images || []);
    
    // Set available dates if available (convert strings to Date objects)
    const availableDates = experience.availableDates 
      ? experience.availableDates.map(dateStr => new Date(dateStr))
      : [];
    setSelectedDates(availableDates);
    
    // Set addons if available
    if (experience.addons) {
      setAddons(experience.addons.map(addon => ({
        name: addon.name,
        description: addon.description || '',
        price: addon.price,
        isOptional: addon.isOptional
      })));
    } else {
      setAddons([]);
    }
    
    form.reset({
      name: experience.name,
      description: experience.description,
      duration: experience.duration,
      price: experience.price,
      capacity: experience.capacity,
      location: experience.location,
      category: experience.category as any,
      selectedLocationIds: selectedLocIds,
      images: experience.images || [],
      availableDates: availableDates,
      addons: experience.addons || [],
    });
    
    setIsCreating(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (experience: Experience) => {
    setExperienceToDelete(experience);
    setIsDeleteAlertOpen(true);
  };

  // Close dialog and reset form
  const closeDialog = () => {
    setIsCreating(false);
    setSelectedExperience(null);
    setSelectedLocIds([]);
    setSelectedImages([]);
    setSelectedDates([]);
    setAddons([]);
    setCurrentStep(1);
    form.reset();
  };
  
  // Go to next step
  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      // Validate basic info step
      form.trigger();
      const basicInfoFields = ['name', 'description', 'category'];
      const hasErrors = Object.keys(form.formState.errors).some(key => 
        basicInfoFields.includes(key)
      );
      
      if (hasErrors) {
        return;
      }
    } else if (currentStep === 2) {
      // Validate details step
      form.trigger();
      const detailsFields = ['duration', 'price', 'capacity', 'location'];
      const hasErrors = Object.keys(form.formState.errors).some(key => 
        detailsFields.includes(key)
      );
      
      if (hasErrors) {
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };
  
  // Go to previous step
  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Toggle a location selection
  const toggleLocationSelection = (locationId: number) => {
    setSelectedLocIds(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // Form submission handler
  const onSubmit = async (data: ExperienceFormValues) => {
    // Include the current state of the form extras
    const formData = {
      ...data,
      images: selectedImages,
      availableDates: selectedDates,
      addons: addons,
      selectedLocationIds: selectedLocIds,
    };
    
    if (selectedExperience) {
      updateMutation.mutate({
        id: selectedExperience.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="pb-3">
                <Skeleton className="h-24 w-full mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Experiences & Locations</h2>
        <p className="text-sm text-gray-600">Manage hunting/fishing experiences and business locations</p>
      </div>

      <Tabs defaultValue="experiences" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="experiences" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" /> Experiences
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" /> Locations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="experiences" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Experiences</h3>
              <p className="text-sm text-gray-600">Manage your hunting and fishing offerings</p>
            </div>
            {isAdmin && (
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Create Experience
              </Button>
            )}
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
                            // Find the location object that matches this ID
                            const location = locations.find((l: Location) => l.id === locId);
                            return location ? (
                              <span 
                                key={locId} 
                                className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center"
                              >
                                <MapPin className="h-3 w-3 mr-1" /> {location.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {isAdmin && (
                    <CardFooter className="flex justify-end space-x-2 pt-2 px-6 pb-4">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(experience)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => openDeleteDialog(experience)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg bg-muted/30">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Experiences Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first hunting or fishing experience.
              </p>
              {isAdmin && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" /> Create First Experience
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="locations">
          <LocationsContent />
        </TabsContent>
      </Tabs>

      {/* Experience Form Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExperience ? 'Edit Experience' : 'Create New Experience'}</DialogTitle>
            <DialogDescription>
              {selectedExperience
                ? 'Edit the details of your hunting or fishing experience.'
                : 'Fill in the details to create a new hunting or fishing experience.'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Multi-step progress bar */}
          <div className="mb-6 mt-2">
            <Steps 
              currentStep={currentStep} 
              steps={["Basic Info", "Details", "Media", "Add-ons"]} 
            />
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Experience Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Duck Hunting Experience" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                              <SelectValue placeholder="Select a category" />
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the experience in detail..." 
                            className="h-36"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a detailed description of the experience that will appear on the booking page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Step 2: Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Capacity</FormLabel>
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
                          <FormLabel>Base Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Description</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Northern Ranch" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is a general location description visible to customers.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Associated Physical Locations */}
                  <div className="pt-2">
                    <FormLabel>Available Business Locations</FormLabel>
                    <FormDescription>
                      Select the physical business locations where this experience is offered
                    </FormDescription>
                    <div className="pt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 mt-1">
                      {locations && locations.length > 0 ? (
                        locations.map((location: Location) => (
                          <div className="flex items-center space-x-2" key={location.id}>
                            <Checkbox
                              id={`location-${location.id}`}
                              checked={selectedLocIds.includes(location.id)}
                              onCheckedChange={() => toggleLocationSelection(location.id)}
                            />
                            <label
                              htmlFor={`location-${location.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {location.name} ({location.city}, {location.state})
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No locations available. Add some in the Locations tab first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Media */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-1">Experience Images</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload images that showcase your experience. High-quality photos help attract more bookings.
                    </p>
                    
                    <ImageUpload 
                      images={selectedImages}
                      onChange={setSelectedImages}
                      maxImages={5}
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-base font-medium mb-1">Available Dates</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select the dates when this experience is available for booking.
                    </p>
                    
                    <DateAvailability
                      selectedDates={selectedDates}
                      onChange={setSelectedDates}
                    />
                  </div>
                </div>
              )}
              
              {/* Step 4: Add-ons */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium mb-1">Add-ons & Extras</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create optional or required add-ons that customers can choose when booking.
                    </p>
                    
                    <ExperienceAddons
                      addons={addons}
                      onChange={setAddons}
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-base font-medium">Review</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Review your experience details before submitting.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-muted p-4 rounded-md">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Name</h4>
                            <p className="font-medium">{form.getValues('name')}</p>
                          </div>
                          <div>
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Category</h4>
                            <p className="font-medium">{formatCategory(form.getValues('category'))}</p>
                          </div>
                          <div>
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Duration</h4>
                            <p className="font-medium">{form.getValues('duration')} days</p>
                          </div>
                          <div>
                            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Price</h4>
                            <p className="font-medium">${form.getValues('price')}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center bg-muted/50 p-3 rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Images</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedImages.length} of 5 images
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {selectedImages.length > 0 ? 'Added' : 'None'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center bg-muted/50 p-3 rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Available Dates</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedDates.length} dates selected
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {selectedDates.length > 0 ? 'Added' : 'None'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center bg-muted/50 p-3 rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium">Add-ons & Extras</p>
                          <p className="text-xs text-muted-foreground">
                            {addons.length} add-ons defined
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {addons.length > 0 ? 'Added' : 'None'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={closeDialog}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button 
                      type="button"
                      onClick={goToNextStep}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="gap-1"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <span>{selectedExperience ? 'Update' : 'Create'}</span>
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
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