import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { Booking, Customer, Experience } from "@/types";
import { useRole } from "@/hooks/useRole";
import { formatDate } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  DollarSign,
  User,
  FileText
} from "lucide-react";

export default function Bookings() {
  const { isAdmin } = useRole();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Fetch bookings data
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ['/api/bookings', statusFilter],
    queryFn: async () => {
      // Only add status parameter if it's not "all" and not empty
      const url = statusFilter && statusFilter !== "all" 
        ? `/api/bookings?status=${statusFilter}` 
        : '/api/bookings';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    }
  });

  // Fetch experiences for reference
  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });

  // Fetch customers for reference
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const isLoading = isLoadingBookings || isLoadingExperiences || isLoadingCustomers;

  // Filter and search bookings
  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];
    
    return bookings.filter((booking: Booking) => {
      if (!searchQuery) return true;
      
      const bookingNumber = booking.bookingNumber.toLowerCase();
      
      // Find associated customer and experience
      const customer = customers?.find((c: Customer) => c.id === booking.customerId);
      const experience = experiences?.find((e: Experience) => e.id === booking.experienceId);
      
      const customerName = customer 
        ? `${customer.firstName} ${customer.lastName}`.toLowerCase() 
        : '';
      
      const experienceName = experience 
        ? experience.name.toLowerCase() 
        : '';
      
      return (
        bookingNumber.includes(searchQuery.toLowerCase()) ||
        customerName.includes(searchQuery.toLowerCase()) ||
        experienceName.includes(searchQuery.toLowerCase())
      );
    });
  }, [bookings, searchQuery, customers, experiences]);

  // Pagination
  const totalPages = Math.ceil((filteredBookings?.length || 0) / perPage);
  const paginatedBookings = React.useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    return filteredBookings.slice(startIndex, startIndex + perPage);
  }, [filteredBookings, currentPage, perPage]);



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'deposit_paid':
        return <Badge className="bg-blue-600">Deposit Paid</Badge>;
      case 'completed':
        return <Badge className="bg-primary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
            <p className="text-sm text-gray-600">Manage your customer bookings</p>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="w-full md:w-64">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-24" />
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
          <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
          <p className="text-sm text-gray-600">Manage your customer bookings</p>
        </div>
        {isAdmin && (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Create Booking
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search booking or customer..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-40">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <span>{statusFilter ? `Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')}` : 'All Statuses'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedBookings && paginatedBookings.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Booking #</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBookings.map((booking: Booking) => {
                      const customer = customers?.find((c: Customer) => c.id === booking.customerId);
                      const experience = experiences?.find((e: Experience) => e.id === booking.experienceId);
                      
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {booking.bookingNumber}
                            <div className="text-xs text-gray-500">
                              {getTimeSince(booking.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>{experience?.name || 'Unknown Experience'}</TableCell>
                          <TableCell>
                            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                              <span>
                                {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                              <span>{formatCurrency(booking.totalAmount)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              {isAdmin && (
                                <Button size="sm" variant="outline">
                                  <User className="h-4 w-4" />
                                  <span className="sr-only">Assign Guide</span>
                                </Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="outline">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="sr-only">Payment</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredBookings.length)} of {filteredBookings.length} bookings
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first booking to get started"}
              </p>
              {isAdmin && (
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Create Booking
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
