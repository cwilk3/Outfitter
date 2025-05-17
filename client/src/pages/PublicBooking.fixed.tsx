import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { ChevronRight, Calendar, Users, Check, Clock, DollarSign, MapPin, Info, Plus, Minus } from "lucide-react";
import { z } from "zod";
import { format, addDays, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateRange } from "react-day-picker";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker, Booking } from "@/components/ui/date-range-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  rules?: string[];
  amenities?: string[];
  tripIncludes?: string[];
  locations: {
    id: number;
    name: string;
    city: string;
    state: string;
  }[];
}

interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
}

// Sample addons for booking
const sampleAddons = [
  { 
    id: "guide-service", 
    label: "Professional Guide Service", 
    price: 150,
    inventory: 10,
    maxPerBooking: 1,
    isOptional: true
  },
  { 
    id: "equipment-rental", 
    label: "Equipment Rental", 
    price: 50,
    inventory: 20,
    maxPerBooking: 4,
    isOptional: true
  },
  { 
    id: "photo-package", 
    label: "Photo Package", 
    price: 75,
    inventory: 15,
    maxPerBooking: 1,
    isOptional: true
  },
  { 
    id: "tackle-box", 
    label: "Premium Tackle Box", 
    price: 25,
    inventory: 8,
    maxPerBooking: 2,
    isOptional: true
  },
];

