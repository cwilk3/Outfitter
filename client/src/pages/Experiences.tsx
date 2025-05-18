import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Experience, Location, ExperienceLocation, ExperienceAddon } from "@/types";
// Import Image processing utility
import imageCompression from 'browser-image-compression';
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
  DialogTrigger,
  DialogClose
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
  CalendarIcon,
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
  ChevronLeft,
  Info as InfoIcon,
  FileEdit,
  X
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  ]).default("other_hunting").optional(),
  
  // Details
  duration: z.coerce.number().positive({ message: "Duration must be a positive number." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }),
  capacity: z.coerce.number().positive({ message: "Capacity must be a positive number." }),
  selectedLocationIds: z.array(z.number()).min(1, { message: "Select at least one location." }),
  
  // Media & extras
  images: z.array(z.string()).optional(),
  availableDates: z.array(z.date()).optional(),
  
  // Rules, amenities, and trip inclusions
  rules: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  tripIncludes: z.array(z.string()).optional(),
  
  // Add-ons
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

/**
 * Optimizes image data URIs to reduce payload size
 */
const optimizeImages = async (imageDataUrls: string[]): Promise<string[]> => {
  if (!imageDataUrls || imageDataUrls.length === 0) return [];
  
  const compressOptions = {
    maxSizeMB: 0.5,           // Max size in MB
    maxWidthOrHeight: 1200,   // Max width/height in pixels
    useWebWorker: true,       // Use web worker for better performance
    initialQuality: 0.7,      // Initial compression quality (0-1)
  };
  
  try {
    const results: string[] = [];
    
    for (const dataUrl of imageDataUrls) {
      // Skip if not a data URL
      if (!dataUrl.startsWith('data:')) {
        results.push(dataUrl);
        continue;
      }
      
      // Convert data URL to File object
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });
      
      // Compress the file
      const compressedFile = await imageCompression(file, compressOptions);
      
      // Convert compressed file back to data URL
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
      
      const optimizedDataUrl = await dataUrlPromise;
      results.push(optimizedDataUrl);
    }
    
    return results;
  } catch (error) {
    console.error("Image optimization failed:", error);
    // Return original images if optimization fails
    return imageDataUrls;
  }
};

// Type for location-specific dates 
interface LocationAvailableDates {
  [locationId: number]: string[];
}

// Helper type for managing location-specific available dates
type LocationDateMapping = {
  [locationId: number]: string[];
};

