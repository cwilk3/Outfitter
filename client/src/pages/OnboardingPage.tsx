import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mountain, Building, MapPin, Phone, Mail, Globe, ArrowRight, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Onboarding form schema
const onboardingSchema = z.object({
  // Business Information
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.enum(["hunting", "fishing", "both"], {
    required_error: "Please select your business type",
  }),
  description: z.string().min(10, "Please provide a brief description (at least 10 characters)"),
  
  // Contact Information
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().optional(),
  
  // Location Information
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "Please enter a valid zip code"),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 1, title: "Business Type", description: "What kind of outfitter are you?" },
  { id: 2, title: "Business Details", description: "Tell us about your business" },
  { id: 3, title: "Contact Info", description: "How can customers reach you?" },
  { id: 4, title: "Location", description: "Where are you located?" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: "",
      businessType: undefined,
      description: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const createOutfitterMutation = useMutation({
    mutationFn: async (data: OnboardingValues) => {
      const response = await apiRequest("POST", "/api/outfitters", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Outfitter!",
        description: "Your business profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your business. Please try again.",
        variant: "destructive",
      });
      console.error("Onboarding error:", error);
    },
  });

  const onSubmit = async (data: OnboardingValues) => {
    createOutfitterMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = (step: number) => {
    const values = form.getValues();
    switch (step) {
      case 1:
        return values.businessType && values.businessName;
      case 2:
        return values.description.length >= 10;
      case 3:
        return values.phone && values.email;
      case 4:
        return values.address && values.city && values.state && values.zipCode;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Mountain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-emerald-900">Welcome to Outfitter</h1>
          </div>
          <p className="text-emerald-700 text-lg">
            Let's set up your hunting and fishing business profile
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? "bg-emerald-600 border-emerald-600 text-white" 
                    : "border-emerald-300 text-emerald-600"
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 ml-2 ${
                    currentStep > step.id ? "bg-emerald-600" : "bg-emerald-300"
                  }`} style={{ width: "100px" }} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-emerald-900">{steps[currentStep - 1].title}</h2>
            <p className="text-emerald-600">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        <Card className="border-emerald-200 shadow-xl">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Step 1: Business Type */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Business Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Rocky Mountain Outfitters" 
                              className="text-lg p-4" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">What type of outfitter are you?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-lg p-4">
                                <SelectValue placeholder="Select your business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hunting">Hunting Outfitter</SelectItem>
                              <SelectItem value="fishing">Fishing Guide</SelectItem>
                              <SelectItem value="both">Hunting & Fishing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Business Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Business Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell customers about your hunting/fishing experiences, specialties, and what makes your outfitter unique..."
                              className="min-h-32"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Contact Information */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(555) 123-4567" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">Business Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="info@youroutfitter.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Website (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://www.youroutfitter.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Location */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Business Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main Street" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Denver" {...field} />
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
                              <Input placeholder="CO" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="80202" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    Previous
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!isStepValid(4) || createOutfitterMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {createOutfitterMutation.isPending ? (
                        "Setting up your business..."
                      ) : (
                        <>
                          Complete Setup <CheckCircle className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}