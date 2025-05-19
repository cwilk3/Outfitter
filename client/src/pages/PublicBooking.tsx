import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Calendar, Users, MapPin } from "lucide-react";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { DateRange } from "react-day-picker";

// Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Types
interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
  description?: string;
  address?: string;
  zip?: string;
  isActive: boolean;
}

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

// Form schema for booking
const bookingFormSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number is required"),
  dateRange: z.object({
    from: z.date(),
    to: z.date(),
  }),
  guests: z.number().min(1).max(20),
  notes: z.string().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

function PublicBooking() {
  // States
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  const [bookingStep, setBookingStep] = useState<'description' | 'dates' | 'details'>('description');
  
  // Get locations from API
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<Location[]>({
    queryKey: ['/api/public/locations'],
  });
  
  // Get experiences from API, filtered by selected location
  const { data: experiences = [], isLoading: isLoadingExperiences, error: experiencesError } = useQuery<Experience[]>({
    queryKey: ['/api/public/experiences', selectedLocation?.id],
    queryFn: async () => {
      if (selectedLocation) {
        const response = await fetch(`/api/public/experiences?locationId=${selectedLocation.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch experiences');
        }
        return response.json();
      }
      return [];
    },
    enabled: !!selectedLocation, // Only run query when a location is selected
  });
  

  
  // Helper to format prices consistently
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };
  
  // Handle experience selection
  const handleExperienceClick = (experience: Experience) => {
    setSelectedExperience(experience);
    setBookingDialogOpen(true);
  };
  // Fetch bookings data for the selected experience
  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ['/api/public/bookings', selectedExperience?.id],
    queryFn: async () => {
      if (!selectedExperience) return [];
      const response = await fetch(`/api/public/bookings?experienceId=${selectedExperience.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
    enabled: !!selectedExperience?.id && bookingDialogOpen,
  });
  
  // Format bookings data for the date picker
  const formattedBookings = useMemo(() => {
    return bookings.map(booking => ({
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      bookedCount: booking.guests || 1
    }));
  }, [bookings]);
  
  // Setup form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateRange: {
        from: new Date(),
        to: addDays(new Date(), 1),
      },
      guests: 1,
      notes: "",
      agreedToTerms: false,
    },
  });
  
  // Calculate booking summary
  const calculateSummary = (formValues: BookingFormValues) => {
    if (!selectedExperience) return null;
    
    const { dateRange, guests } = formValues;
    
    // Add null checks for dateRange
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return null;
    }
    
    const startDate = dateRange.from;
    const endDate = dateRange.to;
    
    // Calculate nights
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate total (simple calculation for now)
    const basePrice = parseFloat(selectedExperience.price) * guests;
    const total = basePrice;
    
    return {
      startDate,
      endDate,
      nights,
      basePrice,
      total,
      guests,
    };
  };
  
  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    if (!selectedExperience) return;
    
    try {
      const summary = calculateSummary(data);
      if (!summary) return;
      
      const bookingData = {
        experienceId: selectedExperience.id,
        customerDetails: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        },
        bookingDetails: {
          startDate: format(summary.startDate, 'yyyy-MM-dd'),
          endDate: format(summary.endDate, 'yyyy-MM-dd'),
          guests: data.guests,
          notes: data.notes || '',
        },
        payment: {
          totalAmount: summary.total.toString(),
        }
      };
      
      const response = await apiRequest('/api/public/bookings', 'POST', bookingData);
      
      if (response.ok) {
        const bookingConfirmation = await response.json();
        setBookingConfirmation(bookingConfirmation);
        setBookingDialogOpen(false);
        setConfirmationDialogOpen(true);
      } else {
        toast({
          title: "Booking failed",
          description: "There was an error processing your booking. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Booking failed",
        description: "There was an error processing your booking. Please try again later.",
        variant: "destructive",
      });
    }
  };
  
  // Generate date options based on experience availability
  const getAvailableDates = () => {
    if (!selectedExperience || !selectedExperience.availableDates) {
      return [];
    }
    return selectedExperience.availableDates;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Background */}
      <div className="relative h-[300px] md:h-[400px] bg-cover bg-center bg-no-repeat" 
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1520987623799-582e08951ce8?q=80&w=1470&auto=format&fit=crop')` }}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Book Your Next Adventure
          </h1>
          <p className="text-lg md:text-xl text-white max-w-2xl">
            Discover premium hunting and fishing experiences at our exclusive locations
          </p>
          
          {/* Features */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="flex items-center space-x-2 text-white">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span>Expert Guides</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span>Premium Locations</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span>All Equipment Provided</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span>Unforgettable Memories</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Location First Approach */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!selectedLocation ? (
          // STEP 1: Location Selection
          <>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Select a Destination</h2>
              <p className="mt-2 text-gray-600">Choose from our premium locations for your next adventure</p>
            </div>
            
            {isLoadingLocations ? (
              <div className="flex justify-center items-center h-64">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="ml-3 text-gray-500">Loading destinations...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xl font-medium text-gray-700">No destinations currently available</h3>
                <p className="mt-2 text-gray-500">Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {locations.map((location) => (
                  <div 
                    key={location.id} 
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => setSelectedLocation(location)}
                  >
                    {/* Image container with overlay */}
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-primary-700 to-gray-900">
                      <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div className="text-center">
                          <h3 className="text-2xl font-bold text-white mb-2">{location.name}</h3>
                          <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">
                            <MapPin className="mr-1 h-4 w-4" />
                            <span>{location.city}, {location.state}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{location.name}</h3>
                          <div className="mt-1 flex items-center text-sm text-gray-600">
                            <MapPin className="mr-1 h-4 w-4 text-primary/70" />
                            <span>{location.city}, {location.state}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLocation(location);
                          }}
                        >
                          View Experiences
                        </Button>
                      </div>
                      
                      {location.description && (
                        <p className="mt-4 text-sm text-gray-600">{location.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // STEP 2: Experience Selection for the chosen location
          <>
            <div className="mb-8">
              <Button 
                variant="ghost" 
                size="sm" 
                className="mb-4 pl-0 -ml-2 hover:bg-transparent"
                onClick={() => setSelectedLocation(null)}
              >
                ← Back to Locations
              </Button>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Experiences at {selectedLocation.name}</h2>
                <p className="mt-1 text-gray-600">{selectedLocation.city}, {selectedLocation.state}</p>
              </div>
            </div>
            
            {isLoadingExperiences ? (
              <div className="flex justify-center items-center h-64">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="ml-3 text-gray-500">Loading experiences...</span>
              </div>
            ) : experiencesError ? (
              <div className="text-center p-6 bg-red-50 rounded-lg">
                <h3 className="text-lg font-medium text-red-800">Failed to load experiences</h3>
                <p className="mt-2 text-red-700">Please try again later.</p>
              </div>
            ) : experiences.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-xl font-medium text-gray-700">No adventures available at this location</h3>
                <p className="mt-2 text-gray-500">Please select another destination or check back soon!</p>
                <Button 
                  className="mt-6"
                  onClick={() => setSelectedLocation(null)}
                >
                  Browse Other Destinations
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {experiences.map((experience) => (
                  <div 
                    key={experience.id} 
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1"
                    onClick={() => handleExperienceClick(experience)}
                  >
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
                      
                      {/* Category tag */}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                        {experience.category && experience.category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </div>
                      
                      {/* Price tag */}
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-primary text-white rounded-lg shadow-lg text-sm font-semibold">
                        {formatPrice(experience.price)}/hunter
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 flex-grow flex flex-col">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{experience.name}</h3>
                      
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
                      
                      {/* Book Button */}
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExperienceClick(experience);
                        }} 
                        className="mt-4 w-full"
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Reset booking step when dialog is closed
          setBookingStep('description');
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20"></div>
                </div>
                
                {/* Title & Pricing */}
                <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                  <h2 className="text-2xl sm:text-3xl font-bold">{selectedExperience.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="bg-primary/90 text-white text-sm px-2 py-1 rounded-md">
                      {formatPrice(selectedExperience.price)} per person
                    </span>
                    <span className="bg-black/30 text-white text-sm px-2 py-1 rounded-md flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {selectedExperience.duration} {selectedExperience.duration > 1 ? 'days' : 'day'}
                    </span>
                    <span className="bg-black/30 text-white text-sm px-2 py-1 rounded-md flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      Up to {selectedExperience.capacity} people
                    </span>
                  </div>
                </div>
                
                {/* Close button */}
                <DialogHeader className="absolute top-0 right-0 p-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="rounded-full bg-black/20 hover:bg-black/40 text-white"
                    onClick={() => setBookingDialogOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </DialogHeader>
              </div>
              
              {/* Booking Form */}
              <div className="p-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Form */}
                  <div className="col-span-1 md:col-span-2">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Step indicators */}
                        <div className="flex items-center gap-1 mb-4">
                          <div className={`flex-1 h-2 rounded-full ${bookingStep === 'description' ? 'bg-primary' : 'bg-gray-200'}`}></div>
                          <div className={`flex-1 h-2 rounded-full ${bookingStep === 'dates' ? 'bg-primary' : 'bg-gray-200'}`}></div>
                          <div className={`flex-1 h-2 rounded-full ${bookingStep === 'details' ? 'bg-primary' : 'bg-gray-200'}`}></div>
                        </div>
                        
                        {/* Step 1: Description */}
                        {bookingStep === 'description' && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold">About this experience</h3>
                            <div className="text-gray-700 space-y-4">
                              <p>{selectedExperience.description}</p>
                              
                              {/* What's included */}
                              {selectedExperience.tripIncludes && selectedExperience.tripIncludes.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-lg">What's included:</h4>
                                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedExperience.tripIncludes.map((item, index) => (
                                      <li key={index} className="flex items-start">
                                        <svg className="h-5 w-5 text-primary mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        <span className="capitalize">{item.replaceAll('_', ' ')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Amenities */}
                              {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-lg">Amenities:</h4>
                                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedExperience.amenities.map((item, index) => (
                                      <li key={index} className="flex items-start">
                                        <svg className="h-5 w-5 text-primary mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                        </svg>
                                        <span className="capitalize">{item.replaceAll('_', ' ')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Rules */}
                              {selectedExperience.rules && selectedExperience.rules.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="font-medium text-lg">Rules:</h4>
                                  <ul className="mt-2 space-y-2">
                                    {selectedExperience.rules.map((rule, index) => (
                                      <li key={index} className="flex items-start">
                                        <span className="text-primary font-bold mr-2">•</span>
                                        <span>{rule}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <Button 
                              type="button" 
                              className="w-full mt-4" 
                              onClick={() => setBookingStep('dates')}
                            >
                              Continue to Dates
                            </Button>
                          </div>
                        )}
                        
                        {/* Step 2: Date Selection */}
                        {bookingStep === 'dates' && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold">Select your dates</h3>
                            
                            <FormField
                              control={form.control}
                              name="dateRange"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Dates</FormLabel>
                                  <Card className="border shadow-sm">
                                    <CardContent className="pt-4">
                                      <DateRangePicker
                                        dateRange={field.value as DateRange}
                                        onSelect={(range) => {
                                          if (!range || !range.from) {
                                            field.onChange(undefined);
                                            return;
                                          }
                                          
                                          // Create a completely new object to avoid any reference issues
                                          const startDate = new Date(range.from);
                                          
                                          // Calculate end date based on experience duration
                                          let endDate;
                                          if (selectedExperience) {
                                            const duration = selectedExperience.duration || 1;
                                            endDate = addDays(startDate, duration - 1);
                                          } else if (range.to) {
                                            endDate = new Date(range.to);
                                          } else {
                                            endDate = addDays(startDate, 0);
                                          }
                                          
                                          // Create a fresh new range object
                                          const newRange = {
                                            from: startDate,
                                            to: endDate
                                          };
                                          
                                          // Update the form state to trigger re-renders
                                          field.onChange(newRange);
                                        }}
                                        experience={selectedExperience || {
                                          duration: 1,
                                          capacity: 1,
                                          availableDates: []
                                        }}
                                        bookings={formattedBookings || []} // Pass actual bookings data
                                        className="w-full"
                                      />
                                    </CardContent>
                                  </Card>
                                  
                                  {/* Experience Details Section - Fill the empty space */}
                                  {selectedExperience && (
                                    <div className="mt-4 border rounded-lg overflow-hidden">
                                      <div className="bg-primary text-primary-foreground p-3">
                                        <h4 className="font-medium text-sm">Experience Details</h4>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        {/* Description */}
                                        <div>
                                          <h5 className="text-sm font-medium mb-1">Description</h5>
                                          <p className="text-sm text-muted-foreground">{selectedExperience.description}</p>
                                        </div>
                                        
                                        {/* What's Included */}
                                        {selectedExperience.tripIncludes && selectedExperience.tripIncludes.length > 0 && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">What's Included</h5>
                                            <ul className="text-sm text-muted-foreground list-disc ml-5">
                                              {selectedExperience.tripIncludes.map((item, i) => (
                                                <li key={i}>{item}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {/* Rules & Requirements */}
                                        {selectedExperience.rules && selectedExperience.rules.length > 0 && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Rules & Requirements</h5>
                                            <ul className="text-sm text-muted-foreground list-disc ml-5">
                                              {selectedExperience.rules.map((rule, i) => (
                                                <li key={i}>{rule}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        
                                        {/* Amenities */}
                                        {selectedExperience.amenities && selectedExperience.amenities.length > 0 && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Amenities</h5>
                                            <div className="flex flex-wrap gap-2">
                                              {selectedExperience.amenities.map((amenity, i) => (
                                                <div key={i} className="text-xs bg-muted rounded-full px-3 py-1">
                                                  {amenity}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="guests"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Number of Guests</FormLabel>
                                  <Select
                                    value={field.value.toString()}
                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select number of guests" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[...Array(selectedExperience.capacity)].map((_, i) => (
                                        <SelectItem key={i} value={(i + 1).toString()}>
                                          {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex space-x-4">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => setBookingStep('description')}
                              >
                                Back
                              </Button>
                              <Button 
                                type="button" 
                                className="flex-1" 
                                onClick={() => {
                                  // Validate dateRange before proceeding
                                  const dateRange = form.getValues().dateRange;
                                  if (!dateRange || !dateRange.from || !dateRange.to) {
                                    toast({
                                      title: "Date selection required",
                                      description: "Please select dates for your booking",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setBookingStep('details');
                                }}
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Step 3: Contact Details */}
                        {bookingStep === 'details' && (
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold">Your information</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="John" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email address</FormLabel>
                                    <FormControl>
                                      <Input placeholder="john.doe@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone number</FormLabel>
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
                                  <FormLabel>Special requests or notes</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Any special accommodations or requests..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="agreedToTerms"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                      checked={field.value}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>
                                      I agree to the <a href="#" className="text-primary hover:underline">terms and conditions</a> and <a href="#" className="text-primary hover:underline">cancellation policy</a>
                                    </FormLabel>
                                    <FormMessage />
                                  </div>
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex space-x-4">
                              <Button 
                                type="button" 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => setBookingStep('dates')}
                              >
                                Back
                              </Button>
                              <Button type="submit" className="flex-1">
                                Complete Booking
                              </Button>
                            </div>
                          </div>
                        )}
                      </form>
                    </Form>
                  </div>
                  
                  {/* Right Column: Summary */}
                  <div className="col-span-1">
                    <div className="bg-gray-50 rounded-xl p-5 space-y-4 sticky top-6">
                      <h3 className="font-bold text-lg">Booking Summary</h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Experience:</span>
                          <span className="font-medium">{selectedExperience.name}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Location:</span>
                          <span className="font-medium">
                            {selectedLocation ? `${selectedLocation.name}, ${selectedLocation.city}` : 
                              selectedExperience.locations.length > 0 ? 
                                `${selectedExperience.locations[0].name}, ${selectedExperience.locations[0].city}` : 
                                'No location specified'}
                          </span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Duration:</span>
                          <span className="font-medium">{selectedExperience.duration} {selectedExperience.duration > 1 ? 'days' : 'day'}</span>
                        </div>
                        
                        <Separator />
                        
                        {form.watch('dateRange') && form.watch('dateRange')?.from && form.watch('dateRange')?.to && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Dates:</span>
                              <span className="font-medium">
                                {format(new Date(form.watch('dateRange')?.from as Date), 'MMM d, yyyy')} - {format(new Date(form.watch('dateRange')?.to as Date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            
                            <Separator />
                          </>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Guests:</span>
                          <span className="font-medium">{form.watch('guests')}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-gray-700 font-bold">Cost per person:</span>
                          <span className="font-bold">{formatPrice(selectedExperience.price)}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center pt-2 text-lg">
                          <span className="text-gray-900 font-bold">Total:</span>
                          <span className="font-bold text-primary">
                            {formatPrice((parseFloat(selectedExperience.price) * form.watch('guests')).toString())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Booking Confirmed!</DialogTitle>
            <DialogDescription className="text-center">
              Your booking has been successfully processed
            </DialogDescription>
          </DialogHeader>
          
          {bookingConfirmation && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 bg-green-50 border-green-100 text-center">
                <h3 className="font-medium text-lg text-green-800">Booking #{bookingConfirmation.bookingNumber}</h3>
                <p className="text-green-700 mt-1">We've sent the details to your email</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Experience:</span>
                  <span className="font-medium">{selectedExperience?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates:</span>
                  <span className="font-medium">
                    {bookingConfirmation.startDate} to {bookingConfirmation.endDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Guests:</span>
                  <span className="font-medium">{bookingConfirmation.guests}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-gray-700 font-bold">Total:</span>
                  <span className="font-bold">{formatPrice(bookingConfirmation.totalAmount.toString())}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setConfirmationDialogOpen(false);
                setSelectedExperience(null);
              }}
              className="w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicBooking;