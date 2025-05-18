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
  
  // For the booking flow, we need to support two modes:
  // 1. Always visible calendar (for desktop/tablet)
  // 2. Popover calendar (for mobile)
  
  // Let's create a responsive approach that shows the calendar directly on larger screens
  // and uses the popover on smaller screens

  return (
    <div className={className}>
      {/* Mobile view (Popover) - This will only show on small screens */}
      <div className="block md:hidden">
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
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
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
            <Calendar
              initialFocus
              mode="single"
              selected={dateRange?.from}
              onSelect={(date) => {
                if (!date) {
                  onSelect(undefined);
                  return;
                }
                
                // Auto-calculate end date based on duration
                const endDate = addDays(date, duration - 1);
                
                // Update the selection
                onSelect({ 
                  from: date, 
                  to: endDate 
                });
              }}
              disabled={isDateDisabled}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Desktop view (Always Visible Calendar) - This will show on medium screens and up */}
      <div className="hidden md:block">
        <div className="bg-white rounded-md border p-4">
          <div className="mb-3">
            <h4 className="font-medium text-sm mb-1">Select Your Start Date</h4>
            <p className="text-xs text-gray-500">
              End date will be automatically set based on duration ({duration} {duration === 1 ? 'day' : 'days'}).
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              if (!range?.from) {
                onSelect(undefined);
                return;
              }
              
              // Auto-calculate end date based on duration
              const endDate = addDays(range.from, duration - 1);
              
              // Update the selection with both from and to dates
              onSelect({ 
                from: range.from, 
                to: endDate 
              });
            }}
            disabled={isDateDisabled}
            className="border-t pt-3 w-full mx-auto scale-125 transform origin-top"
            numberOfMonths={1}
            defaultMonth={dateRange?.from}
            modifiersStyles={{
              selected: {
                backgroundColor: "#854d0e", // amber-800
                color: "white",
                fontWeight: "bold",
              },
              range_middle: {
                backgroundColor: "#166534", // green-800
                color: "white",
              },
              range_start: {
                backgroundColor: "#854d0e", // amber-800
                color: "white",
                borderRadius: "50%",
              },
              range_end: {
                backgroundColor: "#854d0e", // amber-800
                color: "white",
                borderRadius: "50%",
              }
            }}
            classNames={{
              day_selected: "!bg-amber-800 !text-white hover:!bg-amber-800 hover:!text-white focus:!bg-amber-800 focus:!text-white font-bold",
              day_range_middle: "!bg-green-800 !text-white font-medium",
              day_range_end: "!bg-amber-800 !text-white hover:!bg-amber-800 hover:!text-white focus:!bg-amber-800 focus:!text-white font-bold",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-green-800/80 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100",
              months: "space-y-4 md:space-y-0 md:space-x-4 md:flex md:flex-row",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-lg font-semibold",
              caption_label: "text-lg font-bold",
              nav: "space-x-1 flex items-center",
              nav_button: "h-8 w-8 bg-transparent p-0 opacity-75 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex justify-between",
              head_cell: "text-primary-500 font-medium text-sm w-12 h-10 flex items-center justify-center",
              row: "flex w-full mt-2",
              head: "font-medium text-md",
            }}
          />
          {dateRange?.from && dateRange.to && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium">
                Selected dates: {format(dateRange.from, "MMMM d")} - {format(dateRange.to, "MMMM d, yyyy")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}