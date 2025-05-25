import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { Settings } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Building, 
  Mail, 
  Phone, 
  Link, 
  KeyRound,
  Save,
  Copy,
  AlertCircle,
  User,
  Eye,
  EyeOff,
  Check
} from "lucide-react";

// Define form validation schema for company settings
const companySettingsSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email({ message: "Please enter a valid email address." }).optional(),
  companyLogo: z.string().optional(),
  bookingLink: z.string().optional(),
});

// Define form validation schema for QuickBooks settings
const quickbooksSettingsSchema = z.object({
  qbClientId: z.string().optional(),
  qbClientSecret: z.string().optional(),
  qbRefreshToken: z.string().optional(),
  qbRealmId: z.string().optional(),
});

// Define form validation schema for user settings
const userSettingsSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters." }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;
type QuickbooksSettingsFormValues = z.infer<typeof quickbooksSettingsSchema>;
type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState("company");
  const [copied, setCopied] = useState(false);
  const [showQbSecret, setShowQbSecret] = useState(false);
  const [showQbToken, setShowQbToken] = useState(false);

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Company settings form
  const companyForm = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      companyLogo: "",
      bookingLink: "",
    },
  });

  // QuickBooks settings form
  const quickbooksForm = useForm<QuickbooksSettingsFormValues>({
    resolver: zodResolver(quickbooksSettingsSchema),
    defaultValues: {
      qbClientId: "",
      qbClientSecret: "",
      qbRefreshToken: "",
      qbRealmId: "",
    },
  });

  // User settings form
  const userForm = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (settings) {
      companyForm.reset({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        companyPhone: settings.companyPhone || "",
        companyEmail: settings.companyEmail || "",
        companyLogo: settings.companyLogo || "",
        bookingLink: settings.bookingLink || `https://outfitter.app/book/${settings.companyName?.toLowerCase().replace(/\s+/g, '-') || 'your-company'}`,
      });

      if (isAdmin) {
        quickbooksForm.reset({
          qbClientId: settings.qbClientId || "",
          qbClientSecret: settings.qbClientSecret || "",
          qbRefreshToken: settings.qbRefreshToken || "",
          qbRealmId: settings.qbRealmId || "",
        });
      }
    }
  }, [settings, companyForm, quickbooksForm, isAdmin]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => 
      apiRequest('POST', '/api/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Your settings have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      console.error("Update settings error:", error);
    },
  });

  // Mock password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: UserSettingsFormValues) => {
      // In a real app, this would call an API endpoint to change the password
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });
      userForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
      console.error("Change password error:", error);
    },
  });

  const onCompanySubmit = (data: CompanySettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const onQuickbooksSubmit = (data: QuickbooksSettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  const onUserSubmit = (data: UserSettingsFormValues) => {
    changePasswordMutation.mutate(data);
  };

  const copyBookingLink = () => {
    const linkValue = companyForm.getValues("bookingLink");
    if (linkValue) {
      navigator.clipboard.writeText(linkValue);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Booking link copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <p className="text-sm text-gray-600">Manage your account and application settings</p>
        </div>
        
        <Tabs defaultValue="company">
          <TabsList className="mb-4">
            <Skeleton className="h-10 w-32 mr-2" />
            <Skeleton className="h-10 w-32 mr-2" />
            <Skeleton className="h-10 w-32" />
          </TabsList>
          
          <Skeleton className="h-[500px] w-full" />
        </Tabs>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-sm text-gray-600">Manage your account and application settings</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-white">
          <TabsTrigger value="company">
            <Building className="h-4 w-4 mr-2" /> Company
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="quickbooks">
              <KeyRound className="h-4 w-4 mr-2" /> QuickBooks Integration
            </TabsTrigger>
          )}
          <TabsTrigger value="user">
            <User className="h-4 w-4 mr-2" /> User Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company details and public information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input className="pl-8" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={companyForm.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={companyForm.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <Input className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="companyEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                              <Input className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={companyForm.control}
                    name="companyLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a URL for your company logo. Recommended size: 200x200 pixels.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-6" />
                  
                  <FormField
                    control={companyForm.control}
                    name="bookingLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Booking Link</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Link className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input className="pl-8 pr-12" {...field} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-9"
                              onClick={copyBookingLink}
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Share this link with customers to let them book directly.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <CardFooter className="px-0 pt-6">
                    <Button 
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {updateSettingsMutation.isPending ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> Save Company Settings
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="quickbooks">
            <Card>
              <CardHeader>
                <CardTitle>QuickBooks Integration</CardTitle>
                <CardDescription>
                  Configure your QuickBooks integration for invoicing and payment processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    You will need to set up a QuickBooks Developer account and create an app to get these credentials.
                    Visit the <a href="https://developer.intuit.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">QuickBooks Developer Portal</a> for more information.
                  </AlertDescription>
                </Alert>
                
                <Form {...quickbooksForm}>
                  <form onSubmit={quickbooksForm.handleSubmit(onQuickbooksSubmit)} className="space-y-4">
                    <FormField
                      control={quickbooksForm.control}
                      name="qbClientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Your QuickBooks API client ID.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quickbooksForm.control}
                      name="qbClientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showQbSecret ? "text" : "password"} 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-9"
                                onClick={() => setShowQbSecret(!showQbSecret)}
                              >
                                {showQbSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Your QuickBooks API client secret.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quickbooksForm.control}
                      name="qbRefreshToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Refresh Token</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showQbToken ? "text" : "password"} 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-9"
                                onClick={() => setShowQbToken(!showQbToken)}
                              >
                                {showQbToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Refresh token for your QuickBooks API.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quickbooksForm.control}
                      name="qbRealmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Realm ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Your QuickBooks company's Realm ID.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <CardFooter className="px-0 pt-6">
                      <Button 
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {updateSettingsMutation.isPending ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" /> Save QuickBooks Settings
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>
                Update your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Change Password</h3>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={userForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <span>Updating...</span>
                      ) : (
                        <span>Change Password</span>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Account Information</h3>
                <dl className="space-y-2">
                  <div className="flex py-2">
                    <dt className="text-sm font-medium text-gray-500 w-1/3">Username:</dt>
                    <dd className="text-sm text-gray-900">admin</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="text-sm font-medium text-gray-500 w-1/3">Role:</dt>
                    <dd className="text-sm text-gray-900">{isAdmin ? "Administrator" : "Guide"}</dd>
                  </div>
                  <div className="flex py-2">
                    <dt className="text-sm font-medium text-gray-500 w-1/3">Created:</dt>
                    <dd className="text-sm text-gray-900">January 1, 2023</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
