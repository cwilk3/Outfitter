import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Booking, Experience, Customer } from '@/types';
import { CalendarEvent } from '@/types/calendar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, MapPin, Users, DollarSign, User } from 'lucide-react';

// Setup localizer for the calendar
const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  // Fetch experiences
  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });

  // Fetch customers
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Combine data into calendar events
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (bookings && experiences && customers) {
      const mappedEvents = bookings.map((booking: Booking) => {
        const experience = experiences.find((exp: Experience) => exp.id === booking.experienceId);
        const customer = customers.find((cust: Customer) => cust.id === booking.customerId);
        
        // Format the title to show hunt type, customer last name, group size
        const title = experience 
          ? `${experience.name} / ${customer?.lastName || 'Unknown'} / ${booking.groupSize || 0}`
          : `Booking #${booking.bookingNumber}`;
        
        return {
          id: booking.id,
          title: title,
          start: new Date(booking.startDate), // Directly create Date object from UTC string
          // Adjust the end date by adding one day to correctly display multi-day events
          // This is because React Big Calendar treats end dates as exclusive (not including the end date)
          end: new Date(new Date(booking.endDate).getTime() + 86400000), // Directly create Date object from UTC string, then add 24 hours
          allDay: true,
          resource: {
            booking,
            experience,
            customer
          }
        };
      });
      
      setEvents(mappedEvents);
    }
  }, [bookings, experiences, customers]);

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  // Customize event style based on booking status
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#2C5F2D'; // default hunter green
    let borderColor = '#1E3C1F'; // darker version for border
    
    switch (event.resource.booking.status) {
      case 'confirmed':
        backgroundColor = '#34A853'; // green
        borderColor = '#2A8942';
        break;
      case 'pending':
        backgroundColor = '#FBBC05'; // yellow
        borderColor = '#E8A800';
        break;
      case 'deposit_paid':
        backgroundColor = '#4285F4'; // blue
        borderColor = '#3367D6';
        break;
      case 'cancelled':
        backgroundColor = '#EA4335'; // red
        borderColor = '#D73027';
        break;
      case 'completed':
        backgroundColor = '#2C5F2D'; // hunter green
        borderColor = '#1E3C1F';
        break;
      default:
        backgroundColor = '#2C5F2D'; // hunter green
        borderColor = '#1E3C1F';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '3px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        borderLeft: `3px solid ${borderColor}`,
        display: 'block',
        fontSize: '10px',
        padding: '1px 4px',
        overflow: 'hidden',
        whiteSpace: 'pre-line', // Allows for line breaks in the title
        textShadow: '0px 0px 2px rgba(0,0,0,0.4)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }
    };
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isLoading = isLoadingBookings || isLoadingExperiences || isLoadingCustomers;

  if (isLoading) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
          <p className="text-sm text-gray-600">View and manage your bookings</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-40" />
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[600px] w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
        <p className="text-sm text-gray-600">View and manage your bookings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-xl font-semibold">Booking Calendar</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#34A853]">Confirmed</Badge>
                <Badge className="bg-[#FBBC05] text-black">Pending</Badge>
                <Badge className="bg-[#4285F4]">Deposit Paid</Badge>
                <Badge className="bg-[#EA4335]">Cancelled</Badge>
                <Badge className="bg-primary">Completed</Badge>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="month"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                {selectedEvent.resource.experience?.name} - {selectedEvent.resource.customer?.firstName} {selectedEvent.resource.customer?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Booking Number</h4>
                  <p>{selectedEvent.resource.booking.bookingNumber}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Status</h4>
                  <Badge className={
                    selectedEvent.resource.booking.status === 'confirmed' ? 'bg-[#34A853]' :
                    selectedEvent.resource.booking.status === 'pending' ? 'bg-[#FBBC05] text-black' :
                    selectedEvent.resource.booking.status === 'deposit_paid' ? 'bg-[#4285F4]' :
                    selectedEvent.resource.booking.status === 'cancelled' ? 'bg-[#EA4335]' :
                    'bg-primary'
                  }>
                    {formatStatus(selectedEvent.resource.booking.status)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-500">Date</h4>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <p>
                    {moment(selectedEvent.start).format('MMM D, YYYY')} - {moment(selectedEvent.end).format('MMM D, YYYY')}
                  </p>
                </div>
              </div>
              
              {selectedEvent.resource.experience && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Experience Details</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-sm">{selectedEvent.resource.experience.location}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-sm">Max {selectedEvent.resource.experience.capacity} people</span>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedEvent.resource.customer && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Customer</h4>
                  <div className="flex items-center mt-1">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p>{selectedEvent.resource.customer.firstName} {selectedEvent.resource.customer.lastName}</p>
                      <p className="text-sm text-gray-500">{selectedEvent.resource.customer.email}</p>
                      {selectedEvent.resource.customer.phone && (
                        <p className="text-sm text-gray-500">{selectedEvent.resource.customer.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-semibold text-gray-500">Payment</h4>
                <div className="flex items-center mt-1">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                  <p>{formatCurrency(selectedEvent.resource.booking.totalAmount)}</p>
                </div>
              </div>
              
              {selectedEvent.resource.booking.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Notes</h4>
                  <p className="text-sm">{selectedEvent.resource.booking.notes}</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  // In a real app, this would navigate to the booking details page
                  setSelectedEvent(null);
                }}
              >
                View Full Details
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}