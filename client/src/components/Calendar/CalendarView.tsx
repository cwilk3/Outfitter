import React, { useState } from 'react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Event = {
  id: number;
  title: string;
  start: Date;
  end: Date;
  status: string;
  customer: string;
};

type ViewType = 'month' | 'week' | 'day';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');

  // Fetch bookings data
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['/api/bookings'],
  });

  // Convert bookings to calendar events
  const events: Event[] = React.useMemo(() => {
    if (!bookings) return [];
    
    return bookings.map((booking: any) => ({
      id: booking.id,
      title: booking.experienceId, // This would be replaced with the actual experience name in a real implementation
      start: parseISO(booking.startDate),
      end: parseISO(booking.endDate),
      status: booking.status,
      customer: booking.customerId, // This would be replaced with the actual customer name in a real implementation
    }));
  }, [bookings]);

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInMonth = lastDayOfMonth.getDate();
    
    const weeks = [];
    let days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<td key={`empty-${i}`} className="border p-1 text-gray-400"></td>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Filter events for this day
      const dayEvents = events.filter(event => 
        format(event.start, 'yyyy-MM-dd') <= dateString && 
        format(event.end, 'yyyy-MM-dd') >= dateString
      );
      
      days.push(
        <td key={day} className={`border p-1 ${format(new Date(), 'yyyy-MM-dd') === dateString ? 'bg-primary bg-opacity-5' : ''}`}>
          <div className="text-xs mb-1 font-semibold">{day}</div>
          {dayEvents.map(event => {
            // Determine color based on status
            let colorClass = '';
            if (event.status === 'confirmed') colorClass = 'bg-green-100 text-green-800 border-green-500';
            else if (event.status === 'pending') colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-500';
            else if (event.status === 'deposit_paid') colorClass = 'bg-blue-100 text-blue-800 border-blue-500';
            else if (event.status === 'completed') colorClass = 'bg-primary bg-opacity-10 text-primary border-primary';
            else colorClass = 'bg-gray-100 text-gray-800 border-gray-500';
            
            return (
              <div 
                key={event.id} 
                className={`calendar-event ${colorClass} p-1 text-xs rounded mb-1`}
                title={`${event.title} - ${event.customer}`}
              >
                {event.title} - {event.customer}
              </div>
            );
          })}
        </td>
      );
      
      // Start a new row at the end of the week
      if ((startingDayOfWeek + day) % 7 === 0) {
        weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
        days = [];
      }
    }
    
    // Add empty cells for days after the last day of the month
    const remainingCells = 7 - days.length;
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        days.push(<td key={`empty-end-${i}`} className="border p-1 text-gray-400"></td>);
      }
      weeks.push(<tr key={`week-${weeks.length}`}>{days}</tr>);
    }
    
    return weeks;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <Skeleton className="h-7 w-40" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Calendar</h3>
        </div>
        <div className="p-4">
          <p className="text-red-600">Error loading calendar data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Calendar</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('month')}
            className={view === 'month' ? 'bg-gray-200' : ''}
          >
            <span className="hidden sm:inline">Month</span>
            <span className="sm:hidden">M</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('week')}
            className={view === 'week' ? 'bg-gray-200' : ''}
          >
            <span className="hidden sm:inline">Week</span>
            <span className="sm:hidden">W</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('day')}
            className={view === 'day' ? 'bg-gray-200' : ''}
          >
            <span className="hidden sm:inline">Day</span>
            <span className="sm:hidden">D</span>
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={prevMonth} 
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={nextMonth} 
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <table className="w-full border-collapse calendar-grid">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Sun</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Mon</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Tue</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Wed</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Thu</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Fri</th>
              <th className="text-xs font-semibold text-gray-500 p-2 border-b">Sat</th>
            </tr>
          </thead>
          <tbody>
            {generateCalendarGrid()}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-right">
        <a href="/calendar" className="text-sm font-medium text-primary hover:text-primary/80">
          View full calendar →
        </a>
      </div>
    </div>
  );
}
