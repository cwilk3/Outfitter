import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChevronRight, Calendar, Users, Check, Clock, DollarSign } from "lucide-react";
import { z } from "zod";
import { format, addDays, isBefore, isAfter, isSameDay, startOfDay } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { DateRange } from "react-day-picker";

// Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker, Booking } from "@/components/ui/date-range-picker";
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

// Sample addons (would be fetched from API based on the experience's addons in real app)
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
  customerName: z.string().min(3, "Full name is required"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(10, "Please enter a valid phone number"),
  groupSize: z.string().min(1, "Group size is required"),
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
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  
  // Get experiences from API
  const { data: experiences = [], isLoading, error } = useQuery<Experience[]>({
    queryKey: ['/api/public/experiences'],
  });

  // State for tracking booking steps
  const [bookingStep, setBookingStep] = useState<'location' | 'description' | 'dates' | 'details'>('location');
  
  // State for tracking booking availability data
  const [bookingData, setBookingData] = useState<Booking[]>([]);
  
  // Set up the booking form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      experienceId: selectedExperience?.id.toString() || "",
      locationId: "",
      dateRange: undefined,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      groupSize: "1",
      paymentOption: "deposit",
      addons: [],
    },
  });

  // Query for bookings data when an experience is selected
  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ['/api/public/bookings', selectedExperience?.id],
    enabled: !!selectedExperience?.id,
  });
  
  // Update bookingData state when bookings data is fetched
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      // Convert booking data to the format expected by DateRangePicker
      const formattedBookings: Booking[] = bookings.map(booking => ({
        startDate: new Date(booking.startDate),
        endDate: new Date(booking.endDate),
        bookedCount: booking.groupSize || 1
      }));
      setBookingData(formattedBookings);
    } else {
      setBookingData([]);
    }
  }, [bookings]);
  
  // Update form when an experience is selected
  useEffect(() => {
    if (selectedExperience) {
      form.setValue("experienceId", selectedExperience.id.toString());
      
      // Reset the booking steps to location selection
      setBookingStep('location');
      
      // Reset location selection
      form.setValue("locationId", "");
      
      // Reset date range
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
      setBookingStep('description');
    } else if (bookingStep === 'description') {
      setBookingStep('dates');
    } else if (bookingStep === 'dates') {
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
    if (bookingStep === 'description') {
      setBookingStep('location');
    } else if (bookingStep === 'dates') {
      setBookingStep('description');
    } else if (bookingStep === 'details') {
      setBookingStep('dates');
    }
  };

  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    try {
      // Convert dateRange to startDate and endDate for API submission
      const apiData = {
        ...data,
        startDate: data.dateRange?.from,
        endDate: data.dateRange?.to,
      };
      
      // Remove dateRange as it's not needed by the API
      delete (apiData as any).dateRange;
      
      const response = await apiRequest('POST', '/api/public/book', apiData);
      
      // Show success message and close booking dialog
      setBookingConfirmation(response);
      setBookingDialogOpen(false);
      setConfirmationDialogOpen(true);
      
      // Reset form and steps
      form.reset();
      setBookingStep('location');
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
  
  // Calculate booking summary based on form values
  const calculateSummary = (formValues: BookingFormValues) => {
    if (!selectedExperience) {
      return { subtotal: 0, addonTotal: 0, total: 0, deposit: 0 };
    }
    
    const price = parseFloat(selectedExperience.price);
    const groupSize = parseInt(formValues.groupSize) || 1;
    const subtotal = price * groupSize;
    
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
    const deposit = total * 0.5;
    
    return { subtotal, addonTotal, total, deposit };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero Section - More compact and visually pleasing */}
      <div className="relative bg-gradient-to-r from-gray-900 via-primary-900 to-gray-900 text-white overflow-hidden">
        {/* Background pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIzIDAgMi4xOTguOTY4IDIuMTk4IDIuMnYxOS42YzAgMS4yMzItLjk2OCAyLjItMi4xOTggMi4yaC0xMi42Yy0xLjIzIDAtMi4yLTEuMTY4LTIuMi0yLjRWMjAuMmMwLTEuMjMyLjk3LTIuMiAyLjItMi4yaC0uMDAxeiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA1IiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMzkuNiA0Mi42YzAgMS4yMy0uOTY4IDIuMi0yLjIgMi4ySDIwLjJjLTEuMjMyIDAtMi4yLS45Ny0yLjItMi4yVjE3LjJjMC0xLjIzMi45NjgtMi4yIDIuMi0yLjJoMTcuMmMxLjIzMiAwIDIuMi45NjggMi4yIDIuMnYyNS40eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA1IiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-10 bg-fixed"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40 z-10"></div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">Book Your Next Experience</h1>
            <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Connect with the top hunting and fishing guides for premium outdoor adventures
            </p>
            
            {/* Feature badges */}
            <div className="mt-6 inline-flex flex-wrap justify-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
              <div className="flex items-center text-sm font-medium">
                <svg className="h-4 w-4 mr-1 text-primary-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                <span>Expert Guides</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center text-sm font-medium">
                <svg className="h-4 w-4 mr-1 text-primary-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                <span>Premium Locations</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center text-sm font-medium">
                <svg className="h-4 w-4 mr-1 text-primary-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
                <span>Unforgettable Memories</span>
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
                    {formatPrice(experience.price)}/hunter
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
                  
                  {/* Basic Features */}
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
                  
                  {/* Amenities & Inclusions Highlights */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {experience.tripIncludes && experience.tripIncludes.includes('lodging') && (
                      <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full">🏠 Lodging</span>
                    )}
                    {experience.tripIncludes && experience.tripIncludes.includes('meals') && (
                      <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full">🍽️ Meals</span>
                    )}
                    {experience.amenities && experience.amenities.includes('guided') && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">🧭 Guided</span>
                    )}
                    {experience.amenities && experience.amenities.includes('wifi') && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">📶 WiFi</span>
                    )}
                    {experience.amenities && experience.amenities.length + (experience.tripIncludes?.length || 0) > 2 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-primary rounded-full">+more</span>
                    )}
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
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset booking step when dialog is closed
          setBookingStep('location');
        }
        setBookingDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[900px] md:max-w-[1000px] lg:max-w-[1100px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {/* Experience Header in Dialog */}
          {selectedExperience && (
            <>
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

              {/* Features details - Rules, Amenities, What's Included - Only shown before starting booking process */}
              {!bookingStep && (
                <div className="px-6 py-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Rules Section */}
                    {selectedExperience.rules && selectedExperience.rules.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold mb-3">Rules</h3>
                        <ul className="space-y-2 text-sm">
                          {selectedExperience.rules.map((rule, index) => (
                            <li key={index} className="flex items-start">
                              <span className="inline-block w-1 h-1 bg-primary rounded-full mt-2 mr-2"></span>
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                        {selectedExperience.rules.length > 5 && (
                          <button className="text-xs text-primary-600 mt-2 hover:underline">
                            Show all rules
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Amenities Section */}
                    {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold mb-3">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedExperience.amenities.map((amenity, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {amenity === 'bird_dogs' && '🐕 Bird dogs'}
                              {amenity === 'guided' && '🧭 Guided'}
                              {amenity === 'air_conditioning' && '❄️ Air conditioning'} 
                              {amenity === 'keep_meat' && '🥩 Keep the meat'}
                              {amenity === 'toilet' && '🚽 Toilet'}
                              {amenity === 'cable_tv' && '📺 Cable TV'}
                              {amenity === 'mud_room' && '👢 Mud room'}
                              {amenity === 'wifi' && '📶 WiFi'}
                              {amenity === 'kid_friendly' && '👶 Kid friendly'}
                              {amenity === 'corporate_trips' && '💼 Corporate trips'}
                              {![
                                'bird_dogs', 'guided', 'air_conditioning', 'keep_meat', 
                                'toilet', 'cable_tv', 'mud_room', 'wifi', 'kid_friendly', 'corporate_trips'
                              ].includes(amenity) && amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trip Includes Section */}
                    {selectedExperience.tripIncludes && selectedExperience.tripIncludes.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold mb-3">Trip Includes</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedExperience.tripIncludes.map((item, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                              {item === 'animal_cleaning' && '🧹 Animal cleaning'}
                              {item === 'lodging' && '🏠 Lodging'}
                              {item === 'meals' && '🍽️ Meals'}
                              {item === 'ice' && '🧊 Ice'}
                              {item === 'byob' && '🍺 BYOB'}
                              {!['animal_cleaning', 'lodging', 'meals', 'ice', 'byob'].includes(item) && item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>
                {bookingStep === 'location' && 'Select Location'}
                {bookingStep === 'description' && 'Experience Details'}
                {bookingStep === 'dates' && 'Choose Dates'}
                {bookingStep === 'details' && 'Complete Your Booking'}
              </DialogTitle>
              <DialogDescription>
                {bookingStep === 'location' && 'Choose where you would like to experience this adventure.'}
                {bookingStep === 'description' && 'View details about this experience before selecting your dates.'}
                {bookingStep === 'dates' && 'Select your preferred dates for this adventure.'}
                {bookingStep === 'details' && 'Fill out the form below to secure your adventure.'}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex justify-between">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookingStep === 'location' ? 'bg-primary text-white font-medium' : (bookingStep === 'description' || bookingStep === 'dates' || bookingStep === 'details') ? 'bg-primary/20 text-primary font-medium' : 'bg-gray-200 text-gray-500'}`}>
                    1
                  </div>
                  <span className="text-xs mt-1.5">Location</span>
                </div>
                <div className="flex-1 flex items-center mx-2">
                  <div className={`h-1.5 w-full ${bookingStep === 'description' || bookingStep === 'dates' || bookingStep === 'details' ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookingStep === 'description' ? 'bg-primary text-white font-medium' : (bookingStep === 'dates' || bookingStep === 'details') ? 'bg-primary/20 text-primary font-medium' : 'bg-gray-200 text-gray-500'}`}>
                    2
                  </div>
                  <span className="text-xs mt-1.5">Description</span>
                </div>
                <div className="flex-1 flex items-center mx-2">
                  <div className={`h-1.5 w-full ${bookingStep === 'dates' || bookingStep === 'details' ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookingStep === 'dates' ? 'bg-primary text-white font-medium' : bookingStep === 'details' ? 'bg-primary/20 text-primary font-medium' : 'bg-gray-200 text-gray-500'}`}>
                    3
                  </div>
                  <span className="text-xs mt-1.5">Dates</span>
                </div>
                <div className="flex-1 flex items-center mx-2">
                  <div className={`h-1.5 w-full ${bookingStep === 'details' ? 'bg-primary/20' : 'bg-gray-200'}`}></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bookingStep === 'details' ? 'bg-primary text-white font-medium' : 'bg-gray-200 text-gray-500'}`}>
                    4
                  </div>
                  <span className="text-xs mt-1.5">Details</span>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Location Selection Step */}
                {bookingStep === 'location' && selectedExperience && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Select a Location</h3>
                    <p className="text-sm text-gray-500">
                      Choose where you would like to experience this adventure.
                    </p>
                    
                    <div>
                      <p className="text-sm text-gray-700 mb-2">
                        This experience is available at {selectedExperience.locations.length} {selectedExperience.locations.length === 1 ? 'location' : 'locations'}.
                      </p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-3"
                            >
                              {selectedExperience.locations.map(location => (
                                <div key={location.id} className={`border rounded-xl p-4 transition-all cursor-pointer ${field.value === location.id.toString() ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'}`} onClick={() => field.onChange(location.id.toString())}>
                                  <FormItem className="flex items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value={location.id.toString()} />
                                    </FormControl>
                                    <div className="grid gap-1.5 leading-none">
                                      <FormLabel className="text-base font-medium mb-0.5">
                                        {location.name}
                                      </FormLabel>
                                      <p className="text-sm text-gray-500">
                                        {location.city}, {location.state}
                                      </p>
                                    </div>
                                  </FormItem>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="pt-4">
                      <div className="flex w-full justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setBookingDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={nextStep}
                          className="gap-1"
                          disabled={!form.getValues().locationId}
                        >
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </DialogFooter>
                  </div>
                )}
                
                {/* Experience Description Step */}
                {bookingStep === 'description' && selectedExperience && (
                  <div className="space-y-5">
                    {/* Experience Title and Location */}
                    <div>
                      <h2 className="text-2xl font-bold">{selectedExperience.name}</h2>
                      
                      {/* Location badge */}
                      {selectedExperience.locations.length > 0 && form.getValues().locationId && (
                        (() => {
                          const selectedLocationId = parseInt(form.getValues().locationId);
                          const location = selectedExperience.locations.find(loc => loc.id === selectedLocationId);
                          if (location) {
                            return (
                              <div className="flex items-center text-sm mt-1 text-gray-600">
                                <span>{location.city}, {location.state}</span>
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                      
                      {/* Experience type and details badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {selectedExperience.category === 'hunting' ? '🏹 Hunting' : 
                           selectedExperience.category === 'fishing' ? '🎣 Fishing' : 
                           selectedExperience.category}
                        </span>
                        
                        {selectedExperience.amenities && selectedExperience.amenities.includes('guided') && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            🧭 Guided
                          </span>
                        )}
                        
                        {selectedExperience.duration && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {selectedExperience.duration} {selectedExperience.duration === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Image Gallery */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
                      {selectedExperience.images && selectedExperience.images.length > 0 ? (
                        <>
                          {/* Main large image */}
                          <div className="col-span-2 row-span-2 h-64">
                            <img 
                              src={Array.isArray(selectedExperience.images) ? selectedExperience.images[0] : ""}
                              alt={selectedExperience.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Smaller images */}
                          {Array.isArray(selectedExperience.images) && selectedExperience.images.slice(1, 3).map((image, index) => (
                            <div key={index} className="h-32">
                              <img 
                                src={image}
                                alt={`${selectedExperience.name} ${index + 2}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="col-span-3 h-64 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">No images available</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Package Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-2">Package Details</h4>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Maximum {selectedExperience.capacity} {selectedExperience.capacity === 1 ? 'hunter' : 'hunters'}</span>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">{selectedExperience.duration} {selectedExperience.duration === 1 ? 'day trip' : 'day trip'}</span>
                        </div>
                        <div className="text-xl font-bold">
                          {formatPrice(selectedExperience.price)} <span className="text-sm font-normal text-gray-600">/hunter</span>
                        </div>
                      </div>
                      
                      {/* Trip Includes Tags */}
                      {selectedExperience.tripIncludes && selectedExperience.tripIncludes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {selectedExperience.tripIncludes.includes('lodging') && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                              <span>🏠</span>
                              <span>Lodging</span>
                            </div>
                          )}
                          {selectedExperience.tripIncludes.includes('meals') && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                              <span>🍽️</span>
                              <span>Meals</span>
                            </div>
                          )}
                          {selectedExperience.tripIncludes.includes('animal_cleaning') && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                              <span>🧹</span>
                              <span>Animal cleaning</span>
                            </div>
                          )}
                          {selectedExperience.tripIncludes.includes('ice') && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                              <span>🧊</span>
                              <span>Ice</span>
                            </div>
                          )}
                          {selectedExperience.tripIncludes.includes('byob') && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-xs">
                              <span>🍺</span>
                              <span>BYOB</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* About Section */}
                    <div>
                      <h4 className="font-medium text-lg mb-2">About</h4>
                      <p className="text-gray-700 whitespace-pre-line">{selectedExperience.description}</p>
                    </div>
                    
                    {/* Amenities Section */}
                    {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                      <div>
                        <h4 className="font-medium text-lg mb-3">Amenities</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                          {selectedExperience.amenities.map((amenity, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-gray-700">
                                {amenity === 'guided' && '🧭 Guided'}
                                {amenity === 'equipment' && '🎣 Equipment'}
                                {amenity === 'wifi' && '📶 WiFi'}
                                {amenity === 'transportation' && '🚐 Transportation'}
                                {amenity === 'bird_dogs' && '🐕 Bird dogs'}
                                {amenity === 'air_conditioning' && '❄️ Air conditioning'}
                                {amenity === 'mud_room' && '🥾 Mud room'}
                                {amenity === 'cable_tv' && '📺 Cable TV'}
                                {amenity === 'kid_friendly' && '👶 Kid friendly'}
                                {amenity === 'corporate_trips' && '💼 Corporate trips'}
                                {amenity === 'trophy_hunts' && '🏆 Trophy hunts'}
                                {amenity === 'meat_processing' && '🔪 Meat processing'}
                                {!['guided', 'equipment', 'wifi', 'transportation', 'bird_dogs', 'air_conditioning', 'mud_room', 'cable_tv', 'kid_friendly', 'corporate_trips', 'trophy_hunts', 'meat_processing'].includes(amenity) && amenity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Rules Section */}
                    {selectedExperience.rules && selectedExperience.rules.length > 0 && (
                      <div>
                        <h4 className="font-medium text-lg mb-3">Rules</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          {selectedExperience.rules.map((rule, index) => (
                            <li key={index}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <DialogFooter className="pt-4 mt-4 border-t">
                      <div className="flex w-full justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          className="gap-1"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={nextStep}
                          className="gap-1"
                        >
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </DialogFooter>
                  </div>
                )}
                
                {/* Date Selection + Experience Details Step */}
                {bookingStep === 'dates' && selectedExperience && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Date Selection + Experience Details</h3>
                    <p className="text-sm text-gray-500">
                      Select your preferred dates for this adventure.
                    </p>
                    
                    {/* Split-screen layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Side: Experience Details */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-base font-medium mb-2">{selectedExperience.name}</h4>
                          
                          <div className="flex items-center gap-3 text-sm text-gray-700 mb-3">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-primary" />
                              <span>{selectedExperience.duration} {selectedExperience.duration === 1 ? 'day' : 'days'}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-primary" />
                              <span>Up to {selectedExperience.capacity} {selectedExperience.capacity === 1 ? 'person' : 'people'}</span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-primary" />
                              <span>{formatPrice(selectedExperience.price)}/hunter</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-4">{selectedExperience.description}</p>
                          
                          {/* Amenities */}
                          {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium mb-2">Amenities</h5>
                              <div className="flex flex-wrap gap-2">
                                {selectedExperience.amenities.map((amenity, index) => (
                                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {amenity === 'guided' && '🧭 Guided'}
                                    {amenity === 'equipment' && '🎣 Equipment'}
                                    {amenity === 'transportation' && '🚐 Transportation'}
                                    {amenity === 'wifi' && '📶 WiFi'}
                                    {!['guided', 'equipment', 'transportation', 'wifi'].includes(amenity) && amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Trip Includes */}
                          {selectedExperience.tripIncludes && selectedExperience.tripIncludes.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Trip Includes</h5>
                              <div className="flex flex-wrap gap-2">
                                {selectedExperience.tripIncludes.map((item, index) => (
                                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                                    {item === 'animal_cleaning' && '🧹 Animal cleaning'}
                                    {item === 'lodging' && '🏠 Lodging'}
                                    {item === 'meals' && '🍽️ Meals'}
                                    {item === 'ice' && '🧊 Ice'}
                                    {item === 'byob' && '🍺 BYOB'}
                                    {!['animal_cleaning', 'lodging', 'meals', 'ice', 'byob'].includes(item) && item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Hunter Count Selector */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="text-sm font-medium mb-2">Number of Hunters</h5>
                          <FormField
                            control={form.control}
                            name="groupSize"
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select number of hunters" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.from({ length: selectedExperience?.capacity || 5 }, (_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {i + 1} {i === 0 ? 'hunter' : 'hunters'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="mt-4 flex justify-between text-sm">
                            <span>Price per hunter:</span>
                            <span className="font-medium">{formatPrice(selectedExperience.price)}</span>
                          </div>
                          <div className="mt-1 flex justify-between text-sm font-medium">
                            <span>Total price:</span>
                            <span>{formatPrice((parseFloat(selectedExperience.price) * (parseInt(form.getValues().groupSize) || 1)).toString())}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Side: Calendar UI */}
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="dateRange"
                          render={({ field }) => (
                            <FormItem className="flex flex-col space-y-3">
                              <div className="bg-white p-4 rounded-lg border">
                                <h5 className="text-sm font-medium mb-3">Select Dates</h5>
                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                  <p className="text-xs text-gray-600">
                                    Select your start date. End date will be automatically calculated based on the experience duration ({selectedExperience.duration} {selectedExperience.duration === 1 ? 'day' : 'days'}).
                                  </p>
                                </div>
                                
                                {/* Direct Calendar Display */}
                                <Calendar
                                    mode="single"
                                    selected={field.value?.from}
                                    onSelect={(date) => {
                                      if (!date) {
                                        field.onChange(undefined);
                                        return;
                                      }
                                      
                                      // Auto-calculate end date based on duration
                                      const endDate = addDays(date, selectedExperience.duration - 1);
                                      
                                      // Update the selection
                                      field.onChange({ 
                                        from: date, 
                                        to: endDate 
                                      });
                                    }}
                                    disabled={(date) => {
                                      // Get today's date at the start of the day
                                      const today = startOfDay(new Date());
                                      
                                      // Disable past dates
                                      if (isBefore(date, today)) {
                                        return true;
                                      }
                                      
                                      // Check if the date range would overlap with any fully booked dates
                                      for (let i = 0; i < selectedExperience.duration; i++) {
                                        const checkDate = addDays(date, i);
                                        
                                        // Check if this date is at capacity in any existing booking
                                        const bookingsOnDate = bookingData.filter(booking => {
                                          const bookingStart = new Date(booking.startDate);
                                          const bookingEnd = new Date(booking.endDate);
                                          return (
                                            (isSameDay(checkDate, bookingStart) || isAfter(checkDate, bookingStart)) &&
                                            (isSameDay(checkDate, bookingEnd) || isBefore(checkDate, bookingEnd))
                                          );
                                        });
                                        
                                        // Sum the bookings for this date
                                        const totalBooked = bookingsOnDate.reduce((total, booking) => 
                                          total + booking.bookedCount, 0
                                        );
                                        
                                        // Get current group size selection (default to 1 if not set)
                                        const currentGroupSize = parseInt(form.getValues().groupSize) || 1;
                                        
                                        // If adding the current group would exceed capacity, disable the date
                                        if (totalBooked + currentGroupSize > selectedExperience.capacity) {
                                          return true;
                                        }
                                      }
                                      
                                      return false;
                                    }}
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Selected Date Summary */}
                        {(() => {
                          const dateRange = form.getValues().dateRange;
                          if (dateRange && dateRange.from && dateRange.to) {
                            return (
                              <div className="bg-primary-50 p-4 rounded-lg text-sm">
                                <h5 className="font-medium text-primary-900 mb-2">Your Selected Dates</h5>
                                <div className="flex items-center gap-2 text-primary-800">
                                  <Calendar className="h-4 w-4" />
                                  <p>
                                    {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <p className="mt-2 text-xs text-primary-700">
                                  Your adventure will last for {selectedExperience.duration} {selectedExperience.duration === 1 ? 'day' : 'days'}.
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                    <DialogFooter className="pt-4 mt-4 border-t">
                      <div className="flex justify-between w-full">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          className="gap-1"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={nextStep}
                          className="gap-1"
                          disabled={!form.getValues().dateRange?.from || !form.getValues().dateRange?.to}
                        >
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </DialogFooter>
                  </div>
                )}
                
                {/* Personal Details Step */}
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
                            <div className="space-y-3">
                              {sampleAddons.map((addon) => {
                                // Find this addon in current values
                                const addonSelection = field.value?.find(a => a.id === addon.id);
                                const isSelected = !!addonSelection;
                                const quantity = addonSelection?.quantity || 1;
                                
                                return (
                                  <div key={addon.id} className="border rounded-md p-3 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={addon.id}
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentValues, { id: addon.id, quantity: 1 }]);
                                            } else {
                                              field.onChange(currentValues.filter(value => value.id !== addon.id));
                                            }
                                          }}
                                        />
                                        <div>
                                          <label htmlFor={addon.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {addon.label}
                                          </label>
                                          {addon.inventory && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {addon.inventory} available
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-sm font-medium text-primary">${addon.price}</span>
                                    </div>
                                    
                                    {isSelected && addon.maxPerBooking > 1 && (
                                      <div className="mt-3 pt-2 border-t flex items-center justify-between">
                                        <span className="text-sm">Quantity:</span>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              if (quantity > 1) {
                                                const newValues = (field.value || []).map(v => 
                                                  v.id === addon.id 
                                                    ? { ...v, quantity: v.quantity - 1 } 
                                                    : v
                                                );
                                                field.onChange(newValues);
                                              }
                                            }}
                                            disabled={quantity <= 1}
                                          >
                                            -
                                          </Button>
                                          
                                          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                                          
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              if (quantity < addon.maxPerBooking) {
                                                const newValues = (field.value || []).map(v => 
                                                  v.id === addon.id 
                                                    ? { ...v, quantity: v.quantity + 1 } 
                                                    : v
                                                );
                                                field.onChange(newValues);
                                              }
                                            }}
                                            disabled={quantity >= addon.maxPerBooking}
                                          >
                                            +
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                          <span>Experience Fee (${form.getValues().groupSize || 1} hunters):</span>
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
                      <div className="flex justify-between w-full">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          className="gap-1"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          Back
                        </Button>
                        <Button type="submit" className="gap-1">
                          <Check className="h-4 w-4" />
                          Complete Booking
                        </Button>
                      </div>
                    </DialogFooter>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Your booking has been successfully completed.
            </DialogDescription>
          </DialogHeader>
          
          {bookingConfirmation && (
            <div className="mt-6 space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg">Booking #{bookingConfirmation.booking.bookingNumber}</h3>
                  <span className="px-2 py-1 bg-primary-500 text-white rounded text-xs font-medium">
                    {bookingConfirmation.booking.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-500">Experience:</span>
                    <span className="font-medium">{bookingConfirmation.booking.experienceName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-500">Dates:</span>
                    <span className="font-medium">
                      {format(new Date(bookingConfirmation.booking.startDate), 'MMM d, yyyy')} - {format(new Date(bookingConfirmation.booking.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="font-medium">${bookingConfirmation.booking.totalAmount}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                We've sent a confirmation email to <span className="font-medium">{bookingConfirmation.booking.customer.email}</span> with all the details of your booking.
              </p>
              
              <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 flex items-start">
                <svg className="h-5 w-5 mr-2 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>
                  Our team will contact you shortly to confirm all details and arrange any additional requirements.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button onClick={() => setConfirmationDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicBooking;