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
  // State to control the popover
  const [open, setOpen] = React.useState(false);
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
    
    // For now, simplify the availability check to ensure basic functionality works
    return false;
  };
  
  // Handle the selection of a date range
  const handleSelect = (selectedRange: DateRange | undefined) => {
    console.log("DateRangePicker: handleSelect called with", selectedRange);
    
    // If no date is selected, reset the range
    if (!selectedRange?.from) {
      console.log("DateRangePicker: No from date, resetting selection");
      onSelect(undefined);
      return;
    }
    
    // Create a fresh copy of the start date to avoid reference issues
    const startDate = new Date(selectedRange.from);
    
    // Safety check - ensure duration is valid
    const durationDays = typeof duration === 'number' && duration > 0 ? duration : 1;
    
    // Auto-calculate end date based on duration
    const endDate = addDays(startDate, durationDays - 1);
    
    console.log(`DateRangePicker: Calculated end date based on ${durationDays} day duration:`, endDate);
    
    // Verify all dates in the range are available
    let allDatesAvailable = true;
    for (let i = 0; i < durationDays; i++) {
      const checkDate = addDays(startDate, i);
      if (isDateDisabled(checkDate)) {
        console.warn(`DateRangePicker: Date ${checkDate.toISOString()} in range is not available`);
        allDatesAvailable = false;
        break;
      }
    }
    
    // If any date in the range is not available, don't allow selection
    if (!allDatesAvailable) {
      console.warn("DateRangePicker: Some dates in the selected range are not available");
      return;
    }
    
    // Create a completely new date range object with fresh date objects
    const newRange = { 
      from: new Date(startDate), 
      to: new Date(endDate) 
    };
    
    // Log the complete selected range for verification
    console.log("DateRangePicker - Selected date range:", newRange);
    
    // Update the form state via callback
    onSelect(newRange);
    
    // Close the popup immediately
    setOpen(false);
  };
  
  return (
    <div className={className}>
      <div className="relative">
        <Button
          id="date"
          variant={"outline"} 
          onClick={() => setOpen(!open)}
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
        
        {open && (
          <div className="absolute left-0 top-full mt-2 z-50 bg-background border rounded-md shadow-lg">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Select Your Dates</h4>
                <div className="flex items-center gap-2">
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
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                    <span className="sr-only">Close</span>
                    <span className="text-lg font-bold">&times;</span>
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Experience duration: {typeof duration === 'number' ? duration : 1} {duration === 1 ? 'day' : 'days'}
              </p>
            </div>
            
            <div className="p-4">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from ? new Date(dateRange.from) : new Date()}
                selected={{
                  from: dateRange?.from ? new Date(dateRange.from) : undefined,
                  to: dateRange?.to ? new Date(dateRange.to) : undefined
                }}
                onSelect={(range) => {
                  // Simply pass the range to our handleSelect function
                  // which will handle all the logic including auto-calculating end date
                  handleSelect(range);
                }}
                numberOfMonths={1}
                disabled={isDateDisabled}
                fromDate={new Date()}
                fixedWeeks
                className="rounded-md"
                classNames={{
                  day_range_start: "bg-primary text-primary-foreground rounded-l-md",
                  day_range_end: "bg-primary text-primary-foreground rounded-r-md",
                  day_range_middle: "bg-primary/20 text-primary-foreground",
                }}
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
          </div>
        )}
      </div>
    </div>
  );
}