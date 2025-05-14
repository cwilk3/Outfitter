import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Payment, Booking } from "@/types";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  Calendar,
  User,
  FileText,
  Check,
  X,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

// Define form validation schema
const paymentSchema = z.object({
  bookingId: z.coerce.number({
    required_error: "Booking is required",
  }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  status: z.enum(["pending", "processing", "completed", "failed", "refunded"], {
    required_error: "Please select a status.",
  }),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function Payments() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const perPage = 10;

  // Fetch payments
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/payments'],
  });

  // Fetch bookings for dropdown
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
  });

  // Form handling
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bookingId: undefined,
      amount: 0,
      status: "pending",
      paymentMethod: "",
      transactionId: "",
    },
  });

  // Create payment mutation
  const createMutation = useMutation({
    mutationFn: (newPayment: PaymentFormValues) => 
      apiRequest('POST', '/api/payments', newPayment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Payment added",
        description: "Payment has been recorded successfully",
      });
      form.reset();
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add payment. Please try again.",
        variant: "destructive",
      });
      console.error("Create payment error:", error);
    },
  });

  // Generate QuickBooks invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (bookingId: number) => 
      apiRequest('POST', '/api/quickbooks/generate-invoice', { bookingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Invoice generated",
        description: "QuickBooks invoice has been generated successfully",
      });
      setIsGeneratingInvoice(false);
      setSelectedBookingId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate QuickBooks invoice. Please try again.",
        variant: "destructive",
      });
      console.error("Generate invoice error:", error);
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    createMutation.mutate(data);
  };

  const openCreateDialog = () => {
    form.reset({
      bookingId: undefined,
      amount: 0,
      status: "pending",
      paymentMethod: "",
      transactionId: "",
    });
    setIsCreating(true);
  };

  const closeCreateDialog = () => {
    setIsCreating(false);
  };

  const openGenerateInvoiceDialog = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setIsGeneratingInvoice(true);
  };

  const closeGenerateInvoiceDialog = () => {
    setIsGeneratingInvoice(false);
    setSelectedBookingId(null);
  };

  const confirmGenerateInvoice = () => {
    if (selectedBookingId) {
      generateInvoiceMutation.mutate(selectedBookingId);
    }
  };

  // Filter payments based on search query
  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    
    if (!searchQuery) return payments;
    
    const query = searchQuery.toLowerCase();
    return payments.filter((payment: Payment) => {
      return (
        (payment.transactionId && payment.transactionId.toLowerCase().includes(query)) ||
        (payment.qbInvoiceId && payment.qbInvoiceId.toLowerCase().includes(query)) ||
        String(payment.bookingId).includes(query) ||
        String(payment.amount).includes(query)
      );
    });
  }, [payments, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / perPage);
  const paginatedPayments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    return filteredPayments.slice(startIndex, startIndex + perPage);
  }, [filteredPayments, currentPage, perPage]);

  // Find booking details
  const getBookingDetails = (bookingId: number) => {
    if (!bookings) return null;
    return bookings.find((booking: Booking) => booking.id === bookingId);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-600">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-accent">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = isLoadingPayments || isLoadingBookings;

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Payments</h2>
            <p className="text-sm text-gray-600">Manage payments and invoices</p>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="w-full md:w-64">
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-40" />
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
          <h2 className="text-2xl font-bold text-gray-800">Payments</h2>
          <p className="text-sm text-gray-600">Manage payments and invoices</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={openCreateDialog} 
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on new search
                }}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                setSearchQuery("");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedPayments && paginatedPayments.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment: Payment) => {
                      const booking = getBookingDetails(payment.bookingId);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.transactionId || '-'}
                            {payment.qbInvoiceId && (
                              <div className="text-xs text-gray-500">
                                QB: {payment.qbInvoiceId}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {booking ? (
                              <div className="text-sm">
                                <div>{booking.bookingNumber}</div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(booking.startDate)}
                                </div>
                              </div>
                            ) : (
                              `Booking #${payment.bookingId}`
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(payment.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-gray-500" />
                              {formatCurrency(payment.amount)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.paymentMethod ? (
                              <div className="capitalize">{payment.paymentMethod}</div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // In a real app, view receipt or details
                                }}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                              {payment.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    // In a real app, mark as complete
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                  <span className="sr-only">Complete</span>
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
                    Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredPayments.length)} of {filteredPayments.length} payments
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">No payments found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Record your first payment or generate an invoice to get started"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Record Payment
                </Button>
                <Button variant="outline" onClick={() => {
                  if (bookings && bookings.length > 0) {
                    openGenerateInvoiceDialog(bookings[0].id);
                  } else {
                    toast({
                      title: "No bookings available",
                      description: "Create a booking first to generate an invoice",
                      variant: "destructive"
                    });
                  }
                }}>
                  <FileText className="mr-2 h-4 w-4" /> Generate QuickBooks Invoice
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add a new payment record for a booking.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="bookingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                        
                        // Set amount to booking total amount if available
                        if (bookings) {
                          const booking = bookings.find((b: Booking) => b.id === Number(value));
                          if (booking) {
                            form.setValue('amount', booking.totalAmount);
                          }
                        }
                      }} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a booking" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookings && bookings.map((booking: Booking) => (
                          <SelectItem key={booking.id} value={booking.id.toString()}>
                            {booking.bookingNumber} - {formatCurrency(booking.totalAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input type="number" step="0.01" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="transactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction ID (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeCreateDialog}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <span>Processing...</span>
                  ) : (
                    <span>Record Payment</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={isGeneratingInvoice} onOpenChange={(open) => !open && closeGenerateInvoiceDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate QuickBooks Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice in QuickBooks for the selected booking.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-gray-50">
              {selectedBookingId && bookings && (
                (() => {
                  const booking = bookings.find((b: Booking) => b.id === selectedBookingId);
                  if (booking) {
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Booking:</span>
                          <span>{booking.bookingNumber}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Dates:</span>
                          <span>
                            {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">Status:</span>
                          <span>{booking.status.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between font-semibold">
                          <span>Amount:</span>
                          <span className="text-lg">{formatCurrency(booking.totalAmount)}</span>
                        </div>
                      </>
                    );
                  }
                  return <p>Booking not found</p>;
                })()
              )}
            </div>
            
            <div className="flex items-center bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-yellow-500 mr-2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-sm text-yellow-800">
                This will create a real invoice in QuickBooks. The customer will receive an email notification.
              </span>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeGenerateInvoiceDialog}
                disabled={generateInvoiceMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={confirmGenerateInvoice}
                disabled={generateInvoiceMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {generateInvoiceMutation.isPending ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" /> Generate Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
