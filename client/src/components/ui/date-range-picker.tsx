import * as React from "react";
import { addDays, format, isBefore, isAfter, isSameDay, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Info } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  // Add safety check for undefined experience with default values
  const { 
    duration = 1, 
    capacity = 1, 
    availableDates = [] 
  } = experience || {};
  
  // Convert any string dates to Date objects
  const parsedAvailableDates = availableDates.map(date => 
    typeof date === 'string' ? new Date(date) : date
  );
  
  // Get today's date at the start of the day
  const today = startOfDay(new Date());
  
  // Function to determine if a date is valid for selection as a start date
  const isDateDisabled = (date: Date) => {
    // Safety check - if date is invalid, disable it
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return true;
    }
    
    // Disable past dates
    if (isBefore(date, today)) {
      return true;
    }
    
    // If there are specific available dates, only allow those
    if (Array.isArray(parsedAvailableDates) && parsedAvailableDates.length > 0) {
      const isAvailable = parsedAvailableDates.some(availableDate => 
        availableDate && isSameDay(availableDate, date)
      );
      if (!isAvailable) {
        return true;
      }
    }
    
    // Safety check - ensure duration is valid
    const durationDays = typeof duration === 'number' && duration > 0 ? duration : 1;
    
    // Check if the date range would overlap with any fully booked dates
    for (let i = 0; i < durationDays; i++) {
      const checkDate = addDays(date, i);
      
      // Check if this date is at capacity in any existing booking
      const bookingsOnDate = Array.isArray(bookings) ? bookings.filter(booking => {
        if (!booking || !booking.startDate || !booking.endDate) return false;
        
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        
        // Validate dates before comparing
        if (isNaN(bookingStart.getTime()) || isNaN(bookingEnd.getTime())) return false;
        
        return (
          (isSameDay(checkDate, bookingStart) || isAfter(checkDate, bookingStart)) &&
          (isSameDay(checkDate, bookingEnd) || isBefore(checkDate, bookingEnd))
        );
      }) : [];
      
      // Sum the bookings for this date
      const totalBooked = bookingsOnDate.reduce((total, booking) => 
        total + (booking.bookedCount || 0), 0
      );
      
      // Safety check - ensure capacity is valid
      const maxCapacity = typeof capacity === 'number' && capacity > 0 ? capacity : 1;
      
      // If the date is at capacity, it's not available
      if (totalBooked >= maxCapacity) {
        return true;
      }
    }
    
    return false;
  };
  
  // Handle the selection of a start date
  const handleSelect = (selectedRange: DateRange | undefined) => {
    // If no date is selected, reset the range
    if (!selectedRange?.from) {
      onSelect(undefined);
      return;
    }
    
    const startDate = selectedRange.from;
    
    // Safety check - ensure duration is valid
    const durationDays = typeof duration === 'number' && duration > 0 ? duration : 1;
    
    // Auto-calculate end date based on duration
    const endDate = addDays(startDate, durationDays - 1);
    
    // Create a new date range object to avoid reference issues
    const newRange = { 
      from: new Date(startDate), 
      to: new Date(endDate) 
    };
    
    // Log what's being selected to verify
    console.log("DateRangePicker - handleSelect:", newRange);
    
    // Update the selection with the callback
    onSelect(newRange);
  };
  
  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(new Date(dateRange.from), "LLL dd, y")} - {format(new Date(dateRange.to), "LLL dd, y")}
                </>
              ) : (
                format(new Date(dateRange.from), "LLL dd, y")
              )
            ) : (
              <span>Select dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 z-50 shadow-lg" 
          align="start" 
          sideOffset={40} 
        >
          <div className="p-3 border-b bg-background">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Select Your Dates</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Click on an available start date. End date will be automatically set based on duration ({typeof duration === 'number' ? duration : 1} {duration === 1 ? 'day' : 'days'}).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              Experience duration: {typeof duration === 'number' ? duration : 1} {duration === 1 ? 'day' : 'days'}
            </p>
          </div>
          
          <div className="p-4">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={dateRange?.from ? new Date(dateRange.from) : new Date()}
              selected={dateRange?.from ? new Date(dateRange.from) : undefined}
              onSelect={(date) => {
                if (date) {
                  handleSelect({ from: date });
                } else {
                  onSelect(undefined);
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
                Selected dates: {format(new Date(dateRange.from), "MMMM d")} - {format(new Date(dateRange.to), "MMMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {typeof duration === 'number' ? duration : 1} {duration === 1 ? 'day' : 'days'}
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}