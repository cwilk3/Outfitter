import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { Location } from '@/types';
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
import { Pencil, Trash2, MapPin, PlusCircle, CheckCircle, XCircle, AlertTriangle, ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';

// Location form validation schema
const locationFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  address: z.string().optional(),
  city: z.string().min(2, { message: 'City is required.' }),
  state: z.string().min(2, { message: 'State is required.' }),
  zip: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  locationId: z.number().optional(), // For editing existing location
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function LocationsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Fetch locations
  const { data: locations = [], isLoading, error } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Form definition with validation
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      description: '',
      images: [],
      isActive: true,
    },
  });

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: (data: LocationFormValues) => {
      return apiRequest('POST', '/api/locations', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsDialogOpen(false);
      form.reset();
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
    mutationFn: ({ id, data }: { id: number; data: LocationFormValues }) => {
      return apiRequest('PATCH', `/api/locations/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Location updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsDialogOpen(false);
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
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/locations/${id}`);
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

  // Open dialog for creating a new location
  const openCreateDialog = () => {
    setFormMode('create');
    form.reset({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      description: '',
      images: [],
      isActive: true,
    });
    setSelectedImages([]);
    setIsDialogOpen(true);
  };

  // Open dialog for editing an existing location
  const openEditDialog = (location: Location) => {
    setFormMode('edit');
    form.reset({
      name: location.name,
      address: location.address || '',
      city: location.city,
      state: location.state,
      zip: location.zip || '',
      description: location.description || '',
      images: location.images || [],
      isActive: location.isActive,
      locationId: location.id,
    });
    setSelectedImages(location.images || []);
    setIsDialogOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (location: Location) => {
    setLocationToDelete(location);
    setIsDeleteAlertOpen(true);
  };

  // Form submission handler
  const onSubmit = async (data: LocationFormValues) => {
    // Make sure images are included from the state
    const formData = {
      ...data,
      images: selectedImages
    };
    
    if (formMode === 'create') {
      createMutation.mutate(formData);
    } else {
      const locationId = data.locationId;
      if (locationId) {
        // Remove locationId from data before updating
        const { locationId: _, ...updateData } = formData;
        updateMutation.mutate({ id: locationId, data: updateData });
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter className="bg-muted/30">
                <div className="flex justify-end space-x-2 w-full">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Locations</h3>
        <p className="text-red-600">{(error as Error).message || 'Failed to load locations. Please try again.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Locations</h2>
          <p className="text-sm text-gray-600">Manage your business locations</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Location
          </Button>
        )}
      </div>

      {locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location: Location) => (
            <Card key={location.id} className="shadow-md transition-shadow hover:shadow-lg">
              {location.images && location.images.length > 0 ? (
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={location.images[0]} 
                    alt={location.name} 
                    className="object-cover w-full h-full"
                  />
                  {location.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs rounded-full px-2 py-1 flex items-center">
                      <ImageIcon className="h-3 w-3 mr-1" /> +{location.images.length - 1}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-40 w-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">{location.name}</CardTitle>
                  <div>
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
      ) : (
        <div className="text-center p-8 border border-dashed rounded-lg bg-muted/40">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No Locations Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your first location to organize your experiences.
          </p>
          {isAdmin && (
            <Button onClick={openCreateDialog}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Your First Location
            </Button>
          )}
        </div>
      )}
      
      {/* Location Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Hidden field for ID when editing */}
              {formMode === 'edit' && (
                <input type="hidden" {...form.register('locationId')} />
              )}
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Northern Ranch" {...field} />
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Austin" {...field} />
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
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 123 Main St" {...field} />
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
                      <FormLabel>Zip Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 78701" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Only active locations will be available for new experiences
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the location..." 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel>Images</FormLabel>
                <ImageUpload 
                  images={selectedImages} 
                  onChange={(images: string[]) => setSelectedImages(images)} 
                  maxImages={5}
                />
                <p className="text-sm text-muted-foreground">
                  Upload up to 5 images of this location
                </p>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t space-x-2 flex-col sm:flex-row">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
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
                    <span>{formMode === 'create' ? 'Create' : 'Update'}</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Location Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{locationToDelete?.name}</span>?
              This action cannot be undone. This may affect experiences associated with this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (locationToDelete) {
                  deleteMutation.mutate(locationToDelete.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}