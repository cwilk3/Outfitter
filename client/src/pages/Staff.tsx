import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  Phone,
  Edit,
  Calendar,
  UserCog,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";

// Define form validation schema
const userSchema = z.object({
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters." })
    .optional()
    .or(z.literal('')),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  role: z.enum(["admin", "guide"], {
    required_error: "Please select a role.",
  }),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function Staff() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const perPage = 10;

  // Fetch staff (guides and admins)
  const { data: staff, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Form handling
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "guide",
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (newUser: UserFormValues) => 
      apiRequest('POST', '/api/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Staff member created",
        description: "New staff member has been added successfully",
      });
      form.reset();
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create staff member. Please try again.",
        variant: "destructive",
      });
      console.error("Create user error:", error);
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserFormValues }) => {
      // Remove empty password from the data if it's not provided
      const cleanData = { ...data };
      if (cleanData.password === '') {
        delete cleanData.password;
      }
      return apiRequest('PATCH', `/api/users/${id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Staff member updated",
        description: "Staff member information has been updated successfully",
      });
      form.reset();
      setSelectedUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update staff member. Please try again.",
        variant: "destructive",
      });
      console.error("Update user error:", error);
    },
  });

  const onSubmit = (data: UserFormValues) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    } else {
      // Make sure password is required for new users
      if (!data.password) {
        form.setError("password", {
          type: "manual",
          message: "Password is required for new staff members",
        });
        return;
      }
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    form.reset({
      password: "", // Don't show existing password
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
    });
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    form.reset({
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "guide",
    });
    setIsCreating(true);
  };

  const closeDialog = () => {
    setIsCreating(false);
    setSelectedUser(null);
  };

  // Filter staff based on search query
  const filteredStaff = React.useMemo(() => {
    if (!staff) return [];
    
    if (!searchQuery) return staff;
    
    const query = searchQuery.toLowerCase();
    return staff.filter((user: any) => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(query) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    });
  }, [staff, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredStaff.length / perPage);
  const paginatedStaff = React.useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    return filteredStaff.slice(startIndex, startIndex + perPage);
  }, [filteredStaff, currentPage, perPage]);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "??";
    
    const firstInitial = firstName ? firstName.charAt(0) : "";
    const lastInitial = lastName ? lastName.charAt(0) : "";
    
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff</h2>
            <p className="text-sm text-gray-600">Manage guides and administrators</p>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="w-full md:w-64">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div>
                <Skeleton className="h-10 w-full" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full mt-1" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Staff</h2>
          <p className="text-sm text-gray-600">Manage guides and administrators</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Add Staff Member
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search staff..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on new search
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedStaff && paginatedStaff.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Staff Member</TableHead>
                      <TableHead>Contact Information</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStaff.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              {user.profileImage ? (
                                <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
                              ) : (
                                <AvatarFallback className="bg-primary text-white">
                                  {getInitials(user.firstName, user.lastName)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {user.email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1 text-gray-500" />
                                <span className="text-sm">{user.email}</span>
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center mt-1">
                                <Phone className="h-4 w-4 mr-1 text-gray-500" />
                                <span className="text-sm">{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge className="bg-accent text-white flex items-center w-fit">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Administrator
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center w-fit">
                              <UserCog className="h-3 w-3 mr-1" /> Guide
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isAdmin && (
                              <Button 
                                onClick={() => openEditDialog(user)}
                                variant="outline" 
                                size="sm"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // In a real app, navigate to staff schedule
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="sr-only">Schedule</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredStaff.length)} of {filteredStaff.length} staff members
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Page</span>
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Page</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium text-gray-900 mb-1">No staff members found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Add your first staff member to get started"}
              </p>
              {isAdmin && (
                <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Add Staff Member
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Staff Dialog */}
      {isAdmin && (
        <Dialog open={isCreating || !!selectedUser} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedUser ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
              <DialogDescription>
                {selectedUser 
                  ? 'Update staff member information.' 
                  : 'Enter details to add a new guide or administrator.'}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedUser ? 'New Password' : 'Password'}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={selectedUser ? "Leave blank to keep current" : "Enter password"} 
                          {...field} 
                        />
                      </FormControl>
                      {selectedUser && (
                        <FormDescription>Leave blank to keep current password</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="guide">
                            <div className="flex items-center">
                              <UserCog className="h-4 w-4 mr-2" />
                              <span>Guide</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              <span>Administrator</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === 'admin' 
                          ? 'Administrators have full access to all features' 
                          : 'Guides have limited access to the system'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={closeDialog}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <span>Saving...</span>
                    ) : (
                      <span>{selectedUser ? 'Update' : 'Add'} Staff Member</span>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