// Booking form schema
const bookingFormSchema = z.object({
  experienceId: z.string(),
  locationId: z.string({
    required_error: "Please select a location", 
  }),
  dateRange: z.object({
    from: z.date({
      required_error: "Please select dates",
    }),
    to: z.date({
      required_error: "Please select dates",
    }),
  }).optional().refine(data => data?.from && data?.to, {
    message: "Please select a date range",
    path: ["dateRange"],
  }),
  hunterCount: z.number().min(1, "At least one hunter is required").max(10, "Maximum 10 hunters allowed"),
  customerName: z.string().min(3, "Full name is required"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(10, "Please enter a valid phone number"),
  notes: z.string().optional(),
  paymentOption: z.enum(["deposit", "full"], {
    required_error: "Please select a payment option",
  }),
  addons: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().min(1).default(1)
    })
  ).optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function PublicBooking() {
  // States
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  
  // Get experiences from API
  const { data: experiences = [], isLoading, error } = useQuery({
    queryKey: ['/api/public/experiences'],
  });
  
  // Get locations from API
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/public/locations'],
  });

  // State for tracking booking steps
  const [bookingStep, setBookingStep] = useState<'location' | 'experience-details' | 'details'>('location');
  
  // State for tracking booking availability data
  const [bookingData, setBookingData] = useState<Booking[]>([]);

  // Set up the booking form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      experienceId: "",
      locationId: "",
      dateRange: undefined,
      hunterCount: 1,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
      paymentOption: "deposit",
      addons: [],
    },
  });

  // Query for bookings data when an experience is selected
  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/public/bookings', selectedExperience?.id],
    enabled: !!selectedExperience,
  });

  // Update booking data state when bookings change
  useEffect(() => {
    if (bookings && Array.isArray(bookings) && bookings.length > 0) {
      setBookingData(bookings as Booking[]);
    }
  }, [bookings]);

  // Extract experience ID from URL if provided
  const [_, params] = useParams<{ id: string }>();
  
  // Find and set the selected experience based on URL param
  useEffect(() => {
    if (params?.id && experiences.length > 0) {
      const experience = experiences.find(e => e.id.toString() === params.id);
      if (experience) {
        setSelectedExperience(experience);
        form.setValue("experienceId", experience.id.toString());
        
        // If the experience only has one location, auto-select it
        if (experience.locations.length === 1) {
          form.setValue("locationId", experience.locations[0].id.toString());
          setSelectedLocation(experience.locations[0]);
        }
      }
    }
  }, [params, experiences, form]);

  // Reset date range when selected experience changes
  useEffect(() => {
    if (selectedExperience) {
      form.setValue("dateRange", undefined);
    }
  }, [selectedExperience, form]);

  // Navigation functions for booking steps
  const nextStep = () => {
    if (bookingStep === 'location') {
      // Validate location selection
      if (!form.getValues().locationId) {
        form.setError('locationId', { 
          type: 'manual', 
          message: 'Please select a location' 
        });
        return;
      }
      setBookingStep('experience-details');
    } else if (bookingStep === 'experience-details') {
      // Validate date selection
      const dateRange = form.getValues().dateRange;
      if (!dateRange || !dateRange.from || !dateRange.to) {
        form.setError('dateRange', { 
          type: 'manual', 
          message: 'Please select a date range' 
        });
        return;
      }
      setBookingStep('details');
    }
  };
  
  const prevStep = () => {
    if (bookingStep === 'experience-details') {
      setBookingStep('location');
    } else if (bookingStep === 'details') {
      setBookingStep('experience-details');
    }
  };

  // Format price with currency
  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericPrice);
  };
  
  // Calculate booking summary based on form values
  const calculateSummary = (formValues: BookingFormValues) => {
    if (!selectedExperience) {
      return { subtotal: 0, addonTotal: 0, total: 0, deposit: 0 };
    }
    
    const price = parseFloat(selectedExperience.price);
    const hunterCount = formValues.hunterCount || 1;
    const subtotal = price * hunterCount;
    
    // Calculate addons with quantities
    let addonTotal = 0;
    if (formValues.addons && formValues.addons.length > 0) {
      formValues.addons.forEach(addonSelection => {
        const addon = sampleAddons.find(a => a.id === addonSelection.id);
        if (addon) {
          // Multiply addon price by the selected quantity
          addonTotal += addon.price * addonSelection.quantity;
        }
      });
    }
    
    const total = subtotal + addonTotal;
    const deposit = Math.round(total * 0.30); // 30% deposit
    
    return { subtotal, addonTotal, total, deposit };
  };

  // Calculate total for booking
  const calculateBookingTotal = (formValues: BookingFormValues) => {
    const summary = calculateSummary(formValues);
    return formValues.paymentOption === 'deposit' ? summary.deposit : summary.total;
  };

  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    try {
      const experience = experiences.find(exp => exp.id.toString() === data.experienceId);
      if (!experience) {
        throw new Error("Experience not found");
      }
      
      // Build booking object for the API
      const bookingData = {
        experienceId: parseInt(data.experienceId),
        locationId: parseInt(data.locationId),
        startDate: data.dateRange?.from,
        endDate: data.dateRange?.to,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        hunterCount: data.hunterCount,
        notes: data.notes || "",
        paymentOption: data.paymentOption,
        addons: data.addons || [],
        totalAmount: calculateBookingTotal(data),
      };
      
      // Submit booking to API
      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      }).then(res => res.json());
      
      if (response) {
        // Show confirmation dialog with booking details
        setBookingConfirmation({
          ...response,
          experience,
          addons: data.addons?.map(addon => {
            const addonDetails = sampleAddons.find(a => a.id === addon.id);
            return {
              ...addon,
              label: addonDetails?.label,
              price: addonDetails?.price,
            };
          }),
        });
        
        setBookingDialogOpen(false);
        setConfirmationDialogOpen(true);
        form.reset();
      }
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: err.message || "There was an error processing your booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Close the confirmation dialog and reset state
  const handleCloseConfirmation = () => {
    setConfirmationDialogOpen(false);
    setBookingConfirmation(null);
    setBookingStep('location');
  };

  return (
    <div className="container py-8 px-4 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-2">
          Book Your Adventure
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select from our available experiences and book your dates
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center">
          <p>Loading experiences...</p>
        </div>
      ) : error ? (
        <div className="text-center text-red-600">
          <p>Error loading experiences. Please try again later.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((experience: any) => (
            <Card key={experience.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{experience.name}</CardTitle>
                <CardDescription>{experience.category}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-0">
                <div className="space-y-4">
                  <div className="line-clamp-3 text-sm text-gray-500">
                    {experience.description}
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{experience.duration} {experience.duration === 1 ? 'day' : 'days'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Up to {experience.capacity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">
                      {formatPrice(experience.price)}
                      <span className="text-sm font-normal text-gray-500"> / person</span>
                    </div>
                    
                    <Button 
                      onClick={() => {
                        setSelectedExperience(experience);
                        form.setValue("experienceId", experience.id.toString());
                        setBookingStep('location');
                        setBookingDialogOpen(true);
                      }}
                      className="gap-1"
                    >
                      Book Now
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Booking Dialog with 3-step process */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-4xl p-0">
          {selectedExperience && (
            <div className="relative h-48 bg-gray-800">
              {selectedExperience.images && selectedExperience.images[0] ? (
                <img 
                  src={selectedExperience.images[0]} 
                  alt={selectedExperience.name} 
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-gray-900/20"></div>
              <div className="absolute bottom-4 left-6 text-white">
                <h2 className="text-2xl font-bold">{selectedExperience.name}</h2>
                <p className="text-gray-200 text-sm">{selectedExperience.category}</p>
              </div>
            </div>
          )}
          
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>
                {bookingStep === 'location' && 'Select Location'}
                {bookingStep === 'experience-details' && 'Experience Details & Dates'}
                {bookingStep === 'details' && 'Complete Your Booking'}
              </DialogTitle>
              <DialogDescription>
                {bookingStep === 'location' && 'Choose where you would like to experience this adventure.'}
                {bookingStep === 'experience-details' && 'Review experience details and select your preferred dates.'}
                {bookingStep === 'details' && 'Fill out the form below to secure your adventure.'}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex justify-between">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'location' ? 'bg-primary text-white' : (bookingStep === 'experience-details' || bookingStep === 'details') ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                    1
                  </div>
                  <span className="text-xs mt-1">Location</span>
                </div>
                <div className="flex-1 flex items-center mx-2">
                  <div className={`h-1 w-full ${bookingStep === 'experience-details' || bookingStep === 'details' ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'experience-details' ? 'bg-primary text-white' : bookingStep === 'details' ? 'bg-primary/20 text-primary' : 'bg-gray-200 text-gray-500'}`}>
                    2
                  </div>
                  <span className="text-xs mt-1">Experience</span>
                </div>
                <div className="flex-1 flex items-center mx-2">
                  <div className={`h-1 w-full ${bookingStep === 'details' ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bookingStep === 'details' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                    3
                  </div>
                  <span className="text-xs mt-1">Details</span>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Location Selection */}
                {bookingStep === 'location' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Choose a Location</h3>
                    <p className="text-sm text-gray-500">
                      Select where you would like to experience your adventure.
                    </p>
                    
                    {locationsLoading ? (
                      <div className="flex justify-center py-8">
                        <p>Loading locations...</p>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="locationId"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const location = locations.find((loc: any) => loc.id.toString() === value);
                                  if (location) {
                                    setSelectedLocation(location);
                                  }
                                }}
                                defaultValue={field.value}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                              >
                                {locations.map((location: any) => (
                                  <div key={location.id} className={`border-2 rounded-xl p-5 transition-all cursor-pointer hover:shadow-md ${field.value === location.id.toString() ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/20'}`} 
                                      onClick={() => {
                                        field.onChange(location.id.toString());
                                        setSelectedLocation(location);
                                      }}>
                                    <FormItem className="flex items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value={location.id.toString()} />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer flex-1">
                                        <div className="font-medium text-base">{location.name}</div>
                                        <div className="text-gray-500 text-sm">{location.city}, {location.state}</div>
                                      </FormLabel>
                                    </FormItem>
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
                
                {/* Step 2: Experience Details + Date Selection */}
                {bookingStep === 'experience-details' && selectedExperience && selectedLocation && (
                  <div className="space-y-6">
                    <div className="md:flex gap-6">
                      {/* Left Side: Experience Details */}
                      <div className="md:w-1/2 space-y-4">
                        <div className="bg-white rounded-lg border p-5 space-y-4">
                          <h3 className="text-xl font-semibold text-gray-900">{selectedExperience.name}</h3>
                          
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span>{selectedExperience.duration} {selectedExperience.duration === 1 ? 'day' : 'days'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span>Up to {selectedExperience.capacity} people</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>{selectedLocation.name}, {selectedLocation.city}</span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 mt-2">
                            <p>{selectedExperience.description}</p>
                          </div>
                          
                          {/* Price and Hunter Count Selection */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                              <FormField
                                control={form.control}
                                name="hunterCount"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col space-y-1.5">
                                    <FormLabel className="text-sm font-medium">Number of Hunters</FormLabel>
                                    <FormControl>
                                      <div className="flex items-center">
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const newValue = Math.max(1, field.value - 1);
                                            field.onChange(newValue);
                                          }}
                                          disabled={field.value <= 1}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center">{field.value}</span>
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const newValue = Math.min(selectedExperience.capacity, field.value + 1);
                                            field.onChange(newValue);
                                          }}
                                          disabled={field.value >= selectedExperience.capacity}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="text-right">
                                <div className="text-lg font-semibold text-gray-900">
                                  {formatPrice(selectedExperience.price)} <span className="text-sm font-normal text-gray-500">/ hunter</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {form.getValues().hunterCount > 1 && `Total: ${formatPrice(parseFloat(selectedExperience.price) * form.getValues().hunterCount)}`}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Amenities */}
                          {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">What's Included</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedExperience.amenities.map((amenity: string, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-primary" />
                                    <span>{amenity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Rules */}
                          {selectedExperience.rules && selectedExperience.rules.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">Rules & Safety</h4>
                              <div className="space-y-1.5">
                                {selectedExperience.rules.map((rule: string, index: number) => (
                                  <div key={index} className="flex items-start gap-2 text-sm">
                                    <Info className="h-4 w-4 text-amber-500 mt-0.5" />
                                    <span>{rule}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Side: Date Selection */}
                      <div className="mt-6 md:mt-0 md:w-1/2">
                        <div className="bg-white rounded-lg border p-5">
                          <h3 className="text-lg font-medium mb-4">Choose Your Dates</h3>
                          
                          <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                              <FormItem className="flex flex-col space-y-3">
                                <DateRangePicker
                                  dateRange={field.value}
                                  onSelect={field.onChange}
                                  experience={{
                                    duration: selectedExperience.duration,
                                    capacity: selectedExperience.capacity,
                                    availableDates: selectedExperience.availableDates || []
                                  }}
                                  bookings={bookingData}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Selected Date Summary */}
                          {form.getValues().dateRange?.from && form.getValues().dateRange?.to && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-medium mb-2">Your Trip</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Check-in:</span>
                                  <span className="font-medium">{format(form.getValues().dateRange.from, 'EEEE, MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Check-out:</span>
                                  <span className="font-medium">{format(form.getValues().dateRange.to, 'EEEE, MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Duration:</span>
                                  <span className="font-medium">{differenceInDays(form.getValues().dateRange.to, form.getValues().dateRange.from) + 1} days</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Personal Details & Booking Summary */}
                {bookingStep === 'details' && (
                  <div className="space-y-6">
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
                                <Input placeholder="john@example.com" type="email" {...field} />
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
                              <FormLabel>Phone Number</FormLabel>
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
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Requests or Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Add any special requests or notes for your booking" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Payment Option</h3>
                      
                      <FormField
                        control={form.control}
                        name="paymentOption"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-3"
                              >
                                <div className={`border rounded-xl p-4 transition-all cursor-pointer ${field.value === 'deposit' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`} onClick={() => field.onChange('deposit')}>
                                  <FormItem className="flex items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="deposit" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      <div className="font-medium text-base">Pay Deposit Now (30%)</div>
                                      <div className="text-gray-500 text-sm">Pay {formatPrice(calculateSummary(form.getValues()).deposit)} now and the rest later</div>
                                    </FormLabel>
                                  </FormItem>
                                </div>
                                
                                <div className={`border rounded-xl p-4 transition-all cursor-pointer ${field.value === 'full' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`} onClick={() => field.onChange('full')}>
                                  <FormItem className="flex items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="full" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      <div className="font-medium text-base">Pay in Full</div>
                                      <div className="text-gray-500 text-sm">Pay the total amount of {formatPrice(calculateSummary(form.getValues()).total)} now</div>
                                    </FormLabel>
                                  </FormItem>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Base Price ({form.getValues().hunterCount} {form.getValues().hunterCount === 1 ? 'hunter' : 'hunters'})</span>
                        <span>{formatPrice(calculateSummary(form.getValues()).subtotal)}</span>
                      </div>
                      
                      {form.getValues().addons && form.getValues().addons.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Addons</span>
                          <span>{formatPrice(calculateSummary(form.getValues()).addonTotal)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-medium pt-2 border-t border-gray-200 mt-2">
                        <span>Total</span>
                        <span>{formatPrice(calculateSummary(form.getValues()).total)}</span>
                      </div>
                      
                      {form.getValues().paymentOption === 'deposit' && (
                        <div className="flex justify-between text-sm text-primary font-medium">
                          <span>Due Now (30% Deposit)</span>
                          <span>{formatPrice(calculateSummary(form.getValues()).deposit)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      By proceeding with this booking, you agree to our terms and conditions.
                    </div>
                  </div>
                )}
                    
                <DialogFooter className="mt-6">
                  <div className="flex justify-between w-full">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep}
                      className="gap-1"
                      disabled={bookingStep === 'location'}
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      Back
                    </Button>
                    
                    {bookingStep === 'details' ? (
                      <Button type="submit" className="gap-1">
                        Complete Booking
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        type="button" 
                        onClick={nextStep}
                        className="gap-1"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Booking Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Your booking has been successfully confirmed. Check your email for details.
            </DialogDescription>
          </DialogHeader>
          
          {bookingConfirmation && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Booking #{bookingConfirmation.bookingNumber}</h3>
                  <p className="text-sm text-gray-600">Confirmation sent to {bookingConfirmation.customerEmail}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">{bookingConfirmation.experience.name}</div>
                <div className="text-sm text-gray-600">
                  {bookingConfirmation.startDate && bookingConfirmation.endDate && (
                    <div>
                      {format(new Date(bookingConfirmation.startDate), 'MMM d, yyyy')} - {format(new Date(bookingConfirmation.endDate), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {bookingConfirmation.hunterCount} {bookingConfirmation.hunterCount === 1 ? 'Hunter' : 'Hunters'}
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="font-medium">Payment Details</div>
                <div className="text-sm text-gray-600 mt-1">
                  {bookingConfirmation.paymentOption === 'deposit' ? 'Deposit paid: ' : 'Total paid: '}
                  {formatPrice(bookingConfirmation.totalAmount)}
                </div>
              </div>
            </div>
          )}
          
          <Button onClick={handleCloseConfirmation} className="w-full mt-2">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicBooking;