import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChevronRight, Calendar, Users, Check, Clock, DollarSign } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";

// Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

// Types
interface Experience {
  id: number;
  name: string;
  description: string;
  price: string;
  duration: number;
  capacity: number;
  category: string;
  images?: string[];
  availableDates?: Date[];
  locations: {
    id: number;
    name: string;
    city: string;
    state: string;
  }[];
}

// Booking form schema
const bookingFormSchema = z.object({
  experienceId: z.string(),
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date({
    required_error: "Please select an end date",
  }),
  customerName: z.string().min(3, "Full name is required"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(10, "Please enter a valid phone number"),
  groupSize: z.string().min(1, "Group size is required"),
  paymentOption: z.enum(["deposit", "full"], {
    required_error: "Please select a payment option",
  }),
  addons: z.array(z.string()).optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function PublicBooking() {
  const [_, setLocation] = useLocation();
  const { outfitterId } = useParams();
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);

  // Sample addons (would normally come from the experience data)
  const sampleAddons = [
    { id: "addon1", label: "Equipment Rental", price: 50 },
    { id: "addon2", label: "Guide Tips (Recommended)", price: 100 },
    { id: "addon3", label: "Photography Package", price: 75 },
    { id: "addon4", label: "Transportation", price: 60 },
  ];

  // Fetch experiences from the API
  const { data: experiences = [], isLoading, error } = useQuery<Experience[]>({
    queryKey: ['/api/public/experiences'],
  });

  // Set up the booking form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      experienceId: selectedExperience?.id.toString() || "",
      startDate: undefined,
      endDate: undefined,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      groupSize: "1",
      paymentOption: "deposit",
      addons: [],
    },
  });

  // Update form when an experience is selected
  useEffect(() => {
    if (selectedExperience) {
      form.setValue("experienceId", selectedExperience.id.toString());
      
      // If we have dates available, set default dates
      if (selectedExperience.availableDates && selectedExperience.availableDates.length > 0) {
        form.setValue("startDate", new Date(selectedExperience.availableDates[0]));
        
        // Calculate end date based on duration
        const endDate = new Date(selectedExperience.availableDates[0]);
        endDate.setDate(endDate.getDate() + selectedExperience.duration - 1);
        form.setValue("endDate", endDate);
      }
    }
  }, [selectedExperience, form]);

  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    try {
      const response = await apiRequest('POST', '/api/public/book', data);
      
      // Show success message and close booking dialog
      setBookingConfirmation(response);
      setBookingDialogOpen(false);
      setConfirmationDialogOpen(true);
      
      // Reset form
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format price as currency
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  // Calculate booking summary
  const calculateSummary = (formValues: BookingFormValues) => {
    if (!selectedExperience) return { subtotal: 0, total: 0, deposit: 0 };
    
    const basePrice = parseFloat(selectedExperience.price);
    let addonTotal = 0;
    
    // Add up selected addons
    if (formValues.addons && formValues.addons.length > 0) {
      formValues.addons.forEach(addonId => {
        const addon = sampleAddons.find(a => a.id === addonId);
        if (addon) {
          addonTotal += addon.price;
        }
      });
    }
    
    const subtotal = basePrice;
    const total = subtotal + addonTotal;
    const deposit = total / 2;
    
    return {
      subtotal,
      addonTotal,
      total,
      deposit,
    };
  };

  // If outfitterId is provided but invalid, show not found message
  if (outfitterId && !isLoading && experiences.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader>
            <CardTitle>Outfitter Not Found</CardTitle>
            <CardDescription>
              The outfitter you're looking for doesn't exist or has no available experiences.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/")}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 z-0"></div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 left-0 h-72 w-72 rounded-full bg-white/20 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/10 translate-x-1/3 translate-y-1/3"></div>
          <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-white/10 -translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="block">Discover Your Next</span>
              <span className="block mt-1 text-white/90">Unforgettable Adventure</span>
            </h1>
            <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Browse our exclusive collection of guided experiences and book the perfect outdoor getaway
            </p>
            
            <div className="mt-8">
              <div className="flex justify-center items-center space-x-2 text-white/70 text-sm">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span>Expert Guides</span>
                </div>
                <span className="text-white/50">•</span>
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span>Premium Locations</span>
                </div>
                <span className="text-white/50">•</span>
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span>Unforgettable Memories</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <span className="ml-3 text-gray-500">Loading experiences...</span>
          </div>
        ) : error ? (
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <h3 className="text-lg font-medium text-red-800">Failed to load experiences</h3>
            <p className="mt-2 text-red-700">Please try again later.</p>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-medium text-gray-700">No adventures currently available</h3>
            <p className="mt-2 text-gray-500">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((experience) => (
              <div key={experience.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                {/* Image container with overlay */}
                <div className="relative h-56 overflow-hidden">
                  {experience.images && experience.images.length > 0 ? (
                    <img 
                      src={Array.isArray(experience.images) ? experience.images[0] : "https://via.placeholder.com/400x225"}
                      alt={experience.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">{experience.name}</span>
                    </div>
                  )}
                  
                  {/* Image overlay with location */}
                  {experience.locations.length > 0 && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-primary shadow-sm">
                      {experience.locations[0].city}, {experience.locations[0].state}
                    </div>
                  )}
                  
                  {/* Price tag */}
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-primary text-white rounded-lg shadow-lg text-sm font-semibold">
                    {formatPrice(experience.price)}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{experience.name}</h3>
                  
                  <div className="mt-3 flex items-center text-sm text-gray-600">
                    <span className="capitalize">
                      {experience.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                  
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3 flex-grow">{experience.description}</p>
                  
                  {/* Features */}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="mr-2 h-4 w-4 text-primary/70" />
                      <span>{experience.duration} {experience.duration > 1 ? 'days' : 'day'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="mr-2 h-4 w-4 text-primary/70" />
                      <span>Up to {experience.capacity}</span>
                    </div>
                  </div>
                  
                  {/* Button */}
                  <Button 
                    className="w-full mt-5 rounded-xl"
                    onClick={() => {
                      setSelectedExperience(experience);
                      setBookingDialogOpen(true);
                    }}
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {/* Experience Header in Dialog */}
          {selectedExperience && (
            <div className="relative h-36 sm:h-48 w-full overflow-hidden rounded-t-2xl">
              {/* Background Image */}
              <div className="absolute inset-0">
                {selectedExperience.images && selectedExperience.images.length > 0 ? (
                  <img 
                    src={Array.isArray(selectedExperience.images) ? selectedExperience.images[0] : ""}
                    alt={selectedExperience.name}
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20"></div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30"></div>
              </div>
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <div className="flex items-center mb-2">
                  {selectedExperience.locations.length > 0 && (
                    <span className="text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mr-2">
                      {selectedExperience.locations[0].city}, {selectedExperience.locations[0].state}
                    </span>
                  )}
                  <span className="text-sm font-medium bg-primary/80 backdrop-blur-sm rounded-full px-3 py-1">
                    {formatPrice(selectedExperience.price)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold">{selectedExperience.name}</h2>
                <div className="flex items-center mt-1 space-x-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>{selectedExperience.duration} {selectedExperience.duration > 1 ? 'days' : 'day'}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-1 h-4 w-4" />
                    <span>Up to {selectedExperience.capacity} people</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Complete Your Booking</DialogTitle>
              <DialogDescription>
                Fill out the form below to secure your adventure.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker 
                        date={field.value}
                        onSelect={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <DatePicker 
                        date={field.value}
                        onSelect={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="groupSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Size</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select group size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: selectedExperience?.capacity || 5 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1} {i === 0 ? 'person' : 'people'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Optional Add-ons</h3>

                <FormField
                  control={form.control}
                  name="addons"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        {sampleAddons.map((addon) => (
                          <div key={addon.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={addon.id}
                              checked={field.value?.includes(addon.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, addon.id]);
                                } else {
                                  field.onChange(currentValues.filter(value => value !== addon.id));
                                }
                              }}
                            />
                            <label htmlFor={addon.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex justify-between w-full">
                              <span>{addon.label}</span>
                              <span className="text-gray-500 ml-2">${addon.price}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="paymentOption"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payment Option</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="deposit" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            50% Deposit Now (${calculateSummary(form.getValues()).deposit.toFixed(2)})
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Pay in Full (${calculateSummary(form.getValues()).total.toFixed(2)})
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-base font-medium mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Experience Fee:</span>
                    <span>${calculateSummary(form.getValues()).subtotal.toFixed(2)}</span>
                  </div>
                  {calculateSummary(form.getValues()).addonTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons:</span>
                      <span>${calculateSummary(form.getValues()).addonTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t border-gray-200 mt-2">
                    <span>Total:</span>
                    <span>${calculateSummary(form.getValues()).total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setBookingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-1">
                  <Check className="h-4 w-4" />
                  Complete Booking
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Thank you for your booking. We've sent a confirmation email with all the details.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {bookingConfirmation && (
              <div className="border rounded-md p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Booking Number:</span>
                  <span className="text-sm font-medium">{bookingConfirmation.booking.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Dates:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(bookingConfirmation.booking.startDate), 'MMM d, yyyy')} - 
                    {format(new Date(bookingConfirmation.booking.endDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Payment Status:</span>
                  <span className="text-sm font-medium">{bookingConfirmation.booking.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Amount:</span>
                  <span className="text-sm font-medium">${bookingConfirmation.booking.totalAmount}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setConfirmationDialogOpen(false);
              setBookingConfirmation(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicBooking;