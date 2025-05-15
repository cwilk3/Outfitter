import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Booking, Experience, Customer } from "@/types";
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
  AlertCircle,
  Calendar,
  CalendarCheck,
  CheckCircle,
  CreditCard,
  Mail,
  MailCheck,
  MapPin,
  Share2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const BookingConfirmation = () => {
  const { id } = useParams();
  const bookingId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch the booking details
  const { 
    data: booking, 
    isLoading: isLoadingBooking,
    error
  } = useQuery<Booking>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });
  
  // Fetch related experience
  const { data: experience } = useQuery<Experience>({
    queryKey: [`/api/experiences/${booking?.experienceId}`],
    enabled: !!booking?.experienceId,
  });
  
  // Fetch related customer if available
  const { data: customer } = useQuery<Customer>({
    queryKey: [`/api/customers/${booking?.customerId}`],
    enabled: !!booking?.customerId,
  });
  
  // Share booking via email
  const shareBooking = () => {
    if (!booking) return;
    
    const subject = `My Booking: ${experience?.name || 'Hunting/Fishing Experience'}`;
    const body = `
      I've booked a hunting/fishing experience with ${experience?.name || 'an outfitter'}!
      
      Booking Details:
      - Booking Number: ${booking.bookingNumber}
      - Start Date: ${booking.startDate ? format(new Date(booking.startDate), 'MMMM d, yyyy') : 'TBD'}
      - Duration: ${experience?.duration || '1-3'} days
      - Number of People: ${booking.numberOfPeople || 1}
      
      Check out the details at: ${window.location.origin}/booking/${booking.id}
    `;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  if (isLoadingBooking) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <Skeleton className="h-12 w-2/3 mx-auto mb-4" />
        <Skeleton className="h-8 w-1/2 mx-auto mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full mb-6" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (error || !booking) {
    return (
      <div className="container mx-auto py-12 px-4 text-center max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
        <p className="mb-6">We couldn't find the booking you're looking for.</p>
        <Button onClick={() => navigate("/explore")}>
          Browse Experiences
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Your booking has been confirmed. You'll receive a confirmation email shortly
          with all the details of your trip.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Booking #{booking.bookingNumber}</CardTitle>
              <CardDescription>
                {experience?.name || 'Hunting/Fishing Experience'}
              </CardDescription>
            </div>
            <Badge variant={
              booking.status === 'confirmed' ? 'default' :
              booking.status === 'completed' ? 'success' :
              booking.status === 'cancelled' ? 'destructive' :
              'outline'
            }>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Booking Details</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Start Date</p>
                    <p className="text-muted-foreground">
                      {booking.startDate 
                        ? format(new Date(booking.startDate), 'MMMM d, yyyy') 
                        : 'Date to be determined'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">
                      {experience?.duration || 'N/A'} days
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Group Size</p>
                    <p className="text-muted-foreground">
                      {booking.numberOfPeople || 1} {booking.numberOfPeople === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">
                      Details will be provided in the confirmation email
                    </p>
                  </div>
                </div>
                
                {booking.notes && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Special Requests</p>
                      <p className="text-muted-foreground">{booking.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Payment Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Payment Status</p>
                    <Badge variant={
                      booking.paymentStatus === 'completed' ? 'success' :
                      booking.paymentStatus === 'failed' ? 'destructive' :
                      booking.paymentStatus === 'partial' ? 'warning' :
                      'outline'
                    }>
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Amount:</span>
                    <span>${booking.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Amount Paid:</span>
                    <span>${booking.paidAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  {booking.totalAmount && booking.paidAmount && booking.totalAmount > booking.paidAmount && (
                    <div className="flex justify-between text-sm font-medium">
                      <span>Balance Due:</span>
                      <span>${(booking.totalAmount - booking.paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                {booking.paymentStatus === 'partial' && (
                  <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Remaining Balance</AlertTitle>
                    <AlertDescription>
                      The remaining balance of ${(booking.totalAmount - booking.paidAmount).toFixed(2)} will be due 30 days before your trip.
                    </AlertDescription>
                  </Alert>
                )}
                
                {booking.paymentStatus === 'pending' && (
                  <Button className="w-full" onClick={() => navigate(`/checkout/${booking.id}`)}>
                    Complete Payment
                  </Button>
                )}
              </div>
              
              <Separator className="my-6" />
              
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MailCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Confirmation Email</p>
                    <p className="text-muted-foreground">
                      Sent to {customer?.email || booking.email || 'your email address'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Need help or have questions about your booking?
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => {
                    window.location.href = `mailto:support@outfitter.example.com?subject=Booking%20${booking.bookingNumber}`;
                  }}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-4 bg-muted/30 border-t">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/explore")}>
            Browse More Experiences
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={shareBooking}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Booking Details
          </Button>
        </CardFooter>
      </Card>
      
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 mb-2 mx-auto text-primary" />
              <h3 className="font-medium">Confirmation Email</h3>
              <p className="text-sm text-muted-foreground">
                You'll receive a detailed confirmation email with your booking information.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarCheck className="h-8 w-8 mb-2 mx-auto text-primary" />
              <h3 className="font-medium">Trip Preparation</h3>
              <p className="text-sm text-muted-foreground">
                We'll send trip preparation details and what to bring closer to your trip date.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 mb-2 mx-auto text-primary" />
              <h3 className="font-medium">Location Details</h3>
              <p className="text-sm text-muted-foreground">
                Detailed location information and check-in instructions will be sent before arrival.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-muted-foreground max-w-lg mx-auto">
          Thank you for booking with us! We look forward to providing you with an unforgettable experience.
        </p>
      </div>
    </div>
  );
};

export default BookingConfirmation;