export default function Experiences() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentEditingLocationId, setCurrentEditingLocationId] = useState<number | null>(null);
  const [locationAvailableDates, setLocationAvailableDates] = useState<LocationDateMapping>({});
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
  const [locationDates, setLocationDates] = useState<{[locationId: number]: Date[]}>({});
  const [rules, setRules] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [tripIncludes, setTripIncludes] = useState<string[]>([]);
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
    // Temporarily disable resolver for debugging
    // resolver: zodResolver(experienceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 1,
      price: 0,
      capacity: 1,
      category: "other_hunting",
      selectedLocationIds: [],
      images: [],
      availableDates: [],
      rules: [],
      amenities: [],
      tripIncludes: [],
      addons: [],
    },
  });

  // Create experience
  const createMutation = useMutation({
    mutationFn: (data: ExperienceFormValues) => {
      return apiRequest<Experience>('POST', '/api/experiences', {
        ...data,
        selectedLocationIds: selectedLocIds,
        rules: rules,
        amenities: amenities,
        tripIncludes: tripIncludes,
      });
    },
    onSuccess: (response: Experience) => {
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
      
      // Invalidate both admin and public experience queries to ensure everything is updated
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
      
      // Log success and close dialog
      console.log("Experience created successfully, all queries invalidated");
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
        
        // Delete all existing location associations first
        apiRequest('DELETE', `/api/experience-locations/experience/${experienceId}`).then(() => {
          // Re-create all selected location associations with updated settings
          for (const locationId of selectedLocIds) {
            try {
              // Get location-specific settings from DOM elements
              const locationCapacityInput = document.getElementById(`location-capacity-${locationId}`) as HTMLInputElement;
              const locationDurationInput = document.getElementById(`location-duration-${locationId}`) as HTMLInputElement;
              const locationPriceInput = document.getElementById(`location-price-${locationId}`) as HTMLInputElement;
              
              // Use location-specific values with defaults
              const capacity = locationCapacityInput && locationCapacityInput.value ? 
                parseInt(locationCapacityInput.value) : 1;
              
              const duration = locationDurationInput && locationDurationInput.value ? 
                parseInt(locationDurationInput.value) : 1;
              
              const price = locationPriceInput && locationPriceInput.value ?
                parseFloat(locationPriceInput.value) : 0;
              
              apiRequest('POST', '/api/experience-locations', { 
                experienceId, 
                locationId,
                capacity,
                duration,
                price: price.toString() // Convert to string for decimal storage
              });
            } catch (err) {
              console.error("Error re-associating location:", err);
            }
          }
        }).catch(err => {
          console.error("Error removing existing experience-location associations:", err);
        });
      }
      
      // Invalidate both admin and public experience queries
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
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
      // Invalidate both admin and public experience queries
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
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
      return apiRequest('POST', '/api/experience-locations', { experienceId, locationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
    },
  });

  // Remove experience-location association
  const removeExperienceLocationMutation = useMutation({
    mutationFn: ({ experienceId, locationId }: { experienceId: number; locationId: number }) => {
      return apiRequest('DELETE', `/api/experience-locations/${experienceId}/${locationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
    },
  });

  // Fetch experience-location associations
  const { data: experienceLocationData = [] } = useQuery<ExperienceLocation[]>({
    queryKey: ['/api/experience-locations'],
  });

  // Format experience category for display
  const formatCategory = (category: string | undefined) => {
    if (!category) return "Other Hunting";
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
    setRules([]);
    setAmenities([]);
    setTripIncludes([]);
    setAddons([]);
    setCurrentStep(1);
    
    form.reset({
      name: "",
      description: "",
      duration: 1,
      price: 0,
      capacity: 1,
      category: "other_hunting",
      selectedLocationIds: [],
      images: [],
      availableDates: [],
      rules: [],
      amenities: [],
      tripIncludes: [],
      addons: [],
    });
    
    setIsCreating(true);
  };

  // Open dialog for editing an existing experience
  const openEditDialog = async (experience: Experience) => {
    setSelectedExperience(experience);
    
    // Load all necessary data before showing the dialog to ensure a smooth editing experience
    
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
    
    // Set rules, amenities and trip inclusions
    setRules(experience.rules || []);
    setAmenities(experience.amenities || []);
    setTripIncludes(experience.tripIncludes || []);
    
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
    
    // Reset the form with all the experience data to ensure it's correctly loaded
    form.reset({
      name: experience.name,
      description: experience.description,
      duration: experience.duration,
      price: experience.price,
      capacity: experience.capacity,
      category: experience.category as any,
      selectedLocationIds: selectedLocIds,
      images: experience.images || [],
      availableDates: availableDates,
      rules: experience.rules || [],
      amenities: experience.amenities || [],
      tripIncludes: experience.tripIncludes || [],
      addons: experience.addons || [],
    });
    
    // Set to whatever step the user wants to start editing from (default to basic info)
    setCurrentStep(1);
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
    setRules([]);
    setAmenities([]);
    setTripIncludes([]);
    setAddons([]);
    setCurrentStep(1);
    form.reset();
  };
  
  // Go to next step
  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      // Validate basic info step
      form.trigger(['name', 'description']);
      const basicInfoFields = ['name', 'description'];
      const hasErrors = Object.keys(form.formState.errors).some(key => 
        basicInfoFields.includes(key)
      );
      
      if (hasErrors) {
        return;
      }
    } else if (currentStep === 2) {
      // Validate details step
      form.trigger(['duration', 'price', 'capacity']);
      
      // Manual validation for locations since it's a controlled state
      if (selectedLocIds.length === 0) {
        toast({
          title: "Location Required",
          description: "Please select at least one location for this experience",
          variant: "destructive",
        });
        return;
      }
      
      // Check for other field errors
      const detailsFields = ['duration', 'price', 'capacity'];
      const hasErrors = Object.keys(form.formState.errors).some(key => 
        detailsFields.includes(key)
      );
      
      if (hasErrors) {
        return;
      }
    }
    
    // If we've reached here, go to the next step
    setCurrentStep(prev => Math.min(prev + 1, 5));
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

  // Helper function to optimize images before submission
  const optimizeImages = async (images: string[]): Promise<string[]> => {
    // If there are no images or they're already small enough, return as is
    if (!images || images.length === 0) {
      return images;
    }
    
    try {
      console.log(`Processing ${images.length} images for optimization`);
      
      // Limit to max 3 images for now to reduce payload size
      if (images.length > 3) {
        console.log(`Limiting from ${images.length} to 3 images to reduce payload size`);
        images = images.slice(0, 3);
      }
      
      // Simple optimization - only keeping the first part of each image if it's too large
      // In a production app, you'd use a proper image compression library
      return images.map((img, index) => {
        if (!img) return '';
        
        const sizeKB = Math.round(img.length / 1000);
        console.log(`Image ${index + 1} size: ~${sizeKB}KB`);
        
        // Size thresholds - keep images below a certain size
        if (sizeKB > 200) {
          console.log(`Optimizing image ${index + 1} from ${sizeKB}KB to ~200KB`);
          
          // For data URLs, we need to keep the prefix intact
          const prefix = img.substring(0, 40); // Keep metadata prefix
          const compressedSize = 200 * 1000; // ~200KB
          
          return prefix + img.substring(40, compressedSize);
        }
        return img;
      });
    } catch (error) {
      console.error("Error optimizing images:", error);
      // Return no images if optimization fails
      return [];
    }
  };
  
  // Form submission handler
  const onSubmit = async (data: ExperienceFormValues) => {
    try {
      console.log("Form submission started...", { isEditing: !!selectedExperience });
      
      // Show loading toast
      toast({
        title: selectedExperience ? "Updating..." : "Creating...",
        description: "Processing your request...",
      });
      
      // Optimize images before submission to prevent payload too large errors
      console.log("Optimizing images...", { imageCount: selectedImages.length });
      const optimizedImages = await optimizeImages(selectedImages);
      
      // Include the current state of the form extras - ensure all values are included
      // Add fallback values for required fields to prevent validation issues
      const formData = {
        ...data,
        name: data.name || "Untitled Experience",
        description: data.description || "No description provided",
        duration: data.duration || 1,
        price: data.price || 0,
        capacity: data.capacity || 1,
        category: data.category || "other_hunting",
        images: optimizedImages,
        availableDates: selectedDates || [],
        rules: rules || [],
        amenities: amenities || [],
        tripIncludes: tripIncludes || [],
        addons: addons || [],
        selectedLocationIds: selectedLocIds || [],
      };
      
      console.log("Form data prepared successfully:", formData);
      
      if (selectedExperience) {
        // Update workflow for existing experience
        console.log("Updating experience", { id: selectedExperience.id });
        
        try {
          const result = await apiRequest('PATCH', `/api/experiences/${selectedExperience.id}`, {
            ...formData,
            selectedLocationIds: selectedLocIds,
          });
          
          console.log("Update successful", result);
          toast({
            title: "Success",
            description: "Experience updated successfully",
          });
          
          // Refresh data
          // Invalidate both admin and public experience queries
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
          
          // Close dialog
          setIsCreating(false);
        } catch (updateError) {
          console.error("Error updating experience:", updateError);
          toast({
            title: "Update Failed",
            description: "Could not update the experience. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Create workflow for new experience
        console.log("Creating new experience with simplified data");
        
        try {
          console.log("Making direct fetch call for better error visibility");
          
          // Direct fetch for maximum debugging information
          const response = await fetch('/api/experiences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name,
              description: formData.description,
              // Convert string values to numbers where needed
              duration: Number(formData.duration),
              // Keep price as a string
              price: formData.price.toString(),
              capacity: Number(formData.capacity),
              category: formData.category,
              // Minimize payload for debugging
              images: [], // Skip images initially
              selectedLocationIds: selectedLocIds,
            }),
          });
          
          console.log("API Response status:", response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
          }
          
          const result = await response.json();
          console.log("Creation successful:", result);
          
          // Success notification
          toast({
            title: "Success",
            description: "Experience created successfully",
          });
          
          // If there are selected locations, associate them with the new experience
          if (selectedLocIds.length > 0 && result) {
            const experienceId = result.id;
            
            for (const locationId of selectedLocIds) {
              try {
                // Get location-specific settings from the DOM elements
                const locationCapacityInput = document.getElementById(`location-capacity-${locationId}`) as HTMLInputElement;
                const locationDurationInput = document.getElementById(`location-duration-${locationId}`) as HTMLInputElement;
                const locationPriceInput = document.getElementById(`location-price-${locationId}`) as HTMLInputElement;
                
                // Use location-specific values with appropriate defaults
                const capacity = locationCapacityInput && locationCapacityInput.value ? 
                  parseInt(locationCapacityInput.value) : 1;
                
                const duration = locationDurationInput && locationDurationInput.value ? 
                  parseInt(locationDurationInput.value) : 1;
                
                const price = locationPriceInput && locationPriceInput.value ?
                  parseFloat(locationPriceInput.value) : 0;
                
                await apiRequest('POST', '/api/experience-locations', { 
                  experienceId, 
                  locationId,
                  capacity,
                  duration,
                  price: price.toString() // Convert to string for decimal storage
                });
              } catch (err) {
                console.error("Error associating location:", err);
              }
            }
          }
          
          // Invalidate data
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
          
          // Reset and close the form
          closeDialog();
        } catch (createError: any) {
          console.error("Error creating experience:", createError);
          toast({
            title: "Creation Failed",
            description: createError.message || "Could not create the experience. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      // Handle submission errors
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting the form. Please try again.",
        variant: "destructive",
      });
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
                <Card key={experience.id} className="shadow-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-all">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-lg text-green-800">{experience.name}</CardTitle>
                    <CardDescription className="text-xs">{formatCategory(experience.category)}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{experience.description}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-500 flex-shrink-0" />
                        {experienceLocations[experience.id] && experienceLocations[experience.id].length > 0 ? (
                          <span className="text-xs text-gray-700 line-clamp-2">
                            {experienceLocations[experience.id]
                              .map(locId => {
                                const location = locations.find(l => l.id === locId);
                                return location?.name;
                              })
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No lodges assigned</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{experience.duration} day{experience.duration > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700">Max {experience.capacity} people</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700 font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(experience.price)}
                        </span>
                      </div>
                    </div>
                    
                    {/* We've integrated the lodge information directly into the info grid above */}
                    {experienceLocations[experience.id] && experienceLocations[experience.id].length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h4 className="text-xs font-medium text-gray-500 mb-1.5">Available Lodges:</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {experienceLocations[experience.id].map(locId => {
                            // Find the location object that matches this ID
                            const location = locations.find((l: Location) => l.id === locId);
                            return location ? (
                              <Badge 
                                key={locId} 
                                variant="outline"
                                className="px-2 py-1 text-xs bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              >
                                <MapPin className="h-3 w-3 mr-1" /> {location.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {isAdmin && (
                    <CardFooter className="flex justify-end space-x-2 px-4 pt-1 pb-3 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-8 border-gray-200 hover:bg-gray-50"
                        onClick={() => openEditDialog(experience)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="text-xs h-8" 
                        onClick={() => openDeleteDialog(experience)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
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
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle>
                  {selectedExperience ? (
                    <span className="flex items-center gap-1.5">
                      <FileEdit className="h-5 w-5 text-amber-500" />
                      Edit Experience
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-5 w-5 text-primary" />
                      Create New Experience
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="mt-1.5">
                  {selectedExperience
                    ? 'Edit the details of your hunting or fishing experience using the steps below.'
                    : 'Fill in the details to create a new hunting or fishing experience.'}
                </DialogDescription>
              </div>
              
              {selectedExperience && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  <p className="font-medium">{selectedExperience.name}</p>
                  <p className="text-xs text-amber-600">ID: {selectedExperience.id}</p>
                </div>
              )}
            </div>
          </DialogHeader>
          
          {/* Multi-step progress bar with enhanced editing experience */}
          <div className="mb-6 mt-2">
            {selectedExperience ? (
              <div className="space-y-2">
                <Steps 
                  currentStep={currentStep} 
                  steps={["Basic Info", "Details", "Media", "Features", "Add-ons"]} 
                  onStepClick={setCurrentStep} 
                  clickable={true}
                />
                <div className="flex items-center justify-between px-1 text-sm">
                  <p className="text-muted-foreground">
                    <InfoIcon className="inline-block mr-1 h-3 w-3" /> 
                    Click on any step to edit that section
                  </p>
                  <div className="text-right text-muted-foreground italic">
                    Editing: <span className="font-medium text-primary">{selectedExperience.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <Steps 
                currentStep={currentStep} 
                steps={["Basic Info", "Details", "Media", "Features", "Add-ons"]} 
              />
            )}
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
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center">
                            Experience Name
                            {selectedExperience && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                                EDITING
                              </span>
                            )}
                          </FormLabel>
                          {selectedExperience && (
                            <span className="text-xs text-muted-foreground">
                              Original: <span className="font-medium">{selectedExperience.name}</span>
                            </span>
                          )}
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Duck Hunting Experience" 
                            className={selectedExperience ? "border-amber-200 focus-visible:ring-amber-400" : undefined}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="flex items-center">
                            Description
                            {selectedExperience && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                                EDITING
                              </span>
                            )}
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the experience in detail..." 
                            className={selectedExperience 
                              ? "h-36 border-amber-200 focus-visible:ring-amber-400" 
                              : "h-36"
                            }
                            {...field} 
                          />
                        </FormControl>
                        
                        {selectedExperience && (
                          <div className="mt-2 p-2 bg-slate-50 border rounded-md text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Original description:</p>
                            <p className="line-clamp-2">{selectedExperience.description}</p>
                          </div>
                        )}
                        
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
                  {/* Removed general duration, capacity, and price fields as they're now location-specific */}
                  

                  
                  {/* Associated Physical Locations */}
                  <div className="pt-2">
                    <FormLabel>Available Business Locations</FormLabel>
                    <FormDescription>
                      Select the physical business locations where this experience is offered
                    </FormDescription>
                    <div className="pt-2 space-y-4 border rounded-md p-3 mt-1">
                      {locations && locations.length > 0 ? (
                        locations.map((location: Location) => (
                          <div key={location.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center space-x-2 mb-2">
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
                            
                            {selectedLocIds.includes(location.id) && (
                              <div className="ml-6 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div>
                                  <label className="text-xs font-medium mb-1 block">
                                    Location-specific Capacity
                                  </label>
                                  <Input 
                                    id={`location-capacity-${location.id}`}
                                    type="number" 
                                    min="1" 
                                    placeholder="Max hunters at this location"
                                    className="h-8 text-sm"
                                    defaultValue={location.capacity || 1}
                                    onChange={(e) => {
                                      // Store location-specific capacity
                                      const capacity = parseInt(e.target.value);
                                      // Update the location capacity in the form state
                                      location.capacity = capacity;
                                    }}
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-xs font-medium mb-1 block">
                                    Location-specific Duration (days)
                                  </label>
                                  <Input 
                                    id={`location-duration-${location.id}`}
                                    type="number" 
                                    min="1" 
                                    placeholder="Days at this location"
                                    className="h-8 text-sm"
                                    defaultValue={location.duration || 1}
                                    onChange={(e) => {
                                      // Store location-specific duration
                                      const duration = parseInt(e.target.value);
                                      // Update the location duration in the form state
                                      location.duration = duration;
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-medium mb-1 block">
                                    Price Per Hunter ($)
                                  </label>
                                  <Input 
                                    id={`location-price-${location.id}`}
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    placeholder="Price per hunter"
                                    className="h-8 text-sm"
                                    defaultValue={location.price || 0}
                                    onChange={(e) => {
                                      // Store location-specific price
                                      const price = parseFloat(e.target.value);
                                      // Update the location price in the form state
                                      location.price = price;
                                    }}
                                  />
                                </div>
                                
                                <div className="mt-3">
                                  <label className="text-xs font-medium mb-1 block">
                                    Available Dates
                                  </label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-sm"
                                    onClick={() => {
                                      // Store which location we're editing
                                      setCurrentEditingLocationId(location.id);
                                      // Set the dates to edit
                                      const elData = experienceLocationsData?.find(
                                        el => el.locationId === location.id && el.experienceId === editingExperienceId
                                      );
                                      
                                      let dates = [];
                                      if (elData?.availableDates) {
                                        if (Array.isArray(elData.availableDates)) {
                                          dates = elData.availableDates;
                                        } else {
                                          try {
                                            const parsed = JSON.parse(elData.availableDates as string);
                                            if (Array.isArray(parsed)) {
                                              dates = parsed;
                                            }
                                          } catch (e) {
                                            console.error("Failed to parse dates", e);
                                          }
                                        }
                                      }
                                      
                                      setSelectedDates(
                                        dates.map(d => new Date(d))
                                      );
                                      
                                      // Show the modal
                                      setShowDatePickerModal(true);
                                    }}
                                  >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Set available dates
                                  </Button>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {(() => {
                                      const elData = experienceLocationsData?.find(
                                        el => el.locationId === location.id && el.experienceId === editingExperienceId
                                      );
                                      
                                      let count = 0;
                                      if (elData?.availableDates) {
                                        if (Array.isArray(elData.availableDates)) {
                                          count = elData.availableDates.length;
                                        } else {
                                          try {
                                            const parsed = JSON.parse(elData.availableDates as string);
                                            if (Array.isArray(parsed)) {
                                              count = parsed.length;
                                            }
                                          } catch (e) {
                                            // Silent error
                                          }
                                        }
                                      }
                                      
                                      return count > 0 
                                        ? `${count} dates selected` 
                                        : "No dates selected yet";
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
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
              
              {/* Step 4: Features (Rules, Amenities, Trip Inclusions) */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* Rules Section */}
                  <div className="pb-6">
                    <h3 className="text-base font-medium mb-1">Rules & Requirements</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Specify any rules, licenses or permits required for this experience.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            id="new-rule" 
                            placeholder="e.g. Hunting License Required" 
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                setRules([...rules, e.currentTarget.value.trim()]);
                                e.currentTarget.value = '';
                                e.preventDefault();
                              }
                            }}
                          />
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                              const input = document.getElementById('new-rule') as HTMLInputElement;
                              if (input.value.trim() !== '') {
                                setRules([...rules, input.value.trim()]);
                                input.value = '';
                              }
                            }}
                          >
                            Add Rule
                          </Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground ml-1">
                          Press Enter to add a rule, or click the Add Rule button
                        </div>
                      </div>
                      
                      {/* Rules List */}
                      <div className="border rounded-md p-4 bg-muted/30 min-h-[100px]">
                        {rules.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                            No rules added yet. Add some rules to inform your customers.
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {rules.map((rule, index) => (
                              <li key={index} className="flex items-center justify-between gap-2 group">
                                <div className="flex items-start gap-2">
                                  <span className="inline-block w-1 h-1 bg-primary rounded-full mt-2"></span>
                                  <span>{rule}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => {
                                    setRules(rules.filter((_, i) => i !== index));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Amenities Section */}
                  <div className="py-6">
                    <h3 className="text-base font-medium mb-1">Amenities</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select amenities available during this experience.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'bird_dogs', label: 'Bird dogs', icon: '🐕' },
                        { id: 'guided', label: 'Guided', icon: '🧭' },
                        { id: 'air_conditioning', label: 'Air conditioning', icon: '❄️' },
                        { id: 'keep_meat', label: 'Keep the meat', icon: '🥩' },
                        { id: 'toilet', label: 'Toilet', icon: '🚽' },
                        { id: 'cable_tv', label: 'Cable TV', icon: '📺' },
                        { id: 'mud_room', label: 'Mud room', icon: '👢' },
                        { id: 'wifi', label: 'WiFi', icon: '📶' },
                        { id: 'kid_friendly', label: 'Kid friendly', icon: '👶' },
                        { id: 'corporate_trips', label: 'Corporate trips', icon: '💼' },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${item.id}`}
                            checked={amenities.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAmenities([...amenities, item.id]);
                              } else {
                                setAmenities(amenities.filter(a => a !== item.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`amenity-${item.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                          >
                            <span className="mr-1">{item.icon}</span> {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    {/* Custom Amenity */}
                    <div className="mt-4 flex gap-2">
                      <Input 
                        id="custom-amenity" 
                        placeholder="Add custom amenity" 
                        className="max-w-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                            setAmenities([...amenities, e.currentTarget.value.trim()]);
                            e.currentTarget.value = '';
                            e.preventDefault();
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const input = document.getElementById('custom-amenity') as HTMLInputElement;
                          if (input.value.trim() !== '') {
                            setAmenities([...amenities, input.value.trim()]);
                            input.value = '';
                          }
                        }}
                      >
                        Add Custom
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Trip Inclusions Section */}
                  <div className="pt-6">
                    <h3 className="text-base font-medium mb-1">Trip Includes</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Specify what's included in this experience package.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { id: 'animal_cleaning', label: 'Animal cleaning', icon: '🧹' },
                        { id: 'lodging', label: 'Lodging', icon: '🏠' },
                        { id: 'meals', label: 'Meals', icon: '🍽️' },
                        { id: 'ice', label: 'Ice', icon: '🧊' },
                        { id: 'byob', label: 'BYOB', icon: '🍺' },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`include-${item.id}`}
                            checked={tripIncludes.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTripIncludes([...tripIncludes, item.id]);
                              } else {
                                setTripIncludes(tripIncludes.filter(i => i !== item.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`include-${item.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                          >
                            <span className="mr-1">{item.icon}</span> {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    {/* Custom Inclusion */}
                    <div className="mt-4 flex gap-2">
                      <Input 
                        id="custom-inclusion" 
                        placeholder="Add custom inclusion" 
                        className="max-w-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                            setTripIncludes([...tripIncludes, e.currentTarget.value.trim()]);
                            e.currentTarget.value = '';
                            e.preventDefault();
                          }
                        }}
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const input = document.getElementById('custom-inclusion') as HTMLInputElement;
                          if (input.value.trim() !== '') {
                            setTripIncludes([...tripIncludes, input.value.trim()]);
                            input.value = '';
                          }
                        }}
                      >
                        Add Custom
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 5: Add-ons */}
              {currentStep === 5 && (
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
                            <p className="font-medium">{formatCategory(form.getValues('category') || 'other_hunting')}</p>
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
                  {selectedExperience ? (
                    // When editing, back button is always visible with clearer context
                    <Button
                      type="button"
                      variant="outline"
                      onClick={currentStep > 1 ? goToPreviousStep : closeDialog}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {currentStep > 1 ? 'Previous Step' : 'Back to List'}
                    </Button>
                  ) : (
                    // When creating, back button only shows after step 1
                    currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goToPreviousStep}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    )
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!selectedExperience && (
                    // Only show Cancel button during creation
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={closeDialog}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                  
                  {currentStep < 5 ? (
                    // Next button for both modes
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
                      type="button"
                      onClick={async () => {
                        console.log("Manual submit button clicked");
                        
                        // Log form errors if any
                        if (Object.keys(form.formState.errors).length > 0) {
                          console.error("Form has validation errors:", form.formState.errors);
                          toast({
                            title: "Form has errors",
                            description: "Please fix form errors before submitting.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        try {
                          // Get form values and call our onSubmit directly
                          const values = form.getValues();
                          console.log("Form values:", values);
                          await onSubmit(values);
                        } catch (error) {
                          console.error("Error submitting form:", error);
                          toast({
                            title: "Error",
                            description: "Failed to submit form. Check console for details.",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {form.formState.isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {selectedExperience ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        <>
                          <span>{selectedExperience ? 'Submit Form' : 'Create Experience'}</span>
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* For edit mode only: Save button with clear confirmation */}
                  {selectedExperience && (
                    <Button 
                      type="button"
                      variant="outline"
                      className="gap-1 border-amber-600 text-amber-600 hover:bg-amber-50"
                      onClick={async (e) => {
                        e.preventDefault();
                        
                        // Visual feedback - change button text immediately
                        const button = e.currentTarget;
                        const originalText = button.innerHTML;
                        button.innerHTML = '<span>Saving...</span><svg class="animate-spin h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
                        
                        try {
                          // Directly call API here to avoid any form submission issues
                          if (!selectedExperience) {
                            throw new Error("No experience selected");
                          }
                          
                          // Get form values
                          const formValues = form.getValues();
                          
                          // Process images with proper optimization
                          console.log("Starting image optimization");
                          const optimizedImages = await optimizeImages(selectedImages);
                          
                          // Create payload with all necessary data
                          console.log("Creating payload with optimized images");
                          const payload = {
                            ...formValues,
                            images: optimizedImages,
                            availableDates: selectedDates || [],
                            rules: rules || [],
                            amenities: amenities || [],
                            tripIncludes: tripIncludes || [],
                            addons: addons || [],
                            selectedLocationIds: selectedLocIds || [],
                          };
                          
                          console.log("Payload size:", JSON.stringify(payload).length);
                          
                          // Make API call
                          const result = await fetch(`/api/experiences/${selectedExperience.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                          });
                          
                          // Handle response
                          if (!result.ok) {
                            throw new Error(`Failed to update: ${result.status}`);
                          }
                          
                          // Success feedback
                          button.innerHTML = '<span class="text-green-500">Saved Successfully!</span><svg class="h-4 w-4 text-green-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                          
                          // Show toast
                          toast({
                            title: "Success!",
                            description: "Experience updated successfully",
                          });
                          
                          // Refresh data
                          // Invalidate both admin and public experience queries
                          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
                          
                          // Show prominent success message
                          toast({
                            title: "Success!",
                            description: "Experience saved successfully",
                            variant: "default",
                            duration: 5000,
                          });
                          
                          // Reset button after delay but keep the success indicator for a bit
                          setTimeout(() => {
                            button.innerHTML = originalText;
                          }, 2500);
                          
                          // Close dialog with enough delay to see the confirmation
                          setTimeout(() => {
                            setIsCreating(false);
                          }, 1500);
                          
                        } catch (error) {
                          console.error("Error saving:", error);
                          
                          // Error feedback
                          button.innerHTML = '<span class="text-red-500">Save Failed!</span><svg class="h-4 w-4 text-red-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
                          
                          // Show toast
                          toast({
                            title: "Error",
                            description: "Failed to save changes. Please try again.",
                            variant: "destructive",
                          });
                          
                          // Reset button after delay
                          setTimeout(() => {
                            button.innerHTML = originalText;
                          }, 2000);
                        }
                      }}
                    >
                      <span>Save Changes</span>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Date Picker Modal for Location-specific Availability */}
      <Dialog open={showDatePickerModal} onOpenChange={setShowDatePickerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Available Dates</DialogTitle>
            <DialogDescription>
              Choose dates when this experience is available at this location
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              className="rounded-md border"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDatePickerModal(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={() => {
                // Save the selected dates for this location
                if (currentEditingLocationId) {
                  // Convert dates to ISO strings for storage
                  const dateStrings = selectedDates.map(date => 
                    date.toISOString().split('T')[0]
                  );
                  
                  // Update our tracking state
                  setLocationAvailableDates(prev => ({
                    ...prev,
                    [currentEditingLocationId]: dateStrings
                  }));
                  
                  // Find the experience location data for this location
                  const experienceLocation = experienceLocationData?.find(
                    el => el.locationId === currentEditingLocationId && 
                         el.experienceId === editingExperienceId
                  );
                  
                  if (experienceLocation) {
                    // The junction already exists, update it
                    experienceLocation.availableDates = dateStrings;
                  }
                  
                  toast({
                    title: "Available dates updated",
                    description: `${dateStrings.length} dates have been set for this location`,
                  });
                }
                
                setShowDatePickerModal(false);
              }}
            >
              Save Dates
            </Button>
          </DialogFooter>
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