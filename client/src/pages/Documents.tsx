import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document, Booking, Customer } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Download,
  Trash2,
  Upload,
  AlertCircle,
  Filter,
  ExternalLink
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Define form validation schema
const documentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  type: z.string().min(2, { message: "Document type is required." }),
  path: z.string().min(2, { message: "File path is required." }),
  size: z.number().int().positive({ message: "File size must be positive." }),
  bookingId: z.number().optional().nullable(),
  customerId: z.number().optional().nullable(),
  guideId: z.number().optional().nullable(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function Documents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const perPage = 10;

  // Fetch documents
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Fetch bookings for dropdown
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['/api/bookings'],
  });

  // Fetch customers for dropdown
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Form handling
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      type: "waiver",
      path: "",
      size: 0,
      bookingId: null,
      customerId: null,
      guideId: null,
    },
  });

  // Document upload mock mutation (in a real app, this would handle file upload)
  const uploadMutation = useMutation({
    mutationFn: (newDocument: DocumentFormValues) => 
      apiRequest('POST', '/api/documents', newDocument),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document uploaded",
        description: "Document has been uploaded successfully",
      });
      form.reset();
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      console.error("Upload document error:", error);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/documents/${id}`, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully",
      });
      setIsDeleting(false);
      setSelectedDocument(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
      console.error("Delete document error:", error);
    },
  });

  const onSubmit = (data: DocumentFormValues) => {
    // In a real app, we would handle file upload here
    // For now, we'll just mock the file upload
    const mockData = {
      ...data,
      // Clean up optional fields
      bookingId: data.bookingId || null,
      customerId: data.customerId || null,
      guideId: data.guideId || null
    };
    
    uploadMutation.mutate(mockData);
  };

  const openUploadDialog = () => {
    form.reset({
      name: "",
      type: "waiver",
      path: "mock-path/document.pdf", // Mock path
      size: 1024 * 1024, // 1MB mock size
      bookingId: null,
      customerId: null,
      guideId: null,
    });
    setIsUploading(true);
  };

  const closeUploadDialog = () => {
    setIsUploading(false);
  };

  const openDeleteDialog = (document: Document) => {
    setSelectedDocument(document);
    setIsDeleting(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleting(false);
    setSelectedDocument(null);
  };

  const confirmDelete = () => {
    if (selectedDocument) {
      deleteMutation.mutate(selectedDocument.id);
    }
  };

  // Mock download function
  const downloadDocument = (document: Document) => {
    toast({
      title: "Download started",
      description: `Downloading ${document.name}...`,
    });
    // In a real app, this would trigger a file download
  };

  // Filter documents based on search query and type
  const filteredDocuments = React.useMemo(() => {
    if (!documents) return [];
    
    let filtered = documents;
    
    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((doc: Document) => doc.type === selectedType);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc: Document) => {
        return doc.name.toLowerCase().includes(query);
      });
    }
    
    return filtered;
  }, [documents, searchQuery, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / perPage);
  const paginatedDocuments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    return filteredDocuments.slice(startIndex, startIndex + perPage);
  }, [filteredDocuments, currentPage, perPage]);

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'waiver':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'permit':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'license':
        return <FileText className="h-5 w-5 text-yellow-600" />;
      case 'contract':
        return <FileText className="h-5 w-5 text-primary" />;
      case 'receipt':
        return <FileText className="h-5 w-5 text-accent" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get associated name (booking or customer)
  const getAssociatedName = (document: Document): string => {
    if (document.bookingId && bookings) {
      const booking = bookings.find((b: Booking) => b.id === document.bookingId);
      if (booking) return `Booking: ${booking.bookingNumber}`;
    }
    
    if (document.customerId && customers) {
      const customer = customers.find((c: Customer) => c.id === document.customerId);
      if (customer) return `Customer: ${customer.firstName} ${customer.lastName}`;
    }
    
    if (document.guideId) {
      return `Guide ID: ${document.guideId}`;
    }
    
    return 'General Document';
  };

  const isLoading = isLoadingDocuments || isLoadingBookings || isLoadingCustomers;

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
            <p className="text-sm text-gray-600">Manage your waivers, permits, and other documents</p>
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
                <Skeleton className="h-10 w-32" />
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
          <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
          <p className="text-sm text-gray-600">Manage your waivers, permits, and other documents</p>
        </div>
        <Button 
          onClick={openUploadDialog} 
          className="bg-primary hover:bg-primary/90"
        >
          <Upload className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on new search
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value);
                  setCurrentPage(1); // Reset to first page on new filter
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <span>
                      {selectedType === 'all' 
                        ? 'All Documents' 
                        : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="waiver">Waivers</SelectItem>
                  <SelectItem value="permit">Permits</SelectItem>
                  <SelectItem value="license">Licenses</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedType("all");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedDocuments && paginatedDocuments.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Associated With</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDocuments.map((document: Document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getDocumentTypeIcon(document.type)}
                            <div className="ml-2">
                              <div className="font-medium">{document.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{document.type}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getAssociatedName(document)}
                        </TableCell>
                        <TableCell>
                          {formatDate(document.createdAt)}
                        </TableCell>
                        <TableCell>
                          {formatFileSize(document.size)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => downloadDocument(document)}
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => openDeleteDialog(document)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
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
                    Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredDocuments.length)} of {filteredDocuments.length} documents
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedType !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "Upload your first document to get started"}
              </p>
              <Button onClick={openUploadDialog} className="bg-primary hover:bg-primary/90">
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={isUploading} onOpenChange={(open) => !open && closeUploadDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a waiver, permit, or other important document.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Name</FormLabel>
                        <FormControl>
                          <Input placeholder="2023 Waiver Form" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="waiver">Waiver</SelectItem>
                            <SelectItem value="permit">Permit</SelectItem>
                            <SelectItem value="license">License</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="receipt">Receipt</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <FormField
                    control={form.control}
                    name="bookingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Booking (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select booking" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {bookings && bookings.map((booking: Booking) => (
                              <SelectItem key={booking.id} value={booking.id.toString()}>
                                {booking.bookingNumber} ({formatDate(booking.startDate)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Customer (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? Number(value) : null)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {customers && customers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id.toString()}>
                                {customer.firstName} {customer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Alert className="bg-gray-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Normally, you would upload a file here. For this demo, we'll simulate a file upload.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeUploadDialog}
                  disabled={uploadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <span>Uploading...</span>
                  ) : (
                    <span>Upload Document</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="border rounded-md p-4 bg-gray-50">
              <div className="flex items-center">
                {getDocumentTypeIcon(selectedDocument.type)}
                <div className="ml-2">
                  <div className="font-medium">{selectedDocument.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{selectedDocument.type}</div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={closeDeleteDialog}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              variant="destructive"
            >
              {deleteMutation.isPending ? (
                <span>Deleting...</span>
              ) : (
                <span>Delete Document</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
