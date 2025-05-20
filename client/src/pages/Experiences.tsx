import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Experience, Location, ExperienceLocation, ExperienceAddon } from "@/types";
import { ExperienceGuides } from "@/components/ui/experience-guides";
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
  Copy,
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
  locationId: z.number({ required_error: "Location is required" }),
  
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

export default function Experiences() {
  const { toast } = useToast();
  const { isAdmin, isGuide, user } = useRole();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false); // Default to showing all experiences
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [experienceToDelete, setExperienceToDelete] = useState<Experience | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  // Duplicate experience dialog state
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [experienceToDuplicate, setExperienceToDuplicate] = useState<Experience | null>(null);
  const [selectedDuplicateLocationId, setSelectedDuplicateLocationId] = useState<number | null>(null);
  
  type AddonType = {
    id?: number;
    name: string;
    description: string;
    price: number;
    isOptional: boolean;
    inventory?: number;
    maxPerBooking?: number;
  };
  
  // State for new form fields
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [tripIncludes, setTripIncludes] = useState<string[]>([]);
  const [addons, setAddons] = useState<AddonType[]>([]);

  // Fetch all experiences
  const { data: experiences = [], isLoading, error } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });
  
  // Fetch experiences assigned to the current guide (if user is a guide)
  const { data: assignedExperiences = [] } = useQuery<Experience[]>({
    queryKey: ['/api/guides', user?.id, 'experiences'],
    queryFn: async () => {
      if (!isGuide || !user?.id) return [];
      
      const response = await fetch(`/api/guides/${user.id}/experiences`);
      if (!response.ok) throw new Error('Failed to fetch assigned experiences');
      return response.json();
    },
    enabled: isGuide && !!user?.id,
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
      locationId: 1, // Default to first location
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
      // Create a payload using the provided locationId value
      const payload = {
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price,
        capacity: data.capacity,
        category: data.category,
        // Use the provided locationId, with a fallback to 1 if none is specified
        locationId: data.locationId || 1,
        rules: rules,
        amenities: amenities,
        tripIncludes: tripIncludes,
        images: data.images,
        availableDates: data.availableDates
      };
      
      // Log the exact payload being sent with emphasized locationId
      console.log("Creating experience with payload:", payload);
      console.log("  ↳ Using locationId:", payload.locationId);
      
      return apiRequest<Experience>('POST', '/api/experiences', payload);
    },
    onSuccess: (response: Experience) => {
      toast({
        title: "Success",
        description: "Experience created successfully",
      });
      
      // If there is a selected location, associate it with the new experience
      if (selectedLocIds.length > 0) {
        const experienceId = response.id;
        const locationId = selectedLocIds[0];
        
        addExperienceLocationMutation.mutate({
          experienceId,
          locationId,
        });
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
      // Make sure we keep the original locationId if it's already set
      // This ensures we don't lose the location when editing a duplicated experience
      const currentExperience = experiences?.find(exp => exp.id === id);
      const locationId = selectedLocIds.length > 0 
        ? selectedLocIds[0] 
        : (currentExperience?.locationId || null);
      
      return apiRequest('PATCH', `/api/experiences/${id}`, {
        ...data,
        locationId,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Experience updated successfully",
      });
      
      // Handle location associations - but more carefully to avoid removing the only location
      if (selectedExperience) {
        const experienceId = selectedExperience.id;
        const existingLocations = experienceLocations[experienceId] || [];
        
        // Only handle location changes if there are selected locations
        // This ensures we don't accidentally remove the only location
        if (selectedLocIds.length > 0) {
          // Remove locations that were unselected, but never remove the last location
          // to prevent experience from being orphaned
          for (const locationId of existingLocations) {
            if (!selectedLocIds.includes(locationId) && (existingLocations.length > 1 || selectedLocIds.length > 0)) {
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

  // Duplicate experience
  const duplicateExperienceMutation = useMutation({
    mutationFn: ({ experienceId, locationId }: { experienceId: number, locationId: number }) => {
      return apiRequest('POST', `/api/experiences/${experienceId}/duplicate`, { locationId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Experience duplicated successfully",
      });
      // Invalidate both admin and public experience queries
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
      closeDuplicateDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate experience",
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

  // Open dialog for duplicating an experience
  const openDuplicateDialog = (experience: Experience) => {
    setExperienceToDuplicate(experience);
    setSelectedDuplicateLocationId(null);
    setIsDuplicateDialogOpen(true);
  };
  
  // Close duplicate dialog
  const closeDuplicateDialog = () => {
    setIsDuplicateDialogOpen(false);
    setExperienceToDuplicate(null);
    setSelectedDuplicateLocationId(null);
  };
  
  // Handle duplicating an experience to a new location
  const handleDuplicateExperience = () => {
    if (experienceToDuplicate && selectedDuplicateLocationId) {
      // Create a new experience object based on the selected one
      // We need to ensure the type compatibility with ExperienceFormValues
      const newExperience: ExperienceFormValues = {
        name: `${experienceToDuplicate.name} (Copy)`,
        description: experienceToDuplicate.description,
        price: typeof experienceToDuplicate.price === 'string' 
          ? parseFloat(experienceToDuplicate.price) 
          : experienceToDuplicate.price,
        duration: experienceToDuplicate.duration,
        capacity: experienceToDuplicate.capacity,
        // Assert the category as a valid enum type for type safety
        category: experienceToDuplicate.category as "bass_fishing" | "trout_fishing" | "deer_hunting" | "duck_hunting" | "elk_hunting" | "pheasant_hunting" | "other_hunting" | "other_fishing",
        // Set locationId to the selected location
        locationId: selectedDuplicateLocationId,
        images: experienceToDuplicate.images || [],
        availableDates: [],
      };
      
      // Save the selected location ID for later use
      // This tells the mutation not to create any junction table entries
      // since we're directly setting the locationId field
      setSelectedLocIds([]);
      
      // Create the experience using the createMutation
      createMutation.mutate(newExperience);
      
      // Close dialog after submitting
      closeDuplicateDialog();
    } else {
      toast({
        title: "Error",
        description: "Please select a location to duplicate this experience to",
        variant: "destructive",
      });
    }
  };
  
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
      locationId: 0,
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
    
    // Set locationId based on the experience's locationId or use experience-locations table for backward compatibility
    if (experience.locationId) {
      // Direct locationId is available (new model)
      setSelectedLocIds([experience.locationId]);
    } else {
      // Fall back to experience-locations for backward compatibility
      const associatedLocations = experienceLocationData?.filter(
        (el: ExperienceLocation) => el.experienceId === experience.id
      );
      
      if (associatedLocations && associatedLocations.length > 0) {
        const locationIds = associatedLocations?.map((loc: ExperienceLocation) => loc.locationId) || [];
        setSelectedLocIds(locationIds.length > 0 ? [locationIds[0]] : []); // Just take the first one for our new model
      } else {
        setSelectedLocIds([]);
      }
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
    
    // Fetch the latest add-ons data directly from the API
    try {
      console.log(`Fetching fresh add-ons data for experience ${experience.id}`);
      const addonResponse = await fetch(`/api/experience-addons/${experience.id}`);
      if (addonResponse.ok) {
        const freshAddons = await addonResponse.json();
        console.log(`Fetched ${freshAddons.length} add-ons for experience ${experience.id}`, freshAddons);
        
        // Update the addons state with the fresh data
        setAddons(freshAddons.map((addon: any) => ({
          id: addon.id, // Preserve the ID for updates
          name: addon.name,
          description: addon.description || '',
          price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price,
          isOptional: addon.isOptional !== undefined ? addon.isOptional : true,
          // Include any other fields needed
          inventory: addon.inventory,
          maxPerBooking: addon.maxPerBooking
        })));
      } else {
        console.error(`Failed to fetch add-ons: ${addonResponse.status}`);
        // Fallback to using the add-ons data from the experience object
        if (experience.addons) {
          setAddons(experience.addons.map(addon => ({
            id: addon.id, // Make sure to include ID if available
            name: addon.name,
            description: addon.description || '',
            price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price,
            isOptional: addon.isOptional !== undefined ? addon.isOptional : true
          })));
        } else {
          setAddons([]);
        }
      }
    } catch (addonError) {
      console.error("Error fetching add-ons:", addonError);
      // Fallback to the add-ons in the experience object
      if (experience.addons) {
        setAddons(experience.addons.map(addon => ({
          id: addon.id,
          name: addon.name,
          description: addon.description || '',
          price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price,
          isOptional: addon.isOptional !== undefined ? addon.isOptional : true
        })));
      } else {
        setAddons([]);
      }
    }
    
    // Reset the form with all the experience data to ensure it's correctly loaded
    form.reset({
      name: experience.name,
      description: experience.description,
      duration: experience.duration,
      price: experience.price,
      capacity: experience.capacity,
      category: experience.category as any,
      locationId: selectedLocIds.length > 0 ? selectedLocIds[0] : 0,
      images: experience.images || [],
      availableDates: availableDates,
      rules: experience.rules || [],
      amenities: experience.amenities || [],
      tripIncludes: experience.tripIncludes || [],
      // Use the fresh add-ons data in the form
      addons: addons,
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
      
      // Manual validation for location since it's a controlled state
      if (selectedLocIds.length === 0) {
        toast({
          title: "Location Required",
          description: "Please select a location for this experience",
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

  // Set a single location selection
  const toggleLocationSelection = (locationId: number) => {
    setSelectedLocIds(prev => 
      prev.includes(locationId)
        ? [] // Deselect if clicking the same location
        : [locationId] // Replace with only this location
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
      
      // Limit to max 5 images to reduce payload size
      if (images.length > 5) {
        console.log(`Limiting from ${images.length} to 5 images to reduce payload size`);
        images = images.slice(0, 5);
      }
      
      // Safely process each image without truncating or corrupting the data
      return images.map((img, index) => {
        // Skip processing if the image is empty or not a string
        if (!img || typeof img !== 'string') {
          console.log(`Skipping invalid image at index ${index}`);
          return '';
        }
        
        // Check if the image is a URL (not a data URL)
        if (img.startsWith('http')) {
          console.log(`Image ${index + 1} is a URL, keeping as is`);
          return img;
        }
        
        // For data URLs, perform basic validation but don't manipulate them
        if (img.startsWith('data:image/')) {
          const sizeKB = Math.round(img.length / 1000);
          console.log(`Image ${index + 1} size: ~${sizeKB}KB (keeping intact)`);
          
          // Don't truncate the data - just return it as is
          // This prevents corruption of the image data
          return img;
        }
        
        console.log(`Image ${index + 1} has unknown format, using with caution`);
        return img;
      });
    } catch (error) {
      console.error("Error optimizing images:", error);
      // Return original images instead of empty array if optimization fails
      console.log("Returning original images due to optimization error");
      return images;
    }
  };
  
  // Form submission handler
  const onSubmit = async (data: ExperienceFormValues) => {
    try {
      console.log("Form submission started...", { isEditing: !!selectedExperience });
      console.log("Current addons state:", addons);
      
      // Show loading toast
      toast({
        title: selectedExperience ? "Updating..." : "Creating...",
        description: "Processing your request...",
      });
      
      // Optimize images before submission to prevent payload too large errors
      console.log("Optimizing images...", { imageCount: selectedImages.length });
      
      // First, validate all images to make sure they're valid
      const validImages = selectedImages.filter(img => 
        img && 
        typeof img === 'string' && 
        (img.startsWith('data:image/') || img.startsWith('http'))
      );
      
      console.log(`Found ${validImages.length} valid images out of ${selectedImages.length}`);
      
      // Then optimize them (with our improved optimization function)
      const optimizedImages = await optimizeImages(validImages);
      
      // CRITICAL FIX: Create a brand new object with the minimum required fields
      // This prevents any undefined fields or data structure issues
      const basicData = {
        name: data.name || "Untitled Experience",
        description: data.description || "No description provided",
        locationId: 1, // CRITICAL: Always use a valid locationId
        duration: parseInt(String(data.duration || 1)),
        price: parseFloat(String(data.price || 0)),
        capacity: parseInt(String(data.capacity || 1)),
        category: data.category || "other_hunting",
        images: optimizedImages,
        availableDates: selectedDates || [],
        rules: rules || [],
        amenities: amenities || [],
        tripIncludes: tripIncludes || [],
        addons: addons || [],
      };
      
      console.log("Data prepared successfully:", basicData);
      
      if (selectedExperience) {
        // Update workflow for existing experience
        console.log("Updating experience", { id: selectedExperience.id });
        
        try {
          // Step 1: Update the experience data
          const result = await apiRequest('PATCH', `/api/experiences/${selectedExperience.id}`, {
            ...basicData,
            locationId: selectedLocIds.length > 0 ? selectedLocIds[0] : 1,
          });
          
          console.log("Experience update successful", result);
          
          // Step 2: Handle add-ons separately
          try {
            // First get existing add-ons to determine what needs to be created, updated, or deleted
            console.log("Fetching existing add-ons for experience:", selectedExperience.id);
            
            // Use direct fetch to get better debugging information
            const addonResponse = await fetch(`/api/experience-addons/${selectedExperience.id}`);
            if (!addonResponse.ok) {
              console.error(`Error fetching add-ons: ${addonResponse.status} ${addonResponse.statusText}`);
              throw new Error(`Failed to fetch add-ons: ${addonResponse.statusText}`);
            }
            
            const existingAddons = await addonResponse.json();
            console.log("Existing add-ons:", existingAddons);
            
            if (addons && addons.length > 0) {
              console.log(`Processing ${addons.length} add-ons for experience ${selectedExperience.id}`);
              
              // Process each addon in our form state
              for (const addon of addons) {
                try {
                  // Check if this addon has an ID and if it matches any existing addon
                  const existingAddon = Array.isArray(existingAddons) && addon.id 
                    ? existingAddons.find(ea => ea.id === addon.id) 
                    : null;
                  
                  if (existingAddon) {
                    // Update existing addon
                    console.log("Updating addon:", addon);
                    // Use direct fetch for better error visibility
                    const updateResponse = await fetch(`/api/experience-addons/${addon.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: addon.name,
                        description: addon.description || '',
                        price: typeof addon.price === 'number' ? addon.price.toString() : addon.price,
                        isOptional: addon.isOptional !== undefined ? addon.isOptional : true
                      })
                    });
                    
                    if (!updateResponse.ok) {
                      console.error(`Error updating add-on: ${updateResponse.status} ${updateResponse.statusText}`);
                      const errorText = await updateResponse.text();
                      throw new Error(`Failed to update add-on: ${errorText}`);
                    }
                    
                    console.log(`Add-on ${addon.id} updated successfully`);
                  } else {
                    // Create new addon
                    console.log("Creating new addon:", addon);
                    const createResponse = await fetch('/api/experience-addons', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        experienceId: selectedExperience.id,
                        name: addon.name,
                        description: addon.description || '',
                        price: typeof addon.price === 'number' ? addon.price.toString() : addon.price,
                        isOptional: addon.isOptional !== undefined ? addon.isOptional : true
                      })
                    });
                    
                    if (!createResponse.ok) {
                      console.error(`Error creating add-on: ${createResponse.status} ${createResponse.statusText}`);
                      const errorText = await createResponse.text();
                      throw new Error(`Failed to create add-on: ${errorText}`);
                    }
                    
                    const newAddon = await createResponse.json();
                    console.log("New add-on created successfully:", newAddon);
                  }
                } catch (addonError) {
                  console.error("Error processing add-on:", addonError);
                  // Show error toast but continue with other add-ons
                  toast({
                    title: "Add-on Error",
                    description: `Failed to process add-on "${addon.name}": ${addonError.message}`,
                    variant: "destructive"
                  });
                }
              }
            } else {
              console.log("No add-ons to process");
            }
            
            // Find add-ons that were removed and delete them
            if (Array.isArray(existingAddons) && existingAddons.length > 0) {
              for (const existingAddon of existingAddons) {
                try {
                  // If an existing addon is not in our current list, delete it
                  if (!addons.some(a => a.id === existingAddon.id)) {
                    console.log("Deleting addon:", existingAddon);
                    const deleteResponse = await fetch(`/api/experience-addons/${existingAddon.id}`, {
                      method: 'DELETE'
                    });
                    
                    if (!deleteResponse.ok) {
                      console.error(`Error deleting add-on: ${deleteResponse.status} ${deleteResponse.statusText}`);
                      const errorText = await deleteResponse.text();
                      throw new Error(`Failed to delete add-on: ${errorText}`);
                    }
                    
                    console.log(`Add-on ${existingAddon.id} deleted successfully`);
                  }
                } catch (deleteError) {
                  console.error("Error deleting add-on:", deleteError);
                  // Show error toast but continue with other deletions
                  toast({
                    title: "Add-on Error",
                    description: `Failed to delete add-on "${existingAddon.name}": ${deleteError.message}`,
                    variant: "destructive"
                  });
                }
              }
            }
            
            // Invalidate add-ons query to ensure we get fresh data
            queryClient.invalidateQueries({ queryKey: [`/api/experience-addons/${selectedExperience.id}`] });
          } catch (addonsError) {
            console.error("Error handling add-ons:", addonsError);
            // Show error toast but don't rethrow - we still want to complete the experience update
            toast({
              title: "Add-ons Error",
              description: `Problem processing add-ons: ${addonsError.message}`,
              variant: "destructive"
            });
          }
          
          toast({
            title: "Success",
            description: "Experience and add-ons updated successfully",
          });
          
          // Refresh data
          // Invalidate both admin and public experience queries
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-addons'] });
          
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
              // Basic information
              name: data.name || "New Experience",
              description: data.description || "Experience description",
              locationId: selectedLocIds.length > 0 ? selectedLocIds[0] : 1,
              duration: parseInt(String(data.duration || 1)),
              price: typeof data.price === 'number' ? data.price.toString() : (data.price || "0"),
              capacity: parseInt(String(data.capacity || 1)),
              category: data.category || "other_hunting",
              
              // Additional details
              images: selectedImages || [],
              availableDates: selectedDates || [],
              rules: rules || [],
              amenities: amenities || [],
              tripIncludes: tripIncludes || [],
              addons: addons || []
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
                await apiRequest('POST', '/api/experience-locations', { 
                  experienceId, 
                  locationId 
                });
              } catch (err) {
                console.error("Error associating location:", err);
              }
            }
          }
          
          // Step 2: Save the add-ons for the new experience
          try {
            if (addons && addons.length > 0 && result && result.id) {
              console.log(`Creating ${addons.length} add-ons for the new experience:`, addons);
              
              // Create each add-on individually
              for (const addon of addons) {
                try {
                  console.log("Creating addon:", addon);
                  // Only include fields that match the database schema
                  const response = await fetch('/api/experience-addons', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      experienceId: result.id,
                      name: addon.name,
                      description: addon.description || '',
                      price: typeof addon.price === 'number' ? addon.price.toString() : addon.price,
                      isOptional: addon.isOptional !== undefined ? addon.isOptional : true
                    })
                  });
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error creating add-on: Server responded with ${response.status}`, errorText);
                    // Show error toast but continue with other add-ons
                    toast({
                      title: "Add-on Error",
                      description: `Failed to create add-on "${addon.name}": ${response.status} ${errorText}`,
                      variant: "destructive"
                    });
                  } else {
                    const addonResult = await response.json();
                    console.log("Add-on created successfully:", addonResult);
                  }
                } catch (addonError) {
                  console.error("Error creating add-on:", addonError);
                  // Show error toast but continue with other add-ons
                  toast({
                    title: "Add-on Error",
                    description: `Error creating add-on "${addon.name}": ${addonError.message}`,
                    variant: "destructive"
                  });
                }
              }
              
              // Invalidate add-ons query to ensure we get fresh data
              queryClient.invalidateQueries({ queryKey: [`/api/experience-addons/${result.id}`] });
            } else {
              console.log("No add-ons to create for this experience");
            }
          } catch (addonsError) {
            console.error("Error handling add-ons for new experience:", addonsError);
            // Show error toast but don't throw - we still want to complete the experience creation
            toast({
              title: "Add-ons Error",
              description: `Problem processing add-ons: ${addonsError.message}`,
              variant: "destructive"
            });
          }
          
          // Invalidate data
          queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/experiences'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-locations'] });
          queryClient.invalidateQueries({ queryKey: ['/api/experience-addons'] });
          
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Experiences by Location</h3>
              <p className="text-sm text-gray-600">Manage hunting and fishing offerings at each lodge</p>
            </div>
            {isAdmin && (
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Create Experience
              </Button>
            )}
          </div>
          
          {experiences && experiences.length > 0 ? (
            <div className="space-y-10">
              {/* Group experiences by location */}
              {locations.map((location) => {
                // Filter experiences for this location
                const locationExperiences = experiences.filter(
                  (exp) => exp.locationId === location.id
                );
                
                // Skip locations with no experiences
                if (locationExperiences.length === 0) return null;
                
                return (
                  <div key={location.id} className="space-y-6">
                    {/* Location header */}
                    <div className="flex items-center border-b border-gray-200 pb-2">
                      <MapPin className="h-5 w-5 mr-2 text-primary" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        {location.name} <span className="text-sm font-normal text-gray-500 ml-2">{location.city}, {location.state}</span>
                      </h3>
                    </div>
                    
                    {/* Experiences grid for this location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {locationExperiences.map((experience: Experience) => (
                        <Card key={experience.id} className="shadow-md overflow-hidden border border-gray-100 hover:border-gray-200 transition-all">
                          <CardHeader className="pb-1">
                            <CardTitle className="text-lg text-green-800">{experience.name}</CardTitle>
                            <CardDescription className="text-xs">{formatCategory(experience.category)}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{experience.description}</p>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                          </CardContent>
                          {isAdmin && (
                            <CardFooter className="flex justify-end flex-wrap gap-2 px-4 pt-1 pb-3 border-t border-gray-100">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8 border-gray-200 hover:bg-gray-50"
                                onClick={() => openEditDialog(experience)}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8 border-amber-100 text-amber-700 hover:bg-amber-50"
                                onClick={() => openDuplicateDialog(experience)}
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
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
                  </div>
                );
              })}
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
                  steps={["Basic Info", "Details", "Media", "Features", "Add-ons & Guides", "Review"]} 
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
                steps={["Basic Info", "Details", "Media", "Features", "Add-ons & Guides", "Review"]} 
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
                          <FormLabel>Price Per Hunter ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  

                  
                  {/* Associated Physical Location */}
                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-primary" />
                            <span>Required Location</span>
                          </FormLabel>
                          <FormDescription>
                            Each experience must be assigned to exactly one location. This is where guests will check in.
                          </FormDescription>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={(value) => {
                              const locationId = parseInt(value);
                              // Directly update form field with the numeric locationId
                              form.setValue("locationId", locationId);
                              field.onChange(locationId);
                              setSelectedLocIds(locationId ? [locationId] : []);
                              console.log("Location selected:", locationId);
                            }}
                          >
                            <SelectTrigger className="border-primary/30 focus:ring-primary/30">
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations && locations.length > 0 ? (
                                locations.map((location: Location) => (
                                  <SelectItem key={location.id} value={location.id.toString()}>
                                    {location.name} ({location.city}, {location.state})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  No locations available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
              
              {/* Step 5: Add-ons & Guides */}
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
                    <h3 className="text-base font-medium mb-1">Guide Assignment</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Assign guides to this experience. The primary guide will be the main point of contact.
                    </p>
                    
                    <ExperienceGuides
                      experienceId={selectedExperience?.id || 0}
                      readOnly={false}
                    />
                  </div>
                </div>
              )}
              
              {/* Step 6: Review */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
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
                  
                  {currentStep < 6 ? (
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
                          
                          // DETAILED LOGGING: Log the exact payload being sent
                          console.log("=== EXPERIENCE UPDATE PAYLOAD DETAILS ===");
                          console.log("Full payload:", JSON.stringify(payload, null, 2));
                          console.log("Duration type:", typeof payload.duration, "Value:", payload.duration);
                          console.log("Capacity type:", typeof payload.capacity, "Value:", payload.capacity);
                          console.log("Price type:", typeof payload.price, "Value:", payload.price);
                          console.log("LocationId type:", typeof payload.locationId, "Value:", payload.locationId);
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

      {/* Duplicate Experience Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-amber-500" />
              Duplicate Experience
            </DialogTitle>
            <DialogDescription>
              Duplicate <span className="font-semibold">{experienceToDuplicate?.name}</span> to another location.
              The new experience will be created as a copy with the same details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Source Location</h4>
              <div className="px-3 py-2 bg-muted/50 rounded-md border text-sm">
                {locations.find(loc => loc.id === experienceToDuplicate?.locationId)?.name} (Current)
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Select Destination Location</h4>
                {selectedDuplicateLocationId && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                    Selected
                  </Badge>
                )}
              </div>
              
              <Select 
                value={selectedDuplicateLocationId?.toString() || ""}
                onValueChange={(value) => setSelectedDuplicateLocationId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter(loc => loc.id !== experienceToDuplicate?.locationId)
                    .map(location => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name} ({location.city}, {location.state})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDuplicateDialog}>Cancel</Button>
            <Button 
              onClick={handleDuplicateExperience}
              disabled={!selectedDuplicateLocationId}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicate Experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}