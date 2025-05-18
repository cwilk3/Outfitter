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
  const { duration, capacity, availableDates = [] } = experience;
  
  // Convert any string dates to Date objects
  const parsedAvailableDates = availableDates.map(date => 
    typeof date === 'string' ? new Date(date) : date
  );
  
  // Get today's date at the start of the day
  const today = startOfDay(new Date());
  
  // Function to determine if a date is valid for selection as a start date
  const isDateDisabled = (date: Date) => {
    // Disable past dates
    if (isBefore(date, today)) {
      return true;
    }
    
    // If there are specific available dates, only allow those
    if (parsedAvailableDates.length > 0) {
      const isAvailable = parsedAvailableDates.some(availableDate => 
        isSameDay(availableDate, date)
      );
      if (!isAvailable) {
        return true;
      }
    }
    
    // Check if the date range would overlap with any fully booked dates
    for (let i = 0; i < duration; i++) {
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
      if (totalBooked >= capacity) {
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
    
    // Auto-calculate end date based on duration
    const endDate = addDays(startDate, duration - 1);
    
    // Update the selection
    onSelect({ 
      from: startDate, 
      to: endDate 
    });
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
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Select dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Select Your Dates</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Click on an available start date. End date will be automatically set based on duration ({duration} {duration === 1 ? 'day' : 'days'}).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              Experience duration: {duration} {duration === 1 ? 'day' : 'days'}
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={isDateDisabled}
            modifiers={{
              range: { 
                from: dateRange?.from || new Date(0), 
                to: dateRange?.to || new Date(0) 
              }
            }}
            className="p-3"
            classNames={{
              day_range_middle: "day-range-middle bg-primary/20 text-primary-foreground rounded-none",
              day_range_start: "day-range-start bg-primary text-primary-foreground rounded-l-md",
              day_range_end: "day-range-end bg-primary text-primary-foreground rounded-r-md",
            }}
            // The following forces a new selection to clear the previous one
            pagedNavigation
            fixedWeeks
          />
          {dateRange?.from && (
            <div className="p-3 border-t bg-muted/20">
              <p className="text-xs font-medium">
                Selected dates: {format(dateRange.from, "MMMM d")} - {dateRange.to && format(dateRange.to, "MMMM d, yyyy")}
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}