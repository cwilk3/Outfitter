import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { Location } from '@shared/schema';
import { LocationImageUpload } from '@/components/ui/location-image-upload';

// Define ApiError class for error handling
class ApiError extends Error {
  details: any;
  constructor(message: string, details: any) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  PlusCircle,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle,
  XCircle,
  LoaderIcon,
} from 'lucide-react';

// Create the location form schema
const locationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean().default(true),
});

// Define location form data type
type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function Locations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [locationImages, setLocationImages] = useState<string[]>([]);
  
  // Query to fetch all locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Initialize the form
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      description: '',
      isActive: true,
    },
  });

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: async (data: LocationFormValues) => {
      // First create the location
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error.message, error);
      }
      
      const newLocation = await response.json();
      
      // Then upload images if there are any
      if (locationImages.length > 0) {
        const imagesResponse = await fetch(`/api/locations/${newLocation.id}/images`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images: locationImages }),
        });
        
        if (!imagesResponse.ok) {
          toast({
            title: 'Warning',
            description: 'Location created, but failed to upload images.',
            variant: 'destructive',
          });
        }
      }
      
      return newLocation;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsDialogOpen(false);
      form.reset();
      setLocationImages([]);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location.',
        variant: 'destructive',
      });
    },
  });

  // Update location mutation
  const updateMutation = useMutation({
    mutationFn: async (data: LocationFormValues & { id: number }) => {
      const { id, ...locationData } = data;
      
      // First update the location details
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error.message, error);
      }
      
      const updatedLocation = await response.json();
      
      // Then update images if there are any changes
      const imagesResponse = await fetch(`/api/locations/${id}/images`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: locationImages }),
      });
      
      if (!imagesResponse.ok) {
        toast({
          title: 'Warning',
          description: 'Location updated, but failed to update images.',
          variant: 'destructive',
        });
      }
      
      return updatedLocation;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location.',
        variant: 'destructive',
      });
    },
  });

  // Delete location mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error.message, error);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsDeleteAlertOpen(false);
      setLocationToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location.',
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: LocationFormValues) => {
    if (formMode === 'create') {
      createMutation.mutate(data);
    } else if (formMode === 'edit' && currentLocation) {
      updateMutation.mutate({ ...data, id: currentLocation.id });
    }
  };

  // Parse stored images from location
  const parseLocationImages = useCallback((location: Location): string[] => {
    if (!location.images) return [];
    try {
      const images = JSON.parse(location.images.toString());
      return Array.isArray(images) ? images : [];
    } catch (e) {
      console.error("Error parsing location images:", e);
      return [];
    }
  }, []);

  // Open dialog for creating a new location
  const openCreateDialog = useCallback(() => {
    setFormMode('create');
    form.reset({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      description: '',
      isActive: true,
    });
    setLocationImages([]);
    setCurrentLocation(null);
    setIsDialogOpen(true);
  }, [form]);

  // Open dialog for editing an existing location
  const openEditDialog = useCallback((location: Location) => {
    setFormMode('edit');
    form.reset({
      name: location.name,
      address: location.address || '',
      city: location.city,
      state: location.state,
      zip: location.zip || '',
      description: location.description || '',
      isActive: location.isActive,
    });
    
    // Parse and load existing images
    const existingImages = parseLocationImages(location);
    setLocationImages(existingImages);
    
    setCurrentLocation(location);
    setIsDialogOpen(true);
  }, [form, parseLocationImages]);

  // Open delete confirmation dialog
  const openDeleteDialog = useCallback((location: Location) => {
    setLocationToDelete(location);
    setIsDeleteAlertOpen(true);
  }, []);

  // Handle deletion confirmation
  const confirmDelete = useCallback(() => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete.id);
    }
  }, [locationToDelete, deleteMutation]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Locations</h1>
        {isAdmin && (
          <Button onClick={openCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Location
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No locations found. Create a new location to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location: any) => (
            <Card key={location.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex-1">{location.name}</CardTitle>
                  <div className="flex items-center space-x-1">
                    {location.isActive ? (
                      <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 rounded-full px-2 py-1 flex items-center">
                        <XCircle className="h-3 w-3 mr-1" /> Inactive
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  {location.city}, {location.state}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {location.address && (
                  <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                )}
                {location.description && (
                  <p className="text-sm">{location.description}</p>
                )}
              </CardContent>
              {isAdmin && (
                <CardFooter className="bg-muted/30 p-4 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(location)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(location)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
      
      {/* Location Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create New Location' : 'Edit Location'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create' 
                ? 'Add a new location to manage experiences and bookings.' 
                : 'Update the location details.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-1" style={{ maxHeight: "calc(80vh - 180px)" }}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter location name" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="State" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Street address" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP/Postal Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ZIP code" 
                        {...field} 
                        value={field.value || ''} 
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this location" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Location Image Upload - Repositioned After Description */}
              <div className="space-y-2 border-2 border-red-500 bg-red-50 p-4 my-6 rounded-md">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-base font-bold">Location Images</FormLabel>
                  <p className="text-xs text-muted-foreground">Max 5 images</p>
                </div>
                <LocationImageUpload 
                  images={locationImages}
                  onChange={setLocationImages}
                  maxImages={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Upload images of the location to help customers visualize their experience.
                  Drag and drop images or click to browse.
                </p>
              </div>
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Inactive locations won't be available for new bookings.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Location Image Upload - DEBUG VERSION */}
              <div className="space-y-2 border-2 border-red-500 bg-red-50 p-4 my-6 rounded-md">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-base font-bold">LOCATION IMAGES - DEBUG</FormLabel>
                  <p className="text-xs text-muted-foreground">Max 5 images</p>
                </div>
                <LocationImageUpload 
                  images={locationImages}
                  onChange={setLocationImages}
                  maxImages={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Upload images of the location to help customers visualize their experience.
                  Drag and drop images or click to browse.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {formMode === 'create' ? 'Create Location' : 'Update Location'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
            </div>
          </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the location 
              {locationToDelete?.name ? `: "${locationToDelete.name}"` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> 
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}