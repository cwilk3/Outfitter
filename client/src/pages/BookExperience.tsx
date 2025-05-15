import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Experience, Location, Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Calendar, Users, DollarSign, MapPin, Clock, Info, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DatePicker } from "@/components/ui/date-picker";

// Define booking form validation schema
const bookingSchema = z.object({
  customerId: z.number().optional(),
  experienceId: z.number(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  startDate: z.date({ required_error: "Please select a start date." }),
  numberOfPeople: z.coerce.number().min(1).max(20),
  notes: z.string().optional(),
  paymentOption: z.enum(["full", "deposit"]),
  selectedAddons: z.array(z.number()).optional(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions.",
  }),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const BookExperience = () => {
  const { id } = useParams();
  const experienceId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  // Booking form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      experienceId,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      numberOfPeople: 1,
      notes: "",
      paymentOption: "full",
      selectedAddons: [],
      agreedToTerms: false,
    },
  });

  // Fetch the specific experience
  const { 
    data: experience, 
    isLoading: isLoadingExperience,
    error
  } = useQuery<Experience>({
    queryKey: [`/api/experiences/${experienceId}`],
    enabled: !!experienceId,
  });
  
  // Fetch experience locations
  const { data: experienceLocations = [] } = useQuery<any[]>({
    queryKey: ['/api/experienceLocations'],
  });
  
  // Fetch all locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });
  
  // Calculate estimated total
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  
  // Update estimated total when form values change
  useEffect(() => {
    if (experience) {
      const numberOfPeople = form.watch("numberOfPeople") || 1;
      const basePrice = experience.price * numberOfPeople;
      
      // Add selected addons
      let addonTotal = 0;
      const selectedAddonIds = form.watch("selectedAddons") || [];
      
      if (experience.addons && selectedAddonIds.length > 0) {
        experience.addons.forEach((addon, index) => {
          if (selectedAddonIds.includes(index)) {
            addonTotal += addon.price * numberOfPeople;
          }
        });
      }
      
      // Apply deposit reduction if selected
      const paymentOption = form.watch("paymentOption");
      const total = basePrice + addonTotal;
      
      setEstimatedTotal(paymentOption === "deposit" ? total * 0.5 : total);
    }
  }, [form.watch("numberOfPeople"), form.watch("selectedAddons"), form.watch("paymentOption"), experience]);

  // Update form value when experience loads
  useEffect(() => {
    if (experience) {
      form.setValue("experienceId", experience.id);
    }
  }, [experience, form]);

  // Update start date when selected
  useEffect(() => {
    if (selectedDate) {
      form.setValue("startDate", selectedDate);
    }
  }, [selectedDate, form]);
  
  // Filter locations associated with this experience
  const experienceLocationsList = locations.filter(location => {
    return experienceLocations.some(
      mapping => mapping.experienceId === experienceId && mapping.locationId === location.id
    );
  });

  // Format experience category for display
  const formatCategory = (category: string | undefined) => {
    if (!category) return "Other";
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: BookingFormValues) => {
      // Transform data for API
      const bookingData = {
        ...data,
        status: "pending",
        totalAmount: estimatedTotal,
        paidAmount: 0, // Will be updated after payment processing
        paymentStatus: "pending",
      };
      
      return apiRequest<any>('POST', '/api/bookings', bookingData);
    },
    onSuccess: (data) => {
      toast({
        title: "Booking Created",
        description: "Your booking has been created successfully. Check your email for confirmation.",
      });
      
      // Redirect to checkout/confirmation page
      navigate(`/booking-confirmation/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create booking: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Submit handler
  const onSubmit = async (data: BookingFormValues) => {
    createBookingMutation.mutate(data);
  };
  
  // If loading or error
  if (isLoadingExperience) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-2/3 mx-auto mb-4" />
        <Skeleton className="h-8 w-1/2 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full mb-4" />
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !experience) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Experience Not Found</h1>
        <p className="mb-6">We couldn't find the experience you're looking for.</p>
        <Button onClick={() => navigate("/explore")}>
          Browse All Experiences
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{experience.name}</h1>
        <p className="text-muted-foreground">
          {formatCategory(experience.category)} • {experience.duration} days • Up to {experience.capacity} people
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Experience details */}
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="mb-6">
                {experience.images && experience.images.length > 0 ? (
                  <img 
                    src={experience.images[0]} 
                    alt={experience.name} 
                    className="w-full aspect-video object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
                  </div>
                )}
                
                <h2 className="text-xl font-semibold mb-2">Experience Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {experience.description}
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <Clock className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">{experience.duration} days</p>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <Users className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">Up to {experience.capacity}</p>
                      <p className="text-xs text-muted-foreground">Group Size</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <DollarSign className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">${experience.price}</p>
                      <p className="text-xs text-muted-foreground">Per Person</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <MapPin className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">{experienceLocationsList.length}</p>
                      <p className="text-xs text-muted-foreground">Locations</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Experience Details</CardTitle>
                  <CardDescription>
                    Everything you need to know about this adventure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">What's Included</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Professional guide service for {experience.duration} days</li>
                      <li>All necessary permits and licenses</li>
                      <li>Field dressing and basic game processing</li>
                      <li>Transportation during the experience</li>
                    </ul>
                  </div>
                  
                  {experience.addons && experience.addons.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Available Add-ons</h3>
                      <div className="space-y-2">
                        {experience.addons.map((addon, index) => (
                          <div key={index} className="flex justify-between items-start border-b pb-2">
                            <div>
                              <p className="font-medium">{addon.name}</p>
                              {addon.description && (
                                <p className="text-sm text-muted-foreground">{addon.description}</p>
                              )}
                            </div>
                            <Badge variant={addon.isOptional ? "outline" : "secondary"}>
                              ${addon.price}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">What to Bring</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Appropriate clothing for the season</li>
                      <li>Personal gear and equipment</li>
                      <li>Valid hunting/fishing license (if applicable)</li>
                      <li>Personal medications and toiletries</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="locations">
              <Card>
                <CardHeader>
                  <CardTitle>Available Locations</CardTitle>
                  <CardDescription>
                    This experience is available at the following locations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {experienceLocationsList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {experienceLocationsList.map(location => (
                        <Card key={location.id} className="overflow-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-3">
                            <div className="bg-muted aspect-video sm:aspect-square">
                              {location.image ? (
                                <img 
                                  src={location.image} 
                                  alt={location.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-12 w-12 text-muted-foreground opacity-50" />
                                </div>
                              )}
                            </div>
                            <div className="sm:col-span-2 p-4">
                              <h3 className="text-lg font-semibold">{location.name}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {location.city}, {location.state}
                              </p>
                              <p className="text-sm">
                                {location.description || "Experience this adventure in a beautiful setting."}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No specific locations found for this experience.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="gallery">
              {experience.images && experience.images.length > 0 ? (
                <Carousel>
                  <CarouselContent>
                    {experience.images.map((image, index) => (
                      <CarouselItem key={index}>
                        <div className="p-1">
                          <div className="aspect-video overflow-hidden rounded-lg">
                            <img 
                              src={image} 
                              alt={`${experience.name} - Image ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              ) : (
                <div className="text-center py-12 bg-muted rounded-lg">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No images available for this experience.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Booking form */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="bg-primary/5 border-b pb-4">
              <CardTitle>Book This Experience</CardTitle>
              <CardDescription>
                ${experience.price} per person • {experience.duration} days
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Contact information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Your Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
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
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Your email" {...field} />
                          </FormControl>
                          <FormDescription>
                            We'll send booking confirmation to this email
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Trip details */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium">Trip Details</h3>
                    
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <DatePicker
                            date={selectedDate}
                            setDate={setSelectedDate}
                            disabled={(date) => {
                              // Disable dates that aren't in the available dates array
                              if (!experience.availableDates || experience.availableDates.length === 0) {
                                return false; // If no dates specified, allow all dates
                              }
                              
                              return !experience.availableDates.some(
                                availableDate => {
                                  const availableDateObj = new Date(availableDate);
                                  return (
                                    date.getDate() === availableDateObj.getDate() &&
                                    date.getMonth() === availableDateObj.getMonth() &&
                                    date.getFullYear() === availableDateObj.getFullYear()
                                  );
                                }
                              );
                            }}
                          />
                          <FormDescription>
                            Select from available dates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="numberOfPeople"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of People</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={experience.capacity}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum {experience.capacity} people
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any special requests or dietary requirements?" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Addons */}
                  {experience.addons && experience.addons.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium">Add-ons</h3>
                      
                      <FormField
                        control={form.control}
                        name="selectedAddons"
                        render={() => (
                          <FormItem>
                            <div className="space-y-2">
                              {experience.addons.map((addon, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={form.watch("selectedAddons")?.includes(index)}
                                      onCheckedChange={(checked) => {
                                        const currentAddons = form.watch("selectedAddons") || [];
                                        if (checked) {
                                          form.setValue("selectedAddons", [...currentAddons, index]);
                                        } else {
                                          form.setValue(
                                            "selectedAddons",
                                            currentAddons.filter(i => i !== index)
                                          );
                                        }
                                      }}
                                      disabled={!addon.isOptional}
                                      defaultChecked={!addon.isOptional}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-medium cursor-pointer">
                                      {addon.name} (+${addon.price})
                                    </FormLabel>
                                    {addon.description && (
                                      <FormDescription className="text-xs">
                                        {addon.description}
                                      </FormDescription>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {/* Payment options */}
                  <div className="space-y-4 pt-4 border-t">
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
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="full" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Pay in Full (${estimatedTotal.toFixed(2)})
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="deposit" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  50% Deposit (${(estimatedTotal * 0.5).toFixed(2)})
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            {field.value === "deposit" ? (
                              <>
                                Pay 50% now and the remaining balance 30 days before the trip.
                              </>
                            ) : (
                              <>Pay the full amount now and you're all set.</>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Terms */}
                  <div className="pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="agreedToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm cursor-pointer">
                              I agree to the terms and conditions
                            </FormLabel>
                            <FormDescription className="text-xs">
                              By booking, you agree to our cancellation policy and booking terms.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Price summary */}
                  <div className="bg-muted/30 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Price Summary</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Price (${experience.price} × {form.watch("numberOfPeople") || 1})</span>
                        <span>${experience.price * (form.watch("numberOfPeople") || 1)}</span>
                      </div>
                      
                      {/* Show selected addons */}
                      {form.watch("selectedAddons")?.length > 0 && experience.addons && (
                        <>
                          {form.watch("selectedAddons").map(addonIndex => {
                            const addon = experience.addons?.[addonIndex];
                            if (!addon) return null;
                            
                            return (
                              <div key={addonIndex} className="flex justify-between">
                                <span>{addon.name} (${addon.price} × {form.watch("numberOfPeople") || 1})</span>
                                <span>${addon.price * (form.watch("numberOfPeople") || 1)}</span>
                              </div>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Show discount if deposit */}
                      {form.watch("paymentOption") === "deposit" && (
                        <div className="flex justify-between text-primary-foreground/70">
                          <span>50% Deposit Discount</span>
                          <span>-${(estimatedTotal * 0.5).toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="pt-2 mt-2 border-t flex justify-between font-medium">
                        <span>Total Due Now</span>
                        <span>${estimatedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={createBookingMutation.isPending}
                  >
                    {createBookingMutation.isPending ? (
                      <>Processing...</>
                    ) : (
                      <>Book Now • ${estimatedTotal.toFixed(2)}</>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookExperience;