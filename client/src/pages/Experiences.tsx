import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Experience, Location, ExperienceLocation, ExperienceAddon } from "@/types";
import { ExperienceGuides } from "@/components/ui/experience-guides";
import { GuideAssignmentIndicator } from "@/components/ui/guide-assignment-indicator";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  locationId: z.number({ required_error: "Location is required" }).min(1, "Valid location is required"),
  
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
  
  // Multi-guide assignment support
  assignedGuideIds: z.array(
    z.object({
      guideId: z.string(),
      isPrimary: z.boolean().default(false),
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
  const [draftGuides, setDraftGuides] = useState<any[]>([]);

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
        locationId: data.locationId, // Use data.locationId directly (no fallback)
        rules: rules,
        amenities: amenities,
        tripIncludes: tripIncludes,
        images: data.images,
        availableDates: data.availableDates,
        assignedGuideIds: draftGuides.map(guide => ({
          guideId: guide.guideId,
          isPrimary: guide.isPrimary
        }))
      };
      
      console.log("🔍 [CREATE_MUTATION_DEBUG] Creating experience with payload:", payload);
      
      return apiRequest<Experience>('POST', '/api/experiences', payload);
    },
    onSuccess: (response: Experience) => {
      toast({
        title: "Success",
        description: "Experience created successfully",
      });
      
      // Location relationship is now created directly with the experience
      // No need for separate addExperienceLocationMutation call
      
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
        assignedGuideIds: draftGuides.map(guide => ({
          guideId: guide.guideId,
          isPrimary: guide.isPrimary
        }))
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
    
    // Load existing guides for this experience into draftGuides state
    if (experience.id) {
      try {
        const response = await fetch(`/api/experiences/${experience.id}/guides`);
        
        if (response.ok) {
          const guides = await response.json();
          
          // Convert API guides to draft guide format
          const draftGuideData = guides.map(guide => ({
            tempId: guide.id, // Use the actual ID as tempId for existing guides
            guideId: guide.guideId,
            isPrimary: guide.isPrimary
          }));
          
          setDraftGuides(draftGuideData);
        } else {
          setDraftGuides([]);
        }
      } catch (error) {
        setDraftGuides([]);
      }
    }
    
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
      const addonResponse = await fetch(`/api/experiences/${experience.id}/addons`);
      if (addonResponse.ok) {
        const freshAddons = await addonResponse.json();
        
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
      duration: Math.ceil(experience.duration / 24), // Convert hours to days
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
    setIsCreating(true); // Keep dialog open, as it controls Dialog visibility
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
    setDraftGuides([]);
    setCurrentStep(1);
    form.reset();
  };
  
  // Helper function to scroll dialog content to top
  const scrollDialogToTop = () => {
    // Find the dialog content element and scroll it to top
    const dialogContent = document.querySelector('.dialog-content');
    if (dialogContent) {
      dialogContent.scrollTop = 0;
    }
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
    
    // If we've reached here, go to the next step and scroll to top
    setCurrentStep(prev => {
      const newStep = Math.min(prev + 1, 6);
      // Use setTimeout to ensure the state update happens first
      setTimeout(scrollDialogToTop, 0);
      return newStep;
    });
  };
  
  // Go to previous step
  const goToPreviousStep = () => {
    setCurrentStep(prev => {
      const newStep = Math.max(prev - 1, 1);
      // Use setTimeout to ensure the state update happens first
      setTimeout(scrollDialogToTop, 0);
      return newStep;
    });
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
    console.log('--- DIAGNOSTIC: onSubmit Handler Called ---');
    console.log('🔍 [ONSUBMIT_DEBUG] Form Data received by onSubmit:', JSON.stringify(data, null, 2));

    // Determine if creating or updating
    const isCreating = !selectedExperience;
    const experienceId = selectedExperience?.id;

    if (isCreating) {
      console.log('🔍 [ONSUBMIT_DEBUG] Mode: Creating new experience.');
      // Call createMutation to handle creation with multi-guide payload
      createMutation.mutate(data);
    } else if (experienceId) {
      console.log('🔍 [ONSUBMIT_DEBUG] Mode: Updating existing experience. ID:', experienceId);
      // Call updateMutation to handle update with multi-guide payload
      updateMutation.mutate({ id: experienceId, data });
    } else {
      console.error('❌ [ONSUBMIT_ERROR] Invalid state: Not creating and no experienceId for update.');
      toast({ 
        title: 'Error', 
        description: 'Invalid form submission state.', 
        variant: 'destructive' 
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
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Experiences</h1>
        <Button onClick={() => {
          setIsCreating(true);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Experience
        </Button>
      </div>

      {/* Experience List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          // Diagnostic logging
          console.log('=== DIAGNOSTIC LOGGING ===');
          console.log('experienceLocations value:', experienceLocations);
          console.log('typeof experienceLocations:', typeof experienceLocations);
          console.log('Array.isArray(experienceLocations):', Array.isArray(experienceLocations));
          console.log('experiences value:', experiences);
          console.log('typeof experiences:', typeof experiences);
          console.log('Array.isArray(experiences):', Array.isArray(experiences));
          console.log('========================');
          return null;
        })()}
        {experiences?.map((experience: Experience) => (
          <Card key={experience.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{experience.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {locations?.find((location: Location) => (
                      locationExperiences.find(le => le.experienceId === experience.id && le.locationId === location.id)
                    ))?.name}
                  </p>
                </div>
                <Badge variant="secondary">{experience.category?.replace('_', ' ')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{experience.description}</p>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-semibold">${experience.price}</span>
                  <span className="text-sm text-gray-500 ml-2">{experience.duration}h</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDuplicateDialog(experience)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(experience)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(experience)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Experience Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Create New Experience" : "Edit Experience"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form content continues here */}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
