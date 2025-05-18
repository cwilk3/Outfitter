import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { addDays, format, isBefore, isAfter, isSameDay, startOfDay } from "date-fns"

interface CalendarDisplayProps {
  dateRange: DateRange | undefined;
  onDateSelect: (dateRange: DateRange | undefined) => void;
  experienceDuration: number;
  bookings: any[];
  maxCapacity: number;
}

export function CalendarDisplay({
  dateRange,
  onDateSelect,
  experienceDuration,
  bookings,
  maxCapacity
}: CalendarDisplayProps) {
  // Get today's date at the start of the day
  const today = startOfDay(new Date());
  
  // When a date is selected
  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onDateSelect(undefined);
      return;
    }
    
    // Auto-calculate end date based on duration
    const endDate = addDays(date, experienceDuration - 1);
    
    // Update the selection
    onDateSelect({
      from: date,
      to: endDate
    });
  };
  
  // Function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    // Disable past dates
    if (isBefore(date, today)) {
      return true;
    }
    
    // Check if the date range would overlap with any fully booked dates
    for (let i = 0; i < experienceDuration; i++) {
      const checkDate = addDays(date, i);
      
      // Check if this date is at capacity in any existing booking
      const bookingsOnDate = bookings.filter(booking => {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        return (
          (isSameDay(checkDate, bookingStart) || isAfter(checkDate, bookingStart)) &&
          (isSameDay(checkDate, bookingEnd) || isBefore(checkDate, bookingEnd))
        );
      });
      
      // Sum the bookings for this date
      const totalBooked = bookingsOnDate.reduce((total, booking) => 
        total + booking.bookedCount, 0
      );
      
      // If the date is at capacity, it's not available
      if (totalBooked >= maxCapacity) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-md p-4">
        <Calendar
          mode="single"
          selected={dateRange?.from}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          initialFocus
          className="p-0"
        />
        
        {dateRange?.from && dateRange.to && (
          <div className="mt-3 pt-3 border-t text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Selected dates:</span>{" "}
              {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}