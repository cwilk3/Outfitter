import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Booking, Experience, Customer } from '@/types';
import { CalendarEvent } from '@/types/calendar';

// Setup localizer for the calendar
const localizer = momentLocalizer(moment);

export default function CalendarView() {
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

  // Create calendar events
  const calendarEvents = React.useMemo<CalendarEvent[]>(() => {
    if (!bookings.length || !experiences.length || !customers.length) {
      return [];
    }
    
    return bookings.map((booking: Booking) => {
      const experience = experiences.find((exp: Experience) => exp.id === booking.experienceId);
      const customer = customers.find((cust: Customer) => cust.id === booking.customerId);
      
      // Fix timezone handling by ensuring dates are interpreted correctly
      const normalizeDate = (dateString: string) => {
        // Parse the date in a timezone-agnostic way by using YYYY-MM-DD format
        const parts = new Date(dateString).toISOString().split('T')[0].split('-');
        return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2]));
      };
      
      return {
        id: booking.id,
        title: experience ? `${experience.name} - ${customer?.firstName} ${customer?.lastName}` : `Booking #${booking.bookingNumber}`,
        start: normalizeDate(booking.startDate),
        // Store the raw end date without modification
        end: normalizeDate(booking.endDate),
        allDay: true,
        resource: {
          booking,
          experience,
          customer
        }
      };
    });
  }, [bookings, experiences, customers]);

  // Customize event style based on booking status
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#2C5F2D'; // default hunter green
    
    switch (event.resource.booking.status) {
      case 'confirmed':
        backgroundColor = '#34A853'; // green
        break;
      case 'pending':
        backgroundColor = '#FBBC05'; // yellow
        break;
      case 'deposit_paid':
        backgroundColor = '#4285F4'; // blue
        break;
      case 'cancelled':
        backgroundColor = '#EA4335'; // red
        break;
      case 'completed':
        backgroundColor = '#2C5F2D'; // hunter green
        break;
      default:
        backgroundColor = '#2C5F2D'; // hunter green
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const isLoading = isLoadingBookings || isLoadingExperiences || isLoadingCustomers;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <Skeleton className="h-7 w-40" />
          <div className="flex space-x-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="p-4">
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Calendar</h3>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-[#34A853] text-xs">Confirmed</Badge>
          <Badge className="bg-[#FBBC05] text-black text-xs">Pending</Badge>
          <Badge className="bg-[#4285F4] text-xs">Deposit Paid</Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="h-[300px]">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            views={['month']}
            defaultView="month"
            toolbar={false}
          />
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-right">
        <Link 
          href="/calendar"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          View full calendar →
        </Link>
      </div>
    </div>
  );
}
