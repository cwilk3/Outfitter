import * as React from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export interface Booking {
  startDate: Date;
  endDate: Date;
  bookedCount: number;
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onSelect: (dateRange: DateRange | undefined) => void;
  experience: {
    duration: number;
    capacity: number;
    availableDates?: string[] | Date[];
  };
  bookings?: Booking[];
  className?: string;
}

export function DateRangePicker({ 
  dateRange, 
  onSelect, 
  experience,
  bookings = [],
  className
}: DateRangePickerProps) {
  // State to control the dropdown
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Add safety check for undefined experience with default values
  const { 
    duration = 1,
    capacity = 1
  } = experience || {};
  
  // Get today's date at the start of the day
  const today = startOfDay(new Date());
  
  // Function to check if a date is at capacity based on existing bookings
  const isDateAtCapacity = (date: Date) => {
    // Normalize to start of day for consistent comparison
    const checkDate = startOfDay(new Date(date));
    
    // Count bookings that include this date
    let bookedCount = 0;
    
    bookings.forEach(booking => {
      if (!booking.startDate || !booking.endDate) return;
      
      const bookingStart = startOfDay(new Date(booking.startDate));
      const bookingEnd = startOfDay(new Date(booking.endDate));
      
      // Check if this date falls within the booking range
      if (
        (checkDate >= bookingStart && checkDate <= bookingEnd)
      ) {
        bookedCount += booking.bookedCount || 1;
      }
    });
    
    // Return true if date is at or over capacity
    return bookedCount >= capacity;
  };
  
  // Function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    // Past dates are disabled
    if (date < today) return true;
    
    // Check if date is at capacity
    if (isDateAtCapacity(date)) return true;
    
    // Check if any date in the range would be at capacity
    // Important for multi-day experiences
    for (let i = 0; i < duration; i++) {
      const rangeDate = addDays(date, i);
      if (isDateAtCapacity(rangeDate)) return true;
    }
    
    return false;
  };
  
  // Handle date selection
  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range || !range.from) {
      // If no range or no start date, reset selection
      onSelect(undefined);
      return;
    }
    
    // Create a copy of the start date
    const startDate = new Date(range.from);
    
    // Calculate end date based on experience duration
    const endDate = addDays(startDate, duration - 1);
    
    // Create the final date range
    const finalRange = {
      from: startDate,
      to: endDate
    };
    
    // Update the parent component
    onSelect(finalRange);
    
    // Close the dropdown
    setIsOpen(false);
  };
  
  return (
    <div className={className}>
      <div className="relative w-full">
        {/* Date Selection Button */}
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>Select dates</span>
          )}
        </Button>
        
        {/* Calendar Dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 bg-white border rounded-md shadow-lg">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Select Start Date</h4>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0" 
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-lg">&times;</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Experience duration: {duration} {duration === 1 ? 'day' : 'days'}
              </p>
            </div>
            
            <div className="p-4">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.from}
                selected={dateRange?.from}
                onSelect={(date) => {
                  if (date) {
                    handleDateSelect({ from: date, to: addDays(date, duration - 1) });
                  } else {
                    handleDateSelect(undefined);
                  }
                }}
                numberOfMonths={1}
                disabled={isDateDisabled}
                fromDate={new Date()}
                fixedWeeks
                className="rounded-md"
              />
            </div>
            
            {dateRange?.from && dateRange?.to && (
              <div className="p-3 border-t bg-muted/20">
                <p className="text-xs font-medium">
                  Selected: {format(dateRange.from, "MMMM d")} - {format(dateRange.to, "MMMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}